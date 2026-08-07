import { describe, expect, it } from "vitest";
import { createGoatEatIntent, createUfoAbductIntent } from "../../../src/games/megh/MeghFeatureIntent";

describe("Megh feature intents", () => {
  it("keeps only unique in-bounds goat targets", () => {
    const intent = createGoatEatIntent([
      { x: 1, y: 2 },
      { x: 1, y: 2 },
      { x: -1, y: 0 },
      { x: 5, y: 4 },
      { x: 6, y: 4 },
    ], 6, 5, "golden");

    expect(intent.kind).toBe("goat-eat");
    expect(intent.targets).toEqual([{ x: 1, y: 2 }, { x: 5, y: 4 }]);
    if (intent.kind === "goat-eat") expect(intent.personality).toBe("golden");
  });

  it("normalizes UFO targets without changing their order", () => {
    const intent = createUfoAbductIntent([
      { x: 4, y: 1 },
      { x: 0, y: 3 },
      { x: 4, y: 1 },
    ], 6, 5);

    expect(intent.targets).toEqual([{ x: 4, y: 1 }, { x: 0, y: 3 }]);
  });
});
