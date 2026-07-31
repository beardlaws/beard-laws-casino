import type { CreditUnits } from '../types/Money';

export type EvaluationMode = 'ways';

export type SymbolType =
  | 'low'
  | 'medium'
  | 'high'
  | 'wild'
  | 'scatter'
  | 'collector'
  | 'coin';

export interface SymbolDefinition {
  readonly id: string;
  readonly name: string;
  readonly type: SymbolType;

  /**
   * Per-way payout multipliers represented in basis points.
   * 10_000 basis points = 1.00x the total wager.
   */
  readonly payoutMultiplierBpByMatchCount: Readonly<
    Partial<Record<number, number>>
  >;

  /**
   * Wild multiplier applied to a way that uses this wild position.
   * A normal wild uses 1.
   */
  readonly wildMultiplier?: number;
}

export interface WaysRules {
  readonly minimumMatchingReels: number;
  readonly direction: 'leftToRight';
  readonly wildSubstitutesFor: readonly SymbolType[];
  readonly scatterPaysThroughWays: false;
  readonly collectorPaysThroughWays: boolean;
}

export interface GameConfig {
  readonly id: string;
  readonly title: string;
  readonly reelCount: number;
  readonly rowCount: number;
  readonly evaluationMode: EvaluationMode;
  readonly allowedWagersUnits: readonly CreditUnits[];
  readonly symbols: readonly SymbolDefinition[];
  readonly reelStrips: readonly (readonly string[])[];
  readonly waysRules: WaysRules;

  /**
   * Informational design target only. Runtime code does not manipulate
   * outcomes to force this value.
   */
  readonly theoreticalRtpTargetBp: number;
}

export function validateGameConfig(config: GameConfig): void {
  if (config.id.trim().length === 0) {
    throw new Error('Game configuration requires an id.');
  }

  if (!Number.isInteger(config.reelCount) || config.reelCount < 1) {
    throw new RangeError('Game reel count must be a positive integer.');
  }

  if (!Number.isInteger(config.rowCount) || config.rowCount < 1) {
    throw new RangeError('Game row count must be a positive integer.');
  }

  if (config.reelStrips.length !== config.reelCount) {
    throw new Error('Reel strip count must match reel count.');
  }

  const symbolIds = new Set(config.symbols.map((symbol) => symbol.id));

  if (symbolIds.size !== config.symbols.length) {
    throw new Error('Game symbol ids must be unique.');
  }

  for (const [reelIndex, strip] of config.reelStrips.entries()) {
    if (strip.length < config.rowCount) {
      throw new Error(
        `Reel ${reelIndex} must contain at least ${config.rowCount} stops.`,
      );
    }

    for (const symbolId of strip) {
      if (!symbolIds.has(symbolId)) {
        throw new Error(
          `Reel ${reelIndex} references unknown symbol "${symbolId}".`,
        );
      }
    }
  }

  for (const wager of config.allowedWagersUnits) {
    if (!Number.isSafeInteger(wager) || wager <= 0) {
      throw new RangeError('Allowed wagers must be positive integer units.');
    }
  }
}
