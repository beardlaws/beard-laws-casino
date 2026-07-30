import {evaluate243Ways,evaluateScatters} from './ReelEvaluator.js';
export class FeaturePipeline{
 constructor(random,state){this.random=random;this.state=state;}
 evaluate(grid,bet){
  const baseWin=evaluate243Ways(grid,bet);
  const scatterWin=evaluateScatters(grid,bet);
  const coinValues=[];
  const table=[1,1,1,2,2,3,5,10,25];
  grid.forEach((reel,c)=>reel.forEach((symbol,r)=>{
   if(symbol==='coin')coinValues.push({reel:c,row:r,value:table[this.random.nextInt(table.length)]*bet});
  }));
  const vernonWin=(grid[2]?.includes('vernon')??false)?coinValues.reduce((s,c)=>s+c.value,0):0;
  const before=this.state.vaultCharges;
  this.state.vaultCharges+=coinValues.length;
  const livingVaultTriggered=this.state.vaultCharges>=30;
  if(livingVaultTriggered)this.state.vaultCharges%=30;
  return {
   grid,wager:bet,baseWin,scatterWin,vernonWin,
   totalWin:round(baseWin+scatterWin+vernonWin),
   coinValues,coinsLanded:coinValues.length,
   vaultChargesBefore:before,vaultChargesAfter:this.state.vaultCharges,livingVaultTriggered
  };
 }
}
const round=v=>Math.round(v*100)/100;