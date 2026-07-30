export class Wallet {
  #bank;
  #trip;
  constructor(bank=2000,trip=200){ this.#bank=bank; this.#trip=trip; }
  get snapshot(){ return {bank:this.#bank,tripWallet:this.#trip}; }
  wager(amount){ if(this.#trip<amount) throw new Error('Insufficient fictional casino wallet balance.'); this.#trip=round(this.#trip-amount); }
  credit(amount){ this.#trip=round(this.#trip+amount); }
}
const round=v=>Math.round(v*100)/100;