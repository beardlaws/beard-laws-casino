const money=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v);

export class CabinetRenderer{
 constructor(root){this.root=root;}
 render(state){
  const e=state.engine;
  this.text('[data-bank]',money(e.bank));
  this.text('[data-wallet]',money(e.tripWallet));
  this.text('[data-message]',state.message);
  this.text('[data-charges]',`${e.vaultCharges} / 30`);
  this.text('[data-spins]',e.spins);
  this.text('[data-wagered]',money(e.wagered));
  this.text('[data-returned]',money(e.returned));
  this.text('[data-rtp]',`${e.sessionRtp.toFixed(2)}%`);
  this.text('[data-last-win]',money(e.lastResult?.totalWin||0));

  const fill=this.root.querySelector('[data-charge-fill]');
  if(fill)fill.style.width=`${e.vaultCharges/30*100}%`;

  this.root.querySelectorAll('.vault-bolts i').forEach((bolt,index)=>{
    bolt.classList.toggle('charged',index<e.vaultCharges);
  });

  const spin=this.root.querySelector('[data-spin]');
  if(spin)spin.disabled=state.spinning||e.tripWallet<1;

  this.root.querySelector('[data-ledger]')?.classList.toggle('open',state.ledgerOpen);
  this.root.querySelector('[data-cabinet]')?.classList.toggle('is-spinning',state.spinning);
 }
 text(sel,val){const node=this.root.querySelector(sel);if(node)node.textContent=String(val);}
}
