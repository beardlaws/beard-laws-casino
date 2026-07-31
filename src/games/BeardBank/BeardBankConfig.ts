export interface BeardBankGameState {
  readonly livingVaultCharges: number;
  readonly lifetimeCoinsCollected: number;
  readonly bonusActive: boolean;
}

export interface BeardBankSpinMetadata {
  readonly visibleCoinCount: number;
  readonly scatterCount: number;
  readonly vernonOnReelThree: boolean;
}

export const BEARD_BANK_GAME_ID = 'beard-bank' as const;

export const initialBeardBankGameState: BeardBankGameState = {
  livingVaultCharges: 0,
  lifetimeCoinsCollected: 0,
  bonusActive: false,
};
