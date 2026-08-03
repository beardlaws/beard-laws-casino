import { describe, expect, it } from "vitest";
import { BEARDFALL_LANDING_ANGLE, BEARDFALL_SPIN_DURATION_MS, displayedPocketAtLanding, ROULETTE_POCKETS, ROYAL_LANDING_ANGLE, ROYAL_SPIN_DURATION_MS, RouletteGame, wheelLandingRotation } from "../../src/games/Roulette";

const game = new RouletteGame({} as HTMLElement, false, () => 10_000, () => undefined, () => undefined);
const multiplier = (bet: object, result: string): number =>
  (game as unknown as { returnMultiplier: (bet: object, result: string) => number }).returnMultiplier(bet, result);

describe("American roulette settlement", () => {
  it("has 38 unique pockets including 0 and 00", () => {
    expect(ROULETTE_POCKETS).toHaveLength(38);
    expect(new Set(ROULETTE_POCKETS).size).toBe(38);
    expect(ROULETTE_POCKETS).toContain("0");
    expect(ROULETTE_POCKETS).toContain("00");
  });

  it.each([false, true])("lands every visual pocket on the settled result (freeFall=%s)", (freeFall) => {
    for (const result of ROULETTE_POCKETS) {
      const rotation = wheelLandingRotation(result, freeFall);
      expect(displayedPocketAtLanding(rotation, freeFall)).toBe(result);
    }
  });

  it("uses different fixed physical landing points and full-length spins", () => {
    expect(ROYAL_LANDING_ANGLE).toBe(0);
    expect(BEARDFALL_LANDING_ANGLE).toBe(180);
    expect(ROYAL_SPIN_DURATION_MS).toBeGreaterThanOrEqual(9_500);
    expect(BEARDFALL_SPIN_DURATION_MS).toBeGreaterThanOrEqual(12_500);
  });

  it("returns stake plus 35:1 profit on a straight win", () => {
    expect(multiplier({ kind: "straight", pocket: "17" }, "17")).toBe(36);
    expect(multiplier({ kind: "straight", pocket: "17" }, "18")).toBe(0);
  });

  it("settles even-money, dozen, and column bets", () => {
    expect(multiplier({ kind: "red" }, "3")).toBe(2);
    expect(multiplier({ kind: "even" }, "20")).toBe(2);
    expect(multiplier({ kind: "dozen2" }, "17")).toBe(3);
    expect(multiplier({ kind: "column2" }, "17")).toBe(3);
  });

  it("makes 0 and 00 lose on all outside bets", () => {
    for (const kind of ["red", "black", "odd", "even", "low", "high", "dozen1", "column1"]) {
      expect(multiplier({ kind }, "0")).toBe(0);
      expect(multiplier({ kind }, "00")).toBe(0);
    }
  });
});
