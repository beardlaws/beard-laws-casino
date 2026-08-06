import type { CasinoActivity } from "../../state/CasinoProgression";

export interface ReplayEvent {
  atMs: number;
  type: "activity" | "state" | "note";
  payload: Record<string, unknown>;
}

export interface SpinReplay {
  id: string;
  game: string;
  startedAtIso: string;
  wagerUnits: number;
  events: ReplayEvent[];
}

const STORAGE_KEY = "beard-laws-casino-last-replay-v1";

export class SpinReplayStore {
  private active: SpinReplay | null = null;
  private last: SpinReplay | null = this.readStored();
  private startedAt = 0;

  public recordActivity(activity: CasinoActivity): void {
    if (activity.type === "spin") {
      this.finishActive();
      this.startedAt = performance.now();
      this.active = {
        id: `${activity.game}-${Date.now()}`,
        game: activity.game,
        startedAtIso: new Date().toISOString(),
        wagerUnits: activity.wager ?? 0,
        events: [],
      };
    }
    this.append("activity", activity as unknown as Record<string, unknown>);
  }

  public recordState(state: string): void {
    this.append("state", { state });
    if (state === "READY" || state === "FEATURE_OUTRO") this.finishActive();
  }

  public note(message: string, details: Record<string, unknown> = {}): void {
    this.append("note", { message, ...details });
  }

  public finishActive(): void {
    if (!this.active) return;
    this.last = structuredClone(this.active);
    this.active = null;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.last));
    } catch {
      // Replays are diagnostic only. Gameplay must never fail on storage limits.
    }
  }

  public getLast(): SpinReplay | null {
    return this.last ? structuredClone(this.last) : null;
  }

  public exportLast(): string | null {
    const replay = this.getLast();
    return replay ? JSON.stringify(replay, null, 2) : null;
  }

  private append(type: ReplayEvent["type"], payload: Record<string, unknown>): void {
    if (!this.active) return;
    this.active.events.push({
      atMs: Math.max(0, Math.round(performance.now() - this.startedAt)),
      type,
      payload,
    });
  }

  private readStored(): SpinReplay | null {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value ? (JSON.parse(value) as SpinReplay) : null;
    } catch {
      return null;
    }
  }
}
