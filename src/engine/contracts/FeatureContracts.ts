import type { Credits } from '../../types/Money';

export type FeatureStage =
  | 'beforeBaseEvaluation'
  | 'afterBaseEvaluation'
  | 'beforeAward'
  | 'afterAward'
  | 'afterSpin';

export interface ResolvedSymbolPosition {
  readonly reelIndex: number;
  readonly rowIndex: number;
  readonly symbolId: string;
}

export interface BaseEvaluationResult {
  readonly award: Credits;
  readonly winningPositions: readonly ResolvedSymbolPosition[];
  readonly metadata: Readonly<Record<string, string | number | boolean>>;
}

export interface SpinResolutionContext<TGameState, TSpinMetadata> {
  readonly spinId: string;
  readonly gameId: string;
  readonly wager: Credits;
  readonly grid: readonly (readonly string[])[];
  readonly baseEvaluation: BaseEvaluationResult;
  readonly gameState: TGameState;
  readonly spinMetadata: TSpinMetadata;
}

export interface FeatureEvent {
  readonly featureId: string;
  readonly eventType: string;
  readonly stage: FeatureStage;
  readonly message: string;
  readonly amount?: Credits;
  readonly data: Readonly<Record<string, string | number | boolean>>;
}

export interface FeatureMutation<TGameState> {
  readonly gameState: TGameState;
  readonly additionalAward: Credits;
  readonly events: readonly FeatureEvent[];
  readonly metadata: Readonly<Record<string, string | number | boolean>>;
}

export interface FeatureExecutionResult<TGameState> {
  readonly finalGameState: TGameState;
  readonly baseAward: Credits;
  readonly featureAward: Credits;
  readonly totalAward: Credits;
  readonly events: readonly FeatureEvent[];
  readonly featureMetadata: Readonly<
    Record<string, Readonly<Record<string, string | number | boolean>>>
  >;
}

export interface FeatureModule<TGameState, TSpinMetadata> {
  readonly id: string;
  readonly order: number;
  readonly stage: FeatureStage;
  isEligible(context: SpinResolutionContext<TGameState, TSpinMetadata>): boolean;
  execute(context: SpinResolutionContext<TGameState, TSpinMetadata>): FeatureMutation<TGameState>;
}
