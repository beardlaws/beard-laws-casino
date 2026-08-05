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

/**
 * Performs a real vertical reel-strip animation without rebuilding the grid on every frame.
 * Every reel owns its own DOM track and animation, so stopping one reel cannot disturb another.
 */
export async function animateDomReels<T>(options: ReelAnimationOptions<T>): Promise<void> {
  const {
    host,
    finalColumns,
    rows,
    randomSymbol,
    renderSymbol,
    duration = 1450,
    stagger = 170,
    fillerRows = 10,
    anticipationReel = -1,
  } = options;
  const reelCount = finalColumns.length;
  const previousHeight = host.getBoundingClientRect().height;
  if (previousHeight > 0) host.style.height = `${previousHeight}px`;
  host.classList.remove("has-win");
  host.classList.add("dom-reel-stage", "dom-reels-spinning");
  host.style.setProperty("--dom-reels", String(reelCount));

  host.innerHTML = finalColumns.map((finalReel, reel) => {
    const filler = Array.from({ length: fillerRows + reel * 2 }, randomSymbol);
    const strip = [...filler, ...finalReel];
    return `<div class="dom-reel-window" data-dom-reel="${reel}"><div class="dom-reel-track">${strip.map((symbol, index) => renderSymbol(symbol, reel, index - filler.length)).join("")}</div></div>`;
  }).join("");

  await nextFrame();
  const windows = [...host.querySelectorAll<HTMLElement>(".dom-reel-window")];
  const animations = windows.map((windowNode, reel) => {
    const track = windowNode.querySelector<HTMLElement>(".dom-reel-track")!;
    const fillerCount = fillerRows + reel * 2;
    const cellHeight = windowNode.clientHeight / rows;
    windowNode.style.setProperty("--dom-cell-height", `${cellHeight}px`);
    const distance = fillerCount * cellHeight;
    const extra = reel === anticipationReel ? 700 : 0;
    const animation = track.animate([
      { transform: "translate3d(0, 0, 0)", filter: "blur(0px)" },
      { transform: `translate3d(0, -${Math.max(1, distance * .16)}px, 0)`, filter: "blur(3px)", offset: .14 },
      { transform: `translate3d(0, -${Math.max(1, distance * .86)}px, 0)`, filter: "blur(2px)", offset: .78 },
      { transform: `translate3d(0, -${distance + 10}px, 0)`, filter: "blur(0px)", offset: .93 },
      { transform: `translate3d(0, -${distance - 3}px, 0)`, filter: "blur(0px)", offset: .975 },
      { transform: `translate3d(0, -${distance}px, 0)`, filter: "blur(0px)" },
    ], {
      duration: duration + reel * stagger + extra,
      easing: "cubic-bezier(.12,.72,.18,1)",
      fill: "forwards",
    });
    animation.finished.then(() => windowNode.classList.add("dom-reel-stopped")).catch(() => {});
    return animation.finished.catch(() => {});
  });
  await Promise.all(animations);
  host.classList.remove("dom-reels-spinning");
  host.classList.add("dom-reels-landed");
  await new Promise<void>((resolve) => window.setTimeout(resolve, 180));
  host.classList.remove("dom-reel-stage", "dom-reels-landed");
  host.style.removeProperty("--dom-reels");
  host.style.removeProperty("height");
}
