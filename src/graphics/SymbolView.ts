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
  readonly glyph: string;
}

const SYMBOL_THEMES: Record<BeardBankSymbolId, SymbolTheme> = {
  comb: { label: "COMB", primary: 0x32d49a, secondary: 0x123c32, glyph: "≋" },
  oil: { label: "OIL", primary: 0x41b7ff, secondary: 0x102f4c, glyph: "◆" },
  crown: { label: "CROWN", primary: 0xff704d, secondary: 0x4a1712, glyph: "♛" },
  vernon: { label: "VERNON", primary: 0xb96cff, secondary: 0x321249, glyph: "V" },
  "beard-coin": { label: "COIN", primary: 0xffd64a, secondary: 0x5a3b08, glyph: "$" },
  "gold-crest": { label: "WILD", primary: 0xffef93, secondary: 0x6b4610, glyph: "W" },
  "vault-door": { label: "VAULT", primary: 0xc85cff, secondary: 0x351044, glyph: "◎" },
};

export class SymbolView extends Container {
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
    const width = this.symbolWidth;
    const height = this.symbolHeight;

    const shadow = new Graphics().roundRect(5, 7, width - 10, height - 10, 14).fill({ color: 0x000000, alpha: 0.65 });
    const background = new Graphics().roundRect(0, 0, width - 10, height - 10, 14).fill(theme.secondary).stroke({ color: theme.primary, width: 3 });
    const innerFrame = new Graphics().roundRect(7, 7, width - 24, height - 24, 10).stroke({ color: theme.primary, width: 2, alpha: 0.45 });
    const medallionSize = Math.min(width, height) * 0.52;
    const medallion = new Graphics().circle((width - 10) / 2, height * 0.43, medallionSize / 2).fill({ color: theme.primary, alpha: 0.2 }).stroke({ color: theme.primary, width: 3 });

    const glyph = new Text({
      text: theme.glyph,
      style: { fontFamily: "Arial Black, Arial", fontSize: Math.floor(height * 0.34), fontWeight: "bold", fill: theme.primary },
    });
    glyph.anchor.set(0.5);
    glyph.position.set((width - 10) / 2, height * 0.43);

    const label = new Text({
      text: theme.label,
      style: { fontFamily: "Arial Black, Arial", fontSize: Math.max(12, Math.floor(height * 0.15)), fontWeight: "bold", fill: 0xfff0bd, letterSpacing: 1 },
    });
    label.anchor.set(0.5);
    label.position.set((width - 10) / 2, height * 0.82);

    this.addChild(shadow, background, innerFrame, medallion, glyph, label);
  }
}
