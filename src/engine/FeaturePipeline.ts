import type { CoinValue, Grid, SpinResult } from '../types/GameTypes';
import type { RandomSource } from './RNG';
import { evaluate243Ways, evaluateScatters } from './ReelEvaluator';

export interface FeatureState {
  vaultCharges: number;
}

export class FeaturePipeline {
  public constructor(
    private readonly random: RandomSource,
    private readonly featureState: FeatureState,
  ) {}

  public evaluate(grid: Grid, bet: number): SpinResult {
    const resolutionLog: string[] = [];
    const vaultChargesBefore = this.featureState.vaultCharges;

    resolutionLog.push('1. Evaluate 243 Ways');
    const ways = evaluate243Ways(grid, bet);

    resolutionLog.push('2. Evaluate Scatters');
    const scatterWin = evaluateScatters(grid, bet);

    resolutionLog.push("3. Evaluate Vernon's Favor");
    const coinValues = this.assignCoinValues(grid, bet);
    const vernonOnReelThree = grid[2]?.includes('vernon') ?? false;
    const vernonWin = vernonOnReelThree
      ? coinValues.reduce((sum, coin) => sum + coin.value, 0)
      : 0;

    resolutionLog.push('4. Add Living Vault Charges');
    const coinsLanded = coinValues.length;
    this.featureState.vaultCharges += coinsLanded;
    const livingVaultTriggered = this.featureState.vaultCharges >= 30;
    if (livingVaultTriggered) {
      this.featureState.vaultCharges %= 30;
    }

    resolutionLog.push('5. Ledger / Save');
    const totalWin = round(ways.amount + scatterWin + vernonWin);

    return {
      grid,
      wager: bet,
      baseWin: ways.amount,
      scatterWin,
      vernonWin: round(vernonWin),
      totalWin,
      coinValues,
      coinsLanded,
      vaultChargesBefore,
      vaultChargesAfter: this.featureState.vaultCharges,
      livingVaultTriggered,
      resolutionLog,
    };
  }

  private assignCoinValues(grid: Grid, bet: number): readonly CoinValue[] {
    const values: CoinValue[] = [];
    const multipliers = [1, 1, 1, 2, 2, 3, 5, 10, 25];

    grid.forEach((reel, reelIndex) => {
      reel.forEach((symbol, rowIndex) => {
        if (symbol !== 'coin') {
          return;
        }
        const multiplier = multipliers[this.random.nextInt(multipliers.length)];
        if (multiplier === undefined) {
          throw new Error('Coin multiplier table lookup failed.');
        }
        values.push({
          reel: reelIndex,
          row: rowIndex,
          value: round(multiplier * bet),
        });
      });
    });

    return values;
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
