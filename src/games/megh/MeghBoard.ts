import type { JamSymbol } from "./MeghConfig";
import { resolveMeghCascade } from "./MeghCascadeRuntime";

export type MeghGrid = JamSymbol[][];

export interface MeghCluster {
  cells: Set<string>;
  symbol: JamSymbol;
}

export const pickMeghSymbol = (
  symbols: readonly JamSymbol[],
  random: () => number,
  weightFor: (symbol: JamSymbol) => number = (symbol) => symbol.weight,
): JamSymbol => {
  const totalWeight = symbols.reduce((sum, symbol) => sum + weightFor(symbol), 0);
  let roll = random() * totalWeight;
  for (const symbol of symbols) {
    roll -= weightFor(symbol);
    if (roll < 0) return symbol;
  }
  return symbols[0]!;
};

export const makeMeghGrid = (
  rows: number,
  cols: number,
  pick: () => JamSymbol,
): MeghGrid => Array.from({ length: rows }, () => Array.from({ length: cols }, pick));

export const findMeghClusters = (
  grid: MeghGrid,
  rows: number,
  cols: number,
  minimum = 6,
): MeghCluster[] => {
  const visited = new Set<string>();
  const found: MeghCluster[] = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const key = `${x}:${y}`;
      if (visited.has(key)) continue;
      const base = grid[y]![x]!;
      if (base.id === "ufo" || base.id === "wild") {
        visited.add(key);
        continue;
      }
      const cells = new Set<string>();
      const queue: Array<[number, number]> = [[x, y]];
      while (queue.length > 0) {
        const [cx, cy] = queue.pop()!;
        const cellKey = `${cx}:${cy}`;
        if (visited.has(cellKey)) continue;
        const current = grid[cy]?.[cx];
        if (!current || (current.id !== base.id && current.id !== "wild")) continue;
        visited.add(cellKey);
        cells.add(cellKey);
        queue.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
      }
      if (cells.size >= minimum) found.push({ cells, symbol: base });
    }
  }
  return found;
};

export const tumbleMeghGrid = (
  grid: MeghGrid,
  removed: ReadonlySet<string>,
  rows: number,
  cols: number,
  pick: () => JamSymbol,
): MeghGrid => resolveMeghCascade(grid, removed, rows, cols, pick).grid;
