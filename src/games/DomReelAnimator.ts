import { spinReelStrips, type ReelStripOptions } from "../engine/animation/ReelEngine";

export type ReelAnimationOptions<T> = ReelStripOptions<T>;

/** Backwards-compatible entry point used by the current games. */
export const animateDomReels = spinReelStrips;
