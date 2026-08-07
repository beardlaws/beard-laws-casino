import { describe, expect, it } from "vitest";
import type { SpinOutcome } from "../../src/engine/contracts/SpinOutcome";
import { planFeatureExecution } from "../../src/engine/feature/SpinOutcomeFeaturePlanner";

const outcome: SpinOutcome = {
  schemaVersion: 1,
  id: "megh-1",
  game: "megh",
  startedAtIso: "2026-08-06T00:00:00.000Z",
  completedAtIso: "2026-08-06T00:00:01.000Z",
  wagerUnits: 100,
  baseWinUnits: 200,
  featureWinUnits: 300,
  totalWinUnits: 500,
  winMultiplier: 5,
  features: [{ id: "ufo", value: 2 }],
  progression: [{ kind: "stage", value: 1 }],
  presentation: [{ atMs: 500, state: "FEATURE_ACTIVE" }, { atMs: 100, state: "EVALUATING" }],
  metadata: {},
};

describe("planFeatureExecution", () => {
  it("creates a deterministic ordered plan from one spin outcome", () => {
    const plan = planFeatureExecution(outcome);
    expect(plan.spinOutcomeId).toBe(outcome.id);
    expect(plan.steps.map((step) => step.kind)).toEqual([
      "presentation",
      "presentation",
      "feature",
      "progression",
      "payout",
      "complete",
    ]);
    expect(plan.steps[0]?.label).toBe("EVALUATING");
    expect(plan.steps.map((step) => step.order)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});
