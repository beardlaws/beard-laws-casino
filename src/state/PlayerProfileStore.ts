import { freshCasinoProgress, normalizeCasinoProgress, type CasinoProgress } from "./CasinoProgression";
import { freshCasinoEconomy, normalizeCasinoEconomy, type CasinoEconomyState } from "../engine/economy/CasinoEconomy";

export interface BeardBankProgress {
  readonly livingVaultCharges: number;
  readonly lifetimeCoinsCollected: number;
}

export interface PlayerProfile {
  readonly id: string;
  readonly displayName: string;
  readonly walletUnits: number;
  readonly beardBank: BeardBankProgress;
  readonly casino: CasinoProgress;
  readonly economy: CasinoEconomyState;
  readonly updatedAtIso: string;
}

export interface PlayerProfileRepository {
  load(profileId: string): PlayerProfile;
  save(profile: PlayerProfile): void;
}

const STORAGE_PREFIX = "beard-laws-casino-profile-v2";
const LEGACY_WALLET_KEY = "beard-laws-casino-wallet-v1";

export const freshProfile = (profileId: string): PlayerProfile => ({
  id: profileId,
  displayName: profileId === "guest" ? "Guest Player" : profileId,
  walletUnits: 0,
  beardBank: { livingVaultCharges: 0, lifetimeCoinsCollected: 0 },
  casino: freshCasinoProgress(),
  economy: freshCasinoEconomy(),
  updatedAtIso: new Date().toISOString(),
});

/** Browser save adapter. A future authenticated backend can implement the
 * same interface without requiring changes inside any casino game. */
export class LocalPlayerProfileRepository implements PlayerProfileRepository {
  public load(profileId: string): PlayerProfile {
    const key = `${STORAGE_PREFIX}:${profileId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        return this.normalize(
          JSON.parse(raw) as Partial<PlayerProfile>,
          profileId,
        );
      } catch {
        localStorage.removeItem(key);
      }
    }

    const profile = freshProfile(profileId);
    const legacyWallet =
      profileId === "guest"
        ? Number(localStorage.getItem(LEGACY_WALLET_KEY) ?? 0)
        : 0;
    return Number.isFinite(legacyWallet) && legacyWallet > 0
      ? { ...profile, walletUnits: Math.round(legacyWallet) }
      : profile;
  }

  public save(profile: PlayerProfile): void {
    const normalized = this.normalize(profile, profile.id);
    localStorage.setItem(
      `${STORAGE_PREFIX}:${profile.id}`,
      JSON.stringify(normalized),
    );
  }

  private normalize(
    value: Partial<PlayerProfile>,
    profileId: string,
  ): PlayerProfile {
    const wallet = Number(value.walletUnits ?? 0);
    const charges = Number(value.beardBank?.livingVaultCharges ?? 0);
    const lifetimeCoins = Number(value.beardBank?.lifetimeCoinsCollected ?? 0);
    return {
      id: profileId,
      displayName: String(
        value.displayName ||
          (profileId === "guest" ? "Guest Player" : profileId),
      ),
      walletUnits: Number.isFinite(wallet)
        ? Math.max(0, Math.round(wallet))
        : 0,
      beardBank: {
        livingVaultCharges: Number.isFinite(charges)
          ? Math.max(0, Math.min(29, Math.round(charges)))
          : 0,
        lifetimeCoinsCollected: Number.isFinite(lifetimeCoins)
          ? Math.max(0, Math.round(lifetimeCoins))
          : 0,
      },
      casino: normalizeCasinoProgress(value.casino),
      economy: normalizeCasinoEconomy(value.economy),
      updatedAtIso: new Date().toISOString(),
    };
  }
}
