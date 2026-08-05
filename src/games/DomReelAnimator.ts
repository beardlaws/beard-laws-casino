export interface ReelAnimationOptions<T> {
  host: HTMLElement;
  finalColumns: readonly (readonly T[])[];
  rows: number;
  randomSymbol: () => T;
  renderSymbol: (symbol: T, reel: number, row: number) => string;
  duration?: number;
  stagger?: number;
  fillerRows?: number;
  anticipationReel?: number;
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const easeInCubic = (t: number): number => t * t * t;
const easeOutQuint = (t: number): number => 1 - Math.pow(1 - t, 5);

/**
 * Frame-synchronised reel animation that never destroys the settled grid.
 * The moving strips live in a temporary layer above the previous result, so
 * the cabinet cannot flash black between spin completion and result render.
 */
export async function animateDomReels<T>(options: ReelAnimationOptions<T>): Promise<void> {
  const { host, finalColumns, rows, randomSymbol, renderSymbol, duration = 2050, stagger = 205, fillerRows = 20, anticipationReel = -1 } = options;
  const reelCount = finalColumns.length;
  const rect = host.getBoundingClientRect();
  const lockedHeight = Math.round(rect.height);
  if (lockedHeight > 0) host.style.height = `${lockedHeight}px`;
  host.classList.remove("has-win", "dom-reels-landed");
  host.classList.add("dom-reel-stage", "dom-reels-spinning");
  host.style.setProperty("--dom-reels", String(reelCount));

  const layer = document.createElement("div");
  layer.className = "dom-reel-motion-layer";
  layer.style.setProperty("--dom-reels", String(reelCount));
  host.appendChild(layer);

  const stopTimes = finalColumns.map((_, reel) => duration + reel * stagger + (reel === anticipationReel ? 900 : 0));
  const fillerCounts = stopTimes.map((stopTime) => Math.max(fillerRows, Math.ceil(stopTime / 72)));
  layer.innerHTML = finalColumns.map((finalReel, reel) => {
    const fillerCount = fillerCounts[reel]!;
    const strip = [...Array.from({ length: fillerCount }, randomSymbol), ...finalReel];
    return `<div class="dom-reel-window" data-dom-reel="${reel}"><div class="dom-reel-track">${strip.map((symbol, index) => renderSymbol(symbol, reel, index - fillerCount)).join("")}</div></div>`;
  }).join("");

  await nextFrame();
  await nextFrame();
  const windows = [...layer.querySelectorAll<HTMLElement>(".dom-reel-window")];
  const tracks = windows.map((node) => node.querySelector<HTMLElement>(".dom-reel-track")!);
  const cellHeights = windows.map((node) => node.getBoundingClientRect().height / rows);
  const distances = fillerCounts.map((count, reel) => count * cellHeights[reel]!);
  windows.forEach((node, reel) => node.style.setProperty("--dom-cell-height", `${cellHeights[reel]}px`));

  const start = performance.now();
  const maxStop = Math.max(...stopTimes);
  const accelerationMs = 310;
  const decelerationMs = 680;
  await new Promise<void>((resolve) => {
    const frame = (now: number): void => {
      const elapsed = now - start;
      let allStopped = true;
      tracks.forEach((track, reel) => {
        const stopTime = stopTimes[reel]!;
        const distance = distances[reel]!;
        const windowNode = windows[reel]!;
        if (elapsed >= stopTime) {
          track.style.transform = `translate3d(0,${-Math.round(distance)}px,0)`;
          if (!windowNode.classList.contains("dom-reel-stopped")) {
            windowNode.classList.remove("dom-reel-at-speed");
            windowNode.classList.add("dom-reel-stopped");
          }
          return;
        }
        allStopped = false;
        const cruiseEnd = Math.max(accelerationMs, stopTime - decelerationMs);
        let progress: number;
        if (elapsed < accelerationMs) progress = 0.13 * easeInCubic(clamp01(elapsed / accelerationMs));
        else if (elapsed < cruiseEnd) {
          windowNode.classList.add("dom-reel-at-speed");
          progress = 0.13 + 0.68 * clamp01((elapsed - accelerationMs) / Math.max(1, cruiseEnd - accelerationMs));
        } else {
          windowNode.classList.remove("dom-reel-at-speed");
          progress = 0.81 + 0.19 * easeOutQuint(clamp01((elapsed - cruiseEnd) / Math.max(1, stopTime - cruiseEnd)));
        }
        track.style.transform = `translate3d(0,${-(distance * progress).toFixed(3)}px,0)`;
      });
      if (allStopped || elapsed >= maxStop + 50) resolve(); else requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });

  tracks.forEach((track, reel) => { track.style.transform = `translate3d(0,${-Math.round(distances[reel]!)}px,0)`; });
  host.classList.remove("dom-reels-spinning");
  host.classList.add("dom-reels-landed");
  layer.classList.add("dom-reel-motion-complete");
  await wait(100);
  layer.remove();
  host.classList.remove("dom-reel-stage", "dom-reels-landed");
  host.style.removeProperty("--dom-reels");
  host.style.removeProperty("height");
}
