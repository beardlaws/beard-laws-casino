export type ReelMotionPreset = "premium" | "barber" | "voyage" | "cascade" | "bonus";

export interface ReelMotionProfile {
  readonly duration: number;
  readonly stagger: number;
  readonly fillerRows: number;
  readonly accelerationMs: number;
  readonly decelerationMs: number;
  readonly settleMs: number;
  readonly settleDistance: number;
  readonly cruiseBlurPx: number;
  readonly decelerationBlurPx: number;
}

export const REEL_MOTION_PROFILES: Readonly<Record<ReelMotionPreset, ReelMotionProfile>> = Object.freeze({
  premium: Object.freeze({
    duration: 2100,
    stagger: 210,
    fillerRows: 22,
    accelerationMs: 300,
    decelerationMs: 760,
    settleMs: 140,
    settleDistance: 0.11,
    cruiseBlurPx: 0.72,
    decelerationBlurPx: 0.28,
  }),
  barber: Object.freeze({
    duration: 2280,
    stagger: 255,
    fillerRows: 28,
    accelerationMs: 325,
    decelerationMs: 820,
    settleMs: 165,
    settleDistance: 0.13,
    cruiseBlurPx: 0.82,
    decelerationBlurPx: 0.32,
  }),
  voyage: Object.freeze({
    duration: 1980,
    stagger: 205,
    fillerRows: 20,
    accelerationMs: 285,
    decelerationMs: 720,
    settleMs: 145,
    settleDistance: 0.10,
    cruiseBlurPx: 0.68,
    decelerationBlurPx: 0.24,
  }),
  cascade: Object.freeze({
    duration: 1540,
    stagger: 145,
    fillerRows: 14,
    accelerationMs: 215,
    decelerationMs: 535,
    settleMs: 105,
    settleDistance: 0.075,
    cruiseBlurPx: 0.58,
    decelerationBlurPx: 0.18,
  }),
  bonus: Object.freeze({
    duration: 1740,
    stagger: 170,
    fillerRows: 17,
    accelerationMs: 245,
    decelerationMs: 610,
    settleMs: 120,
    settleDistance: 0.085,
    cruiseBlurPx: 0.62,
    decelerationBlurPx: 0.20,
  }),
});

export type ReelMotionOverrides = Partial<ReelMotionProfile>;

export function resolveReelMotionProfile(
  preset: ReelMotionPreset | ReelMotionProfile = "premium",
  overrides: ReelMotionOverrides = {},
): ReelMotionProfile {
  const base = typeof preset === "string" ? REEL_MOTION_PROFILES[preset] : preset;
  const result: ReelMotionProfile = Object.freeze({ ...base, ...overrides });
  assertReelMotionProfile(result);
  return result;
}

export function assertReelMotionProfile(profile: ReelMotionProfile): void {
  const positive: readonly (keyof ReelMotionProfile)[] = [
    "duration",
    "stagger",
    "fillerRows",
    "accelerationMs",
    "decelerationMs",
    "settleMs",
  ];

  for (const key of positive) {
    const value = profile[key];
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`Invalid reel motion ${key}: ${value}.`);
    }
  }

  if (!Number.isFinite(profile.settleDistance) || profile.settleDistance < 0 || profile.settleDistance > 0.5) {
    throw new RangeError(`Invalid reel motion settleDistance: ${profile.settleDistance}.`);
  }

  for (const key of ["cruiseBlurPx", "decelerationBlurPx"] as const) {
    const value = profile[key];
    if (!Number.isFinite(value) || value < 0 || value > 4) {
      throw new RangeError(`Invalid reel motion ${key}: ${value}.`);
    }
  }

  const minimum = profile.accelerationMs + profile.decelerationMs + profile.settleMs + 80;
  if (profile.duration <= minimum) {
    throw new RangeError(
      `Reel motion duration ${profile.duration}ms is too short for its acceleration/deceleration/settle phases (${minimum}ms minimum).`,
    );
  }
}
