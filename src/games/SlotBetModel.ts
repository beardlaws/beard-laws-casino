export const SLOT_DENOMINATIONS = [1, 2, 5, 10] as const;
export const SLOT_CREDIT_LEVELS = [50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2500] as const;
export const MAX_SLOT_WAGER_UNITS = 25_000;

export class SlotBetModel {
  private denominationIndex = 0;
  private creditIndex = 2;

  public get denominationUnits(): number { return SLOT_DENOMINATIONS[this.denominationIndex]!; }
  public get credits(): number { return SLOT_CREDIT_LEVELS[this.creditIndex]!; }
  public get wagerUnits(): number { return this.denominationUnits * this.credits; }

  public changeDenomination(direction: number): void {
    this.denominationIndex = Math.max(0, Math.min(SLOT_DENOMINATIONS.length - 1, this.denominationIndex + direction));
    this.clampCredits();
  }

  public changeCredits(direction: number): void {
    const valid = SLOT_CREDIT_LEVELS.filter((credits) => credits * this.denominationUnits <= MAX_SLOT_WAGER_UNITS);
    const current = valid.indexOf(this.credits as (typeof valid)[number]);
    const next = Math.max(0, Math.min(valid.length - 1, (current < 0 ? 0 : current) + direction));
    this.creditIndex = SLOT_CREDIT_LEVELS.indexOf(valid[next]!);
  }

  private clampCredits(): void {
    while (this.wagerUnits > MAX_SLOT_WAGER_UNITS && this.creditIndex > 0) this.creditIndex -= 1;
  }
}

export const denominationMarkup = (prefix: string): string => `<div class="slot-denom" aria-label="Denomination selector"><button data-${prefix}-denom-down aria-label="Lower denomination">−</button><span><small>DENOM</small><b data-${prefix}-denom>1¢</b></span><button data-${prefix}-denom-up aria-label="Raise denomination">+</button></div>`;
