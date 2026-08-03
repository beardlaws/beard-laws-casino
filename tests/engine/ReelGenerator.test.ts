import { describe, expect, it } from 'vitest';
import { ReelGenerator } from '../../src/engine/ReelGenerator';
import { beardBankConfig } from '../../src/games/BeardBank/BeardBankConfig';
import { TestRandomSource } from './TestRandomSource';

describe('ReelGenerator', () => {
  it('creates a deterministic reel-major visible matrix', () => {
    const generator = new ReelGenerator(
      new TestRandomSource([0, 1, 2, 3, 4]),
    );

    const result = generator.generate(beardBankConfig);

    expect(result.stops).toEqual([0, 1, 2, 3, 4]);
    expect(result.matrix).toHaveLength(5);
    expect(result.matrix[0]).toEqual(['comb', 'razor', 'oil']);
  });
});
