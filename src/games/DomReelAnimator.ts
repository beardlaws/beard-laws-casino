import { spinReelStrips, type ReelStripOptions } from "../engine/animation/ReelEngine";
export type { ReelMotionPreset, ReelMotionProfile, ReelMotionOverrides } from "../engine/animation/ReelMotionProfile";

export type ReelAnimationOptions<T> = ReelStripOptions<T>;

/** Backwards-compatible entry point used by all active DOM slot cabinets. */
export const animateDomReels = spinReelStrips;
