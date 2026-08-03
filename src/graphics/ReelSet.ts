import { BlurFilter, Container, Graphics } from "pixi.js";
import type { WayWin } from "../engine/WaysEvaluator";
import { SymbolView, type BeardBankSymbolId } from "./SymbolView";

const SYMBOL_IDS: readonly BeardBankSymbolId[] = [
  "beard-coin",
  "oil",
  "crown",
  "comb",
  "vernon",
  "vault-door",
  "gold-crest",
];

const REEL_COUNT = 5;
const ROW_COUNT = 3;
const BUFFER_ROWS = 2;
const TOTAL_SYMBOLS = ROW_COUNT + BUFFER_ROWS;
const REEL_GAP = 3;
const SYMBOL_GAP = 3;

const ACCELERATION_MS = 340;
const CRUISE_SPEED = 0.92;
const FIRST_STOP_MS = 1_020;
const STOP_GAP_MS = 185;
const DECELERATION_MS = 470;
const LANDING_MS = 210;

interface ReelRuntime {
  readonly viewport: Container;
  readonly symbolLayer: Container;
  readonly symbols: SymbolView[];
  readonly blur: BlurFilter;
  readonly stopAt: number;
  stopped: boolean;
}

export class ReelSet extends Container {
  private readonly reels: ReelRuntime[] = [];
  private symbolPitch = 0;
  private symbolHeight = 0;

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
      reel.symbolLayer.y = 0;
      reel.blur.strengthX = 0;
      reel.blur.strengthY = 0;
    }

    await new Promise<void>((resolve) => {
      let previousTime = startedAt;

      const frame = (now: number): void => {
        const elapsed = now - startedAt;
        const delta = Math.min(32, now - previousTime);
        previousTime = now;
        let allStopped = true;

        for (let reelIndex = 0; reelIndex < this.reels.length; reelIndex += 1) {
          const reel = this.reels[reelIndex]!;
          const decelerationStart = reel.stopAt - DECELERATION_MS;
          const landingEnd = reel.stopAt + LANDING_MS;

          if (elapsed < reel.stopAt) {
            allStopped = false;

            const accelerationProgress = Math.min(1, elapsed / ACCELERATION_MS);
            const accelerationFactor = this.easeOutQuint(accelerationProgress);

            const decelerationProgress = elapsed > decelerationStart
              ? Math.min(1, (elapsed - decelerationStart) / DECELERATION_MS)
              : 0;
            const decelerationFactor = 1 - this.easeInOutCubic(decelerationProgress);

            const velocity = CRUISE_SPEED * accelerationFactor * Math.max(0.12, decelerationFactor);
            this.advanceReel(reel, velocity * delta);

            const normalizedSpeed = Math.min(1, velocity / CRUISE_SPEED);
            reel.blur.strengthX = 0;
            reel.blur.strengthY = 1.2 + normalizedSpeed * 7.5;
            continue;
          }

          if (!reel.stopped) {
            this.landReel(reelIndex, matrix);
            reel.stopped = true;
          }

          if (elapsed < landingEnd) {
            allStopped = false;
            const landingProgress = (elapsed - reel.stopAt) / LANDING_MS;
            reel.symbolLayer.y = this.landingOffset(landingProgress);
            reel.blur.strengthY = Math.max(0, 1.8 * (1 - landingProgress));
          } else {
            reel.symbolLayer.y = 0;
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


  public resetWinPresentation(): void {
    for (const reel of this.reels) {
      for (const symbol of reel.symbols) symbol.resetWinState();
    }
  }

  public async presentWins(
    wayWins: readonly WayWin[],
    onAwardPresented?: (presentedAwardUnits: number) => void,
  ): Promise<void> {
    this.resetWinPresentation();
    if (wayWins.length === 0) return;

    let presentedAwardUnits = 0;

    for (const wayWin of wayWins) {
      const winningKeys = new Set(
        wayWin.winningPositions.map((position) => `${position.reelIndex}:${position.rowIndex}`),
      );

      this.forEachVisibleSymbol((symbol, reelIndex, rowIndex) => {
        symbol.setDimmed(!winningKeys.has(`${reelIndex}:${rowIndex}`));
      });

      await this.pulsePositions(winningKeys, 620);
      presentedAwardUnits += wayWin.awardUnits;
      onAwardPresented?.(presentedAwardUnits);
      await this.delay(130);
    }

    const allWinningKeys = new Set(
      wayWins.flatMap((win) =>
        win.winningPositions.map((position) => `${position.reelIndex}:${position.rowIndex}`),
      ),
    );

    this.forEachVisibleSymbol((symbol, reelIndex, rowIndex) => {
      const isWinner = allWinningKeys.has(`${reelIndex}:${rowIndex}`);
      symbol.setDimmed(!isWinner);
      symbol.setWinGlow(isWinner ? 0.72 : 0);
    });
    await this.delay(420);
    this.resetWinPresentation();
  }

  private build(): void {
    const reelWidth = (this.viewportWidth - REEL_GAP * (REEL_COUNT - 1)) / REEL_COUNT;
    this.symbolHeight = (this.viewportHeight - SYMBOL_GAP * (ROW_COUNT - 1)) / ROW_COUNT;
    this.symbolPitch = this.symbolHeight + SYMBOL_GAP;

    for (let reelIndex = 0; reelIndex < REEL_COUNT; reelIndex += 1) {
      const viewport = new Container();
      viewport.x = reelIndex * (reelWidth + REEL_GAP);

      const background = new Graphics()
        .roundRect(0, 0, reelWidth, this.viewportHeight, 8)
        .fill(0x08030d)
        .stroke({ color: 0x4d2268, width: 1.5, alpha: 0.75 });

      const mask = new Graphics()
        .roundRect(0, 0, reelWidth, this.viewportHeight, 8)
        .fill(0xffffff);

      const symbolLayer = new Container();
      const symbols: SymbolView[] = [];
      const blur = new BlurFilter({ strength: 0, quality: 2, kernelSize: 5 });
      symbolLayer.filters = [blur];
      symbolLayer.mask = mask;

      for (let symbolIndex = 0; symbolIndex < TOTAL_SYMBOLS; symbolIndex += 1) {
        const symbolId = SYMBOL_IDS[(reelIndex * ROW_COUNT + symbolIndex) % SYMBOL_IDS.length]!;
        const symbolView = new SymbolView(symbolId, reelWidth, this.symbolHeight);
        symbolView.y = (symbolIndex - 1) * this.symbolPitch;
        symbols.push(symbolView);
        symbolLayer.addChild(symbolView);
      }

      viewport.addChild(background, symbolLayer, mask);
      this.reels.push({
        viewport,
        symbolLayer,
        symbols,
        blur,
        stopAt: FIRST_STOP_MS + reelIndex * STOP_GAP_MS,
        stopped: false,
      });
      this.addChild(viewport);
    }
  }

  private advanceReel(reel: ReelRuntime, distance: number): void {
    for (const symbol of reel.symbols) {
      symbol.y += distance;
    }

    let lowestY = Math.max(...reel.symbols.map((symbol) => symbol.y));

    for (const symbol of reel.symbols) {
      if (symbol.y >= this.viewportHeight + this.symbolPitch) {
        symbol.y = lowestY - this.symbolPitch * TOTAL_SYMBOLS;
        symbol.setSymbol(this.randomSymbol());
        lowestY = Math.max(lowestY, symbol.y);
      }
    }
  }

  private landReel(reelIndex: number, matrix: readonly (readonly string[])[]): void {
    const reel = this.reels[reelIndex]!;
    const column = matrix[reelIndex]!;

    reel.symbolLayer.y = -10;

    for (let symbolIndex = 0; symbolIndex < TOTAL_SYMBOLS; symbolIndex += 1) {
      const symbol = reel.symbols[symbolIndex]!;
      const visibleRow = symbolIndex - 1;
      const symbolId = visibleRow >= 0 && visibleRow < ROW_COUNT
        ? column[visibleRow] as BeardBankSymbolId
        : this.randomSymbol();

      symbol.setSymbol(symbolId);
      symbol.y = visibleRow * this.symbolPitch;
    }
  }


  private forEachVisibleSymbol(
    callback: (symbol: SymbolView, reelIndex: number, rowIndex: number) => void,
  ): void {
    for (let reelIndex = 0; reelIndex < this.reels.length; reelIndex += 1) {
      const reel = this.reels[reelIndex]!;
      for (let rowIndex = 0; rowIndex < ROW_COUNT; rowIndex += 1) {
        callback(reel.symbols[rowIndex + 1]!, reelIndex, rowIndex);
      }
    }
  }

  private pulsePositions(keys: ReadonlySet<string>, durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      const startedAt = performance.now();
      const frame = (now: number): void => {
        const progress = Math.min(1, (now - startedAt) / durationMs);
        const pulse = 0.45 + Math.sin(progress * Math.PI * 4) * 0.35 + progress * 0.2;

        this.forEachVisibleSymbol((symbol, reelIndex, rowIndex) => {
          if (keys.has(`${reelIndex}:${rowIndex}`)) symbol.setWinGlow(pulse);
        });

        if (progress >= 1) {
          resolve();
          return;
        }
        window.requestAnimationFrame(frame);
      };
      window.requestAnimationFrame(frame);
    });
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  private randomSymbol(): BeardBankSymbolId {
    return SYMBOL_IDS[Math.floor(Math.random() * SYMBOL_IDS.length)]!;
  }

  private landingOffset(progress: number): number {
    const p = Math.max(0, Math.min(1, progress));
    const decay = 1 - p;
    return -10 * decay * Math.cos(p * Math.PI * 2.25);
  }

  private easeOutQuint(value: number): number {
    return 1 - Math.pow(1 - value, 5);
  }

  private easeInOutCubic(value: number): number {
    return value < 0.5
      ? 4 * value * value * value
      : 1 - Math.pow(-2 * value + 2, 3) / 2;
  }

  private assertMatrix(matrix: readonly (readonly string[])[]): void {
    if (matrix.length !== REEL_COUNT || matrix.some((column) => column.length !== ROW_COUNT)) {
      throw new Error("Reel matrix must be 5 reels by 3 rows.");
    }
  }
}
