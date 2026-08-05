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

/**
 * Modern DOM reel animation.
 *
 * Important implementation details:
 * - Each reel owns one stable DOM strip for the entire spin.
 * - No symbols are destroyed or replaced while a reel is moving.
 * - Extra strip length is calculated from stop time so every reel travels at
 *   nearly the same visual speed instead of later reels crawling or shaking.
 * - Motion is split into acceleration, cruise and deceleration phases.
 * - Only transform is animated; filters and per-symbol transforms are avoided
 *   because they create expensive repaints and visible jitter on large grids.
 */
export async function animateDomReels<T>(options: ReelAnimationOptions<T>): Promise<void> {
  const {
    host,
    finalColumns,
    rows,
    randomSymbol,
    renderSymbol,
    duration = 1750,
    stagger = 190,
    fillerRows = 16,
    anticipationReel = -1,
  } = options;

  const reelCount = finalColumns.length;
  const previousHeight = host.getBoundingClientRect().height;
  if (previousHeight > 0) host.style.height = `${Math.round(previousHeight)}px`;

  host.classList.remove("has-win", "dom-reels-landed");
  host.classList.add("dom-reel-stage", "dom-reels-spinning");
  host.style.setProperty("--dom-reels", String(reelCount));

  // Later reels need more symbols because they spin longer. This preserves a
  // consistent pixels-per-second speed across all reels.
  const fillerCounts = finalColumns.map((_, reel) => {
    const totalTime = duration + reel * stagger + (reel === anticipationReel ? 850 : 0);
    return Math.max(fillerRows, Math.ceil(totalTime / 72));
  });

  host.innerHTML = finalColumns.map((finalReel, reel) => {
    const fillerCount = fillerCounts[reel]!;
    const filler = Array.from({ length: fillerCount }, randomSymbol);
    const strip = [...filler, ...finalReel];
    return `<div class="dom-reel-window" data-dom-reel="${reel}"><div class="dom-reel-motion"><div class="dom-reel-track">${strip.map((symbol, index) => renderSymbol(symbol, reel, index - fillerCount)).join("")}</div></div></div>`;
  }).join("");

  await nextFrame();
  await nextFrame();

  const windows = [...host.querySelectorAll<HTMLElement>(".dom-reel-window")];
  const reelPromises = windows.map(async (windowNode, reel) => {
    const motion = windowNode.querySelector<HTMLElement>(".dom-reel-motion")!;
    const track = windowNode.querySelector<HTMLElement>(".dom-reel-track")!;
    const fillerCount = fillerCounts[reel]!;
    const cellHeight = windowNode.getBoundingClientRect().height / rows;
    const distance = fillerCount * cellHeight;
    const totalTime = duration + reel * stagger + (reel === anticipationReel ? 850 : 0);
    const accelerateMs = 260;
    const decelerateMs = 520;
    const cruiseMs = Math.max(260, totalTime - accelerateMs - decelerateMs);
    const accelerateDistance = distance * 0.12;
    const cruiseDistance = distance * 0.76;

    windowNode.style.setProperty("--dom-cell-height", `${cellHeight}px`);
    track.style.transform = "translate3d(0,0,0)";

    await track.animate([
      { transform: "translate3d(0,0,0)" },
      { transform: `translate3d(0,-${accelerateDistance}px,0)` },
    ], {
      duration: accelerateMs,
      easing: "cubic-bezier(.42,0,.72,.34)",
      fill: "forwards",
    }).finished.catch(() => {});

    windowNode.classList.add("dom-reel-at-speed");
    await track.animate([
      { transform: `translate3d(0,-${accelerateDistance}px,0)` },
      { transform: `translate3d(0,-${accelerateDistance + cruiseDistance}px,0)` },
    ], {
      duration: cruiseMs,
      easing: "linear",
      fill: "forwards",
    }).finished.catch(() => {});

    windowNode.classList.remove("dom-reel-at-speed");
    await track.animate([
      { transform: `translate3d(0,-${accelerateDistance + cruiseDistance}px,0)` },
      { transform: `translate3d(0,-${distance + Math.min(8, cellHeight * 0.07)}px,0)`, offset: 0.88 },
      { transform: `translate3d(0,-${distance}px,0)` },
    ], {
      duration: decelerateMs,
      easing: "cubic-bezier(.08,.76,.18,1)",
      fill: "forwards",
    }).finished.catch(() => {});

    // Commit an exact integer-aligned final position before the tiny cabinet
    // settle. This prevents sub-pixel shimmer when neighboring reels stop.
    track.style.transform = `translate3d(0,-${distance}px,0)`;
    windowNode.classList.add("dom-reel-stopped");
    motion.animate([
      { transform: "translate3d(0,-2px,0)" },
      { transform: "translate3d(0,1px,0)", offset: .58 },
      { transform: "translate3d(0,0,0)" },
    ], {
      duration: 170,
      easing: "cubic-bezier(.2,.8,.2,1)",
    });
  });

  await Promise.all(reelPromises);
  host.classList.remove("dom-reels-spinning");
  host.classList.add("dom-reels-landed");
  await wait(140);
  host.classList.remove("dom-reel-stage", "dom-reels-landed");
  host.style.removeProperty("--dom-reels");
  host.style.removeProperty("height");
}
