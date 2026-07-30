export type SymbolId =
  | 'oil'
  | 'comb'
  | 'razor'
  | 'balm'
  | 'key'
  | 'crown'
  | 'vernon'
  | 'vault'
  | 'coin';

export type Grid = readonly (readonly SymbolId[])[];

export type WinMode = 'ways' | 'lines';

export interface CoinValue {
  readonly reel: number;
  readonly row: number;
  readonly value: number;
}

export interface SpinRequest {
  readonly bet: number;
  readonly winMode: WinMode;
}

export interface SpinResult {
  readonly grid: Grid;
  readonly wager: number;
  readonly baseWin: number;
  readonly scatterWin: number;
  readonly vernonWin: number;
  readonly totalWin: number;
  readonly coinValues: readonly CoinValue[];
  readonly coinsLanded: number;
  readonly vaultChargesBefore: number;
  readonly vaultChargesAfter: number;
  readonly livingVaultTriggered: boolean;
  readonly resolutionLog: readonly string[];
}

export interface GameConfig {
  readonly id: string;
  readonly title: string;
  readonly rows: number;
  readonly reels: number;
  readonly targetRtpLabel: string;
  readonly reelStrips: readonly (readonly SymbolId[])[];
}
