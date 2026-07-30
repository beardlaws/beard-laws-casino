const KEY = "beardLawsCasinoV02";
const OLD_KEY = "beardLawsCasinoV01";

export function defaultState() {
  return {
    schemaVersion: 2,
    bank: 200000,
    wallet: 0,
    activeTrip: null,
    selectedTripAmount: 20000,
    selectedChip: 100,
    bets: {},
    betActions: [],
    previousBets: {},
    spinHistory: [],
    lastResult: null,
    lastSpinNet: 0,
    trips: [],
    ledger: [{
      id: crypto.randomUUID(),
      at: Date.now(),
      type: "opening_balance",
      amount: 200000,
      bankAfter: 200000,
      walletAfter: 0,
      note: "Initial fictional Beard Laws Bank balance"
    }],
    lifetime: {
      totalWagered: 0,
      spins: 0,
      atmFees: 0,
      trips: 0,
      net: 0,
      bestTrip: null,
      worstTrip: null
    },
    settings: {
      reducedMotion: false
    }
  };
}

function dollarsToCents(value) {
  return Math.round(Number(value || 0) * 100);
}

function migrateV1(old) {
  const fresh = defaultState();
  fresh.bank = dollarsToCents(old.bank);
  fresh.wallet = dollarsToCents(old.wallet);
  fresh.selectedTripAmount = dollarsToCents(old.selectedTripAmount || 200);
  fresh.selectedChip = dollarsToCents(old.selectedChip || 1);
  fresh.bets = Object.fromEntries(Object.entries(old.bets || {}).map(([k,v]) => [k,dollarsToCents(v)]));
  fresh.previousBets = Object.fromEntries(Object.entries(old.previousBets || {}).map(([k,v]) => [k,dollarsToCents(v)]));
  fresh.spinHistory = old.history || [];
  fresh.lastResult = old.lastResult || null;
  fresh.lastSpinNet = dollarsToCents(old.lastSpinNet || 0);
  fresh.lifetime.totalWagered = dollarsToCents(old.lifetime?.totalWagered || 0);
  fresh.lifetime.spins = Number(old.lifetime?.spins || 0);
  fresh.lifetime.atmFees = dollarsToCents(old.lifetime?.atmFees || 0);
  fresh.lifetime.trips = Number(old.lifetime?.trips || 0);

  if (old.activeTrip) {
    const t = old.activeTrip;
    fresh.activeTrip = {
      id: crypto.randomUUID(),
      startedAt: t.startedAt || Date.now(),
      startingCash: dollarsToCents(t.startingCash),
      openingTotalFunds: dollarsToCents(t.openingBank),
      atmWithdrawals: dollarsToCents(t.atmWithdrawals),
      atmFees: dollarsToCents(t.atmFees),
      atmCount: Number(t.atmCount || 0),
      totalWagered: dollarsToCents(t.totalWagered),
      spins: Number(t.spins || 0),
      highestWallet: dollarsToCents(t.highestWallet),
      lowestWallet: dollarsToCents(t.lowestWallet)
    };
  }
  fresh.ledger.push({
    id: crypto.randomUUID(),
    at: Date.now(),
    type: "migration",
    amount: 0,
    bankAfter: fresh.bank,
    walletAfter: fresh.wallet,
    note: "Migrated Version 0.1 browser data to Version 0.2"
  });
  return fresh;
}

export function loadState() {
  try {
    const current = localStorage.getItem(KEY);
    if (current) return {...defaultState(), ...JSON.parse(current)};

    const old = localStorage.getItem(OLD_KEY);
    if (old) {
      const migrated = migrateV1(JSON.parse(old));
      saveState(migrated);
      return migrated;
    }
  } catch (error) {
    console.error("Could not load saved casino data:", error);
  }
  return defaultState();
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function resetState() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(OLD_KEY);
  return defaultState();
}
