import { describe, expect, it } from "vitest";
import type { FeatureExecutionPlan } from "../../src/engine/contracts/FeatureExecution";
import { FeatureExecutionPipeline } from "../../src/engine/feature/FeatureExecutionPipeline";

function plan(id: string, labels: string[]): FeatureExecutionPlan {
  return {
    schemaVersion: 1,
    id,
    spinOutcomeId: `outcome-${id}`,
    game: "megh",
    createdAtIso: "2026-08-06T00:00:00.000Z",
    steps: labels.map((label, order) => ({
      id: `${id}-${order}`,
      kind: order === labels.length - 1 ? "complete" : "feature",
      game: "megh",
      order,
      delayMs: 0,
      label,
      payload: {},
    })),
  };
}

describe("FeatureExecutionPipeline", () => {
  it("executes steps and plans serially", async () => {
    const events: string[] = [];

    const pipeline = new FeatureExecutionPipeline({
      observer: {
        onPlanStart: (value) => events.push(`start:${value.id}`),
        onStepStart: ({ step }) => events.push(`step:${step.label}`),
        onPlanComplete: (value) => events.push(`done:${value.id}`),
      },
    });

    await Promise.all([
      pipeline.enqueue(plan("one", ["goat", "ready"])),
      pipeline.enqueue(plan("two", ["ufo", "ready"])),
    ]);

    expect(events).toEqual([
      "start:one",
      "step:goat",
      "step:ready",
      "done:one",
      "start:two",
      "step:ufo",
      "step:ready",
      "done:two",
    ]);

    expect(pipeline.isRunning).toBe(false);
    expect(pipeline.pendingCount).toBe(0);
  });

  it("rejects duplicate step orders", async () => {
    const invalid = plan("bad", ["a", "b"]);

    const duplicate: FeatureExecutionPlan = {
      ...invalid,
      steps: invalid.steps.map((step) => ({
        ...step,
        order: 0,
      })),
    };

    const pipeline = new FeatureExecutionPipeline();

    await expect(
      Promise.resolve().then(() => pipeline.enqueue(duplicate)),
    ).rejects.toThrow("Duplicate feature step order");
  });
});
