export interface WalletSnapshot {
  readonly bank: number;
  readonly tripWallet: number;
}

export class Wallet {
  private bankBalance: number;
  private tripBalance: number;

  public constructor(initialBank = 2_000, initialTripWallet = 200) {
    this.assertMoney(initialBank);
    this.assertMoney(initialTripWallet);
    this.bankBalance = initialBank;
    this.tripBalance = initialTripWallet;
  }

  public get snapshot(): WalletSnapshot {
    return {
      bank: this.bankBalance,
      tripWallet: this.tripBalance,
    };
  }

  public canWager(amount: number): boolean {
    this.assertMoney(amount);
    return this.tripBalance >= amount;
  }

  public wager(amount: number): void {
    this.assertMoney(amount);
    if (!this.canWager(amount)) {
      throw new Error('Insufficient fictional casino wallet balance.');
    }
    this.tripBalance = this.round(this.tripBalance - amount);
  }

  public credit(amount: number): void {
    this.assertMoney(amount);
    this.tripBalance = this.round(this.tripBalance + amount);
  }

  public cashOut(): void {
    this.bankBalance = this.round(this.bankBalance + this.tripBalance);
    this.tripBalance = 0;
  }

  private assertMoney(amount: number): void {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new RangeError('Money values must be finite and non-negative.');
    }
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
