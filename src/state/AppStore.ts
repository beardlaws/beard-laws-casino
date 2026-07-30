import type { EngineSnapshot } from '../engine/BeardEngine';
import type { SpinResult } from '../types/GameTypes';

export interface AppState {
  readonly engine: EngineSnapshot;
  readonly spinning: boolean;
  readonly ledgerOpen: boolean;
  readonly message: string;
}

type Listener = (state: AppState) => void;

export class AppStore {
  private listeners = new Set<Listener>();

  public constructor(private state: AppState) {}

  public get snapshot(): AppState {
    return this.state;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  public setSpinning(spinning: boolean): void {
    this.patch({ spinning });
  }

  public toggleLedger(): void {
    this.patch({ ledgerOpen: !this.state.ledgerOpen });
  }

  public syncEngine(engine: EngineSnapshot, result?: SpinResult): void {
    const message = result === undefined
      ? this.state.message
      : result.totalWin > 0
        ? `WIN ${formatMoney(result.totalWin)}`
        : result.coinsLanded > 0
          ? `${result.coinsLanded} LIVING VAULT CHARGE${result.coinsLanded === 1 ? '' : 'S'}`
          : 'NO WIN — EVERY SPIN IS INDEPENDENT';

    this.patch({ engine, message });
  }

  private patch(partial: Partial<AppState>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((listener) => listener(this.state));
  }
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}
