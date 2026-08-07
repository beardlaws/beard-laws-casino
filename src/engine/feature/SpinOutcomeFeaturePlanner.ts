import type { SpinOutcome } from "../contracts/SpinOutcome";
import type { FeatureExecutionPlan, FeatureExecutionStep } from "../contracts/FeatureExecution";

/**
 * Converts a completed SpinOutcome into the shared execution language.
 *
 * M3 is observer-only: cabinets keep their current animations while the plan is
 * recorded, tested, and exposed to QA/replay. M4+ can move cabinet effects into
 * handlers one feature at a time without changing the contract again.
 */
export function planFeatureExecution(outcome: SpinOutcome): FeatureExecutionPlan {
  const steps: FeatureExecutionStep[] = [];
  let order = 0;

  for (const cue of [...outcome.presentation].sort((a, b) => a.atMs - b.atMs)) {
    steps.push({
      id: `${outcome.id}-presentation-${order}`,
      kind: "presentation",
      game: outcome.game,
      order: order++,
      delayMs: 0,
      label: cue.state,
      payload: Object.freeze({ atMs: cue.atMs, state: cue.state }),
    });
  }

  for (const feature of outcome.features) {
    steps.push({
      id: `${outcome.id}-feature-${order}`,
      kind: "feature",
      game: outcome.game,
      order: order++,
      delayMs: 0,
      label: String(feature.id),
      payload: Object.freeze({ ...feature }),
    });
  }

  for (const change of outcome.progression) {
    steps.push({
      id: `${outcome.id}-progression-${order}`,
      kind: "progression",
      game: outcome.game,
      order: order++,
      delayMs: 0,
      label: change.kind,
      payload: Object.freeze({ ...change }),
    });
  }

  if (outcome.totalWinUnits > 0) {
    steps.push({
      id: `${outcome.id}-payout-${order}`,
      kind: "payout",
      game: outcome.game,
      order: order++,
      delayMs: 0,
      label: "payout",
      payload: Object.freeze({
        baseWinUnits: outcome.baseWinUnits,
        featureWinUnits: outcome.featureWinUnits,
        totalWinUnits: outcome.totalWinUnits,
        winMultiplier: outcome.winMultiplier,
      }),
    });
  }

  steps.push({
    id: `${outcome.id}-complete-${order}`,
    kind: "complete",
    game: outcome.game,
    order,
    delayMs: 0,
    label: "ready",
    payload: Object.freeze({ outcomeId: outcome.id }),
  });

  return Object.freeze({
    schemaVersion: 1,
    id: `plan-${outcome.id}`,
    spinOutcomeId: outcome.id,
    game: outcome.game,
    createdAtIso: new Date().toISOString(),
    steps: Object.freeze(steps.map((step) => Object.freeze(step))),
  });
}
