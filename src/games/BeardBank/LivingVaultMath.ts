export interface LivingVaultOutcome { readonly awardUnits: number; readonly filled: boolean; readonly coins: readonly number[]; }

export function generateLivingVaultOutcome(wager: number, random: () => number): LivingVaultOutcome {
  let open = 15, lives = 3, first = true;
  const coins: number[] = [];
  while (lives > 0 && open > 0) {
    let hits = 0;
    for (let index = 0; index < open; index += 1) if (random() < (first ? .12 : .04)) hits += 1;
    for (let index = 0; index < hits; index += 1) {
      const roll = random();
      const multiple = roll < .0001 ? 100 : roll < .0011 ? 25 : roll < .0061 ? 10 : roll < .8061 ? 1 : roll < .9561 ? 2 : roll < .9937 ? 5 : 10;
      coins.push(wager * multiple);
    }
    open -= hits; first = false; lives = hits > 0 ? 3 : lives - 1;
  }
  const filled = open === 0;
  const awardUnits = coins.reduce((sum, coin) => sum + coin, 0) + (filled ? wager * 500 : 0);
  return Object.freeze({ awardUnits, filled, coins: Object.freeze(coins) });
}
