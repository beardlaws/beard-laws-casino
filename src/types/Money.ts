/**
 * Atomic fictional credit units.
 *
 * Convention: 100 units = 1.00 displayed casino credit.
 * All engine accounting uses integers to avoid floating-point drift.
 */
export type CreditUnits = number;

export const CREDIT_UNIT_SCALE = 100 as const;

export interface MoneyPolicy {
  readonly minimumWagerUnits: CreditUnits;
  readonly maximumWagerUnits: CreditUnits;
}

export const DEFAULT_MONEY_POLICY: MoneyPolicy = {
  minimumWagerUnits: 25,
  maximumWagerUnits: 100_000,
};

export function assertCreditUnits(value: CreditUnits, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative safe integer.`);
  }
}

export function formatCreditUnits(value: CreditUnits): string {
  assertCreditUnits(value, 'Credit value');
  return (value / CREDIT_UNIT_SCALE).toFixed(2);
}
