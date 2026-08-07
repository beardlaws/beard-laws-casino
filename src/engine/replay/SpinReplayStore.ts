import type { CasinoActivity } from "../../state/CasinoProgression";
import type { SpinOutcome } from "../contracts/SpinOutcome";

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
  outcome?: SpinOutcome;
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

  /** Adds diagnostic information after a spin has already completed. */
  public noteCompleted(message: string, details: Record<string, unknown> = {}): void {
    if (this.active) {
      this.append("note", { message, ...details });
      return;
    }
    if (!this.last) return;
    const startedAt = Date.parse(this.last.startedAtIso);
    const atMs = Number.isFinite(startedAt) ? Math.max(0, Date.now() - startedAt) : 0;
    this.last = {
      ...this.last,
      events: [
        ...this.last.events,
        { atMs, type: "note", payload: { message, ...details } },
      ],
    };
    this.persistLast();
  }

  public finishActive(): void {
    if (!this.active) return;
    this.last = structuredClone(this.active);
    this.active = null;
    this.persistLast();
  }

  public attachOutcome(outcome: SpinOutcome): void {
    if (this.active && this.active.game === outcome.game) {
      this.active.outcome = structuredClone(outcome);
      return;
    }
    if (this.last && this.last.game === outcome.game) {
      this.last = { ...this.last, outcome: structuredClone(outcome) };
      this.persistLast();
    }
  }

  public getLast(): SpinReplay | null {
    return this.last ? structuredClone(this.last) : null;
  }

  public exportLast(): string | null {
    const replay = this.getLast();
    return replay ? JSON.stringify(replay, null, 2) : null;
  }


  private persistLast(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.last));
    } catch {
      // Diagnostics must never interrupt gameplay.
    }
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
