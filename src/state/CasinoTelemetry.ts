import type { CasinoGameId } from "./CasinoProgression";

export interface GameTelemetry {
  spins: number;
  features: number;
  wins: number;
  totalWagered: number;
  totalWon: number;
  lastFeatureSpin: number;
  longestDrySpell: number;
}

export interface TelemetrySnapshot {
  activeGame: CasinoGameId | "lobby";
  gameState: string;
  animationSpeed: number;
  games: Partial<Record<CasinoGameId, GameTelemetry>>;
}

const STORAGE_KEY = "beard-laws-casino-telemetry-v74";
const blank = (): GameTelemetry => ({ spins: 0, features: 0, wins: 0, totalWagered: 0, totalWon: 0, lastFeatureSpin: 0, longestDrySpell: 0 });

export class CasinoTelemetryStore {
  private games: Partial<Record<CasinoGameId, GameTelemetry>> = {};
  private activeGame: CasinoGameId | "lobby" = "lobby";
  private gameState = "READY";
  private animationSpeed = 1;

  public constructor() {
    try { this.games = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<Record<CasinoGameId, GameTelemetry>>; } catch { this.games = {}; }
  }
  public setActiveGame(game: CasinoGameId | "lobby"): void { this.activeGame = game; this.gameState = "READY"; }
  public setState(state: string): void { this.gameState = state; }
  public setAnimationSpeed(speed: number): void {
    this.animationSpeed = speed;
    document.documentElement.style.setProperty("--qa-speed", String(speed));
    window.dispatchEvent(new CustomEvent("casino:qa-speed", { detail: { speed } }));
  }
  public record(game: CasinoGameId, type: "spin" | "bonus" | "win", amount = 0): void {
    const data = { ...(this.games[game] ?? blank()) };
    if (type === "spin") {
      data.spins += 1;
      data.totalWagered += Math.max(0, amount);
      const dry = data.spins - data.lastFeatureSpin;
      data.longestDrySpell = Math.max(data.longestDrySpell, dry);
    } else if (type === "bonus") {
      data.features += 1;
      data.lastFeatureSpin = data.spins;
    } else {
      data.wins += 1;
      data.totalWon += Math.max(0, amount);
    }
    this.games[game] = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.games));
  }
  public reset(): void { this.games = {}; localStorage.removeItem(STORAGE_KEY); }
  public snapshot(): TelemetrySnapshot { return { activeGame: this.activeGame, gameState: this.gameState, animationSpeed: this.animationSpeed, games: structuredClone(this.games) }; }
}
