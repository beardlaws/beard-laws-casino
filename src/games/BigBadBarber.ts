import type { CasinoActivity } from "../state/CasinoProgression";
import { casinoRandom } from "../engine/CasinoRandom";
import { animateDomReels } from "./DomReelAnimator";
import { SlotBetModel } from "./SlotBetModel";
import { slotControlPanelMarkup } from "../ui/SlotControlPanel";
import { FeatureExecutionPipeline } from "../engine/feature/FeatureExecutionPipeline";
import type { FeatureExecutionContext, FeatureExecutionPlan } from "../engine/contracts/FeatureExecution";
import { GameStateMachine } from "../engine/GameStateMachine";
import { BarberPresentation, type BarberBuilderActor } from "./barber/BarberPresentation";
import {
  createBarberFeaturePlan,
  createBarberSpinOutcome,
  resolveBarberRuntime,
  resolveBarberFinale,
} from "./barber/BarberRuntime";

type SymbolId = "beard"|"wax"|"comb"|"pole"|"clipper"|"builder"|"wild"|"razor";
type BarberSymbol = { id:SymbolId; label:string; art:string; weight:number; pay:number };

const svg=(body:string,viewBox="0 0 100 100")=>`<svg class="barber-art" viewBox="${viewBox}" aria-hidden="true">${body}</svg>`;
const SYMBOLS: readonly BarberSymbol[] = [
  {id:"beard",label:"LEGENDARY BEARD",weight:23,pay:7,art:svg('<defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f4b25f"/><stop offset="1" stop-color="#7b351e"/></linearGradient></defs><path d="M26 27Q50 11 74 27L68 42Q82 48 75 67Q66 91 50 94Q34 91 25 67Q18 48 32 42Z" fill="url(#b)" stroke="#ffdc8a" stroke-width="4"/><path d="M38 47Q42 57 50 49Q58 57 62 47M35 65Q50 79 65 65" fill="none" stroke="#4c211a" stroke-width="5" stroke-linecap="round"/>')},
  {id:"wax",label:"BEARD WAX",weight:20,pay:8,art:svg('<ellipse cx="50" cy="26" rx="31" ry="12" fill="#f6d068" stroke="#fff0a4" stroke-width="4"/><path d="M19 26v44c0 9 62 9 62 0V26" fill="#8d2e3d" stroke="#f7c85f" stroke-width="4"/><ellipse cx="50" cy="69" rx="31" ry="12" fill="#5c1727"/><path d="M31 48Q42 38 50 48Q58 38 69 48Q57 64 50 53Q43 64 31 48" fill="#ffd66c"/>')},
  {id:"comb",label:"GOLD COMB",weight:18,pay:10,art:svg('<defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#9e5f12"/><stop offset=".5" stop-color="#fff19b"/><stop offset="1" stop-color="#b66c18"/></linearGradient></defs><path d="M17 23h66v22H17z" rx="8" fill="url(#g)" stroke="#fff0a0" stroke-width="4"/><path d="M23 44v36M33 44v29M43 44v36M53 44v29M63 44v36M73 44v29" stroke="url(#g)" stroke-width="7" stroke-linecap="round"/>')},
  {id:"pole",label:"BARBER POLE",weight:15,pay:13,art:svg('<rect x="33" y="15" width="34" height="70" rx="17" fill="#f8f3e5" stroke="#ffc95d" stroke-width="5"/><path d="M35 25l30 18M35 43l30 18M35 61l30 18" stroke="#d83946" stroke-width="10"/><path d="M65 25L35 43M65 61L35 79" stroke="#3276d1" stroke-width="8"/><ellipse cx="50" cy="14" rx="22" ry="7" fill="#e7b447"/><ellipse cx="50" cy="86" rx="22" ry="7" fill="#e7b447"/>')},
  {id:"clipper",label:"POWER CLIPPERS",weight:11,pay:18,art:svg('<path d="M29 16h42l-5 18H34z" fill="#dde6ec" stroke="#fff" stroke-width="4"/><path d="M35 34h30l10 45Q51 94 25 79z" fill="#4f2738" stroke="#f2b950" stroke-width="5"/><path d="M41 18v-8M50 18V8M59 18v-8" stroke="#fff" stroke-width="5"/><circle cx="50" cy="61" r="9" fill="#ffd35a"/><path d="M50 57v8" stroke="#6d341c" stroke-width="4"/>')},
  {id:"builder",label:"BEARD BUILDER",weight:6,pay:0,art:svg('<path d="M20 37h60v46H20z" fill="#9d5a25" stroke="#ffd072" stroke-width="5"/><path d="M16 32h68v15H16z" fill="#d88932" stroke="#ffe08a" stroke-width="4"/><path d="M31 24q19-19 38 0v9H31z" fill="#f0bb3d" stroke="#fff09a" stroke-width="4"/><path d="M42 16v16M58 16v16" stroke="#fff09a" stroke-width="4"/><path d="M35 57h30M35 68h22" stroke="#ffdf8a" stroke-width="5"/>')},
  {id:"wild",label:"NO SHAVE WILD",weight:2,pay:22,art:svg('<defs><radialGradient id="w"><stop stop-color="#fff8a6"/><stop offset="1" stop-color="#d47a1e"/></radialGradient></defs><circle cx="50" cy="50" r="42" fill="url(#w)" stroke="#fff5a4" stroke-width="5"/><path d="M22 51Q37 29 50 49Q63 29 78 51Q63 74 50 56Q37 74 22 51" fill="#42202b"/><text x="50" y="88" text-anchor="middle" font-size="15" font-weight="900" fill="#421b25">WILD</text>')},
  {id:"razor",label:"GOLDEN RAZOR",weight:2.5,pay:0,art:svg('<path d="M18 30h64v22H18z" rx="8" fill="#f8d260" stroke="#fff2a3" stroke-width="5"/><path d="M28 52h44l-7 14H35z" fill="#d9e8ee" stroke="#fff" stroke-width="4"/><path d="M50 66v22" stroke="#d8922d" stroke-width="9" stroke-linecap="round"/><circle cx="50" cy="89" r="7" fill="#ffe070"/>')},
];
const COLS=5, ROWS=3, MAX_LEVEL=4;
const FORT_NAMES=["EMPTY LOT","STUBBLE SHACK","LUMBER BEARD CABIN","VIKING BEARD HALL","GOLDEN BEARD CASTLE"];
const FORT_MULT=[0,3,8,20,75];

export const BARBER_PRODUCTION_MATH = {
  cols: COLS,
  rows: ROWS,
  maxFortressLevel: MAX_LEVEL,
  fortressMultipliers: FORT_MULT,
  bonusSpins: 8,
  attackChance: 0.14,
  basePayScale: 0.47,
  minimumMatch: 4,
  fortressAwardScale: 0.06,
  finalFortressAwardScale: 0.03,
  symbols: SYMBOLS.map(({ id, weight, pay }) => ({ id, weight, pay })),
} as const;

export class BigBadBarber {
  private spinning=false;
  private autoRemaining=0;
  private autoInfinite=false;
  private bonusSpins=0;
  private readonly betModel=new SlotBetModel();
  private lastWin=0;
  private fortressLevels=[0,0,0,0,0];
  private currentGrid:BarberSymbol[][]=[];
  private forceTwoRazors=false;
  private forceThreeRazors=false;
  private spinSequence=0;
  private shaveDownRunning=false;
  private shaveDownStartWallet=0;
  private presentation!:BarberPresentation;
  private readonly stateMachine=new GameStateMachine("barber");
  private readonly featureExecution=new FeatureExecutionPipeline({
    handlers:{
      progression:(context)=>this.executeProgressionStep(context),
      feature:(context)=>this.executeFeatureStep(context),
      payout:(context)=>this.executePayoutStep(context),
      presentation:(context)=>this.executePresentationStep(context),
      complete:()=>undefined,
    },
  });
  private readonly handleDeveloperAction=(event:Event):void=>{
    const action=(event as CustomEvent<{action?:string}>).detail?.action;
    if(action==="barber-bonus"&&!this.spinning)void this.runQaFeature("barber-shave-down");
    if(action==="barber-builder"&&!this.spinning)void this.runQaBuilder();
    if(action==="barber-attack"&&!this.spinning){
      if(!this.fortressLevels.some(level=>level>0)){this.fortressLevels=[2,1,3,2,1];this.updateFortresses();}
      void this.runQaFeature("barber-attack");
    }
    if(action==="barber-two-razors"&&!this.spinning){this.forceTwoRazors=true;this.message("QA ARMED • TWO-RAZOR ANTICIPATION ON NEXT SPIN");}
    if(action==="barber-three-razors"&&!this.spinning){this.forceThreeRazors=true;this.message("QA ARMED • THREE GOLDEN RAZORS ON NEXT SPIN");}
    if(action==="barber-max-forts"&&!this.spinning){this.fortressLevels=[4,4,4,4,4];this.updateFortresses();this.message("QA • ALL GOLDEN BEARD CASTLES BUILT");}
  };
  public constructor(private readonly root:HTMLElement,private readonly getWallet:()=>number,private readonly setWallet:(units:number)=>void,private readonly onExit:()=>void,private readonly onActivity:(activity:CasinoActivity)=>void=()=>{}){}
  private get betUnits():number{return this.betModel.wagerUnits;}

  public open():void{
    window.addEventListener("casino:dev",this.handleDeveloperAction as EventListener);
    this.root.innerHTML=`<main class="barber-room"><button class="back" data-barber-home>← CASINO LOBBY</button><section class="barber-machine">
      <div class="barber-ambient" aria-hidden="true"><i></i><i></i><i></i></div>
      <header><small>BEARD LAWS CASINO • PERSISTENT FEATURE SLOT</small><h1>THE BIG BAD BARBER</h1><p>Build legendary beard fortresses. Pray the clippers jam.</p><button class="game-rules" data-barber-rules>RULES &amp; PAYTABLE</button></header>
      <div class="barber-progress"><span class="fortress-meter"><small>FORTRESSES BUILT</small><b data-barber-forts>0 / 5</b></span><div class="fortress-track">${Array.from({length:5},(_,i)=>this.fortMarkup(i)).join("")}</div><span class="razor-meter"><small>FEATURE</small><b>3+ RAZORS</b></span></div>
      <div class="barber-message" data-barber-message>BUILD THE BEARDS • BEWARE THE BARBER</div>
      <div class="barber-bonus-hud" data-barber-bonus-hud hidden><span><small>SHAVE DOWN</small><b data-barber-bonus-spins>8 FREE SPINS</b></span><span><small>BONUS WIN</small><b data-barber-bonus-total>$0.00</b></span><em>BUILD • SURVIVE • FINAL TRIM</em></div>
      <div class="barber-stage"><div class="barber-character-layer" data-barber-character-layer></div><div class="barber-reels" data-barber-reels></div></div>
      ${slotControlPanelMarkup({prefix:"barber",auto:true})}
      <div class="barber-auto-menu" data-barber-auto-menu hidden><button data-auto-count="10">10</button><button data-auto-count="25">25</button><button data-auto-count="50">50</button><button data-auto-count="-1">∞</button></div>
      <footer><span>243 WAYS</span><span>BUILDERS UPGRADE THE FORT ABOVE THEIR REEL</span><span>FAILED BUILDS MAY SUMMON THE BARBER</span></footer>
    </section></main>`;
    this.presentation=new BarberPresentation(this.root);
    this.bind();
    this.currentGrid=this.makeGrid();this.render(this.currentGrid);this.update();
  }

  private bind():void{
    this.root.querySelector("[data-barber-home]")?.addEventListener("click",()=>{this.stopAuto();window.removeEventListener("casino:dev",this.handleDeveloperAction as EventListener);this.onExit();});
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

  private evaluate(grid:BarberSymbol[][]):{award:number;winners:Set<string>}{let total=0;const winners=new Set<string>();const minimum=BARBER_PRODUCTION_MATH.minimumMatch;for(const target of SYMBOLS.filter(s=>!["razor","wild","builder"].includes(s.id))){let ways=1,length=0;const local:string[]=[];for(let x=0;x<COLS;x++){const ys=grid.map((r,y)=>({s:r[x]!,y})).filter(v=>v.s.id===target.id||v.s.id==="wild");if(!ys.length)break;length++;ways*=ys.length;ys.forEach(v=>local.push(`${x}:${v.y}`));}if(length>=minimum){local.forEach(v=>winners.add(v));total+=Math.round(target.pay*BARBER_PRODUCTION_MATH.basePayScale*ways*(length-minimum+1)*this.betUnits/10);}}return{award:total,winners};}

  private async spin():Promise<void>{
    if(this.spinning||(!this.bonusSpins&&this.getWallet()<this.betUnits))return;
    this.spinning=true;this.lastWin=0;
    const startedAtIso=new Date().toISOString();
    const spinId=`barber-${Date.now()}-${++this.spinSequence}`;
    const fortressLevelsBefore=[...this.fortressLevels];
    const isBonus=this.bonusSpins>0;
    const wagerUnits=this.betUnits;

    this.stateMachine.transition("SPIN_START");
    if(isBonus)this.bonusSpins--;
    else{this.setWallet(this.getWallet()-wagerUnits);this.onActivity({type:"spin",game:"barber",wager:wagerUnits});}
    this.stateMachine.transition("SPINNING");
    this.root.querySelector(".barber-machine")?.classList.add("barber-spinning");this.update();

    const grid=this.makeGrid();
    const qaForcedThreeRazors=this.forceThreeRazors;
    if(this.forceTwoRazors || this.forceThreeRazors){
      const razor=SYMBOLS.find(s=>s.id==="razor")!;
      const wax=SYMBOLS.find(s=>s.id==="wax")!;
      const forced = this.forceThreeRazors ? new Set(["0:1","2:1","4:1"]) : new Set(["0:1","2:1"]);
      grid.forEach((row,y)=>row.forEach((symbol,x)=>{row[x]=forced.has(`${x}:${y}`)?razor:(symbol.id==="razor"?wax:symbol);}));
      this.forceTwoRazors=false;
      this.forceThreeRazors=false;
    }
    this.currentGrid=grid;
    const host=this.root.querySelector<HTMLElement>("[data-barber-reels]")!;
    const cols=Array.from({length:COLS},(_,x)=>grid.map(r=>r[x]!));
    const earlyRazors=cols.slice(0,4).flat().filter(s=>s.id==="razor").length;
    if(earlyRazors>=2){this.message("THE GOLDEN RAZOR IS CIRCLING THE FINAL REEL…");this.presentation.setAnticipation(true,4);}
    try{
      await animateDomReels({host,finalColumns:cols,rows:ROWS,randomSymbol:()=>this.pick(),profile:"barber",anticipationReel:earlyRazors>=2?4:-1,anticipationDelay:1250,renderSymbol:s=>this.symbolMarkup(s)});
    }finally{
      this.presentation.setAnticipation(false,4);
    }
    this.render(grid);this.root.querySelector(".barber-machine")?.classList.remove("barber-spinning");
    this.stateMachine.transition("REEL_STOPS");await this.wait(160);
    this.stateMachine.transition("EVALUATING");

    const result=this.evaluate(grid);
    const razors=grid.flat().filter(s=>s.id==="razor").length;
    if(!isBonus&&razors>=3)this.message(`${razors} GOLDEN RAZORS • THE SHAVE DOWN TRIGGERS!`);
    const builderCounts=Array.from({length:COLS},(_,x)=>grid.filter(row=>row[x]!.id==="builder").length);
    const decision=resolveBarberRuntime({
      fortressLevels:fortressLevelsBefore,
      builderCounts,
      maxLevel:MAX_LEVEL,
      fortressMultipliers:FORT_MULT,
      razorCount:razors,
      baseWinUnits:result.award,
      isBonusSpin:isBonus,
      wagerUnits,
      attackChance:BARBER_PRODUCTION_MATH.attackChance,
      attackRoll:casinoRandom(),
      targetRoll:casinoRandom(),
      fortressAwardScale:BARBER_PRODUCTION_MATH.fortressAwardScale,
    });
    if(qaForcedThreeRazors){
      window.dispatchEvent(new CustomEvent("casino:qa-result",{detail:{
        ok:decision.triggerShaveDown,
        message:decision.triggerShaveDown
          ? "VERIFIED: three Golden Razors were counted by the paid-spin evaluator and launched Shave Down."
          : `FAILED: three-Razor verification produced razorCount=${razors}.`,
      }}));
    }
    const outcome=createBarberSpinOutcome({
      id:spinId,
      startedAtIso,
      completedAtIso:new Date().toISOString(),
      wagerUnits,
      baseWinUnits:result.award,
      resultGrid:grid.map(row=>row.map(symbol=>symbol.id)),
      winnerKeys:[...result.winners],
      razorCount:razors,
      isBonusSpin:isBonus,
      fortressLevelsBefore,
      decision,
    });
    const plan=createBarberFeaturePlan(outcome);

    try{
      await this.featureExecution.enqueue(plan);
    }finally{
      this.spinning=false;
      if(this.stateMachine.state==="FEATURE_ACTIVE")this.stateMachine.transition("FEATURE_OUTRO");
      this.stateMachine.reset();
      this.update();
    }

    window.dispatchEvent(new CustomEvent("casino:direct-outcome",{detail:outcome}));

    if(isBonus&&this.bonusSpins===0&&this.shaveDownRunning)await this.finishShaveDown();
    if(this.bonusSpins>0){await this.wait(650);void this.spin();return;}
    if(this.autoInfinite||this.autoRemaining>0){
      if(this.autoRemaining>0)this.autoRemaining--;
      if(this.getWallet()>=this.betUnits){await this.wait(650);void this.spin();}
      else this.stopAuto();
    }
  }

  private enterFeatureState():void{
    if(this.stateMachine.state==="READY")this.stateMachine.transition("FEATURE_INTRO");
    else if(this.stateMachine.state==="EVALUATING")this.stateMachine.transition("FEATURE_INTRO");
    if(this.stateMachine.state==="FEATURE_INTRO")this.stateMachine.transition("FEATURE_ACTIVE");
  }

  private async executeProgressionStep(context:FeatureExecutionContext):Promise<void>{
    if(context.step.label!=="barber-builder-upgrade")return;
    this.enterFeatureState();
    const reel=Number(context.step.payload.reel);
    const toLevel=Number(context.step.payload.toLevel);
    if(!Number.isInteger(reel)||reel<0||reel>=COLS)return;
    if(!Number.isInteger(toLevel)||toLevel<1||toLevel>MAX_LEVEL)return;
    this.message("BEARD BUILDERS ON THE BOARD!");
    window.dispatchEvent(new CustomEvent("casino:sound",{detail:{cue:"builder"}}));
    const actor:BarberBuilderActor=await this.presentation.builderArrive(reel);
    this.fortressLevels[reel]=toLevel;
    this.updateFortresses();
    await this.presentation.builderFinish(actor);
  }

  private async executeFeatureStep(context:FeatureExecutionContext):Promise<void>{
    this.enterFeatureState();
    if(context.step.label==="barber-shave-down"){
      if(context.step.payload.qa!==true)this.onActivity({type:"bonus",game:"barber"});
      await this.startShaveDown();
      return;
    }
    if(context.step.label==="barber-attack"){
      const targetReel=Number(context.step.payload.targetReel);
      const fortressLevel=Number(context.step.payload.fortressLevel);
      const multiplier=Number(context.step.payload.multiplier);
      const awardUnits=Number(context.step.payload.awardUnits);
      await this.executeBarberAttack({targetReel,fortressLevel,multiplier,awardUnits},context.step.payload.qa===true);
    }
  }

  private async executePayoutStep(context:FeatureExecutionContext):Promise<void>{
    if(context.step.label!=="barber-base-payout")return;
    if(this.stateMachine.state==="EVALUATING"||this.stateMachine.state==="FEATURE_ACTIVE")this.stateMachine.transition("WIN_PRESENTATION");
    const amountUnits=Number(context.step.payload.amountUnits);
    const winnerKeys=Array.isArray(context.step.payload.winnerKeys)?context.step.payload.winnerKeys.map(String):[];
    await this.payBaseWin(this.currentGrid,{award:Math.max(0,amountUnits),winners:new Set(winnerKeys)});
  }

  private executePresentationStep(context:FeatureExecutionContext):void{
    if(context.step.label!=="barber-message")return;
    this.message(String(context.step.payload.message??"THE BARBER IS STILL OUT THERE…"));
  }

  private async executeBarberAttack(attack:{targetReel:number;fortressLevel:number;multiplier:number;awardUnits:number},qa=false):Promise<void>{
    if(!Number.isInteger(attack.targetReel)||attack.targetReel<0||attack.targetReel>=COLS)return;
    const currentLevel=this.fortressLevels[attack.targetReel]??0;
    if(currentLevel<=0)return;
    const level=Math.max(1,Math.min(MAX_LEVEL,attack.fortressLevel||currentLevel));
    const mult=Math.max(0,attack.multiplier||FORT_MULT[level]||0);
    const award=Math.max(0,Math.round(attack.awardUnits));
    this.message(`THE BIG BAD BARBER TARGETS FORTRESS ${attack.targetReel+1}!`);
    window.dispatchEvent(new CustomEvent("casino:sound",{detail:{cue:"barber"}}));
    this.presentation.targetFort(attack.targetReel);
    const layer=this.characterLayer();
    layer.innerHTML=`<div class="mean-barber attack" style="--target:${attack.targetReel}"><div class="barber-head"><b></b><i></i></div><div class="barber-clippers"></div><div class="barber-speech">${this.presentation.barberTaunt(()=>casinoRandom())}</div></div>`;
    await this.wait(750);
    window.dispatchEvent(new CustomEvent("casino:sound",{detail:{cue:"clippers"}}));
    await this.pulseFort(attack.targetReel,"attack");
    const fort=this.root.querySelector<HTMLElement>(`[data-fort="${attack.targetReel}"]`)!;
    fort.classList.add("being-shaved");this.spawnShavings(fort);await this.wait(1250);
    fort.classList.remove("being-shaved");this.fortressLevels[attack.targetReel]=0;this.updateFortresses();
    if(award>0){
      this.lastWin+=award;this.setWallet(this.getWallet()+award);
      if(!qa)this.onActivity({type:"win",game:"barber",amount:award,value:this.betUnits>0?award/this.betUnits:0,wager:this.betUnits});
    }
    fort.classList.add("prize-reveal");
    fort.insertAdjacentHTML("beforeend",`<div class="fort-prize">${mult}×<small>$${(award/100).toFixed(2)}</small></div>`);
    this.message(`${FORT_NAMES[level]} SHAVED • ${mult}× REVEALED`);
    this.presentation.rewardBurst(fort);
    if(award>0)await this.presentation.celebrateWin(Math.max(0,this.lastWin-award),this.lastWin,this.betUnits);
    await this.wait(1300);
    fort.querySelector(".fort-prize")?.remove();fort.classList.remove("prize-reveal");layer.innerHTML="";
    this.presentation.clearTarget();
    if(this.bonusSpins>0)this.message(`${this.bonusSpins} SHAVE DOWN SPINS REMAIN`);
  }


  private async runQaBuilder():Promise<void>{
    if(this.spinning)return;
    const reel=this.fortressLevels.findIndex(level=>level<MAX_LEVEL);
    if(reel<0){this.message("QA • ALL FORTRESSES ALREADY MAXED");return;}
    this.spinning=true;this.update();
    const toLevel=(this.fortressLevels[reel]??0)+1;
    const plan:FeatureExecutionPlan=Object.freeze({
      schemaVersion:1,
      id:`qa-builder-plan-${Date.now()}`,
      spinOutcomeId:`qa-builder-${Date.now()}`,
      game:"barber",
      createdAtIso:new Date().toISOString(),
      steps:Object.freeze([
        Object.freeze({id:`qa-builder-${Date.now()}`,kind:"progression",game:"barber",order:0,delayMs:0,label:"barber-builder-upgrade",payload:Object.freeze({reel,fromLevel:this.fortressLevels[reel]??0,toLevel,qa:true})}),
        Object.freeze({id:`qa-builder-complete-${Date.now()}`,kind:"complete",game:"barber",order:1,delayMs:0,label:"ready",payload:Object.freeze({qa:true})}),
      ]),
    });
    try{await this.featureExecution.enqueue(plan);}finally{this.spinning=false;if(this.stateMachine.state==="FEATURE_ACTIVE")this.stateMachine.transition("FEATURE_OUTRO");this.stateMachine.reset();this.update();}
  }

  private async runQaFeature(kind:"barber-shave-down"|"barber-attack"):Promise<void>{
    if(this.spinning)return;
    this.spinning=true;this.update();
    let step:FeatureExecutionPlan["steps"][number];
    if(kind==="barber-shave-down"){
      step={id:`qa-shave-${Date.now()}`,kind:"feature",game:"barber",order:0,delayMs:0,label:kind,payload:Object.freeze({spins:8,qa:true})};
    }else{
      const built=this.fortressLevels.map((level,reel)=>({level,reel})).filter(entry=>entry.level>0);
      const target=built[0]!;const multiplier=FORT_MULT[target.level]??0;
      step={id:`qa-attack-${Date.now()}`,kind:"feature",game:"barber",order:0,delayMs:0,label:kind,payload:Object.freeze({targetReel:target.reel,fortressLevel:target.level,multiplier,awardUnits:this.betUnits*multiplier*BARBER_PRODUCTION_MATH.fortressAwardScale,qa:true})};
    }
    const plan:FeatureExecutionPlan=Object.freeze({schemaVersion:1,id:`qa-plan-${Date.now()}`,spinOutcomeId:`qa-${Date.now()}`,game:"barber",createdAtIso:new Date().toISOString(),steps:Object.freeze([Object.freeze(step),Object.freeze({id:`qa-complete-${Date.now()}`,kind:"complete",game:"barber",order:1,delayMs:0,label:"ready",payload:Object.freeze({qa:true})})])});
    try{await this.featureExecution.enqueue(plan);}finally{this.spinning=false;if(this.stateMachine.state==="FEATURE_ACTIVE")this.stateMachine.transition("FEATURE_OUTRO");this.stateMachine.reset();this.update();}
  }


  private async payBaseWin(grid:BarberSymbol[][],result:{award:number;winners:Set<string>}):Promise<void>{const before=this.lastWin;this.render(grid,result.winners);this.lastWin+=result.award;this.setWallet(this.getWallet()+result.award);this.onActivity({type:"win",game:"barber",amount:result.award,value:result.award/this.betUnits,wager:this.betUnits});this.message(`BEARD POWER PAYS $${(result.award/100).toFixed(2)}`);await this.presentation.celebrateWin(before,this.lastWin,this.betUnits);await this.wait(420);}

  private async startShaveDown():Promise<void>{
    window.dispatchEvent(new CustomEvent("casino:sound",{detail:{cue:"barber"}}));
    this.bonusSpins=BARBER_PRODUCTION_MATH.bonusSpins;
    this.shaveDownRunning=true;
    this.shaveDownStartWallet=this.getWallet();
    const layer=this.characterLayer();
    const machine=this.root.querySelector<HTMLElement>(".barber-machine");
    machine?.classList.add("bonus-mode","shave-down-active");
    layer.innerHTML=`<div class="shave-down-trigger"><div class="razor-lock-row"><i>RAZOR</i><i>RAZOR</i><i>RAZOR</i></div><div class="mean-barber intro"><div class="barber-head"><b></b><i></i></div><div class="barber-clippers"></div></div><strong>THE SHAVE DOWN!</strong><small>8 FREE SPINS • BUILD THE FORTRESSES • SURVIVE THE FINAL TRIM</small></div>`;
    this.message("3 GOLDEN RAZORS LOCKED • THE SHAVE DOWN BEGINS!");
    await this.wait(2400);
    layer.innerHTML="";
    this.message("8 FREE SPINS • BUILD FAST • FAILED BUILDS CAN SUMMON THE BARBER");
    this.update();
  }

  private async finishShaveDown():Promise<void>{
    if(!this.shaveDownRunning)return;
    const layer=this.characterLayer();
    const built=this.fortressLevels.map((level,reel)=>({level,reel})).filter((entry)=>entry.level>0);
    this.message(built.length?"FINAL TRIM • EVERY SURVIVING FORTRESS REVEALS":"FINAL TRIM • THE BARBER CLEARED THE BLOCK");
    layer.innerHTML=`<div class="shave-down-finale"><div class="mean-barber intro"><div class="barber-head"><b></b><i></i></div><div class="barber-clippers"></div></div><strong>FINAL TRIM</strong><small>${built.length?`${built.length} FORTRESS${built.length===1?"":"ES"} TO SHAVE`:"NO FORTRESSES SURVIVED"}</small></div>`;
    window.dispatchEvent(new CustomEvent("casino:sound",{detail:{cue:"barber"}}));
    await this.wait(1500);
    layer.innerHTML="";
    const reveals=resolveBarberFinale(
      this.fortressLevels,
      FORT_MULT,
      this.betUnits,
      BARBER_PRODUCTION_MATH.finalFortressAwardScale,
    );
    for(const reveal of reveals){
      await this.revealFinaleFort(reveal.reel,reveal.multiplier,reveal.awardUnits);
    }
    const total=Math.max(0,this.getWallet()-this.shaveDownStartWallet);
    layer.innerHTML=`<div class="shave-down-total"><small>SHAVE DOWN COMPLETE</small><strong>$${(total/100).toFixed(2)}</strong><b>THE BARBER LEAVES • THE BEARDS WILL REBUILD</b></div>`;
    this.message(`SHAVE DOWN COMPLETE • BONUS WIN $${(total/100).toFixed(2)}`);
    await this.wait(2200);
    layer.innerHTML="";
    this.shaveDownRunning=false;
    this.root.querySelector(".barber-machine")?.classList.remove("bonus-mode","shave-down-active");
    this.update();
  }

  private async revealFinaleFort(reel:number,multiplier:number,awardUnits:number):Promise<void>{
    const fort=this.root.querySelector<HTMLElement>(`[data-fort="${reel}"]`);
    if(!fort)return;
    this.presentation.targetFort(reel);
    const layer=this.characterLayer();
    layer.innerHTML=`<div class="mean-barber attack finale" style="--target:${reel}"><div class="barber-head"><b></b><i></i></div><div class="barber-clippers"></div><div class="barber-speech">FINAL TRIM!</div></div>`;
    window.dispatchEvent(new CustomEvent("casino:sound",{detail:{cue:"clippers"}}));
    await this.wait(420);
    fort.classList.add("being-shaved","finale-shave");
    this.spawnShavings(fort);
    await this.wait(620);
    fort.classList.remove("being-shaved","finale-shave");
    this.fortressLevels[reel]=0;
    this.updateFortresses();
    if(awardUnits>0){
      this.lastWin+=awardUnits;
      this.setWallet(this.getWallet()+awardUnits);
      this.onActivity({type:"win",game:"barber",amount:awardUnits,value:this.betUnits>0?awardUnits/this.betUnits:0,wager:this.betUnits});
    }
    fort.classList.add("prize-reveal");
    fort.insertAdjacentHTML("beforeend",`<div class="fort-prize finale-prize">${multiplier}×<small>$${(awardUnits/100).toFixed(2)}</small></div>`);
    this.presentation.rewardBurst(fort);
    await this.wait(720);
    fort.querySelector(".fort-prize")?.remove();
    fort.classList.remove("prize-reveal");
    layer.innerHTML="";
    this.presentation.clearTarget();
    this.update();
  }


  private fortMarkup(i:number):string{return `<i data-fort="${i}" class="fort-level-0"><span class="fort-art"><b class="fort-roof"></b><b class="fort-body"></b><b class="fort-window"></b><b class="fort-chimney"></b><b class="fort-smoke"></b><b class="fort-beard"></b><b class="fort-flag"></b></span><small data-fort-name>${FORT_NAMES[0]}</small><em data-fort-mult>EMPTY</em></i>`;}
  private updateFortresses():void{this.root.querySelectorAll<HTMLElement>("[data-fort]").forEach((n,i)=>{const l=this.fortressLevels[i]!;n.className=`fort-level-${l}`;n.querySelector<HTMLElement>("[data-fort-name]")!.textContent=FORT_NAMES[l]!;n.querySelector<HTMLElement>("[data-fort-mult]")!.textContent=l?`${FORT_MULT[l]}×`:"EMPTY";});const b=this.root.querySelector<HTMLElement>("[data-barber-forts]");if(b)b.textContent=`${this.fortressLevels.filter(x=>x>0).length} / 5`;}
  private async pulseFort(i:number,mode:"upgrade"|"attack"):Promise<void>{const n=this.root.querySelector<HTMLElement>(`[data-fort="${i}"]`);if(!n)return;n.classList.add(mode);await this.wait(mode==="upgrade"?700:420);n.classList.remove(mode);}
  private spawnShavings(host:HTMLElement):void{for(let i=0;i<24;i++){const p=document.createElement("i");p.className="beard-shaving";p.style.setProperty("--x",`${(casinoRandom()-.5)*150}px`);p.style.setProperty("--r",`${(casinoRandom()-.5)*500}deg`);p.style.animationDelay=`${casinoRandom()*220}ms`;host.appendChild(p);setTimeout(()=>p.remove(),1500);}}
  private characterLayer():HTMLElement{return this.root.querySelector<HTMLElement>("[data-barber-character-layer]")!;}

  private toggleAutoMenu():void{if(this.spinning)return;const m=this.root.querySelector<HTMLElement>("[data-barber-auto-menu]")!;m.hidden=!m.hidden;}
  private startAuto(count:number):void{this.autoInfinite=count<0;this.autoRemaining=Math.max(0,count);this.root.querySelector<HTMLElement>("[data-barber-auto-menu]")!.hidden=true;this.update();void this.spin();}
  private stopAuto():void{this.autoInfinite=false;this.autoRemaining=0;this.update();}
  private changeBet(d:number):void{if(this.spinning||this.autoRemaining||this.autoInfinite)return;this.betModel.changeCredits(d);this.update();}
  private changeDenom(d:number):void{if(this.spinning||this.autoRemaining||this.autoInfinite)return;this.betModel.changeDenomination(d);this.update();}
  private message(s:string):void{const n=this.root.querySelector<HTMLElement>("[data-barber-message]");if(n)n.textContent=s;}
  private update():void{const q=(s:string)=>this.root.querySelector<HTMLElement>(s);const credit=q("[data-barber-credit]"),bet=q("[data-barber-bet]"),denom=q("[data-barber-denom]"),credits=q("[data-barber-credits]"),win=q("[data-barber-win]");if(!credit||!bet||!denom||!credits||!win)return;credit.textContent=`$${(this.getWallet()/100).toFixed(2)}`;bet.textContent=`$${(this.betUnits/100).toFixed(2)}`;denom.textContent=`${this.betModel.denominationUnits}¢`;credits.textContent=String(this.betModel.credits);win.textContent=`$${(this.lastWin/100).toFixed(2)}`;const spin=q("[data-barber-spin]") as HTMLButtonElement;spin.disabled=this.spinning||(!this.bonusSpins&&this.getWallet()<this.betUnits);spin.textContent=this.autoRemaining||this.autoInfinite?"STOP":this.bonusSpins?`FREE ${this.bonusSpins}`:"SPIN";const auto=q("[data-barber-auto]") as HTMLButtonElement;auto.textContent=this.autoInfinite?"AUTO ∞":this.autoRemaining?`AUTO ${this.autoRemaining}`:"AUTO";const hud=q("[data-barber-bonus-hud]");if(hud){hud.hidden=!this.shaveDownRunning;const spins=q("[data-barber-bonus-spins]"),total=q("[data-barber-bonus-total]");if(spins)spins.textContent=`${this.bonusSpins} FREE SPINS`;if(total)total.textContent=`$${(Math.max(0,this.getWallet()-this.shaveDownStartWallet)/100).toFixed(2)}`;}this.updateFortresses();}
  private showRules():void{const m=document.createElement("div");m.className="modal-backdrop";m.innerHTML=`<section class="slot-rules barber-rules"><button data-close>×</button><small>THE BIG BAD BARBER</small><h2>BUILD. UPGRADE. SURVIVE.</h2><p>Wins pay left to right on 243 ways. No Shave Wilds substitute for regular paying symbols.</p><h3>BEARD BUILDERS</h3><ul><li>Every Builder Crate upgrades the fortress above its reel.</li><li>Fortresses persist between paid spins and grow through four levels.</li><li>Higher levels store larger reveal multipliers.</li></ul><h3>THE BARBER ATTACK</h3><ul><li>Failed build spins can summon the Big Bad Barber.</li><li>He shaves one built fortress and reveals its stored prize.</li><li>The attacked fortress resets after paying.</li></ul><h3>THE SHAVE DOWN</h3><ul><li>Land 3+ Golden Razors on a paid spin and the Shave Down always triggers.</li><li>Eight free spins keep Builders active; failed build spins can summon the Barber.</li><li>When the final free spin ends, every surviving fortress enters the Final Trim and reveals its stored prize.</li></ul><p class="rules-note">Original Beard Laws feature slot. Fictional credits only.</p></section>`;document.body.appendChild(m);m.querySelector("[data-close]")?.addEventListener("click",()=>m.remove());}
  private wait(ms:number):Promise<void>{return new Promise(r=>setTimeout(r,ms));}
}
