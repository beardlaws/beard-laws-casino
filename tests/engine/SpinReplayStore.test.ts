import { beforeEach, describe, expect, it, vi } from "vitest";
import { SpinReplayStore } from "../../src/engine/replay/SpinReplayStore";
import type { SpinOutcome } from "../../src/engine/contracts/SpinOutcome";

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  vi.stubGlobal("performance", { now: vi.fn().mockReturnValueOnce(100).mockReturnValue(150) });
});

describe("SpinReplayStore", () => {
  it("records activity and state in one exportable spin timeline", () => {
    const store = new SpinReplayStore();
    store.recordActivity({ type: "spin", game: "megh", wager: 100 });
    store.recordState("SPINNING");
    store.recordActivity({ type: "win", game: "megh", amount: 250, value: 2.5, wager: 100 });
    store.finishActive();
    const replay = store.getLast();
    expect(replay?.game).toBe("megh");
    expect(replay?.wagerUnits).toBe(100);
    expect(replay?.events.map((event) => event.type)).toEqual(["activity", "state", "activity"]);
    expect(store.exportLast()).toContain('"game": "megh"');
  });

  it("embeds the shared outcome in the replay export", () => {
    const store = new SpinReplayStore();
    store.recordActivity({ type: "spin", game: "megh", wager: 100 });
    store.recordState("SPINNING");
    const outcome: SpinOutcome = {
      schemaVersion: 1,
      id: "megh-test",
      game: "megh",
      startedAtIso: new Date(0).toISOString(),
      completedAtIso: new Date(1).toISOString(),
      wagerUnits: 100,
      baseWinUnits: 250,
      featureWinUnits: 0,
      totalWinUnits: 250,
      winMultiplier: 2.5,
      features: [],
      progression: [],
      presentation: [],
      metadata: {},
    };
    store.attachOutcome(outcome);
    store.finishActive();
    expect(store.getLast()?.outcome?.totalWinUnits).toBe(250);
  });
});
