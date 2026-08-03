import { Container, Graphics, Sprite, Text } from "pixi.js";

export type BeardBankSymbolId =
  | "comb"
  | "razor"
  | "balm"
  | "oil"
  | "crown"
  | "vault-crest"
  | "luxury-kit"
  | "vernon"
  | "beard-coin"
  | "gold-crest"
  | "vault-door"
  | "jackpot-key";

const FINISHED_SYMBOL_URLS: Partial<Record<BeardBankSymbolId, string>> = {
  balm: new URL("../../assets/generated/balm.png", import.meta.url).href,
  razor: new URL("../../assets/generated/razor.png", import.meta.url).href,
  "vault-crest": new URL("../../assets/generated/vault-crest.png", import.meta.url).href,
  "luxury-kit": new URL("../../assets/generated/luxury-kit.png", import.meta.url).href,
  "jackpot-key": new URL("../../assets/key.svg", import.meta.url).href,
};

const symbolUrl = (name: BeardBankSymbolId): string =>
  FINISHED_SYMBOL_URLS[name] ?? new URL(`../../assets/concept-symbols/${name}.png`, import.meta.url).href;

const SYMBOL_LABELS: Record<BeardBankSymbolId, string> = {
  comb: "COMB", razor: "RAZOR", balm: "BALM", oil: "OIL", crown: "CROWN",
  "vault-crest": "VAULT CREST", "luxury-kit": "LUXURY KIT", vernon: "VERNON",
  "beard-coin": "BEARD COIN", "gold-crest": "WILD", "vault-door": "FREE SPINS",
  "jackpot-key": "JACKPOT KEY",
};

export class SymbolView extends Container {
  private winGlow: Graphics | undefined;
  private art: Sprite | undefined;
  private artScaleX = 1;
  private artScaleY = 1;

  public constructor(
    symbolId: BeardBankSymbolId,
    private readonly symbolWidth: number,
    private readonly symbolHeight: number,
  ) {
    super();
    this.setSymbol(symbolId);
  }

  public setSymbol(symbolId: BeardBankSymbolId): void {
    // SymbolView instances are reused while reels spin. Drop references to
    // children before destroying them so state cleanup never touches an old,
    // destroyed Sprite after switching to generated artwork.
    this.art = undefined;
    this.winGlow = undefined;
    this.artScaleX = 1;
    this.artScaleY = 1;
    this.removeChildren().forEach((child) => child.destroy());
    const width = this.symbolWidth - 2;
    const height = this.symbolHeight - 2;

    const well = new Graphics()
      .roundRect(0, 0, width, height, 8)
      .fill({ color: 0x07020b, alpha: 1 });

    // A real fallback is always painted first. If an image is slow, missing, or
    // rejected by the browser the reel still shows a named premium tile instead
    // of a mysterious black hole.
    const fallback = new Text({ text: SYMBOL_LABELS[symbolId], style: {
      fontFamily: "Arial Black, Arial", fontSize: Math.max(10, Math.round(height * 0.11)),
      fontWeight: "bold", fill: 0xffd76b, align: "center", wordWrap: true,
      wordWrapWidth: width * 0.72,
    } });
    fallback.anchor.set(0.5); fallback.position.set(width / 2, height / 2);
    // Production art is bundled and preloaded before the cabinet opens. Keep
    // this emergency label in the display tree, but never paint it underneath
    // healthy art (the old behaviour produced words behind transparent PNGs).
    fallback.visible = false;
    this.art = Sprite.from(symbolUrl(symbolId));
    // Preserve the fitted scale. The previous renderer sized the sprite and
    // then reset scale to 1 during normal win-state cleanup. That made the new
    // 1254px transparent artwork enormous, leaving only a transparent corner
    // inside the reel window and creating the apparent blank symbols.
    const textureWidth = Math.max(1, this.art.texture.width);
    const textureHeight = Math.max(1, this.art.texture.height);
    const generatedArt = symbolId === "balm" || symbolId === "razor"
      || symbolId === "vault-crest" || symbolId === "luxury-kit";
    if (generatedArt) {
      const fit = Math.min((width * 0.88) / textureWidth, (height * 0.84) / textureHeight);
      this.artScaleX = fit;
      this.artScaleY = fit;
      this.art.anchor.set(0.5);
      this.art.position.set(width / 2, height / 2 - 2);
    } else {
      this.artScaleX = width / textureWidth;
      this.artScaleY = height / textureHeight;
      this.art.position.set(0, 0);
    }
    this.art.scale.set(this.artScaleX, this.artScaleY);
    this.addChild(well, fallback, this.art);

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

    this.addChild(shade, sheen, this.winGlow);
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
    if (this.art) this.art.scale.set(
      this.artScaleX * (1 + clamped * 0.025),
      this.artScaleY * (1 + clamped * 0.025),
    );
  }

  public resetWinState(): void {
    this.alpha = 1;
    if (this.winGlow) this.winGlow.alpha = 0;
    if (this.art) this.art.scale.set(this.artScaleX, this.artScaleY);
  }
}
