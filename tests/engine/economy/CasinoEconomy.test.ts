import { describe, expect, it } from "vitest";
import { cashOutCasinoWallet, freshCasinoEconomy, recordEconomyActivity, redeemCasinoTicket, withdrawFromChecking } from "../../../src/engine/economy/CasinoEconomy";

describe("CasinoEconomy", () => {
  it("moves money from checking to casino wallet and charges an ATM fee", () => {
    const result = withdrawFromChecking(freshCasinoEconomy(), 0, 20_000, 399);
    expect(result.walletUnits).toBe(20_000);
    expect(result.state.checkingUnits).toBe(79_601);
    expect(result.state.activeSession?.atmWithdrawalsUnits).toBe(20_000);
    expect(result.state.activeSession?.atmFeesUnits).toBe(399);
  });

  it("refuses an ATM withdrawal that exceeds checking", () => {
    expect(() => withdrawFromChecking(freshCasinoEconomy(), 0, 100_000, 399)).toThrow("Insufficient");
  });

  it("tracks session wagers, wins, and features", () => {
    let state = withdrawFromChecking(freshCasinoEconomy(), 0, 20_000, 399).state;
    state = recordEconomyActivity(state, 20_000, { type: "spin", game: "barber", wager: 100 });
    state = recordEconomyActivity(state, 20_250, { type: "win", game: "barber", amount: 350 });
    state = recordEconomyActivity(state, 20_250, { type: "bonus", game: "barber" });
    expect(state.activeSession?.totalWageredUnits).toBe(100);
    expect(state.activeSession?.totalWonUnits).toBe(350);
    expect(state.activeSession?.spins).toBe(1);
    expect(state.activeSession?.features).toBe(1);
  });

  it("cashes a wallet into checking exactly once", () => {
    const withdrawal = withdrawFromChecking(freshCasinoEconomy(), 0, 20_000, 399);
    const result = cashOutCasinoWallet(withdrawal.state, 25_000, "checking", new Date("2026-08-07T12:00:00Z"));
    expect(result.walletUnits).toBe(0);
    expect(result.state.checkingUnits).toBe(104_601);
    expect(result.state.activeSession).toBeNull();
    expect(result.summary?.resultUnits).toBe(4_601);
  });

  it("prints and redeems a fictional ticket only once", () => {
    const result = cashOutCasinoWallet(freshCasinoEconomy(), 12_345, "ticket", new Date("2026-08-07T12:00:00Z"));
    expect(result.ticket?.valueUnits).toBe(12_345);
    const redeemed = redeemCasinoTicket(result.state, result.ticket!.id, "savings", new Date("2026-08-07T13:00:00Z"));
    expect(redeemed.savingsUnits).toBe(12_345);
    expect(() => redeemCasinoTicket(redeemed, result.ticket!.id, "checking")).toThrow("already been redeemed");
  });
});
