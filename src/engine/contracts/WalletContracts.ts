import type { Credits } from '../../types/Money';

export type WalletAccountId = 'bank' | 'casinoWallet';
export type WalletTransactionKind =
  | 'sessionDeposit' | 'sessionCashOut' | 'wager' | 'award' | 'adjustment';

export interface WalletBalances {
  readonly bank: Credits;
  readonly casinoWallet: Credits;
}

export interface WalletTransaction {
  readonly id: string;
  readonly sequence: number;
  readonly occurredAtIso: string;
  readonly kind: WalletTransactionKind;
  readonly amount: Credits;
  readonly source: WalletAccountId | 'engine';
  readonly destination: WalletAccountId | 'engine';
  readonly reason: string;
  readonly balancesAfter: WalletBalances;
  readonly metadata: Readonly<Record<string, string | number | boolean>>;
}

export interface WalletSnapshot extends WalletBalances {
  readonly transactionSequence: number;
  readonly lifetimeWagered: Credits;
  readonly lifetimeAwarded: Credits;
  readonly largestAward: Credits;
}

export interface WalletInitialization {
  readonly bank: Credits;
  readonly casinoWallet: Credits;
  readonly lifetimeWagered?: Credits;
  readonly lifetimeAwarded?: Credits;
  readonly largestAward?: Credits;
}

export interface WalletMutationOptions {
  readonly reason: string;
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

export interface WalletPort {
  getSnapshot(): WalletSnapshot;
  canAfford(wager: Credits): boolean;
  placeWager(wager: Credits, options: WalletMutationOptions): WalletTransaction;
  award(amount: Credits, options: WalletMutationOptions): WalletTransaction;
  transferToCasinoWallet(amount: Credits, options: WalletMutationOptions): WalletTransaction;
  cashOutSession(options: WalletMutationOptions): WalletTransaction;
  getTransactions(): readonly WalletTransaction[];
}
