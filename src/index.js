import {BeardEngine} from './engine/BeardEngine.js';
import {CryptoRandomSource} from './engine/RNG.js';
import {beardBankConfig} from './games/BeardBank/BeardBankConfig.js';
import {AppStore} from './state/AppStore.js';
import {ReelStripView} from './graphics/ReelStripView.js';
import {CabinetRenderer} from './graphics/CabinetRenderer.js';
import {AudioDirector} from './graphics/AudioDirector.js';
import {createAppShell} from './ui/AppShell.js';
import {describeWaysWins} from './graphics/WaysPresentation.js';

const mount=document.querySelector('#app');
try{
 const shell=createAppShell();mount.replaceChildren(shell);
 const engine=new BeardEngine(beardBankConfig,new CryptoRandomSource());
 const store=new AppStore({engine:engine.snapshot,spinning:false,ledgerOpen:false,message:'THE LIVING VAULT AWAITS'});
 const renderer=new CabinetRenderer(shell),audio=new AudioDirector(),reels=new ReelStripView();
 store.subscribe(s=>renderer.render(s));

 await reels.mount(shell.querySelector('[data-reel-host]'));
 reels.onReelStop=i=>audio.stop(i);
 const initial=engine.spin(1);reels.renderGrid(initial.grid);store.patch({engine:engine.snapshot});

 let soundEnabled=true,reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
 reels.setReducedMotion(reducedMotion);shell.classList.toggle('reduced-motion',reducedMotion);

 const showView=name=>{
  shell.querySelectorAll('[data-view]').forEach(v=>v.classList.toggle('active',v.dataset.view===name));
  if(name==='machine')requestAnimationFrame(fitMachine);
 };
 const openPreview=id=>{
  const data={
   'lumber-beard':['LUMBER BEARD','A deep-forest expanding-reel machine built around axes, timber frames, and growing 5×5 grids.','forest'],
   'beard-drop':['BEARD DROP','A free-fall fortune game with original Beard Laws physics and cascading prize zones.','drop'],
   'roulette':['AMERICAN ROULETTE','A polished double-zero roulette table with the shared casino wallet.','roulette'],
   'blackjack':['BLACKJACK','The Barber Table: classic blackjack inside the Beard Laws casino floor.','cards']
  }[id];
  shell.querySelector('[data-preview-title]').textContent=data[0];
  shell.querySelector('[data-preview-copy]').textContent=data[1];
  shell.querySelector('[data-preview-art]').className=`preview-art ${data[2]}`;
  showView('preview');
 };

 shell.querySelectorAll('[data-lobby]').forEach(b=>b.addEventListener('click',()=>showView('lobby')));
 shell.querySelector('[data-play-beard-bank]').addEventListener('click',()=>showView('machine'));
 shell.querySelectorAll('[data-game]').forEach(card=>card.addEventListener('click',()=>{
  card.dataset.game==='beard-bank'?showView('machine'):openPreview(card.dataset.game);
 }));

 shell.querySelector('[data-sound]').addEventListener('click',e=>{
  soundEnabled=!soundEnabled;audio.setEnabled(soundEnabled);e.currentTarget.textContent=soundEnabled?'SOUND ON':'SOUND OFF';e.currentTarget.setAttribute('aria-pressed',String(soundEnabled));if(soundEnabled)audio.ensure()
 });
 const motionButton=shell.querySelector('[data-motion]');
 const syncMotion=()=>{motionButton.textContent=reducedMotion?'REDUCED MOTION':'FULL MOTION';motionButton.setAttribute('aria-pressed',String(reducedMotion))};
 syncMotion();
 motionButton.addEventListener('click',()=>{reducedMotion=!reducedMotion;reels.setReducedMotion(reducedMotion);shell.classList.toggle('reduced-motion',reducedMotion);syncMotion()});
 shell.querySelectorAll('[data-ledger-toggle]').forEach(b=>b.addEventListener('click',()=>store.patch({ledgerOpen:!store.state.ledgerOpen})));


 async function presentWaysWin(result){
  const overlay=shell.querySelector('[data-win-presentation]');
  const kind=shell.querySelector('[data-win-kind]');
  const symbol=shell.querySelector('[data-win-symbol]');
  const step=shell.querySelector('[data-win-step]');
  const groups=describeWaysWins(result.grid,result.wager);

  renderer.setPresentedWin(0);
  reels.clearWinPresentation();

  if(groups.length===0){
   renderer.setPresentedWin(result.totalWin);
   return;
  }

  let tally=0;
  overlay.classList.add('active');

  for(const group of groups){
   reels.showWinningPositions(group.positions);
   kind.textContent=`${group.length} OF A KIND`;
   symbol.textContent=`${group.label} • ${group.ways} WAY${group.ways===1?'':'S'}`;
   step.textContent=`+${currency(group.payout)}`;
   tally=roundMoney(tally+group.payout);
   renderer.setPresentedWin(tally);
   await wait(reducedMotion?260:950);
  }

  reels.clearWinPresentation();
  kind.textContent='TOTAL WIN';
  symbol.textContent='243 WAYS PAY';
  step.textContent=currency(result.totalWin);
  renderer.setPresentedWin(result.totalWin);
  await wait(reducedMotion?300:1200);
  overlay.classList.remove('active');
 }

 shell.querySelector('[data-spin]').addEventListener('click',async()=>{
  if(store.state.spinning)return;
  try{
   audio.ensure();audio.spin();store.patch({spinning:true,message:'REELS IN MOTION'});
   const result=engine.spin(1);await reels.spinTo(result.grid);
   if(result.baseWin>0)await presentWaysWin(result);
   else renderer.setPresentedWin(result.totalWin);
   if(result.coinsLanded){audio.coin(result.coinsLanded);pulse('coin-impact')}
   if(result.totalWin>0)audio.win(result.totalWin);
   const message=result.livingVaultTriggered?'THE LIVING VAULT IS READY TO BURST':
    result.totalWin>0?`WIN ${currency(result.totalWin)}`:
    result.coinsLanded?`${result.coinsLanded} VAULT LOCK${result.coinsLanded===1?'':'S'} CHARGED`:
    'NO WIN — EVERY SPIN IS INDEPENDENT';
   store.patch({engine:engine.snapshot,message});updateJackpots();
  }catch(error){console.error(error);alert(error instanceof Error?error.message:'Spin error')}
  finally{store.patch({spinning:false})}
 });

 function pulse(cls){const c=shell.querySelector('[data-cabinet]');c.classList.remove(cls);void c.offsetWidth;c.classList.add(cls);setTimeout(()=>c.classList.remove(cls),700)}
 const jackpotValues={super:10000.02,grand:5000.02,major:500.03,minor:50,mini:10};
 function updateJackpots(){
  Object.entries(jackpotValues).forEach(([key,value])=>{
   const node=shell.querySelector(`[data-${key}]`);
   if(node)node.textContent=currency(value);
  });
 }
 setInterval(()=>{
  jackpotValues.super=roundMoney(jackpotValues.super+.01);
  jackpotValues.grand=roundMoney(jackpotValues.grand+.01);
  jackpotValues.major=roundMoney(jackpotValues.major+.01);
  updateJackpots();
 },800);
 function fitMachine(){
  const stage=shell.querySelector('[data-fit-stage]'),inner=shell.querySelector('[data-fit-inner]');
  if(!stage||!inner)return;
  inner.style.transform='scale(1)';
  const naturalW=inner.offsetWidth,naturalH=inner.offsetHeight;
  const availableW=Math.max(320,window.innerWidth-24),availableH=Math.max(480,window.innerHeight-86);
  const scale=Math.min(1,availableW/naturalW,availableH/naturalH);
  inner.style.transform=`scale(${scale})`;
  stage.style.height=`${Math.ceil(naturalH*scale)}px`;
  stage.style.width=`${Math.ceil(naturalW*scale)}px`;
 }
 addEventListener('resize',()=>requestAnimationFrame(fitMachine));
 updateJackpots();showView('lobby');
}catch(error){
 console.error(error);mount.innerHTML=`<div class="fatal-error"><h1>Engine initialization failed</h1><p>${escapeHtml(error instanceof Error?error.message:String(error))}</p><p>Confirm the complete assets and src folders were uploaded.</p></div>`;
}
function currency(v){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v)}
function roundMoney(v){return Math.round(v*100)/100}
function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
function escapeHtml(v){return v.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;")}
