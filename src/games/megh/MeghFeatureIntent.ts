export interface MeghTileTarget {
  readonly x: number;
  readonly y: number;
}

export type MeghGoatPersonality = "regular" | "baby" | "fat" | "golden" | "space";

export type MeghFeatureIntent =
  | {
      readonly kind: "goat-eat";
      readonly targets: readonly MeghTileTarget[];
      readonly personality: MeghGoatPersonality;
    }
  | {
      readonly kind: "ufo-abduct";
      readonly targets: readonly MeghTileTarget[];
    };

const normalizeTargets = (
  targets: readonly MeghTileTarget[],
  cols: number,
  rows: number,
): readonly MeghTileTarget[] => {
  const seen = new Set<string>();
  const normalized: MeghTileTarget[] = [];
  for (const target of targets) {
    if (!Number.isInteger(target.x) || !Number.isInteger(target.y)) continue;
    if (target.x < 0 || target.x >= cols || target.y < 0 || target.y >= rows) continue;
    const key = `${target.x}:${target.y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(Object.freeze({ x: target.x, y: target.y }));
  }
  return Object.freeze(normalized);
};

export const createGoatEatIntent = (
  targets: readonly MeghTileTarget[],
  cols: number,
  rows: number,
  personality: MeghGoatPersonality = "regular",
): MeghFeatureIntent => Object.freeze({
  kind: "goat-eat" as const,
  personality,
  targets: normalizeTargets(targets, cols, rows),
});

export const createUfoAbductIntent = (
  targets: readonly MeghTileTarget[],
  cols: number,
  rows: number,
): MeghFeatureIntent => Object.freeze({
  kind: "ufo-abduct" as const,
  targets: normalizeTargets(targets, cols, rows),
});
