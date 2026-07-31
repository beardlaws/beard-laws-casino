import type {
  GameConfig,
  SymbolDefinition,
} from '../../engine/GameConfig';
import type {
  SpinMetadataFactory,
} from '../../engine/SpinCoordinator';
import type { SpinGrid } from '../../engine/ReelGenerator';

export interface BeardBankGameState {
  readonly livingVaultCharges: number;
  readonly lifetimeCoinsCollected: number;
  readonly bonusActive: boolean;
}

export interface BeardBankSpinMetadata {
  readonly visibleCoinCount: number;
  readonly scatterCount: number;
  readonly vernonCount: number;
}

export const BEARD_BANK_GAME_ID = 'beard-bank' as const;

const symbols: readonly SymbolDefinition[] = [
  {
    id: 'comb',
    name: 'Comb',
    type: 'low',
    payoutMultiplierBpByMatchCount: { 3: 500, 4: 1_000, 5: 2_000 },
  },
  {
    id: 'oil',
    name: 'Beard Oil',
    type: 'medium',
    payoutMultiplierBpByMatchCount: { 3: 750, 4: 1_500, 5: 3_500 },
  },
  {
    id: 'crown',
    name: 'Crown',
    type: 'high',
    payoutMultiplierBpByMatchCount: { 3: 1_500, 4: 4_000, 5: 10_000 },
  },
  {
    id: 'vernon',
    name: 'Vaultmaster Vernon',
    type: 'collector',
    payoutMultiplierBpByMatchCount: { 3: 2_000, 4: 6_000, 5: 15_000 },
  },
  {
    id: 'beard-coin',
    name: 'Beard Coin',
    type: 'coin',
    payoutMultiplierBpByMatchCount: { 3: 1_000, 4: 3_000, 5: 8_000 },
  },
  {
    id: 'gold-crest',
    name: 'Gold Beard Crest',
    type: 'wild',
    payoutMultiplierBpByMatchCount: {},
    wildMultiplier: 1,
  },
  {
    id: 'vault-door',
    name: 'Vault Door',
    type: 'scatter',
    payoutMultiplierBpByMatchCount: {},
  },
];

export const beardBankConfig: GameConfig = {
  id: BEARD_BANK_GAME_ID,
  title: 'Beard Bank',
  reelCount: 5,
  rowCount: 3,
  evaluationMode: 'ways',
  allowedWagersUnits: [25, 50, 75, 100, 150, 200, 300, 500, 1_000],
  symbols,
  reelStrips: [
    ['comb', 'oil', 'comb', 'beard-coin', 'crown', 'comb', 'vault-door', 'oil', 'gold-crest', 'comb', 'vernon', 'oil'],
    ['oil', 'comb', 'crown', 'comb', 'beard-coin', 'oil', 'gold-crest', 'comb', 'vault-door', 'oil', 'vernon', 'comb'],
    ['comb', 'oil', 'vernon', 'crown', 'beard-coin', 'comb', 'gold-crest', 'oil', 'vault-door', 'comb', 'oil', 'crown'],
    ['oil', 'comb', 'crown', 'beard-coin', 'comb', 'oil', 'gold-crest', 'comb', 'vernon', 'oil', 'vault-door', 'comb'],
    ['comb', 'oil', 'crown', 'comb', 'beard-coin', 'oil', 'gold-crest', 'comb', 'vault-door', 'vernon', 'oil', 'comb'],
  ],
  waysRules: {
    minimumMatchingReels: 3,
    direction: 'leftToRight',
    wildSubstitutesFor: ['low', 'medium', 'high', 'collector', 'coin'],
    scatterPaysThroughWays: false,
    collectorPaysThroughWays: true,
  },
  theoreticalRtpTargetBp: 9_420,
};

export const initialBeardBankGameState: BeardBankGameState = {
  livingVaultCharges: 0,
  lifetimeCoinsCollected: 0,
  bonusActive: false,
};

export const beardBankSpinMetadataFactory: SpinMetadataFactory<
  BeardBankSpinMetadata
> = {
  create(grid: SpinGrid): BeardBankSpinMetadata {
    const visibleSymbols = grid.matrix.flat();

    return Object.freeze({
      visibleCoinCount: visibleSymbols.filter(
        (symbolId) => symbolId === 'beard-coin',
      ).length,
      scatterCount: visibleSymbols.filter(
        (symbolId) => symbolId === 'vault-door',
      ).length,
      vernonCount: visibleSymbols.filter(
        (symbolId) => symbolId === 'vernon',
      ).length,
    });
  },
};
