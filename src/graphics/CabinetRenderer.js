const money=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v);
export class CabinetRenderer{
 constructor(root){this.root=root}
 render(state){
  const e=state.engine;
  this.all('[data-bank]',money(e.bank));this.all('[data-wallet]',money(e.tripWallet));
  this.one('[data-message]',state.message);this.one('[data-charges]',`${e.vaultCharges} / 30`);
  this.one('[data-spins]',e.spins);this.one('[data-wagered]',money(e.wagered));this.one('[data-returned]',money(e.returned));
  this.one('[data-rtp]',`${e.sessionRtp.toFixed(2)}%`);this.one('[data-last-win]',money(e.lastResult?.totalWin||0));
  const fill=this.root.querySelector('[data-charge-fill]');if(fill)fill.style.width=`${e.vaultCharges/30*100}%`;
  this.root.querySelectorAll('.vault-bolts i').forEach((b,i)=>b.classList.toggle('charged',i<e.vaultCharges));
  const spin=this.root.querySelector('[data-spin]');if(spin)spin.disabled=state.spinning||e.tripWallet<1;
  this.root.querySelector('[data-ledger]')?.classList.toggle('open',state.ledgerOpen);
  this.root.querySelector('[data-cabinet]')?.classList.toggle('is-spinning',state.spinning);
 }
 one(sel,val){const n=this.root.querySelector(sel);if(n)n.textContent=String(val)}
 all(sel,val){this.root.querySelectorAll(sel).forEach(n=>n.textContent=String(val))}
}
