import type { JamSymbol } from "./MeghConfig";
import type { MeghGrid } from "./MeghBoard";

export interface MeghDropMotion {
  readonly x: number;
  readonly y: number;
  readonly fromY: number;
  readonly isNew: boolean;
  readonly symbol: JamSymbol;
}

export interface MeghCascadeResolution {
  readonly grid: MeghGrid;
  readonly motions: readonly MeghDropMotion[];
  readonly removed: ReadonlySet<string>;
}

/**
 * Resolves one authoritative gravity step for Megh's board.
 *
 * Each column is compacted independently from bottom to top. Existing symbols
 * retain their exact source row so rendering never has to guess where a symbol
 * came from (important when duplicate symbols exist in multiple columns).
 */
export const resolveMeghCascade = (
  before: MeghGrid,
  removed: ReadonlySet<string>,
  rows: number,
  cols: number,
  pick: () => JamSymbol,
): MeghCascadeResolution => {
  const after: MeghGrid = Array.from({ length: rows }, () => Array<JamSymbol>(cols));
  const motions: MeghDropMotion[] = [];

  for (let x = 0; x < cols; x += 1) {
    const survivors: Array<{ symbol: JamSymbol; fromY: number }> = [];
    for (let y = rows - 1; y >= 0; y -= 1) {
      if (!removed.has(`${x}:${y}`)) survivors.push({ symbol: before[y]![x]!, fromY: y });
    }

    let survivorIndex = 0;
    let newIndex = 0;
    for (let y = rows - 1; y >= 0; y -= 1) {
      const survivor = survivors[survivorIndex];
      if (survivor) {
        survivorIndex += 1;
        after[y]![x] = survivor.symbol;
        motions.push(Object.freeze({
          x,
          y,
          fromY: survivor.fromY,
          isNew: false,
          symbol: survivor.symbol,
        }));
      } else {
        const symbol = pick();
        after[y]![x] = symbol;
        motions.push(Object.freeze({
          x,
          y,
          // Negative rows mean "spawn above the visible board". Multiple new
          // symbols get separate launch rows so they fall as a real stack.
          fromY: -1 - newIndex,
          isNew: true,
          symbol,
        }));
        newIndex += 1;
      }
    }
  }

  return Object.freeze({
    grid: after,
    motions: Object.freeze(motions),
    removed: new Set(removed),
  });
};
