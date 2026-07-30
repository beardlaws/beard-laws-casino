import {CasinoEngine} from "./casino-engine.js";
import {dollars, parseDollarInput} from "./money.js";
import {colorOf, secureRandomIndex} from "./roulette-engine.js";

const engine = new CasinoEngine();
let spinLocked = false;
let timer = null;
let selectedTripAmount = engine.state.selectedTripAmount || 20000;

const $ = id => document.getElementById(id);

function safe(action) {
  try { return action(); }
  catch (error) { alert(error.message || "Something went wrong."); }
}

function showModal(title, html) {
  $("modalTitle").textContent = title;
  $("modalBody").innerHTML = html;
  $("modal").showModal();
}

function closeModal() { $("modal").close(); }

function betLabel(key) {
  if (key.startsWith("number:")) return `Number ${key.split(":")[1]}`;
  return ({
    red:"Red",black:"Black",odd:"Odd",even:"Even",low:"1–18",high:"19–36",
    dozen1:"1st 12",dozen2:"2nd 12",dozen3:"3rd 12",
    column1:"1st Column",column2:"2nd Column",column3:"3rd Column"
  })[key] || key;
}

function buildBoard() {
  const board = $("rouletteBoard");
  board.innerHTML = "";

  for (const z of ["0","00"]) board.appendChild(makeCell(z, `number:${z}`, "green"));

  for (let n=1;n<=36;n++) board.appendChild(makeCell(String(n), `number:${n}`, colorOf(String(n))));

  [
    ["1st 12","dozen1","outside"],["2nd 12","dozen2","outside"],["3rd 12","dozen3","outside"],
    ["1–18","low","outside"],["Even","even","outside"],["Red","red","outside"],["Black","black","outside"],["Odd","odd","outside"],["19–36","high","outside"],
    ["1st Column","column1","column"],["2nd Column","column2","column"],["3rd Column","column3","column"]
  ].forEach(([label,key,klass]) => board.appendChild(makeCell(label,key,klass)));
}

function makeCell(label,key,klass) {
  const button = document.createElement("button");
  button.className = `bet-cell ${klass}`;
  button.dataset.bet = key;
  button.innerHTML = `<span>${label}</span>`;
  button.addEventListener("click", () => {
    if (spinLocked) return;
    safe(() => {
      engine.placeBet(key, engine.state.selectedChip);
      render();
    });
  });
  return button;
}

function renderBoardBets() {
  document.querySelectorAll("[data-bet]").forEach(cell => {
    cell.querySelector(".wager")?.remove();
    const amount = engine.state.bets[cell.dataset.bet];
    if (!amount) return;
    const marker = document.createElement("span");
    marker.className = "wager";
    marker.textContent = amount >= 10000 ? `$${amount/100}` : amount/100;
    cell.appendChild(marker);
  });
}

function render() {
  const s = engine.state;
  const active = Boolean(s.activeTrip);
  $("welcomePanel").classList.toggle("hidden", active);
  $("casinoPanel").classList.toggle("hidden", !active);
  $("bankBalance").textContent = dollars(s.bank);
  $("walletBalance").textContent = dollars(s.wallet);

  document.querySelectorAll(".chip").forEach(b => b.classList.toggle("selected", Number(b.dataset.chip) === s.selectedChip));
  document.querySelectorAll(".trip-btn[data-amount]").forEach(b => b.classList.toggle("selected", Number(b.dataset.amount) === selectedTripAmount));
  $("startTripBtn").textContent = `Start Visit With ${dollars(selectedTripAmount)}`;

  if (!active) return;

  const net = engine.currentTripNet();
  $("tripNet").textContent = dollars(net);
  $("tripNet").className = net >= 0 ? "win" : "loss";
  $("currentBet").textContent = dollars(engine.currentBetTotal());
  $("totalWagered").textContent = dollars(s.activeTrip.totalWagered);
  $("spinCount").textContent = s.activeTrip.spins;
  $("atmFees").textContent = dollars(s.activeTrip.atmFees);
  $("highestWallet").textContent = dollars(s.activeTrip.highestWallet);
  $("lastResult").textContent = s.lastResult || "—";
  $("lastSpinMessage").textContent = s.lastResult
    ? (s.lastSpinNet >= 0 ? `Won ${dollars(s.lastSpinNet)}` : `Lost ${dollars(Math.abs(s.lastSpinNet))}`)
    : "";

  $("spinHistory").innerHTML = s.spinHistory.map(r => `<span class="${colorOf(r)}">${r}</span>`).join("");
  const entries = Object.entries(s.bets);
  $("betList").innerHTML = entries.length
    ? entries.map(([k,v]) => `<div class="bet-item"><span>${betLabel(k)}</span><strong>${dollars(v)}</strong></div>`).join("")
    : `<p class="muted">No bets placed.</p>`;

  renderBoardBets();
  renderTime();
  $("spinBtn").disabled = spinLocked;
}

function renderTime() {
  if (!engine.state.activeTrip) return;
  const sec = Math.floor((Date.now() - engine.state.activeTrip.startedAt) / 1000);
  $("tripTime").textContent = `${String(Math.floor(sec/60)).padStart(2,"0")}:${String(sec%60).padStart(2,"0")}`;
}

function startTimer() {
  if (timer) clearInterval(timer);
  timer = setInterval(renderTime,1000);
  renderTime();
}

async function spin() {
  if (spinLocked) return;
  let pending;
  try { pending = engine.beginSpin(); }
  catch (error) { return alert(error.message); }

  spinLocked = true;
  render();
  const degrees = 1440 + secureRandomIndex(720);
  $("wheel").style.transform = `rotate(${degrees}deg)`;
  const delay = engine.state.settings.reducedMotion ? 300 : 2500;
  await new Promise(resolve => setTimeout(resolve,delay));
  engine.finishSpin(pending);
  spinLocked = false;
  render();
}

function showATM() {
  const t = engine.state.activeTrip;
  showModal("Casino ATM", `
    <p class="notice">Each fictional withdrawal costs $7.99. You have used ${t.atmCount} of 3 withdrawals this trip.</p>
    <div class="atm-grid">
      ${[10000,20000,30000,50000].map(a => `<button class="primary atm-choice" data-atm="${a}">Withdraw ${dollars(a)}</button>`).join("")}
    </div>
  `);
  document.querySelectorAll("[data-atm]").forEach(button => button.addEventListener("click", () => safe(() => {
    engine.withdrawATM(Number(button.dataset.atm));
    closeModal(); render();
  })));
}

function showCurrentTrip() {
  const t = engine.state.activeTrip;
  showModal("Current Casino Visit", `
    <div class="stat-row"><span>Starting cash</span><strong>${dollars(t.startingCash)}</strong></div>
    <div class="stat-row"><span>Current wallet</span><strong>${dollars(engine.state.wallet)}</strong></div>
    <div class="stat-row"><span>Current net result</span><strong class="${engine.currentTripNet() >= 0 ? "win":"loss"}">${dollars(engine.currentTripNet())}</strong></div>
    <div class="stat-row"><span>ATM withdrawals</span><strong>${dollars(t.atmWithdrawals)}</strong></div>
    <div class="stat-row"><span>ATM fees</span><strong>${dollars(t.atmFees)}</strong></div>
    <div class="stat-row"><span>Total wagered</span><strong>${dollars(t.totalWagered)}</strong></div>
    <div class="stat-row"><span>Highest wallet</span><strong>${dollars(t.highestWallet)}</strong></div>
    <div class="stat-row"><span>Lowest wallet</span><strong>${dollars(t.lowestWallet)}</strong></div>
    <div class="stat-row"><span>Roulette spins</span><strong>${t.spins}</strong></div>
  `);
}

function showHistory() {
  const trips = engine.state.trips;
  const lifetime = engine.state.lifetime;
  showModal("Casino Trip History", `
    <div class="stat-row"><span>Completed visits</span><strong>${lifetime.trips}</strong></div>
    <div class="stat-row"><span>Lifetime result</span><strong class="${lifetime.net >= 0 ? "win":"loss"}">${dollars(lifetime.net)}</strong></div>
    <div class="stat-row"><span>Total wagered</span><strong>${dollars(lifetime.totalWagered)}</strong></div>
    <div class="stat-row"><span>ATM fees paid</span><strong>${dollars(lifetime.atmFees)}</strong></div>
    <div class="divider"></div>
    ${trips.length ? trips.map((t,i) => `
      <div class="trip-card">
        <div class="trip-card-head">
          <strong>Visit #${trips.length-i}</strong>
          <strong class="${t.netResult >= 0 ? "win":"loss"}">${dollars(t.netResult)}</strong>
        </div>
        <small>${new Date(t.startedAt).toLocaleString()} · ${Math.floor(t.durationSeconds/60)} min</small>
        <div class="stat-row"><span>Started</span><span>${dollars(t.startingCash)}</span></div>
        <div class="stat-row"><span>Ended with</span><span>${dollars(t.endingCash)}</span></div>
        <div class="stat-row"><span>Wagered</span><span>${dollars(t.totalWagered)}</span></div>
      </div>`).join("") : `<p class="muted">No completed casino visits yet.</p>`}
  `);
}

function showBankLedger() {
  showModal("Beard Laws Bank Ledger", `
    <p class="notice">This audit trail records fictional balance activity in this browser.</p>
    ${engine.state.ledger.slice(0,25).map(row => `
      <div class="ledger-row">
        <div class="trip-card-head"><strong>${row.note}</strong><strong class="${row.amount >= 0 ? "win":"loss"}">${row.amount >= 0 ? "+":""}${dollars(row.amount)}</strong></div>
        <small>${new Date(row.at).toLocaleString()} · Bank ${dollars(row.bankAfter)} · Wallet ${dollars(row.walletAfter)}</small>
      </div>`).join("")}
  `);
}

function showSettings() {
  showModal("Settings", `
    <div class="settings-group">
      <label><input id="reducedMotionToggle" type="checkbox" ${engine.state.settings.reducedMotion ? "checked":""}> Use quicker, reduced-motion spins</label>
    </div>
    <div class="settings-group">
      <h3>Reset Casino</h3>
      <p class="notice">This permanently deletes the fictional bank, active visit, trip history and statistics saved in this browser.</p>
      <div class="form-row"><input id="resetConfirm" placeholder='Type RESET'><button id="resetBtn" class="secondary danger">Reset Everything</button></div>
    </div>
  `);
  $("reducedMotionToggle").addEventListener("change", e => {
    engine.state.settings.reducedMotion = e.target.checked;
    engine.save();
  });
  $("resetBtn").addEventListener("click", () => {
    if ($("resetConfirm").value !== "RESET") return alert("Type RESET exactly.");
    engine.resetAll();
    selectedTripAmount = 20000;
    closeModal();
    render();
  });
}

document.querySelectorAll(".trip-btn[data-amount]").forEach(button => button.addEventListener("click", () => {
  selectedTripAmount = Number(button.dataset.amount);
  engine.state.selectedTripAmount = selectedTripAmount;
  engine.save(); render();
}));

$("customTripBtn").addEventListener("click", () => {
  showModal("Custom Casino Cash", `
    <p class="notice">Choose between $20 and $500.</p>
    <div class="form-row"><input id="customTripInput" inputmode="decimal" placeholder="200.00"><button id="customTripSave" class="primary">Use Amount</button></div>
  `);
  $("customTripSave").addEventListener("click", () => {
    const cents = parseDollarInput($("customTripInput").value);
    if (cents === null || cents < 2000 || cents > 50000) return alert("Enter an amount from $20 to $500.");
    selectedTripAmount = cents;
    engine.state.selectedTripAmount = cents;
    engine.save(); closeModal(); render();
  });
});

$("startTripBtn").addEventListener("click", () => safe(() => {
  engine.startTrip(selectedTripAmount);
  render(); startTimer();
}));

document.querySelectorAll(".chip").forEach(button => button.addEventListener("click", () => {
  engine.state.selectedChip = Number(button.dataset.chip);
  engine.save(); render();
}));

$("spinBtn").addEventListener("click", spin);
$("undoBetBtn").addEventListener("click", () => { if (!spinLocked) { engine.undoBet(); render(); }});
$("clearBetsBtn").addEventListener("click", () => { if (!spinLocked) { engine.clearBets(); render(); }});
$("repeatBetBtn").addEventListener("click", () => safe(() => { if (!spinLocked) { engine.repeatBets(); render(); }}));
$("doubleBetBtn").addEventListener("click", () => safe(() => { if (!spinLocked) { engine.doubleBets(); render(); }}));
$("atmBtn").addEventListener("click", showATM);
$("statsBtn").addEventListener("click", showCurrentTrip);
$("historyBtn").addEventListener("click", showHistory);
$("historyWelcomeBtn").addEventListener("click", showHistory);
$("settingsBtn").addEventListener("click", showSettings);
$("settingsWelcomeBtn").addEventListener("click", showSettings);
$("bankCard").addEventListener("click", showBankLedger);
$("cashierBtn").addEventListener("click", () => {
  showModal("Cashier", `
    <p class="notice">End this casino visit and return ${dollars(engine.state.wallet)} to the fictional Beard Laws Bank?</p>
    <button id="confirmCashout" class="primary">Cash Out and End Visit</button>
  `);
  $("confirmCashout").addEventListener("click", () => {
    const trip = engine.endTrip();
    closeModal();
    showModal("Trip Complete", `
      <div class="stat-row"><span>Started with</span><strong>${dollars(trip.startingCash)}</strong></div>
      <div class="stat-row"><span>ATM withdrawals</span><strong>${dollars(trip.atmWithdrawals)}</strong></div>
      <div class="stat-row"><span>ATM fees</span><strong>${dollars(trip.atmFees)}</strong></div>
      <div class="stat-row"><span>Total wagered</span><strong>${dollars(trip.totalWagered)}</strong></div>
      <div class="stat-row"><span>Cash returned</span><strong>${dollars(trip.endingCash)}</strong></div>
      <div class="stat-row"><span>Net visit result</span><strong class="${trip.netResult >= 0 ? "win":"loss"}">${dollars(trip.netResult)}</strong></div>
    `);
    if (timer) clearInterval(timer);
    render();
  });
});
$("modalClose").addEventListener("click", closeModal);
$("modalX").addEventListener("click", closeModal);

buildBoard();
render();
if (engine.state.activeTrip) startTimer();
