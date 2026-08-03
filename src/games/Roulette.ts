type PocketColor = "green" | "red" | "black";
type BetKind = "straight" | "split" | "street" | "corner" | "firstfive" | "sixline" | "red" | "black" | "odd" | "even" | "low" | "high" | "dozen1" | "dozen2" | "dozen3" | "column1" | "column2" | "column3";

type Bet = { kind: BetKind; label: string; units: number; pocket?: string };

const RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
export const ROULETTE_POCKETS = ["0","28","9","26","30","11","7","20","32","17","5","22","34","15","3","24","36","13","1","00","27","10","25","29","12","8","19","31","18","6","21","33","16","4","23","35","14","2"];

const POCKET_ARC_DEGREES = 360 / ROULETTE_POCKETS.length;
export const ROYAL_LANDING_ANGLE = 0;
export const BEARDFALL_LANDING_ANGLE = 180;
export const ROYAL_SPIN_DURATION_MS = 13_400;
export const BEARDFALL_SPIN_DURATION_MS = 15_600;
export const ROYAL_BALL_LANDING_INSET_PERCENT = 3.5;
export const ROYAL_BALL_FINAL_ROTATION_DEGREES = -3240;

/**
 * Returns the wheel's final clockwise rotation for a result pocket.
 * Royal Roulette resolves beneath the top pointer (0deg). Beardfall's ball
 * enters the numbered ring at the bottom of the drop chamber (180deg).
 */
export const wheelLandingRotation = (result: string, freeFall: boolean, fullSpins = 5): number => {
  const index = ROULETTE_POCKETS.indexOf(result);
  if (index < 0) throw new Error(`Unknown roulette pocket: ${result}`);
  const landingAngle = freeFall ? BEARDFALL_LANDING_ANGLE : ROYAL_LANDING_ANGLE;
  return fullSpins * 360 + landingAngle - index * POCKET_ARC_DEGREES;
};

export const displayedPocketAtLanding = (rotation: number, freeFall: boolean): string => {
  const landingAngle = freeFall ? BEARDFALL_LANDING_ANGLE : ROYAL_LANDING_ANGLE;
  const normalizedIndex = Math.round((landingAngle - rotation) / POCKET_ARC_DEGREES);
  const index = ((normalizedIndex % ROULETTE_POCKETS.length) + ROULETTE_POCKETS.length) % ROULETTE_POCKETS.length;
  return ROULETTE_POCKETS[index]!;
};

export class RouletteGame {
  private bets: Bet[] = [];
  private lastBets: Bet[] = [];
  private chipUnits = 500;
  private spinning = false;
  private lastResults: string[] = [];
  private message = "Place one or more bets, then launch the wheel.";
  private landedResult: string | null = null;
  private forcedResult: string | null = null;

  public constructor(
    private readonly root: HTMLElement,
    private readonly freeFall: boolean,
    private readonly getWallet: () => number,
    private readonly setWallet: (units: number) => void,
    private readonly goLobby: () => void,
  ) {}

  public open(): void { window.addEventListener("casino:dev", this.handleDeveloperAction as EventListener); this.render(); }
  private readonly handleDeveloperAction = (event: CustomEvent<{ action: string; result?: string }>): void => {
    if (event.detail.action !== "roulette-result" || this.spinning) return;
    if (!ROULETTE_POCKETS.includes(event.detail.result ?? "")) return;
    this.forcedResult = event.detail.result!; this.message = `TEST LAB ARMED: next result will be ${this.forcedResult}.`; this.render();
  };

  private money(units: number): string { return `$${(units / 100).toFixed(2)}`; }
  private totalBet(): number { return this.bets.reduce((sum, bet) => sum + bet.units, 0); }
  private colorOf(pocket: string): PocketColor { return pocket === "0" || pocket === "00" ? "green" : RED.has(Number(pocket)) ? "red" : "black"; }

  private coveredPockets(bet: Bet): string[] {
    if (bet.pocket) return bet.pocket.split("|");
    return ROULETTE_POCKETS.filter((pocket) => {
      if (pocket === "0" || pocket === "00") return false;
      const number = Number(pocket);
      if (bet.kind === "red" || bet.kind === "black") return this.colorOf(pocket) === bet.kind;
      if (bet.kind === "odd") return number % 2 === 1;
      if (bet.kind === "even") return number % 2 === 0;
      if (bet.kind === "low") return number >= 1 && number <= 18;
      if (bet.kind === "high") return number >= 19 && number <= 36;
      if (bet.kind.startsWith("dozen")) return Math.ceil(number / 12) === Number(bet.kind.at(-1));
      if (bet.kind.startsWith("column")) return ((number - 1) % 3) + 1 === Number(bet.kind.at(-1));
      return false;
    });
  }

  private randomPocket(): string {
    const max = Math.floor(0x100000000 / ROULETTE_POCKETS.length) * ROULETTE_POCKETS.length;
    const random = new Uint32Array(1);
    do crypto.getRandomValues(random); while (random[0]! >= max);
    return ROULETTE_POCKETS[random[0]! % ROULETTE_POCKETS.length]!;
  }

  private returnMultiplier(bet: Bet, result: string): number {
    const number = Number(result);
    if (bet.kind === "straight") return bet.pocket === result ? 36 : 0;
    if (["split", "street", "corner", "firstfive", "sixline"].includes(bet.kind)) {
      const covered = bet.pocket?.split("|") ?? [];
      const returns: Record<string, number> = { split: 18, street: 12, corner: 9, firstfive: 7, sixline: 6 };
      return covered.includes(result) ? returns[bet.kind]! : 0;
    }
    if (result === "0" || result === "00") return 0;
    if (bet.kind === "red" || bet.kind === "black") return this.colorOf(result) === bet.kind ? 2 : 0;
    if (bet.kind === "odd") return number % 2 ? 2 : 0;
    if (bet.kind === "even") return number % 2 === 0 ? 2 : 0;
    if (bet.kind === "low") return number <= 18 ? 2 : 0;
    if (bet.kind === "high") return number >= 19 ? 2 : 0;
    if (bet.kind.startsWith("dozen")) return Math.ceil(number / 12) === Number(bet.kind.at(-1)) ? 3 : 0;
    if (bet.kind.startsWith("column")) return ((number - 1) % 3) + 1 === Number(bet.kind.at(-1)) ? 3 : 0;
    return 0;
  }

  private addBet(kind: BetKind, label: string, pocket?: string): void {
    if (this.spinning || this.totalBet() + this.chipUnits > this.getWallet()) {
      this.message = "That chip would exceed your available wallet.";
      this.render();
      return;
    }
    this.bets.push(pocket === undefined
      ? { kind, label, units: this.chipUnits }
      : { kind, label, pocket, units: this.chipUnits });
    this.message = `${this.money(this.chipUnits)} placed on ${label}.`;
    this.render();
  }

  private board(): string {
    const betCount = (kind: BetKind, pocket?: string) => this.bets.filter((bet) => bet.kind === kind && bet.pocket === pocket).reduce((sum, bet) => sum + bet.units, 0);
    const button = (kind: BetKind, label: string, pocket?: string, classes = "") => {
      const units = betCount(kind, pocket);
      return `<button class="roulette-bet ${classes} ${units ? "has-bet" : ""}" data-kind="${kind}" data-label="${label}" ${pocket ? `data-pocket="${pocket}"` : ""}><span>${label}</span>${units ? `<b>${this.money(units)}</b>` : ""}</button>`;
    };
    const insideHotspot = (kind: BetKind, label: string, pockets: string[], style: string, mark: string) => {
      const key = pockets.join("|");
      const units = betCount(kind, key);
      return `<button class="inside-hotspot ${units ? "has-bet" : ""}" style="${style}" data-kind="${kind}" data-label="${label}" data-pocket="${key}" title="${label}"><span>${mark}</span>${units ? `<b>${this.money(units)}</b>` : ""}</button>`;
    };
    const spots: string[] = [];
    // Horizontal table splits: 1/2 and 2/3 inside each three-number street.
    for (let c=0;c<12;c++) for (let r=0;r<2;r++) {
      const low=c*3+r+1, high=low+1;
      spots.push(insideHotspot("split",`${low}/${high}`,[String(low),String(high)],`--x:${(c+.5)/12*100}%;--y:${(2-r)/3*100}%`,"2"));
    }
    // Vertical splits between neighboring streets, plus corners where four numbers meet.
    for (let c=0;c<11;c++) for (let r=0;r<3;r++) {
      const left=c*3+r+1, right=left+3;
      spots.push(insideHotspot("split",`${left}/${right}`,[String(left),String(right)],`--x:${(c+1)/12*100}%;--y:${(2.5-r)/3*100}%`,"2"));
    }
    for (let c=0;c<11;c++) for (let r=0;r<2;r++) {
      const a=c*3+r+1;
      spots.push(insideHotspot("corner",`${a}/${a+1}/${a+3}/${a+4}`,[a,a+1,a+3,a+4].map(String),`--x:${(c+1)/12*100}%;--y:${(2-r)/3*100}%`,"4"));
    }
    for (let c=0;c<12;c++) spots.push(insideHotspot("street",`${c*3+1}-${c*3+3}`,[1,2,3].map(n=>String(c*3+n)),`--x:${(c+.5)/12*100}%;--y:100%`,"3"));
    for (let c=0;c<11;c++) spots.push(insideHotspot("sixline",`${c*3+1}-${c*3+6}`,Array.from({length:6},(_,i)=>String(c*3+i+1)),`--x:${(c+1)/12*100}%;--y:100%`,"6"));
    return `<div class="roulette-board">
      <div class="green-stack">${button("straight","0","0","green")}${button("straight","00","00","green")}</div>
      <div class="number-field"><div class="number-matrix">${Array.from({length:12},(_,row)=>[3,2,1].map((column)=>{const n=row*3+column;return button("straight",String(n),String(n),RED.has(n)?"red":"black")}).join("")).join("")}</div><div class="inside-layer">${spots.join("")}</div></div>
      <div class="column-stack">${button("column3","2 TO 1")}${button("column2","2 TO 1")}${button("column1","2 TO 1")}</div>
      <div class="dozens">${button("dozen1","1ST 12")}${button("dozen2","2ND 12")}${button("dozen3","3RD 12")}</div>
      <div class="outside-row">${button("low","1–18")}${button("even","EVEN")}${button("red","RED","","red")}${button("black","BLACK","","black")}${button("odd","ODD")}${button("high","19–36")}</div>
      ${insideHotspot("firstfive","FIRST FIVE • 0/00/1/2/3",["0","00","1","2","3"],"","5")}
    </div>`;
  }

  private wheel(): string {
    const selectedPockets = new Set(this.bets.flatMap((bet) => this.coveredPockets(bet)));
    const heldRotation = this.landedResult ? wheelLandingRotation(this.landedResult, this.freeFall, 0) : 0;
    return `<div class="roulette-wheel-shell"><div class="wheel-pointer ${this.freeFall ? "bottom-pointer" : ""}">${this.freeFall ? "▲" : "▼"}</div><div class="roulette-wheel" data-wheel style="transform:rotate(${heldRotation}deg)">${ROULETTE_POCKETS.map((pocket,index)=>`<div class="wheel-pocket ${this.colorOf(pocket)} ${selectedPockets.has(pocket)?"picked":""} ${this.landedResult===pocket?"landed":""}" data-wheel-pocket="${pocket}" style="--i:${index};--count:${ROULETTE_POCKETS.length}"><span>${pocket}</span></div>`).join("")}<div class="wheel-rim"></div><div class="wheel-center"><span class="beard-mark">B</span><small>${this.freeFall ? "BEARDFALL" : "ROYAL"}</small></div></div>${!this.freeFall && !this.landedResult ? `<div class="roulette-ball-orbit" data-ball><i></i></div>` : ""}${this.landedResult ? `<div class="landed-ball ${this.freeFall ? "landed-bottom" : "landed-top"}" data-landed-ball data-landed-pocket="${this.landedResult}"></div>` : ""}<div class="landing-flash">${this.landedResult ? `<small>WINNING POCKET</small><strong>${this.landedResult}</strong>` : ""}</div></div>`;
  }

  private dropTower(): string {
    return `<div class="drop-tower"><div class="drop-launch"><small>BEARD LAWS</small><strong>BEARDFALL</strong><span>ROULETTE</span></div>${this.wheel()}<div class="drop-field" data-drop-field><div class="drop-ball" data-drop-ball></div>${Array.from({length:42},(_,i)=>`<i style="--peg-x:${12+(i%7)*12.7}%;--peg-y:${8+Math.floor(i/7)*13}%"></i>`).join("")}</div></div>`;
  }

  private render(): void {
    const total = this.totalBet();
    const title = this.freeFall ? "BEARDFALL ROULETTE" : "ROYAL ROULETTE";
    this.root.innerHTML = `<section class="roulette-room ${this.freeFall ? "freefall" : "classic"}">
      <nav class="game-nav"><button data-back>← CASINO FLOOR</button><div class="roulette-brand"><small>BEARD LAWS CASINO</small><strong>${title}</strong></div><div class="game-wallet"><small>WALLET</small><strong>${this.money(this.getWallet())}</strong></div></nav>
      <main class="roulette-main"><section class="roulette-machine">${this.freeFall ? this.dropTower() : this.wheel()}<div class="result-history">${this.lastResults.length ? this.lastResults.map((p)=>`<span class="${this.colorOf(p)}">${p}</span>`).join("") : "LAST RESULTS WILL APPEAR HERE"}</div></section>
      <section class="roulette-console"><div class="roulette-status"><span class="status-light"></span><p>${this.message}</p></div>${this.board()}
      <div class="roulette-dock"><div class="chip-rack">${[100,500,1000,2500,5000].map((units)=>`<button class="casino-chip ${units===this.chipUnits?"selected":""}" data-chip="${units}" ${units>this.getWallet()?"disabled":""}><small>${this.money(units)}</small></button>`).join("")}</div>
      <div class="bet-summary"><small>TOTAL BET</small><strong>${this.money(total)}</strong><span>${this.bets.length} CHIP${this.bets.length===1?"":"S"}</span></div>
      <div class="roulette-actions"><button data-undo ${!this.bets.length||this.spinning?"disabled":""}>UNDO</button><button data-clear ${!this.bets.length||this.spinning?"disabled":""}>CLEAR</button><button data-repeat ${!this.lastBets.length||this.bets.length||this.spinning?"disabled":""}>REPEAT BET</button><button class="launch-button" data-spin ${!this.bets.length||this.spinning||total>this.getWallet()?"disabled":""}>${this.freeFall?"DROP BALL":"SPIN WHEEL"}</button></div></div>
      <button class="rules-link" data-rules>HOW TO PLAY & PAYOUTS</button></section></main></section>`;
    this.bind();
  }

  private bind(): void {
    this.root.querySelector("[data-back]")?.addEventListener("click",()=>{window.removeEventListener("casino:dev",this.handleDeveloperAction as EventListener);this.goLobby();});
    this.root.querySelectorAll<HTMLElement>("[data-chip]").forEach((el)=>el.addEventListener("click",()=>{this.chipUnits=Number(el.dataset.chip);this.render();}));
    this.root.querySelectorAll<HTMLElement>("[data-kind]").forEach((el)=>el.addEventListener("click",()=>this.addBet(el.dataset.kind as BetKind,el.dataset.label!,el.dataset.pocket||undefined)));
    this.root.querySelector("[data-undo]")?.addEventListener("click",()=>{this.bets.pop();this.message="Last chip returned.";this.render();});
    this.root.querySelector("[data-clear]")?.addEventListener("click",()=>{this.bets=[];this.message="Bets cleared.";this.render();});
    this.root.querySelector("[data-repeat]")?.addEventListener("click",()=>this.repeatBet());
    this.root.querySelector("[data-spin]")?.addEventListener("click",()=>void this.spin());
    this.root.querySelector("[data-rules]")?.addEventListener("click",()=>alert("AMERICAN DOUBLE-ZERO ROULETTE\n\nStraight 35:1 • Split 17:1 • Street 11:1\nCorner 8:1 • First Five 6:1 • Six Line 5:1\nDozens/Columns 2:1 • Even-money bets 1:1\n0 and 00 lose on all outside bets\n\nPlace chips directly on numbers, connecting lines, or intersections. Highlighted wheel pockets show every number covered by your active inside bets."));
  }

  private repeatBet(): void {
    const required = this.lastBets.reduce((sum, bet) => sum + bet.units, 0);
    if (!this.lastBets.length) return;
    if (required > this.getWallet()) {
      this.message = `Repeat bet needs ${this.money(required)}. Add funds or lower the wager.`;
      this.render();
      return;
    }
    this.bets = this.lastBets.map((bet) => ({ ...bet }));
    this.landedResult = null;
    this.message = `Previous ${this.money(required)} bet restored. Launch when ready.`;
    this.render();
  }

  private async spin(): Promise<void> {
    const total = this.totalBet();
    if (!total || total > this.getWallet() || this.spinning) return;
    this.spinning = true;
    this.landedResult = null;
    this.setWallet(this.getWallet() - total);
    this.message = this.freeFall ? "BALL RELEASED. Watch the beardwall…" : "NO MORE BETS. Wheel in motion…";
    this.render();
    const result = this.forcedResult ?? this.randomPocket();
    this.forcedResult = null;
    await this.animate(result);
    const returned = this.bets.reduce((sum,bet)=>sum+bet.units*this.returnMultiplier(bet,result),0);
    if (returned) this.setWallet(this.getWallet()+returned);
    this.lastResults = [result,...this.lastResults].slice(0,8);
    this.lastBets = this.bets.map((bet) => ({ ...bet }));
    this.landedResult = result;
    this.message = `${result} ${this.colorOf(result).toUpperCase()} • ${returned ? `WIN ${this.money(returned-total)} PROFIT • ${this.money(returned)} RETURNED` : `NO WIN • ${this.money(total)} WAGERED`}`;
    this.bets=[];
    this.spinning=false;
    this.render();
  }

  private async animate(result: string): Promise<void> {
    const wheel=this.root.querySelector<HTMLElement>("[data-wheel]");
    const duration=this.freeFall?BEARDFALL_SPIN_DURATION_MS:ROYAL_SPIN_DURATION_MS;
    const randomExtraSpins = 2 + Math.floor(Math.random() * 3);
    const fullSpins=(this.freeFall?12:10)+randomExtraSpins;
    const finalWheelRotation=wheelLandingRotation(result,this.freeFall,fullSpins);
    const wheelAnimation=wheel?.animate([
      {transform:"rotate(0deg)"},
      {transform:`rotate(${finalWheelRotation}deg)`},
    ],{duration,easing:"cubic-bezier(.12,.58,.18,1)",fill:"forwards"});
    if(this.freeFall){
      const ball=this.root.querySelector<HTMLElement>("[data-drop-ball]");
      const ballAnimation=ball?.animate([
        {left:"calc(50% - 8px)",top:"1%",transform:"scale(1)",offset:0},
        {left:"38%",top:"10%",transform:"scale(1)",offset:.12},
        {left:"62%",top:"20%",transform:"scale(.99)",offset:.23},
        {left:"31%",top:"31%",transform:"scale(.98)",offset:.34},
        {left:"67%",top:"43%",transform:"scale(.96)",offset:.45},
        {left:"35%",top:"55%",transform:"scale(.94)",offset:.56},
        {left:"61%",top:"67%",transform:"scale(.92)",offset:.67},
        {left:"42%",top:"78%",transform:"scale(.89)",offset:.76},
        {left:"56%",top:"86%",transform:"scale(.86)",offset:.83},
        {left:"45%",top:"91%",transform:"scale(.82)",offset:.88},
        {left:"53%",top:"94%",transform:"scale(.79)",offset:.92},
        {left:"47%",top:"96%",transform:"scale(.76)",offset:.955},
        {left:"calc(50% - 8px)",top:"98%",transform:"scale(.72)",offset:1},
      ],{duration:duration*.78,delay:duration*.08,easing:"cubic-bezier(.24,.02,.38,1)",fill:"forwards"});
      await Promise.allSettled([wheelAnimation?.finished ?? Promise.resolve(),ballAnimation?.finished ?? Promise.resolve()]);
    } else {
      const ball=this.root.querySelector<HTMLElement>("[data-ball]");
      const orbitAnimation=ball?.animate([
        {transform:"rotate(0deg)",inset:"1%",offset:0},
        {transform:"rotate(-2520deg)",inset:"1%",offset:.66},
        {transform:"rotate(-2890deg)",inset:"4%",offset:.82},
        {transform:"rotate(-3020deg)",inset:"8%",offset:.91},
        {transform:"rotate(-3160deg)",inset:"8%",offset:.96},
        {transform:`rotate(${ROYAL_BALL_FINAL_ROTATION_DEGREES}deg)`,inset:`${ROYAL_BALL_LANDING_INSET_PERCENT}%`,offset:1},
      ],{duration,easing:"cubic-bezier(.12,.55,.2,1)",fill:"forwards"});
      const pill=ball?.querySelector<HTMLElement>("i");
      const rattleAnimation=pill?.animate([
        {transform:"translateX(0) scale(1)",offset:0},
        {transform:"translateX(0) scale(1)",offset:.82},
        {transform:"translateX(9px) scale(.96)",offset:.87},
        {transform:"translateX(-7px) scale(.92)",offset:.91},
        {transform:"translateX(5px) scale(.88)",offset:.945},
        {transform:"translateX(-3px) scale(.84)",offset:.975},
        {transform:"translateX(0) scale(.8)",offset:1},
      ],{duration,easing:"linear",fill:"forwards"});
      await Promise.allSettled([wheelAnimation?.finished ?? Promise.resolve(),orbitAnimation?.finished ?? Promise.resolve(),rattleAnimation?.finished ?? Promise.resolve()]);
    }
    await new Promise((resolve)=>window.setTimeout(resolve,240));
  }
}
