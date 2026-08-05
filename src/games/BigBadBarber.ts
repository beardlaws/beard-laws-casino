import type { CasinoActivity } from "../state/CasinoProgression";
import { casinoRandom } from "../engine/CasinoRandom";
import { animateDomReels } from "./DomReelAnimator";
import { FeatureDirector } from "../engine/FeatureDirector";
import { SlotBetModel } from "./SlotBetModel";
import { slotControlPanelMarkup } from "../ui/SlotControlPanel";

type SymbolId = "beard"|"wax"|"comb"|"pole"|"clipper"|"builder"|"wild"|"razor";
type BarberSymbol = { id:SymbolId; label:string; art:string; weight:number; pay:number };

const svg=(body:string,viewBox="0 0 100 100")=>`<svg class="barber-art" viewBox="${viewBox}" aria-hidden="true">${body}</svg>`;
const SYMBOLS: readonly BarberSymbol[] = [
  {id:"beard",label:"LEGENDARY BEARD",weight:23,pay:7,art:svg('<defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f4b25f"/><stop offset="1" stop-color="#7b351e"/></linearGradient></defs><path d="M26 27Q50 11 74 27L68 42Q82 48 75 67Q66 91 50 94Q34 91 25 67Q18 48 32 42Z" fill="url(#b)" stroke="#ffdc8a" stroke-width="4"/><path d="M38 47Q42 57 50 49Q58 57 62 47M35 65Q50 79 65 65" fill="none" stroke="#4c211a" stroke-width="5" stroke-linecap="round"/>')},
  {id:"wax",label:"BEARD WAX",weight:20,pay:8,art:svg('<ellipse cx="50" cy="26" rx="31" ry="12" fill="#f6d068" stroke="#fff0a4" stroke-width="4"/><path d="M19 26v44c0 9 62 9 62 0V26" fill="#8d2e3d" stroke="#f7c85f" stroke-width="4"/><ellipse cx="50" cy="69" rx="31" ry="12" fill="#5c1727"/><path d="M31 48Q42 38 50 48Q58 38 69 48Q57 64 50 53Q43 64 31 48" fill="#ffd66c"/>')},
  {id:"comb",label:"GOLD COMB",weight:18,pay:10,art:svg('<defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#9e5f12"/><stop offset=".5" stop-color="#fff19b"/><stop offset="1" stop-color="#b66c18"/></linearGradient></defs><path d="M17 23h66v22H17z" rx="8" fill="url(#g)" stroke="#fff0a0" stroke-width="4"/><path d="M23 44v36M33 44v29M43 44v36M53 44v29M63 44v36M73 44v29" stroke="url(#g)" stroke-width="7" stroke-linecap="round"/>')},
  {id:"pole",label:"BARBER POLE",weight:15,pay:13,art:svg('<rect x="33" y="15" width="34" height="70" rx="17" fill="#f8f3e5" stroke="#ffc95d" stroke-width="5"/><path d="M35 25l30 18M35 43l30 18M35 61l30 18" stroke="#d83946" stroke-width="10"/><path d="M65 25L35 43M65 61L35 79" stroke="#3276d1" stroke-width="8"/><ellipse cx="50" cy="14" rx="22" ry="7" fill="#e7b447"/><ellipse cx="50" cy="86" rx="22" ry="7" fill="#e7b447"/>')},
  {id:"clipper",label:"POWER CLIPPERS",weight:11,pay:18,art:svg('<path d="M29 16h42l-5 18H34z" fill="#dde6ec" stroke="#fff" stroke-width="4"/><path d="M35 34h30l10 45Q51 94 25 79z" fill="#4f2738" stroke="#f2b950" stroke-width="5"/><path d="M41 18v-8M50 18V8M59 18v-8" stroke="#fff" stroke-width="5"/><circle cx="50" cy="61" r="9" fill="#ffd35a"/><path d="M50 57v8" stroke="#6d341c" stroke-width="4"/>')},
  {id:"builder",label:"BEARD BUILDER",weight:9,pay:0,art:svg('<path d="M20 37h60v46H20z" fill="#9d5a25" stroke="#ffd072" stroke-width="5"/><path d="M16 32h68v15H16z" fill="#d88932" stroke="#ffe08a" stroke-width="4"/><path d="M31 24q19-19 38 0v9H31z" fill="#f0bb3d" stroke="#fff09a" stroke-width="4"/><path d="M42 16v16M58 16v16" stroke="#fff09a" stroke-width="4"/><path d="M35 57h30M35 68h22" stroke="#ffdf8a" stroke-width="5"/>')},
  {id:"wild",label:"NO SHAVE WILD",weight:4,pay:22,art:svg('<defs><radialGradient id="w"><stop stop-color="#fff8a6"/><stop offset="1" stop-color="#d47a1e"/></radialGradient></defs><circle cx="50" cy="50" r="42" fill="url(#w)" stroke="#fff5a4" stroke-width="5"/><path d="M22 51Q37 29 50 49Q63 29 78 51Q63 74 50 56Q37 74 22 51" fill="#42202b"/><text x="50" y="88" text-anchor="middle" font-size="15" font-weight="900" fill="#421b25">WILD</text>')},
  {id:"razor",label:"GOLDEN RAZOR",weight:2,pay:0,art:svg('<path d="M18 30h64v22H18z" rx="8" fill="#f8d260" stroke="#fff2a3" stroke-width="5"/><path d="M28 52h44l-7 14H35z" fill="#d9e8ee" stroke="#fff" stroke-width="4"/><path d="M50 66v22" stroke="#d8922d" stroke-width="9" stroke-linecap="round"/><circle cx="50" cy="89" r="7" fill="#ffe070"/>')},
];
const COLS=5, ROWS=3, MAX_LEVEL=4;
const FORT_NAMES=["EMPTY LOT","STUBBLE SHACK","LUMBER BEARD CABIN","VIKING BEARD HALL","GOLDEN BEARD CASTLE"];
const FORT_MULT=[0,3,8,20,75];

export class BigBadBarber {
  private spinning=false;
  private autoRemaining=0;
  private autoInfinite=false;
  private bonusSpins=0;
  private readonly betModel=new SlotBetModel();
  private lastWin=0;
  private fortressLevels=[0,0,0,0,0];
  private currentGrid:BarberSymbol[][]=[];
  public constructor(private readonly root:HTMLElement,private readonly getWallet:()=>number,private readonly setWallet:(units:number)=>void,private readonly onExit:()=>void,private readonly onActivity:(activity:CasinoActivity)=>void=()=>{}){}
  private get betUnits():number{return this.betModel.wagerUnits;}

  public open():void{
    this.root.innerHTML=`<main class="barber-room"><button class="back" data-barber-home>← CASINO LOBBY</button><section class="barber-machine">
      <div class="barber-ambient" aria-hidden="true"><i></i><i></i><i></i></div>
      <header><small>BEARD LAWS CASINO • PERSISTENT FEATURE SLOT</small><h1>THE BIG BAD BARBER</h1><p>Build legendary beard fortresses. Pray the clippers jam.</p><button class="game-rules" data-barber-rules>RULES &amp; PAYTABLE</button></header>
      <div class="barber-progress"><span class="fortress-meter"><small>FORTRESSES BUILT</small><b data-barber-forts>0 / 5</b></span><div class="fortress-track">${Array.from({length:5},(_,i)=>this.fortMarkup(i)).join("")}</div><span class="razor-meter"><small>FEATURE</small><b>3+ RAZORS</b></span></div>
      <div class="barber-message" data-barber-message>BUILD THE BEARDS • BEWARE THE BARBER</div>
      <div class="barber-stage"><div class="barber-character-layer" data-barber-character-layer></div><div class="barber-reels" data-barber-reels></div></div>
      ${slotControlPanelMarkup({prefix:"barber",auto:true})}
      <div class="barber-auto-menu" data-barber-auto-menu hidden><button data-auto-count="10">10</button><button data-auto-count="25">25</button><button data-auto-count="50">50</button><button data-auto-count="-1">∞</button></div>
      <footer><span>243 WAYS</span><span>BUILDERS UPGRADE THE FORT ABOVE THEIR REEL</span><span>FAILED BUILDS MAY SUMMON THE BARBER</span></footer>
    </section></main>`;
    this.bind();
    this.currentGrid=this.makeGrid();this.render(this.currentGrid);this.update();
  }

  private bind():void{
    this.root.querySelector("[data-barber-home]")?.addEventListener("click",()=>{this.stopAuto();this.onExit();});
    this.root.querySelector("[data-barber-spin]")?.addEventListener("click",()=>{if(this.autoRemaining||this.autoInfinite)this.stopAuto();else void this.spin();});
    this.root.querySelector("[data-barber-auto]")?.addEventListener("click",()=>this.toggleAutoMenu());
    this.root.querySelectorAll<HTMLElement>("[data-auto-count]").forEach(n=>n.addEventListener("click",()=>this.startAuto(Number(n.dataset.autoCount))));
    this.root.querySelector("[data-barber-bet-down]")?.addEventListener("click",()=>this.changeBet(-1));
    this.root.querySelector("[data-barber-bet-up]")?.addEventListener("click",()=>this.changeBet(1));
    this.root.querySelector("[data-barber-denom-down]")?.addEventListener("click",()=>this.changeDenom(-1));
    this.root.querySelector("[data-barber-denom-up]")?.addEventListener("click",()=>this.changeDenom(1));
    this.root.querySelector("[data-barber-max]")?.addEventListener("click",()=>{if(!this.spinning){this.betModel.maxBet();this.update();}});
    this.root.querySelector("[data-barber-rules]")?.addEventListener("click",()=>this.showRules());
  }

  private pick():BarberSymbol{let r=casinoRandom()*SYMBOLS.reduce((s,x)=>s+x.weight,0);for(const s of SYMBOLS){r-=s.weight;if(r<0)return s;}return SYMBOLS[0]!;}
  private makeGrid():BarberSymbol[][]{return Array.from({length:ROWS},()=>Array.from({length:COLS},()=>this.pick()));}
  private symbolMarkup(s:BarberSymbol):string{return `<div class="barber-symbol s-${s.id}"><span>${s.art}</span><small>${s.label}</small></div>`;}
  private render(grid:BarberSymbol[][],winners=new Set<string>()):void{const host=this.root.querySelector<HTMLElement>("[data-barber-reels]")!;host.innerHTML=grid.flatMap((row,y)=>row.map((s,x)=>`<div class="barber-symbol s-${s.id}${winners.has(`${x}:${y}`)?" winner":""}" style="grid-column:${x+1};grid-row:${y+1}"><span>${s.art}</span><small>${s.label}</small></div>`)).join("");}

  private evaluate(grid:BarberSymbol[][]):{award:number;winners:Set<string>}{let total=0;const winners=new Set<string>();for(const target of SYMBOLS.filter(s=>!["razor","wild","builder"].includes(s.id))){let ways=1,length=0;const local:string[]=[];for(let x=0;x<COLS;x++){const ys=grid.map((r,y)=>({s:r[x]!,y})).filter(v=>v.s.id===target.id||v.s.id==="wild");if(!ys.length)break;length++;ways*=ys.length;ys.forEach(v=>local.push(`${x}:${v.y}`));}if(length>=3){local.forEach(v=>winners.add(v));total+=Math.round(target.pay*ways*(length-2)*this.betUnits/10);}}return{award:total,winners};}

  private async spin():Promise<void>{
    if(this.spinning||(!this.bonusSpins&&this.getWallet()<this.betUnits))return;
    this.spinning=true;this.lastWin=0;
    const isBonus=this.bonusSpins>0;
    if(isBonus)this.bonusSpins--;else{this.setWallet(this.getWallet()-this.betUnits);this.onActivity({type:"spin",game:"barber",wager:this.betUnits});}
    this.root.querySelector(".barber-machine")?.classList.add("barber-spinning");this.update();
    const grid=this.makeGrid();this.currentGrid=grid;const host=this.root.querySelector<HTMLElement>("[data-barber-reels]")!;const cols=Array.from({length:COLS},(_,x)=>grid.map(r=>r[x]!));
    const earlyRazors=cols.slice(0,4).flat().filter(s=>s.id==="razor").length;if(earlyRazors>=2)this.message("THE GOLDEN RAZOR IS CIRCLING THE FINAL REEL…");
    await animateDomReels({host,finalColumns:cols,rows:ROWS,randomSymbol:()=>this.pick(),duration:2250,stagger:260,fillerRows:28,anticipationReel:earlyRazors>=2?4:-1,anticipationDelay:1250,renderSymbol:s=>this.symbolMarkup(s)});
    this.render(grid);this.root.querySelector(".barber-machine")?.classList.remove("barber-spinning");await this.wait(160);

    const result=this.evaluate(grid);const razors=grid.flat().filter(s=>s.id==="razor").length;
    const upgraded=await this.applyBuilders(grid);
    if(result.award>0)await this.payBaseWin(grid,result);
    if(razors>=3&&!isBonus){this.onActivity({type:"bonus",game:"barber"});await this.startShaveDown();}
    else if(!upgraded&&!result.award&&this.fortressLevels.some(x=>x>0)&&(isBonus||casinoRandom()<.48))await this.barberAttack(isBonus);
    else if(!upgraded&&!result.award)this.message(razors===2?"ONE MORE RAZOR FOR THE SHAVE DOWN":isBonus?`${this.bonusSpins} SHAVE DOWN SPINS REMAIN`:`THE BARBER IS STILL OUT THERE…`);

    this.spinning=false;this.update();
    if(this.bonusSpins>0){await this.wait(650);void this.spin();return;}
    if(this.autoInfinite||this.autoRemaining>0){if(this.autoRemaining>0)this.autoRemaining--;if(this.getWallet()>=this.betUnits){await this.wait(650);void this.spin();}else this.stopAuto();}
  }

  private async applyBuilders(grid:BarberSymbol[][]):Promise<boolean>{
    const counts=Array.from({length:COLS},(_,x)=>grid.filter(row=>row[x]!.id==="builder").length);if(!counts.some(Boolean))return false;
    this.message("BEARD BUILDERS ON THE BOARD!");
    for(let x=0;x<COLS;x++){for(let n=0;n<counts[x]!;n++){const old=this.fortressLevels[x]!;if(old<MAX_LEVEL){await this.highlightColumn(x);this.fortressLevels[x]=old+1;this.updateFortresses();await this.pulseFort(x,"upgrade");}}}
    this.message("FORTRESSES UPGRADED • KEEP BUILDING");return true;
  }

  private async payBaseWin(grid:BarberSymbol[][],result:{award:number;winners:Set<string>}):Promise<void>{this.render(grid,result.winners);this.lastWin+=result.award;this.setWallet(this.getWallet()+result.award);this.onActivity({type:"win",game:"barber",amount:result.award,value:result.award/this.betUnits,wager:this.betUnits});this.message(`BEARD POWER PAYS $${(result.award/100).toFixed(2)}`);const director=new FeatureDirector(this.root.querySelector<HTMLElement>(".barber-machine")!);director.burst(this.root.querySelector<HTMLElement>("[data-barber-reels]")!,"✦",18,"gold-particle");await director.shake(result.award>=this.betUnits*10?"medium":"soft",280);await this.wait(650);}

  private async startShaveDown():Promise<void>{
    this.bonusSpins=8;const layer=this.characterLayer();layer.innerHTML=`<div class="mean-barber intro"><div class="barber-head"><b></b><i></i></div><div class="barber-clippers"></div><strong>THE SHAVE DOWN!</strong></div>`;this.root.querySelector(".barber-machine")?.classList.add("bonus-mode");this.message("8 FREE SPINS • BUILD FAST • HE SHAVES AFTER FAILED BUILDS");await this.wait(1900);layer.innerHTML="";this.update();
  }

  private async barberAttack(isBonus:boolean):Promise<void>{
    const built=this.fortressLevels.map((level,index)=>({level,index})).filter(x=>x.level>0);if(!built.length)return;
    const target=built[Math.floor(casinoRandom()*built.length)]!;const level=target.level;const mult=FORT_MULT[level]!;const award=this.betUnits*mult;
    this.message(`THE BIG BAD BARBER TARGETS FORTRESS ${target.index+1}!`);
    const layer=this.characterLayer();layer.innerHTML=`<div class="mean-barber attack" style="--target:${target.index}"><div class="barber-head"><b></b><i></i></div><div class="barber-clippers"></div><div class="barber-speech">TIME FOR A TRIM!</div></div>`;
    await this.wait(750);await this.pulseFort(target.index,"attack");
    const fort=this.root.querySelector<HTMLElement>(`[data-fort="${target.index}"]`)!;fort.classList.add("being-shaved");this.spawnShavings(fort);await this.wait(1250);
    fort.classList.remove("being-shaved");this.fortressLevels[target.index]=0;this.updateFortresses();
    if(award>0){this.lastWin+=award;this.setWallet(this.getWallet()+award);this.onActivity({type:"win",game:"barber",amount:award,value:award/this.betUnits,wager:this.betUnits});}
    fort.classList.add("prize-reveal");fort.insertAdjacentHTML("beforeend",`<div class="fort-prize">${mult}×<small>$${(award/100).toFixed(2)}</small></div>`);this.message(`${FORT_NAMES[level]} SHAVED • ${mult}× REVEALED`);await this.wait(1500);fort.querySelector(".fort-prize")?.remove();fort.classList.remove("prize-reveal");layer.innerHTML="";if(isBonus)this.message(`${this.bonusSpins} SHAVE DOWN SPINS REMAIN`);
  }

  private fortMarkup(i:number):string{return `<i data-fort="${i}" class="fort-level-0"><span class="fort-art"><b class="fort-roof"></b><b class="fort-body"></b><b class="fort-beard"></b><b class="fort-flag"></b></span><small data-fort-name>${FORT_NAMES[0]}</small><em data-fort-mult>EMPTY</em></i>`;}
  private updateFortresses():void{this.root.querySelectorAll<HTMLElement>("[data-fort]").forEach((n,i)=>{const l=this.fortressLevels[i]!;n.className=`fort-level-${l}`;n.querySelector<HTMLElement>("[data-fort-name]")!.textContent=FORT_NAMES[l]!;n.querySelector<HTMLElement>("[data-fort-mult]")!.textContent=l?`${FORT_MULT[l]}×`:"EMPTY";});const b=this.root.querySelector<HTMLElement>("[data-barber-forts]");if(b)b.textContent=`${this.fortressLevels.filter(x=>x>0).length} / 5`;}
  private async highlightColumn(x:number):Promise<void>{this.root.querySelectorAll<HTMLElement>(`.barber-symbol:nth-child(${COLS}n+${x+1})`).forEach(n=>n.classList.add("builder-path"));await this.wait(420);}
  private async pulseFort(i:number,mode:"upgrade"|"attack"):Promise<void>{const n=this.root.querySelector<HTMLElement>(`[data-fort="${i}"]`);if(!n)return;n.classList.add(mode);await this.wait(mode==="upgrade"?700:420);n.classList.remove(mode);}
  private spawnShavings(host:HTMLElement):void{for(let i=0;i<24;i++){const p=document.createElement("i");p.className="beard-shaving";p.style.setProperty("--x",`${(casinoRandom()-.5)*150}px`);p.style.setProperty("--r",`${(casinoRandom()-.5)*500}deg`);p.style.animationDelay=`${casinoRandom()*220}ms`;host.appendChild(p);setTimeout(()=>p.remove(),1500);}}
  private characterLayer():HTMLElement{return this.root.querySelector<HTMLElement>("[data-barber-character-layer]")!;}

  private toggleAutoMenu():void{if(this.spinning)return;const m=this.root.querySelector<HTMLElement>("[data-barber-auto-menu]")!;m.hidden=!m.hidden;}
  private startAuto(count:number):void{this.autoInfinite=count<0;this.autoRemaining=Math.max(0,count);this.root.querySelector<HTMLElement>("[data-barber-auto-menu]")!.hidden=true;this.update();void this.spin();}
  private stopAuto():void{this.autoInfinite=false;this.autoRemaining=0;this.update();}
  private changeBet(d:number):void{if(this.spinning||this.autoRemaining||this.autoInfinite)return;this.betModel.changeCredits(d);this.update();}
  private changeDenom(d:number):void{if(this.spinning||this.autoRemaining||this.autoInfinite)return;this.betModel.changeDenomination(d);this.update();}
  private message(s:string):void{const n=this.root.querySelector<HTMLElement>("[data-barber-message]");if(n)n.textContent=s;}
  private update():void{const q=(s:string)=>this.root.querySelector<HTMLElement>(s);const credit=q("[data-barber-credit]"),bet=q("[data-barber-bet]"),denom=q("[data-barber-denom]"),credits=q("[data-barber-credits]"),win=q("[data-barber-win]");if(!credit||!bet||!denom||!credits||!win)return;credit.textContent=`$${(this.getWallet()/100).toFixed(2)}`;bet.textContent=`$${(this.betUnits/100).toFixed(2)}`;denom.textContent=`${this.betModel.denominationUnits}¢`;credits.textContent=String(this.betModel.credits);win.textContent=`$${(this.lastWin/100).toFixed(2)}`;const spin=q("[data-barber-spin]") as HTMLButtonElement;spin.disabled=this.spinning||(!this.bonusSpins&&this.getWallet()<this.betUnits);spin.textContent=this.autoRemaining||this.autoInfinite?"STOP":this.bonusSpins?`FREE ${this.bonusSpins}`:"SPIN";const auto=q("[data-barber-auto]") as HTMLButtonElement;auto.textContent=this.autoInfinite?"AUTO ∞":this.autoRemaining?`AUTO ${this.autoRemaining}`:"AUTO";this.updateFortresses();}
  private showRules():void{const m=document.createElement("div");m.className="modal-backdrop";m.innerHTML=`<section class="slot-rules barber-rules"><button data-close>×</button><small>THE BIG BAD BARBER</small><h2>BUILD. UPGRADE. SURVIVE.</h2><p>Wins pay left to right on 243 ways. No Shave Wilds substitute for regular paying symbols.</p><h3>BEARD BUILDERS</h3><ul><li>Every Builder Crate upgrades the fortress above its reel.</li><li>Fortresses persist between paid spins and grow through four levels.</li><li>Higher levels store larger reveal multipliers.</li></ul><h3>THE BARBER ATTACK</h3><ul><li>Failed build spins can summon the Big Bad Barber.</li><li>He shaves one built fortress and reveals its stored prize.</li><li>The attacked fortress resets after paying.</li></ul><h3>THE SHAVE DOWN</h3><ul><li>Land 3+ Golden Razors for 8 free spins.</li><li>Builders remain active and failed builds are more dangerous.</li></ul><p class="rules-note">Original Beard Laws feature slot. Fictional credits only.</p></section>`;document.body.appendChild(m);m.querySelector("[data-close]")?.addEventListener("click",()=>m.remove());}
  private wait(ms:number):Promise<void>{return new Promise(r=>setTimeout(r,ms));}
}
