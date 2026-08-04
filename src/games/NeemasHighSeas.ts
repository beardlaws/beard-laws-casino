type AutoCount = number | "infinite" | null;
type VoyageRoute = "party" | "casino" | "mystery";
import type { CasinoActivity } from "../state/CasinoProgression";

interface SeaSymbol {
  readonly id: string;
  readonly art: string;
  readonly label: string;
  readonly weight: number;
  readonly pay: readonly [number, number, number];
}
const art = (name: string): string =>
  new URL(`../../assets/neema/${name}.png`, import.meta.url).href;

const SYMBOLS: readonly SeaSymbol[] = [
  {
    id: "cranberry",
    art: art("cocktail"),
    label: "HAPPY HOUR",
    weight: 18,
    pay: [2, 5, 12],
  },
  {
    id: "mac",
    art: art("mac"),
    label: "MAC ATTACK",
    weight: 18,
    pay: [2, 4, 10],
  },
  {
    id: "luggage",
    art: art("luggage"),
    label: "LUGGAGE",
    weight: 17,
    pay: [1, 4, 8],
  },
  {
    id: "helmet",
    art: art("helmet"),
    label: "BUFFALO",
    weight: 14,
    pay: [3, 7, 16],
  },
  {
    id: "wheel",
    art: art("wheel"),
    label: "SHIP WHEEL",
    weight: 12,
    pay: [4, 10, 24],
  },
  {
    id: "captain",
    art: art("captain-neema-v2"),
    label: "CAPTAIN NEEMA",
    weight: 8,
    pay: [7, 18, 45],
  },
  {
    id: "wild",
    art: art("sunset"),
    label: "SUNSET WILD",
    weight: 7,
    pay: [8, 22, 60],
  },
  {
    id: "ticket",
    art: art("ticket"),
    label: "CRUISE TICKET",
    weight: 2.5,
    pay: [0, 0, 0],
  },
];
const REELS = 5;
const ROWS = 3;
const DEPARTURE_TARGET = 50;
const HAPPY_HOUR_TRIGGER = 3;
const BET_LEVELS = [50, 100, 200, 300, 500] as const;
const LINES = [
  [0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
] as const;
const CABINS = [
  "INTERIOR CABIN",
  "OCEAN VIEW",
  "BALCONY",
  "LUXURY SUITE",
  "CAPTAIN'S DECK",
] as const;

export class NeemasHighSeas {
  private auto: AutoCount = null;
  private stopRequested = false;
  private spinning = false;
  private freeSpins = 0;
  private cabin = 0;
  private bonusMultiplier = 1;
  private bonusWin = 0;
  private lastDisplayedWin = 0;
  private betIndex = 1;
  private route: VoyageRoute | null = null;
  private voyageStops = 0;
  private departureMiles = this.readProgress("neema-departure", 0);
  private get betUnits(): number {
    return BET_LEVELS[this.betIndex]!;
  }

  public constructor(
    private readonly root: HTMLElement,
    private readonly getWallet: () => number,
    private readonly setWallet: (units: number) => void,
    private readonly onExit: () => void,
    private readonly onActivity: (activity: CasinoActivity) => void = () => {},
  ) {}

  public open(): void {
    this.root.innerHTML = `<main class="neema-room">
      <button class="back" data-neema-home>← CASINO LOBBY</button><div class="table-wallet">WALLET <b data-neema-wallet></b></div>
      <header><small>BEARD LAWS CASINO PRESENTS • PREMIER FEATURE SLOT</small><h1>NEEMA'S HIGH SEAS HAPPY HOUR</h1><p>Cruise luxury, football Sundays, comfort food, and absolutely no sensible last call.</p><button class="game-rules" data-neema-rules>RULES &amp; PAYTABLE</button></header>
      <section class="neema-machine"><div class="ocean-lights"></div><div class="neema-marquee"><span>FROZEN CASH RESPINS</span><strong>CAPTAIN NEEMA'S PREMIER VOYAGE</strong><span>LAST CALL FINALE</span></div><div class="departure-meter"><span><b data-departure-label>DEPARTURE 0 / ${DEPARTURE_TARGET}</b><small>3 TICKETS LAUNCH FROZEN HAPPY HOUR + THE VOYAGE</small></span><i><em data-departure-fill></em></i></div><div class="voyage-map"><i data-port="0">SAIL AWAY</i><i data-port="1">PARTY COVE</i><i data-port="2">GOLDEN PORT</i><i data-port="3">MYSTERY ISLE</i><i data-port="4">LAST CALL</i></div><div class="cabin-track">${CABINS.map((name, i) => `<span data-cabin="${i}">${name}</span>`).join("")}</div>
        <div class="neema-message" data-neema-message>WELCOME ABOARD</div><div class="slot-win-callout neema-win-callout" data-neema-callout hidden></div><div class="feature-readout" data-neema-feature hidden><b data-neema-freespins></b><span data-neema-multiplier></span></div><div class="neema-reels" data-neema-reels></div>
        <div class="neema-feature-bar"><span>6+ DRINKS HOLD &amp; RESPIN</span><span>FILL 20 FOR GRAND</span><span>VOYAGE + LAST CALL</span></div>
        <div class="neema-controls"><div><small>CREDIT</small><b data-neema-credit></b></div><div class="bet-selector"><button data-neema-bet-down aria-label="Decrease bet">−</button><span><small>BET</small><b data-neema-bet>$1.00</b></span><button data-neema-bet-up aria-label="Increase bet">+</button></div><div><small>WIN</small><b data-neema-win>$0.00</b></div>
          <button data-neema-auto>AUTO</button><button class="neema-spin" data-neema-spin>SPIN</button></div>
        <div class="neema-auto-menu" data-neema-menu hidden>${[5, 10, 25, 50].map((n) => `<button data-auto="${n}">${n}</button>`).join("")}<button data-auto="infinite">∞</button></div>
      </section><p class="neema-disclaimer">Fictional credits only • Three Cruise Tickets sail immediately; the Departure meter guarantees a voyage • Cabin upgrades increase the multiplier</p>
    </main>`;
    this.root
      .querySelector("[data-neema-home]")
      ?.addEventListener("click", () => this.onExit());
    this.root
      .querySelector("[data-neema-rules]")
      ?.addEventListener("click", () => this.showRules());
    this.root
      .querySelector("[data-neema-spin]")
      ?.addEventListener("click", () => {
        void this.spin();
      });
    this.root
      .querySelector("[data-neema-auto]")
      ?.addEventListener("click", () => this.toggleAuto());
    this.root
      .querySelector("[data-neema-bet-down]")
      ?.addEventListener("click", () => this.changeBet(-1));
    this.root
      .querySelector("[data-neema-bet-up]")
      ?.addEventListener("click", () => this.changeBet(1));
    this.root
      .querySelectorAll<HTMLElement>("[data-auto]")
      .forEach((button) =>
        button.addEventListener("click", () =>
          this.startAuto(
            button.dataset.auto === "infinite"
              ? "infinite"
              : Number(button.dataset.auto),
          ),
        ),
      );
    void this.preloadArt().finally(() => {
      this.renderGrid(this.makeGrid());
      this.update();
    });
  }

  private async preloadArt(): Promise<void> {
    await Promise.all(
      SYMBOLS.map(
        (symbol) =>
          new Promise<void>((resolve) => {
            const image = new Image();
            image.onload = () => resolve();
            image.onerror = () => resolve();
            image.src = symbol.art;
          }),
      ),
    );
  }

  private pick(): SeaSymbol {
    let roll =
      Math.random() * SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
    for (const symbol of SYMBOLS) {
      roll -= symbol.weight;
      if (roll < 0) return symbol;
    }
    return SYMBOLS[0]!;
  }
  private makeGrid(): SeaSymbol[][] {
    return Array.from({ length: REELS }, () =>
      Array.from({ length: ROWS }, () => this.pick()),
    );
  }
  private renderGrid(grid: SeaSymbol[][], winners = new Set<string>()): void {
    const host = this.root.querySelector<HTMLElement>("[data-neema-reels]")!;
    host.classList.toggle("has-win", winners.size > 0);
    host.innerHTML = grid
      .flatMap((reel, reelIndex) =>
        reel.map(
          (symbol, row) =>
            `<div class="sea-symbol s-${symbol.id}${winners.has(`${reelIndex}:${row}`) ? " winner" : ""}" style="grid-column:${reelIndex + 1};grid-row:${row + 1};--reel:${reelIndex}" title="${symbol.label}"><span>${symbol.label}</span><img src="${symbol.art}" alt="${symbol.label}" draggable="false" onload="this.parentElement.classList.add('art-ready')" onerror="this.hidden=true;this.parentElement.classList.add('art-failed')"><small>${symbol.label}</small></div>`,
        ),
      )
      .join("");
  }
  private evaluate(grid: SeaSymbol[][]): {
    award: number;
    winners: Set<string>;
    summary: string;
  } {
    let totalX = 0;
    const winners = new Set<string>();
    const hits: string[] = [];
    for (const [lineIndex, line] of LINES.entries()) {
      const first = grid[0]![line[0]]!;
      const base =
        first.id === "wild"
          ? (grid
              .slice(1)
              .map((reel, index) => reel[line[index + 1]!]!)
              .find((s) => s.id !== "wild" && s.id !== "ticket") ?? first)
          : first;
      if (base.id === "ticket") continue;
      let length = 0;
      for (let reel = 0; reel < REELS; reel += 1) {
        const symbol = grid[reel]![line[reel]!]!;
        if (symbol.id === base.id || symbol.id === "wild") length += 1;
        else break;
      }
      if (length >= 3) {
        totalX += base.pay[length - 3] ?? 0;
        hits.push(`LINE ${lineIndex + 1} • ${length} ${base.label}`);
        for (let reel = 0; reel < length; reel += 1)
          winners.add(`${reel}:${line[reel]}`);
      }
    }
    // Five displayed lines share one $1 wager. The early-access base game is
    // intentionally conservative so the upgrade/free-spin economy has room.
    return {
      award: Math.round(totalX * this.betUnits * 0.59),
      winners,
      summary: hits.join("  +  "),
    };
  }
  private async spin(): Promise<boolean> {
    if (this.spinning) return false;
    const free = this.freeSpins > 0;
    if (!free && this.getWallet() < this.betUnits) {
      this.message("VISIT THE ATM");
      this.stopAuto();
      return false;
    }
    this.spinning = true;
    this.onActivity({ type: "spin", game: "neema" });
    if (!free) this.setWallet(this.getWallet() - this.betUnits);
    else this.freeSpins -= 1;
    this.message(free ? `FREE SPIN • ${this.freeSpins} REMAIN` : "SAILING...");
    this.update();
    const reels = this.root.querySelector<HTMLElement>("[data-neema-reels]")!;
    reels.classList.remove("has-win");
    reels.classList.add("spinning");
    for (let frame = 0; frame < 10; frame += 1) {
      this.renderGrid(this.makeGrid());
      await this.wait(72 + frame * 15);
    }
    const grid = this.makeGrid();
    for (let stopped = 0; stopped < REELS; stopped += 1) {
      this.renderGrid(grid);
      reels.dataset.stopped = String(stopped + 1);
      await this.wait(115 + stopped * 32);
    }
    reels.classList.remove("spinning");
    delete reels.dataset.stopped;
    const result = this.evaluate(grid);
    let award = result.award;
    const tickets = grid.flat().filter((s) => s.id === "ticket").length;
    const captains = grid.flat().filter((s) => s.id === "captain").length;
    if (free) {
      const routeBoost = this.route === "casino" ? 1.35 : this.route === "mystery" && Math.random() < .3 ? 2 : 1;
      award = Math.round(award * this.bonusMultiplier * routeBoost);
      if (captains > 0) {
        this.voyageStops = Math.min(4, this.voyageStops + captains);
        this.onActivity({ type: "voyage", game: "neema", value: this.voyageStops });
        if (this.voyageStops === 2) { this.freeSpins += 2; this.message("GOLDEN PORT • +2 FREE SPINS"); }
        if (this.voyageStops === 3) { this.bonusMultiplier += 1; this.message("MYSTERY ISLE • MULTIPLIER UPGRADE"); }
      }
      if (this.freeSpins > 0 && this.freeSpins % 2 === 0) {
        this.cabin = Math.min(4, this.cabin + 1);
        this.bonusMultiplier = 1 + this.cabin;
        this.message(
          `UPGRADED TO ${CABINS[this.cabin]} • ${this.bonusMultiplier}×`,
        );
      }
      this.bonusWin += award;
    }
    if (!free) {
      this.departureMiles = Math.min(DEPARTURE_TARGET, this.departureMiles + 1 + tickets);
      this.writeProgress("neema-departure", this.departureMiles);
    }
    const guaranteedDeparture = !free && this.departureMiles >= DEPARTURE_TARGET;
    if (tickets >= HAPPY_HOUR_TRIGGER || guaranteedDeparture) {
      const retrigger = free;
      if (!retrigger) {
        this.departureMiles = 0;
        this.writeProgress("neema-departure", 0);
      }
      if (!retrigger) this.route = await this.chooseVoyageRoute();
      if (!retrigger) {
        const happyHourAward = await this.playFrozenHappyHour(Math.max(6, tickets + 3));
        award += happyHourAward;
        this.bonusWin += happyHourAward;
      }
      this.freeSpins += retrigger ? 5 : this.route === "party" ? 14 : 10;
      this.cabin = Math.min(4, this.cabin + 1);
      this.bonusMultiplier = 1 + this.cabin;
      this.message(
        retrigger
          ? "CRUISE TICKET RETRIGGER • +5 SPINS"
          : guaranteedDeparture
            ? "CAPTAIN'S INVITATION • GUARANTEED VOYAGE"
            : "ALL ABOARD • 10 FREE SPINS",
      );
      await this.showVoyageIntro(retrigger);
      this.onActivity({ type: "bonus", game: "neema" });
    } else if (award > 0)
      this.message(
        award >= this.betUnits * 10 ? "SUITE-SIZED WIN!" : "CHEERS, NEEMA!",
      );
    else if (free && this.freeSpins === 0) {
      const lastCall = await this.playLastCall();
      award += lastCall;
      this.message(`LAST CALL FINALE • +$${(lastCall / 100).toFixed(2)}`);
      this.cabin = 0;
      this.bonusMultiplier = 1;
      this.bonusWin = 0;
      this.route = null;
      this.voyageStops = 0;
    } else this.message(free ? "THE ENCORE CONTINUES" : "WELCOME ABOARD");
    this.renderGrid(grid, result.winners);
    const callout = this.root.querySelector<HTMLElement>(
      "[data-neema-callout]",
    )!;
    callout.hidden = award <= 0;
    callout.textContent =
      award > 0
        ? `${result.summary || "VOYAGE WIN"}  •  $${(award / 100).toFixed(2)}`
        : "";
    if (award > 0) {
      this.setWallet(this.getWallet() + award);
      await this.animateWin(award);
      await this.showWinTier(award);
      this.onActivity({ type: "win", game: "neema", amount: award, value: award / this.betUnits });
    }
    this.spinning = false;
    this.update();
    return tickets >= 3 || guaranteedDeparture;
  }
  private toggleAuto(): void {
    if (this.auto !== null) {
      this.stopRequested = true;
      this.message("AUTO STOPS AFTER THIS SPIN");
      return;
    }
    const menu = this.root.querySelector<HTMLElement>("[data-neema-menu]")!;
    menu.hidden = !menu.hidden;
  }
  private startAuto(count: Exclude<AutoCount, null>): void {
    if (this.spinning) return;
    this.auto = count;
    this.stopRequested = false;
    this.root.querySelector<HTMLElement>("[data-neema-menu]")!.hidden = true;
    void this.runAuto();
  }
  private async runAuto(): Promise<void> {
    while (this.auto !== null && !this.stopRequested) {
      const feature = await this.spin();
      if (this.auto === null) return;
      if (this.auto !== "infinite") {
        this.auto -= 1;
        if (this.auto <= 0) {
          this.stopAuto();
          return;
        }
      }
      if (feature) {
        this.stopAuto();
        return;
      }
      this.update();
      await new Promise<void>((r) => window.setTimeout(r, 400));
    }
    this.stopAuto();
  }
  private stopAuto(): void {
    this.auto = null;
    this.stopRequested = false;
    this.update();
  }
  private message(text: string): void {
    const node = this.root.querySelector<HTMLElement>("[data-neema-message]");
    if (node) node.textContent = text;
  }
  private changeBet(direction: number): void {
    if (this.spinning || this.freeSpins > 0) return;
    this.betIndex = Math.max(
      0,
      Math.min(BET_LEVELS.length - 1, this.betIndex + direction),
    );
    this.lastDisplayedWin = 0;
    this.update();
  }
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }
  private async animateWin(target: number): Promise<void> {
    const node = this.root.querySelector<HTMLElement>("[data-neema-win]")!;
    const began = performance.now();
    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const p = Math.min(1, (now - began) / 700);
        const value = Math.round(
          this.lastDisplayedWin +
            (target - this.lastDisplayedWin) * (1 - Math.pow(1 - p, 3)),
        );
        node.textContent = `$${(value / 100).toFixed(2)}`;
        if (p < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    this.lastDisplayedWin = target;
  }
  private async showVoyageIntro(retrigger: boolean): Promise<void> {
    const overlay = document.createElement("div");
    overlay.className = "feature-cinematic sea-cinematic";
    overlay.innerHTML = `<div class="sea-ship">🚢</div><small>${retrigger ? "THE PARTY CONTINUES" : `${(this.route ?? "premier").toUpperCase()} ROUTE`}</small><h2>${retrigger ? "RETRIGGER!" : "ALL ABOARD"}</h2><p>${retrigger ? "5 MORE FREE SPINS" : `${this.freeSpins} FREE SPINS • ${this.bonusMultiplier}× STARTING MULTIPLIER`}</p><div class="voyage-route">${CABINS.map((c, i) => `<span class="${i <= this.cabin ? "reached" : ""}">${c}</span>`).join("")}</div></div>`;
    this.root.appendChild(overlay);
    await this.wait(2200);
    overlay.classList.add("leaving");
    await this.wait(420);
    overlay.remove();
  }
  private async playFrozenHappyHour(startingDrinks = 6): Promise<number> {
    type Drink = { value: number; kind: "cash" | "vodka" | "ice" | "cranberry" | "neema" | "bell" | "wheel" | "jackpot" };
    const savedKey = "beard-laws-neema-frozen-happy-hour";
    const board: Array<Drink | null> = Array(20).fill(null);
    let respins = 3;
    let total = 0;
    if (typeof localStorage !== "undefined") {
      try {
        const saved = JSON.parse(localStorage.getItem(savedKey) ?? "null") as { board?: Array<Drink | null>; respins?: number; total?: number } | null;
        if (saved?.board?.length === 20) saved.board.forEach((drink, index) => { board[index] = drink; });
        if (typeof saved?.respins === "number") respins = saved.respins;
        if (typeof saved?.total === "number") total = saved.total;
      } catch { localStorage.removeItem(savedKey); }
    }
    const overlay = document.createElement("div");
    overlay.className = "feature-cinematic frozen-happy-hour";
    overlay.innerHTML = `<small>NEEMA'S HIGH SEAS</small><h2>FROZEN HAPPY HOUR</h2><p data-frozen-status>LOCK THE DRINKS • NEW DRINKS RESET 3 RESPINS</p><div class="frozen-hud"><b data-frozen-respins>RESPINS ● ● ●</b><b data-frozen-win>$0.00</b></div><div class="frozen-board" data-frozen-board></div><button class="frozen-go" data-frozen-go>POUR THE NEXT ROUND</button>`;
    this.root.appendChild(overlay);
    const host = overlay.querySelector<HTMLElement>("[data-frozen-board]")!;
    const status = overlay.querySelector<HTMLElement>("[data-frozen-status]")!;
    const respinNode = overlay.querySelector<HTMLElement>("[data-frozen-respins]")!;
    const winNode = overlay.querySelector<HTMLElement>("[data-frozen-win]")!;
    const go = overlay.querySelector<HTMLButtonElement>("[data-frozen-go]")!;
    const render = (): void => {
      host.innerHTML = board.map((drink) => drink ? `<div class="frozen-drink kind-${drink.kind}"><i>${drink.kind === "vodka" ? "🍾" : drink.kind === "ice" ? "🧊" : drink.kind === "cranberry" ? "💦" : drink.kind === "neema" ? "👩‍✈️" : drink.kind === "bell" ? "🔔" : drink.kind === "wheel" ? "⚓" : drink.kind === "jackpot" ? "★" : "🍹"}</i><b>${drink.kind === "jackpot" ? "MINI" : `$${(drink.value / 100).toFixed(2)}`}</b><small>${drink.kind.toUpperCase()}</small></div>` : `<div class="frozen-empty">+</div>`).join("");
      respinNode.textContent = `RESPINS ${"● ".repeat(respins)}${"○ ".repeat(3 - respins)}`;
      winNode.textContent = `$${(total / 100).toFixed(2)}`;
      if (typeof localStorage !== "undefined") localStorage.setItem(savedKey, JSON.stringify({ board, respins, total }));
    };
    const makeDrink = (): Drink => {
      const roll = Math.random();
      const multiple = roll < .56 ? 1 : roll < .78 ? 2 : roll < .9 ? 3 : roll < .965 ? 5 : 10;
      const kind: Drink["kind"] = roll < .62 ? "cash" : roll < .7 ? "ice" : roll < .77 ? "cranberry" : roll < .83 ? "vodka" : roll < .88 ? "neema" : roll < .93 ? "bell" : roll < .98 ? "wheel" : "jackpot";
      return { kind, value: this.betUnits * (kind === "jackpot" ? 10 : multiple) };
    };
    const emptyIndices = (): number[] => board.map((v, i) => v ? -1 : i).filter((i) => i >= 0);
    for (let i = board.filter(Boolean).length; i < Math.min(startingDrinks, 20); i += 1) {
      const empty = emptyIndices(); const at = empty[Math.floor(Math.random() * empty.length)]!;
      const drink = makeDrink(); board[at] = drink; total += drink.value;
    }
    render();
    await new Promise<void>((resolve) => go.addEventListener("click", async () => {
      go.disabled = true;
      while (respins > 0 && emptyIndices().length) {
        status.textContent = "THE BAR IS POURING…";
        host.classList.add("shaking"); await this.wait(520); host.classList.remove("shaking");
        const empty = emptyIndices();
        const hitCount = Math.random() < .5 ? 0 : Math.random() < .82 ? 1 : 2;
        const hits = empty.sort(() => Math.random() - .5).slice(0, hitCount);
        if (!hits.length) respins -= 1;
        for (const at of hits) {
          const drink = makeDrink(); board[at] = drink; total += drink.value;
          if (drink.kind === "ice") { drink.value *= 2; total += drink.value / 2; status.textContent = "ICE CUBE • VALUE DOUBLED"; }
          if (drink.kind === "cranberry") { const reel = at % 5; board.forEach((d, index) => { if (d && index % 5 === reel) { total += d.value; d.value *= 2; } }); status.textContent = "CRANBERRY SPLASH • REEL DOUBLED"; }
          if (drink.kind === "vodka") { const collected = board.reduce((s, d) => s + (d?.value ?? 0), 0); total += Math.round(collected * .2); status.textContent = "VODKA POUR • BAR COLLECTOR"; }
          if (drink.kind === "neema") { const open = emptyIndices(); if (open.length) { const extra = makeDrink(); board[open[0]!] = extra; total += extra.value; } status.textContent = "BARTENDER NEEMA ADDS A DRINK"; }
          if (drink.kind === "bell") { respins += 1; status.textContent = "LAST CALL BELL • EXTRA RESPIN"; }
          if (drink.kind === "wheel") { board.forEach((d) => { if (d && d.value <= this.betUnits * 2) { d.value += this.betUnits; total += this.betUnits; } }); status.textContent = "SHIP WHEEL • SMALL DRINKS UPGRADED"; }
        }
        if (hits.length) respins = Math.max(respins, 3);
        render(); await this.wait(700);
      }
      if (!emptyIndices().length) { total += this.betUnits * 500; status.textContent = "FULL BAR • GRAND 500×!"; }
      else status.textContent = `${20 - emptyIndices().length} DRINKS LOCKED • HAPPY HOUR COMPLETE`;
      if (typeof localStorage !== "undefined") localStorage.removeItem(savedKey);
      go.disabled = false; go.textContent = `COLLECT $${(total / 100).toFixed(2)}`;
      go.addEventListener("click", () => { overlay.remove(); resolve(); }, { once: true });
    }, { once: true }));
    return total;
  }
  private async chooseVoyageRoute(): Promise<VoyageRoute> {
    const overlay = document.createElement("div");
    overlay.className = "feature-cinematic sea-cinematic voyage-choice";
    overlay.innerHTML = `<small>CAPTAIN NEEMA'S PREMIER VOYAGE</small><h2>CHOOSE YOUR ROUTE</h2><p>Every route changes the feature.</p><div><button data-route="party"><b>PARTY DECK</b><span>14 spins • smoother voyage</span></button><button data-route="casino"><b>CASINO DECK</b><span>10 spins • 35% bigger wins</span></button><button data-route="mystery"><b>MYSTERY ISLAND</b><span>10 spins • surprise 2× hits</span></button></div>`;
    this.root.appendChild(overlay);
    return await new Promise<VoyageRoute>((resolve) => overlay.querySelectorAll<HTMLButtonElement>("[data-route]").forEach((button) => button.addEventListener("click", () => { const route = button.dataset.route as VoyageRoute; overlay.remove(); resolve(route); }, { once: true })));
  }
  private async playLastCall(): Promise<number> {
    const choices = [0.08, 0.12, 0.18].sort(() => Math.random() - 0.5);
    const overlay = document.createElement("div");
    overlay.className = "feature-cinematic sea-cinematic last-call";
    overlay.innerHTML = `<small>VOYAGE FINALE</small><h2>LAST CALL</h2><p>PICK A COCKTAIL</p><div>${choices.map((_, i) => `<button data-pick="${i}">🍹<span>POUR ${i + 1}</span></button>`).join("")}</div>`;
    this.root.appendChild(overlay);
    const pick = await new Promise<number>((resolve) =>
      overlay
        .querySelectorAll<HTMLButtonElement>("[data-pick]")
        .forEach((b) =>
          b.addEventListener("click", () => resolve(Number(b.dataset.pick)), {
            once: true,
          }),
        ),
    );
    const award = Math.max(
      this.betUnits,
      Math.round(this.bonusWin * choices[pick]!),
    );
    overlay.querySelector("p")!.textContent =
      `LAST CALL PAYS $${(award / 100).toFixed(2)}`;
    overlay.classList.add("revealed");
    await this.wait(1350);
    overlay.remove();
    return award;
  }
  private async showWinTier(award: number): Promise<void> {
    const multiple = award / this.betUnits;
    const tier =
      multiple >= 50
        ? "EPIC WIN"
        : multiple >= 20
          ? "MEGA WIN"
          : multiple >= 10
            ? "BIG WIN"
            : "";
    if (!tier) {
      await this.wait(650);
      return;
    }
    const overlay = document.createElement("div");
    overlay.className = "win-tier sea-tier";
    overlay.innerHTML = `<strong>${tier}</strong><b>$${(award / 100).toFixed(2)}</b>`;
    this.root.appendChild(overlay);
    await this.wait(1500);
    overlay.remove();
  }
  private update(): void {
    const wallet = `$${(this.getWallet() / 100).toFixed(2)}`;
    this.root.querySelector<HTMLElement>("[data-neema-wallet]")!.textContent =
      wallet;
    this.root.querySelector<HTMLElement>("[data-neema-credit]")!.textContent =
      wallet;
    this.root.querySelector<HTMLElement>("[data-neema-bet]")!.textContent =
      `$${(this.betUnits / 100).toFixed(2)}`;
    const spin =
      this.root.querySelector<HTMLButtonElement>("[data-neema-spin]")!;
    spin.disabled =
      this.spinning ||
      this.auto !== null ||
      (this.freeSpins === 0 && this.getWallet() < this.betUnits);
    this.root
      .querySelectorAll<HTMLButtonElement>(
        "[data-neema-bet-down],[data-neema-bet-up]",
      )
      .forEach((button) => {
        button.disabled = this.spinning || this.freeSpins > 0;
      });
    spin.textContent = this.freeSpins > 0 ? "FREE SPIN" : "SPIN";
    const auto = this.root.querySelector<HTMLElement>("[data-neema-auto]")!;
    auto.textContent =
      this.auto === null
        ? "AUTO"
        : `STOP ${this.auto === "infinite" ? "∞" : this.auto}`;
    this.root
      .querySelectorAll<HTMLElement>("[data-cabin]")
      .forEach((node, i) => node.classList.toggle("active", i <= this.cabin));
    this.root.querySelectorAll<HTMLElement>("[data-port]").forEach((node, i) => node.classList.toggle("active", i <= this.voyageStops));
    const departureLabel = this.root.querySelector<HTMLElement>("[data-departure-label]");
    const departureFill = this.root.querySelector<HTMLElement>("[data-departure-fill]");
    if (departureLabel) departureLabel.textContent = `DEPARTURE ${this.departureMiles} / ${DEPARTURE_TARGET}`;
    if (departureFill) departureFill.style.width = `${(this.departureMiles / DEPARTURE_TARGET) * 100}%`;
    const feature = this.root.querySelector<HTMLElement>(
      "[data-neema-feature]",
    )!;
    feature.hidden = this.freeSpins <= 0;
    this.root.querySelector<HTMLElement>(
      "[data-neema-freespins]",
    )!.textContent = `${this.freeSpins} FREE SPINS`;
    this.root.querySelector<HTMLElement>(
      "[data-neema-multiplier]",
    )!.textContent = `CABIN MULTIPLIER ${this.bonusMultiplier}×`;
  }
  private showRules(): void {
    const modal = document.createElement("div");
    modal.className = "slot-rules-backdrop";
    modal.innerHTML = `<section class="slot-rules sea-rules"><button data-close>×</button><small>NEEMA'S HIGH SEAS HAPPY HOUR</small><h2>HOW TO PLAY</h2><p>Five fixed paylines pay left to right. Sunset substitutes for every paying symbol. Three Cruise Tickets or a full Departure meter launch Frozen Happy Hour and Captain Neema's voyage.</p><h3>FROZEN HAPPY HOUR</h3><ul><li>Six drinks lock on a 5×4 board with three respins.</li><li>Every new drink resets respins to three.</li><li>Vodka collects, Ice doubles, Cranberry doubles a reel, Bartender Neema adds a drink, and Last Call adds a respin.</li><li>Fill all 20 positions for the 500× Grand.</li></ul><h3>PREMIER VOYAGE</h3><ul><li>Choose Party Deck, Casino Deck or Mystery Island.</li><li>Ocean View through Captain&apos;s Deck raise the multiplier.</li><li>Captain Neema advances through Party Cove, Golden Port and Mystery Isle.</li><li>Last Call adds a player-picked finale.</li></ul><p class="rules-note">Fictional credits only.</p></section>`;
    document.body.appendChild(modal);
    modal
      .querySelector("[data-close]")
      ?.addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (event) => {
      if (event.target === modal) modal.remove();
    });
  }

  private readProgress(key: string, fallback: number): number {
    if (typeof localStorage === "undefined") return fallback;
    const value = Number(localStorage.getItem(`beard-laws-${key}`));
    return Number.isFinite(value) ? Math.max(0, value) : fallback;
  }

  private writeProgress(key: string, value: number): void {
    if (typeof localStorage !== "undefined") localStorage.setItem(`beard-laws-${key}`, String(value));
  }
}
