import { describe, expect, it } from "vitest";
import { createBarberFeaturePlan, createBarberSpinOutcome, resolveBarberFinale, resolveBarberRuntime } from "../../../src/games/barber/BarberRuntime";

const MULTIPLIERS = [0, 3, 8, 20, 75] as const;

describe("BarberRuntime", () => {
  it("upgrades the exact fortress above each builder reel", () => {
    const decision = resolveBarberRuntime({
      fortressLevels: [0, 1, 4, 0, 2],
      builderCounts: [1, 2, 1, 0, 0],
      maxLevel: 4,
      fortressMultipliers: MULTIPLIERS,
      razorCount: 0,
      baseWinUnits: 0,
      isBonusSpin: false,
      wagerUnits: 100,
      attackChance: 0.48,
      attackRoll: 0.99,
      targetRoll: 0,
    });

    expect(decision.builderUpgrades).toEqual([
      { reel: 0, fromLevel: 0, toLevel: 1 },
      { reel: 1, fromLevel: 1, toLevel: 2 },
      { reel: 1, fromLevel: 2, toLevel: 3 },
    ]);
    expect(decision.fortressLevelsAfter).toEqual([1, 3, 4, 0, 2]);
    expect(decision.attack).toBeNull();
  });

  it("triggers Shave Down on three razors on a paid spin", () => {
    const decision = resolveBarberRuntime({
      fortressLevels: [1, 0, 0, 0, 0],
      builderCounts: [0, 0, 0, 0, 0],
      maxLevel: 4,
      fortressMultipliers: MULTIPLIERS,
      razorCount: 3,
      baseWinUnits: 0,
      isBonusSpin: false,
      wagerUnits: 100,
      attackChance: 1,
      attackRoll: 0,
      targetRoll: 0,
    });

    expect(decision.triggerShaveDown).toBe(true);
    expect(decision.attack).toBeNull();
  });

  it("plans a deterministic Barber attack after a failed non-upgrade spin", () => {
    const decision = resolveBarberRuntime({
      fortressLevels: [1, 0, 3, 0, 2],
      builderCounts: [0, 0, 0, 0, 0],
      maxLevel: 4,
      fortressMultipliers: MULTIPLIERS,
      razorCount: 0,
      baseWinUnits: 0,
      isBonusSpin: false,
      wagerUnits: 100,
      attackChance: 0.48,
      attackRoll: 0.1,
      targetRoll: 0.5,
    });

    expect(decision.attack).toEqual({
      targetReel: 2,
      fortressLevel: 3,
      multiplier: 20,
      awardUnits: 2000,
    });
    expect(decision.fortressLevelsAfter).toEqual([1, 0, 0, 0, 2]);
  });

  it("creates one ordered feature plan with persistence before payout", () => {
    const decision = resolveBarberRuntime({
      fortressLevels: [0, 0, 0, 0, 0],
      builderCounts: [1, 0, 0, 0, 0],
      maxLevel: 4,
      fortressMultipliers: MULTIPLIERS,
      razorCount: 3,
      baseWinUnits: 400,
      isBonusSpin: false,
      wagerUnits: 100,
      attackChance: 0.48,
      attackRoll: 0.99,
      targetRoll: 0,
    });
    const outcome = createBarberSpinOutcome({
      id: "barber-test",
      startedAtIso: "2026-08-07T00:00:00.000Z",
      completedAtIso: "2026-08-07T00:00:01.000Z",
      wagerUnits: 100,
      baseWinUnits: 400,
      resultGrid: [["builder", "wax"]],
      winnerKeys: ["0:0"],
      razorCount: 3,
      isBonusSpin: false,
      fortressLevelsBefore: [0, 0, 0, 0, 0],
      decision,
    });
    const plan = createBarberFeaturePlan(outcome);

    expect(plan.steps.map((step) => step.label)).toEqual([
      "barber-builder-upgrade",
      "barber-message",
      "barber-shave-down",
      "barber-base-payout",
      "ready",
    ]);
    expect(outcome.totalWinUnits).toBe(400);
    expect(outcome.metadata.runtime).toBe("project-beard-m13");
  });

  it("keeps the three-razor Shave Down trigger ahead of Builder upgrades and Barber attacks", () => {
    const decision = resolveBarberRuntime({
      fortressLevels: [2, 1, 0, 3, 0],
      builderCounts: [1, 0, 1, 0, 0],
      maxLevel: 4,
      fortressMultipliers: MULTIPLIERS,
      razorCount: 3,
      baseWinUnits: 500,
      isBonusSpin: false,
      wagerUnits: 100,
      attackChance: 1,
      attackRoll: 0,
      targetRoll: 0.8,
      fortressAwardScale: 0.06,
    });

    expect(decision.triggerShaveDown).toBe(true);
    expect(decision.attack).toBeNull();

    const outcome = createBarberSpinOutcome({
      id: "three-razor-proof",
      startedAtIso: "2026-08-07T00:00:00.000Z",
      completedAtIso: "2026-08-07T00:00:01.000Z",
      wagerUnits: 100,
      baseWinUnits: 500,
      resultGrid: [["razor", "razor", "razor"]],
      winnerKeys: [],
      razorCount: 3,
      isBonusSpin: false,
      fortressLevelsBefore: [2, 1, 0, 3, 0],
      decision,
    });

    expect(createBarberFeaturePlan(outcome).steps.map((step) => step.label)).toContain("barber-shave-down");
  });

  it("resolves the Final Trim from every surviving fortress with the production finale scale", () => {
    expect(resolveBarberFinale([1, 0, 2, 4, 0], MULTIPLIERS, 100, 0.03)).toEqual([
      { reel: 0, fortressLevel: 1, multiplier: 3, awardUnits: 9 },
      { reel: 2, fortressLevel: 2, multiplier: 8, awardUnits: 24 },
      { reel: 3, fortressLevel: 4, multiplier: 75, awardUnits: 225 },
    ]);
  });

});
