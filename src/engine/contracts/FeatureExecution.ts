import type { CasinoGameId } from "../../state/CasinoProgression";

export type FeatureExecutionStepKind =
  | "presentation"
  | "feature"
  | "progression"
  | "payout"
  | "complete";

export interface FeatureExecutionStep {
  readonly id: string;
  readonly kind: FeatureExecutionStepKind;
  readonly game: CasinoGameId;
  readonly order: number;
  readonly delayMs: number;
  readonly label: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface FeatureExecutionPlan {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly spinOutcomeId: string;
  readonly game: CasinoGameId;
  readonly createdAtIso: string;
  readonly steps: readonly FeatureExecutionStep[];
}

export interface FeatureExecutionContext {
  readonly plan: FeatureExecutionPlan;
  readonly step: FeatureExecutionStep;
  readonly signal: AbortSignal;
}

export interface FeatureExecutionObserver {
  onPlanStart?(plan: FeatureExecutionPlan): void;
  onStepStart?(context: FeatureExecutionContext): void;
  onStepComplete?(context: FeatureExecutionContext): void;
  onPlanComplete?(plan: FeatureExecutionPlan): void;
  onPlanCancelled?(plan: FeatureExecutionPlan): void;
  onError?(plan: FeatureExecutionPlan, step: FeatureExecutionStep | null, error: unknown): void;
}
