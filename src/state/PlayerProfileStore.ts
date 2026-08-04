export interface BeardBankProgress {
  readonly livingVaultCharges: number;
  readonly lifetimeCoinsCollected: number;
}

export interface PlayerProfile {
  readonly id: string;
  readonly displayName: string;
  readonly walletUnits: number;
  readonly beardBank: BeardBankProgress;
  readonly stats: PlayerStats;
  readonly settings: PlayerSettings;
  readonly updatedAtIso: string;
}

export interface PlayerStats {
  readonly sessions: number;
  readonly totalBankrollLoadedUnits: number;
  readonly biggestWalletUnits: number;
  readonly spinsPlayed: number;
}

export interface PlayerSettings {
  readonly masterVolume: number;
  readonly musicVolume: number;
  readonly effectsVolume: number;
  readonly turbo: boolean;
  readonly reducedMotion: boolean;
}

export interface PlayerProfileRepository {
  load(profileId: string): PlayerProfile;
  save(profile: PlayerProfile): void;
}

const STORAGE_PREFIX = "beard-laws-casino-profile-v2";
const LEGACY_WALLET_KEY = "beard-laws-casino-wallet-v1";

const freshProfile = (profileId: string): PlayerProfile => ({
  id: profileId,
  displayName: profileId === "guest" ? "Guest Player" : profileId,
  walletUnits: 0,
  beardBank: { livingVaultCharges: 0, lifetimeCoinsCollected: 0 },
  stats: { sessions: 1, totalBankrollLoadedUnits: 0, biggestWalletUnits: 0, spinsPlayed: 0 },
  settings: { masterVolume: 0.8, musicVolume: 0.55, effectsVolume: 0.85, turbo: false, reducedMotion: false },
  updatedAtIso: new Date().toISOString(),
});

/** Browser save adapter. A future authenticated backend can implement the
 * same interface without requiring changes inside any casino game. */
export class LocalPlayerProfileRepository implements PlayerProfileRepository {
  public normalizeProfile(value: Partial<PlayerProfile>, profileId: string): PlayerProfile {
    return this.normalize(value, profileId);
  }
  public load(profileId: string): PlayerProfile {
    const key = `${STORAGE_PREFIX}:${profileId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try { return this.normalize(JSON.parse(raw) as Partial<PlayerProfile>, profileId); }
      catch { localStorage.removeItem(key); }
    }

    const profile = freshProfile(profileId);
    const legacyWallet = profileId === "guest" ? Number(localStorage.getItem(LEGACY_WALLET_KEY) ?? 0) : 0;
    return Number.isFinite(legacyWallet) && legacyWallet > 0
      ? { ...profile, walletUnits: Math.round(legacyWallet) }
      : profile;
  }

  public save(profile: PlayerProfile): void {
    const normalized = this.normalize(profile, profile.id);
    localStorage.setItem(`${STORAGE_PREFIX}:${profile.id}`, JSON.stringify(normalized));
  }

  private normalize(value: Partial<PlayerProfile>, profileId: string): PlayerProfile {
    const wallet = Number(value.walletUnits ?? 0);
    const charges = Number(value.beardBank?.livingVaultCharges ?? 0);
    const lifetimeCoins = Number(value.beardBank?.lifetimeCoinsCollected ?? 0);
    return {
      id: profileId,
      displayName: String(value.displayName || (profileId === "guest" ? "Guest Player" : profileId)),
      walletUnits: Number.isFinite(wallet) ? Math.max(0, Math.round(wallet)) : 0,
      beardBank: {
        livingVaultCharges: Number.isFinite(charges) ? Math.max(0, Math.min(29, Math.round(charges))) : 0,
        lifetimeCoinsCollected: Number.isFinite(lifetimeCoins) ? Math.max(0, Math.round(lifetimeCoins)) : 0,
      },
      stats: {
        sessions: Math.max(1, Math.round(Number(value.stats?.sessions ?? 1) || 1)),
        totalBankrollLoadedUnits: Math.max(0, Math.round(Number(value.stats?.totalBankrollLoadedUnits ?? 0) || 0)),
        biggestWalletUnits: Math.max(0, Math.round(Number(value.stats?.biggestWalletUnits ?? wallet) || 0)),
        spinsPlayed: Math.max(0, Math.round(Number(value.stats?.spinsPlayed ?? 0) || 0)),
      },
      settings: {
        masterVolume: Math.max(0, Math.min(1, Number(value.settings?.masterVolume ?? .8))),
        musicVolume: Math.max(0, Math.min(1, Number(value.settings?.musicVolume ?? .55))),
        effectsVolume: Math.max(0, Math.min(1, Number(value.settings?.effectsVolume ?? .85))),
        turbo: Boolean(value.settings?.turbo),
        reducedMotion: Boolean(value.settings?.reducedMotion),
      },
      updatedAtIso: new Date().toISOString(),
    };
  }
}
