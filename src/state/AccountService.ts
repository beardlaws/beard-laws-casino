import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { PlayerProfile } from "./PlayerProfileStore";

export type AccountResult = { ok: true; user?: User; message?: string } | { ok: false; message: string };

export class AccountService {
  private readonly client?: SupabaseClient;

  public constructor() {
    const url = import.meta.env.VITE_SUPABASE_URL?.trim();
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
    if (url && key && !url.includes("YOUR-PROJECT")) this.client = createClient(url, key);
  }

  public get configured(): boolean { return Boolean(this.client); }

  public async currentUser(): Promise<User | undefined> {
    if (!this.client) return undefined;
    const { data } = await this.client.auth.getUser();
    return data.user ?? undefined;
  }

  public onChange(callback: (user?: User) => void): () => void {
    if (!this.client) return () => undefined;
    const { data } = this.client.auth.onAuthStateChange((_event, session) => callback(session?.user));
    return () => data.subscription.unsubscribe();
  }

  public async signIn(email: string, password: string): Promise<AccountResult> {
    if (!this.client) return { ok: false, message: "Cloud accounts are not connected yet." };
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    return error ? { ok: false, message: error.message } : { ok: true, user: data.user };
  }

  public async signUp(email: string, password: string, displayName: string): Promise<AccountResult> {
    if (!this.client) return { ok: false, message: "Cloud accounts are not connected yet." };
    const { data, error } = await this.client.auth.signUp({ email, password, options: { data: { display_name: displayName } } });
    if (error) return { ok: false, message: error.message };
    const message = data.session ? "Account created." : "Check your email to confirm your account.";
    return data.user ? { ok: true, user: data.user, message } : { ok: true, message };
  }

  public async sendReset(email: string): Promise<AccountResult> {
    if (!this.client) return { ok: false, message: "Cloud accounts are not connected yet." };
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await this.client.auth.resetPasswordForEmail(email, { redirectTo });
    return error ? { ok: false, message: error.message } : { ok: true, message: "Password reset email sent." };
  }

  public async signOut(): Promise<void> { await this.client?.auth.signOut(); }

  public async loadProfile(user: User): Promise<PlayerProfile | undefined> {
    if (!this.client) return undefined;
    const { data } = await this.client.from("casino_profiles").select("profile").eq("user_id", user.id).maybeSingle();
    return data?.profile as PlayerProfile | undefined;
  }

  public async saveProfile(profile: PlayerProfile): Promise<AccountResult> {
    if (!this.client) return { ok: false, message: "Cloud accounts are offline." };
    const user = await this.currentUser();
    if (!user) return { ok: false, message: "Sign in to save across devices." };
    const { error } = await this.client.from("casino_profiles").upsert({ user_id: user.id, profile, updated_at: new Date().toISOString() });
    return error ? { ok: false, message: error.message } : { ok: true };
  }
}
