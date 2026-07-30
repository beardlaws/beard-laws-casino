import type { Grid, SymbolId } from '../types/GameTypes';

const payTable: Readonly<Record<Exclude<SymbolId, 'coin' | 'vault'>, Readonly<Record<number, number>>>> = {
  oil: { 3: 2, 4: 5, 5: 12 },
  comb: { 3: 2, 4: 6, 5: 15 },
  razor: { 3: 3, 4: 8, 5: 20 },
  balm: { 3: 3, 4: 10, 5: 25 },
  key: { 3: 5, 4: 18, 5: 60 },
  crown: { 3: 8, 4: 30, 5: 120 },
  vernon: { 3: 10, 4: 50, 5: 250 },
};

const payingSymbols: readonly Exclude<SymbolId, 'coin' | 'vault' | 'vernon'>[] = [
  'oil', 'comb', 'razor', 'balm', 'key', 'crown',
];

export interface WaysEvaluation {
  readonly amount: number;
  readonly details: readonly string[];
}

export function evaluate243Ways(grid: Grid, bet: number): WaysEvaluation {
  let amount = 0;
  const details: string[] = [];

  for (const symbol of payingSymbols) {
    const counts: number[] = [];

    for (const reel of grid) {
      const matching = reel.filter((cell) => cell === symbol || cell === 'vernon').length;
      if (matching === 0) {
        break;
      }
      counts.push(matching);
    }

    const length = counts.length;
    if (length < 3) {
      continue;
    }

    const multiplier = payTable[symbol][length];
    if (multiplier === undefined) {
      continue;
    }

    const ways = counts.reduce((product, count) => product * count, 1);
    const win = (multiplier * ways * bet) / 243;
    amount += win;
    details.push(`${symbol}: ${length} reels × ${ways} ways`);
  }

  return {
    amount: round(amount),
    details,
  };
}

export function evaluateScatters(grid: Grid, bet: number): number {
  const count = grid.flat().filter((symbol) => symbol === 'vault').length;
  const multiplier = count === 3 ? 2 : count === 4 ? 10 : count >= 5 ? 50 : 0;
  return round(multiplier * bet);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
