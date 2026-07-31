import { Container, Graphics, Text } from "pixi.js";

export type BeardBankSymbolId =
  | "comb"
  | "oil"
  | "crown"
  | "vernon"
  | "beard-coin"
  | "gold-crest"
  | "vault-door";

interface SymbolTheme {
  readonly label: string;
  readonly primary: number;
  readonly secondary: number;
  readonly accent: number;
  readonly glyph: string;
}

const SYMBOL_THEMES: Record<BeardBankSymbolId, SymbolTheme> = {
  comb: { label: "COMB", primary: 0x1fffc0, secondary: 0x04241d, accent: 0xb7ffe9, glyph: "≋" },
  oil: { label: "OIL", primary: 0x36c8ff, secondary: 0x041c34, accent: 0xc4f4ff, glyph: "◆" },
  crown: { label: "CROWN", primary: 0xff735f, secondary: 0x310911, accent: 0xffd0bd, glyph: "♛" },
  vernon: { label: "VERNON", primary: 0xd17cff, secondary: 0x260632, accent: 0xf4d2ff, glyph: "V" },
  "beard-coin": { label: "COIN", primary: 0xffd84f, secondary: 0x342103, accent: 0xffffcf, glyph: "$" },
  "gold-crest": { label: "WILD", primary: 0xffec8a, secondary: 0x342104, accent: 0xffffff, glyph: "W" },
  "vault-door": { label: "VAULT", primary: 0xba63ff, secondary: 0x25052f, accent: 0xf3c8ff, glyph: "◎" },
};

export class SymbolView extends Container {
  private winGlow?: Graphics;
  private aura?: Graphics;
  private energyRing?: Graphics;
  private reflection?: Graphics;

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

    const theme = SYMBOL_THEMES[symbolId];
    const width = this.symbolWidth - 8;
    const height = this.symbolHeight - 8;
    const centerX = width / 2;
    const centerY = height * 0.46;
    const radius = 15;

    const shadow = new Graphics()
      .roundRect(4, 7, width, height, radius)
      .fill({ color: 0x000000, alpha: 0.5 });

    const shell = new Graphics()
      .roundRect(0, 0, width, height, radius)
      .fill({ color: theme.secondary, alpha: 0.76 })
      .stroke({ color: theme.primary, width: 1.5, alpha: 0.56 });

    const innerGlass = new Graphics()
      .roundRect(3, 3, width - 6, height - 6, radius - 3)
      .fill({ color: 0x090713, alpha: 0.26 })
      .stroke({ color: theme.accent, width: 1, alpha: 0.18 });

    const lowerBloom = new Graphics()
      .ellipse(centerX, height * 0.78, width * 0.42, height * 0.24)
      .fill({ color: theme.primary, alpha: 0.1 });

    this.aura = new Graphics()
      .circle(centerX, centerY, Math.min(width, height) * 0.34)
      .fill({ color: theme.primary, alpha: 0.09 });

    this.energyRing = new Graphics()
      .circle(centerX, centerY, Math.min(width, height) * 0.27)
      .stroke({ color: theme.primary, width: 7, alpha: 0.13 })
      .circle(centerX, centerY, Math.min(width, height) * 0.22)
      .stroke({ color: theme.accent, width: 1.5, alpha: 0.52 });

    const core = new Graphics()
      .circle(centerX, centerY, Math.min(width, height) * 0.19)
      .fill({ color: theme.primary, alpha: 0.18 })
      .stroke({ color: theme.accent, width: 2, alpha: 0.72 });

    const glyph = new Text({
      text: theme.glyph,
      style: {
        fontFamily: "Arial Black, Arial",
        fontSize: Math.floor(height * 0.38),
        fontWeight: "bold",
        fill: theme.accent,
        stroke: { color: theme.secondary, width: 4 },
        dropShadow: { color: theme.primary, blur: 10, distance: 0, alpha: 0.9 },
      },
    });
    glyph.anchor.set(0.5);
    glyph.position.set(centerX, centerY);

    const label = new Text({
      text: theme.label,
      style: {
        fontFamily: "Arial Black, Arial",
        fontSize: Math.max(11, Math.floor(height * 0.13)),
        fontWeight: "bold",
        fill: 0xfff3cb,
        letterSpacing: 2.2,
        dropShadow: { color: 0x000000, blur: 4, distance: 1, angle: Math.PI / 2, alpha: 1 },
      },
    });
    label.anchor.set(0.5);
    label.position.set(centerX, height * 0.83);

    const labelUnderline = new Graphics()
      .roundRect(width * 0.31, height * 0.9, width * 0.38, 2, 1)
      .fill({ color: theme.primary, alpha: 0.62 });

    this.reflection = new Graphics()
      .moveTo(width * 0.08, height * 0.08)
      .lineTo(width * 0.54, height * 0.08)
      .lineTo(width * 0.34, height * 0.52)
      .lineTo(width * 0.02, height * 0.52)
      .closePath()
      .fill({ color: 0xffffff, alpha: 0.045 });

    this.winGlow = new Graphics()
      .roundRect(1, 1, width - 2, height - 2, radius)
      .fill({ color: theme.primary, alpha: 0.13 })
      .stroke({ color: theme.accent, width: 5, alpha: 1 });
    this.winGlow.alpha = 0;

    this.addChild(
      shadow,
      shell,
      innerGlass,
      lowerBloom,
      this.aura,
      this.energyRing,
      core,
      glyph,
      label,
      labelUnderline,
      this.reflection,
      this.winGlow,
    );

    this.resetWinState();
  }

  public setDimmed(dimmed: boolean): void {
    this.alpha = dimmed ? 0.16 : 1;
    if (dimmed && this.winGlow) this.winGlow.alpha = 0;
  }

  public setWinGlow(intensity: number): void {
    const normalized = Math.max(0, Math.min(1, intensity));
    this.alpha = 1;
    this.scale.set(1 + normalized * 0.055);
    if (this.winGlow) this.winGlow.alpha = normalized;
    if (this.aura) this.aura.alpha = 0.55 + normalized * 0.45;
    if (this.energyRing) this.energyRing.alpha = 0.72 + normalized * 0.28;
    if (this.reflection) this.reflection.alpha = 0.7 + normalized * 0.3;
  }

  public resetWinState(): void {
    this.alpha = 1;
    this.scale.set(1);
    if (this.winGlow) this.winGlow.alpha = 0;
    if (this.aura) this.aura.alpha = 1;
    if (this.energyRing) this.energyRing.alpha = 1;
    if (this.reflection) this.reflection.alpha = 1;
  }
}
