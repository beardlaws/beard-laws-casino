import { Container, Graphics } from "pixi.js";
import { SymbolView, type BeardBankSymbolId } from "./SymbolView";

const SYMBOL_IDS: readonly BeardBankSymbolId[] = [
  "beard-coin", "oil", "crown", "comb", "vernon", "vault-door", "gold-crest",
];

const REEL_COUNT = 5;
const ROW_COUNT = 3;
const REEL_GAP = 7;
const SYMBOL_GAP = 7;

export class ReelSet extends Container {
  private readonly symbolViews: SymbolView[][] = [];

  public constructor(
    private readonly viewportWidth: number,
    private readonly viewportHeight: number,
  ) {
    super();
    this.build();
  }

  public async spinTo(matrix: readonly (readonly string[])[]): Promise<void> {
    this.assertMatrix(matrix);

    const start = performance.now();
    const cycleTimer = window.setInterval(() => {
      for (const reel of this.symbolViews) {
        for (const symbol of reel) {
          symbol.setSymbol(SYMBOL_IDS[Math.floor(Math.random() * SYMBOL_IDS.length)]!);
        }
      }
    }, 70);

    await this.wait(520);

    for (let reelIndex = 0; reelIndex < REEL_COUNT; reelIndex += 1) {
      const column = matrix[reelIndex]!;
      for (let rowIndex = 0; rowIndex < ROW_COUNT; rowIndex += 1) {
        this.symbolViews[reelIndex]![rowIndex]!.setSymbol(column[rowIndex] as BeardBankSymbolId);
      }

      const reel = this.symbolViews[reelIndex]!;
      reel.forEach((symbol) => { symbol.y += 10; });
      await this.wait(55);
      reel.forEach((symbol) => { symbol.y -= 10; });
      await this.wait(125);
    }

    window.clearInterval(cycleTimer);

    const minimumDuration = 1300;
    const elapsed = performance.now() - start;
    if (elapsed < minimumDuration) await this.wait(minimumDuration - elapsed);
  }

  private build(): void {
    const reelWidth = (this.viewportWidth - REEL_GAP * (REEL_COUNT - 1)) / REEL_COUNT;
    const symbolHeight = (this.viewportHeight - SYMBOL_GAP * (ROW_COUNT - 1)) / ROW_COUNT;

    for (let reelIndex = 0; reelIndex < REEL_COUNT; reelIndex += 1) {
      const reelContainer = new Container();
      const reelSymbols: SymbolView[] = [];
      reelContainer.x = reelIndex * (reelWidth + REEL_GAP);

      const reelBackground = new Graphics().roundRect(0, 0, reelWidth, this.viewportHeight, 12).fill(0x100718).stroke({ color: 0x6d4bbd, width: 2, alpha: 0.7 });
      reelContainer.addChild(reelBackground);

      for (let rowIndex = 0; rowIndex < ROW_COUNT; rowIndex += 1) {
        const symbolId = SYMBOL_IDS[(reelIndex * ROW_COUNT + rowIndex) % SYMBOL_IDS.length]!;
        const symbolView = new SymbolView(symbolId, reelWidth, symbolHeight);
        symbolView.y = rowIndex * (symbolHeight + SYMBOL_GAP);
        reelSymbols.push(symbolView);
        reelContainer.addChild(symbolView);
      }

      this.symbolViews.push(reelSymbols);
      this.addChild(reelContainer);
    }
  }

  private assertMatrix(matrix: readonly (readonly string[])[]): void {
    if (matrix.length !== REEL_COUNT || matrix.some((column) => column.length !== ROW_COUNT)) {
      throw new Error("Reel matrix must be 5 reels by 3 rows.");
    }
  }

  private wait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }
}
