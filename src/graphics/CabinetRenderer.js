const money=value=>new Intl.NumberFormat('en-US',{
 style:'currency',
 currency:'USD',
}).format(value);

export class CabinetRenderer{
 constructor(root){
  this.root=root;
  this.presentedWin=null;
 }

 setPresentedWin(value){
  this.presentedWin=value;
  const snapshot=this.root.__latestEngineSnapshot;
  if(snapshot){
   this.one('[data-last-win]',money(value??snapshot.lastResult?.totalWin??0));
  }
 }

 render(state){
  const engine=state.engine;
  this.root.__latestEngineSnapshot=engine;

  this.all('[data-bank]',money(engine.bank));
  this.all('[data-wallet]',money(engine.tripWallet));
  this.one('[data-message]',state.message);
  this.one('[data-charges]',`${engine.vaultCharges} / 30`);
  this.one('[data-spins]',engine.spins);
  this.one('[data-wagered]',money(engine.wagered));
  this.one('[data-returned]',money(engine.returned));
  this.one('[data-rtp]',`${engine.sessionRtp.toFixed(2)}%`);
  this.one(
   '[data-last-win]',
   money(this.presentedWin??engine.lastResult?.totalWin??0)
  );

  const chargeFill=this.root.querySelector('[data-charge-fill]');
  if(chargeFill){
   chargeFill.style.width=`${engine.vaultCharges/30*100}%`;
  }

  this.root.querySelectorAll('.lock-grid i').forEach((lock,index)=>{
   lock.classList.toggle('charged',index<engine.vaultCharges);
  });

  const spinButton=this.root.querySelector('[data-spin]');
  if(spinButton){
   spinButton.disabled=state.spinning||engine.tripWallet<1;
  }

  this.root.querySelector('[data-ledger]')
   ?.classList.toggle('open',state.ledgerOpen);

  this.root.querySelector('[data-cabinet]')
   ?.classList.toggle('is-spinning',state.spinning);
 }

 one(selector,value){
  const node=this.root.querySelector(selector);
  if(node)node.textContent=String(value);
 }

 all(selector,value){
  this.root.querySelectorAll(selector)
   .forEach(node=>node.textContent=String(value));
 }
}
