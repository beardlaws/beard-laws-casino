
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);

const SYMBOLS = {
  oil:{name:'Beard Oil',asset:'assets/oil.svg'},
  comb:{name:'Golden Comb',asset:'assets/comb.svg'},
  razor:{name:'Straight Razor',asset:'assets/razor.svg'},
  balm:{name:'Beard Balm',asset:'assets/balm.svg'},
  key:{name:'Vault Key',asset:'assets/key.svg'},
  crown:{name:'Beard Crown',asset:'assets/crown.svg'},
  vernon:{name:'Vaultmaster Wild',asset:'assets/vernon.svg',wild:true},
  vault:{name:'Vault Scatter',asset:'assets/vault.svg',scatter:true},
  coin:{name:'Beard Coin',asset:'assets/coin.svg',coin:true}
};

// Fixed virtual reel strips. Outcomes are independent and selected with crypto RNG.
const REELS = [
 ['oil','comb','razor','balm','oil','key','comb','oil','razor','balm','crown','oil','coin','comb','razor','oil','vault','balm','key','oil','vernon','comb','razor','balm','oil','coin','key','comb','oil','crown','razor','balm','oil','comb','key','oil','coin','razor','balm','oil'],
 ['comb','oil','balm','razor','key','oil','comb','crown','balm','coin','razor','oil','key','comb','vault','balm','oil','razor','comb','vernon','oil','key','coin','balm','razor','comb','oil','crown','key','balm','oil','comb','razor','oil','coin','balm','key','oil','comb','razor'],
 ['razor','balm','oil','comb','key','crown','oil','coin','balm','razor','comb','oil','vault','key','balm','comb','vernon','oil','razor','key','coin','balm','comb','oil','crown','razor','balm','key','oil','comb','coin','razor','oil','balm','key','comb','oil','razor','balm','oil'],
 ['balm','razor','comb','oil','key','balm','coin','oil','crown','razor','comb','key','oil','vault','balm','razor','oil','comb','vernon','key','balm','coin','razor','oil','comb','key','crown','balm','oil','razor','coin','comb','oil','balm','key','razor','oil','comb','balm','oil'],
 ['oil','balm','comb','razor','key','oil','coin','balm','crown','comb','razor','oil','key','vault','balm','comb','razor','oil','vernon','key','coin','balm','comb','oil','razor','key','crown','oil','balm','comb','coin','razor','oil','key','balm','comb','oil','razor','balm','oil']
];

const PAY = {
 oil:{3:2,4:5,5:12}, comb:{3:2,4:6,5:15}, razor:{3:3,4:8,5:20}, balm:{3:3,4:10,5:25},
 key:{3:5,4:18,5:60}, crown:{3:8,4:30,5:120}, vernon:{3:10,4:50,5:250}
};

const LINES = [
 [1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],
 [0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0],
 [2,1,1,1,2],[0,1,0,1,0],[2,1,2,1,2],[1,0,1,0,1],[1,2,1,2,1],
 [0,2,0,2,0],[2,0,2,0,2],[0,2,2,2,0],[2,0,0,0,2],[1,1,0,1,1]
];


const PresentationAudio = {
 ctx:null,
 enabled:true,
 ensure(){
  if(!this.enabled)return null;
  if(!this.ctx){
   const AudioCtx=window.AudioContext||window.webkitAudioContext;
   if(!AudioCtx)return null;
   this.ctx=new AudioCtx();
  }
  if(this.ctx.state==='suspended')this.ctx.resume();
  return this.ctx;
 },
 tone(freq,duration=.12,type='sine',gain=.035,delay=0){
  const ctx=this.ensure();if(!ctx)return;
  const osc=ctx.createOscillator(),amp=ctx.createGain();
  osc.type=type;osc.frequency.value=freq;
  amp.gain.setValueAtTime(0,ctx.currentTime+delay);
  amp.gain.linearRampToValueAtTime(gain,ctx.currentTime+delay+.012);
  amp.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+delay+duration);
  osc.connect(amp).connect(ctx.destination);
  osc.start(ctx.currentTime+delay);osc.stop(ctx.currentTime+delay+duration+.03);
 },
 clang(count=1){
  const ctx=this.ensure();if(!ctx)return;
  for(let i=0;i<Math.min(count,6);i++){
   this.tone(170+i*19,.22,'square',.027,i*.055);
   this.tone(470+i*24,.17,'triangle',.018,i*.055+.015);
  }
 },
 anticipation(level=1){
  const base=300+level*65;
  this.tone(base,.34,'sine',.03);
  this.tone(base*1.5,.32,'triangle',.022,.08);
 },
 vernon(){
  [196,247,294,392].forEach((f,i)=>this.tone(f,.42,'triangle',.032,i*.075));
 }
};

function runScatterAnticipationHooks(grid){
 const firstThree=grid.slice(0,3);
 let running=0;
 firstThree.forEach((reel,index)=>{
  const hasPotential=reel.some(symbol=>symbol==='vault'||symbol==='coin');
  if(hasPotential){
   running++;
   setTimeout(()=>{
    $('#cabinet').classList.add('scatter-anticipation');
    PresentationAudio.anticipation(running);
    setTimeout(()=>$('#cabinet').classList.remove('scatter-anticipation'),620);
   },440+index*175);
  }
 });
}

function playCoinChargePresentation(count){
 if(!count)return;
 const header=$('.living-vault-header');
 header.classList.remove('coin-clang');
 void header.offsetWidth;
 header.classList.add('coin-clang');
 PresentationAudio.clang(count);
 setTimeout(()=>header.classList.remove('coin-clang'),650);
}

function playVernonPresentation(){
 $('#cabinet').classList.add('vernon-event');
 $('#reelWindow').classList.add('vernon-active');
 PresentationAudio.vernon();
 setTimeout(()=>{
  $('#cabinet').classList.remove('vernon-event');
  $('#reelWindow').classList.remove('vernon-active');
 },2200);
}

const state = {
 bank:2000,wallet:0,startWallet:0,bet:1,spins:0,wagered:0,returned:0,biggest:0,features:0,
 started:null,sound:true,speed:'normal',grid:[],bonus:null,vaultCharges:0,visitCoins:0,visitVaults:0,visitVernon:0,lifetime:{goldenKey:false,megaVault:false,vernonWild:false,fullCoinScreen:false},pendingBurstPrize:0
};

function rngInt(max){
 const arr = new Uint32Array(1); crypto.getRandomValues(arr); return arr[0] % max;
}
function rng(){ return rngInt(1000000)/1000000; }

function save(){
 localStorage.setItem('blcGoldBeard',JSON.stringify({
  bank:state.bank,wallet:state.wallet,startWallet:state.startWallet,bet:state.bet,spins:state.spins,
  wagered:state.wagered,returned:state.returned,biggest:state.biggest,features:state.features,
  started:state.started,vaultCharges:state.vaultCharges,visitCoins:state.visitCoins,
  visitVaults:state.visitVaults,visitVernon:state.visitVernon,lifetime:state.lifetime
 }));
}
function load(){
 try{
  const x=JSON.parse(localStorage.getItem('blcGoldBeard')||'null');
  if(x && typeof x.bank==='number') Object.assign(state,x);
 }catch{}
}
function resetSession(start){
 state.startWallet=start; state.wallet=start; state.bank=Math.max(0,state.bank-start); state.started=Date.now();
 state.spins=0;state.wagered=0;state.returned=0;state.biggest=0;state.features=0;state.grid=[];state.visitCoins=0;state.visitVaults=0;state.visitVernon=0;
 save(); updateUI();
}

async function buildGrid(grid){
 await window.BeardReels.init(grid);
 window.BeardReels.setGrid(grid);
}
function generateGrid(){
 return REELS.map(strip=>{
  const stop=rngInt(strip.length);
  return [strip[(stop-1+strip.length)%strip.length],strip[stop],strip[(stop+1)%strip.length]];
 });
}
function coinValue(){
 const roll=rng();
 if(roll<.48)return 1;if(roll<.72)return 2;if(roll<.86)return 3;if(roll<.94)return 5;if(roll<.98)return 10;if(roll<.995)return 25;return 50;
}
function createCoinValues(grid){
 const values={};
 for(let c=0;c<5;c++)for(let r=0;r<3;r++){
  if(grid[c][r]==='coin') values[`${c}-${r}`]=coinValue()*state.bet;
 }
 return values;
}

function evaluatePaylines(grid){
 let total=0,winners=[];
 LINES.forEach((line,li)=>{
  const seq=line.map((row,c)=>grid[c][row]);
  let base=seq[0]==='vernon'?seq.find(x=>x!=='vernon' && x!=='coin' && x!=='vault')||'vernon':seq[0];
  if(['coin','vault'].includes(base))return;
  let count=0;
  for(const s of seq){if(s===base||s==='vernon')count++;else break;}
  if(count>=3 && PAY[base]?.[count]){
    total+=PAY[base][count]*state.bet/20;
    winners.push({li,count,base,line});
  }
 });
 return {amount:+total.toFixed(2),winners};
}

function evaluateScatters(grid){
 const count=grid.flat().filter(x=>x==='vault').length;
 const amount=count>=3?(({3:2,4:10,5:50}[Math.min(5,count)]||0)*state.bet):0;
 return {amount:+amount.toFixed(2),count};
}

function evaluateVernonsFavor(grid,coinValues){
 const vernonOnReel3=grid[2].includes('vernon');
 const coinEntries=Object.entries(coinValues);
 if(!vernonOnReel3||!coinEntries.length)return {amount:0,triggered:false,coins:0};
 const amount=coinEntries.reduce((sum,[,value])=>sum+value,0);
 return {amount:+amount.toFixed(2),triggered:true,coins:coinEntries.length};
}

function applyLivingVaultCharges(grid){
 const coins=grid.flat().filter(x=>x==='coin').length;
 state.visitCoins+=coins;
 state.vaultCharges+=coins;
 const burst=state.vaultCharges>=30;
 if(burst){
  state.vaultCharges=0;
  state.visitVaults++;
  state.lifetime.megaVault=true;
 }
 return {coins,burst};
}

function updateMuseumBadges(grid,vernonResult){
 if(grid.flat().includes('key'))state.lifetime.goldenKey=true;
 if(vernonResult.triggered)state.lifetime.vernonWild=true;
 if(grid.flat().every(x=>x==='coin'))state.lifetime.fullCoinScreen=true;
}

function runFeaturePipeline(grid,coinValues){
 // Beard Engine 1.1 published queue:
 // 1. Paylines -> 2. Scatters -> 3. Vernon's Favor
 // 4. Living Vault Charges -> 5. Ledger/Save
 const paylines=evaluatePaylines(grid);
 const scatters=evaluateScatters(grid);
 const vernon=evaluateVernonsFavor(grid,coinValues);
 const livingVault=applyLivingVaultCharges(grid);
 updateMuseumBadges(grid,vernon);

 if(vernon.triggered)state.visitVernon++;

 const total=+(paylines.amount+scatters.amount+vernon.amount).toFixed(2);
 return {total,paylines,scatters,vernon,livingVault,coinValues};
}

async function spin(){
 if(state.wallet<state.bet||$('#spinBtn').disabled)return;
 $('#spinBtn').disabled=true; clearWinners();
 state.wallet-=state.bet;state.spins++;state.wagered+=state.bet;$('#messageBar').textContent='REELS IN MOTION';
 updateUI();

 const grid=generateGrid();
 const coinValues=createCoinValues(grid);
 runScatterAnticipationHooks(grid);
 await window.BeardReels.spinTo(grid,state.speed==='quick');

 state.grid=grid;
 const result=runFeaturePipeline(grid,coinValues);

 playCoinChargePresentation(result.livingVault.coins);
 if(result.vernon.triggered)playVernonPresentation();

 if(result.total>0){
  state.wallet+=result.total;state.returned+=result.total;state.biggest=Math.max(state.biggest,result.total);
  $('#lastWin').textContent=money(result.total);

  if(result.vernon.triggered){
    $('#messageBar').textContent=`VERNON'S FAVOR COLLECTED ${money(result.vernon.amount)}`;
    $('#messageBar').classList.add('vernon-message');
    setTimeout(()=>$('#messageBar').classList.remove('vernon-message'),1800);
  }else{
    $('#messageBar').textContent=result.total>=state.bet*20?'MASSIVE VAULT WIN':result.total>=state.bet*5?'BEAUTIFUL WIN':'WIN PAID';
  }

  $('#paylineFlash').classList.add('show');setTimeout(()=>$('#paylineFlash').classList.remove('show'),1000);
 }else{
  $('#lastWin').textContent=money(0);
  $('#messageBar').textContent=result.livingVault.coins?`${result.livingVault.coins} VAULT CHARGE${result.livingVault.coins===1?'':'S'} ADDED`:'NO WIN — NEXT SPIN IS INDEPENDENT';
 }

 updateUI();save();

 if(result.livingVault.burst){
  setTimeout(()=>openVaultBurst(),650);
  return;
 }

 if(result.livingVault.coins>=6){
  state.features++;updateUI();save();setTimeout(()=>startBonus(grid),700);return;
 }

 $('#spinBtn').disabled=false;
}
function clearWinners(){ $('#paylineFlash').classList.remove('show'); }

function startBonus(baseGrid){
 const locked=Array(15).fill(null);
 let idx=0;
 for(let c=0;c<5;c++)for(let r=0;r<3;r++)if(baseGrid[c][r]==='coin')locked[idx]={value:coinValue()*state.bet,new:false},idx++;else idx++;
 state.bonus={locked,respins:3,total:locked.filter(Boolean).reduce((a,x)=>a+x.value,0)};
 renderBonus();$('#bonusOverlay').classList.remove('hidden');
}
function renderBonus(){
 const g=$('#bonusGrid');g.innerHTML='';
 state.bonus.locked.forEach((x,i)=>{
  const el=document.createElement('div');el.className='bonus-cell'+(x?' locked':'')+(x?.new?' new':'');
  if(x)el.dataset.value=money(x.value);g.appendChild(el);
 });
 $('#respins').textContent=state.bonus.respins;$('#bonusTotal').textContent=money(state.bonus.total);
}
async function bonusSpin(){
 const btn=$('#bonusSpinBtn');if(btn.disabled)return;btn.disabled=true;
 state.bonus.locked.forEach(x=>{if(x)x.new=false});
 let added=0;
 state.bonus.locked.forEach((x,i)=>{
  if(!x && rng()<.16){const value=coinValue()*state.bet;state.bonus.locked[i]={value,new:true};state.bonus.total+=value;added++;}
 });
 state.bonus.respins=added?3:state.bonus.respins-1;renderBonus();
 if(state.bonus.locked.every(Boolean)) state.bonus.total+=250*state.bet;
 if(state.bonus.respins<=0||state.bonus.locked.every(Boolean)){
  await new Promise(r=>setTimeout(r,800));
  state.wallet+=state.bonus.total;state.returned+=state.bonus.total;state.biggest=Math.max(state.biggest,state.bonus.total);
  $('#lastWin').textContent=money(state.bonus.total);$('#messageBar').textContent='VAULT FEATURE PAID '+money(state.bonus.total);
  $('#bonusOverlay').classList.add('hidden');state.bonus=null;updateUI();save();$('#spinBtn').disabled=false;
 }else btn.disabled=false;
}
function updateUI(){
 $('#bank').textContent=money(state.bank);$('#wallet').textContent=money(state.wallet);$('#credit').textContent=money(state.wallet);
 $('#betDisplay').textContent=money(state.bet);$('#spinCost').textContent=money(state.bet);
 const net=state.wallet-state.startWallet;$('#visitNet').textContent=(net>=0?'+':'')+money(net);$('#visitNet').style.color=net>=0?'#7fe0b3':'#ff9eae';
 $('#spinsStat').textContent=state.spins;$('#wageredStat').textContent=money(state.wagered);$('#returnedStat').textContent=money(state.returned);
 $('#biggestStat').textContent=money(state.biggest);$('#featuresStat').textContent=state.features;
 $('#sessionLine').textContent='SESSION RTP '+(state.wagered?((state.returned/state.wagered)*100).toFixed(2):'0.00')+'%';
 const chargePct=(state.vaultCharges/30)*100;
 $('#vaultChargeText').textContent=`${state.vaultCharges} / 30 CHARGES`;
 $('#vaultChargeFill').style.width=chargePct+'%';
 $('#ledgerSpins').textContent=state.spins;
 $('#ledgerCoins').textContent=state.visitCoins;
 $('#ledgerVaults').textContent=state.visitVaults;
 $('#ledgerVernon').textContent=state.visitVernon;
 $('#ledgerBiggest').textContent=money(state.biggest);
 $('#ledgerSessionRtp').textContent=(state.wagered?((state.returned/state.wagered)*100).toFixed(2):'0.00')+'%';
 $('#ledgerCharges').textContent=`${state.vaultCharges} / 30`;
 Object.entries(state.lifetime).forEach(([key,unlocked])=>{
   document.querySelector(`[data-badge="${key}"]`)?.classList.toggle('unlocked',!!unlocked);
 });

 $('#spinBtn').disabled=state.wallet<state.bet||!!state.bonus;
}

function openVaultBurst(){
 $('#vaultBurstOverlay').classList.remove('hidden');
 $('#vaultBurstResult').textContent='SELECT A TREASURE';
 $('#vaultBurstCollectBtn').classList.add('hidden');
 $$('.vault-pick').forEach(btn=>{btn.disabled=false;btn.classList.remove('revealed')});
 state.pendingBurstPrize=0;
 updateUI();
}

function chooseVaultPrize(button){
 if(state.pendingBurstPrize>0)return;
 // Published weighted prize table in total-bet multipliers.
 const roll=rng();
 const multiplier=roll<.50?5:roll<.78?10:roll<.93?20:roll<.985?50:100;
 state.pendingBurstPrize=multiplier*state.bet;
 button.classList.add('revealed');
 $$('.vault-pick').forEach(btn=>btn.disabled=true);
 $('#vaultBurstResult').textContent=`${button.dataset.pick.toUpperCase()} REVEALS ${money(state.pendingBurstPrize)}`;
 $('#vaultBurstCollectBtn').classList.remove('hidden');
}

function collectVaultBurst(){
 const prize=state.pendingBurstPrize;
 if(!prize)return;
 state.wallet+=prize;state.returned+=prize;state.biggest=Math.max(state.biggest,prize);
 $('#lastWin').textContent=money(prize);
 $('#messageBar').textContent=`LIVING VAULT BURST PAID ${money(prize)}`;
 state.pendingBurstPrize=0;
 $('#vaultBurstOverlay').classList.add('hidden');
 updateUI();save();$('#spinBtn').disabled=false;
}

function toggleLedger(open){
 const drawer=$('#ledgerDrawer');
 const next=typeof open==='boolean'?open:!drawer.classList.contains('open');
 drawer.classList.toggle('open',next);
 drawer.setAttribute('aria-hidden',String(!next));
}

function showModal(type){
 let html='';
 if(type==='info')html=`<p class="eyebrow">GAME INFORMATION</p><h2>Beard Bank</h2><p><strong>Theoretical RTP:</strong> 94.20% target model<br><strong>Volatility:</strong> Medium-high<br><strong>Layout:</strong> 5 reels × 3 rows<br><strong>Paylines:</strong> 20 fixed lines<br><strong>Feature:</strong> Six or more Beard Coins trigger Vault Hold & Spin.</p><h3>Integrity</h3><p>Reel stops are selected independently with <code>crypto.getRandomValues()</code>. Results do not react to your wallet, streak, prior spins, or play time. This alpha model is for fictional entertainment and still requires large-scale simulation and tuning before certification as a final math model.</p>`;
 if(type==='stats')html=`<p class="eyebrow">CURRENT VISIT</p><h2>Session Statistics</h2><div class="paytable"><div class="pay-row"><span>Starting cash</span><strong>${money(state.startWallet)}</strong></div><div class="pay-row"><span>Current wallet</span><strong>${money(state.wallet)}</strong></div><div class="pay-row"><span>Spins</span><strong>${state.spins}</strong></div><div class="pay-row"><span>Total wagered</span><strong>${money(state.wagered)}</strong></div><div class="pay-row"><span>Total returned</span><strong>${money(state.returned)}</strong></div><div class="pay-row"><span>Session RTP</span><strong>${state.wagered?((state.returned/state.wagered)*100).toFixed(2):'0.00'}%</strong></div><div class="pay-row"><span>Biggest win</span><strong>${money(state.biggest)}</strong></div><div class="pay-row"><span>Features</span><strong>${state.features}</strong></div></div>`;
 if(type==='pay')html=`<p class="eyebrow">20-LINE PAYTABLE</p><h2>Symbol Pays</h2><p>Values below are total-bet multipliers before line normalization. Wins evaluate left to right. Vaultmaster Vernon substitutes for regular paying symbols.</p><div class="paytable">${Object.entries(PAY).map(([k,v])=>`<div class="pay-row"><span>${SYMBOLS[k].name}</span><strong>3: ${v[3]}× • 4: ${v[4]}× • 5: ${v[5]}×</strong></div>`).join('')}</div>`;
 $('#modalContent').innerHTML=html;$('#modal').showModal();
}
function cashout(){
 const returned=state.wallet;state.bank+=returned;state.wallet=0;state.startWallet=0;state.started=null;save();
 $('#casinoFloor').classList.add('hidden');$('#entrance').classList.remove('hidden');updateUI();
}

load();
let selectedStart=200;
$$('[data-start]').forEach(b=>b.onclick=()=>{$$('[data-start]').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');selectedStart=+b.dataset.start;$('#enterBtn').textContent='ENTER WITH '+money(selectedStart).replace('.00','')});
$('#enterBtn').onclick=()=>{
 if(state.wallet>0){$('#entrance').classList.add('hidden');$('#casinoFloor').classList.remove('hidden');buildGrid(state.grid.length?state.grid:generateGrid());return}
 if(state.bank<selectedStart){alert('Not enough fictional funds in Beard Laws Bank.');return}
 resetSession(selectedStart);$('#entrance').classList.add('hidden');$('#casinoFloor').classList.remove('hidden');buildGrid(generateGrid());
};
$('#spinBtn').onclick=spin;$('#bonusSpinBtn').onclick=bonusSpin;
$('#betUp').onclick=()=>{const bets=[.5,1,2,3,5,10];state.bet=bets[Math.min(bets.length-1,bets.indexOf(state.bet)+1)];updateUI();save()};
$('#betDown').onclick=()=>{const bets=[.5,1,2,3,5,10];state.bet=bets[Math.max(0,bets.indexOf(state.bet)-1)];updateUI();save()};
$('#infoBtn').onclick=()=>showModal('info');$('#statsBtn').onclick=()=>showModal('stats');$('#paytableBtn').onclick=()=>showModal('pay');
$('#modalClose').onclick=()=>$('#modal').close();$('#cashoutBtn').onclick=cashout;
$('#speedBtn').onclick=()=>{state.speed=state.speed==='normal'?'quick':'normal';$('#speedBtn').textContent=state.speed.toUpperCase()};
$('#soundBtn').onclick=()=>{state.sound=!state.sound;PresentationAudio.enabled=state.sound;$('#soundBtn').textContent='SOUND '+(state.sound?'ON':'OFF')};
$('#ledgerBookBtn').onclick=()=>toggleLedger(true);
$('#ledgerCloseBtn').onclick=()=>toggleLedger(false);
$$('.ledger-tab').forEach(tab=>tab.onclick=()=>{
 $$('.ledger-tab').forEach(x=>x.classList.remove('active'));tab.classList.add('active');
 $$('.ledger-page').forEach(x=>x.classList.remove('active'));
 const pageId={visit:'ledgerVisit',integrity:'ledgerIntegrity',museum:'ledgerMuseum'}[tab.dataset.ledgerTab];
 $('#'+pageId).classList.add('active');
});
$$('.vault-pick').forEach(btn=>btn.onclick=()=>chooseVaultPrize(btn));
$('#vaultBurstCollectBtn').onclick=collectVaultBurst;

setInterval(()=>{if(state.started){const s=Math.floor((Date.now()-state.started)/1000);$('#visitTime').textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}},1000);
setInterval(()=>{const g=12845.27+(Date.now()%100000)/100000;$('#grandMeter').textContent=money(g);$('#majorMeter').textContent=money(1284.50+(Date.now()%25000)/100000)},1200);
enforceGoldMasterElements();

function enforceGoldMasterElements(){
 const oldStatus=document.querySelector('.feature-meter');
 if(oldStatus && !document.querySelector('#vaultChargeText')){
  oldStatus.className='living-vault-header';
  oldStatus.innerHTML=`<div class="vault-door-mini"><div class="vault-wheel"></div></div>
  <div class="vault-meter-copy"><span>THE LIVING VAULT</span><strong id="vaultChargeText">0 / 30 CHARGES</strong>
  <div class="vault-charge-track"><div id="vaultChargeFill" class="vault-charge-fill"></div></div></div>`;
 }
 if(!document.querySelector('#ledgerBookBtn')){
  const cabinet=document.querySelector('#cabinet');
  const button=document.createElement('button');
  button.id='ledgerBookBtn';button.className='ledger-book-button';
  button.innerHTML='<span class="book-spine">BL</span><span class="book-title">VAULTMASTER\\'S LEDGER</span><span class="book-tab">OPEN</span>';
  cabinet?.appendChild(button);
  button.onclick=()=>toggleLedger(true);
 }
}

updateUI();
if(state.wallet>0){$('#enterBtn').textContent='RESUME CURRENT VISIT';}
