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
    payoutMultiplierBpByMatchCount: { 4: 5_950, 5: 17_850 },
  },
  {
    id: 'razor',
    name: 'Straight Razor',
    type: 'low',
    payoutMultiplierBpByMatchCount: { 4: 7_735, 5: 22_610 },
  },
  {
    id: 'balm',
    name: 'Beard Balm',
    type: 'low',
    payoutMultiplierBpByMatchCount: { 4: 9_520, 5: 28_560 },
  },
  {
    id: 'oil',
    name: 'Beard Oil',
    type: 'medium',
    payoutMultiplierBpByMatchCount: { 4: 11_900, 5: 35_700 },
  },
  {
    id: 'crown',
    name: 'Crown',
    type: 'high',
    payoutMultiplierBpByMatchCount: { 3: 3_000, 4: 23_800, 5: 89_250 },
  },
  {
    id: 'vault-crest',
    name: 'Vault Crest',
    type: 'high',
    payoutMultiplierBpByMatchCount: { 3: 4_000, 4: 33_320, 5: 130_900 },
  },
  {
    id: 'luxury-kit',
    name: 'Luxury Beard Kit',
    type: 'high',
    payoutMultiplierBpByMatchCount: { 3: 5_500, 4: 47_600, 5: 214_200 },
  },
  {
    id: 'vernon',
    name: 'Vaultmaster Vernon',
    type: 'collector',
    payoutMultiplierBpByMatchCount: {},
  },
  {
    id: 'beard-coin',
    name: 'Beard Coin',
    type: 'coin',
    payoutMultiplierBpByMatchCount: {},
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
  {
    id: 'jackpot-key',
    name: 'Jackpot Key',
    type: 'collector',
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
    ['comb','razor','oil','balm','crown','comb','razor','vault-crest','oil','balm','luxury-kit','comb','razor','oil','crown','balm','comb','razor','beard-coin','beard-coin','beard-coin','oil','balm','crown','comb','razor','oil','vault-crest','balm','comb','gold-crest','razor','oil','crown','balm','luxury-kit','comb','razor','jackpot-key','balm','crown','comb','razor','vault-crest','oil','balm','comb','razor','oil','crown','balm','luxury-kit','comb','razor','vault-door','vault-door','vault-door','crown','comb','vernon','jackpot-key','comb','jackpot-key','razor','jackpot-key','oil','jackpot-key','balm','jackpot-key','crown','jackpot-key','comb','jackpot-key','razor','jackpot-key','oil','jackpot-key','balm','jackpot-key','vault-crest','jackpot-key','comb','jackpot-key','razor','jackpot-key','oil','jackpot-key','balm','jackpot-key','luxury-kit','jackpot-key','comb','jackpot-key','razor','jackpot-key','oil','jackpot-key','balm','jackpot-key','crown','jackpot-key','comb','razor','oil','balm','crown','vault-crest','luxury-kit','comb','jackpot-key','razor','oil','balm','crown','jackpot-key','comb','razor','oil','jackpot-key','balm','vernon'],
    ['razor','oil','balm','comb','vault-crest','razor','oil','crown','balm','comb','luxury-kit','razor','oil','balm','crown','comb','jackpot-key','oil','vault-crest','balm','comb','razor','oil','crown','balm','comb','razor','luxury-kit','oil','balm','gold-crest','comb','jackpot-key','crown','oil','balm','comb','razor','vault-crest','oil','balm','comb','crown','razor','oil','balm','luxury-kit','comb','jackpot-key','oil','crown','balm','comb','beard-coin','razor','oil','vault-door','balm','crown','comb'],
    ['oil','balm','comb','razor','crown','oil','balm','vault-crest','comb','razor','luxury-kit','oil','jackpot-key','comb','crown','razor','oil','balm','vault-crest','comb','razor','oil','balm','crown','jackpot-key','razor','oil','luxury-kit','balm','comb','gold-crest','razor','oil','crown','balm','comb','jackpot-key','oil','vault-crest','balm','comb','razor','crown','oil','balm','comb','luxury-kit','razor','oil','jackpot-key','crown','comb','razor','beard-coin','oil','balm','vault-door','crown','comb','vernon'],
    ['balm','comb','razor','oil','vault-crest','balm','comb','crown','razor','oil','luxury-kit','balm','jackpot-key','razor','crown','oil','balm','comb','vault-crest','razor','oil','balm','jackpot-key','crown','razor','oil','balm','luxury-kit','comb','razor','gold-crest','oil','balm','crown','jackpot-key','razor','oil','balm','vault-crest','comb','razor','oil','crown','balm','comb','jackpot-key','luxury-kit','oil','balm','comb','crown','razor','oil','beard-coin','balm','comb','vault-door','razor','crown','oil'],
    ['comb','balm','oil','razor','crown','comb','balm','vault-crest','oil','razor','luxury-kit','comb','jackpot-key','oil','crown','razor','comb','balm','vault-crest','oil','razor','comb','jackpot-key','crown','oil','razor','comb','luxury-kit','balm','oil','gold-crest','razor','comb','crown','jackpot-key','oil','razor','comb','vault-crest','balm','oil','razor','crown','comb','balm','jackpot-key','luxury-kit','razor','comb','balm','crown','oil','razor','beard-coin','comb','balm','vault-door','oil','crown','razor'],
  ],
  waysRules: {
    minimumMatchingReels: 3,
    direction: 'leftToRight',
    wildSubstitutesFor: ['low', 'medium', 'high'],
    scatterPaysThroughWays: false,
    collectorPaysThroughWays: false,
  },
  theoreticalRtpTargetBp: 9_550,
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
