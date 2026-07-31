import { BlurFilter, Container, Graphics, Ticker } from "pixi.js";
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
const REEL_GAP = 5;
const SYMBOL_GAP = 5;

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
  private readonly glassSweep = new Graphics();
  private readonly chamberGlow = new Graphics();
  private elapsedSeconds = 0;

  public constructor(
    private readonly viewportWidth: number,
    private readonly viewportHeight: number,
  ) {
    super();
    this.build();
    Ticker.shared.add(this.update);
  }

  public override destroy(options?: Parameters<Container["destroy"]>[0]): void {
    Ticker.shared.remove(this.update);
    super.destroy(options);
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

    const chamber = new Graphics()
      .roundRect(0, 0, this.viewportWidth, this.viewportHeight, 18)
      .fill({ color: 0x030108, alpha: 0.98 })
      .stroke({ color: 0x2c1745, width: 2, alpha: 0.95 });

    this.chamberGlow
      .roundRect(3, 3, this.viewportWidth - 6, this.viewportHeight - 6, 16)
      .stroke({ color: 0x8d4bdf, width: 3, alpha: 0.2 });

    this.addChild(chamber, this.chamberGlow);

    for (let reelIndex = 0; reelIndex < REEL_COUNT; reelIndex += 1) {
      const viewport = new Container();
      viewport.x = reelIndex * (reelWidth + REEL_GAP);

      const columnGlow = new Graphics()
        .roundRect(0, 0, reelWidth, this.viewportHeight, 12)
        .fill({ color: reelIndex % 2 === 0 ? 0x140b20 : 0x0c0816, alpha: 0.9 });

      const centerLight = new Graphics()
        .ellipse(reelWidth / 2, this.viewportHeight / 2, reelWidth * 0.43, this.viewportHeight * 0.47)
        .fill({ color: 0x7b31bd, alpha: 0.055 });

      const edgeShade = new Graphics()
        .roundRect(0, 0, reelWidth, this.viewportHeight, 12)
        .stroke({ color: 0xb26fff, width: 1, alpha: 0.2 });

      const mask = new Graphics()
        .roundRect(0, 0, reelWidth, this.viewportHeight, 12)
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

      viewport.addChild(columnGlow, centerLight, edgeShade, symbolLayer, mask);
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

    for (let row = 1; row < ROW_COUNT; row += 1) {
      const y = row * this.symbolPitch - SYMBOL_GAP / 2;
      const separator = new Graphics()
        .rect(8, y, this.viewportWidth - 16, 1)
        .fill({ color: 0xd9b8ff, alpha: 0.08 });
      this.addChild(separator);
    }

    this.glassSweep
      .moveTo(-140, 0)
      .lineTo(-35, 0)
      .lineTo(100, this.viewportHeight)
      .lineTo(-5, this.viewportHeight)
      .closePath()
      .fill({ color: 0xffffff, alpha: 0.055 });

    const topGlass = new Graphics()
      .roundRect(8, 7, this.viewportWidth - 16, this.viewportHeight * 0.24, 12)
      .fill({ color: 0xffffff, alpha: 0.025 });

    this.addChild(this.glassSweep, topGlass);
  }

  private readonly update = (ticker: Ticker): void => {
    this.elapsedSeconds += ticker.deltaMS / 1000;
    const travel = this.viewportWidth + 280;
    this.glassSweep.x = (this.elapsedSeconds * 46) % travel;
    this.chamberGlow.alpha = 0.55 + Math.sin(this.elapsedSeconds * 1.4) * 0.18;
  };

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
