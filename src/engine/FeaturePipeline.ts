import type {
  FeatureEvent,
  FeatureExecutionResult,
  FeatureModule,
  SpinResolutionContext,
} from './contracts/FeatureContracts';
import { assertCreditUnits, type CreditUnits } from '../types/Money';

export interface FeaturePipelineOptions {
  readonly failFast?: boolean;
  readonly onFeatureError?: (featureId: string, error: unknown) => void;
}

export class FeaturePipeline<TGameState, TSpinMetadata> {
  private readonly modules: readonly FeatureModule<TGameState, TSpinMetadata>[];
  private readonly failFast: boolean;

  public constructor(
    modules: readonly FeatureModule<TGameState, TSpinMetadata>[],
    private readonly options: FeaturePipelineOptions = {},
  ) {
    this.modules = Object.freeze(this.validateAndSort(modules));
    this.failFast = options.failFast ?? true;
  }

  public execute(
    initialContext: SpinResolutionContext<TGameState, TSpinMetadata>,
  ): FeatureExecutionResult<TGameState> {
    this.assertContext(initialContext);

    let context = initialContext;
    let featureAwardUnits: CreditUnits = 0;

    const events: FeatureEvent[] = [];
    const featureMetadata: Record<
      string,
      Readonly<Record<string, string | number | boolean>>
    > = {};

    for (const module of this.modules) {
      if (!module.isEligible(context)) {
        continue;
      }

      try {
        const mutation = module.execute(context);
        assertCreditUnits(
          mutation.additionalAwardUnits,
          `Feature "${module.id}" award`,
        );

        featureAwardUnits += mutation.additionalAwardUnits;
        events.push(...mutation.events);
        featureMetadata[module.id] = Object.freeze({ ...mutation.metadata });

        context = Object.freeze({
          ...context,
          gameState: mutation.gameState,
        });
      } catch (error: unknown) {
        this.options.onFeatureError?.(module.id, error);

        if (this.failFast) {
          throw new FeaturePipelineExecutionError(module.id, error);
        }

        events.push(
          Object.freeze({
            featureId: module.id,
            eventType: 'featureError',
            stage: module.stage,
            message: `Feature "${module.id}" failed and was skipped.`,
            data: Object.freeze({}),
          }),
        );
      }
    }

    const baseAwardUnits = initialContext.baseEvaluation.awardUnits;

    return Object.freeze({
      finalGameState: context.gameState,
      baseAwardUnits,
      featureAwardUnits,
      totalAwardUnits: baseAwardUnits + featureAwardUnits,
      events: Object.freeze([...events]),
      featureMetadata: Object.freeze({ ...featureMetadata }),
    });
  }

  public getRegisteredModules(): readonly FeatureModule<
    TGameState,
    TSpinMetadata
  >[] {
    return this.modules;
  }

  private validateAndSort(
    modules: readonly FeatureModule<TGameState, TSpinMetadata>[],
  ): FeatureModule<TGameState, TSpinMetadata>[] {
    const ids = new Set<string>();

    for (const module of modules) {
      if (module.id.trim().length === 0) {
        throw new Error('Feature id is required.');
      }

      if (!Number.isInteger(module.order) || module.order < 0) {
        throw new RangeError(
          `Feature "${module.id}" requires a non-negative integer order.`,
        );
      }

      if (ids.has(module.id)) {
        throw new Error(`Duplicate feature id: "${module.id}".`);
      }

      ids.add(module.id);
    }

    return [...modules].sort(
      (left, right) =>
        STAGE_ORDER[left.stage] - STAGE_ORDER[right.stage]
        || left.order - right.order
        || left.id.localeCompare(right.id),
    );
  }

  private assertContext(
    context: SpinResolutionContext<TGameState, TSpinMetadata>,
  ): void {
    if (context.spinId.trim().length === 0) {
      throw new Error('Spin id is required.');
    }

    if (context.gameId.trim().length === 0) {
      throw new Error('Game id is required.');
    }

    assertCreditUnits(context.wagerUnits, 'Feature pipeline wager');

    if (context.wagerUnits === 0) {
      throw new RangeError('Feature pipeline wager must be greater than zero.');
    }

    assertCreditUnits(
      context.baseEvaluation.awardUnits,
      'Base evaluation award',
    );
  }
}

export class FeaturePipelineExecutionError extends Error {
  public constructor(
    public readonly featureId: string,
    public override readonly cause: unknown,
  ) {
    super(`Feature pipeline failed while executing "${featureId}".`);
    this.name = 'FeaturePipelineExecutionError';
  }
}

const STAGE_ORDER = {
  afterBaseEvaluation: 0,
  beforeAward: 1,
  afterAward: 2,
  afterSpin: 3,
} as const;
