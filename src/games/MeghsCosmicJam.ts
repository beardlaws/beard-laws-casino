type AutoCount = number | "infinite" | null;
type EncoreMode = "long-set" | "power-chords" | "ufo-storm";
import type { CasinoActivity } from "../state/CasinoProgression";
interface JamSymbol {
  id: string;
  label: string;
  art: string;
  weight: number;
  pay: number;
}

const art = (name: string): string =>
  new URL(`../../assets/megh/${name}.png`, import.meta.url).href;
const SYMBOLS: readonly JamSymbol[] = [
  {
    id: "strawberry",
    label: "STRAWBERRY",
    art: art("strawberry"),
    weight: 24,
    pay: 6,
  },
  { id: "amp", label: "JAM AMP", art: art("amp"), weight: 20, pay: 8 },
  {
    id: "guitar",
    label: "COSMIC GUITAR",
    art: art("guitar"),
    weight: 17,
    pay: 11,
  },
  { id: "vinyl", label: "VINYL", art: art("vinyl"), weight: 15, pay: 14 },
  { id: "goat", label: "ROCK GOAT", art: art("goat"), weight: 11, pay: 20 },
  { id: "megh", label: "MEGH", art: art("megh-cosmic-v2"), weight: 7, pay: 30 },
  { id: "wild", label: "WILD NOTE", art: art("note"), weight: 5, pay: 18 },
  { id: "ufo", label: "ENCORE UFO", art: art("ufo"), weight: 1.4, pay: 0 },
];
const COLS = 6;
const ROWS = 5;
const SOUNDCHECK_TARGET = 50;
const BET_LEVELS = [50, 100, 200, 300, 500] as const;

export class MeghsCosmicJam {
  private auto: AutoCount = null;
  private stopRequested = false;
  private spinning = false;
  private multiplier = 1;
  private encore = 0;
  private freeDrops = 0;
  private encoreWin = 0;
  private encoreMode: EncoreMode | null = null;
  private stageEnergy = 0;
  private stageLevel = 0;
  private soundcheck = this.readProgress("megh-soundcheck", 0);
  private lastDisplayedWin = 0;
  private betIndex = 1;
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
    this.root.innerHTML = `<main class="megh-room"><button class="back" data-megh-home>← CASINO LOBBY</button>
      <header><small>BEARD LAWS CASINO • CASCADE FEATURE SLOT</small><h1>MEGH'S COSMIC JAM</h1><p>Space goats came for the strawberries. They stayed to melt faces.</p><button class="game-rules cosmic-rules-button" data-megh-rules>RULES &amp; PAYTABLE</button></header>
      <section class="megh-machine"><div class="laser-grid"></div><div class="megh-marquee"><span>LIVE TUMBLES</span><strong>INTERGALACTIC ENCORE</strong><span>PERSISTENT MULTIPLIERS</span></div><div class="soundcheck-meter"><span><b data-soundcheck-label>SOUNDCHECK 0 / ${SOUNDCHECK_TARGET}</b><small>3 UFOS OR A FULL METER LAUNCHES THE ENCORE</small></span><i><em data-soundcheck-fill></em></i></div><div class="megh-top">
        <div><small>TRACTOR MULTIPLIER</small><b data-megh-multi>1×</b></div><strong data-megh-message>AMPLIFIERS READY</strong><div><small>ENCORE METER</small><b data-megh-encore>0 / 4</b></div></div>
        <div class="slot-win-callout megh-win-callout" data-megh-callout hidden></div><div class="feature-readout cosmic-readout" data-megh-feature hidden><b data-megh-freedrops></b><span data-megh-feature-multi></span><span data-megh-stage></span></div><div class="megh-reels" data-megh-reels></div>
        <div class="megh-feature"><span>6+ MATCHING SYMBOLS WIN</span><span>WINS VANISH &amp; TUMBLE</span><span>4 CASCADES LAUNCH ENCORE</span></div>
        <div class="megh-controls"><div><small>CREDIT</small><b data-megh-credit></b></div><div class="bet-selector"><button data-megh-bet-down aria-label="Decrease bet">−</button><span><small>BET</small><b data-megh-bet>$1.00</b></span><button data-megh-bet-up aria-label="Increase bet">+</button></div><div><small>WIN</small><b data-megh-win>$0.00</b></div>
          <button data-megh-auto>AUTO</button><button class="megh-spin" data-megh-spin>DROP</button></div>
        <div class="megh-auto-menu" data-megh-menu hidden>${[5, 10, 25, 50].map((n) => `<button data-auto="${n}">${n}</button>`).join("")}<button data-auto="infinite">∞</button></div>
      </section><p class="megh-disclaimer">Fictional credits only • Shared casino wallet • Auto stops before feature play</p></main>`;
    this.root
      .querySelector("[data-megh-home]")
      ?.addEventListener("click", () => this.onExit());
    this.root
      .querySelector("[data-megh-rules]")
      ?.addEventListener("click", () => this.showRules());
    this.root
      .querySelector("[data-megh-spin]")
      ?.addEventListener("click", () => {
        void this.spin();
      });
    this.root
      .querySelector("[data-megh-auto]")
      ?.addEventListener("click", () => this.toggleAuto());
    this.root
      .querySelector("[data-megh-bet-down]")
      ?.addEventListener("click", () => this.changeBet(-1));
    this.root
      .querySelector("[data-megh-bet-up]")
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
      this.render(this.makeGrid());
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

  private pick(): JamSymbol {
    const totalWeight = SYMBOLS.reduce((s, x) => s + this.symbolWeight(x), 0);
    let roll = Math.random() * totalWeight;
    for (const symbol of SYMBOLS) {
      roll -= this.symbolWeight(symbol);
      if (roll < 0) return symbol;
    }
    return SYMBOLS[0]!;
  }
  private symbolWeight(symbol: JamSymbol): number {
    return symbol.id === "ufo" && this.freeDrops > 0 && this.encoreMode === "ufo-storm"
      ? symbol.weight * 3.2
      : symbol.weight;
  }
  private makeGrid(): JamSymbol[][] {
    return Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, () => this.pick()),
    );
  }
  private render(grid: JamSymbol[][], winners = new Set<string>()): void {
    const host = this.root.querySelector<HTMLElement>("[data-megh-reels]")!;
    host.classList.toggle("has-win", winners.size > 0);
    host.innerHTML = grid
      .flatMap((row, y) =>
        row.map(
          (symbol, x) =>
            `<div class="jam-symbol s-${symbol.id}${winners.has(`${x}:${y}`) ? " winner" : ""}" style="grid-column:${x + 1};grid-row:${y + 1};--x:${x};--y:${y}"><span>${symbol.label}</span><img src="${symbol.art}" alt="${symbol.label}" onload="this.parentElement.classList.add('art-ready')" onerror="this.hidden=true;this.parentElement.classList.add('art-failed')"><small>${symbol.label}</small></div>`,
        ),
      )
      .join("");
  }
  private clusters(
    grid: JamSymbol[][],
  ): Array<{ cells: Set<string>; symbol: JamSymbol }> {
    const visited = new Set<string>();
    const found: Array<{ cells: Set<string>; symbol: JamSymbol }> = [];
    for (let y = 0; y < ROWS; y += 1)
      for (let x = 0; x < COLS; x += 1) {
        const key = `${x}:${y}`;
        if (visited.has(key)) continue;
        const base = grid[y]![x]!;
        if (base.id === "ufo" || base.id === "wild") {
          visited.add(key);
          continue;
        }
        const cells = new Set<string>();
        const queue: [[number, number]] = [[x, y]];
        while (queue.length) {
          const [cx, cy] = queue.pop()!;
          const ck = `${cx}:${cy}`;
          if (visited.has(ck)) continue;
          const current = grid[cy]?.[cx];
          if (!current || (current.id !== base.id && current.id !== "wild"))
            continue;
          visited.add(ck);
          cells.add(ck);
          (
            [
              [cx + 1, cy],
              [cx - 1, cy],
              [cx, cy + 1],
              [cx, cy - 1],
            ] as [number, number][]
          ).forEach((p) => queue.push(p));
        }
        if (cells.size >= 6) found.push({ cells, symbol: base });
      }
    return found;
  }
  private tumble(grid: JamSymbol[][], removed: Set<string>): JamSymbol[][] {
    const next = grid.map((row) => [...row]);
    for (let x = 0; x < COLS; x += 1) {
      const kept: JamSymbol[] = [];
      for (let y = ROWS - 1; y >= 0; y -= 1)
        if (!removed.has(`${x}:${y}`)) kept.push(grid[y]![x]!);
      for (let y = ROWS - 1; y >= 0; y -= 1)
        next[y]![x] = kept[ROWS - 1 - y] ?? this.pick();
    }
    return next;
  }
  private async spin(): Promise<boolean> {
    if (this.spinning) return false;
    const free = this.freeDrops > 0;
    if (!free && this.getWallet() < this.betUnits) {
      this.message("VISIT THE ATM");
      this.stopAuto();
      return false;
    }
    this.spinning = true;
    this.onActivity({ type: "spin", game: "megh" });
    if (!free) this.setWallet(this.getWallet() - this.betUnits);
    else this.freeDrops -= 1;
    if (!free) {
      this.multiplier = 1;
      this.encore = 0;
    }
    this.update();
    let grid = this.makeGrid();
    let total = 0;
    let feature = false;
    const host = this.root.querySelector<HTMLElement>("[data-megh-reels]")!;
    this.render(grid);
    host.classList.add("dropping");
    await this.wait(780);
    host.classList.remove("dropping");
    const callout = this.root.querySelector<HTMLElement>(
      "[data-megh-callout]",
    )!;
    callout.hidden = true;
    for (let cascade = 0; cascade < 8; cascade += 1) {
      const matches = this.clusters(grid);
      if (!matches.length) break;
      const removed = new Set(matches.flatMap((m) => [...m.cells]));
      const raw = matches.reduce(
        (sum, m) => sum + m.symbol.pay * m.cells.size,
        0,
      );
      const award = Math.round(
        (raw * this.multiplier * 3.15 * this.betUnits) / 100,
      );
      total += award;
      this.encore += 1;
      if (free) this.growEncoreStage(removed.size);
      const groups = matches
        .map((m) => `${m.cells.size} ${m.symbol.label}`)
        .join(" + ");
      this.message(`${this.multiplier}× TRACTOR-BEAM CASCADE`);
      callout.hidden = false;
      callout.textContent = `${groups} • ${this.multiplier}× • +$${(award / 100).toFixed(2)}`;
      this.render(grid, removed);
      this.update();
      await this.wait(680);
      host.classList.add("beaming");
      await this.wait(480);
      grid = this.tumble(grid, removed);
      this.multiplier += 1;
      this.render(grid);
      host.classList.remove("beaming");
      host.classList.add("tumbling");
      await this.wait(650);
      host.classList.remove("tumbling");
    }
    const ufos = grid.flat().filter((s) => s.id === "ufo").length;
    if (!free) {
      this.soundcheck = Math.min(SOUNDCHECK_TARGET, this.soundcheck + 1 + ufos);
      this.writeProgress("megh-soundcheck", this.soundcheck);
    }
    const guaranteedEncore = !free && this.soundcheck >= SOUNDCHECK_TARGET;
    if (ufos >= 3 || (!free && this.encore >= 4) || guaranteedEncore) {
      feature = true;
      if (!free) {
        this.soundcheck = 0;
        this.writeProgress("megh-soundcheck", 0);
      }
      this.onActivity({ type: "bonus", game: "megh" });
      if (free) {
        const added = ufos >= 5 ? 5 : ufos >= 4 ? 4 : 3;
        this.freeDrops += added;
        this.message(`ENCORE RETRIGGER • +${added} FREE DROPS`);
        await this.showEncoreIntro(true, added);
      } else {
        const baseDrops = ufos >= 5 ? 16 : ufos >= 4 ? 12 : 8;
        this.encoreMode = await this.chooseEncoreMode(baseDrops);
        this.stageEnergy = 0;
        this.stageLevel = 0;
        this.freeDrops += baseDrops + (this.encoreMode === "long-set" ? 4 : 0);
        if (this.encoreMode === "power-chords") this.multiplier = Math.max(this.multiplier, 3);
        this.message(`${this.encoreModeLabel()} • ${this.freeDrops} FREE DROPS`);
        await this.showEncoreIntro(false, this.freeDrops);
      }
    }
    if (free) this.encoreWin += total;
    if (free && this.freeDrops === 0 && !feature) {
      const finale = await this.playGuitarSmash();
      total += finale;
      this.message(`FINAL GUITAR SMASH • +$${(finale / 100).toFixed(2)}`);
      this.encoreWin = 0;
      this.multiplier = 1;
      this.encoreMode = null;
      this.stageEnergy = 0;
      this.stageLevel = 0;
    }
    if (total > 0) {
      this.setWallet(this.getWallet() + total);
      this.onActivity({ type: "win", game: "megh", amount: total, value: total / this.betUnits });
      callout.hidden = false;
      callout.textContent = `TOTAL COSMIC WIN • $${(total / 100).toFixed(2)}`;
      await this.animateWin(total);
      await this.showWinTier(total);
    }
    this.message(
      total > 0
        ? total >= this.betUnits * 10
          ? "FINAL ENCORE • MEGA WIN"
          : "COSMIC JAM PAYS"
        : "THE GOATS NEED A TUNE-UP",
    );
    this.spinning = false;
    this.update();
    return feature;
  }
  private toggleAuto(): void {
    if (this.auto !== null) {
      this.stopRequested = true;
      this.message("AUTO STOPS AFTER THIS DROP");
      return;
    }
    const menu = this.root.querySelector<HTMLElement>("[data-megh-menu]")!;
    menu.hidden = !menu.hidden;
  }
  private startAuto(count: Exclude<AutoCount, null>): void {
    if (this.spinning) return;
    this.auto = count;
    this.stopRequested = false;
    this.root.querySelector<HTMLElement>("[data-megh-menu]")!.hidden = true;
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
      await this.wait(350);
    }
    this.stopAuto();
  }
  private stopAuto(): void {
    this.auto = null;
    this.stopRequested = false;
    this.update();
  }
  private message(text: string): void {
    const node = this.root.querySelector<HTMLElement>("[data-megh-message]");
    if (node) node.textContent = text;
  }
  private changeBet(direction: number): void {
    if (this.spinning || this.freeDrops > 0) return;
    this.betIndex = Math.max(
      0,
      Math.min(BET_LEVELS.length - 1, this.betIndex + direction),
    );
    this.lastDisplayedWin = 0;
    this.update();
  }
  private update(): void {
    const credit = this.root.querySelector<HTMLElement>("[data-megh-credit]");
    if (!credit) return;
    credit.textContent = `$${(this.getWallet() / 100).toFixed(2)}`;
    this.root.querySelector<HTMLElement>("[data-megh-bet]")!.textContent =
      `$${(this.betUnits / 100).toFixed(2)}`;
    this.root.querySelector<HTMLElement>("[data-megh-multi]")!.textContent =
      `${this.multiplier}×`;
    this.root.querySelector<HTMLElement>("[data-megh-encore]")!.textContent =
      `${Math.min(4, this.encore)} / 4`;
    const soundcheckLabel = this.root.querySelector<HTMLElement>("[data-soundcheck-label]");
    const soundcheckFill = this.root.querySelector<HTMLElement>("[data-soundcheck-fill]");
    if (soundcheckLabel) soundcheckLabel.textContent = `SOUNDCHECK ${this.soundcheck} / ${SOUNDCHECK_TARGET}`;
    if (soundcheckFill) soundcheckFill.style.width = `${(this.soundcheck / SOUNDCHECK_TARGET) * 100}%`;
    const spin =
      this.root.querySelector<HTMLButtonElement>("[data-megh-spin]")!;
    spin.disabled =
      this.spinning ||
      this.auto !== null ||
      (this.freeDrops === 0 && this.getWallet() < this.betUnits);
    this.root
      .querySelectorAll<HTMLButtonElement>(
        "[data-megh-bet-down],[data-megh-bet-up]",
      )
      .forEach((button) => {
        button.disabled = this.spinning || this.freeDrops > 0;
      });
    spin.textContent = this.freeDrops > 0 ? "FREE DROP" : "DROP";
    this.root.querySelector<HTMLElement>("[data-megh-auto]")!.textContent =
      this.auto === null
        ? "AUTO"
        : `STOP ${this.auto === "infinite" ? "∞" : this.auto}`;
    const feature = this.root.querySelector<HTMLElement>(
      "[data-megh-feature]",
    )!;
    feature.hidden = this.freeDrops <= 0;
    this.root.querySelector<HTMLElement>("[data-megh-freedrops]")!.textContent =
      `${this.freeDrops} FREE DROPS`;
    this.root.querySelector<HTMLElement>(
      "[data-megh-feature-multi]",
    )!.textContent = `LIVE MULTIPLIER ${this.multiplier}×`;
    this.root.querySelector<HTMLElement>("[data-megh-stage]")!.textContent =
      `${this.stageName()} • AMP ${Math.min(this.stageEnergy, 60)} / 60`;
  }
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }
  private async animateWin(target: number): Promise<void> {
    const node = this.root.querySelector<HTMLElement>("[data-megh-win]")!;
    const began = performance.now();
    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const p = Math.min(1, (now - began) / 750);
        node.textContent = `$${(Math.round(this.lastDisplayedWin + (target - this.lastDisplayedWin) * (1 - Math.pow(1 - p, 3))) / 100).toFixed(2)}`;
        if (p < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    this.lastDisplayedWin = target;
  }
  private async showEncoreIntro(retrigger: boolean, drops: number): Promise<void> {
    const overlay = document.createElement("div");
    overlay.className = "feature-cinematic cosmic-cinematic";
    overlay.innerHTML = `<div class="cosmic-portal"></div><small>${retrigger ? "THE CROWD DEMANDS MORE" : this.encoreModeLabel()}</small><h2>${retrigger ? "ENCORE RETRIGGER" : "INTERGALACTIC ENCORE"}</h2><p>${retrigger ? `+${drops} FREE DROPS` : `${drops} FREE DROPS • BUILD THE AMP • UPGRADE THE STAGE`}</p>`;
    this.root.appendChild(overlay);
    await this.wait(2300);
    overlay.classList.add("leaving");
    await this.wait(420);
    overlay.remove();
  }
  private async chooseEncoreMode(baseDrops: number): Promise<EncoreMode> {
    const overlay = document.createElement("div");
    overlay.className = "feature-cinematic cosmic-cinematic encore-choice";
    overlay.innerHTML = `<small>${baseDrops} FREE DROPS WON</small><h2>CHOOSE THE ENCORE</h2><p>Pick how Megh takes over the galaxy.</p><div class="encore-choice-grid">
      <button data-mode="long-set"><b>LONG SET</b><span>+4 FREE DROPS</span></button>
      <button data-mode="power-chords"><b>POWER CHORDS</b><span>START AT 3×</span></button>
      <button data-mode="ufo-storm"><b>UFO STORM</b><span>MORE RETRIGGER UFOS</span></button>
    </div>`;
    this.root.appendChild(overlay);
    return await new Promise<EncoreMode>((resolve) => {
      overlay.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((button) => {
        button.addEventListener("click", () => {
          const mode = button.dataset.mode as EncoreMode;
          button.classList.add("selected");
          window.setTimeout(() => { overlay.remove(); resolve(mode); }, 420);
        }, { once: true });
      });
    });
  }
  private growEncoreStage(energy: number): void {
    this.stageEnergy = Math.min(60, this.stageEnergy + energy);
    const nextLevel = this.stageEnergy >= 60 ? 3 : this.stageEnergy >= 40 ? 2 : this.stageEnergy >= 18 ? 1 : 0;
    if (nextLevel <= this.stageLevel) return;
    const gained = nextLevel - this.stageLevel;
    this.stageLevel = nextLevel;
    this.onActivity({ type: "stage", game: "megh", value: this.stageLevel });
    this.multiplier += gained;
    this.message(`${this.stageName()} UNLOCKED • MULTIPLIER +${gained}`);
    this.root.querySelector("[data-megh-reels]")?.classList.add("stage-upgrade");
    window.setTimeout(() => this.root.querySelector("[data-megh-reels]")?.classList.remove("stage-upgrade"), 850);
  }
  private stageName(): string {
    return ["GARAGE", "ARENA", "COSMIC STADIUM", "GALACTIC HEADLINER"][this.stageLevel] ?? "GARAGE";
  }
  private encoreModeLabel(): string {
    return this.encoreMode === "long-set" ? "LONG SET" : this.encoreMode === "power-chords" ? "POWER CHORDS" : this.encoreMode === "ufo-storm" ? "UFO STORM" : "BONUS FEATURE";
  }
  private async playGuitarSmash(): Promise<number> {
    const factors = [0.1, 0.15, 0.22].sort(() => Math.random() - 0.5);
    const overlay = document.createElement("div");
    overlay.className = "feature-cinematic cosmic-cinematic guitar-smash";
    overlay.innerHTML = `<small>ENCORE FINALE</small><h2>GUITAR SMASH</h2><p>CHOOSE YOUR WEAPON</p><div>${factors.map((_, i) => `<button data-guitar="${i}">🎸<span>GUITAR ${i + 1}</span></button>`).join("")}</div>`;
    this.root.appendChild(overlay);
    const pick = await new Promise<number>((resolve) =>
      overlay
        .querySelectorAll<HTMLButtonElement>("[data-guitar]")
        .forEach((b) =>
          b.addEventListener("click", () => resolve(Number(b.dataset.guitar)), {
            once: true,
          }),
        ),
    );
    const award = Math.max(
      this.betUnits,
      Math.round(this.encoreWin * factors[pick]!),
    );
    overlay.querySelector("p")!.textContent =
      `SMASH PAYS $${(award / 100).toFixed(2)}`;
    overlay.classList.add("revealed");
    await this.wait(1400);
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
    overlay.className = "win-tier cosmic-tier";
    overlay.innerHTML = `<strong>${tier}</strong><b>$${(award / 100).toFixed(2)}</b>`;
    this.root.appendChild(overlay);
    await this.wait(1500);
    overlay.remove();
  }
  private showRules(): void {
    const modal = document.createElement("div");
    modal.className = "slot-rules-backdrop";
    modal.innerHTML = `<section class="slot-rules cosmic-rules"><button data-close>×</button><small>MEGH'S COSMIC JAM</small><h2>HOW TO PLAY</h2><p>Clusters of 6 or more matching symbols pay anywhere. Winning symbols are tractor-beamed away and new symbols tumble into the empty spaces.</p><h3>INTERGALACTIC ENCORE</h3><ul><li>Three, four or five UFOs award 8, 12 or 16 free drops.</li><li>Paid drops and landed UFOs fill Soundcheck; a full meter guarantees the Encore.</li><li>Choose Long Set, Power Chords or UFO Storm before the feature.</li><li>The multiplier persists throughout the Encore.</li><li>Winning cascades charge the amp and upgrade the stage.</li><li>UFOs can retrigger up to 5 additional drops.</li><li>The final Guitar Smash adds a player-picked finale award.</li></ul><h3>TOP SYMBOLS</h3><p>Megh • Rock Goat • Wild Note • Vinyl</p><p class="rules-note">Awards scale with the selected fictional-credit wager.</p></section>`;
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
