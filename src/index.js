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
 const shell=createAppShell();
 mount.replaceChildren(shell);

 const engine=new BeardEngine(beardBankConfig,new CryptoRandomSource());
 const store=new AppStore({
   engine:engine.snapshot,spinning:false,ledgerOpen:false,message:'ENGINE READY'
 });
 const renderer=new CabinetRenderer(shell);
 const audio=new AudioDirector();
 const reels=new ReelStripView();

 store.subscribe(state=>renderer.render(state));

 const reelHost=shell.querySelector('[data-reel-host]');
 await reels.mount(reelHost);
 reels.onReelStop=index=>audio.stop(index);

 const initial=engine.spin(1);
 reels.renderGrid(initial.grid);
 store.patch({engine:engine.snapshot,message:'THE LIVING VAULT AWAITS'});

 let soundEnabled=true;
 let reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 reels.setReducedMotion(reducedMotion);
 shell.classList.toggle('reduced-motion',reducedMotion);

 const soundButton=shell.querySelector('[data-sound]');
 soundButton.addEventListener('click',()=>{
   soundEnabled=!soundEnabled;
   audio.setEnabled(soundEnabled);
   soundButton.textContent=soundEnabled?'SOUND ON':'SOUND OFF';
   soundButton.setAttribute('aria-pressed',String(soundEnabled));
   if(soundEnabled)audio.ensure();
 });

 const motionButton=shell.querySelector('[data-motion]');
 const updateMotionButton=()=>{
   motionButton.textContent=reducedMotion?'REDUCED MOTION':'FULL MOTION';
   motionButton.setAttribute('aria-pressed',String(reducedMotion));
 };
 updateMotionButton();
 motionButton.addEventListener('click',()=>{
   reducedMotion=!reducedMotion;
   reels.setReducedMotion(reducedMotion);
   shell.classList.toggle('reduced-motion',reducedMotion);
   updateMotionButton();
 });

 shell.querySelector('[data-spin]').addEventListener('click',async()=>{
   if(store.state.spinning)return;
   try{
    audio.ensure();
    audio.spin();
    store.patch({spinning:true,message:'REELS IN MOTION'});
    const before=engine.snapshot.vaultCharges;
    const result=engine.spin(1);
    await reels.spinTo(result.grid);

    if(result.coinsLanded>0){
      audio.coin(result.coinsLanded);
      shell.querySelector('[data-cabinet]')?.classList.add('coin-impact');
      setTimeout(()=>shell.querySelector('[data-cabinet]')?.classList.remove('coin-impact'),650);
    }
    if(result.totalWin>0)audio.win(result.totalWin);

    const message=result.livingVaultTriggered
      ? 'THE LIVING VAULT HAS BURST OPEN'
      : result.totalWin>0
        ? `WIN ${currency(result.totalWin)}`
        : result.coinsLanded>0
          ? `${result.coinsLanded} VAULT LOCK${result.coinsLanded===1?'':'S'} CHARGED`
          : 'NO WIN — EVERY SPIN IS INDEPENDENT';

    store.patch({engine:engine.snapshot,message});
    updateJackpots(engine.snapshot.spins);
   }catch(error){
    console.error(error);
    window.alert(error instanceof Error?error.message:'Spin error');
   }finally{
    store.patch({spinning:false});
   }
 });

 shell.querySelectorAll('[data-ledger-toggle]').forEach(button=>{
  button.addEventListener('click',()=>store.patch({ledgerOpen:!store.state.ledgerOpen}));
 });

 updateJackpots(0);

 function updateJackpots(spins){
  const values={
   super:10000.02+spins*.01,
   grand:5000.02+spins*.007,
   major:500.03+spins*.003,
   minor:50,
   mini:10
  };
  for(const [key,value] of Object.entries(values)){
   const node=shell.querySelector(`[data-${key}]`);
   if(node)node.textContent=currency(value);
  }
 }
}catch(error){
 console.error(error);
 mount.innerHTML=`<div class="fatal-error"><h1>Engine initialization failed</h1>
 <p>${escapeHtml(error instanceof Error?error.message:String(error))}</p>
 <p>Confirm the full package, including the assets and src folders, was uploaded.</p></div>`;
}

function currency(value){
 return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
}
function escapeHtml(value){
 return value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
}
