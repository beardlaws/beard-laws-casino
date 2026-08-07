import { describe, expect, it } from "vitest";
import {
  REEL_MOTION_PROFILES,
  assertReelMotionProfile,
  resolveReelMotionProfile,
} from "../../src/engine/animation/ReelMotionProfile";

describe("ReelMotionProfile", () => {
  it("provides distinct cabinet identities on one shared motion contract", () => {
    expect(REEL_MOTION_PROFILES.barber.duration).toBeGreaterThan(REEL_MOTION_PROFILES.cascade.duration);
    expect(REEL_MOTION_PROFILES.barber.stagger).toBeGreaterThan(REEL_MOTION_PROFILES.cascade.stagger);
    expect(REEL_MOTION_PROFILES.premium.cruiseBlurPx).toBeGreaterThan(0);
    expect(REEL_MOTION_PROFILES.voyage.settleDistance).toBeLessThan(REEL_MOTION_PROFILES.barber.settleDistance);
  });

  it("applies safe per-spin overrides without mutating the preset", () => {
    const original = REEL_MOTION_PROFILES.premium.duration;
    const result = resolveReelMotionProfile("premium", { duration: original + 400, stagger: 300 });

    expect(result.duration).toBe(original + 400);
    expect(result.stagger).toBe(300);
    expect(REEL_MOTION_PROFILES.premium.duration).toBe(original);
  });

  it("rejects profiles whose phases cannot fit inside the requested duration", () => {
    expect(() => assertReelMotionProfile({
      ...REEL_MOTION_PROFILES.premium,
      duration: 500,
    })).toThrow("too short");
  });
});
