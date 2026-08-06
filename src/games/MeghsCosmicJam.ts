type AutoCount = number | "infinite" | null;
import type { CasinoActivity } from "../state/CasinoProgression";
import { casinoRandom } from "../engine/CasinoRandom";
import { SlotBetModel, denominationMarkup } from "./SlotBetModel";
import { animateDomReels } from "./DomReelAnimator";
import { FeatureDirector } from "../engine/FeatureDirector";
import { GameStateMachine } from "../engine/GameStateMachine";
import {
  MEGH_COLS as COLS,
  MEGH_MAX_FEATURE_DROPS as MAX_FEATURE_DROPS,
  MEGH_MAX_RETRIGGER_DROPS as MAX_RETRIGGER_DROPS,
  MEGH_PRODUCTION_MATH,
  MEGH_ROWS as ROWS,
  MEGH_SOUNDCHECK_TARGET as SOUNDCHECK_TARGET,
  MEGH_SYMBOLS as SYMBOLS,
  meghArt as art,
  type CosmicEvent,
  type EncoreMode,
  type JamSymbol,
} from "./megh/MeghConfig";
import { findMeghClusters, makeMeghGrid, pickMeghSymbol, tumbleMeghGrid } from "./megh/MeghBoard";

export { MEGH_PRODUCTION_MATH };

export class MeghsCosmicJam {
  private auto: AutoCount = null;
  private stopRequested = false;
  private spinning = false;
  private bonusAutoRunning = false;
  private multiplier = 1;
  private encore = 0;
  private freeDrops = 0;
  private featureDropsPlayed = 0;
  private featureDropsAwarded = 0;
  private retriggerDropsAwarded = 0;
  private featureRetriggers = 0;
  private encoreWin = 0;
  private encoreMode: EncoreMode | null = null;
  private stageEnergy = 0;
  private stageLevel = 0;
  private soundboard = new Set<string>();
  private multiplierTiles = 0;
  private lastSurge = "SYSTEMS NOMINAL";
  private surgeDeck: CosmicEvent[] = [];
  private cascadeStreak = 0;
  private forcedSurge: CosmicEvent | null = null;
  private readonly gameState = new GameStateMachine("megh");
  private forceEncore = false;
  private readonly handleDeveloperAction = (event: Event): void => {
    const detail = (event as CustomEvent<{ action?: string }>).detail;
    if (detail?.action === "megh-goat") { this.forcedSurge = "GOAT STAMPEDE"; this.message("QA ARMED • GOAT STAMPEDE ON NEXT DROP"); this.qaResult("Goat Stampede armed for the next drop."); }
    if (detail?.action === "megh-ufo") { this.forcedSurge = "UFO SCAN"; this.message("QA ARMED • UFO SCAN ON NEXT DROP"); this.qaResult("UFO Scan armed for the next drop."); }
    if (detail?.action === "megh-encore") { this.forceEncore = true; this.message("QA ARMED • ENCORE ON NEXT DROP"); this.qaResult("Encore armed for the next drop."); }
    if (detail?.action === "megh-headliner") { ["BASS","LEAD","DRUMS","VOCALS","UFO"].forEach((channel)=>this.soundboard.add(channel)); this.forceEncore = true; this.chargeSoundboard([]); this.message("QA ARMED • HEADLINER MODE ON NEXT DROP"); this.qaResult("Headliner Mode armed for the next drop."); }
  };
  private soundcheck = this.readProgress("megh-soundcheck", 0);
  private lastDisplayedWin = 0;
  private readonly betModel = new SlotBetModel();
  private get betUnits(): number {
    return this.betModel.wagerUnits;
  }

  public constructor(
    private readonly root: HTMLElement,
    private readonly getWallet: () => number,
    private readonly setWallet: (units: number) => void,
    private readonly onExit: () => void,
    private readonly onActivity: (activity: CasinoActivity) => void = () => {},
  ) {}

  public open(): void {
    window.addEventListener("casino:dev", this.handleDeveloperAction as EventListener);
    this.root.innerHTML = `<main class="megh-room"><button class="back" data-megh-home>← CASINO LOBBY</button>
      <header><small>BEARD LAWS CASINO • CASCADE FEATURE SLOT</small><h1>MEGH'S COSMIC JAM</h1><p>Space goats came for the strawberries. They stayed to melt faces.</p><button class="game-rules cosmic-rules-button" data-megh-rules>RULES &amp; PAYTABLE</button></header>
      <section class="megh-machine"><div class="laser-grid"></div><div class="megh-marquee"><span>LIVE TUMBLES</span><strong>INTERGALACTIC ENCORE</strong><span>PERSISTENT MULTIPLIERS</span></div><div class="soundcheck-meter"><span><b data-soundcheck-label>SOUNDCHECK 0 / ${SOUNDCHECK_TARGET}</b><small>3 UFOS OR A FULL METER LAUNCHES THE ENCORE</small></span><i><em data-soundcheck-fill></em></i></div><div class="megh-top">
        <div><small>TRACTOR MULTIPLIER</small><b data-megh-multi>1×</b></div><strong data-megh-message>AMPLIFIERS READY</strong><div><small>ENCORE METER</small><b data-megh-encore>0 / 4</b></div></div>
        <div class="cosmic-surge" data-megh-surge><small>COSMIC WEATHER</small><b>SYSTEMS NOMINAL</b></div><div class="invasion-ladder"><small>INVASION CHAIN</small>${Array.from({length:8},(_,i)=>`<i data-chain="${i+1}">${i+1}</i>`).join("")}<b data-chain-prize>4 CASCADES = ENCORE • 8 = 50 DROPS</b></div><div class="megh-ledger" aria-label="Game totals"><span><small>ACCOUNT</small><b data-megh-ledger-credit>$0.00</b></span><span><small>LAST WIN</small><b data-megh-ledger-win>$0.00</b></span><span><small>BONUS WIN</small><b data-megh-ledger-bonus>$0.00</b></span></div><div class="slot-win-callout megh-win-callout" data-megh-callout hidden></div><div class="feature-readout cosmic-readout" data-megh-feature hidden><b data-megh-freedrops></b><span data-megh-feature-multi></span><span data-megh-stage></span></div><div class="megh-reels" data-megh-reels></div>
        <div class="cosmic-soundboard" data-soundboard>${["BASS", "LEAD", "DRUMS", "VOCALS", "UFO"].map((x) => `<i data-channel="${x}">${x}</i>`).join("")}</div><div class="megh-feature"><span>FILL 3 CHANNELS: ENCORE</span><span>FILL ALL 5: HEADLINER</span><span>MULTIPLIER TILES PERSIST</span></div>
        <div class="megh-controls"><div><small>CREDIT</small><b data-megh-credit></b></div>${denominationMarkup("megh")}<div class="bet-selector"><button data-megh-bet-down aria-label="Decrease bet">−</button><span><small>BET • <i data-megh-credits></i> CR</small><b data-megh-bet>$1.00</b></span><button data-megh-bet-up aria-label="Increase bet">+</button></div><div><small>WIN</small><b data-megh-win>$0.00</b></div>
          <button data-megh-max>MAX BET</button><button data-megh-auto>AUTO</button><button class="megh-spin" data-megh-spin>DROP</button></div>
        <div class="megh-auto-menu" data-megh-menu hidden>${[5, 10, 25, 50].map((n) => `<button data-auto="${n}">${n}</button>`).join("")}<button data-auto="infinite">∞</button></div>
      </section><p class="megh-disclaimer">Fictional credits only • Shared casino wallet • Auto stops before feature play</p></main>`;
    this.root
      .querySelector("[data-megh-home]")
      ?.addEventListener("click", () => {
        window.removeEventListener("casino:dev", this.handleDeveloperAction as EventListener);
        this.onExit();
      });
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
    this.root.querySelector("[data-megh-denom-down]")?.addEventListener("click", () => this.changeDenom(-1));
    this.root.querySelector("[data-megh-denom-up]")?.addEventListener("click", () => this.changeDenom(1));
    this.root.querySelector("[data-megh-max]")?.addEventListener("click", () => this.setMaxBet());
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
    return pickMeghSymbol(SYMBOLS, casinoRandom, (symbol) => this.symbolWeight(symbol));
  }
  private symbolWeight(symbol: JamSymbol): number {
    return symbol.id === "ufo" && this.freeDrops > 0 && this.encoreMode === "ufo-storm"
      ? symbol.weight * 3.2
      : symbol.weight;
  }
  private makeGrid(): JamSymbol[][] {
    return makeMeghGrid(ROWS, COLS, () => this.pick());
  }
  private render(grid: JamSymbol[][], winners = new Set<string>()): void {
    const host = this.root.querySelector<HTMLElement>("[data-megh-reels]")!;
    host.classList.toggle("has-win", winners.size > 0);
    host.innerHTML = grid
      .flatMap((row, y) =>
        row.map(
          (symbol, x) =>
            `<div data-cell="${x}:${y}" class="jam-symbol s-${symbol.id}${winners.has(`${x}:${y}`) ? " winner" : ""}" style="grid-column:${x + 1};grid-row:${y + 1};--x:${x};--y:${y}"><span>${symbol.label}</span><img src="${symbol.art}" alt="${symbol.label}" onload="this.parentElement.classList.add('art-ready')" onerror="this.hidden=true;this.parentElement.classList.add('art-failed')"><small>${symbol.label}</small></div>`,
        ),
      )
      .join("");
  }
  private clusters(grid: JamSymbol[][]): Array<{ cells: Set<string>; symbol: JamSymbol }> {
    return findMeghClusters(grid, ROWS, COLS, MEGH_PRODUCTION_MATH.clusterMinimum);
  }

  private tumble(grid: JamSymbol[][], removed: Set<string>): JamSymbol[][] {
    return tumbleMeghGrid(grid, removed, ROWS, COLS, () => this.pick());
  }

  private async animateCascadeGravity(host: HTMLElement, before: JamSymbol[][], after: JamSymbol[][], removed: Set<string>): Promise<void> {
    const removedNodes = [...removed]
      .map((key) => host.querySelector<HTMLElement>(`[data-cell="${key}"]`))
      .filter((node): node is HTMLElement => Boolean(node));
    await Promise.all(removedNodes.map((node, index) => node.animate(
      [
        { transform: "scale(1)", opacity: 1, filter: "brightness(1)" },
        { transform: "scale(.82) rotate(-3deg)", opacity: .72, filter: "brightness(1.7)" },
        { transform: "scale(.04) translateY(-24px)", opacity: 0, filter: "brightness(2.2) blur(4px)" },
      ],
      { duration: 420, delay: index * 34, easing: "cubic-bezier(.3,.05,.6,1)", fill: "forwards" },
    ).finished.catch(() => undefined)));

    const origins = new Map<JamSymbol, number[]>();
    for (let x = 0; x < COLS; x += 1) {
      for (let y = 0; y < ROWS; y += 1) {
        if (removed.has(`${x}:${y}`)) continue;
        const symbol = before[y]![x]!;
        const key = symbol as JamSymbol;
        const packed = origins.get(key) ?? [];
        packed.push(y);
        origins.set(key, packed);
      }
    }

    this.render(after);
    const animations: Promise<unknown>[] = [];
    for (let x = 0; x < COLS; x += 1) {
      const used = new Map<JamSymbol, number>();
      for (let y = 0; y < ROWS; y += 1) {
        const symbol = after[y]![x]!;
        const occurrence = used.get(symbol) ?? 0;
        used.set(symbol, occurrence + 1);
        const possibleOrigins = origins.get(symbol) ?? [];
        const originalY = possibleOrigins[occurrence];
        const isNew = originalY === undefined || originalY > y;
        const distance = isNew ? y + 2 : Math.max(1, y - originalY);
        const node = host.querySelector<HTMLElement>(`[data-cell="${x}:${y}"]`);
        if (!node) continue;
        node.classList.add(isNew ? "cascade-new-symbol" : "cascade-falling-symbol");
        animations.push(node.animate(
          [
            { transform: `translate3d(0,${-distance * 112}%,0)`, opacity: isNew ? 0 : .72, filter: "blur(3px) brightness(1.35)" },
            { transform: "translate3d(0,9%,0)", opacity: 1, filter: "blur(0) brightness(1.08)", offset: .82 },
            { transform: "translate3d(0,0,0)", opacity: 1, filter: "none" },
          ],
          { duration: 680 + y * 48, delay: x * 28, easing: "cubic-bezier(.16,.82,.22,1)", fill: "both" },
        ).finished.catch(() => undefined));
      }
    }
    await Promise.all(animations);
    await this.wait(110);
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
    this.gameState.transition("SPIN_START", true);
    this.gameState.transition("SPINNING");
    this.onActivity({ type: "spin", game: "megh", wager: free ? 0 : this.betUnits });
    if (!free) this.setWallet(this.getWallet() - this.betUnits);
    else { this.freeDrops -= 1; this.featureDropsPlayed += 1; }
    if (!free) {
      this.multiplier = 1;
      this.encore = 0;
    }
    this.update();
    let grid = this.makeGrid();
    let total = 0;
    let feature = false;
    const host = this.root.querySelector<HTMLElement>("[data-megh-reels]")!;
    grid = await this.playReelRush(host, grid, free);
    this.gameState.transition("REEL_STOPS", true);
    this.gameState.transition("EVALUATING");
    const callout = this.root.querySelector<HTMLElement>(
      "[data-megh-callout]",
    )!;
    callout.hidden = true;
    for (let cascade = 0; cascade < 8; cascade += 1) {
      const matches = this.clusters(grid);
      if (!matches.length) break;
      this.gameState.transition("CASCADE", true);
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
      this.cascadeStreak = cascade + 1;
      this.updateInvasionLadder();
      this.chargeSoundboard(matches.map((m) => m.symbol.id));
      if (free) this.growEncoreStage(removed.size);
      if (free) this.multiplierTiles = Math.min(12, this.multiplierTiles + 1);
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
      const nextGrid = this.tumble(grid, removed);
      await this.animateCascadeGravity(host, grid, nextGrid, removed);
      grid = nextGrid;
      this.multiplier += 1;
      host.classList.remove("beaming");
    }
    const ufos = grid.flat().filter((s) => s.id === "ufo").length;
    if (!free) {
      this.soundcheck = Math.min(SOUNDCHECK_TARGET, this.soundcheck + 1 + ufos);
      this.writeProgress("megh-soundcheck", this.soundcheck);
    }
    const guaranteedEncore = !free && (this.soundcheck >= SOUNDCHECK_TARGET || this.forceEncore);
    if (this.forceEncore) this.forceEncore = false;
    const headliner = !free && this.soundboard.size >= 5;
    if (ufos >= 3 || (!free && this.encore >= 4) || (!free && this.soundboard.size >= 3) || guaranteedEncore) {
      feature = true;
      if (!free) {
        this.soundcheck = 0;
        this.writeProgress("megh-soundcheck", 0);
      }
      this.onActivity({ type: "bonus", game: "megh" });
      if (free) {
        const requested = ufos >= 5 ? 5 : ufos >= 4 ? 4 : 3;
        const roomInFeature = Math.max(0, MAX_FEATURE_DROPS - this.featureDropsPlayed - this.freeDrops);
        const roomInRetriggers = Math.max(0, MAX_RETRIGGER_DROPS - this.retriggerDropsAwarded);
        const added = Math.min(requested, roomInFeature, roomInRetriggers);
        if (added > 0) {
          this.freeDrops += added;
          this.featureDropsAwarded += added;
          this.retriggerDropsAwarded += added;
          this.featureRetriggers += 1;
          this.message(`ENCORE RETRIGGER • +${added} FREE DROPS`);
          await this.showEncoreIntro(true, added);
        } else {
          this.message("MAXIMUM ENCORE REACHED • UFOS PAY AS SYMBOLS");
        }
      } else {
        const baseDrops = this.cascadeStreak >= 8 ? 50 : ufos >= 5 ? 16 : ufos >= 4 ? 12 : 8;
        this.encoreMode = await this.chooseEncoreMode(baseDrops);
        this.stageEnergy = 0;
        this.stageLevel = 0;
        this.freeDrops += baseDrops + (this.encoreMode === "long-set" ? 4 : 0) + (headliner ? 5 : 0);
        this.featureDropsPlayed = 0;
        this.featureDropsAwarded = this.freeDrops;
        this.retriggerDropsAwarded = 0;
        this.featureRetriggers = 0;
        if (this.encoreMode === "power-chords") this.multiplier = Math.max(this.multiplier, 3);
        if (headliner) { this.multiplier = Math.max(this.multiplier, 5); this.stageLevel = 3; await this.showHeadlinerIntro(); }
        this.message(`${this.encoreModeLabel()} • ${this.freeDrops} FREE DROPS`);
        await this.showEncoreIntro(false, this.freeDrops);
      }
    }
    if (free) this.encoreWin += total;
    if (free && this.freeDrops === 0 && !feature) {
      const featureWin = this.encoreWin;
      const finale = await this.playGuitarSmash();
      total += finale;
      this.message(`FINAL GUITAR SMASH • +$${(finale / 100).toFixed(2)}`);
      await this.showBonusSummary(featureWin, finale);
      this.encoreWin = 0;
      this.multiplier = 1;
      this.encoreMode = null;
      this.stageEnergy = 0;
      this.stageLevel = 0;
      this.soundboard.clear();
      this.multiplierTiles = 0;
    }
    if (total > 0) {
      this.setWallet(this.getWallet() + total);
      this.onActivity({ type: "win", game: "megh", amount: total, value: total / this.betUnits, wager: this.betUnits });
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
    this.cascadeStreak = 0;
    this.updateInvasionLadder();
    this.update();
    if (!free && this.freeDrops > 0 && !this.bonusAutoRunning) void this.runFreeDrops();
    return feature;
  }
  private async runFreeDrops(): Promise<void> {
    if (this.bonusAutoRunning) return;
    this.bonusAutoRunning = true;
    this.stopAuto();
    while (this.freeDrops > 0) {
      this.message(`NEXT FREE DROP IN 1… • ${this.freeDrops} REMAIN`);
      await this.wait(900);
      await this.spin();
      await this.wait(450);
    }
    this.bonusAutoRunning = false;
    this.update();
  }
  private async playReelRush(host: HTMLElement, finalGrid: JamSymbol[][], free: boolean): Promise<JamSymbol[][]> {
    this.lastSurge = free ? "ALIEN ENCORE INVASION" : this.dealCosmicEvent();
    const unmodifiedGrid = finalGrid.map((row) => [...row]);
    if (!free) finalGrid = this.applyCosmicEvent(finalGrid, this.lastSurge as CosmicEvent);
    const surge = this.root.querySelector<HTMLElement>("[data-megh-surge]")!;
    surge.querySelector("b")!.textContent = this.lastSurge;
    surge.classList.add("active");
    const surgeClass = `surge-${this.lastSurge.toLowerCase().replaceAll(" ", "-")}`;
    host.classList.add("reel-rushing", surgeClass);
    const effect = document.createElement("div");
    effect.className = `cosmic-event ${surgeClass}`;
    effect.innerHTML = this.lastSurge === "UFO SCAN"
      ? `<div class="ufo-rig"><img class="ufo-craft" src="${art("ufo")}" alt="Encore UFO"><i class="scan-beam"></i></div><b>SCANNING REELS</b>`
      : this.lastSurge === "AMPLIFIER OVERLOAD"
        ? `<i class="amp-burst">⚡</i><b>WILD REEL CHARGED</b>`
        : this.lastSurge === "MYSTERY SIGNAL"
          ? `<i class="mystery-pulse">?</i><b>MATCHING SIGNAL LOCKED</b>`
          : this.lastSurge === "STAGGERED REEL RUSH"
            ? `<i class="rush-arrows">↓ ↓ ↓ ↓ ↓ ↓</i><b>UNSTABLE REEL ORDER</b>`
            : this.lastSurge === "GOAT STAMPEDE"
              ? `<div class="goat-track"></div><b>GOAT STAMPEDE</b>`
              : this.lastSurge === "COSMIC COLLISION"
                ? `<i class="cosmic-collision">✦</i><b>SYMBOLS COLLIDE</b>`
            : free ? `<div class="ufo-rig invasion-rig"><img class="invasion-ufo" src="${art("ufo")}" alt="Encore UFO"><i class="invasion-beam"></i></div><b>ALIEN ENCORE INVASION</b>` : "";
    if (effect.innerHTML) host.appendChild(effect);
    const columns = Array.from({ length: COLS }, (_, x) => unmodifiedGrid.map((row) => row[x]!));
    await animateDomReels({
      host,
      finalColumns: columns,
      rows: ROWS,
      randomSymbol: () => this.pick(),
      duration: free ? 1350 : 1550,
      stagger: this.lastSurge === "STAGGERED REEL RUSH" ? 210 : 145,
      fillerRows: 12,
      renderSymbol: (symbol, x, y) => `<div class="jam-symbol s-${symbol.id}" style="--x:${x};--y:${y}"><span>${symbol.label}</span><img src="${symbol.art}" alt="${symbol.label}"><small>${symbol.label}</small></div>`,
    });
    this.render(unmodifiedGrid);
    host.classList.remove("reel-rushing");
    host.classList.add("dropping", "reel-locking");
    if ((!free && this.lastSurge !== "COSMIC WEATHER CLEAR") || free) {
      const label = effect.querySelector("b");
      if (label) label.textContent = `${this.lastSurge} • TARGET ACQUIRED`;
      host.classList.add("event-resolving");
      if (free) {
        const invaded = unmodifiedGrid.map((row) => [...row]);
        const count = 3 + Math.floor(casinoRandom() * 5);
        const used = new Set<string>();
        while (used.size < count) used.add(`${Math.floor(casinoRandom() * COLS)}:${Math.floor(casinoRandom() * ROWS)}`);
        [...used].forEach((key, index) => { const [x = 0, y = 0] = key.split(":").map(Number); invaded[y]![x] = index === 0 ? SYMBOLS.find((item) => item.id === "wild")! : this.pick(); });
        finalGrid = invaded;
      }
      await this.animateCosmicEvent(host, unmodifiedGrid, finalGrid, effect);
      host.classList.add("event-revealed");
      await this.wait(320);
      host.classList.remove("event-resolving", "event-revealed");
    } else this.render(finalGrid);
    await this.wait(380);
    host.classList.remove("dropping", "reel-locking", surgeClass);
    delete host.dataset.locked;
    effect.remove();
    surge.classList.remove("active");
    return finalGrid;
  }
  private dealCosmicEvent(): CosmicEvent {
    if (this.forcedSurge) {
      const forced = this.forcedSurge;
      this.forcedSurge = null;
      return forced;
    }
    if (!this.surgeDeck.length) {
      this.surgeDeck = ["UFO SCAN", "AMPLIFIER OVERLOAD", "MYSTERY SIGNAL", "STAGGERED REEL RUSH", "GOAT STAMPEDE", "COSMIC COLLISION", "COSMIC WEATHER CLEAR"];
      for (let i = this.surgeDeck.length - 1; i > 0; i -= 1) {
        const j = Math.floor(casinoRandom() * (i + 1));
        [this.surgeDeck[i], this.surgeDeck[j]] = [this.surgeDeck[j]!, this.surgeDeck[i]!];
      }
    }
    return this.surgeDeck.pop()!;
  }
  private applyCosmicEvent(grid: JamSymbol[][], event: CosmicEvent): JamSymbol[][] {
    const next = grid.map((row) => [...row]);
    const symbol = (id: string) => SYMBOLS.find((item) => item.id === id)!;
    const uniqueCells = (count: number): Array<[number, number]> => {
      const cells: Array<[number, number]> = [];
      while (cells.length < count) {
        const cell: [number, number] = [Math.floor(casinoRandom() * COLS), Math.floor(casinoRandom() * ROWS)];
        if (!cells.some(([x, y]) => x === cell[0] && y === cell[1])) cells.push(cell);
      }
      return cells;
    };
    if (event === "UFO SCAN") {
      const cells = uniqueCells(3 + Math.floor(casinoRandom() * 4));
      cells.forEach(([x, y], index) => { next[y]![x] = index === 0 ? symbol("wild") : this.pick(); });
    } else if (event === "AMPLIFIER OVERLOAD") {
      const col = Math.floor(casinoRandom() * COLS);
      [1, 2, 3].forEach((row) => { next[row]![col] = symbol("amp"); });
    } else if (event === "MYSTERY SIGNAL") {
      const chosen = ["strawberry", "amp", "guitar", "vinyl", "goat"][Math.floor(casinoRandom() * 5)]!;
      uniqueCells(3 + Math.floor(casinoRandom() * 3)).forEach(([x, y]) => { next[y]![x] = symbol(chosen); });
    } else if (event === "GOAT STAMPEDE") {
      const preferred: Array<[number, number]> = [];
      grid.forEach((row, y) => row.forEach((item, x) => { if (item.id === "strawberry") preferred.push([x, y]); }));
      const targets = [...preferred.sort(() => casinoRandom() - .5), ...uniqueCells(6)].filter((cell, index, all) => all.findIndex(other => other[0] === cell[0] && other[1] === cell[1]) === index).slice(0, 3 + Math.floor(casinoRandom() * 4));
      targets.forEach(([x, y]) => { next[y]![x] = this.pick(); });
    } else if (event === "COSMIC COLLISION") {
      const row = Math.floor(casinoRandom() * (ROWS - 1));
      const col = Math.floor(casinoRandom() * (COLS - 1));
      const chosen = next[row]![col]!;
      next[row]![col + 1] = chosen; next[row + 1]![col] = chosen; next[row + 1]![col + 1] = chosen;
    }
    return next;
  }

  private changedCells(before: JamSymbol[][], after: JamSymbol[][]): string[] {
    const changed: string[] = [];
    for (let y = 0; y < ROWS; y += 1) for (let x = 0; x < COLS; x += 1) {
      if (before[y]![x]!.id !== after[y]![x]!.id) changed.push(`${x}:${y}`);
    }
    return changed;
  }

  private async animateCosmicEvent(host: HTMLElement, before: JamSymbol[][], after: JamSymbol[][], effect: HTMLElement): Promise<void> {
    const changed = this.changedCells(before, after);
    if (!changed.length) return;

    const machine = this.root.querySelector<HTMLElement>(".megh-machine") ?? host;
    const director = new FeatureDirector(machine);
    const machineRect = machine.getBoundingClientRect();
    const nodes = changed
      .map((key) => host.querySelector<HTMLElement>(`[data-cell="${key}"]`))
      .filter((node): node is HTMLElement => Boolean(node));

    const centerInMachine = (node: HTMLElement): DOMPoint => {
      const rect = node.getBoundingClientRect();
      return new DOMPoint(
        rect.left - machineRect.left + rect.width / 2,
        rect.top - machineRect.top + rect.height / 2,
      );
    };

    nodes.forEach((node, index) => {
      node.style.setProperty("--event-delay", `${index * 130}ms`);
      node.classList.add("event-target");
    });

    effect.querySelector("b")?.remove();

    if (this.lastSurge === "UFO SCAN" || this.lastSurge === "ALIEN ENCORE INVASION") {
      window.dispatchEvent(new CustomEvent("casino:sound", { detail: { cue: "ufo" } }));
      effect.remove();
      const actor = director.characters.create(
        "megh-ufo-actor",
        `<img src="${art("ufo")}" alt="Encore UFO"><i class="megh-ufo-beam"></i>`,
      );
      const reelRect = host.getBoundingClientRect();
      const boardTop = reelRect.top - machineRect.top;
      const startPoint = new DOMPoint(-120, Math.max(24, boardTop - 86));
      director.characters.position(actor, startPoint.x, startPoint.y);
      const boardEntry = new DOMPoint(reelRect.left - machineRect.left + reelRect.width * 0.5 - 46, Math.max(24, boardTop - 86));
      await director.characters.move(actor, startPoint, boardEntry, { duration: 720 });
      actor.dataset.x = String(boardEntry.x); actor.dataset.y = String(boardEntry.y);

      for (const node of nodes) {
        const target = centerInMachine(node);
        const hover = new DOMPoint(target.x - 46, Math.max(24, target.y - 142));
        const current = new DOMPoint(
          Number(actor.dataset.x ?? machineRect.width * 0.5),
          Number(actor.dataset.y ?? 26),
        );
        await director.characters.move(actor, current, hover, { duration: 520 });
        actor.dataset.x = String(hover.x);
        actor.dataset.y = String(hover.y);
        actor.classList.add("is-locking");
        await this.wait(300);
        actor.classList.add("is-firing");
        window.dispatchEvent(new CustomEvent("casino:sound", { detail: { cue: "beam" } }));
        node.classList.add("abducting-readable");
        await node.animate(
          [
            { transform: "translate3d(0,0,0) scale(1)", opacity: 1, filter: "brightness(1)" },
            { transform: "translate3d(0,-45px,0) scale(.82) rotate(4deg)", opacity: .88, filter: "brightness(1.5)" },
            { transform: "translate3d(0,-125px,0) scale(.18) rotate(18deg)", opacity: 0, filter: "brightness(2)" },
          ],
          { duration: 980, easing: "cubic-bezier(.2,.7,.25,1)", fill: "forwards" },
        ).finished.catch(() => undefined);
        await director.shake("soft", 180);
        actor.classList.remove("is-firing", "is-locking");
        await this.wait(180);
      }

      director.burst(host, "✦", 18, "cosmic-particle");
      const exitFrom = new DOMPoint(Number(actor.dataset.x ?? machineRect.width * .5), Number(actor.dataset.y ?? 26));
      await director.characters.move(actor, exitFrom, new DOMPoint(machineRect.width + 160, -90), { duration: 760 });
      actor.remove();
    } else if (this.lastSurge === "GOAT STAMPEDE") {
      window.dispatchEvent(new CustomEvent("casino:sound", { detail: { cue: "goat" } }));
      effect.remove();
      for (let index = 0; index < nodes.length; index += 1) {
        const node = nodes[index]!;
        const target = centerInMachine(node);
        const actor = director.characters.create(
          `megh-goat-actor goat-variant-${index % 4}`,
          `<img src="${art("goat")}" alt="Space goat">`,
        );
        const entry = new DOMPoint(-125, target.y - 56);
        const approach = new DOMPoint(Math.max(12, target.x - 105), target.y - 56);
        director.characters.position(actor, entry.x, entry.y);
        actor.classList.add("is-running");
        await director.characters.move(actor, entry, approach, { duration: 900, easing: "cubic-bezier(.18,.72,.24,1)" });
        actor.classList.remove("is-running");
        actor.classList.add("is-sniffing");
        node.classList.add("goat-marked-readable");
        await this.wait(620);
        actor.classList.remove("is-sniffing");
        actor.classList.add("is-chomping");
        window.dispatchEvent(new CustomEvent("casino:sound", { detail: { cue: "chomp" } }));
        node.classList.add("goat-eaten-readable");
        director.burst(node, "•", 10, "crumb-particle");
        await director.shake("soft", 180);
        await this.wait(820);
        actor.classList.remove("is-chomping");
        actor.classList.add("is-running");
        await director.characters.move(actor, approach, new DOMPoint(machineRect.width + 140, target.y - 56), { duration: 850, easing: "cubic-bezier(.3,.05,.75,.25)" });
        actor.remove();
        await this.wait(160);
      }
    } else {
      nodes.forEach((node) => node.classList.add("cosmic-mutating"));
      director.burst(host, "✦", 12, "cosmic-particle");
      await director.shake("soft", 220);
      await this.wait(900);
      effect.remove();
    }

    host.classList.add("event-gravity-lock");
    nodes.forEach((node) => node.classList.add("event-hole"));
    await this.wait(240);
    this.render(after);
    const fresh = changed
      .map((key) => host.querySelector<HTMLElement>(`[data-cell="${key}"]`))
      .filter((node): node is HTMLElement => Boolean(node));
    fresh.forEach((node, index) => {
      node.style.setProperty("--event-delay", `${index * 110}ms`);
      node.style.animationDelay = `${index * 110}ms`;
      node.classList.add("event-replacement-v74");
    });
    await this.wait(1050 + fresh.length * 60);
    host.classList.remove("event-gravity-lock");
    this.gameState.transition("EVALUATING", true);
  }
  private updateInvasionLadder(): void {
    this.root.querySelectorAll<HTMLElement>("[data-chain]").forEach((node) => node.classList.toggle("lit", Number(node.dataset.chain) <= this.cascadeStreak));
    const label = this.root.querySelector<HTMLElement>("[data-chain-prize]");
    if (label) label.textContent = this.cascadeStreak >= 8 ? "MAXIMUM INVASION • 50 FREE DROPS" : this.cascadeStreak >= 4 ? "ENCORE UNLOCKED • KEEP CASCADING" : "4 CASCADES = ENCORE • 8 = 50 DROPS";
  }
  private chargeSoundboard(symbols: string[]): void {
    const map: Record<string, string> = { amp: "BASS", guitar: "LEAD", goat: "DRUMS", megh: "VOCALS", ufo: "UFO", vinyl: "BASS", strawberry: "VOCALS" };
    symbols.forEach((symbol) => { const channel = map[symbol]; if (channel) this.soundboard.add(channel); });
    this.root.querySelectorAll<HTMLElement>("[data-channel]").forEach((node) => node.classList.toggle("charged", this.soundboard.has(node.dataset.channel ?? "")));
  }
  private async showHeadlinerIntro(): Promise<void> {
    const overlay = document.createElement("div");
    overlay.className = "feature-cinematic cosmic-cinematic headliner-mode";
    overlay.innerHTML = `<div class="cosmic-portal"></div><small>ALL FIVE CHANNELS CHARGED</small><h2>HEADLINER MODE</h2><p>5× START • +5 DROPS • PERSISTENT MULTIPLIER TILES</p>`;
    this.root.appendChild(overlay); await this.wait(2200); overlay.classList.add("leaving"); await this.wait(420); overlay.remove();
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
    this.betModel.changeCredits(direction);
    this.lastDisplayedWin = 0;
    this.update();
  }
  private changeDenom(direction: number): void {
    if (this.spinning || this.freeDrops > 0) return;
    this.betModel.changeDenomination(direction); this.lastDisplayedWin = 0; this.update();
  }
  private setMaxBet(): void {
    if (this.spinning || this.freeDrops > 0) return;
    this.betModel.maxBet();
    this.lastDisplayedWin = 0;
    this.message(`MAX BET ARMED • $${(this.betUnits / 100).toFixed(2)} • PRESS DROP`);
    this.update();
  }
  private update(): void {
    const credit = this.root.querySelector<HTMLElement>("[data-megh-credit]");
    if (!credit) return;
    credit.textContent = `$${(this.getWallet() / 100).toFixed(2)}`;
    const ledgerCredit = this.root.querySelector<HTMLElement>("[data-megh-ledger-credit]");
    const ledgerWin = this.root.querySelector<HTMLElement>("[data-megh-ledger-win]");
    const ledgerBonus = this.root.querySelector<HTMLElement>("[data-megh-ledger-bonus]");
    if (ledgerCredit) ledgerCredit.textContent = `$${(this.getWallet() / 100).toFixed(2)}`;
    if (ledgerWin) ledgerWin.textContent = `$${(this.lastDisplayedWin / 100).toFixed(2)}`;
    if (ledgerBonus) ledgerBonus.textContent = `$${(this.encoreWin / 100).toFixed(2)}`;
    this.root.querySelector<HTMLElement>("[data-megh-bet]")!.textContent =
      `$${(this.betUnits / 100).toFixed(2)}`;
    this.root.querySelector<HTMLElement>("[data-megh-denom]")!.textContent = `${this.betModel.denominationUnits}¢`;
    this.root.querySelector<HTMLElement>("[data-megh-credits]")!.textContent = String(this.betModel.credits);
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
        "[data-megh-bet-down],[data-megh-bet-up],[data-megh-denom-down],[data-megh-denom-up]",
      )
      .forEach((button) => {
        button.disabled = this.spinning || this.freeDrops > 0;
      });
    spin.textContent = this.bonusAutoRunning ? "ENCORE RUNNING" : this.freeDrops > 0 ? "FREE DROP" : "DROP";
    this.root.querySelector<HTMLElement>("[data-megh-auto]")!.textContent =
      this.auto === null
        ? "AUTO"
        : `STOP ${this.auto === "infinite" ? "∞" : this.auto}`;
    const feature = this.root.querySelector<HTMLElement>(
      "[data-megh-feature]",
    )!;
    feature.hidden = this.freeDrops <= 0;
    this.root.querySelector<HTMLElement>("[data-megh-freedrops]")!.textContent =
      this.freeDrops > 0 ? `DROP ${this.featureDropsPlayed + 1} OF ${this.featureDropsAwarded} • ${this.freeDrops} REMAIN` : "";
    this.root.querySelector<HTMLElement>(
      "[data-megh-feature-multi]",
    )!.textContent = `LIVE ${this.multiplier}× • BONUS WIN $${(this.encoreWin / 100).toFixed(2)}`;
    this.root.querySelector<HTMLElement>("[data-megh-stage]")!.textContent =
      `${this.stageName()} • AMP ${Math.min(this.stageEnergy, 60)} / 60`;
  }
  private qaResult(message: string, ok = true): void { window.dispatchEvent(new CustomEvent("casino:qa-result", { detail: { message, ok } })); }
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
    const guitars = [
      { name: "NEON AXE", icon: "⚡", copy: "MULTIPLY THE ENCORE", factor: .22 },
      { name: "COSMIC BASS", icon: "🛸", copy: "COLLECT MULTIPLIER TILES", factor: .15 },
      { name: "STARBREAKER", icon: "★", copy: "FIVE FINAL POWER CHORDS", factor: .1 },
    ].sort(() => casinoRandom() - 0.5);
    const overlay = document.createElement("div");
    overlay.className = "feature-cinematic cosmic-cinematic guitar-smash";
    overlay.innerHTML = `<small>ENCORE FINALE</small><h2>GUITAR SMASH</h2><p>CHOOSE YOUR WEAPON</p><div>${guitars.map((g, i) => `<button data-guitar="${i}"><i>${g.icon}</i><b>${g.name}</b><span>${g.copy}</span></button>`).join("")}</div>`;
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
      Math.round(this.encoreWin * guitars[pick]!.factor),
    );
    overlay.querySelector("p")!.textContent =
      `${guitars[pick]!.name} SMASH PAYS $${(award / 100).toFixed(2)}`;
    overlay.classList.add("revealed");
    await this.wait(1400);
    overlay.remove();
    return award;
  }
  private async showWinTier(award: number): Promise<void> {
    const multiple = award / this.betUnits;
    const tier =
      multiple >= 100
        ? "INTERGALACTIC WIN"
        : multiple >= 50
          ? "COLOSSAL WIN"
          : multiple >= 25
            ? "EPIC WIN"
            : multiple >= 10
              ? "MEGA WIN"
              : multiple >= 5
                ? "BIG WIN"
                : multiple >= 2
                  ? "NICE WIN"
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
  private async showBonusSummary(baseWin: number, finale: number): Promise<void> {
    const overlay = document.createElement("div");
    overlay.className = "feature-cinematic cosmic-cinematic bonus-summary";
    overlay.innerHTML = `<small>ENCORE COMPLETE</small><h2>FINAL SET LIST</h2><div class="bonus-summary-grid"><span>DROPS PLAYED <b>${this.featureDropsPlayed}</b></span><span>RETRIGGERS <b>${this.featureRetriggers}</b></span><span>HIGHEST MULTIPLIER <b>${this.multiplier}×</b></span><span>CASCADE WIN <b>$${(baseWin / 100).toFixed(2)}</b></span><span>GUITAR SMASH <b>$${(finale / 100).toFixed(2)}</b></span><strong>TOTAL BONUS $${((baseWin + finale) / 100).toFixed(2)}</strong></div>`;
    this.root.appendChild(overlay);
    await this.wait(2600);
    overlay.classList.add("leaving");
    await this.wait(420);
    overlay.remove();
  }
  private showRules(): void {
    const modal = document.createElement("div");
    modal.className = "slot-rules-backdrop";
    modal.innerHTML = `<section class="slot-rules cosmic-rules"><button data-close>×</button><small>MEGH'S COSMIC JAM</small><h2>HOW TO PLAY</h2><p>Clusters of 6 or more matching symbols pay anywhere. Winning symbols are tractor-beamed away and new symbols tumble into the empty spaces.</p><h3>COSMIC SOUNDBOARD</h3><ul><li>Cascades charge Bass, Lead, Drums, Vocals and UFO channels.</li><li>Three charged channels can launch Encore; all five launch Headliner Mode.</li><li>Headliner begins at 5× with five extra drops and persistent multiplier tiles.</li></ul><h3>INTERGALACTIC ENCORE</h3><ul><li>Choose Long Set, Power Chords or UFO Storm.</li><li>The multiplier persists and the stage upgrades through Galactic Headliner.</li><li>UFOs retrigger; Guitar Smash adds a player-picked finale.</li></ul><p class="rules-note">Fictional credits only.</p></section>`;
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
