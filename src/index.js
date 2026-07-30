import {BeardEngine} from './engine/BeardEngine.js';
import {CryptoRandomSource} from './engine/RNG.js';
import {beardBankConfig} from './games/BeardBank/BeardBankConfig.js';
import {AppStore} from './state/AppStore.js';
import {ReelStripView} from './graphics/ReelStripView.js';
import {CabinetRenderer} from './graphics/CabinetRenderer.js';
import {createAppShell} from './ui/AppShell.js';

const mount=document.querySelector('#app');
try{
 const shell=createAppShell();mount.replaceChildren(shell);
 const engine=new BeardEngine(beardBankConfig,new CryptoRandomSource());
 const store=new AppStore({engine:engine.snapshot,spinning:false,ledgerOpen:false,message:'ENGINE READY'});
 const renderer=new CabinetRenderer(shell);store.subscribe(s=>renderer.render(s));
 const reelHost=shell.querySelector('[data-reel-host]');
 const reels=new ReelStripView();await reels.mount(reelHost);
 const initial=engine.spin(1);reels.renderGrid(initial.grid);store.patch({engine:engine.snapshot,message:'ENGINE READY'});
 shell.querySelector('[data-spin]').addEventListener('click',async()=>{
  if(store.state.spinning)return;
  try{
   store.patch({spinning:true,message:'REELS IN MOTION'});
   const result=engine.spin(1);await reels.spinTo(result.grid);
   const message=result.totalWin>0?`WIN ${new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(result.totalWin)}`:result.coinsLanded?`${result.coinsLanded} VAULT CHARGE${result.coinsLanded===1?'':'S'}`:'NO WIN — EVERY SPIN IS INDEPENDENT';
   store.patch({engine:engine.snapshot,message});
  }catch(error){console.error(error);alert(error.message||'Spin error');}
  finally{store.patch({spinning:false});}
 });
 shell.querySelectorAll('[data-ledger-toggle]').forEach(b=>b.addEventListener('click',()=>store.patch({ledgerOpen:!store.state.ledgerOpen})));
}catch(error){
 console.error(error);
 mount.innerHTML=`<div class="fatal-error"><h1>Engine initialization failed</h1><p>${String(error.message||error)}</p><p>Check that the browser has internet access to load PixiJS.</p></div>`;
}