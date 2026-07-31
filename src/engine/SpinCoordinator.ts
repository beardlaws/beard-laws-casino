import type { FeatureExecutionResult } from './contracts/FeatureContracts';
import type {
  WalletSnapshot,
  WalletTransaction,
} from './contracts/WalletContracts';
import type { WalletPort } from './contracts/WalletContracts';
import { FeaturePipeline } from './FeaturePipeline';
import type { GameConfig } from './GameConfig';
import { validateGameConfig } from './GameConfig';
import type { SpinGrid } from './ReelGenerator';
import { ReelGenerator } from './ReelGenerator';
import type { WayWin } from './WaysEvaluator';
import { WaysEvaluator } from './WaysEvaluator';
import { assertCreditUnits, type CreditUnits } from '../types/Money';

export interface SpinMetadataFactory<TSpinMetadata> {
  create(
    grid: SpinGrid,
    config: GameConfig,
  ): TSpinMetadata;
}

export interface SpinCoordinatorDependencies {
  readonly createSpinId: () => string;
}

export interface SpinResult<TGameState> {
  readonly spinId: string;
  readonly gameId: string;
  readonly wagerUnits: CreditUnits;
  readonly grid: SpinGrid;
  readonly wayWins: readonly WayWin[];
  readonly baseAwardUnits: CreditUnits;
  readonly featureAwardUnits: CreditUnits;
  readonly totalAwardUnits: CreditUnits;
  readonly featureResolution: FeatureExecutionResult<TGameState>;
  readonly wagerTransaction: WalletTransaction;
  readonly awardTransaction?: WalletTransaction;
  readonly walletAfter: WalletSnapshot;
}

/**
 * Coordinates one complete math transaction.
 *
 * Outcome generation and feature evaluation complete before wallet mutation.
 * This prevents a failed math module from leaving a wager debited without a
 * resolved spin. Wallet ledger ordering remains wager first, award second.
 */
export class SpinCoordinator<TGameState, TSpinMetadata> {
  public constructor(
    private readonly wallet: WalletPort,
    private readonly reelGenerator: ReelGenerator,
    private readonly waysEvaluator: WaysEvaluator,
    private readonly featurePipeline: FeaturePipeline<
      TGameState,
      TSpinMetadata
    >,
    private readonly metadataFactory: SpinMetadataFactory<TSpinMetadata>,
    private readonly config: GameConfig,
    private readonly dependencies: SpinCoordinatorDependencies,
  ) {
    validateGameConfig(config);
  }

  public executeSpin(
    wagerUnits: CreditUnits,
    gameState: TGameState,
  ): SpinResult<TGameState> {
    this.assertAllowedWager(wagerUnits);

    if (!this.wallet.canAfford(wagerUnits)) {
      throw new Error('Insufficient fictional casino-wallet balance.');
    }

    const spinId = this.dependencies.createSpinId();

    if (spinId.trim().length === 0) {
      throw new Error('Spin id factory returned an empty id.');
    }

    const grid = this.reelGenerator.generate(this.config);
    const baseEvaluation = this.waysEvaluator.evaluate(
      grid.matrix,
      this.config,
      wagerUnits,
    );

    const spinMetadata = this.metadataFactory.create(grid, this.config);

    const featureResolution = this.featurePipeline.execute({
      spinId,
      gameId: this.config.id,
      wagerUnits,
      grid: grid.matrix,
      baseEvaluation,
      gameState,
      spinMetadata,
    });

    const wagerTransaction = this.wallet.placeWager(wagerUnits, {
      reason: `${this.config.title} spin`,
      metadata: {
        gameId: this.config.id,
        spinId,
      },
    });

    const totalAwardUnits = featureResolution.totalAwardUnits;

    const awardTransaction =
      totalAwardUnits > 0
        ? this.wallet.award(totalAwardUnits, {
            reason: `${this.config.title} spin award`,
            metadata: {
              gameId: this.config.id,
              spinId,
              baseAwardUnits: featureResolution.baseAwardUnits,
              featureAwardUnits: featureResolution.featureAwardUnits,
            },
          })
        : undefined;

    const result: SpinResult<TGameState> = {
      spinId,
      gameId: this.config.id,
      wagerUnits,
      grid,
      wayWins: baseEvaluation.wayWins,
      baseAwardUnits: featureResolution.baseAwardUnits,
      featureAwardUnits: featureResolution.featureAwardUnits,
      totalAwardUnits,
      featureResolution,
      wagerTransaction,
      walletAfter: this.wallet.getSnapshot(),
      ...(awardTransaction ? { awardTransaction } : {}),
    };

    return Object.freeze(result);
  }

  private assertAllowedWager(wagerUnits: CreditUnits): void {
    assertCreditUnits(wagerUnits, 'Spin wager');

    if (!this.config.allowedWagersUnits.includes(wagerUnits)) {
      throw new RangeError(
        `Wager ${wagerUnits} is not allowed by "${this.config.id}".`,
      );
    }
  }
}
