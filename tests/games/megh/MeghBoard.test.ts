import { describe, expect, it } from "vitest";
import { findMeghClusters, makeMeghGrid, tumbleMeghGrid } from "../../../src/games/megh/MeghBoard";
import type { JamSymbol } from "../../../src/games/megh/MeghConfig";

const symbol = (id: string): JamSymbol => ({ id, label: id, art: "", weight: 1, pay: 1 });

describe("MeghBoard", () => {
  it("creates the requested board dimensions", () => {
    const grid = makeMeghGrid(5, 6, () => symbol("amp"));
    expect(grid).toHaveLength(5);
    expect(grid.every((row) => row.length === 6)).toBe(true);
  });

  it("detects orthogonally connected clusters with wild substitution", () => {
    const a = symbol("amp");
    const w = symbol("wild");
    const b = symbol("vinyl");
    const grid = [
      [a, a, b],
      [a, w, b],
      [a, a, b],
    ];
    const clusters = findMeghClusters(grid, 3, 3, 6);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.cells.size).toBe(6);
  });

  it("preserves board dimensions and fills removed spaces after gravity", () => {
    let counter = 0;
    const grid = [
      [symbol("a"), symbol("b")],
      [symbol("c"), symbol("d")],
      [symbol("e"), symbol("f")],
    ];
    const next = tumbleMeghGrid(grid, new Set(["0:2", "0:1"]), 3, 2, () => symbol(`new-${counter++}`));
    expect(next).toHaveLength(3);
    expect(next.every((row) => row.length === 2)).toBe(true);
    expect(next[2]?.[0]?.id).toBe("a");
    expect(next.flat().some((entry) => entry.id.startsWith("new-"))).toBe(true);
  });
});
