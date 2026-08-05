import { ReelGenerator } from "../../engine/ReelGenerator";
import type { RandomSource } from "../../engine/RandomSource";
import { WaysEvaluator } from "../../engine/WaysEvaluator";
import { beardBankConfig } from "./BeardBankConfig";
import { generateLivingVaultOutcome } from "./LivingVaultMath";

export interface BeardBankMathReport {
  readonly spins: number;
  readonly baseRtp: number;
  readonly totalRtp: number;
  readonly vaultHeistRtp: number;
  readonly freeSpinsRtp: number;
  readonly livingVaultRtp: number;
  readonly hitFrequency: number;
  readonly profitableSpinFrequency: number;
  readonly vaultHeistFrequency: number;
  readonly freeSpinsFrequency: number;
  readonly averageCoinsPerSpin: number;
  readonly estimatedLivingVaultFrequency: number;
  readonly longestLosingStreak: number;
  readonly maximumBaseWinX: number;
  readonly maximumTotalWinX: number;
  readonly averageVaultHeistX: number;
  readonly averageFreeSpinsX: number;
  readonly averageLivingVaultX: number;
  readonly winSizeBuckets: Readonly<Record<string, number>>;
}

class SeededRandomSource implements RandomSource {
  private state: number;
  public constructor(seed = 0x0bead123) { this.state = seed >>> 0; }
  public nextInt(minInclusive: number, maxInclusive: number): number {
    let value = this.state;
    value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
    this.state = value >>> 0;
    return minInclusive + Math.floor((this.state / 0x1_0000_0000) * (maxInclusive - minInclusive + 1));
  }
}

export function runBeardBankMathLab(spins = 1_000_000, seed = 0x0bead123): BeardBankMathReport {
  if (!Number.isSafeInteger(spins) || spins <= 0) throw new RangeError("Math-lab spins must be a positive integer.");
  const random = new SeededRandomSource(seed);
  const generator = new ReelGenerator(random);
  const evaluator = new WaysEvaluator();
  const wager = 10_000;
  let totalAward = 0;
  let heistAward = 0;
  let freeSpinAward = 0;
  let livingVaultAward = 0;
  let hits = 0;
  let profitable = 0;
  let heists = 0;
  let freeSpins = 0;
  let coins = 0;
  let losingStreak = 0;
  let longestLosingStreak = 0;
  let maximumBaseWinX = 0;
  let maximumTotalWinX = 0;
  let livingVaults = 0;
  let charges = 0;
  const buckets: Record<string, number> = { "under-1x": 0, "1x-5x": 0, "5x-20x": 0, "20x-100x": 0, "100x-plus": 0 };

  for (let index = 0; index < spins; index += 1) {
    const grid = generator.generate(beardBankConfig);
    const award = evaluator.evaluate(grid.matrix, beardBankConfig, wager).awardUnits;
    const visible = grid.matrix.flat();
    const spinCoins = visible.filter((symbol) => symbol === "beard-coin").length;
    const stackedDoors = grid.matrix.some((column) => column.every((symbol) => symbol === "vault-door"));
    coins += spinCoins;
    if (spinCoins >= 3) heists += 1;
    if (stackedDoors) freeSpins += 1;
    totalAward += award;
    const winX = award / wager;
    maximumBaseWinX = Math.max(maximumBaseWinX, winX);
    if (award > 0) {
      hits += 1; losingStreak = 0;
      if (winX < 1) buckets["under-1x"]! += 1;
      else if (winX < 5) buckets["1x-5x"]! += 1;
      else if (winX < 20) buckets["5x-20x"]! += 1;
      else if (winX < 100) buckets["20x-100x"]! += 1;
      else buckets["100x-plus"]! += 1;
    } else {
      losingStreak += 1;
      longestLosingStreak = Math.max(longestLosingStreak, losingStreak);
    }
    if (award >= wager) profitable += 1;

    let featureAward = 0;
    if (spinCoins >= 3) {
      const result = simulateVaultHeist(wager, spinCoins, random);
      heistAward += result; featureAward += result;
    }
    if (stackedDoors) {
      const result = simulateFreeSpins(wager, visible.filter((symbol) => symbol === "vault-door").length, random, evaluator);
      freeSpinAward += result; featureAward += result;
    }
    charges += spinCoins;
    if (charges >= 30) {
      const result = simulateLivingVault(wager, random);
      livingVaultAward += result; featureAward += result; livingVaults += 1; charges = 0;
    }
    maximumTotalWinX = Math.max(maximumTotalWinX, (award + featureAward) / wager);
  }

  return Object.freeze({
    spins,
    baseRtp: totalAward / (spins * wager),
    totalRtp: (totalAward + heistAward + freeSpinAward + livingVaultAward) / (spins * wager),
    vaultHeistRtp: heistAward / (spins * wager),
    freeSpinsRtp: freeSpinAward / (spins * wager),
    livingVaultRtp: livingVaultAward / (spins * wager),
    hitFrequency: hits / spins,
    profitableSpinFrequency: profitable / spins,
    vaultHeistFrequency: heists / spins,
    freeSpinsFrequency: freeSpins / spins,
    averageCoinsPerSpin: coins / spins,
    estimatedLivingVaultFrequency: livingVaults === 0 ? 0 : spins / livingVaults,
    longestLosingStreak,
    maximumBaseWinX,
    maximumTotalWinX,
    averageVaultHeistX: heists === 0 ? 0 : heistAward / (heists * wager),
    averageFreeSpinsX: freeSpins === 0 ? 0 : freeSpinAward / (freeSpins * wager),
    averageLivingVaultX: livingVaults === 0 ? 0 : livingVaultAward / (livingVaults * wager),
    winSizeBuckets: Object.freeze({ ...buckets }),
  });
}

function simulateVaultHeist(wager: number, triggerCoins: number, random: RandomSource): number {
  const prizes = [1, 2, 2, 3, 5, 6, 2, 3, 5, -1, -1, -1, 8, 9, 20];
  for (let index = prizes.length - 1; index > 0; index -= 1) {
    const swap = random.nextInt(0, index);
    [prizes[index], prizes[swap]] = [prizes[swap]!, prizes[index]!];
  }
  const tier = Math.max(3, Math.min(5, triggerCoins));
  const picks = tier === 3 ? 4 : tier === 4 ? 5 : 6;
  const startingMultiplier = tier >= 4 ? 2 : 1;
  let alarms = 0; let total = 0;
  for (let index = 0; index < picks && alarms < 3; index += 1) {
    const prize = prizes[index]!;
    if (prize === -1) alarms += 1;
    else if (prize === 20) { total *= 2; break; }
    else total += wager * prize;
  }
  return total * startingMultiplier;
}

function simulateFreeSpins(wager: number, triggerDoors: number, random: RandomSource, evaluator: WaysEvaluator): number {
  const generator = new ReelGenerator(random);
  let remaining = 8 + Math.max(0, triggerDoors - 3) * 2;
  let multiplier = 1; let total = 0; let safety = 0;
  while (remaining > 0 && safety < 250) {
    remaining -= 1; safety += 1;
    const grid = generator.generate(beardBankConfig);
    total += evaluator.evaluate(grid.matrix, beardBankConfig, wager).awardUnits * multiplier;
    const visible = grid.matrix.flat();
    const doors = visible.filter((symbol) => symbol === "vault-door").length;
    if (doors >= 3) remaining += doors >= 5 ? 5 : 3;
    if (visible.filter((symbol) => symbol === "vernon").length >= 2) multiplier = Math.min(10, multiplier + 1);
  }
  return total;
}

function simulateLivingVault(wager: number, random: RandomSource): number {
  return generateLivingVaultOutcome(wager, () => random.nextInt(0, 9_999) / 10_000).awardUnits;
}
