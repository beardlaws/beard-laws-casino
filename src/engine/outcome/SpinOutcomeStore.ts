import type { SpinOutcome, SpinPresentationCue, SpinProgressionChange, SpinFeatureTrigger } from "../contracts/SpinOutcome";
import type { CasinoActivity, CasinoGameId } from "../../state/CasinoProgression";

const STORAGE_KEY = "beard-laws-casino-last-outcome-v1";

interface ActiveOutcome {
  id: string;
  game: CasinoGameId;
  startedAtIso: string;
  startedAtMs: number;
  wagerUnits: number;
  totalWinUnits: number;
  winMultiplier: number;
  features: SpinFeatureTrigger[];
  progression: SpinProgressionChange[];
  presentation: SpinPresentationCue[];
  metadata: Record<string, unknown>;
}

export class SpinOutcomeStore {
  private sequence = 0;
  private active: ActiveOutcome | null = null;
  private last: SpinOutcome | null = this.readStored();

  public recordActivity(activity: CasinoActivity): SpinOutcome | null {
    let completed: SpinOutcome | null = null;
    if (activity.type === "spin") {
      completed = this.finishActive();
      this.active = {
        id: `${activity.game}-${Date.now()}-${++this.sequence}`,
        game: activity.game,
        startedAtIso: new Date().toISOString(),
        startedAtMs: performance.now(),
        wagerUnits: Math.max(0, activity.wager ?? 0),
        totalWinUnits: 0,
        winMultiplier: 0,
        features: [],
        progression: [],
        presentation: [],
        metadata: {},
      };
      return completed;
    }
    if (!this.active || this.active.game !== activity.game) return completed;

    if (activity.type === "win") {
      this.active.totalWinUnits += Math.max(0, activity.amount ?? 0);
      this.active.winMultiplier = Math.max(this.active.winMultiplier, Math.max(0, activity.value ?? 0));
    } else if (activity.type === "bonus") {
      this.active.features.push({
        id: "bonus",
        ...(activity.value === undefined ? {} : { value: activity.value }),
        ...(activity.amount === undefined ? {} : { amountUnits: activity.amount }),
      });
    } else if (activity.type === "coin" || activity.type === "stage" || activity.type === "voyage") {
      this.active.progression.push({
        kind: activity.type,
        ...(activity.value === undefined ? {} : { value: activity.value }),
        ...(activity.amount === undefined ? {} : { amountUnits: activity.amount }),
      });
    }
    return completed;
  }

  public recordState(state: string): SpinOutcome | null {
    if (!this.active) return null;
    this.active.presentation.push({
      atMs: Math.max(0, Math.round(performance.now() - this.active.startedAtMs)),
      state,
    });
    if (state === "READY") return this.finishActive();
    return null;
  }

  public note(key: string, value: unknown): void {
    if (this.active) this.active.metadata[key] = value;
  }

  public finishActive(): SpinOutcome | null {
    if (!this.active) return null;
    const active = this.active;
    const outcome: SpinOutcome = {
      schemaVersion: 1,
      id: active.id,
      game: active.game,
      startedAtIso: active.startedAtIso,
      completedAtIso: new Date().toISOString(),
      wagerUnits: active.wagerUnits,
      baseWinUnits: active.totalWinUnits,
      featureWinUnits: 0,
      totalWinUnits: active.totalWinUnits,
      winMultiplier: active.winMultiplier,
      features: active.features.map((feature) => ({ ...feature })),
      progression: active.progression.map((change) => ({ ...change })),
      presentation: active.presentation.map((cue) => ({ ...cue })),
      metadata: { ...active.metadata },
    };
    this.active = null;
    this.last = outcome;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(outcome));
    } catch {
      // Diagnostics must never interrupt gameplay.
    }
    return structuredClone(outcome);
  }

  /** Accepts a cabinet-authored outcome from a fully migrated Project Beard runtime. */
  public acceptOutcome(outcome: SpinOutcome): void {
    this.active = null;
    this.last = structuredClone(outcome);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(outcome));
    } catch {
      // Diagnostics must never interrupt gameplay.
    }
  }

  public getLast(): SpinOutcome | null {
    return this.last ? structuredClone(this.last) : null;
  }

  public exportLast(): string | null {
    const outcome = this.getLast();
    return outcome ? JSON.stringify(outcome, null, 2) : null;
  }

  private readStored(): SpinOutcome | null {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value ? (JSON.parse(value) as SpinOutcome) : null;
    } catch {
      return null;
    }
  }
}
