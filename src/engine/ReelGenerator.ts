import type { GameConfig } from './GameConfig';
import { validateGameConfig } from './GameConfig';
import type { RandomSource } from './RandomSource';

export interface SpinGrid {
  readonly stops: readonly number[];
  readonly matrix: readonly (readonly string[])[];
}

/**
 * Resolves one independent virtual stop per reel and returns a reel-major grid:
 * matrix[reelIndex][rowIndex].
 */
export class ReelGenerator {
  public constructor(private readonly randomSource: RandomSource) {}

  public generate(config: GameConfig): SpinGrid {
    validateGameConfig(config);

    const stops: number[] = [];
    const matrix: string[][] = [];

    for (let reelIndex = 0; reelIndex < config.reelCount; reelIndex += 1) {
      const strip = config.reelStrips[reelIndex];

      if (!strip) {
        throw new Error(`Missing reel strip ${reelIndex}.`);
      }

      const stopIndex = this.randomSource.nextInt(0, strip.length - 1);
      const column: string[] = [];

      for (let rowIndex = 0; rowIndex < config.rowCount; rowIndex += 1) {
        const symbolIndex = (stopIndex + rowIndex) % strip.length;
        const symbolId = strip[symbolIndex];

        if (symbolId === undefined) {
          throw new Error(
            `Unable to resolve reel ${reelIndex}, row ${rowIndex}.`,
          );
        }

        column.push(symbolId);
      }

      stops.push(stopIndex);
      matrix.push(column);
    }

    return Object.freeze({
      stops: Object.freeze(stops),
      matrix: Object.freeze(
        matrix.map((column) => Object.freeze(column)),
      ),
    });
  }
}
