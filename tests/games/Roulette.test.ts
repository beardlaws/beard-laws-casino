import { describe, expect, it } from "vitest";
import { BEARDFALL_LANDING_ANGLE, BEARDFALL_SPIN_DURATION_MS, displayedPocketAtLanding, ROULETTE_POCKETS, ROYAL_BALL_FINAL_ROTATION_DEGREES, ROYAL_BALL_LANDING_INSET_PERCENT, ROYAL_LANDING_ANGLE, ROYAL_SPIN_DURATION_MS, RouletteGame, wheelLandingRotation } from "../../src/games/Roulette";

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

  it("finishes the Royal ball at the top numbered pocket rather than the center hub", () => {
    expect(Math.abs(ROYAL_BALL_FINAL_ROTATION_DEGREES % 360)).toBe(0);
    expect(ROYAL_BALL_LANDING_INSET_PERCENT).toBeLessThan(6);
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

  it("settles every standard American inside bet at the correct return", () => {
    expect(multiplier({ kind: "split", pocket: "17|20" }, "20")).toBe(18);
    expect(multiplier({ kind: "street", pocket: "1|2|3" }, "2")).toBe(12);
    expect(multiplier({ kind: "corner", pocket: "1|2|4|5" }, "5")).toBe(9);
    expect(multiplier({ kind: "firstfive", pocket: "0|00|1|2|3" }, "00")).toBe(7);
    expect(multiplier({ kind: "sixline", pocket: "1|2|3|4|5|6" }, "6")).toBe(6);
    expect(multiplier({ kind: "corner", pocket: "1|2|4|5" }, "8")).toBe(0);
  });

  it("makes 0 and 00 lose on all outside bets", () => {
    for (const kind of ["red", "black", "odd", "even", "low", "high", "dozen1", "column1"]) {
      expect(multiplier({ kind }, "0")).toBe(0);
      expect(multiplier({ kind }, "00")).toBe(0);
    }
  });

  it("maps every outside wager to the pockets that should light on the wheel", () => {
    const covered = (bet: object): string[] =>
      (game as unknown as { coveredPockets: (value: object) => string[] }).coveredPockets(bet);
    expect(covered({ kind: "black" })).toHaveLength(18);
    expect(covered({ kind: "black" })).toContain("10");
    expect(covered({ kind: "black" })).not.toContain("3");
    expect(covered({ kind: "red" })).toHaveLength(18);
    expect(covered({ kind: "odd" })).toHaveLength(18);
    expect(covered({ kind: "dozen3" })).toEqual(expect.arrayContaining(["25", "36"]));
    expect(covered({ kind: "straight", pocket: "1" })).toEqual(["1"]);
    expect(covered({ kind: "corner", pocket: "1|2|4|5" })).toEqual(["1", "2", "4", "5"]);
  });
});
