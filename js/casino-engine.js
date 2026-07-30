import {ATM_FEE, MAX_ATM_WITHDRAWALS, MAX_SPIN_BET} from "./money.js";
import {settleBets, spinResult} from "./roulette.js";
import {loadState, saveState, resetState} from "./storage.js";

export class CasinoEngine {
  constructor() {
    this.state = loadState();
  }

  save() { saveState(this.state); }

  addLedger(type, amount, note) {
    this.state.ledger.unshift({
      id: crypto.randomUUID(),
      at: Date.now(),
      type,
      amount,
      bankAfter: this.state.bank,
      walletAfter: this.state.wallet,
      note
    });
    this.state.ledger = this.state.ledger.slice(0, 250);
  }

  startTrip(amount) {
    if (this.state.activeTrip) throw new Error("A casino visit is already active.");
    if (!Number.isInteger(amount) || amount < 2000 || amount > 50000) throw new Error("Trip cash must be between $20 and $500.");
    if (amount > this.state.bank) throw new Error("Your fictional bank does not have enough funds.");

    const openingTotalFunds = this.state.bank + this.state.wallet;
    this.state.bank -= amount;
    this.state.wallet = amount;
    this.state.activeTrip = {
      id: crypto.randomUUID(),
      startedAt: Date.now(),
      startingCash: amount,
      openingTotalFunds,
      atmWithdrawals: 0,
      atmFees: 0,
      atmCount: 0,
      totalWagered: 0,
      spins: 0,
      highestWallet: amount,
      lowestWallet: amount
    };
    this.state.bets = {};
    this.state.betActions = [];
    this.state.spinHistory = [];
    this.addLedger("trip_start", -amount, "Moved fictional funds from bank to casino wallet");
    this.save();
  }

  withdrawATM(amount) {
    const t = this.requireTrip();
    if (![10000,20000,30000,50000].includes(amount)) throw new Error("Invalid ATM amount.");
    if (t.atmCount >= MAX_ATM_WITHDRAWALS) throw new Error("Maximum of three ATM withdrawals per trip.");
    if (this.state.bank < amount + ATM_FEE) throw new Error("Your fictional bank cannot cover the withdrawal and $7.99 fee.");

    this.state.bank -= amount + ATM_FEE;
    this.state.wallet += amount;
    t.atmWithdrawals += amount;
    t.atmFees += ATM_FEE;
    t.atmCount += 1;
    t.highestWallet = Math.max(t.highestWallet, this.state.wallet);
    this.state.lifetime.atmFees += ATM_FEE;
    this.addLedger("atm", -(amount + ATM_FEE), `ATM withdrawal plus $7.99 fictional fee`);
    this.save();
  }

  placeBet(key, amount) {
    this.requireTrip();
    const newTotal = this.currentBetTotal() + amount;
    if (newTotal > this.state.wallet) throw new Error("Not enough in the casino wallet.");
    if (newTotal > MAX_SPIN_BET) throw new Error("The table maximum is $500 per spin.");
    this.state.bets[key] = (this.state.bets[key] || 0) + amount;
    this.state.betActions.push({key, amount});
    this.save();
  }

  undoBet() {
    const action = this.state.betActions.pop();
    if (!action) return;
    this.state.bets[action.key] -= action.amount;
    if (this.state.bets[action.key] <= 0) delete this.state.bets[action.key];
    this.save();
  }

  clearBets() {
    this.state.bets = {};
    this.state.betActions = [];
    this.save();
  }

  repeatBets() {
    const total = Object.values(this.state.previousBets).reduce((a,b)=>a+b,0);
    if (!total) throw new Error("There is no previous bet to repeat.");
    if (total > this.state.wallet) throw new Error("Not enough in the casino wallet.");
    if (total > MAX_SPIN_BET) throw new Error("The table maximum is $500 per spin.");
    this.state.bets = {...this.state.previousBets};
    this.state.betActions = Object.entries(this.state.bets).map(([key, amount]) => ({key, amount}));
    this.save();
  }

  doubleBets() {
    const total = this.currentBetTotal();
    if (!total) throw new Error("Place a bet first.");
    if (total * 2 > this.state.wallet) throw new Error("Not enough in the casino wallet to double.");
    if (total * 2 > MAX_SPIN_BET) throw new Error("Doubling would exceed the $500 table maximum.");
    for (const key of Object.keys(this.state.bets)) {
      const amount = this.state.bets[key];
      this.state.bets[key] += amount;
      this.state.betActions.push({key, amount});
    }
    this.save();
  }

  currentBetTotal() {
    return Object.values(this.state.bets).reduce((a,b)=>a+b,0);
  }

  beginSpin() {
    const t = this.requireTrip();
    const total = this.currentBetTotal();
    if (total < 100) throw new Error("The table minimum is $1.");
    if (total > this.state.wallet) throw new Error("Not enough in the casino wallet.");

    this.state.wallet -= total;
    t.totalWagered += total;
    t.spins += 1;
    this.state.lifetime.totalWagered += total;
    this.state.lifetime.spins += 1;
    this.state.previousBets = {...this.state.bets};
    this.save();
    return {result: spinResult(), total, bets: {...this.state.bets}};
  }

  finishSpin({result, total, bets}) {
    const t = this.requireTrip();
    const returned = settleBets(bets, result);
    this.state.wallet += returned;
    t.highestWallet = Math.max(t.highestWallet, this.state.wallet);
    t.lowestWallet = Math.min(t.lowestWallet, this.state.wallet);
    this.state.spinHistory.unshift(result);
    this.state.spinHistory = this.state.spinHistory.slice(0,12);
    this.state.lastResult = result;
    this.state.lastSpinNet = returned - total;
    this.state.bets = {};
    this.state.betActions = [];
    this.addLedger("roulette_spin", returned - total, `Beard Roulette result ${result}`);
    this.save();
    return {returned, net: returned - total};
  }

  endTrip() {
    const t = this.requireTrip();
    const endingCash = this.state.wallet;
    this.state.bank += endingCash;
    const totalFundsAfter = this.state.bank;
    const netResult = totalFundsAfter - t.openingTotalFunds;
    const endedAt = Date.now();

    const completed = {
      ...t,
      endedAt,
      endingCash,
      netResult,
      durationSeconds: Math.max(0, Math.floor((endedAt - t.startedAt) / 1000))
    };

    this.state.trips.unshift(completed);
    this.state.trips = this.state.trips.slice(0,100);
    this.state.lifetime.trips += 1;
    this.state.lifetime.net += netResult;
    this.state.lifetime.bestTrip = this.state.lifetime.bestTrip === null ? netResult : Math.max(this.state.lifetime.bestTrip, netResult);
    this.state.lifetime.worstTrip = this.state.lifetime.worstTrip === null ? netResult : Math.min(this.state.lifetime.worstTrip, netResult);
    this.state.wallet = 0;
    this.state.activeTrip = null;
    this.state.bets = {};
    this.state.betActions = [];
    this.addLedger("trip_end", endingCash, `Casino visit ended with net result ${netResult}`);
    this.save();
    return completed;
  }

  currentTripNet() {
    if (!this.state.activeTrip) return 0;
    return (this.state.bank + this.state.wallet) - this.state.activeTrip.openingTotalFunds;
  }

  resetAll() {
    this.state = resetState();
    this.save();
  }

  requireTrip() {
    if (!this.state.activeTrip) throw new Error("Start a casino visit first.");
    return this.state.activeTrip;
  }
}
