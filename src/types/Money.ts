export type Credits = number;

export interface MoneyPolicy {
  readonly decimalPlaces: number;
  readonly minimumWager: Credits;
  readonly maximumWager: Credits;
}

export const DEFAULT_MONEY_POLICY: MoneyPolicy = {
  decimalPlaces: 2,
  minimumWager: 0.01,
  maximumWager: 10_000,
};

export function roundCredits(value: Credits, decimalPlaces = 2): Credits {
  if (!Number.isFinite(value)) throw new RangeError('Credit values must be finite.');
  const factor = 10 ** decimalPlaces;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function assertNonNegativeCredits(value: Credits, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite, non-negative credit value.`);
  }
}
