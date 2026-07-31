import type {
  GameConfig,
  SymbolDefinition,
  SymbolType,
} from './GameConfig';
import type {
  BaseEvaluationResult,
  ResolvedSymbolPosition,
} from './contracts/FeatureContracts';
import {
  assertCreditUnits,
  type CreditUnits,
} from '../types/Money';

const BASIS_POINTS_SCALE = 10_000;

export interface WayWin {
  readonly symbolId: string;
  readonly matchingReelCount: number;
  readonly waysCount: number;
  readonly weightedWays: number;
  readonly payoutMultiplierBp: number;
  readonly awardUnits: CreditUnits;
  readonly winningPositions: readonly ResolvedSymbolPosition[];
}

/**
 * Evaluates adjacent left-to-right ways.
 *
 * Wild multiplier treatment is explicit per visible wild position. For each
 * reel, candidate weights are summed, then multiplied across consecutive
 * reels. This correctly aggregates normal and multiplier-wild combinations
 * without enumerating every individual way.
 */
export class WaysEvaluator {
  public evaluate(
    matrix: readonly (readonly string[])[],
    config: GameConfig,
    wagerUnits: CreditUnits,
  ): BaseEvaluationResult & { readonly wayWins: readonly WayWin[] } {
    assertCreditUnits(wagerUnits, 'Ways wager');

    if (wagerUnits === 0) {
      throw new RangeError('Ways wager must be greater than zero.');
    }

    this.assertMatrix(matrix, config);

    const symbolMap = new Map(
      config.symbols.map((symbol) => [symbol.id, symbol] as const),
    );

    const wayWins: WayWin[] = [];
    const allWinningPositions: ResolvedSymbolPosition[] = [];

    for (const target of config.symbols) {
      if (!this.isWaysPayingTarget(target, config)) {
        continue;
      }

      let matchingReelCount = 0;
      let waysCount = 1;
      let weightedWays = 1;
      const winningPositions: ResolvedSymbolPosition[] = [];

      for (
        let reelIndex = 0;
        reelIndex < config.reelCount;
        reelIndex += 1
      ) {
        const column = matrix[reelIndex];

        if (!column) {
          throw new Error(`Missing matrix column ${reelIndex}.`);
        }

        let candidateCount = 0;
        let candidateWeightSum = 0;
        const reelPositions: ResolvedSymbolPosition[] = [];

        for (let rowIndex = 0; rowIndex < column.length; rowIndex += 1) {
          const symbolId = column[rowIndex];

          if (symbolId === undefined) {
            continue;
          }

          const visibleSymbol = symbolMap.get(symbolId);

          if (!visibleSymbol) {
            throw new Error(`Unknown visible symbol "${symbolId}".`);
          }

          const candidateWeight = this.getCandidateWeight(
            target,
            visibleSymbol,
            config.waysRules.wildSubstitutesFor,
          );

          if (candidateWeight === 0) {
            continue;
          }

          candidateCount += 1;
          candidateWeightSum += candidateWeight;
          reelPositions.push({
            reelIndex,
            rowIndex,
            symbolId,
          });
        }

        if (candidateCount === 0) {
          break;
        }

        matchingReelCount += 1;
        waysCount *= candidateCount;
        weightedWays *= candidateWeightSum;
        winningPositions.push(...reelPositions);
      }

      if (
        matchingReelCount
        < config.waysRules.minimumMatchingReels
      ) {
        continue;
      }

      const payoutMultiplierBp =
        target.payoutMultiplierBpByMatchCount[matchingReelCount];

      if (
        payoutMultiplierBp === undefined
        || payoutMultiplierBp <= 0
      ) {
        continue;
      }

      const awardUnits = Math.floor(
        (
          wagerUnits
          * payoutMultiplierBp
          * weightedWays
        ) / BASIS_POINTS_SCALE,
      );

      if (awardUnits <= 0) {
        continue;
      }

      const frozenPositions = Object.freeze(
        winningPositions.map((position) => Object.freeze({ ...position })),
      );

      wayWins.push(
        Object.freeze({
          symbolId: target.id,
          matchingReelCount,
          waysCount,
          weightedWays,
          payoutMultiplierBp,
          awardUnits,
          winningPositions: frozenPositions,
        }),
      );

      allWinningPositions.push(...winningPositions);
    }

    const awardUnits = wayWins.reduce(
      (total, win) => total + win.awardUnits,
      0,
    );

    return Object.freeze({
      awardUnits,
      winningPositions: Object.freeze(
        this.deduplicatePositions(allWinningPositions),
      ),
      metadata: Object.freeze({
        evaluationMode: 'ways',
        winGroupCount: wayWins.length,
      }),
      wayWins: Object.freeze(wayWins),
    });
  }

  private getCandidateWeight(
    target: SymbolDefinition,
    visible: SymbolDefinition,
    wildSubstitutesFor: readonly SymbolType[],
  ): number {
    if (visible.id === target.id) {
      return 1;
    }

    if (visible.type !== 'wild') {
      return 0;
    }

    if (!wildSubstitutesFor.includes(target.type)) {
      return 0;
    }

    return visible.wildMultiplier ?? 1;
  }

  private isWaysPayingTarget(
    symbol: SymbolDefinition,
    config: GameConfig,
  ): boolean {
    if (symbol.type === 'wild' || symbol.type === 'scatter') {
      return false;
    }

    if (
      symbol.type === 'collector'
      && !config.waysRules.collectorPaysThroughWays
    ) {
      return false;
    }

    return true;
  }

  private assertMatrix(
    matrix: readonly (readonly string[])[],
    config: GameConfig,
  ): void {
    if (matrix.length !== config.reelCount) {
      throw new Error('Matrix reel count does not match game configuration.');
    }

    for (const [reelIndex, column] of matrix.entries()) {
      if (column.length !== config.rowCount) {
        throw new Error(
          `Matrix reel ${reelIndex} does not contain ${config.rowCount} rows.`,
        );
      }
    }
  }

  private deduplicatePositions(
    positions: readonly ResolvedSymbolPosition[],
  ): readonly ResolvedSymbolPosition[] {
    const map = new Map<string, ResolvedSymbolPosition>();

    for (const position of positions) {
      map.set(
        `${position.reelIndex}:${position.rowIndex}`,
        Object.freeze({ ...position }),
      );
    }

    return Object.freeze([...map.values()]);
  }
}
