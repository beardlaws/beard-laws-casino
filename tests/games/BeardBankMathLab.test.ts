import { describe, expect, it } from "vitest";
import { runBeardBankMathLab } from "../../src/games/BeardBank/BeardBankMathLab";

describe("Beard Bank verified math", () => {
  it("keeps coins and Vernon out of ordinary 243-ways wins", () => {
    const report = runBeardBankMathLab(1_000_000);
    console.info("BEARD_BANK_MATH", JSON.stringify(report));
    expect(report.hitFrequency).toBeGreaterThanOrEqual(0.25);
    expect(report.hitFrequency).toBeLessThanOrEqual(0.32);
    expect(report.baseRtp).toBeGreaterThanOrEqual(0.65);
    expect(report.baseRtp).toBeLessThanOrEqual(0.72);
    expect(report.totalRtp).toBeGreaterThanOrEqual(0.94);
    expect(report.totalRtp).toBeLessThanOrEqual(0.97);
    expect(report.vaultHeistFrequency).toBeGreaterThanOrEqual(1 / 130);
    expect(report.vaultHeistFrequency).toBeLessThanOrEqual(1 / 70);
    expect(report.freeSpinsFrequency).toBeGreaterThanOrEqual(1 / 190);
    expect(report.freeSpinsFrequency).toBeLessThanOrEqual(1 / 90);
    expect(report.estimatedLivingVaultFrequency).toBeGreaterThanOrEqual(90);
    expect(report.estimatedLivingVaultFrequency).toBeLessThanOrEqual(140);
  }, 30_000);
});
