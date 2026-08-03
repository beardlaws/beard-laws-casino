import { describe, expect, it } from "vitest";
import { SymbolView } from "../../src/graphics/SymbolView";

describe("SymbolView reel reuse", () => {
  it("can switch repeatedly between image and generated symbols", () => {
    const symbol = new SymbolView("comb", 180, 130);

    expect(() => {
      symbol.setSymbol("razor");
      symbol.resetWinState();
      symbol.setWinGlow(0.8);
      symbol.setSymbol("oil");
      symbol.resetWinState();
      symbol.setSymbol("jackpot-key");
      symbol.resetWinState();
    }).not.toThrow();

    symbol.destroy({ children: true });
  });
});
