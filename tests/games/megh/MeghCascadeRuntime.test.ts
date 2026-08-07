import { describe, expect, it } from "vitest";
import { resolveMeghCascade } from "../../../src/games/megh/MeghCascadeRuntime";
import type { JamSymbol } from "../../../src/games/megh/MeghConfig";

const symbol = (id: string): JamSymbol => ({ id, label: id, art: "", weight: 1, pay: 1 });

describe("MeghCascadeRuntime", () => {
  it("keeps gravity isolated to each column even when symbols repeat", () => {
    const a = symbol("a");
    const b = symbol("b");
    const grid = [
      [a, a],
      [b, b],
      [a, a],
    ];
    let fresh = 0;
    const resolution = resolveMeghCascade(
      grid,
      new Set(["0:2"]),
      3,
      2,
      () => symbol(`new-${fresh++}`),
    );

    expect(resolution.grid[2]?.[0]?.id).toBe("b");
    expect(resolution.grid[1]?.[0]?.id).toBe("a");
    expect(resolution.grid[2]?.[1]?.id).toBe("a");

    const rightBottom = resolution.motions.find((motion) => motion.x === 1 && motion.y === 2);
    expect(rightBottom?.fromY).toBe(2);
    expect(rightBottom?.isNew).toBe(false);
  });

  it("spawns replacements above the board and preserves exact board size", () => {
    const grid = [
      [symbol("a")],
      [symbol("b")],
      [symbol("c")],
    ];
    let fresh = 0;
    const resolution = resolveMeghCascade(
      grid,
      new Set(["0:1", "0:2"]),
      3,
      1,
      () => symbol(`new-${fresh++}`),
    );

    expect(resolution.grid).toHaveLength(3);
    expect(resolution.grid[2]?.[0]?.id).toBe("a");
    const newMotions = resolution.motions.filter((motion) => motion.isNew);
    expect(newMotions).toHaveLength(2);
    expect(newMotions.every((motion) => motion.fromY < 0)).toBe(true);
  });
});
