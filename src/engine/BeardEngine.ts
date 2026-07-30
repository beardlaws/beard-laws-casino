import type { GameConfig, Grid, SpinRequest, SpinResult } from '../types/GameTypes';
import type { RandomSource } from './RNG';
import { FeaturePipeline, type FeatureState } from './FeaturePipeline';
import { Wallet } from './Wallet';

export interface EngineSnapshot {
  readonly bank: number;
  readonly tripWallet: number;
  readonly vaultCharges: number;
  readonly spins: number;
  readonly wagered: number;
  readonly returned: number;
  readonly sessionRtp: number;
  readonly lastResult: SpinResult | null;
}

export class BeardEngine {
  private readonly wallet: Wallet;
  private readonly featureState: FeatureState = { vaultCharges: 0 };
  private readonly pipeline: FeaturePipeline;
  private spins = 0;
  private wagered = 0;
  private returned = 0;
  private lastResult: SpinResult | null = null;

  public constructor(
    private readonly config: GameConfig,
    private readonly random: RandomSource,
  ) {
    this.wallet = new Wallet(2_000, 200);
    this.pipeline = new FeaturePipeline(this.random, this.featureState);
  }

  public spin(request: SpinRequest): SpinResult {
    if (request.winMode !== 'ways') {
      throw new Error('Phase 1 currently enables 243-Ways mode only.');
    }

    this.wallet.wager(request.bet);
    this.spins += 1;
    this.wagered = round(this.wagered + request.bet);

    const grid = this.generateGrid();
    const result = this.pipeline.evaluate(grid, request.bet);

    if (result.totalWin > 0) {
      this.wallet.credit(result.totalWin);
      this.returned = round(this.returned + result.totalWin);
    }

    this.lastResult = result;
    return result;
  }

  public get snapshot(): EngineSnapshot {
    const wallet = this.wallet.snapshot;
    return {
      bank: wallet.bank,
      tripWallet: wallet.tripWallet,
      vaultCharges: this.featureState.vaultCharges,
      spins: this.spins,
      wagered: this.wagered,
      returned: this.returned,
      sessionRtp: this.wagered === 0 ? 0 : round((this.returned / this.wagered) * 100),
      lastResult: this.lastResult,
    };
  }

  private generateGrid(): Grid {
    return this.config.reelStrips.map((strip) => {
      const stop = this.random.nextInt(strip.length);
      return Array.from({ length: this.config.rows }, (_, row) => {
        const offset = row - 1;
        const index = (stop + offset + strip.length) % strip.length;
        const symbol = strip[index];
        if (symbol === undefined) {
          throw new Error('Reel strip generated an invalid stop.');
        }
        return symbol;
      });
    });
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
