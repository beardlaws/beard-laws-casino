import type { CasinoGameId } from "../../state/CasinoProgression";

export type SpinFeatureId =
  | "bonus"
  | "coin"
  | "stage"
  | "voyage"
  | string;

export interface SpinFeatureTrigger {
  readonly id: SpinFeatureId;
  readonly value?: number;
  readonly amountUnits?: number;
}

export interface SpinProgressionChange {
  readonly kind: "coin" | "stage" | "voyage" | "custom";
  readonly value?: number;
  readonly amountUnits?: number;
}

export interface SpinPresentationCue {
  readonly atMs: number;
  readonly state: string;
}

/**
 * Shared diagnostic result for one paid or free spin.
 *
 * Milestone 2 intentionally derives this object from the production activity
 * stream so existing cabinets keep their current behavior. Later cabinet math
 * extraction can populate baseWinUnits, featureWinUnits, resultGrid, and seed
 * directly without changing telemetry, replay, QA, or progression consumers.
 */
export interface SpinOutcome {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly game: CasinoGameId;
  readonly startedAtIso: string;
  readonly completedAtIso: string;
  readonly wagerUnits: number;
  readonly baseWinUnits: number;
  readonly featureWinUnits: number;
  readonly totalWinUnits: number;
  readonly winMultiplier: number;
  readonly features: readonly SpinFeatureTrigger[];
  readonly progression: readonly SpinProgressionChange[];
  readonly presentation: readonly SpinPresentationCue[];
  readonly seed?: string;
  readonly resultGrid?: readonly (readonly string[])[];
  readonly metadata: Readonly<Record<string, unknown>>;
}
