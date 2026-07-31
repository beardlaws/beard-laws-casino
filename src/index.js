import {BeardEngine} from './engine/BeardEngine.js';
import {CryptoRandomSource} from './engine/RNG.js';
import {beardBankConfig} from './games/BeardBank/BeardBankConfig.js';
import {AppStore} from './state/AppStore.js';
import {ReelStripView} from './graphics/ReelStripView.js';
import {CabinetRenderer} from './graphics/CabinetRenderer.js';
import {AudioDirector} from './graphics/AudioDirector.js';
import {createAppShell} from './ui/AppShell.js';

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

 shell.querySelector('[data-spin]').addEventListener('click',async()=>{
  if(store.state.spinning)return;
  try{
   audio.ensure();audio.spin();store.patch({spinning:true,message:'REELS IN MOTION'});
   const result=engine.spin(1);await reels.spinTo(result.grid);
   if(result.coinsLanded){audio.coin(result.coinsLanded);pulse('coin-impact')}
   if(result.totalWin>0)audio.win(result.totalWin);
   const message=result.livingVaultTriggered?'THE LIVING VAULT IS READY TO BURST':
    result.totalWin>0?`WIN ${currency(result.totalWin)}`:
    result.coinsLanded?`${result.coinsLanded} VAULT LOCK${result.coinsLanded===1?'':'S'} CHARGED`:
    'NO WIN — EVERY SPIN IS INDEPENDENT';
   store.patch({engine:engine.snapshot,message});updateJackpots(engine.snapshot.spins);
  }catch(error){console.error(error);alert(error instanceof Error?error.message:'Spin error')}
  finally{store.patch({spinning:false})}
 });

 function pulse(cls){const c=shell.querySelector('[data-cabinet]');c.classList.remove(cls);void c.offsetWidth;c.classList.add(cls);setTimeout(()=>c.classList.remove(cls),700)}
 function updateJackpots(spins){
  const vals={super:10000.02+spins*.01,grand:5000.02+spins*.007,major:500.03+spins*.003,minor:50,mini:10};
  Object.entries(vals).forEach(([k,v])=>{const n=shell.querySelector(`[data-${k}]`);if(n)n.textContent=currency(v)})
 }
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
 updateJackpots(0);showView('lobby');
}catch(error){
 console.error(error);mount.innerHTML=`<div class="fatal-error"><h1>Engine initialization failed</h1><p>${escapeHtml(error instanceof Error?error.message:String(error))}</p><p>Confirm the complete assets and src folders were uploaded.</p></div>`;
}
function currency(v){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v)}
function escapeHtml(v){return v.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;")}
