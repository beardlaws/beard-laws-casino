export type EncoreMode = "long-set" | "power-chords" | "ufo-storm";
export type CosmicEvent =
  | "UFO SCAN"
  | "AMPLIFIER OVERLOAD"
  | "MYSTERY SIGNAL"
  | "STAGGERED REEL RUSH"
  | "GOAT STAMPEDE"
  | "COSMIC COLLISION"
  | "COSMIC WEATHER CLEAR";

export interface JamSymbol {
  id: string;
  label: string;
  art: string;
  weight: number;
  pay: number;
}

export const meghArt = (name: string): string =>
  new URL(`../../../assets/megh/${name}.png`, import.meta.url).href;

export const MEGH_SYMBOLS: readonly JamSymbol[] = [
  { id: "strawberry", label: "STRAWBERRY", art: meghArt("strawberry"), weight: 24, pay: 6 },
  { id: "amp", label: "JAM AMP", art: meghArt("amp"), weight: 20, pay: 8 },
  { id: "guitar", label: "COSMIC GUITAR", art: meghArt("guitar"), weight: 17, pay: 11 },
  { id: "vinyl", label: "VINYL", art: meghArt("vinyl"), weight: 15, pay: 14 },
  { id: "goat", label: "ROCK GOAT", art: meghArt("goat"), weight: 11, pay: 20 },
  { id: "megh", label: "MEGH", art: meghArt("megh-cosmic-v2"), weight: 7, pay: 30 },
  { id: "wild", label: "WILD NOTE", art: meghArt("note"), weight: 5, pay: 18 },
  { id: "ufo", label: "ENCORE UFO", art: meghArt("ufo"), weight: 1.4, pay: 0 },
];

export const MEGH_COLS = 6;
export const MEGH_ROWS = 5;
export const MEGH_SOUNDCHECK_TARGET = 100;
export const MEGH_MAX_FEATURE_DROPS = 100;
export const MEGH_MAX_RETRIGGER_DROPS = 40;

export const MEGH_PRODUCTION_MATH = {
  cols: MEGH_COLS,
  rows: MEGH_ROWS,
  soundcheckTarget: MEGH_SOUNDCHECK_TARGET,
  maxFeatureDrops: MEGH_MAX_FEATURE_DROPS,
  maxRetriggerDrops: MEGH_MAX_RETRIGGER_DROPS,
  clusterMinimum: 6,
  maxCascades: 8,
  cascadePayScale: 2.9,
  featurePayScale: 0.4,
  symbols: MEGH_SYMBOLS.map(({ id, weight, pay }) => ({ id, weight, pay })),
} as const;
