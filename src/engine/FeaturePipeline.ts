import type {
  FeatureEvent, FeatureExecutionResult, FeatureModule, SpinResolutionContext,
} from './contracts/FeatureContracts';
import { roundCredits, type Credits } from '../types/Money';

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
    let featureAward: Credits = 0;
    const events: FeatureEvent[] = [];
    const featureMetadata: Record<
      string,
      Readonly<Record<string, string | number | boolean>>
    > = {};

    for (const module of this.modules) {
      if (!module.isEligible(context)) continue;

      try {
        const mutation = module.execute(context);
        this.assertAward(module.id, mutation.additionalAward);
        featureAward = roundCredits(featureAward + mutation.additionalAward);
        events.push(...mutation.events);
        featureMetadata[module.id] = Object.freeze({ ...mutation.metadata });
        context = Object.freeze({ ...context, gameState: mutation.gameState });
      } catch (error: unknown) {
        this.options.onFeatureError?.(module.id, error);
        if (this.failFast) throw new FeaturePipelineExecutionError(module.id, error);
        events.push(Object.freeze({
          featureId: module.id,
          eventType: 'featureError',
          stage: module.stage,
          message: `Feature "${module.id}" failed and was skipped.`,
          data: Object.freeze({}),
        }));
      }
    }

    const baseAward = roundCredits(initialContext.baseEvaluation.award);
    return Object.freeze({
      finalGameState: context.gameState,
      baseAward,
      featureAward,
      totalAward: roundCredits(baseAward + featureAward),
      events: Object.freeze([...events]),
      featureMetadata: Object.freeze({ ...featureMetadata }),
    });
  }

  public getRegisteredModules(): readonly FeatureModule<TGameState, TSpinMetadata>[] {
    return this.modules;
  }

  private validateAndSort(
    modules: readonly FeatureModule<TGameState, TSpinMetadata>[],
  ): FeatureModule<TGameState, TSpinMetadata>[] {
    const ids = new Set<string>();
    for (const module of modules) {
      if (module.id.trim().length === 0) throw new Error('Feature id is required.');
      if (!Number.isInteger(module.order) || module.order < 0) {
        throw new RangeError(`Feature "${module.id}" requires a non-negative order.`);
      }
      if (ids.has(module.id)) throw new Error(`Duplicate feature id: ${module.id}.`);
      ids.add(module.id);
    }

    return [...modules].sort((a, b) =>
      STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage]
      || a.order - b.order
      || a.id.localeCompare(b.id),
    );
  }

  private assertContext(context: SpinResolutionContext<TGameState, TSpinMetadata>): void {
    if (context.spinId.trim().length === 0) throw new Error('Spin id is required.');
    if (context.gameId.trim().length === 0) throw new Error('Game id is required.');
    if (!Number.isFinite(context.wager) || context.wager <= 0) {
      throw new RangeError('Wager must be greater than zero.');
    }
    this.assertAward('baseEvaluation', context.baseEvaluation.award);
  }

  private assertAward(featureId: string, award: Credits): void {
    if (!Number.isFinite(award) || award < 0) {
      throw new RangeError(`Feature "${featureId}" returned an invalid award.`);
    }
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
  beforeBaseEvaluation: 0,
  afterBaseEvaluation: 1,
  beforeAward: 2,
  afterAward: 3,
  afterSpin: 4,
} as const;
