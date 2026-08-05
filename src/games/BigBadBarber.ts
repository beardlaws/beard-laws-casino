import type { CasinoActivity } from "../state/CasinoProgression";
import { casinoRandom } from "../engine/CasinoRandom";
import { animateDomReels } from "./DomReelAnimator";
import { FeatureDirector } from "../engine/FeatureDirector";
import { SlotBetModel, denominationMarkup } from "./SlotBetModel";

type BarberSymbol = { id:string; label:string; icon:string; weight:number; pay:number };
const SYMBOLS: readonly BarberSymbol[] = [
  { id:"beard", label:"LEGENDARY BEARD", icon:"🧔", weight:22, pay:7 },
  { id:"wax", label:"MUSTACHE WAX", icon:"🫙", weight:20, pay:8 },
  { id:"comb", label:"GOLD COMB", icon:"🪮", weight:18, pay:10 },
  { id:"pole", label:"BARBER POLE", icon:"💈", weight:15, pay:13 },
  { id:"fort", label:"BEARD FORT", icon:"🏰", weight:11, pay:18 },
  { id:"barber", label:"BIG BAD BARBER", icon:"💇", weight:7, pay:28 },
  { id:"wild", label:"NO SHAVE WILD", icon:"🥸", weight:5, pay:22 },
  { id:"razor", label:"GOLDEN RAZOR", icon:"🪒", weight:2, pay:0 },
];
const COLS=5, ROWS=3;

export class BigBadBarber {
  private spinning=false;
  private readonly betModel = new SlotBetModel();
  private lastWin=0;
  private fortressLevels=[0,0,0,0,0];
  public constructor(
    private readonly root:HTMLElement,
    private readonly getWallet:()=>number,
    private readonly setWallet:(units:number)=>void,
    private readonly onExit:()=>void,
    private readonly onActivity:(activity:CasinoActivity)=>void=()=>{},
  ){}
  private get betUnits():number { return this.betModel.wagerUnits; }
  public open():void {
    this.root.innerHTML=`<main class="barber-room"><button class="back" data-barber-home>← CASINO LOBBY</button>
      <section class="barber-machine"><div class="barber-clouds"></div><header><small>BEARD LAWS CASINO • FEATURE SLOT</small><h1>THE BIG BAD BARBER</h1><p>He is coming to shave them all. Build the beards. Fortify the faces. Survive the clippers.</p><button class="game-rules" data-barber-rules>RULES &amp; PAYTABLE</button></header>
      <div class="barber-progress"><span><small>BEARD FORTRESSES</small><b data-barber-forts>0 / 5</b></span><div class="fortress-track">${Array.from({length:5},(_,i)=>`<i data-fort="${i}"><em>🧔</em><b>0</b></i>`).join("")}</div><span><small>NEXT FEATURE</small><b>3+ RAZORS</b></span></div>
      <div class="barber-message" data-barber-message>CLIPPERS CHARGED • PRESS SPIN</div>
      <div class="barber-reels" data-barber-reels></div>
      <div class="barber-controls"><div><small>CREDIT</small><b data-barber-credit></b></div>${denominationMarkup("barber")}<div class="bet-selector"><button data-barber-bet-down>−</button><span><small>BET • <i data-barber-credits></i> CR</small><b data-barber-bet></b></span><button data-barber-bet-up>+</button></div><div><small>WIN</small><b data-barber-win>$0.00</b></div><button data-barber-max>MAX BET</button><button class="barber-spin" data-barber-spin>SPIN</button></div>
      <footer><span>243 WAYS</span><span>RAZORS TRIGGER THE SHAVE DOWN</span><span>NO SHAVE WILDS SUBSTITUTE</span></footer></section></main>`;
    this.root.querySelector("[data-barber-home]")?.addEventListener("click",this.onExit);
    this.root.querySelector("[data-barber-spin]")?.addEventListener("click",()=>void this.spin());
    this.root.querySelector("[data-barber-bet-down]")?.addEventListener("click",()=>this.changeBet(-1));
    this.root.querySelector("[data-barber-bet-up]")?.addEventListener("click",()=>this.changeBet(1));
    this.root.querySelector("[data-barber-denom-down]")?.addEventListener("click",()=>this.changeDenom(-1));
    this.root.querySelector("[data-barber-denom-up]")?.addEventListener("click",()=>this.changeDenom(1));
    this.root.querySelector("[data-barber-max]")?.addEventListener("click",()=>{this.betModel.maxBet();this.update();});
    this.root.querySelector("[data-barber-rules]")?.addEventListener("click",()=>this.showRules());
    this.render(this.makeGrid()); this.update();
  }
  private pick():BarberSymbol { let r=casinoRandom()*SYMBOLS.reduce((s,x)=>s+x.weight,0); for(const s of SYMBOLS){r-=s.weight;if(r<0)return s;} return SYMBOLS[0]!; }
  private makeGrid():BarberSymbol[][] { return Array.from({length:ROWS},()=>Array.from({length:COLS},()=>this.pick())); }
  private render(grid:BarberSymbol[][], winners=new Set<string>()):void {
    const host=this.root.querySelector<HTMLElement>("[data-barber-reels]")!;
    host.innerHTML=grid.flatMap((row,y)=>row.map((s,x)=>`<div class="barber-symbol s-${s.id}${winners.has(`${x}:${y}`)?" winner":""}" style="grid-column:${x+1};grid-row:${y+1}"><span>${s.icon}</span><small>${s.label}</small></div>`)).join("");
  }
  private evaluate(grid:BarberSymbol[][]):{award:number; winners:Set<string>} {
    let total=0; const winners=new Set<string>();
    for(const target of SYMBOLS.filter(s=>!["razor","wild"].includes(s.id))){
      let ways=1, length=0;
      for(let x=0;x<COLS;x++){ const ys=grid.map((r,y)=>({s:r[x]!,y})).filter(v=>v.s.id===target.id||v.s.id==="wild"); if(!ys.length)break; length++; ways*=ys.length; ys.forEach(v=>winners.add(`${x}:${v.y}`)); }
      if(length>=3) total += Math.round(target.pay*ways*(length-2)*this.betUnits/10);
    }
    return {award:total,winners};
  }
  private async spin():Promise<void>{
    if(this.spinning||this.getWallet()<this.betUnits)return;
    this.spinning=true; this.lastWin=0; this.setWallet(this.getWallet()-this.betUnits); this.onActivity({type:"spin",game:"barber",wager:this.betUnits}); this.root.querySelector(".barber-machine")?.classList.add("barber-spinning"); this.update();
    const grid=this.makeGrid(); const host=this.root.querySelector<HTMLElement>("[data-barber-reels]")!;
    const cols=Array.from({length:COLS},(_,x)=>grid.map(r=>r[x]!));
    const earlyRazors=cols.slice(0,4).flat().filter(s=>s.id==="razor").length;
    if(earlyRazors>=2)this.message("THE BARBER IS WATCHING THE FINAL REEL…");
    await animateDomReels({host,finalColumns:cols,rows:ROWS,randomSymbol:()=>this.pick(),duration:2100,stagger:235,fillerRows:20,anticipationReel:earlyRazors>=2?4:-1,renderSymbol:(s)=>`<div class="barber-symbol s-${s.id}"><span>${s.icon}</span><small>${s.label}</small></div>`});
    this.render(grid);
    this.root.querySelector(".barber-machine")?.classList.remove("barber-spinning");
    await this.wait(180);
    const result=this.evaluate(grid); const razors=grid.flat().filter(s=>s.id==="razor").length;
    if(result.award>0){this.render(grid,result.winners);this.lastWin=result.award;this.setWallet(this.getWallet()+result.award);this.onActivity({type:"win",game:"barber",amount:result.award,value:result.award/this.betUnits,wager:this.betUnits});this.message(`BEARD POWER PAYS $${(result.award/100).toFixed(2)}`);const director=new FeatureDirector(this.root.querySelector<HTMLElement>(".barber-machine")??host);director.burst(host,"✦",14,"gold-particle");await director.shake(result.award>=this.betUnits*10?"medium":"soft",260);await this.wait(900);}
    if(razors>=3){this.onActivity({type:"bonus",game:"barber"});await this.playShaveDown();}
    else if(!result.award)this.message(razors===2?"ONE MORE RAZOR FOR THE SHAVE DOWN":"THE BARBER MISSED • SPIN AGAIN");
    this.root.querySelector(".barber-machine")?.classList.remove("barber-spinning"); this.spinning=false; this.update();
  }
  private async playShaveDown():Promise<void>{
    const overlay=document.createElement("div");overlay.className="barber-bonus";overlay.innerHTML=`<div class="barber-villain">💇</div><div class="clipper-sparks">✦ ✦ ✦</div><h2>THE SHAVE DOWN</h2><p>THE BIG BAD BARBER ATTACKS THE BEARD FORTRESSES</p><div class="bonus-forts">${Array.from({length:5},(_,i)=>`<button data-bonus-fort="${i}"><span>🧔</span><b>FORT ${i+1}</b></button>`).join("")}</div>`;this.root.appendChild(overlay);await this.wait(900);
    let featureWin=0; const order=[0,1,2,3,4].sort(()=>casinoRandom()-.5).slice(0,3+Math.floor(casinoRandom()*3));
    for(const i of order){const node=overlay.querySelector<HTMLElement>(`[data-bonus-fort="${i}"]`)!;node.classList.add("under-attack");await this.wait(520);const level=Math.min(4,this.fortressLevels[i]!+1);this.fortressLevels[i]=level;const mult=[2,5,10,20,50][level]!;const award=this.betUnits*mult;featureWin+=award;node.classList.remove("under-attack");node.classList.add("revealed");node.innerHTML=`<span>${level===4?"👑":"🧔"}</span><b>${mult}×</b>`;await this.wait(420);}
    if(featureWin>0){this.setWallet(this.getWallet()+featureWin);this.lastWin+=featureWin;this.onActivity({type:"win",game:"barber",amount:featureWin,value:featureWin/this.betUnits,wager:this.betUnits});}
    overlay.insertAdjacentHTML("beforeend",`<strong class="bonus-total">SHAVE DOWN WIN • $${(featureWin/100).toFixed(2)}</strong>`);await this.wait(1500);overlay.classList.add("leaving");await this.wait(450);overlay.remove();this.message(`THE BEARDS SURVIVED • +$${(featureWin/100).toFixed(2)}`);this.updateFortresses();
  }
  private updateFortresses():void{this.root.querySelectorAll<HTMLElement>("[data-fort]").forEach((n,i)=>{const l=this.fortressLevels[i]!;n.className=l?`level-${l}`:"";n.querySelector("b")!.textContent=String(l);});const b=this.root.querySelector<HTMLElement>("[data-barber-forts]");if(b)b.textContent=`${this.fortressLevels.filter(x=>x>0).length} / 5`;}
  private changeBet(d:number):void{if(this.spinning)return;this.betModel.changeCredits(d);this.update();}
  private changeDenom(d:number):void{if(this.spinning)return;this.betModel.changeDenomination(d);this.update();}
  private message(s:string):void{const n=this.root.querySelector<HTMLElement>("[data-barber-message]");if(n)n.textContent=s;}
  private update():void{const q=(s:string)=>this.root.querySelector<HTMLElement>(s)!;if(!q("[data-barber-credit]"))return;q("[data-barber-credit]").textContent=`$${(this.getWallet()/100).toFixed(2)}`;q("[data-barber-bet]").textContent=`$${(this.betUnits/100).toFixed(2)}`;q("[data-barber-denom]").textContent=`${this.betModel.denominationUnits}¢`;q("[data-barber-credits]").textContent=String(this.betModel.credits);q("[data-barber-win]").textContent=`$${(this.lastWin/100).toFixed(2)}`;(q("[data-barber-spin]") as HTMLButtonElement).disabled=this.spinning||this.getWallet()<this.betUnits;this.updateFortresses();}
  private showRules():void{const m=document.createElement("div");m.className="modal-backdrop";m.innerHTML=`<section class="slot-rules barber-rules"><button data-close>×</button><small>THE BIG BAD BARBER</small><h2>HOW TO PLAY</h2><p>Wins pay left to right on 243 ways. Wild disguises substitute for regular symbols.</p><h3>THE SHAVE DOWN</h3><ul><li>Land 3 or more Golden Razors to trigger the feature.</li><li>The barber attacks random persistent beard fortresses.</li><li>Each surviving fortress upgrades and reveals a larger multiplier.</li><li>Fully upgraded Golden Beards can reveal the largest awards.</li></ul><p class="rules-note">Original Beard Laws feature concept. Fictional credits only.</p></section>`;document.body.appendChild(m);m.querySelector("[data-close]")?.addEventListener("click",()=>m.remove());}
  private wait(ms:number):Promise<void>{return new Promise(r=>setTimeout(r,ms));}
}
