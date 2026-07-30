
const KEY = "beardLawsCasinoV03";
const OLD_KEYS = ["beardLawsCasinoV02","beardLawsCasinoV01"];
const RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const RESULTS = ["0","00",...Array.from({length:36},(_,i)=>String(i+1))];
const ATM_FEE = 799;

const defaultState = () => ({
  version:3, bank:200000, wallet:0, activeTrip:null, selectedTrip:20000, selectedChip:100,
  roulette:{bets:{},previous:{},history:[],last:null,lastNet:0,spins:0,wagered:0},
  blackjack:{inRound:false,player:[],dealer:[],bet:0,hidden:true,message:"Place a bet to begin.",stats:{hands:0,wagered:0}},
  beardBank:{progress:0,chase:0,spins:0,wagered:0,lastGrid:[]},
  lumber:{level:3,spins:0,wagered:0,lastGrid:[]},
  trips:[], lifetime:{trips:0,net:0,wagered:0,atmFees:0}, settings:{quick:false}
});

function money(c){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(c/100)}
function clone(v){return JSON.parse(JSON.stringify(v))}
function randomInt(max){const a=new Uint32Array(1);const limit=Math.floor(0x100000000/max)*max;do{crypto.getRandomValues(a)}while(a[0]>=limit);return a[0]%max}
function colorOf(r){if(r==="0"||r==="00")return"green";return RED.has(Number(r))?"red":"black"}

function migrate(raw){
  const s=defaultState();
  if(!raw)return s;
  const cents=v=>Math.round(Number(v||0)*(raw.schemaVersion===2?1:100));
  s.bank=cents(raw.bank); s.wallet=cents(raw.wallet);
  if(raw.activeTrip){
    const t=raw.activeTrip;
    s.activeTrip={
      id:t.id||crypto.randomUUID(),startedAt:t.startedAt||Date.now(),
      startingCash:cents(t.startingCash),openingTotal:cents(t.openingTotalFunds??t.openingBank),
      atmWithdrawals:cents(t.atmWithdrawals),atmFees:cents(t.atmFees),atmCount:Number(t.atmCount||0),
      wagered:cents(t.totalWagered),highest:cents(t.highestWallet),lowest:cents(t.lowestWallet)
    };
  }
  return s;
}
function load(){
  try{
    const current=localStorage.getItem(KEY); if(current)return {...defaultState(),...JSON.parse(current)};
    for(const k of OLD_KEYS){const raw=localStorage.getItem(k);if(raw){const s=migrate(JSON.parse(raw));save(s);return s}}
  }catch(e){console.error(e)}
  return defaultState()
}
function save(s=state){localStorage.setItem(KEY,JSON.stringify(s))}
let state=load(); let timer=null; let currentScreen="lobby"; let rouletteLocked=false;

const $=id=>document.getElementById(id);
function modal(title,html){$("modalTitle").textContent=title;$("modalBody").innerHTML=html;$("modal").showModal()}
function closeModal(){$("modal").close()}
function totalFunds(){return state.bank+state.wallet}
function tripNet(){return state.activeTrip?totalFunds()-state.activeTrip.openingTotal:0}
function addWager(amount){state.activeTrip.wagered+=amount;state.lifetime.wagered+=amount}
function ensureTrip(){if(!state.activeTrip)throw new Error("Start a casino visit first.")}
function spend(amount){ensureTrip();if(amount>state.wallet)throw new Error("Not enough in the casino wallet.");state.wallet-=amount;addWager(amount)}
function win(amount){state.wallet+=amount;state.activeTrip.highest=Math.max(state.activeTrip.highest,state.wallet);state.activeTrip.lowest=Math.min(state.activeTrip.lowest,state.wallet)}
function safe(fn){try{fn()}catch(e){alert(e.message)}}

function startTrip(amount){
  if(amount<2000||amount>50000)throw new Error("Choose between $20 and $500.");
  if(amount>state.bank)throw new Error("Not enough in the fictional Beard Laws Bank.");
  const opening=totalFunds();state.bank-=amount;state.wallet=amount;
  state.activeTrip={id:crypto.randomUUID(),startedAt:Date.now(),startingCash:amount,openingTotal:opening,atmWithdrawals:0,atmFees:0,atmCount:0,wagered:0,highest:amount,lowest:amount};
  state.roulette.bets={};state.roulette.previous={};save();showCasino();render();startClock()
}
function cashOut(){
  const t=state.activeTrip;const ending=state.wallet;state.bank+=ending;
  const completed={...t,endedAt:Date.now(),endingCash:ending,net:state.bank-t.openingTotal};
  state.trips.unshift(completed);state.trips=state.trips.slice(0,100);state.lifetime.trips++;state.lifetime.net+=completed.net;
  state.wallet=0;state.activeTrip=null;state.blackjack.inRound=false;save();showWelcome();render();
  modal("Trip Complete",`<div class="stat-row"><span>Started with</span><strong>${money(completed.startingCash)}</strong></div><div class="stat-row"><span>ATM fees</span><strong>${money(completed.atmFees)}</strong></div><div class="stat-row"><span>Total wagered</span><strong>${money(completed.wagered)}</strong></div><div class="stat-row"><span>Cash returned</span><strong>${money(completed.endingCash)}</strong></div><div class="stat-row"><span>Net visit result</span><strong class="${completed.net>=0?"win":"loss"}">${money(completed.net)}</strong></div>`)
}
function showWelcome(){$("welcomeView").classList.remove("hidden");$("casinoView").classList.add("hidden")}
function showCasino(){$("welcomeView").classList.add("hidden");$("casinoView").classList.remove("hidden");showScreen("lobby")}
function showScreen(name){
  currentScreen=name;
  ["lobby","roulette","blackjack","beardbank","lumber"].forEach(n=>$(n+"Screen").classList.toggle("hidden",n!==name));
  render();
}
function startClock(){if(timer)clearInterval(timer);timer=setInterval(renderClock,1000);renderClock()}
function renderClock(){if(!state.activeTrip)return;const sec=Math.floor((Date.now()-state.activeTrip.startedAt)/1000);$("tripClock").textContent=`${String(Math.floor(sec/60)).padStart(2,"0")}:${String(sec%60).padStart(2,"0")}`}

function render(){
  $("bankBalance").textContent=money(state.bank);$("walletBalance").textContent=money(state.wallet);
  document.querySelectorAll(".trip-btn[data-amount]").forEach(b=>b.classList.toggle("selected",Number(b.dataset.amount)===state.selectedTrip));
  $("startTripBtn").textContent=`Start Visit With ${money(state.selectedTrip)}`;
  if(!state.activeTrip)return;
  $("tripResult").textContent=money(tripNet());$("tripResult").className=tripNet()>=0?"win":"loss";renderClock();
  renderRoulette();renderBlackjack();renderBeardBank();renderLumber()
}

/* Roulette */
function buildRoulette(){
  const board=$("rouletteBoard");board.innerHTML="";
  ["0","00"].forEach(r=>board.appendChild(betCell(r,"number:"+r,"green")));
  for(let n=1;n<=36;n++)board.appendChild(betCell(String(n),"number:"+n,colorOf(String(n))));
  [["1st 12","dozen1"],["2nd 12","dozen2"],["3rd 12","dozen3"],["1–18","low"],["Even","even"],["Red","red"],["Black","black"],["Odd","odd"],["19–36","high"],["1st Col","column1"],["2nd Col","column2"],["3rd Col","column3"]].forEach(([l,k])=>board.appendChild(betCell(l,k,"outside")))
}
function betCell(label,key,klass){const b=document.createElement("button");b.className=`bet-cell ${klass}`;b.dataset.bet=key;b.textContent=label;b.onclick=()=>{if(rouletteLocked)return;safe(()=>{const total=Object.values(state.roulette.bets).reduce((a,b)=>a+b,0);if(total+state.selectedChip>state.wallet)throw new Error("Not enough in the casino wallet.");state.roulette.bets[key]=(state.roulette.bets[key]||0)+state.selectedChip;save();renderRoulette()})};return b}
function evalBet(key,r){const n=Number(r);if(key.startsWith("number:"))return r===key.split(":")[1]?35:-1;if(r==="0"||r==="00")return-1;if(key==="red")return colorOf(r)==="red"?1:-1;if(key==="black")return colorOf(r)==="black"?1:-1;if(key==="odd")return n%2?1:-1;if(key==="even")return n%2===0?1:-1;if(key==="low")return n<=18?1:-1;if(key==="high")return n>=19?1:-1;if(key==="dozen1")return n<=12?2:-1;if(key==="dozen2")return n>=13&&n<=24?2:-1;if(key==="dozen3")return n>=25?2:-1;if(key==="column1")return n%3===1?2:-1;if(key==="column2")return n%3===2?2:-1;if(key==="column3")return n%3===0?2:-1;return-1}
function renderRoulette(){
  if(!state.activeTrip)return;
  document.querySelectorAll("[data-bet]").forEach(cell=>{cell.querySelector(".marker")?.remove();const v=state.roulette.bets[cell.dataset.bet];if(v){const m=document.createElement("span");m.className="marker";m.textContent=money(v).replace(".00","");cell.appendChild(m)}});
  const entries=Object.entries(state.roulette.bets);$("rouletteBetList").innerHTML=entries.length?entries.map(([k,v])=>`<div class="stat-row"><span>${k.replace("number:","Number ")}</span><strong>${money(v)}</strong></div>`).join(""):`<p class="muted">No bets placed.</p>`;
  $("rouletteBetTotal").textContent=money(entries.reduce((a,[,v])=>a+v,0));$("rouletteWagered").textContent=money(state.roulette.wagered);$("rouletteSpins").textContent=state.roulette.spins;$("rouletteResult").textContent=state.roulette.last||"—";$("rouletteMessage").textContent=state.roulette.last?(state.roulette.lastNet>=0?`Won ${money(state.roulette.lastNet)}`:`Lost ${money(Math.abs(state.roulette.lastNet))}`):""
}
async function spinRoulette(){
  if(rouletteLocked)return;const total=Object.values(state.roulette.bets).reduce((a,b)=>a+b,0);if(!total)return alert("Place a bet first.");
  safe(()=>spend(total));if(total>state.wallet+total)return;
  rouletteLocked=true;state.roulette.previous=clone(state.roulette.bets);state.roulette.spins++;state.roulette.wagered+=total;
  const result=RESULTS[randomInt(RESULTS.length)];$("rouletteWheel").style.transform=`rotate(${1440+randomInt(720)}deg)`;render();
  await new Promise(r=>setTimeout(r,state.settings.quick?300:2200));
  let returned=0;for(const[k,v]of Object.entries(state.roulette.bets)){const odds=evalBet(k,result);if(odds>=0)returned+=v*(odds+1)}
  win(returned);state.roulette.last=result;state.roulette.lastNet=returned-total;state.roulette.history.unshift(result);state.roulette.bets={};rouletteLocked=false;save();render()
}

/* Blackjack */
const ranks=["A","2","3","4","5","6","7","8","9","10","J","Q","K"], suits=["♠","♥","♦","♣"];
function card(){return{rank:ranks[randomInt(ranks.length)],suit:suits[randomInt(suits.length)]}}
function handValue(hand){let total=0,aces=0;for(const c of hand){if(c.rank==="A"){aces++;total+=11}else if(["J","Q","K"].includes(c.rank))total+=10;else total+=Number(c.rank)}while(total>21&&aces){total-=10;aces--}return total}
function cardHtml(c,back=false){if(back)return`<div class="card back">?</div>`;return`<div class="card ${["♥","♦"].includes(c.suit)?"red-suit":""}"><span>${c.rank}${c.suit}</span><span>${c.suit}</span></div>`}
function renderBlackjack(){
  const b=state.blackjack;$("dealerCards").innerHTML=b.dealer.map((c,i)=>cardHtml(c,b.hidden&&i===1)).join("");$("playerCards").innerHTML=b.player.map(c=>cardHtml(c)).join("");
  $("dealerScore").textContent=b.dealer.length?`(${b.hidden?handValue([b.dealer[0]]):handValue(b.dealer)})`:"";$("playerScore").textContent=b.player.length?`(${handValue(b.player)})`:"";$("blackjackMessage").textContent=b.message;
  $("dealBtn").disabled=b.inRound;$("hitBtn").disabled=!b.inRound;$("standBtn").disabled=!b.inRound;$("doubleBtn").disabled=!b.inRound||b.player.length!==2||b.bet>state.wallet
}
function settleBlackjack(mult,message){const b=state.blackjack;if(mult>0)win(Math.round(b.bet*mult));b.hidden=false;b.inRound=false;b.message=message;save();render()}
function dealBlackjack(){
  safe(()=>{const bet=Number($("blackjackBet").value);spend(bet);const b=state.blackjack;b.inRound=true;b.bet=bet;b.player=[card(),card()];b.dealer=[card(),card()];b.hidden=true;b.message="Your move.";b.stats.hands++;b.stats.wagered+=bet;
    const pv=handValue(b.player),dv=handValue(b.dealer);if(pv===21&&dv===21)settleBlackjack(1,"Push. Both have blackjack.");else if(pv===21)settleBlackjack(2.5,"Blackjack! Paid 3:2.");else save();render()
  })
}
function hitBlackjack(){const b=state.blackjack;b.player.push(card());const v=handValue(b.player);if(v>21)settleBlackjack(0,"Bust. Dealer wins.");else if(v===21)standBlackjack();else{b.message="Hit or stand?";save();render()}}
function standBlackjack(){const b=state.blackjack;b.hidden=false;while(handValue(b.dealer)<17)b.dealer.push(card());const p=handValue(b.player),d=handValue(b.dealer);if(d>21)settleBlackjack(2,"Dealer busts. You win.");else if(p>d)settleBlackjack(2,"You win.");else if(p<d)settleBlackjack(0,"Dealer wins.");else settleBlackjack(1,"Push. Bet returned.")}
function doubleBlackjack(){safe(()=>{const b=state.blackjack;spend(b.bet);b.bet*=2;b.player.push(card());if(handValue(b.player)>21)settleBlackjack(0,"Double-down bust.");else standBlackjack()})}


/* Beard Bank v0.5 fixed virtual reel math */
const BEARD_BANK_REELS = [
  [...Array(8).fill("BLANK"),...Array(14).fill("OIL"),...Array(12).fill("COMB"),...Array(10).fill("KEY"),...Array(8).fill("BAG"),...Array(3).fill("COIN"),...Array(3).fill("WILD"),...Array(2).fill("VAULT")],
  [...Array(10).fill("BLANK"),...Array(14).fill("OIL"),...Array(12).fill("COMB"),...Array(10).fill("KEY"),...Array(8).fill("BAG"),...Array(3).fill("COIN"),...Array(3).fill("WILD"),...Array(2).fill("VAULT")],
  [...Array(11).fill("BLANK"),...Array(14).fill("OIL"),...Array(12).fill("COMB"),...Array(10).fill("KEY"),...Array(8).fill("BAG"),...Array(3).fill("COIN"),...Array(3).fill("WILD"),...Array(2).fill("VAULT")],
  [...Array(10).fill("BLANK"),...Array(14).fill("OIL"),...Array(12).fill("COMB"),...Array(10).fill("KEY"),...Array(8).fill("BAG"),...Array(3).fill("COIN"),...Array(3).fill("WILD"),...Array(2).fill("VAULT")],
  [...Array(8).fill("BLANK"),...Array(14).fill("OIL"),...Array(12).fill("COMB"),...Array(10).fill("KEY"),...Array(8).fill("BAG"),...Array(3).fill("COIN"),...Array(3).fill("WILD"),...Array(2).fill("VAULT")]
];
const BEARD_BANK_LINES=[[0,0,0,0,0],[1,1,1,1,1],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0]];
const BEARD_BANK_PAY={
 OIL:{2:.6,3:4.8,4:14.4,5:48},
 COMB:{2:.72,3:6,4:18,5:60},
 KEY:{2:.96,3:8.4,4:24,5:84},
 BAG:{2:1.2,3:12,4:36,5:120},
 VAULT:{2:2.4,3:24,4:96,5:480}
};
const BEARD_BANK_ICONS={BLANK:"",OIL:"🧴",COMB:"🪮",KEY:"🗝️",BAG:"💰",COIN:"🪙",WILD:"🧔",VAULT:"🏦"};
let beardBankLocked=false;

/* Slots */
const bankSymbols=["🪙","🪙","🧔","🔑","💰","🧴","✂️","🪙","🧔","💰"];
const lumberSymbols=["🪓","🌲","🧔","🦌","🐻","🪵","🌲","🪓","🧔"];
function createGrid(symbols,reels){return Array.from({length:reels},()=>Array.from({length:3},()=>symbols[randomInt(symbols.length)]))}
function gridHtml(grid){return grid.map(col=>`<div class="reel">${col.map(s=>`<div class="symbol ${s==="🪙"?"coin":s==="🧔"?"wild":""}">${s}</div>`).join("")}</div>`).join("")}
function count(grid,s){return grid.flat().filter(x=>x===s).length}
function beardBankGrid(){
 return BEARD_BANK_REELS.map(strip=>{
   const stop=randomInt(strip.length);
   return [strip[(stop-1+strip.length)%strip.length],strip[stop],strip[(stop+1)%strip.length]];
 });
}
function beardBankLinePay(symbols){
 let base=null,count=0;
 for(const symbol of symbols){
   if(count===0){
     if(symbol==="BLANK"||symbol==="COIN")return 0;
     base=symbol==="WILD"?null:symbol;count=1;
   }else if(symbol==="WILD")count++;
   else if(base===null&&BEARD_BANK_PAY[symbol]){base=symbol;count++}
   else if(symbol===base)count++;
   else break;
 }
 return base&&BEARD_BANK_PAY[base]&&BEARD_BANK_PAY[base][count]||0;
}
function evaluateBeardBank(grid,bet){
 let returned=0;
 for(const line of BEARD_BANK_LINES){
   const symbols=line.map((row,col)=>grid[col][row]);
   returned+=beardBankLinePay(symbols)*bet/BEARD_BANK_LINES.length;
 }
 const coins=grid.flat().filter(x=>x==="COIN").length;
 let bonus=0;
 if(coins>=6){
   const awards=[1,1,1,2,2,3,3,4,5,7,10,15,25];
   for(let i=0;i<coins;i++)bonus+=awards[randomInt(awards.length)]*bet;
   returned+=bonus;
 }
 return {returned:Math.round(returned),coins,bonus:Math.round(bonus)};
}
function beardBankGridHtml(grid){
 return grid.map(col=>`<div class="reel">${col.map(s=>`<div class="symbol ${s==="COIN"?"coin":s==="WILD"?"wild":s==="BLANK"?"blank":""}">${BEARD_BANK_ICONS[s]}</div>`).join("")}</div>`).join("");
}
function renderBeardBank(){
 const b=state.beardBank;
 const display=b.lastGrid.length?b.lastGrid:beardBankGrid();
 $("beardBankReels").innerHTML=beardBankGridHtml(display);
 const chase=Math.min(100,(b.chase||0)/30*100);
 $("vaultProgress").textContent=`${b.chase||0} / 30 vault sparks`;
 $("vaultMeter").style.width=`${chase}%`;
}
async function spinBeardBank(){
 if(beardBankLocked)return;
 safe(async()=>{
   const bet=Number($("beardBankBet").value);
   spend(bet);
   beardBankLocked=true;
   $("beardBankSpin").disabled=true;
   const b=state.beardBank;b.spins++;b.wagered+=bet;
   const finalGrid=beardBankGrid();

   // Visual-only cycling. Outcome was selected before animation.
   for(let frame=0;frame<12;frame++){
     $("beardBankReels").innerHTML=beardBankGridHtml(beardBankGrid());
     await new Promise(r=>setTimeout(r,55+frame*7));
   }

   b.lastGrid=finalGrid;
   const result=evaluateBeardBank(finalGrid,bet);
   b.chase=(b.chase||0)+result.coins;
   let returned=result.returned;
   let message="No win.";

   if(result.coins>=6){
     message=`BEARD VAULT HOLD FEATURE! ${result.coins} coins returned ${money(result.bonus)}.`;
     b.chase=0;
   }else if(returned>bet){
     message=`Winner. Returned ${money(returned)} on a ${money(bet)} bet.`;
   }else if(returned===bet){
     message=`Bet returned.`;
   }else if(returned>0){
     message=`Small return ${money(returned)}. Net loss ${money(bet-returned)}.`;
   }

   // The chase meter is a transparent secondary feature with a fixed threshold.
   if(b.chase>=30){
     const chaseBonus=bet*(5+randomInt(11));
     returned+=chaseBonus;
     message+=` VAULT SPARKS BONUS returned ${money(chaseBonus)}.`;
     b.chase=0;
   }

   if(returned)win(returned);
   $("beardBankMessage").textContent=message;
   beardBankLocked=false;$("beardBankSpin").disabled=false;
   save();render();
 })
}
function renderLumber(){const l=state.lumber;$("lumberReels").innerHTML=gridHtml(l.lastGrid.length?l.lastGrid:createGrid(lumberSymbols,l.level));$("forestLevel").textContent=`${l.level} reels`;$("forestMeter").style.width=`${(l.level-3)/2*100}%`}
function spinLumber(){safe(()=>{const bet=Number($("lumberBet").value);spend(bet);const l=state.lumber;l.spins++;l.wagered+=bet;const grid=createGrid(lumberSymbols,l.level);l.lastGrid=grid;const axes=count(grid,"🪓"),wilds=count(grid,"🧔"),trees=count(grid,"🌲");let payout=0,msg=`${axes} axes landed.`;if(trees>=4)payout+=bet*(trees-2);if(wilds>=2)payout+=bet*4;if(axes>=2&&l.level<5){l.level++;msg=`The forest expanded to ${l.level} reels!`}else if(axes>=2&&l.level===5){const bonus=bet*(10+randomInt(16));payout+=bonus;l.level=3;msg=`TIMBER BEARD FEATURE! Paid ${money(bonus)} and the forest reset.`}if(payout)win(payout);$("lumberMessage").textContent=msg+(payout?` Total return ${money(payout)}.`:"");save();render()})}

/* Modal content */
function showATM(){const t=state.activeTrip;modal("Casino ATM",`<p class="muted">Each fictional withdrawal costs $7.99. Used ${t.atmCount} of 3 withdrawals.</p><div class="atm-grid">${[10000,20000,30000,50000].map(a=>`<button class="primary atm-choice" data-a="${a}">Withdraw ${money(a)}</button>`).join("")}</div>`);document.querySelectorAll(".atm-choice").forEach(b=>b.onclick=()=>safe(()=>{const a=Number(b.dataset.a);if(t.atmCount>=3)throw new Error("Maximum of three withdrawals.");if(state.bank<a+ATM_FEE)throw new Error("Not enough in the fictional bank.");state.bank-=a+ATM_FEE;state.wallet+=a;t.atmWithdrawals+=a;t.atmFees+=ATM_FEE;t.atmCount++;state.lifetime.atmFees+=ATM_FEE;save();closeModal();render()}))}
function showTrip(){const t=state.activeTrip;modal("Current Casino Visit",`<div class="stat-row"><span>Starting cash</span><strong>${money(t.startingCash)}</strong></div><div class="stat-row"><span>Current wallet</span><strong>${money(state.wallet)}</strong></div><div class="stat-row"><span>Trip result</span><strong class="${tripNet()>=0?"win":"loss"}">${money(tripNet())}</strong></div><div class="stat-row"><span>ATM fees</span><strong>${money(t.atmFees)}</strong></div><div class="stat-row"><span>Total wagered</span><strong>${money(t.wagered)}</strong></div>`) }
function showHistory(){modal("Trip History",state.trips.length?state.trips.map((t,i)=>`<div class="trip-card"><div class="stat-row"><strong>Visit #${state.trips.length-i}</strong><strong class="${t.net>=0?"win":"loss"}">${money(t.net)}</strong></div><small>${new Date(t.startedAt).toLocaleString()}</small><div class="stat-row"><span>Started</span><span>${money(t.startingCash)}</span></div><div class="stat-row"><span>Wagered</span><span>${money(t.wagered)}</span></div></div>`).join(""):`<p class="muted">No completed casino visits yet.</p>`)}
function showSettings(){modal("Settings",`<label><input id="quickToggle" type="checkbox" ${state.settings.quick?"checked":""}> Quick spin animations</label><div class="divider"></div><p class="muted">Reset deletes all fictional balances and history in this browser.</p><input id="resetText" placeholder="Type RESET"><button id="resetAll" class="secondary">Reset Everything</button>`);$("quickToggle").onchange=e=>{state.settings.quick=e.target.checked;save()};$("resetAll").onclick=()=>{if($("resetText").value!=="RESET")return alert("Type RESET exactly.");state=defaultState();save();closeModal();showWelcome();render()}}
function showBank(){modal("Beard Laws Bank",`<div class="stat-row"><span>Bank balance</span><strong>${money(state.bank)}</strong></div><div class="stat-row"><span>Casino wallet</span><strong>${money(state.wallet)}</strong></div><div class="stat-row"><span>Lifetime result</span><strong class="${state.lifetime.net>=0?"win":"loss"}">${money(state.lifetime.net)}</strong></div><div class="stat-row"><span>Total wagered</span><strong>${money(state.lifetime.wagered)}</strong></div>`)}

/* Events */
document.querySelectorAll(".trip-btn[data-amount]").forEach(b=>b.onclick=()=>{state.selectedTrip=Number(b.dataset.amount);save();render()});
$("customTripBtn").onclick=()=>{modal("Custom Casino Cash",`<input id="customAmount" placeholder="200.00"><button id="useCustom" class="primary">Use Amount</button>`);$("useCustom").onclick=()=>{const n=Math.round(Number($("customAmount").value)*100);if(!Number.isFinite(n)||n<2000||n>50000)return alert("Choose between $20 and $500.");state.selectedTrip=n;save();closeModal();render()}};
$("startTripBtn").onclick=()=>safe(()=>startTrip(state.selectedTrip));
document.querySelectorAll(".game-card").forEach(b=>b.onclick=()=>showScreen(b.dataset.game));document.querySelectorAll(".back-lobby").forEach(b=>b.onclick=()=>showScreen("lobby"));
$("lobbyBtn").onclick=()=>showScreen("lobby");$("atmBtn").onclick=showATM;$("currentTripBtn").onclick=showTrip;$("cashierBtn").onclick=()=>modal("Cashier",`<p>Return ${money(state.wallet)} to the fictional Beard Laws Bank and end this visit?</p><button id="confirmCash" class="primary">Cash Out and End Visit</button>`);$("modal").addEventListener("click",e=>{if(e.target.id==="confirmCash"){closeModal();cashOut()}});
$("welcomeHistoryBtn").onclick=showHistory;$("welcomeSettingsBtn").onclick=showSettings;$("bankCard").onclick=showBank;$("modalClose").onclick=closeModal;$("modalX").onclick=closeModal;
document.querySelectorAll(".chip").forEach(b=>b.onclick=()=>{state.selectedChip=Number(b.dataset.chip);document.querySelectorAll(".chip").forEach(x=>x.classList.toggle("selected",x===b));save()});
$("rouletteClear").onclick=()=>{state.roulette.bets={};save();renderRoulette()};$("rouletteRepeat").onclick=()=>safe(()=>{const total=Object.values(state.roulette.previous).reduce((a,b)=>a+b,0);if(total>state.wallet)throw new Error("Not enough in the wallet.");state.roulette.bets=clone(state.roulette.previous);save();renderRoulette()});$("rouletteSpin").onclick=spinRoulette;
$("dealBtn").onclick=dealBlackjack;$("hitBtn").onclick=hitBlackjack;$("standBtn").onclick=standBlackjack;$("doubleBtn").onclick=doubleBlackjack;
$("beardBankSpin").onclick=spinBeardBank;$("lumberSpin").onclick=spinLumber;

buildRoulette();if(state.activeTrip){showCasino();startClock()}else showWelcome();render();
