import type { CreditUnits } from '../../types/Money';

export type WalletAccountId = 'bank' | 'casinoWallet';

export type WalletTransactionKind =
  | 'sessionDeposit'
  | 'sessionCashOut'
  | 'wager'
  | 'award'
  | 'adjustment';

export interface WalletBalances {
  readonly bankUnits: CreditUnits;
  readonly casinoWalletUnits: CreditUnits;
}

export interface WalletTransaction {
  readonly id: string;
  readonly sequence: number;
  readonly occurredAtIso: string;
  readonly kind: WalletTransactionKind;
  readonly amountUnits: CreditUnits;
  readonly source: WalletAccountId | 'engine';
  readonly destination: WalletAccountId | 'engine';
  readonly reason: string;
  readonly balancesAfter: WalletBalances;
  readonly metadata: Readonly<Record<string, string | number | boolean>>;
}

export interface WalletSnapshot extends WalletBalances {
  readonly transactionSequence: number;
  readonly lifetimeWageredUnits: CreditUnits;
  readonly lifetimeAwardedUnits: CreditUnits;
  readonly largestAwardUnits: CreditUnits;
}

export interface WalletInitialization {
  readonly bankUnits: CreditUnits;
  readonly casinoWalletUnits: CreditUnits;
  readonly lifetimeWageredUnits?: CreditUnits;
  readonly lifetimeAwardedUnits?: CreditUnits;
  readonly largestAwardUnits?: CreditUnits;
}

export interface WalletMutationOptions {
  readonly reason: string;
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

export interface WalletPort {
  getSnapshot(): WalletSnapshot;
  canAfford(wagerUnits: CreditUnits): boolean;
  placeWager(
    wagerUnits: CreditUnits,
    options: WalletMutationOptions,
  ): WalletTransaction;
  award(
    amountUnits: CreditUnits,
    options: WalletMutationOptions,
  ): WalletTransaction;
  transferToCasinoWallet(
    amountUnits: CreditUnits,
    options: WalletMutationOptions,
  ): WalletTransaction;
  cashOutSession(options: WalletMutationOptions): WalletTransaction;
  getTransactions(): readonly WalletTransaction[];
}
