import { describe, expect, it } from "vitest";
import { SlotBetModel } from "./SlotBetModel";

describe("SlotBetModel", () => {
  it("offers casino denominations without ever exceeding $250", () => {
    const model = new SlotBetModel();
    for (let d = 0; d < 6; d += 1) model.changeDenomination(1);
    for (let b = 0; b < 20; b += 1) model.changeCredits(1);
    expect(model.denominationUnits).toBe(10);
    expect(model.wagerUnits).toBe(25_000);
  });

  it("changes money value but not the selected credit wager", () => {
    const model = new SlotBetModel();
    const credits = model.credits;
    model.changeDenomination(1);
    expect(model.credits).toBe(credits);
    expect(model.wagerUnits).toBe(credits * 2);
  });
});
