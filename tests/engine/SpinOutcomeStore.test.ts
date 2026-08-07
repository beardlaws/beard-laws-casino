import { beforeEach, describe, expect, it, vi } from "vitest";
import { SpinOutcomeStore } from "../../src/engine/outcome/SpinOutcomeStore";

const storage = new Map<string, string>();
let clock = 100;

beforeEach(() => {
  storage.clear();
  clock = 100;
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  vi.stubGlobal("performance", { now: () => (clock += 50) });
});

describe("SpinOutcomeStore", () => {
  it("creates one shared outcome from the production activity stream", () => {
    const store = new SpinOutcomeStore();
    store.recordActivity({ type: "spin", game: "megh", wager: 100 });
    store.recordState("SPINNING");
    store.recordActivity({ type: "bonus", game: "megh" });
    store.recordActivity({ type: "stage", game: "megh", value: 2 });
    store.recordActivity({ type: "win", game: "megh", amount: 350, value: 3.5 });
    const outcome = store.recordState("READY");

    expect(outcome).toMatchObject({
      schemaVersion: 1,
      game: "megh",
      wagerUnits: 100,
      totalWinUnits: 350,
      winMultiplier: 3.5,
    });
    expect(outcome?.features).toHaveLength(1);
    expect(outcome?.progression).toEqual([{ kind: "stage", value: 2 }]);
    expect(outcome?.presentation.map((cue) => cue.state)).toEqual(["SPINNING", "READY"]);
  });

  it("finishes an abandoned active spin when the next spin starts", () => {
    const store = new SpinOutcomeStore();
    store.recordActivity({ type: "spin", game: "barber", wager: 200 });
    store.recordActivity({ type: "win", game: "barber", amount: 50, value: 0.25 });
    const completed = store.recordActivity({ type: "spin", game: "barber", wager: 200 });
    expect(completed?.totalWinUnits).toBe(50);
    expect(store.exportLast()).toContain('"game": "barber"');
  });
  it("accepts a cabinet-authored outcome from a migrated runtime", () => {
    const store = new SpinOutcomeStore();
    store.acceptOutcome({
      schemaVersion: 1,
      id: "barber-direct",
      game: "barber",
      startedAtIso: "2026-08-07T00:00:00.000Z",
      completedAtIso: "2026-08-07T00:00:01.000Z",
      wagerUnits: 100,
      baseWinUnits: 200,
      featureWinUnits: 300,
      totalWinUnits: 500,
      winMultiplier: 5,
      features: [],
      progression: [],
      presentation: [],
      resultGrid: [["wax"]],
      metadata: { runtime: "project-beard-m5" },
    });

    expect(store.getLast()?.id).toBe("barber-direct");
    expect(store.exportLast()).toContain('"runtime": "project-beard-m5"');
  });

});
