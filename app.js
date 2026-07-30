
const STORAGE_KEY = "beardLawsCasinoV01";

const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const ALL_RESULTS = ["0","00", ...Array.from({length:36}, (_,i) => String(i+1))];

const defaultState = {
  bank: 2000,
  wallet: 0,
  activeTrip: null,
  selectedTripAmount: 200,
  selectedChip: 1,
  bets: {},
  previousBets: {},
  history: [],
  lifetime: {
    totalWagered: 0,
    spins: 0,
    atmFees: 0,
    trips: 0
  }
};

let state = loadState();
let spinLocked = false;
let tripTimer = null;

function money(v) {
  return new Intl.NumberFormat("en-US", {style:"currency", currency:"USD"}).format(v);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    return {...structuredClone(defaultState), ...JSON.parse(raw)};
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function secureRandomIndex(max) {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] % max;
}

function colorOf(result) {
  if (result === "0" || result === "00") return "green";
  return RED_NUMBERS.has(Number(result)) ? "red" : "black";
}

function startTrip(amount) {
  if (state.activeTrip) return;
  if (amount > state.bank) return alert("Your fictional bank does not have enough funds.");
  state.bank -= amount;
  state.wallet = amount;
  state.activeTrip = {
    startedAt: Date.now(),
    startingCash: amount,
    atmWithdrawals: 0,
    atmFees: 0,
    totalWagered: 0,
    spins: 0,
    highestWallet: amount,
    lowestWallet: amount,
    openingBank: state.bank + amount
  };
  state.bets = {};
  state.history = [];
  saveState();
  render();
  startTimer();
}

function endTrip() {
  if (!state.activeTrip) return;
  const trip = state.activeTrip;
  const returned = state.wallet;
  state.bank += returned;
  const net = state.bank - trip.openingBank;
  state.lifetime.trips += 1;

  showModal("Trip Complete", `
    <div class="stat-row"><span>Started With</span><strong>${money(trip.startingCash)}</strong></div>
    <div class="stat-row"><span>ATM Withdrawals</span><strong>${money(trip.atmWithdrawals)}</strong></div>
    <div class="stat-row"><span>ATM Fees</span><strong>${money(trip.atmFees)}</strong></div>
    <div class="stat-row"><span>Total Wagered</span><strong>${money(trip.totalWagered)}</strong></div>
    <div class="stat-row"><span>Cash Returned</span><strong>${money(returned)}</strong></div>
    <div class="stat-row"><span>Net Trip Result</span><strong class="${net >= 0 ? "win":"loss"}">${money(net)}</strong></div>
  `);

  state.wallet = 0;
  state.activeTrip = null;
  state.bets = {};
  saveState();
  stopTimer();
  render();
}

function atmWithdraw(amount) {
  if (!state.activeTrip) return;
  const fee = 7.99;
  if ((state.activeTrip.atmCount || 0) >= 3) {
    return alert("Maximum of three fictional ATM withdrawals per trip.");
  }
  if (state.bank < amount + fee) {
    return alert("Your fictional bank does not have enough for that withdrawal plus the ATM fee.");
  }
  state.bank -= amount + fee;
  state.wallet += amount;
  state.activeTrip.atmWithdrawals += amount;
  state.activeTrip.atmFees += fee;
  state.activeTrip.atmCount = (state.activeTrip.atmCount || 0) + 1;
  state.activeTrip.highestWallet = Math.max(state.activeTrip.highestWallet, state.wallet);
  state.lifetime.atmFees += fee;
  saveState();
  render();
  document.getElementById("modal").close();
}

function betKeyLabel(key) {
  if (key.startsWith("number:")) return `Number ${key.split(":")[1]}`;
  const labels = {
    red:"Red", black:"Black", odd:"Odd", even:"Even",
    low:"1–18", high:"19–36",
    dozen1:"1st 12", dozen2:"2nd 12", dozen3:"3rd 12"
  };
  return labels[key] || key;
}

function placeBet(key) {
  if (!state.activeTrip || spinLocked) return;
  const chip = state.selectedChip;
  if (currentBetTotal() + chip > state.wallet) return;
  state.bets[key] = (state.bets[key] || 0) + chip;
  saveState();
  render();
}

function currentBetTotal() {
  return Object.values(state.bets).reduce((a,b) => a+b, 0);
}

function clearBets() {
  if (spinLocked) return;
  state.bets = {};
  saveState();
  render();
}

function repeatBets() {
  if (spinLocked) return;
  const total = Object.values(state.previousBets).reduce((a,b) => a+b, 0);
  if (total === 0 || total > state.wallet) return;
  state.bets = {...state.previousBets};
  saveState();
  render();
}

function evaluateBet(key, result) {
  const n = Number(result);
  if (key.startsWith("number:")) return result === key.split(":")[1] ? 35 : -1;
  if (result === "0" || result === "00") return -1;
  if (key === "red") return colorOf(result) === "red" ? 1 : -1;
  if (key === "black") return colorOf(result) === "black" ? 1 : -1;
  if (key === "odd") return n % 2 === 1 ? 1 : -1;
  if (key === "even") return n % 2 === 0 ? 1 : -1;
  if (key === "low") return n >= 1 && n <= 18 ? 1 : -1;
  if (key === "high") return n >= 19 && n <= 36 ? 1 : -1;
  if (key === "dozen1") return n >= 1 && n <= 12 ? 2 : -1;
  if (key === "dozen2") return n >= 13 && n <= 24 ? 2 : -1;
  if (key === "dozen3") return n >= 25 && n <= 36 ? 2 : -1;
  return -1;
}

async function spin() {
  if (spinLocked || !state.activeTrip) return;
  const total = currentBetTotal();
  if (total <= 0) return alert("Place at least one bet.");
  if (total > state.wallet) return alert("Not enough in the casino wallet.");

  spinLocked = true;
  state.wallet -= total;
  state.activeTrip.totalWagered += total;
  state.activeTrip.spins += 1;
  state.lifetime.totalWagered += total;
  state.lifetime.spins += 1;
  state.previousBets = {...state.bets};

  const result = ALL_RESULTS[secureRandomIndex(ALL_RESULTS.length)];
  const wheel = document.getElementById("wheel");
  const rotation = 1440 + secureRandomIndex(720);
  wheel.style.transform = `rotate(${rotation}deg)`;

  render();
  await new Promise(r => setTimeout(r, 2500));

  let returned = 0;
  for (const [key, wager] of Object.entries(state.bets)) {
    const outcome = evaluateBet(key, result);
    if (outcome >= 0) returned += wager * (outcome + 1);
  }

  state.wallet += returned;
  state.activeTrip.highestWallet = Math.max(state.activeTrip.highestWallet, state.wallet);
  state.activeTrip.lowestWallet = Math.min(state.activeTrip.lowestWallet, state.wallet);
  state.history.unshift(result);
  state.history = state.history.slice(0, 12);
  state.bets = {};
  state.lastResult = result;
  state.lastSpinNet = returned - total;
  saveState();
  spinLocked = false;
  render();
}

function buildBoard() {
  const board = document.getElementById("rouletteBoard");
  board.innerHTML = "";

  ["0","00"].forEach(z => {
    const cell = makeCell(z, `number:${z}`, "green zero");
    board.appendChild(cell);
  });

  for (let n = 1; n <= 36; n++) {
    board.appendChild(makeCell(String(n), `number:${n}`, colorOf(String(n))));
  }

  [
    ["1st 12","dozen1"],["2nd 12","dozen2"],["3rd 12","dozen3"],
    ["1–18","low"],["Even","even"],["Red","red"],["Black","black"],["Odd","odd"],["19–36","high"]
  ].forEach(([label,key]) => board.appendChild(makeCell(label,key,"outside")));
}

function makeCell(label,key,classes) {
  const div = document.createElement("button");
  div.className = `bet-cell ${classes}`;
  div.dataset.bet = key;
  div.innerHTML = `<span>${label}</span>`;
  div.addEventListener("click", () => placeBet(key));
  return div;
}

function renderBoardBets() {
  document.querySelectorAll("[data-bet]").forEach(cell => {
    const key = cell.dataset.bet;
    cell.querySelector(".wager")?.remove();
    if (state.bets[key]) {
      const marker = document.createElement("span");
      marker.className = "wager";
      marker.textContent = state.bets[key];
      cell.appendChild(marker);
    }
  });
}

function showModal(title, html) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalBody").innerHTML = html;
  document.getElementById("modal").showModal();
}

function showATM() {
  showModal("Casino ATM", `
    <p class="notice">Each fictional withdrawal carries a $7.99 ATM fee. Maximum three withdrawals per trip.</p>
    <div class="atm-grid">
      ${[100,200,300,500].map(a => `<button class="primary atm-choice" data-atm="${a}">Withdraw $${a}</button>`).join("")}
    </div>
  `);
  document.querySelectorAll("[data-atm]").forEach(btn => {
    btn.addEventListener("click", () => atmWithdraw(Number(btn.dataset.atm)));
  });
}

function showStats() {
  const t = state.activeTrip;
  if (!t) return;
  showModal("Current Trip", `
    <div class="stat-row"><span>Starting Cash</span><strong>${money(t.startingCash)}</strong></div>
    <div class="stat-row"><span>Current Wallet</span><strong>${money(state.wallet)}</strong></div>
    <div class="stat-row"><span>ATM Withdrawals</span><strong>${money(t.atmWithdrawals)}</strong></div>
    <div class="stat-row"><span>ATM Fees</span><strong>${money(t.atmFees)}</strong></div>
    <div class="stat-row"><span>Total Wagered</span><strong>${money(t.totalWagered)}</strong></div>
    <div class="stat-row"><span>Highest Wallet</span><strong>${money(t.highestWallet)}</strong></div>
    <div class="stat-row"><span>Lowest Wallet</span><strong>${money(t.lowestWallet)}</strong></div>
    <div class="stat-row"><span>Spins</span><strong>${t.spins}</strong></div>
  `);
}

function currentTripNet() {
  if (!state.activeTrip) return 0;
  return (state.bank + state.wallet) - state.activeTrip.openingBank;
}

function startTimer() {
  stopTimer();
  tripTimer = setInterval(renderTime, 1000);
  renderTime();
}
function stopTimer() {
  if (tripTimer) clearInterval(tripTimer);
  tripTimer = null;
}
function renderTime() {
  if (!state.activeTrip) return;
  const sec = Math.floor((Date.now() - state.activeTrip.startedAt) / 1000);
  const min = String(Math.floor(sec/60)).padStart(2,"0");
  const rem = String(sec%60).padStart(2,"0");
  document.getElementById("tripTime").textContent = `${min}:${rem}`;
}

function render() {
  const active = Boolean(state.activeTrip);
  document.getElementById("welcomePanel").classList.toggle("hidden", active);
  document.getElementById("casinoPanel").classList.toggle("hidden", !active);
  document.getElementById("bankBalance").textContent = money(state.bank);
  document.getElementById("walletBalance").textContent = money(state.wallet);

  if (!active) return;

  const net = currentTripNet();
  const netEl = document.getElementById("tripNet");
  netEl.textContent = money(net);
  netEl.className = net >= 0 ? "win" : "loss";

  document.getElementById("currentBet").textContent = money(currentBetTotal());
  document.getElementById("totalWagered").textContent = money(state.activeTrip.totalWagered);
  document.getElementById("spinCount").textContent = state.activeTrip.spins;
  document.getElementById("atmFees").textContent = money(state.activeTrip.atmFees);
  document.getElementById("lastResult").textContent = state.lastResult || "—";

  const history = document.getElementById("history");
  history.innerHTML = state.history.map(r => `<span class="${colorOf(r)}">${r}</span>`).join("");

  const betList = document.getElementById("betList");
  const entries = Object.entries(state.bets);
  betList.innerHTML = entries.length
    ? entries.map(([k,v]) => `<div class="bet-item"><span>${betKeyLabel(k)}</span><strong>${money(v)}</strong></div>`).join("")
    : `<p class="muted">No bets placed.</p>`;

  renderBoardBets();
  renderTime();
}

document.querySelectorAll(".trip-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".trip-btn").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    state.selectedTripAmount = Number(btn.dataset.amount);
    document.getElementById("startTripBtn").textContent = `Start Visit With $${state.selectedTripAmount}`;
    saveState();
  });
});

document.getElementById("startTripBtn").addEventListener("click", () => startTrip(state.selectedTripAmount));
document.querySelectorAll(".chip").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    state.selectedChip = Number(btn.dataset.chip);
    saveState();
  });
});
document.getElementById("spinBtn").addEventListener("click", spin);
document.getElementById("clearBetsBtn").addEventListener("click", clearBets);
document.getElementById("repeatBetBtn").addEventListener("click", repeatBets);
document.getElementById("atmBtn").addEventListener("click", showATM);
document.getElementById("statsBtn").addEventListener("click", showStats);
document.getElementById("cashierBtn").addEventListener("click", () => {
  showModal("Cashier", `
    <p class="notice">You are returning ${money(state.wallet)} to your fictional Beard Laws Bank and ending this casino visit.</p>
    <button id="confirmCashout" class="primary">Cash Out and End Visit</button>
  `);
  document.getElementById("confirmCashout").addEventListener("click", () => {
    document.getElementById("modal").close();
    endTrip();
  });
});
document.getElementById("modalClose").addEventListener("click", () => document.getElementById("modal").close());

buildBoard();
render();
if (state.activeTrip) startTimer();
