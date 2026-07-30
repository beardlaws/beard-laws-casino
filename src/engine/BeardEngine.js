import {Wallet} from './Wallet.js';
import {FeaturePipeline} from './FeaturePipeline.js';
export class BeardEngine{
 #wallet=new Wallet(2000,200);#state={vaultCharges:0};#pipeline;#spins=0;#wagered=0;#returned=0;#last=null;
 constructor(config,random){this.config=config;this.random=random;this.#pipeline=new FeaturePipeline(random,this.#state);}
 spin(bet=1){
  this.#wallet.wager(bet);this.#spins++;this.#wagered=round(this.#wagered+bet);
  const grid=this.config.reelStrips.map(strip=>{
   const stop=this.random.nextInt(strip.length);
   return [-1,0,1].map(offset=>strip[(stop+offset+strip.length)%strip.length]);
  });
  const result=this.#pipeline.evaluate(grid,bet);
  if(result.totalWin>0){this.#wallet.credit(result.totalWin);this.#returned=round(this.#returned+result.totalWin);}
  this.#last=result;return result;
 }
 get snapshot(){
  const w=this.#wallet.snapshot;
  return {bank:w.bank,tripWallet:w.tripWallet,vaultCharges:this.#state.vaultCharges,spins:this.#spins,wagered:this.#wagered,returned:this.#returned,sessionRtp:this.#wagered?round(this.#returned/this.#wagered*100):0,lastResult:this.#last};
 }
}
const round=v=>Math.round(v*100)/100;