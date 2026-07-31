import { describe, expect, it } from 'vitest';
import type { GameConfig } from '../../src/engine/GameConfig';
import { WaysEvaluator } from '../../src/engine/WaysEvaluator';

const config: GameConfig = {
  id: 'test-game',
  title: 'Test Game',
  reelCount: 5,
  rowCount: 3,
  evaluationMode: 'ways',
  allowedWagersUnits: [100],
  symbols: [
    {
      id: 'a',
      name: 'A',
      type: 'low',
      payoutMultiplierBpByMatchCount: { 3: 10_000 },
    },
    {
      id: 'wild',
      name: 'Wild',
      type: 'wild',
      payoutMultiplierBpByMatchCount: {},
      wildMultiplier: 2,
    },
    {
      id: 'x',
      name: 'X',
      type: 'medium',
      payoutMultiplierBpByMatchCount: {},
    },
  ],
  reelStrips: [
    ['a', 'wild', 'x'],
    ['a', 'wild', 'x'],
    ['a', 'wild', 'x'],
    ['x', 'x', 'x'],
    ['x', 'x', 'x'],
  ],
  waysRules: {
    minimumMatchingReels: 3,
    direction: 'leftToRight',
    wildSubstitutesFor: ['low', 'medium'],
    scatterPaysThroughWays: false,
    collectorPaysThroughWays: false,
  },
  theoreticalRtpTargetBp: 9_000,
};

describe('WaysEvaluator', () => {
  it('aggregates multiplier-wild combinations without enumerating every way', () => {
    const evaluator = new WaysEvaluator();

    const result = evaluator.evaluate(
      [
        ['a', 'wild', 'x'],
        ['a', 'wild', 'x'],
        ['a', 'wild', 'x'],
        ['x', 'x', 'x'],
        ['x', 'x', 'x'],
      ],
      config,
      100,
    );

    expect(result.wayWins).toHaveLength(1);
    expect(result.wayWins[0]?.waysCount).toBe(8);
    expect(result.wayWins[0]?.weightedWays).toBe(27);
    expect(result.awardUnits).toBe(2_700);
  });
});
