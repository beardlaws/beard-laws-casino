import { describe, expect, it } from 'vitest';
import { evaluate243Ways } from './ReelEvaluator';
import type { Grid } from '../types/GameTypes';

describe('evaluate243Ways', () => {
  it('evaluates matching adjacent reels from left to right', () => {
    const grid: Grid = [
      ['oil', 'oil', 'comb'],
      ['oil', 'razor', 'oil'],
      ['oil', 'balm', 'key'],
      ['crown', 'comb', 'razor'],
      ['key', 'vault', 'coin'],
    ];

    const result = evaluate243Ways(grid, 1);

    expect(result.amount).toBeGreaterThan(0);
    expect(result.details.some((detail) => detail.startsWith('oil: 3 reels'))).toBe(true);
  });

  it('does not pay disconnected matching symbols', () => {
    const grid: Grid = [
      ['oil', 'comb', 'razor'],
      ['balm', 'key', 'crown'],
      ['oil', 'oil', 'oil'],
      ['oil', 'oil', 'oil'],
      ['oil', 'oil', 'oil'],
    ];

    expect(evaluate243Ways(grid, 1).amount).toBe(0);
  });
});
