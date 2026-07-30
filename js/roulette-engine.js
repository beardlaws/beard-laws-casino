export const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
export const RESULTS = ["0", "00", ...Array.from({length:36}, (_, i) => String(i + 1))];

export function colorOf(result) {
  if (result === "0" || result === "00") return "green";
  return RED_NUMBERS.has(Number(result)) ? "red" : "black";
}

// Rejection sampling avoids the tiny modulo bias produced by random % max.
export function secureRandomIndex(maxExclusive) {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) throw new Error("Invalid random range");
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
  const values = new Uint32Array(1);
  do {
    crypto.getRandomValues(values);
  } while (values[0] >= limit);
  return values[0] % maxExclusive;
}

export function spinResult() {
  return RESULTS[secureRandomIndex(RESULTS.length)];
}

export function evaluateBet(key, result) {
  const n = Number(result);
  if (key.startsWith("number:")) return result === key.split(":")[1] ? 35 : -1;
  if (result === "0" || result === "00") return -1;

  const rules = {
    red: () => colorOf(result) === "red" ? 1 : -1,
    black: () => colorOf(result) === "black" ? 1 : -1,
    odd: () => n % 2 === 1 ? 1 : -1,
    even: () => n % 2 === 0 ? 1 : -1,
    low: () => n >= 1 && n <= 18 ? 1 : -1,
    high: () => n >= 19 && n <= 36 ? 1 : -1,
    dozen1: () => n >= 1 && n <= 12 ? 2 : -1,
    dozen2: () => n >= 13 && n <= 24 ? 2 : -1,
    dozen3: () => n >= 25 && n <= 36 ? 2 : -1,
    column1: () => n % 3 === 1 ? 2 : -1,
    column2: () => n % 3 === 2 ? 2 : -1,
    column3: () => n % 3 === 0 ? 2 : -1
  };

  return rules[key] ? rules[key]() : -1;
}

export function settleBets(bets, result) {
  let returnAmount = 0;
  for (const [key, wager] of Object.entries(bets)) {
    const payoutOdds = evaluateBet(key, result);
    if (payoutOdds >= 0) returnAmount += wager * (payoutOdds + 1);
  }
  return returnAmount;
}
