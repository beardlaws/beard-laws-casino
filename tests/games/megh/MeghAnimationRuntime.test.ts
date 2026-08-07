import { describe, expect, it } from "vitest";
import { meghDropDuration } from "../../../src/games/megh/MeghAnimationRuntime";

describe("MeghAnimationRuntime", () => {
  it("gives longer falls more time without growing linearly", () => {
    expect(meghDropDuration(1)).toBeGreaterThanOrEqual(500);
    expect(meghDropDuration(4)).toBeGreaterThan(meghDropDuration(1));
    expect(meghDropDuration(9) - meghDropDuration(4)).toBeLessThan(meghDropDuration(4) - meghDropDuration(1) + 80);
  });
});
