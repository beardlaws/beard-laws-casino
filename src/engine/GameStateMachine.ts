export type CasinoGameState =
  | "READY"
  | "SPIN_START"
  | "SPINNING"
  | "REEL_STOPS"
  | "EVALUATING"
  | "WIN_PRESENTATION"
  | "FEATURE_INTRO"
  | "FEATURE_ACTIVE"
  | "CASCADE"
  | "FEATURE_OUTRO";

const ALLOWED: Record<CasinoGameState, readonly CasinoGameState[]> = {
  READY: ["SPIN_START", "FEATURE_INTRO"],
  SPIN_START: ["SPINNING", "READY"],
  SPINNING: ["REEL_STOPS", "READY"],
  REEL_STOPS: ["EVALUATING", "READY"],
  EVALUATING: ["WIN_PRESENTATION", "FEATURE_INTRO", "CASCADE", "READY"],
  WIN_PRESENTATION: ["CASCADE", "FEATURE_INTRO", "READY"],
  FEATURE_INTRO: ["FEATURE_ACTIVE", "FEATURE_OUTRO", "READY"],
  FEATURE_ACTIVE: ["CASCADE", "WIN_PRESENTATION", "FEATURE_OUTRO", "READY"],
  CASCADE: ["EVALUATING", "WIN_PRESENTATION", "FEATURE_ACTIVE", "READY"],
  FEATURE_OUTRO: ["READY"],
};

export class GameStateMachine {
  private current: CasinoGameState = "READY";
  public constructor(private readonly name: string) {}
  public get state(): CasinoGameState { return this.current; }
  public can(next: CasinoGameState): boolean { return ALLOWED[this.current].includes(next); }
  public transition(next: CasinoGameState, force = false): void {
    if (!force && !this.can(next)) {
      console.warn(`[${this.name}] blocked state transition ${this.current} -> ${next}`);
      return;
    }
    this.current = next;
    window.dispatchEvent(new CustomEvent("casino:state", { detail: { game: this.name, state: next } }));
  }
  public reset(): void { this.transition("READY", true); }
}
