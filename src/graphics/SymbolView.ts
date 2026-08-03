import { Container, Graphics, Sprite } from "pixi.js";

export type BeardBankSymbolId =
  | "comb"
  | "oil"
  | "crown"
  | "vernon"
  | "beard-coin"
  | "gold-crest"
  | "vault-door";

const symbolUrl = (name: BeardBankSymbolId): string =>
  new URL(`../../assets/concept-symbols/${name}.png`, import.meta.url).href;

export class SymbolView extends Container {
  private winGlow?: Graphics;
  private art?: Sprite;

  public constructor(
    symbolId: BeardBankSymbolId,
    private readonly symbolWidth: number,
    private readonly symbolHeight: number,
  ) {
    super();
    this.setSymbol(symbolId);
  }

  public setSymbol(symbolId: BeardBankSymbolId): void {
    this.removeChildren().forEach((child) => child.destroy());
    const width = this.symbolWidth - 2;
    const height = this.symbolHeight - 2;

    const well = new Graphics()
      .roundRect(0, 0, width, height, 8)
      .fill({ color: 0x07020b, alpha: 1 });

    this.art = Sprite.from(symbolUrl(symbolId));
    this.art.width = width;
    this.art.height = height;
    this.art.position.set(0, 0);

    const shade = new Graphics()
      .roundRect(0, 0, width, height, 8)
      .stroke({ color: 0x8f5bb4, width: 1.5, alpha: 0.35 });

    const sheen = new Graphics()
      .roundRect(8, 5, width - 16, Math.max(8, height * 0.12), 7)
      .fill({ color: 0xffffff, alpha: 0.045 });

    this.winGlow = new Graphics()
      .roundRect(1, 1, width - 2, height - 2, 8)
      .fill({ color: 0xffc94d, alpha: 0.16 })
      .stroke({ color: 0xffef9d, width: 7, alpha: 1 });
    this.winGlow.alpha = 0;

    this.addChild(well, this.art, shade, sheen, this.winGlow);
    this.resetWinState();
  }

  public setDimmed(dimmed: boolean): void {
    this.alpha = dimmed ? 0.16 : 1;
    if (dimmed && this.winGlow) this.winGlow.alpha = 0;
  }

  public setWinGlow(intensity: number): void {
    const clamped = Math.max(0, Math.min(1, intensity));
    this.alpha = 1;
    if (this.winGlow) this.winGlow.alpha = clamped;
    if (this.art) this.art.scale.set(1 + clamped * 0.025);
  }

  public resetWinState(): void {
    this.alpha = 1;
    if (this.winGlow) this.winGlow.alpha = 0;
    if (this.art) this.art.scale.set(1);
  }
}
