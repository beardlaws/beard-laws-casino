import {
  resolveReelMotionProfile,
  type ReelMotionOverrides,
  type ReelMotionPreset,
  type ReelMotionProfile,
} from "./ReelMotionProfile";

export type ReelPhase = "accelerating" | "cruising" | "decelerating" | "settling" | "stopped";

export interface ReelStripOptions<T> {
  host: HTMLElement;
  finalColumns: readonly (readonly T[])[];
  rows: number;
  randomSymbol: () => T;
  renderSymbol: (symbol: T, reel: number, row: number) => string;
  profile?: ReelMotionPreset | ReelMotionProfile;
  motion?: ReelMotionOverrides;
  /** Compatibility overrides. Prefer profile/motion for new code. */
  duration?: number;
  stagger?: number;
  fillerRows?: number;
  anticipationReel?: number;
  anticipationDelay?: number;
  settleDistance?: number;
  onSpinStart?: () => void;
  onReelPhase?: (reel: number, phase: ReelPhase) => void;
  onReelStop?: (reel: number) => void;
  onSpinComplete?: () => void;
}

export interface ReelRuntimeEventDetail {
  readonly reel?: number;
  readonly phase?: ReelPhase;
  readonly preset: string;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const easeInCubic = (t: number): number => t * t * t;
const easeOutQuint = (t: number): number => 1 - Math.pow(1 - t, 5);
const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const nextFrame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));
const wait = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));

function dispatchRuntimeEvent(name: string, detail: ReelRuntimeEventDetail): void {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

/**
 * Project Beard shared DOM reel engine.
 *
 * Every active DOM cabinet uses the same motion phases and event hooks. The
 * cabinet selects a named profile (premium/barber/voyage/cascade/bonus) and
 * may override only the values that are genuinely game-specific.
 *
 * Motion direction is top-to-bottom. The previous settled result remains
 * below the temporary motion layer until the new result is locked, avoiding
 * black frames or empty reel windows between spin and reveal.
 */
export async function spinReelStrips<T>(options: ReelStripOptions<T>): Promise<void> {
  const {
    host,
    finalColumns,
    rows,
    randomSymbol,
    renderSymbol,
    anticipationReel = -1,
    anticipationDelay = 950,
    onSpinStart,
    onReelPhase,
    onReelStop,
    onSpinComplete,
  } = options;

  const presetName = typeof options.profile === "string" ? options.profile : "custom";
  const motion = resolveReelMotionProfile(options.profile ?? "premium", {
    ...options.motion,
    ...(options.duration !== undefined ? { duration: options.duration } : {}),
    ...(options.stagger !== undefined ? { stagger: options.stagger } : {}),
    ...(options.fillerRows !== undefined ? { fillerRows: options.fillerRows } : {}),
    ...(options.settleDistance !== undefined ? { settleDistance: options.settleDistance } : {}),
  });

  const reelCount = finalColumns.length;
  if (reelCount === 0 || rows <= 0) return;

  onSpinStart?.();
  dispatchRuntimeEvent("casino:reel-spin-start", { preset: presetName });
  window.dispatchEvent(new CustomEvent("casino:sound", { detail: { cue: "reel-start" } }));

  const lockedHeight = Math.round(host.getBoundingClientRect().height);
  if (lockedHeight > 0) host.style.height = `${lockedHeight}px`;
  host.classList.remove("has-win", "reel-engine-landed");
  host.classList.add("reel-engine-host", "reel-engine-spinning");
  host.dataset.reelProfile = presetName;
  host.style.setProperty("--reel-count", String(reelCount));
  host.style.setProperty("--reel-cruise-blur", `${motion.cruiseBlurPx}px`);
  host.style.setProperty("--reel-decel-blur", `${motion.decelerationBlurPx}px`);
  host.style.setProperty("--reel-settle-ms", `${motion.settleMs}ms`);

  const motionLayer = document.createElement("div");
  motionLayer.className = "reel-engine-motion";
  motionLayer.style.setProperty("--reel-count", String(reelCount));
  motionLayer.setAttribute("aria-hidden", "true");
  host.appendChild(motionLayer);

  const stopTimes = finalColumns.map((_, reel) =>
    motion.duration + reel * motion.stagger + (reel === anticipationReel ? anticipationDelay : 0),
  );
  const fillerCounts = stopTimes.map((stopTime) => Math.max(motion.fillerRows, Math.ceil(stopTime / 68)));

  motionLayer.innerHTML = finalColumns.map((finalReel, reel) => {
    const fillerCount = fillerCounts[reel]!;
    const strip = [...finalReel, ...Array.from({ length: fillerCount }, randomSymbol)];
    return `<div class="reel-engine-window" data-reel-engine-window="${reel}"><div class="reel-engine-track">${strip
      .map((symbol, index) => renderSymbol(symbol, reel, index < rows ? index : index - rows))
      .join("")}</div></div>`;
  }).join("");

  await nextFrame();
  await nextFrame();

  const windows = [...motionLayer.querySelectorAll<HTMLElement>(".reel-engine-window")];
  const tracks = windows.map((windowNode) => windowNode.querySelector<HTMLElement>(".reel-engine-track")!);
  const cellHeights = windows.map((windowNode) => windowNode.getBoundingClientRect().height / rows);
  const distances = fillerCounts.map((count, reel) => count * cellHeights[reel]!);
  const settlePixels = cellHeights.map((height) => Math.max(2, height * motion.settleDistance));

  windows.forEach((windowNode, reel) => {
    const distance = distances[reel]!;
    windowNode.style.setProperty("--reel-cell-height", `${cellHeights[reel]!}px`);
    tracks[reel]!.style.transform = `translate3d(0,${-distance.toFixed(3)}px,0)`;
    onReelPhase?.(reel, "accelerating");
  });

  await nextFrame();

  if (anticipationReel >= 0) {
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("casino:sound", { detail: { cue: "anticipation" } }));
      dispatchRuntimeEvent("casino:reel-anticipation", { reel: anticipationReel, preset: presetName });
    }, Math.max(450, motion.duration - 420));
  }

  const start = performance.now();
  const maxStop = Math.max(...stopTimes);
  const phases: ReelPhase[] = finalColumns.map(() => "accelerating");
  const stopped = finalColumns.map(() => false);

  const setPhase = (reel: number, phase: ReelPhase): void => {
    if (phases[reel] === phase) return;
    phases[reel] = phase;
    const node = windows[reel]!;
    node.dataset.reelPhase = phase;
    onReelPhase?.(reel, phase);
    dispatchRuntimeEvent("casino:reel-phase", { reel, phase, preset: presetName });
  };

  await new Promise<void>((resolve) => {
    const frame = (now: number): void => {
      const elapsed = now - start;
      let allStopped = true;

      tracks.forEach((track, reel) => {
        const stopTime = stopTimes[reel]!;
        const distance = distances[reel]!;
        const settle = settlePixels[reel]!;
        const cruiseEnd = Math.max(motion.accelerationMs, stopTime - motion.decelerationMs - motion.settleMs);
        const settleStart = stopTime - motion.settleMs;

        if (elapsed >= stopTime) {
          track.style.transform = "translate3d(0,0,0)";
          setPhase(reel, "stopped");
          if (!stopped[reel]) {
            stopped[reel] = true;
            windows[reel]!.classList.add("reel-engine-stopped");
            onReelStop?.(reel);
            dispatchRuntimeEvent("casino:reel-stop", { reel, phase: "stopped", preset: presetName });
            window.dispatchEvent(new CustomEvent("casino:sound", { detail: { cue: "reel-stop", index: reel } }));
          }
          return;
        }

        allStopped = false;
        let y: number;
        if (elapsed < motion.accelerationMs) {
          setPhase(reel, "accelerating");
          const t = easeInCubic(clamp01(elapsed / motion.accelerationMs));
          y = -distance + distance * 0.14 * t;
        } else if (elapsed < cruiseEnd) {
          setPhase(reel, "cruising");
          const t = clamp01((elapsed - motion.accelerationMs) / Math.max(1, cruiseEnd - motion.accelerationMs));
          y = -distance * 0.86 + distance * 0.69 * t;
        } else if (elapsed < settleStart) {
          setPhase(reel, "decelerating");
          const t = easeOutQuint(clamp01((elapsed - cruiseEnd) / Math.max(1, settleStart - cruiseEnd)));
          y = -distance * 0.17 + (distance * 0.17 + settle) * t;
        } else {
          setPhase(reel, "settling");
          const t = easeOutBack(clamp01((elapsed - settleStart) / motion.settleMs));
          y = settle * (1 - t);
        }
        track.style.transform = `translate3d(0,${y.toFixed(3)}px,0)`;
      });

      if (allStopped || elapsed >= maxStop + 80) resolve();
      else requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });

  tracks.forEach((track) => { track.style.transform = "translate3d(0,0,0)"; });
  host.classList.remove("reel-engine-spinning");
  host.classList.add("reel-engine-landed");
  motionLayer.classList.add("reel-engine-motion-complete");
  await wait(90);
  motionLayer.remove();
  host.classList.remove("reel-engine-host", "reel-engine-landed");
  delete host.dataset.reelProfile;
  host.style.removeProperty("--reel-count");
  host.style.removeProperty("--reel-cruise-blur");
  host.style.removeProperty("--reel-decel-blur");
  host.style.removeProperty("--reel-settle-ms");
  host.style.removeProperty("height");

  onSpinComplete?.();
  dispatchRuntimeEvent("casino:reel-spin-complete", { preset: presetName });
}
