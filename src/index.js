import {BeardEngine} from './engine/BeardEngine.js';
import {CryptoRandomSource} from './engine/RNG.js';
import {beardBankConfig} from './games/BeardBank/BeardBankConfig.js';
import {AppStore} from './state/AppStore.js';
import {ReelStripView} from './graphics/ReelStripView.js';
import {CabinetRenderer} from './graphics/CabinetRenderer.js';
import {AudioDirector} from './graphics/AudioDirector.js';
import {describeWaysWins,markerForGroup} from './graphics/WaysPresentation.js';
import {createAppShell} from './ui/AppShell.js';

const mount=document.querySelector('#app');

try{
 const shell=createAppShell();
 mount.replaceChildren(shell);

 const engine=new BeardEngine(beardBankConfig,new CryptoRandomSource());
 const store=new AppStore({
  engine:engine.snapshot,
  spinning:false,
  ledgerOpen:false,
  message:'THE LIVING VAULT AWAITS',
 });

 const renderer=new CabinetRenderer(shell);
 const audio=new AudioDirector();
 const reels=new ReelStripView();

 store.subscribe(state=>renderer.render(state));

 await reels.mount(shell.querySelector('[data-reel-host]'));
 reels.onReelStop=index=>audio.stop(index);

 const initial=engine.spin(1);
 reels.renderGrid(initial.grid);
 store.patch({engine:engine.snapshot});

 let soundEnabled=true;
 let reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
 reels.setReducedMotion(reducedMotion);
 shell.classList.toggle('reduced-motion',reducedMotion);

 const showView=name=>{
  shell.querySelectorAll('[data-view]').forEach(view=>{
   view.classList.toggle('active',view.dataset.view===name);
  });
  if(name==='machine')requestAnimationFrame(fitMachine);
 };

 const openPreview=id=>{
  const previewData={
   'lumber-beard':[
    'LUMBER BEARD',
    'A deep-forest expanding-reel machine built around axes, timber frames, and growing 5×5 grids.',
    'forest',
   ],
   'beard-drop':[
    'BEARD DROP',
    'A free-fall fortune game with original Beard Laws physics and cascading prize zones.',
    'drop',
   ],
   roulette:[
    'AMERICAN ROULETTE',
    'A polished double-zero roulette table with the shared casino wallet.',
    'roulette',
   ],
   blackjack:[
    'BLACKJACK',
    'The Barber Table: classic blackjack inside the Beard Laws casino floor.',
    'cards',
   ],
  }[id];

  shell.querySelector('[data-preview-title]').textContent=previewData[0];
  shell.querySelector('[data-preview-copy]').textContent=previewData[1];
  shell.querySelector('[data-preview-art]').className=
   `preview-art ${previewData[2]}`;
  showView('preview');
 };

 shell.querySelectorAll('[data-lobby]').forEach(button=>{
  button.addEventListener('click',()=>showView('lobby'));
 });

 shell.querySelector('[data-play-beard-bank]')
  .addEventListener('click',()=>showView('machine'));

 shell.querySelectorAll('[data-game]').forEach(card=>{
  card.addEventListener('click',()=>{
   card.dataset.game==='beard-bank'
    ? showView('machine')
    : openPreview(card.dataset.game);
  });
 });

 shell.querySelector('[data-sound]').addEventListener('click',event=>{
  soundEnabled=!soundEnabled;
  audio.setEnabled(soundEnabled);
  event.currentTarget.textContent=soundEnabled?'SOUND ON':'SOUND OFF';
  event.currentTarget.setAttribute('aria-pressed',String(soundEnabled));
  if(soundEnabled)audio.ensure();
 });

 const motionButton=shell.querySelector('[data-motion]');
 const syncMotion=()=>{
  motionButton.textContent=reducedMotion?'REDUCED MOTION':'FULL MOTION';
  motionButton.setAttribute('aria-pressed',String(reducedMotion));
 };

 syncMotion();

 motionButton.addEventListener('click',()=>{
  reducedMotion=!reducedMotion;
  reels.setReducedMotion(reducedMotion);
  shell.classList.toggle('reduced-motion',reducedMotion);
  syncMotion();
 });

 shell.querySelectorAll('[data-ledger-toggle]').forEach(button=>{
  button.addEventListener('click',()=>{
   store.patch({ledgerOpen:!store.state.ledgerOpen});
  });
 });

 async function presentWaysWin(result){
  const groups=describeWaysWins(result.grid,result.wager);
  const cardStack=shell.querySelector('[data-win-cards]');
  const totalNode=shell.querySelector('[data-drawer-total]');
  const countNode=shell.querySelector('[data-win-count]');
  const sequenceNode=shell.querySelector('[data-sequence-label]');

  clearWinLines();
  clearMarkers();
  reels.clearWinPresentation();
  renderer.setPresentedWin(0);

  if(groups.length===0){
   cardStack.innerHTML=`
    <div class="drawer-empty">
     <span>No 243-Ways groups on this spin.</span>
    </div>`;
   countNode.textContent='NO 243-WAYS WIN';
   totalNode.textContent=currency(result.totalWin);
   renderer.setPresentedWin(result.totalWin);
   return;
  }

  cardStack.replaceChildren();
  countNode.textContent=`WINNING 1 OF ${groups.length}`;
  let tally=0;

  for(let index=0;index<groups.length;index++){
   const group=groups[index];
   const marker=markerForGroup(group,index);

   countNode.textContent=`WINNING ${index+1} OF ${groups.length}`;
   sequenceNode.textContent=
    `${group.length} OF A KIND • ${group.ways} WAY${group.ways===1?'':'S'}`;

   reels.showWinningPositions(group.positions);
   drawWinPath(group.path,index);
   activateMarker(marker);

   const card=createWinCard(group,index);
   cardStack.appendChild(card);
   requestAnimationFrame(()=>card.classList.add('visible'));

   tally=roundMoney(tally+group.payout);
   totalNode.textContent=currency(tally);
   renderer.setPresentedWin(tally);

   await wait(reducedMotion?260:1100);
  }

  reels.clearWinPresentation();
  clearWinLines();
  clearMarkers();
  countNode.textContent='TOTAL WIN';
  sequenceNode.textContent='243 WAYS TOTAL';
  totalNode.textContent=currency(result.totalWin);
  renderer.setPresentedWin(result.totalWin);

  await wait(reducedMotion?300:900);
 }

 function createWinCard(group,index){
  const card=document.createElement('article');
  card.className='win-card';

  const thumbnails=group.path.map(position=>{
   const source=reels.getAssetPath(group.symbol);
   return `<img src="${source}" alt="">`;
  }).join('');

  card.innerHTML=`
   <div class="card-number">${index+1}</div>
   <div class="card-copy">
    <strong>${group.length} OF A KIND</strong>
    <span>${group.label} • ${group.ways} WAY${group.ways===1?'':'S'}</span>
    <div class="mini-reels">${thumbnails}</div>
   </div>
   <b>+${currency(group.payout)}</b>`;

  return card;
 }

 function drawWinPath(path,index){
  const svg=shell.querySelector('[data-win-lines]');
  svg.replaceChildren();

  const points=path.map(({reel,row})=>{
   const x=(reel+.5)*200;
   const y=(row+.5)*200;
   return `${x},${y}`;
  }).join(' ');

  const glow=document.createElementNS('http://www.w3.org/2000/svg','polyline');
  glow.setAttribute('points',points);
  glow.setAttribute('class','win-path glow');

  const line=document.createElementNS('http://www.w3.org/2000/svg','polyline');
  line.setAttribute('points',points);
  line.setAttribute('class','win-path core');

  svg.append(glow,line);
 }

 function clearWinLines(){
  shell.querySelector('[data-win-lines]').replaceChildren();
 }

 function activateMarker(number){
  clearMarkers();
  shell.querySelectorAll(`[data-marker="${number}"]`)
   .forEach(marker=>marker.classList.add('active'));
 }

 function clearMarkers(){
  shell.querySelectorAll('[data-marker]')
   .forEach(marker=>marker.classList.remove('active'));
 }

 shell.querySelector('[data-spin]').addEventListener('click',async()=>{
  if(store.state.spinning)return;

  try{
   audio.ensure();
   audio.spin();
   clearWinLines();
   clearMarkers();
   reels.clearWinPresentation();
   renderer.setPresentedWin(0);

   store.patch({
    spinning:true,
    message:'REELS IN MOTION',
   });

   const result=engine.spin(1);
   await reels.spinTo(result.grid);

   if(result.baseWin>0){
    await presentWaysWin(result);
   }else{
    renderer.setPresentedWin(result.totalWin);
    shell.querySelector('[data-drawer-total]').textContent=
     currency(result.totalWin);
   }

   if(result.coinsLanded){
    audio.coin(result.coinsLanded);
    pulse('coin-impact');
   }

   if(result.totalWin>0)audio.win(result.totalWin);

   const message=result.livingVaultTriggered
    ? 'THE LIVING VAULT IS READY TO BURST'
    : result.totalWin>0
     ? `WIN ${currency(result.totalWin)}`
     : result.coinsLanded
      ? `${result.coinsLanded} VAULT LOCK${result.coinsLanded===1?'':'S'} CHARGED`
      : 'NO WIN — EVERY SPIN IS INDEPENDENT';

   store.patch({
    engine:engine.snapshot,
    message,
   });

   updateJackpots();
  }catch(error){
   console.error(error);
   alert(error instanceof Error?error.message:'Spin error');
  }finally{
   store.patch({spinning:false});
  }
 });

 function pulse(className){
  const cabinet=shell.querySelector('[data-cabinet]');
  cabinet.classList.remove(className);
  void cabinet.offsetWidth;
  cabinet.classList.add(className);
  setTimeout(()=>cabinet.classList.remove(className),700);
 }

 const jackpotValues={
  super:10000.02,
  grand:5000.02,
  major:500.03,
  minor:50,
  mini:10,
 };

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
  const stage=shell.querySelector('[data-fit-stage]');
  const inner=shell.querySelector('[data-fit-inner]');
  if(!stage||!inner)return;

  inner.style.transform='scale(1)';
  const naturalWidth=inner.offsetWidth;
  const naturalHeight=inner.offsetHeight;
  const availableWidth=Math.max(360,window.innerWidth-22);
  const availableHeight=Math.max(540,window.innerHeight-82);
  const scale=Math.min(
   1,
   availableWidth/naturalWidth,
   availableHeight/naturalHeight
  );

  inner.style.transform=`scale(${scale})`;
  stage.style.width=`${Math.ceil(naturalWidth*scale)}px`;
  stage.style.height=`${Math.ceil(naturalHeight*scale)}px`;
 }

 addEventListener('resize',()=>requestAnimationFrame(fitMachine));

 updateJackpots();
 showView('lobby');
}catch(error){
 console.error(error);
 mount.innerHTML=`
  <div class="fatal-error">
   <h1>Engine initialization failed</h1>
   <p>${escapeHtml(error instanceof Error?error.message:String(error))}</p>
   <p>Confirm the complete assets and src folders were uploaded.</p>
  </div>`;
}

function currency(value){
 return new Intl.NumberFormat('en-US',{
  style:'currency',
  currency:'USD',
 }).format(value);
}

function roundMoney(value){
 return Math.round(value*100)/100;
}

function wait(milliseconds){
 return new Promise(resolve=>setTimeout(resolve,milliseconds));
}

function escapeHtml(value){
 return value
  .replaceAll('&','&amp;')
  .replaceAll('<','&lt;')
  .replaceAll('>','&gt;')
  .replaceAll('"','&quot;')
  .replaceAll("'","&#039;");
}
