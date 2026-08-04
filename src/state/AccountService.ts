import {
  createClient,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { freshProfile, type PlayerProfile } from "./PlayerProfileStore";
import { normalizeCasinoProgress } from "./CasinoProgression";

export interface AccountState {
  readonly connected: boolean;
  readonly session: Session | null;
  readonly email: string;
}

export interface LeaderboardPlayer {
  readonly display_name: string;
  readonly casino_level: number;
  readonly total_spins: number;
  readonly total_bonuses: number;
  readonly biggest_multiplier: number;
  readonly biggest_win_units: number;
  readonly favorite_game: string;
  readonly achievement_count: number;
  readonly updated_at: string;
}

export type LeaderboardResult =
  | { readonly status: "ready"; readonly players: LeaderboardPlayer[] }
  | { readonly status: "unavailable" | "sync-failed"; readonly players: []; readonly message: string };

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export class AccountService {
  private readonly client: SupabaseClient | null =
    url && anonKey
      ? createClient(url, anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        })
      : null;
  private session: Session | null = null;
  private saveTimer: number | null = null;
  private pendingProfile: PlayerProfile | null = null;

  public async restore(): Promise<AccountState> {
    if (!this.client) return this.state();
    const { data } = await this.client.auth.getSession();
    this.session = data.session;
    this.client.auth.onAuthStateChange((_event, session) => {
      this.session = session;
    });
    return this.state();
  }

  public state(): AccountState {
    return {
      connected: this.client !== null,
      session: this.session,
      email: this.session?.user.email ?? "",
    };
  }

  public async signIn(email: string, password: string): Promise<string | null> {
    if (!this.client) return "Cloud accounts are not connected in this build.";
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return error.message;
    this.session = data.session;
    return null;
  }

  public async signUp(
    email: string,
    password: string,
  ): Promise<{ error: string | null; confirmationRequired: boolean }> {
    if (!this.client)
      return {
        error: "Cloud accounts are not connected in this build.",
        confirmationRequired: false,
      };
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + import.meta.env.BASE_URL,
      },
    });
    if (error) return { error: error.message, confirmationRequired: false };
    this.session = data.session;
    return { error: null, confirmationRequired: data.session === null };
  }

  public async resetPassword(email: string): Promise<string | null> {
    if (!this.client) return "Cloud accounts are not connected in this build.";
    const { error } = await this.client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + import.meta.env.BASE_URL,
    });
    return error?.message ?? null;
  }

  public async signOut(): Promise<void> {
    if (this.client) await this.client.auth.signOut();
    this.session = null;
  }

  public async loadProfile(): Promise<PlayerProfile | null> {
    if (!this.client || !this.session) return null;
    const userId = this.session.user.id;
    let lookup = await this.client
      .from("casino_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (lookup.error) {
      lookup = await this.client
        .from("casino_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
    }
    if (lookup.error || !lookup.data) return freshProfile(userId);
    const data = lookup.data;
    const row = data as Record<string, unknown>;
    const nested = row.profile ?? row.profile_data ?? row.data;
    if (nested && typeof nested === "object")
      return this.normalizeCloud(nested as Partial<PlayerProfile>, userId);
    const flat: {
      displayName?: string;
      walletUnits?: number;
      beardBank?: PlayerProfile["beardBank"];
      casino?: PlayerProfile["casino"];
      updatedAtIso?: string;
    } = {};
    if (typeof row.display_name === "string") flat.displayName = row.display_name;
    if (typeof row.wallet_units === "number") flat.walletUnits = row.wallet_units;
    if (row.beard_bank && typeof row.beard_bank === "object") flat.beardBank = row.beard_bank as PlayerProfile["beardBank"];
    if (row.casino && typeof row.casino === "object") flat.casino = row.casino as PlayerProfile["casino"];
    if (typeof row.updated_at === "string") flat.updatedAtIso = row.updated_at;
    return this.normalizeCloud(flat, userId);
  }

  public saveProfile(profile: PlayerProfile): void {
    if (!this.client || !this.session) return;
    this.pendingProfile = profile;
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      void this.flush();
    }, 700);
  }

  public async leaderboard(): Promise<LeaderboardResult> {
    if (!this.client) return { status: "unavailable", players: [], message: "Cloud accounts are not connected in this build." };
    const { data, error } = await this.client.from("casino_public_leaderboard").select("*").order("biggest_multiplier", { ascending: false }).limit(50);
    if (error) return { status: "unavailable", players: [], message: error.message };
    return { status: "ready", players: (data ?? []) as LeaderboardPlayer[] };
  }

  public async publishStats(profile: PlayerProfile): Promise<string | null> {
    if (!this.client || !this.session) return null;
    const { error } = await this.client.rpc("publish_casino_stats", {
      p_display_name: profile.displayName, p_total_spins: profile.casino.totalSpins,
      p_total_bonuses: profile.casino.totalBonuses, p_biggest_multiplier: profile.casino.biggestMultiplier,
      p_biggest_win_units: profile.casino.biggestWinUnits, p_xp: profile.casino.xp,
      p_favorite_game: profile.casino.favoriteGame, p_achievement_count: profile.casino.achievements.length,
    });
    return error?.message ?? null;
  }

  public async flush(): Promise<void> {
    if (!this.client || !this.session || !this.pendingProfile) return;
    const profile = this.pendingProfile;
    this.pendingProfile = null;
    this.saveTimer = null;
    const id = this.session.user.id;
    const candidates: Record<string, unknown>[] = [
      { id, profile, updated_at: new Date().toISOString() },
      {
        user_id: id,
        profile_data: profile,
        updated_at: new Date().toISOString(),
      },
      { user_id: id, profile, updated_at: new Date().toISOString() },
      {
        id,
        display_name: profile.displayName,
        wallet_units: profile.walletUnits,
        beard_bank: profile.beardBank,
        casino: profile.casino,
        updated_at: new Date().toISOString(),
      },
    ];
    for (const candidate of candidates) {
      const conflict = "user_id" in candidate ? "user_id" : "id";
      const { error } = await this.client
        .from("casino_profiles")
        .upsert(candidate, { onConflict: conflict });
      if (!error) { await this.publishStats(profile); return; }
    }
    console.error(
      "Casino cloud save could not match the casino_profiles schema.",
    );
  }

  private normalizeCloud(
    value: Partial<PlayerProfile>,
    id: string,
  ): PlayerProfile {
    const base = freshProfile(id);
    return {
      id,
      displayName: String(
        value.displayName ||
          this.session?.user.user_metadata.display_name ||
          this.session?.user.email?.split("@")[0] ||
          "Cloud Player",
      ),
      walletUnits: Math.max(
        0,
        Math.round(Number(value.walletUnits ?? base.walletUnits)),
      ),
      beardBank: {
        livingVaultCharges: Math.max(
          0,
          Math.min(
            29,
            Math.round(Number(value.beardBank?.livingVaultCharges ?? 0)),
          ),
        ),
        lifetimeCoinsCollected: Math.max(
          0,
          Math.round(Number(value.beardBank?.lifetimeCoinsCollected ?? 0)),
        ),
      },
      casino: normalizeCasinoProgress(value.casino),
      updatedAtIso: String(value.updatedAtIso || new Date().toISOString()),
    };
  }
}
