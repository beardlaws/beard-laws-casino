import type { GameConfig, SymbolId } from '../../types/GameTypes';

const common: readonly SymbolId[] = [
  'oil', 'comb', 'razor', 'balm', 'oil', 'key', 'comb', 'oil',
  'razor', 'balm', 'crown', 'oil', 'coin', 'comb', 'razor',
  'oil', 'vault', 'balm', 'key', 'oil',
];

const reelWithVernon: readonly SymbolId[] = [
  ...common,
  'vernon',
  'comb',
  'coin',
  'oil',
  'key',
  'balm',
];

export const beardBankConfig: GameConfig = {
  id: 'beard-bank',
  title: 'Beard Bank',
  reels: 5,
  rows: 3,
  targetRtpLabel: 'Legacy design target 94.20% — pending v2 simulation',
  reelStrips: [
    common,
    common,
    reelWithVernon,
    common,
    common,
  ],
};
