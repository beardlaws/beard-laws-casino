import type {
  WalletBalances,
  WalletInitialization,
  WalletMutationOptions,
  WalletPort,
  WalletSnapshot,
  WalletTransaction,
  WalletTransactionKind,
} from './contracts/WalletContracts';
import {
  assertCreditUnits,
  DEFAULT_MONEY_POLICY,
  type CreditUnits,
  type MoneyPolicy,
} from '../types/Money';

export interface WalletManagerDependencies {
  readonly createTransactionId: () => string;
  readonly now: () => Date;
  readonly moneyPolicy?: MoneyPolicy;
}

/**
 * Owns fictional bank and casino-wallet state.
 *
 * The wallet has no dependency on PixiJS, the DOM, reel math, game
 * configurations, or feature modules. Every mutation creates an immutable
 * ledger entry.
 */
export class WalletManager implements WalletPort {
  private bankUnits: CreditUnits;
  private casinoWalletUnits: CreditUnits;
  private lifetimeWageredUnits: CreditUnits;
  private lifetimeAwardedUnits: CreditUnits;
  private largestAwardUnits: CreditUnits;
  private sequence = 0;

  private readonly transactions: WalletTransaction[] = [];
  private readonly moneyPolicy: MoneyPolicy;

  public constructor(
    initialization: WalletInitialization,
    private readonly dependencies: WalletManagerDependencies,
  ) {
    this.moneyPolicy = dependencies.moneyPolicy ?? DEFAULT_MONEY_POLICY;
    this.assertPolicy(this.moneyPolicy);
    this.assertInitialization(initialization);

    this.bankUnits = initialization.bankUnits;
    this.casinoWalletUnits = initialization.casinoWalletUnits;
    this.lifetimeWageredUnits = initialization.lifetimeWageredUnits ?? 0;
    this.lifetimeAwardedUnits = initialization.lifetimeAwardedUnits ?? 0;
    this.largestAwardUnits = initialization.largestAwardUnits ?? 0;
  }

  public getSnapshot(): WalletSnapshot {
    return Object.freeze({
      bankUnits: this.bankUnits,
      casinoWalletUnits: this.casinoWalletUnits,
      transactionSequence: this.sequence,
      lifetimeWageredUnits: this.lifetimeWageredUnits,
      lifetimeAwardedUnits: this.lifetimeAwardedUnits,
      largestAwardUnits: this.largestAwardUnits,
    });
  }

  public canAfford(wagerUnits: CreditUnits): boolean {
    this.assertWager(wagerUnits);
    return this.casinoWalletUnits >= wagerUnits;
  }

  public placeWager(
    wagerUnits: CreditUnits,
    options: WalletMutationOptions,
  ): WalletTransaction {
    this.assertWager(wagerUnits);
    this.assertOptions(options);

    if (wagerUnits > this.casinoWalletUnits) {
      throw new Error('Insufficient fictional casino-wallet balance.');
    }

    this.casinoWalletUnits -= wagerUnits;
    this.lifetimeWageredUnits += wagerUnits;

    return this.record(
      'wager',
      wagerUnits,
      'casinoWallet',
      'engine',
      options,
    );
  }

  public award(
    amountUnits: CreditUnits,
    options: WalletMutationOptions,
  ): WalletTransaction {
    this.assertPositive(amountUnits, 'Award');
    this.assertOptions(options);

    this.casinoWalletUnits += amountUnits;
    this.lifetimeAwardedUnits += amountUnits;
    this.largestAwardUnits = Math.max(this.largestAwardUnits, amountUnits);

    return this.record(
      'award',
      amountUnits,
      'engine',
      'casinoWallet',
      options,
    );
  }

  public transferToCasinoWallet(
    amountUnits: CreditUnits,
    options: WalletMutationOptions,
  ): WalletTransaction {
    this.assertPositive(amountUnits, 'Transfer');
    this.assertOptions(options);

    if (amountUnits > this.bankUnits) {
      throw new Error('Insufficient fictional bank balance.');
    }

    this.bankUnits -= amountUnits;
    this.casinoWalletUnits += amountUnits;

    return this.record(
      'sessionDeposit',
      amountUnits,
      'bank',
      'casinoWallet',
      options,
    );
  }

  public cashOutSession(
    options: WalletMutationOptions,
  ): WalletTransaction {
    this.assertOptions(options);

    const amountUnits = this.casinoWalletUnits;
    this.bankUnits += amountUnits;
    this.casinoWalletUnits = 0;

    return this.record(
      'sessionCashOut',
      amountUnits,
      'casinoWallet',
      'bank',
      options,
    );
  }

  public getTransactions(): readonly WalletTransaction[] {
    return this.transactions.map((transaction) =>
      Object.freeze({
        ...transaction,
        balancesAfter: Object.freeze({ ...transaction.balancesAfter }),
        metadata: Object.freeze({ ...transaction.metadata }),
      }),
    );
  }

  private record(
    kind: WalletTransactionKind,
    amountUnits: CreditUnits,
    source: WalletTransaction['source'],
    destination: WalletTransaction['destination'],
    options: WalletMutationOptions,
  ): WalletTransaction {
    this.sequence += 1;

    const balancesAfter: WalletBalances = Object.freeze({
      bankUnits: this.bankUnits,
      casinoWalletUnits: this.casinoWalletUnits,
    });

    const transaction: WalletTransaction = Object.freeze({
      id: this.dependencies.createTransactionId(),
      sequence: this.sequence,
      occurredAtIso: this.dependencies.now().toISOString(),
      kind,
      amountUnits,
      source,
      destination,
      reason: options.reason.trim(),
      balancesAfter,
      metadata: Object.freeze({ ...(options.metadata ?? {}) }),
    });

    this.transactions.push(transaction);
    return transaction;
  }

  private assertInitialization(initialization: WalletInitialization): void {
    assertCreditUnits(initialization.bankUnits, 'Initial bank balance');
    assertCreditUnits(
      initialization.casinoWalletUnits,
      'Initial casino-wallet balance',
    );
    assertCreditUnits(
      initialization.lifetimeWageredUnits ?? 0,
      'Initial lifetime wagered',
    );
    assertCreditUnits(
      initialization.lifetimeAwardedUnits ?? 0,
      'Initial lifetime awarded',
    );
    assertCreditUnits(
      initialization.largestAwardUnits ?? 0,
      'Initial largest award',
    );
  }

  private assertPolicy(policy: MoneyPolicy): void {
    this.assertPositive(policy.minimumWagerUnits, 'Minimum wager');
    this.assertPositive(policy.maximumWagerUnits, 'Maximum wager');

    if (policy.minimumWagerUnits > policy.maximumWagerUnits) {
      throw new RangeError('Minimum wager cannot exceed maximum wager.');
    }
  }

  private assertWager(wagerUnits: CreditUnits): void {
    this.assertPositive(wagerUnits, 'Wager');

    if (wagerUnits < this.moneyPolicy.minimumWagerUnits) {
      throw new RangeError(
        `Wager must be at least ${this.moneyPolicy.minimumWagerUnits} units.`,
      );
    }

    if (wagerUnits > this.moneyPolicy.maximumWagerUnits) {
      throw new RangeError(
        `Wager cannot exceed ${this.moneyPolicy.maximumWagerUnits} units.`,
      );
    }
  }

  private assertPositive(value: CreditUnits, label: string): void {
    assertCreditUnits(value, label);

    if (value === 0) {
      throw new RangeError(`${label} must be greater than zero.`);
    }
  }

  private assertOptions(options: WalletMutationOptions): void {
    if (options.reason.trim().length === 0) {
      throw new Error('Wallet mutations require a non-empty reason.');
    }
  }
}
