import type { RandomSource } from '../../src/engine/RandomSource';

export class TestRandomSource implements RandomSource {
  private index = 0;

  public constructor(private readonly values: readonly number[]) {
    if (values.length === 0) {
      throw new Error('TestRandomSource requires at least one value.');
    }
  }

  public nextInt(minInclusive: number, maxInclusive: number): number {
    const value = this.values[this.index % this.values.length];
    this.index += 1;

    if (value === undefined || value < minInclusive || value > maxInclusive) {
      throw new RangeError(
        `Test value ${String(value)} is outside ${minInclusive}-${maxInclusive}.`,
      );
    }

    return value;
  }
}
