import { BlurFilter, Container, Graphics } from "pixi.js";
import { SymbolView, type BeardBankSymbolId } from "./SymbolView";

const SYMBOL_IDS: readonly BeardBankSymbolId[] = [
  "beard-coin", "oil", "crown", "comb", "vernon", "vault-door", "gold-crest",
];

const REEL_COUNT = 5;
const ROW_COUNT = 3;
const REEL_GAP = 7;
const SYMBOL_GAP = 7;
const ACCELERATION_MS = 260;
const CRUISE_SPEED = 1.28;
const FIRST_STOP_MS = 920;
const STOP_GAP_MS = 210;
const DECELERATION_MS = 330;
const LANDING_MS = 270;

interface ReelRuntime {
  readonly container: Container;
  readonly symbols: SymbolView[];
  readonly blur: BlurFilter;
  readonly stopAt: number;
  stopped: boolean;
}

export class ReelSet extends Container {
  private readonly reels: ReelRuntime[] = [];
  private symbolPitch = 0;
  private cycleHeight = 0;

  public constructor(
    private readonly viewportWidth: number,
    private readonly viewportHeight: number,
  ) {
    super();
    this.build();
  }

  public async spinTo(matrix: readonly (readonly string[])[]): Promise<void> {
    this.assertMatrix(matrix);

    const startedAt = performance.now();
    for (const reel of this.reels) {
      reel.stopped = false;
      reel.container.y = 0;
      reel.blur.strengthX = 0;
      reel.blur.strengthY = 0;
    }

    await new Promise<void>((resolve) => {
      let previousTime = startedAt;

      const frame = (now: number): void => {
        const elapsed = now - startedAt;
        const delta = Math.min(34, now - previousTime);
        previousTime = now;
        let allStopped = true;

        for (let reelIndex = 0; reelIndex < this.reels.length; reelIndex += 1) {
          const reel = this.reels[reelIndex]!;
          const decelerationStart = reel.stopAt - DECELERATION_MS;
          const landingEnd = reel.stopAt + LANDING_MS;

          if (elapsed < reel.stopAt) {
            allStopped = false;
            const acceleration = Math.min(1, elapsed / ACCELERATION_MS);
            const deceleration = elapsed > decelerationStart
              ? Math.max(0.08, (reel.stopAt - elapsed) / DECELERATION_MS)
              : 1;
            const velocity = CRUISE_SPEED * this.easeOutCubic(acceleration) * this.easeInCubic(deceleration);

            this.advanceReel(reel, velocity * delta);
            reel.blur.strengthX = 0.35;
            reel.blur.strengthY = 2 + velocity * 10;
            reel.container.scale.y = 1 + Math.min(0.025, velocity * 0.018);
            reel.container.alpha = 0.9 + Math.min(0.1, deceleration * 0.1);
            continue;
          }

          if (!reel.stopped) {
            this.landReel(reelIndex, matrix);
            reel.stopped = true;
          }

          if (elapsed < landingEnd) {
            allStopped = false;
            const landingProgress = (elapsed - reel.stopAt) / LANDING_MS;
            reel.container.y = this.landingOffset(landingProgress);
            reel.blur.strengthY = Math.max(0, 4 * (1 - landingProgress));
            reel.blur.strengthX = 0;
            reel.container.scale.y = 1 - 0.025 * Math.sin(Math.PI * Math.min(1, landingProgress));
            reel.container.alpha = 1;
          } else {
            reel.container.y = 0;
            reel.container.scale.y = 1;
            reel.container.alpha = 1;
            reel.blur.strengthX = 0;
            reel.blur.strengthY = 0;
          }
        }

        if (allStopped) {
          resolve();
          return;
        }

        window.requestAnimationFrame(frame);
      };

      window.requestAnimationFrame(frame);
    });
  }

  private build(): void {
    const reelWidth = (this.viewportWidth - REEL_GAP * (REEL_COUNT - 1)) / REEL_COUNT;
    const symbolHeight = (this.viewportHeight - SYMBOL_GAP * (ROW_COUNT - 1)) / ROW_COUNT;
    this.symbolPitch = symbolHeight + SYMBOL_GAP;
    this.cycleHeight = this.symbolPitch * ROW_COUNT;

    for (let reelIndex = 0; reelIndex < REEL_COUNT; reelIndex += 1) {
      const reelContainer = new Container();
      const reelSymbols: SymbolView[] = [];
      const blur = new BlurFilter({ strength: 0, quality: 2, kernelSize: 5 });
      reelContainer.x = reelIndex * (reelWidth + REEL_GAP);
      reelContainer.filters = [blur];

      const reelBackground = new Graphics()
        .roundRect(0, 0, reelWidth, this.viewportHeight, 12)
        .fill(0x100718)
        .stroke({ color: 0x6d4bbd, width: 2, alpha: 0.7 });
      reelContainer.addChild(reelBackground);

      for (let rowIndex = 0; rowIndex < ROW_COUNT; rowIndex += 1) {
        const symbolId = SYMBOL_IDS[(reelIndex * ROW_COUNT + rowIndex) % SYMBOL_IDS.length]!;
        const symbolView = new SymbolView(symbolId, reelWidth, symbolHeight);
        symbolView.y = rowIndex * this.symbolPitch;
        reelSymbols.push(symbolView);
        reelContainer.addChild(symbolView);
      }

      this.reels.push({
        container: reelContainer,
        symbols: reelSymbols,
        blur,
        stopAt: FIRST_STOP_MS + reelIndex * STOP_GAP_MS,
        stopped: false,
      });
      this.addChild(reelContainer);
    }
  }

  private advanceReel(reel: ReelRuntime, distance: number): void {
    for (const symbol of reel.symbols) {
      symbol.y += distance;
      if (symbol.y >= this.cycleHeight) {
        symbol.y -= this.cycleHeight;
        symbol.setSymbol(SYMBOL_IDS[Math.floor(Math.random() * SYMBOL_IDS.length)]!);
      }
    }
  }

  private landReel(reelIndex: number, matrix: readonly (readonly string[])[]): void {
    const reel = this.reels[reelIndex]!;
    const column = matrix[reelIndex]!;

    for (let rowIndex = 0; rowIndex < ROW_COUNT; rowIndex += 1) {
      const symbol = reel.symbols[rowIndex]!;
      symbol.setSymbol(column[rowIndex] as BeardBankSymbolId);
      symbol.y = rowIndex * this.symbolPitch;
    }

    reel.container.y = -18;
  }

  private landingOffset(progress: number): number {
    const p = Math.max(0, Math.min(1, progress));
    if (p < 0.48) {
      return -18 + 29 * this.easeOutCubic(p / 0.48);
    }
    if (p < 0.78) {
      return 11 - 15 * this.easeOutCubic((p - 0.48) / 0.3);
    }
    return -4 + 4 * this.easeOutCubic((p - 0.78) / 0.22);
  }

  private easeOutCubic(value: number): number {
    return 1 - Math.pow(1 - value, 3);
  }

  private easeInCubic(value: number): number {
    return value * value * value;
  }

  private assertMatrix(matrix: readonly (readonly string[])[]): void {
    if (matrix.length !== REEL_COUNT || matrix.some((column) => column.length !== ROW_COUNT)) {
      throw new Error("Reel matrix must be 5 reels by 3 rows.");
    }
  }
}
