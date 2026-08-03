type AutoCount = number | "infinite" | null;

interface SeaSymbol { readonly id: string; readonly art: string; readonly label: string; readonly weight: number; readonly pay: readonly [number, number, number]; }
const art = (name: string): string => new URL(`../../assets/neema/${name}.png`, import.meta.url).href;

const SYMBOLS: readonly SeaSymbol[] = [
  { id: "cranberry", art: art("cocktail"), label: "HAPPY HOUR", weight: 18, pay: [2, 5, 12] },
  { id: "mac", art: art("mac"), label: "MAC ATTACK", weight: 18, pay: [2, 4, 10] },
  { id: "luggage", art: art("luggage"), label: "LUGGAGE", weight: 17, pay: [1, 4, 8] },
  { id: "helmet", art: art("helmet"), label: "BUFFALO", weight: 14, pay: [3, 7, 16] },
  { id: "wheel", art: art("wheel"), label: "SHIP WHEEL", weight: 12, pay: [4, 10, 24] },
  { id: "captain", art: art("captain-neema-v2"), label: "CAPTAIN NEEMA", weight: 8, pay: [7, 18, 45] },
  { id: "wild", art: art("sunset"), label: "SUNSET WILD", weight: 7, pay: [8, 22, 60] },
  { id: "ticket", art: art("ticket"), label: "CRUISE TICKET", weight: 2.5, pay: [0, 0, 0] },
];
const REELS = 5; const ROWS = 3; const BET = 100;
const LINES = [[0,0,0,0,0],[1,1,1,1,1],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2]] as const;
const CABINS = ["INTERIOR CABIN", "OCEAN VIEW", "BALCONY", "LUXURY SUITE", "CAPTAIN'S DECK"] as const;

export class NeemasHighSeas {
  private auto: AutoCount = null;
  private stopRequested = false;
  private spinning = false;
  private freeSpins = 0;
  private cabin = 0;
  private bonusMultiplier = 1;
  private bonusWin = 0;

  public constructor(
    private readonly root: HTMLElement,
    private readonly getWallet: () => number,
    private readonly setWallet: (units: number) => void,
    private readonly onExit: () => void,
  ) {}

  public open(): void {
    this.root.innerHTML = `<main class="neema-room">
      <button class="back" data-neema-home>← CASINO LOBBY</button><div class="table-wallet">WALLET <b data-neema-wallet></b></div>
      <header><small>BEARD LAWS CASINO PRESENTS • PREMIER FEATURE SLOT</small><h1>NEEMA'S HIGH SEAS HAPPY HOUR</h1><p>Cruise luxury, football Sundays, comfort food, and absolutely no sensible last call.</p><button class="game-rules" data-neema-rules>RULES &amp; PAYTABLE</button></header>
      <section class="neema-machine"><div class="ocean-lights"></div><div class="neema-marquee"><span>HAPPY HOUR WILDS</span><strong>CAPTAIN NEEMA'S PREMIER VOYAGE</strong><span>LAST CALL FINALE</span></div><div class="cabin-track">${CABINS.map((name,i)=>`<span data-cabin="${i}">${name}</span>`).join("")}</div>
        <div class="neema-message" data-neema-message>WELCOME ABOARD</div><div class="slot-win-callout neema-win-callout" data-neema-callout hidden></div><div class="feature-readout" data-neema-feature hidden><b data-neema-freespins></b><span data-neema-multiplier></span></div><div class="neema-reels" data-neema-reels></div>
        <div class="neema-feature-bar"><span>HAPPY HOUR WILDS</span><span>CABIN UPGRADES</span><span>LAST CALL</span></div>
        <div class="neema-controls"><div><small>CREDIT</small><b data-neema-credit></b></div><div><small>BET</small><b>$1.00</b></div><div><small>WIN</small><b data-neema-win>$0.00</b></div>
          <button data-neema-auto>AUTO</button><button class="neema-spin" data-neema-spin>SPIN</button></div>
        <div class="neema-auto-menu" data-neema-menu hidden>${[5,10,25,50].map(n=>`<button data-auto="${n}">${n}</button>`).join("")}<button data-auto="infinite">∞</button></div>
      </section><p class="neema-disclaimer">Fictional credits only • Three Cruise Tickets award 8 free spins • Cabin upgrades increase the multiplier</p>
    </main>`;
    this.root.querySelector("[data-neema-home]")?.addEventListener("click", () => this.onExit());
    this.root.querySelector("[data-neema-rules]")?.addEventListener("click", () => this.showRules());
    this.root.querySelector("[data-neema-spin]")?.addEventListener("click", () => { void this.spin(); });
    this.root.querySelector("[data-neema-auto]")?.addEventListener("click", () => this.toggleAuto());
    this.root.querySelectorAll<HTMLElement>("[data-auto]").forEach(button => button.addEventListener("click", () => this.startAuto(button.dataset.auto === "infinite" ? "infinite" : Number(button.dataset.auto))));
    void this.preloadArt().finally(() => { this.renderGrid(this.makeGrid()); this.update(); });
  }

  private async preloadArt(): Promise<void> {
    await Promise.all(SYMBOLS.map((symbol) => new Promise<void>((resolve) => {
      const image = new Image(); image.onload = () => resolve(); image.onerror = () => resolve(); image.src = symbol.art;
    })));
  }

  private pick(): SeaSymbol {
    let roll = Math.random() * SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
    for (const symbol of SYMBOLS) { roll -= symbol.weight; if (roll < 0) return symbol; }
    return SYMBOLS[0]!;
  }
  private makeGrid(): SeaSymbol[][] { return Array.from({ length: REELS }, () => Array.from({ length: ROWS }, () => this.pick())); }
  private renderGrid(grid: SeaSymbol[][], winners = new Set<string>()): void {
    const host = this.root.querySelector<HTMLElement>("[data-neema-reels]")!;
    host.classList.toggle("has-win", winners.size > 0);
    host.innerHTML = grid.flatMap((reel, reelIndex) => reel.map((symbol,row)=>`<div class="sea-symbol s-${symbol.id}${winners.has(`${reelIndex}:${row}`) ? " winner" : ""}" style="grid-column:${reelIndex+1};grid-row:${row+1};--reel:${reelIndex}" title="${symbol.label}"><span>${symbol.label}</span><img src="${symbol.art}" alt="${symbol.label}" draggable="false" onload="this.parentElement.classList.add('art-ready')" onerror="this.hidden=true;this.parentElement.classList.add('art-failed')"><small>${symbol.label}</small></div>`)).join("");
  }
  private evaluate(grid: SeaSymbol[][]): { award: number; winners: Set<string>; summary: string } {
    let totalX = 0;
    const winners = new Set<string>();
    const hits: string[] = [];
    for (const [lineIndex, line] of LINES.entries()) {
      const first = grid[0]![line[0]]!;
      const base = first.id === "wild" ? grid.slice(1).map((reel,index)=>reel[line[index+1]!]!).find(s=>s.id!=="wild" && s.id!=="ticket") ?? first : first;
      if (base.id === "ticket") continue;
      let length = 0;
      for (let reel=0; reel<REELS; reel+=1) { const symbol=grid[reel]![line[reel]!]!; if(symbol.id===base.id||symbol.id==="wild") length+=1; else break; }
      if (length >= 3) {
        totalX += base.pay[length-3] ?? 0;
        hits.push(`LINE ${lineIndex + 1} • ${length} ${base.label}`);
        for (let reel = 0; reel < length; reel += 1) winners.add(`${reel}:${line[reel]}`);
      }
    }
    // Five displayed lines share one $1 wager. The early-access base game is
    // intentionally conservative so the upgrade/free-spin economy has room.
    return { award: Math.round(totalX * BET * 0.59), winners, summary: hits.join("  +  ") };
  }
  private async spin(): Promise<boolean> {
    if (this.spinning) return false;
    const free = this.freeSpins > 0;
    if (!free && this.getWallet() < BET) { this.message("VISIT THE ATM"); this.stopAuto(); return false; }
    this.spinning = true; if (!free) this.setWallet(this.getWallet()-BET); else this.freeSpins-=1;
    this.message(free ? `FREE SPIN • ${this.freeSpins} REMAIN` : "SAILING..."); this.update();
    const reels=this.root.querySelector<HTMLElement>("[data-neema-reels]")!; reels.classList.remove("has-win"); reels.classList.add("spinning");
    for (let frame=0; frame<7; frame+=1) { this.renderGrid(this.makeGrid()); await new Promise<void>(resolve=>window.setTimeout(resolve,110 + frame*18)); }
    const grid=this.makeGrid(); reels.classList.remove("spinning");
    const result=this.evaluate(grid); let award=result.award; const tickets=grid.flat().filter(s=>s.id==="ticket").length;
    if (free) {
      award=Math.round(award*this.bonusMultiplier);
      if(this.freeSpins>0 && this.freeSpins%2===0) { this.cabin=Math.min(4,this.cabin+1); this.bonusMultiplier=1+this.cabin; this.message(`UPGRADED TO ${CABINS[this.cabin]} • ${this.bonusMultiplier}×`); }
      this.bonusWin += award;
    }
    if (tickets>=3) {
      const retrigger = free;
      this.freeSpins += retrigger ? 5 : 10; this.cabin=Math.min(4,this.cabin+1); this.bonusMultiplier=1+this.cabin;
      this.message(retrigger ? "CRUISE TICKET RETRIGGER • +5 SPINS" : "ALL ABOARD • 10 FREE SPINS");
    }
    else if(award>0) this.message(award>=BET*10 ? "SUITE-SIZED WIN!" : "CHEERS, NEEMA!");
    else if(free && this.freeSpins===0) { const lastCall=Math.max(BET,Math.round(this.bonusWin*.1)); award+=lastCall; this.message(`LAST CALL FINALE • +$${(lastCall/100).toFixed(2)}`); this.cabin=0; this.bonusMultiplier=1; this.bonusWin=0; }
    else this.message(free ? "THE ENCORE CONTINUES" : "WELCOME ABOARD");
    this.renderGrid(grid, result.winners);
    const callout=this.root.querySelector<HTMLElement>("[data-neema-callout]")!;
    callout.hidden=award<=0; callout.textContent=award>0?`${result.summary || "VOYAGE WIN"}  •  $${(award/100).toFixed(2)}`:"";
    if(award>0) { this.setWallet(this.getWallet()+award); await new Promise<void>(resolve=>window.setTimeout(resolve,850)); }
    this.root.querySelector<HTMLElement>("[data-neema-win]")!.textContent=`$${(award/100).toFixed(2)}`;
    this.spinning=false; this.update(); return tickets>=3;
  }
  private toggleAuto(): void { if(this.auto!==null){this.stopRequested=true;this.message("AUTO STOPS AFTER THIS SPIN");return;} const menu=this.root.querySelector<HTMLElement>("[data-neema-menu]")!;menu.hidden=!menu.hidden; }
  private startAuto(count: Exclude<AutoCount,null>): void { if(this.spinning)return;this.auto=count;this.stopRequested=false;this.root.querySelector<HTMLElement>("[data-neema-menu]")!.hidden=true;void this.runAuto(); }
  private async runAuto(): Promise<void> { while(this.auto!==null&&!this.stopRequested){const feature=await this.spin();if(this.auto===null)return;if(this.auto!=="infinite"){this.auto-=1;if(this.auto<=0){this.stopAuto();return;}}if(feature){this.stopAuto();return;}this.update();await new Promise<void>(r=>window.setTimeout(r,400));}this.stopAuto(); }
  private stopAuto(): void { this.auto=null;this.stopRequested=false;this.update(); }
  private message(text:string):void{const node=this.root.querySelector<HTMLElement>("[data-neema-message]");if(node)node.textContent=text;}
  private update():void{const wallet=`$${(this.getWallet()/100).toFixed(2)}`;this.root.querySelector<HTMLElement>("[data-neema-wallet]")!.textContent=wallet;this.root.querySelector<HTMLElement>("[data-neema-credit]")!.textContent=wallet;const spin=this.root.querySelector<HTMLButtonElement>("[data-neema-spin]")!;spin.disabled=this.spinning||this.auto!==null||(this.freeSpins===0&&this.getWallet()<BET);spin.textContent=this.freeSpins>0?"FREE SPIN":"SPIN";const auto=this.root.querySelector<HTMLElement>("[data-neema-auto]")!;auto.textContent=this.auto===null?"AUTO":`STOP ${this.auto==="infinite"?"∞":this.auto}`;this.root.querySelectorAll<HTMLElement>("[data-cabin]").forEach((node,i)=>node.classList.toggle("active",i<=this.cabin));const feature=this.root.querySelector<HTMLElement>("[data-neema-feature]")!;feature.hidden=this.freeSpins<=0;this.root.querySelector<HTMLElement>("[data-neema-freespins]")!.textContent=`${this.freeSpins} FREE SPINS`;this.root.querySelector<HTMLElement>("[data-neema-multiplier]")!.textContent=`CABIN MULTIPLIER ${this.bonusMultiplier}×`;}
  private showRules():void{const modal=document.createElement("div");modal.className="slot-rules-backdrop";modal.innerHTML=`<section class="slot-rules sea-rules"><button data-close>×</button><small>NEEMA'S HIGH SEAS HAPPY HOUR</small><h2>HOW TO PLAY</h2><p>Five fixed paylines pay left to right. Sunset substitutes for every paying symbol. Three or more Cruise Tickets anywhere launch 10 free spins.</p><h3>CABIN UPGRADE BONUS</h3><ul><li>Begin in the Interior Cabin and upgrade during the voyage.</li><li>Each cabin raises the free-spin multiplier up to 5×.</li><li>Three Tickets during free spins retrigger 5 more.</li><li>Last Call adds a finale award when the voyage ends.</li></ul><h3>TOP SYMBOLS</h3><p>Captain Neema • Sunset Wild • Ship Wheel • Buffalo Helmet</p><p class="rules-note">Five displayed lines share the $1.00 wager. Fictional credits only.</p></section>`;document.body.appendChild(modal);modal.querySelector("[data-close]")?.addEventListener("click",()=>modal.remove());modal.addEventListener("click",event=>{if(event.target===modal)modal.remove();});}
}
