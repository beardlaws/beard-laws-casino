type AutoCount = number | "infinite" | null;
interface JamSymbol { id: string; label: string; art: string; weight: number; pay: number; }

const art = (name: string): string => new URL(`../../assets/megh/${name}.png`, import.meta.url).href;
const SYMBOLS: readonly JamSymbol[] = [
  { id: "strawberry", label: "STRAWBERRY", art: art("strawberry"), weight: 24, pay: 6 },
  { id: "amp", label: "JAM AMP", art: art("amp"), weight: 20, pay: 8 },
  { id: "guitar", label: "COSMIC GUITAR", art: art("guitar"), weight: 17, pay: 11 },
  { id: "vinyl", label: "VINYL", art: art("vinyl"), weight: 15, pay: 14 },
  { id: "goat", label: "ROCK GOAT", art: art("goat"), weight: 11, pay: 20 },
  { id: "megh", label: "MEGH", art: art("megh-cosmic-v2"), weight: 7, pay: 30 },
  { id: "wild", label: "WILD NOTE", art: art("note"), weight: 5, pay: 18 },
  { id: "ufo", label: "ENCORE UFO", art: art("ufo"), weight: 1.4, pay: 0 },
];
const COLS = 6; const ROWS = 5; const BET = 100;

export class MeghsCosmicJam {
  private auto: AutoCount = null;
  private stopRequested = false;
  private spinning = false;
  private multiplier = 1;
  private encore = 0;
  private freeDrops = 0;
  private encoreWin = 0;

  public constructor(private readonly root: HTMLElement, private readonly getWallet: () => number,
    private readonly setWallet: (units: number) => void, private readonly onExit: () => void) {}

  public open(): void {
    this.root.innerHTML = `<main class="megh-room"><button class="back" data-megh-home>← CASINO LOBBY</button>
      <header><small>BEARD LAWS CASINO • CASCADE FEATURE SLOT</small><h1>MEGH'S COSMIC JAM</h1><p>Space goats came for the strawberries. They stayed to melt faces.</p><button class="game-rules cosmic-rules-button" data-megh-rules>RULES &amp; PAYTABLE</button></header>
      <section class="megh-machine"><div class="laser-grid"></div><div class="megh-marquee"><span>LIVE TUMBLES</span><strong>INTERGALACTIC ENCORE</strong><span>PERSISTENT MULTIPLIERS</span></div><div class="megh-top">
        <div><small>TRACTOR MULTIPLIER</small><b data-megh-multi>1×</b></div><strong data-megh-message>AMPLIFIERS READY</strong><div><small>ENCORE METER</small><b data-megh-encore>0 / 4</b></div></div>
        <div class="slot-win-callout megh-win-callout" data-megh-callout hidden></div><div class="feature-readout cosmic-readout" data-megh-feature hidden><b data-megh-freedrops></b><span data-megh-feature-multi></span></div><div class="megh-reels" data-megh-reels></div>
        <div class="megh-feature"><span>6+ MATCHING SYMBOLS WIN</span><span>WINS VANISH &amp; TUMBLE</span><span>4 CASCADES LAUNCH ENCORE</span></div>
        <div class="megh-controls"><div><small>CREDIT</small><b data-megh-credit></b></div><div><small>BET</small><b>$1.00</b></div><div><small>WIN</small><b data-megh-win>$0.00</b></div>
          <button data-megh-auto>AUTO</button><button class="megh-spin" data-megh-spin>DROP</button></div>
        <div class="megh-auto-menu" data-megh-menu hidden>${[5,10,25,50].map(n=>`<button data-auto="${n}">${n}</button>`).join("")}<button data-auto="infinite">∞</button></div>
      </section><p class="megh-disclaimer">Fictional credits only • Shared casino wallet • Auto stops before feature play</p></main>`;
    this.root.querySelector("[data-megh-home]")?.addEventListener("click", () => this.onExit());
    this.root.querySelector("[data-megh-rules]")?.addEventListener("click", () => this.showRules());
    this.root.querySelector("[data-megh-spin]")?.addEventListener("click", () => { void this.spin(); });
    this.root.querySelector("[data-megh-auto]")?.addEventListener("click", () => this.toggleAuto());
    this.root.querySelectorAll<HTMLElement>("[data-auto]").forEach(button => button.addEventListener("click", () => this.startAuto(button.dataset.auto === "infinite" ? "infinite" : Number(button.dataset.auto))));
    void this.preloadArt().finally(() => { this.render(this.makeGrid()); this.update(); });
  }

  private async preloadArt():Promise<void>{await Promise.all(SYMBOLS.map(symbol=>new Promise<void>(resolve=>{const image=new Image();image.onload=()=>resolve();image.onerror=()=>resolve();image.src=symbol.art;})));}

  private pick(): JamSymbol { let roll=Math.random()*SYMBOLS.reduce((s,x)=>s+x.weight,0); for(const symbol of SYMBOLS){roll-=symbol.weight;if(roll<0)return symbol;}return SYMBOLS[0]!; }
  private makeGrid(): JamSymbol[][] { return Array.from({length:ROWS},()=>Array.from({length:COLS},()=>this.pick())); }
  private render(grid: JamSymbol[][], winners = new Set<string>()): void {
    const host=this.root.querySelector<HTMLElement>("[data-megh-reels]")!;
    host.innerHTML=grid.flatMap((row,y)=>row.map((symbol,x)=>`<div class="jam-symbol s-${symbol.id}${winners.has(`${x}:${y}`)?" winner":""}" style="grid-column:${x+1};grid-row:${y+1};--x:${x};--y:${y}"><span>${symbol.label}</span><img src="${symbol.art}" alt="${symbol.label}" onload="this.parentElement.classList.add('art-ready')" onerror="this.hidden=true;this.parentElement.classList.add('art-failed')"><small>${symbol.label}</small></div>`)).join("");
  }
  private clusters(grid: JamSymbol[][]): Array<{ cells:Set<string>; symbol:JamSymbol }> {
    const visited=new Set<string>(); const found:Array<{cells:Set<string>;symbol:JamSymbol}>=[];
    for(let y=0;y<ROWS;y+=1)for(let x=0;x<COLS;x+=1){const key=`${x}:${y}`;if(visited.has(key))continue;const base=grid[y]![x]!;if(base.id==="ufo"||base.id==="wild"){visited.add(key);continue;}const cells=new Set<string>();const queue:[[number,number]]=[[x,y]];
      while(queue.length){const [cx,cy]=queue.pop()!;const ck=`${cx}:${cy}`;if(visited.has(ck))continue;const current=grid[cy]?.[cx];if(!current||(current.id!==base.id&&current.id!=="wild"))continue;visited.add(ck);cells.add(ck);([[cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]] as [number,number][]).forEach(p=>queue.push(p));}
      if(cells.size>=6)found.push({cells,symbol:base});
    }return found;
  }
  private tumble(grid: JamSymbol[][], removed:Set<string>): JamSymbol[][] {
    const next=grid.map(row=>[...row]);for(let x=0;x<COLS;x+=1){const kept:JamSymbol[]=[];for(let y=ROWS-1;y>=0;y-=1)if(!removed.has(`${x}:${y}`))kept.push(grid[y]![x]!);for(let y=ROWS-1;y>=0;y-=1)next[y]![x]=kept[ROWS-1-y]??this.pick();}return next;
  }
  private async spin(): Promise<boolean> {
    if(this.spinning)return false;const free=this.freeDrops>0;if(!free&&this.getWallet()<BET){this.message("VISIT THE ATM");this.stopAuto();return false;}
    this.spinning=true;if(!free)this.setWallet(this.getWallet()-BET);else this.freeDrops-=1;if(!free){this.multiplier=1;this.encore=0;}this.update();
    let grid=this.makeGrid();let total=0;let feature=false;const host=this.root.querySelector<HTMLElement>("[data-megh-reels]")!;host.classList.add("dropping");await this.wait(620);host.classList.remove("dropping");this.render(grid);
    const callout=this.root.querySelector<HTMLElement>("[data-megh-callout]")!; callout.hidden=true;
    for(let cascade=0;cascade<8;cascade+=1){const matches=this.clusters(grid);if(!matches.length)break;const removed=new Set(matches.flatMap(m=>[...m.cells]));const raw=matches.reduce((sum,m)=>sum+m.symbol.pay*m.cells.size,0);const award=Math.round(raw*this.multiplier*3.15);total+=award;this.encore+=1;const groups=matches.map(m=>`${m.cells.size} ${m.symbol.label}`).join(" + ");this.message(`${this.multiplier}× TRACTOR-BEAM CASCADE`);callout.hidden=false;callout.textContent=`${groups} • ${this.multiplier}× • +$${(award/100).toFixed(2)}`;this.render(grid,removed);this.update();await this.wait(760);grid=this.tumble(grid,removed);this.multiplier+=1;this.render(grid);await this.wait(520);}
    const ufos=grid.flat().filter(s=>s.id==="ufo").length;if(ufos>=3||(!free&&this.encore>=4)){feature=true;this.freeDrops+=free?3:8;this.message(free?"ENCORE RETRIGGER • +3 FREE DROPS":"INTERGALACTIC ENCORE • 8 FREE DROPS");host.classList.add("encore");await this.wait(1600);host.classList.remove("encore");}
    if(free)this.encoreWin+=total;if(free&&this.freeDrops===0&&!feature){const finale=Math.max(BET,Math.round(this.encoreWin*.12));total+=finale;this.message(`FINAL GUITAR SMASH • +$${(finale/100).toFixed(2)}`);this.encoreWin=0;this.multiplier=1;}
    if(total>0){this.setWallet(this.getWallet()+total);callout.hidden=false;callout.textContent=`TOTAL COSMIC WIN • $${(total/100).toFixed(2)}`;await this.wait(850);}this.root.querySelector<HTMLElement>("[data-megh-win]")!.textContent=`$${(total/100).toFixed(2)}`;this.message(total>0?(total>=BET*10?"FINAL ENCORE • MEGA WIN":"COSMIC JAM PAYS"):"THE GOATS NEED A TUNE-UP");this.spinning=false;this.update();return feature;
  }
  private toggleAuto():void{if(this.auto!==null){this.stopRequested=true;this.message("AUTO STOPS AFTER THIS DROP");return;}const menu=this.root.querySelector<HTMLElement>("[data-megh-menu]")!;menu.hidden=!menu.hidden;}
  private startAuto(count:Exclude<AutoCount,null>):void{if(this.spinning)return;this.auto=count;this.stopRequested=false;this.root.querySelector<HTMLElement>("[data-megh-menu]")!.hidden=true;void this.runAuto();}
  private async runAuto():Promise<void>{while(this.auto!==null&&!this.stopRequested){const feature=await this.spin();if(this.auto===null)return;if(this.auto!=="infinite"){this.auto-=1;if(this.auto<=0){this.stopAuto();return;}}if(feature){this.stopAuto();return;}this.update();await this.wait(350);}this.stopAuto();}
  private stopAuto():void{this.auto=null;this.stopRequested=false;this.update();}
  private message(text:string):void{const node=this.root.querySelector<HTMLElement>("[data-megh-message]");if(node)node.textContent=text;}
  private update():void{const credit=this.root.querySelector<HTMLElement>("[data-megh-credit]");if(!credit)return;credit.textContent=`$${(this.getWallet()/100).toFixed(2)}`;this.root.querySelector<HTMLElement>("[data-megh-multi]")!.textContent=`${this.multiplier}×`;this.root.querySelector<HTMLElement>("[data-megh-encore]")!.textContent=`${Math.min(4,this.encore)} / 4`;const spin=this.root.querySelector<HTMLButtonElement>("[data-megh-spin]")!;spin.disabled=this.spinning||this.auto!==null||(this.freeDrops===0&&this.getWallet()<BET);spin.textContent=this.freeDrops>0?"FREE DROP":"DROP";this.root.querySelector<HTMLElement>("[data-megh-auto]")!.textContent=this.auto===null?"AUTO":`STOP ${this.auto==="infinite"?"∞":this.auto}`;const feature=this.root.querySelector<HTMLElement>("[data-megh-feature]")!;feature.hidden=this.freeDrops<=0;this.root.querySelector<HTMLElement>("[data-megh-freedrops]")!.textContent=`${this.freeDrops} FREE DROPS`;this.root.querySelector<HTMLElement>("[data-megh-feature-multi]")!.textContent=`LIVE MULTIPLIER ${this.multiplier}×`;}
  private wait(ms:number):Promise<void>{return new Promise(resolve=>window.setTimeout(resolve,ms));}
  private showRules():void{const modal=document.createElement("div");modal.className="slot-rules-backdrop";modal.innerHTML=`<section class="slot-rules cosmic-rules"><button data-close>×</button><small>MEGH'S COSMIC JAM</small><h2>HOW TO PLAY</h2><p>Clusters of 6 or more matching symbols pay anywhere. Winning symbols are tractor-beamed away and new symbols tumble into the empty spaces.</p><h3>INTERGALACTIC ENCORE</h3><ul><li>Every consecutive cascade raises the multiplier.</li><li>Four cascades or three Encore UFOs launch 8 free drops.</li><li>The multiplier persists and grows throughout the Encore.</li><li>Three UFOs during the Encore retrigger 3 drops.</li><li>The final guitar smash adds a finale award.</li></ul><h3>TOP SYMBOLS</h3><p>Megh • Rock Goat • Wild Note • Vinyl</p><p class="rules-note">All cluster awards use the current $1.00 wager. Fictional credits only.</p></section>`;document.body.appendChild(modal);modal.querySelector("[data-close]")?.addEventListener("click",()=>modal.remove());modal.addEventListener("click",event=>{if(event.target===modal)modal.remove();});}
}
