export type AnimationCue =
  | "feature-focus"
  | "feature-release"
  | "ufo-enter"
  | "ufo-lock"
  | "ufo-impact"
  | "goat-enter"
  | "goat-chomp"
  | "gravity-start"
  | "symbol-land"
  | "board-settle"
  | "win-count"
  | "big-win"
  | "jackpot-flash"
  | "cabinet-led";

export interface SpotlightOptions {
  readonly dimOpacity?: number;
  readonly targetBoost?: number;
}

export interface CountUpOptions {
  readonly duration?: number;
  readonly formatter?: (value: number) => string;
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, Math.max(0, ms)));

/**
 * Shared "juice" layer for Project Beard cabinets.
 *
 * It intentionally does not own game math or feature decisions. It only owns
 * timing/presentation primitives so every cabinet can share the same feel.
 */
export class PremiumAnimationEngine {
  public constructor(private readonly host: HTMLElement, private readonly game: string) {}

  public cue(cue: AnimationCue, detail: Record<string, unknown> = {}): void {
    window.dispatchEvent(new CustomEvent("casino:animation", {
      detail: { cue, game: this.game, ...detail },
    }));
  }

  public async spotlight(
    targets: readonly HTMLElement[],
    options: SpotlightOptions = {},
  ): Promise<() => void> {
    this.host.style.setProperty("--casino-focus-opacity", String(options.dimOpacity ?? 0.42));
    this.host.style.setProperty("--casino-target-boost", String(options.targetBoost ?? 1.22));
    this.host.classList.add("casino-feature-focus-active");
    targets.forEach((node) => node.classList.add("casino-feature-focus-target"));
    this.cue("feature-focus");
    await wait(110);

    return () => {
      this.host.classList.remove("casino-feature-focus-active");
      targets.forEach((node) => node.classList.remove("casino-feature-focus-target"));
      this.host.style.removeProperty("--casino-focus-opacity");
      this.host.style.removeProperty("--casino-target-boost");
      this.cue("feature-release");
    };
  }

  public async impact(intensity: "soft" | "medium" | "hard" = "soft"): Promise<void> {
    const px = intensity === "hard" ? 4 : intensity === "medium" ? 2.4 : 1.35;
    const duration = intensity === "hard" ? 210 : intensity === "medium" ? 175 : 135;
    await this.host.animate(
      [
        { transform: "translate3d(0,0,0)" },
        { transform: `translate3d(${px}px,0,0)`, offset: .2 },
        { transform: `translate3d(-${px * .72}px,${px * .35}px,0)`, offset: .42 },
        { transform: `translate3d(${px * .35}px,-${px * .22}px,0)`, offset: .68 },
        { transform: "translate3d(0,0,0)" },
      ],
      { duration, easing: "ease-out" },
    ).finished.catch(() => undefined);
  }

  public pulse(tone: "cosmic" | "gold" | "danger" = "cosmic", duration = 420): void {
    this.host.dataset.animationPulse = tone;
    window.setTimeout(() => {
      if (this.host.dataset.animationPulse === tone) delete this.host.dataset.animationPulse;
    }, duration);
  }


  public reactCabinet(tone: "cosmic" | "gold" | "danger" = "gold", duration = 700): void {
    this.host.dataset.cabinetReaction = tone;
    this.cue("cabinet-led", { tone, duration });
    window.setTimeout(() => {
      if (this.host.dataset.cabinetReaction === tone) delete this.host.dataset.cabinetReaction;
    }, duration);
  }

  public async celebrateWin(multiplier: number): Promise<void> {
    if (!Number.isFinite(multiplier) || multiplier < 5) return;
    const tier = multiplier >= 100 ? "legendary" : multiplier >= 25 ? "major" : "big";
    this.host.dataset.winTier = tier;
    this.cue(multiplier >= 100 ? "jackpot-flash" : "big-win", { multiplier, tier });
    this.reactCabinet(multiplier >= 100 ? "gold" : "cosmic", multiplier >= 100 ? 1500 : 900);
    await this.impact(multiplier >= 100 ? "hard" : "medium");
    window.setTimeout(() => {
      if (this.host.dataset.winTier === tier) delete this.host.dataset.winTier;
    }, multiplier >= 100 ? 1800 : 1050);
  }

  public async countUp(
    node: HTMLElement,
    from: number,
    to: number,
    options: CountUpOptions = {},
  ): Promise<void> {
    if (from === to) return;
    const duration = options.duration ?? Math.min(1800, 520 + Math.abs(to - from) * .25);
    const formatter = options.formatter ?? ((value) => String(Math.round(value)));
    const started = performance.now();
    this.cue("win-count", { from, to });

    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const progress = Math.min(1, (now - started) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        node.textContent = formatter(from + (to - from) * eased);
        if (progress < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  }
}
