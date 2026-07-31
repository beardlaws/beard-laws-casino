import type {
  WalletBalances, WalletInitialization, WalletMutationOptions, WalletPort,
  WalletSnapshot, WalletTransaction, WalletTransactionKind,
} from './contracts/WalletContracts';
import {
  assertNonNegativeCredits, DEFAULT_MONEY_POLICY, roundCredits,
  type Credits, type MoneyPolicy,
} from '../types/Money';

export interface WalletManagerDependencies {
  readonly createTransactionId: () => string;
  readonly now: () => Date;
  readonly moneyPolicy?: MoneyPolicy;
}

export class WalletManager implements WalletPort {
  private bank: Credits;
  private casinoWallet: Credits;
  private lifetimeWagered: Credits;
  private lifetimeAwarded: Credits;
  private largestAward: Credits;
  private sequence = 0;
  private readonly transactions: WalletTransaction[] = [];
  private readonly moneyPolicy: MoneyPolicy;

  public constructor(
    initialization: WalletInitialization,
    private readonly dependencies: WalletManagerDependencies,
  ) {
    this.moneyPolicy = dependencies.moneyPolicy ?? DEFAULT_MONEY_POLICY;
    this.assertInitialization(initialization);
    this.bank = this.round(initialization.bank);
    this.casinoWallet = this.round(initialization.casinoWallet);
    this.lifetimeWagered = this.round(initialization.lifetimeWagered ?? 0);
    this.lifetimeAwarded = this.round(initialization.lifetimeAwarded ?? 0);
    this.largestAward = this.round(initialization.largestAward ?? 0);
  }

  public getSnapshot(): WalletSnapshot {
    return Object.freeze({
      bank: this.bank,
      casinoWallet: this.casinoWallet,
      transactionSequence: this.sequence,
      lifetimeWagered: this.lifetimeWagered,
      lifetimeAwarded: this.lifetimeAwarded,
      largestAward: this.largestAward,
    });
  }

  public canAfford(wager: Credits): boolean {
    this.assertWager(wager);
    return this.casinoWallet >= this.round(wager);
  }

  public placeWager(wager: Credits, options: WalletMutationOptions): WalletTransaction {
    this.assertWager(wager);
    this.assertOptions(options);
    const amount = this.round(wager);
    if (amount > this.casinoWallet) {
      throw new Error('Insufficient fictional casino-wallet balance.');
    }
    this.casinoWallet = this.round(this.casinoWallet - amount);
    this.lifetimeWagered = this.round(this.lifetimeWagered + amount);
    return this.record('wager', amount, 'casinoWallet', 'engine', options);
  }

  public award(amount: Credits, options: WalletMutationOptions): WalletTransaction {
    this.assertPositive(amount, 'Award');
    this.assertOptions(options);
    const rounded = this.round(amount);
    this.casinoWallet = this.round(this.casinoWallet + rounded);
    this.lifetimeAwarded = this.round(this.lifetimeAwarded + rounded);
    this.largestAward = Math.max(this.largestAward, rounded);
    return this.record('award', rounded, 'engine', 'casinoWallet', options);
  }

  public transferToCasinoWallet(
    amount: Credits,
    options: WalletMutationOptions,
  ): WalletTransaction {
    this.assertPositive(amount, 'Transfer');
    this.assertOptions(options);
    const rounded = this.round(amount);
    if (rounded > this.bank) throw new Error('Insufficient fictional bank balance.');
    this.bank = this.round(this.bank - rounded);
    this.casinoWallet = this.round(this.casinoWallet + rounded);
    return this.record('sessionDeposit', rounded, 'bank', 'casinoWallet', options);
  }

  public cashOutSession(options: WalletMutationOptions): WalletTransaction {
    this.assertOptions(options);
    const amount = this.casinoWallet;
    this.bank = this.round(this.bank + amount);
    this.casinoWallet = 0;
    return this.record('sessionCashOut', amount, 'casinoWallet', 'bank', options);
  }

  public getTransactions(): readonly WalletTransaction[] {
    return this.transactions.map((transaction) => Object.freeze({
      ...transaction,
      balancesAfter: Object.freeze({ ...transaction.balancesAfter }),
      metadata: Object.freeze({ ...transaction.metadata }),
    }));
  }

  private record(
    kind: WalletTransactionKind,
    amount: Credits,
    source: WalletTransaction['source'],
    destination: WalletTransaction['destination'],
    options: WalletMutationOptions,
  ): WalletTransaction {
    this.sequence += 1;
    const balancesAfter: WalletBalances = Object.freeze({
      bank: this.bank,
      casinoWallet: this.casinoWallet,
    });
    const transaction: WalletTransaction = Object.freeze({
      id: this.dependencies.createTransactionId(),
      sequence: this.sequence,
      occurredAtIso: this.dependencies.now().toISOString(),
      kind,
      amount,
      source,
      destination,
      reason: options.reason.trim(),
      balancesAfter,
      metadata: Object.freeze({ ...(options.metadata ?? {}) }),
    });
    this.transactions.push(transaction);
    return transaction;
  }

  private assertInitialization(value: WalletInitialization): void {
    assertNonNegativeCredits(value.bank, 'Initial bank balance');
    assertNonNegativeCredits(value.casinoWallet, 'Initial casino-wallet balance');
    assertNonNegativeCredits(value.lifetimeWagered ?? 0, 'Initial lifetime wagered');
    assertNonNegativeCredits(value.lifetimeAwarded ?? 0, 'Initial lifetime awarded');
    assertNonNegativeCredits(value.largestAward ?? 0, 'Initial largest award');
  }

  private assertWager(value: Credits): void {
    this.assertPositive(value, 'Wager');
    const wager = this.round(value);
    if (wager < this.moneyPolicy.minimumWager) throw new RangeError('Wager is below minimum.');
    if (wager > this.moneyPolicy.maximumWager) throw new RangeError('Wager exceeds maximum.');
  }

  private assertPositive(value: Credits, label: string): void {
    assertNonNegativeCredits(value, label);
    if (value <= 0) throw new RangeError(`${label} must be greater than zero.`);
  }

  private assertOptions(options: WalletMutationOptions): void {
    if (options.reason.trim().length === 0) {
      throw new Error('Wallet mutations require a non-empty reason.');
    }
  }

  private round(value: Credits): Credits {
    return roundCredits(value, this.moneyPolicy.decimalPlaces);
  }
}
