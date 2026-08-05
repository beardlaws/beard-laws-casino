export type ReelPhase = "accelerating" | "cruising" | "decelerating" | "settling" | "stopped";

export interface ReelStripOptions<T> {
  host: HTMLElement;
  finalColumns: readonly (readonly T[])[];
  rows: number;
  randomSymbol: () => T;
  renderSymbol: (symbol: T, reel: number, row: number) => string;
  duration?: number;
  stagger?: number;
  fillerRows?: number;
  anticipationReel?: number;
  anticipationDelay?: number;
  settleDistance?: number;
  onReelPhase?: (reel: number, phase: ReelPhase) => void;
  onReelStop?: (reel: number) => void;
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

/**
 * Shared DOM reel-strip engine.
 *
 * Direction is deliberately top-to-bottom: each strip begins above its final
 * result and travels downward into the reel window. A settled grid remains
 * underneath the temporary motion layer, preventing black flashes.
 */
export async function spinReelStrips<T>(options: ReelStripOptions<T>): Promise<void> {
  const {
    host,
    finalColumns,
    rows,
    randomSymbol,
    renderSymbol,
    duration = 2100,
    stagger = 210,
    fillerRows = 24,
    anticipationReel = -1,
    anticipationDelay = 950,
    settleDistance = 0.14,
    onReelPhase,
    onReelStop,
  } = options;

  const reelCount = finalColumns.length;
  window.dispatchEvent(new CustomEvent("casino:sound", { detail: { cue: "reel-start" } }));
  if (reelCount === 0 || rows <= 0) return;

  const lockedHeight = Math.round(host.getBoundingClientRect().height);
  if (lockedHeight > 0) host.style.height = `${lockedHeight}px`;
  host.classList.remove("has-win", "reel-engine-landed");
  host.classList.add("reel-engine-host", "reel-engine-spinning");
  host.style.setProperty("--reel-count", String(reelCount));

  const motionLayer = document.createElement("div");
  motionLayer.className = "reel-engine-motion";
  motionLayer.style.setProperty("--reel-count", String(reelCount));
  motionLayer.setAttribute("aria-hidden", "true");
  host.appendChild(motionLayer);

  const stopTimes = finalColumns.map((_, reel) =>
    duration + reel * stagger + (reel === anticipationReel ? anticipationDelay : 0),
  );
  const fillerCounts = stopTimes.map((stopTime) => Math.max(fillerRows, Math.ceil(stopTime / 68)));

  motionLayer.innerHTML = finalColumns.map((finalReel, reel) => {
    const fillerCount = fillerCounts[reel]!;
    // Final result is first in the strip. The strip begins translated upward,
    // showing filler symbols, and travels down to translateY(0).
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
  const settlePixels = cellHeights.map((height) => Math.max(2, height * settleDistance));

  windows.forEach((windowNode, reel) => {
    const distance = distances[reel]!;
    windowNode.style.setProperty("--reel-cell-height", `${cellHeights[reel]!}px`);
    tracks[reel]!.style.transform = `translate3d(0,${-distance.toFixed(3)}px,0)`;
    onReelPhase?.(reel, "accelerating");
  });

  await nextFrame();

  if (anticipationReel >= 0) window.setTimeout(() => window.dispatchEvent(new CustomEvent("casino:sound", { detail: { cue: "anticipation" } })), Math.max(450, duration - 420));
  const start = performance.now();
  const maxStop = Math.max(...stopTimes);
  const accelerationMs = 300;
  const decelerationMs = 720;
  const settleMs = 125;
  const phases: ReelPhase[] = finalColumns.map(() => "accelerating");
  const stopped = finalColumns.map(() => false);

  const setPhase = (reel: number, phase: ReelPhase): void => {
    if (phases[reel] === phase) return;
    phases[reel] = phase;
    const node = windows[reel]!;
    node.dataset.reelPhase = phase;
    onReelPhase?.(reel, phase);
  };

  await new Promise<void>((resolve) => {
    const frame = (now: number): void => {
      const elapsed = now - start;
      let allStopped = true;

      tracks.forEach((track, reel) => {
        const stopTime = stopTimes[reel]!;
        const distance = distances[reel]!;
        const settle = settlePixels[reel]!;
        const cruiseEnd = Math.max(accelerationMs, stopTime - decelerationMs - settleMs);
        const settleStart = stopTime - settleMs;

        if (elapsed >= stopTime) {
          track.style.transform = "translate3d(0,0,0)";
          setPhase(reel, "stopped");
          if (!stopped[reel]) {
            stopped[reel] = true;
            windows[reel]!.classList.add("reel-engine-stopped");
            onReelStop?.(reel);
            window.dispatchEvent(new CustomEvent("casino:sound", { detail: { cue: "reel-stop", index: reel } }));
          }
          return;
        }

        allStopped = false;
        let y: number;
        if (elapsed < accelerationMs) {
          setPhase(reel, "accelerating");
          const t = easeInCubic(clamp01(elapsed / accelerationMs));
          y = -distance + distance * 0.14 * t;
        } else if (elapsed < cruiseEnd) {
          setPhase(reel, "cruising");
          const t = clamp01((elapsed - accelerationMs) / Math.max(1, cruiseEnd - accelerationMs));
          y = -distance * 0.86 + distance * 0.69 * t;
        } else if (elapsed < settleStart) {
          setPhase(reel, "decelerating");
          const t = easeOutQuint(clamp01((elapsed - cruiseEnd) / Math.max(1, settleStart - cruiseEnd)));
          y = -distance * 0.17 + (distance * 0.17 + settle) * t;
        } else {
          setPhase(reel, "settling");
          const t = easeOutBack(clamp01((elapsed - settleStart) / settleMs));
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
  host.style.removeProperty("--reel-count");
  host.style.removeProperty("height");
}
