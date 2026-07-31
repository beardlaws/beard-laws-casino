const PAY={
 oil:{3:2,4:5,5:12},comb:{3:2,4:6,5:15},razor:{3:3,4:8,5:20},
 balm:{3:3,4:10,5:25},key:{3:5,4:18,5:60},crown:{3:8,4:30,5:120}
};
const LABELS={
 oil:'BEARD OIL',comb:'MASTER COMB',razor:'STRAIGHT RAZOR',
 balm:'BEARD BALM',key:'GOLDEN KEY',crown:'ROYAL CROWN'
};
const SYMBOLS=['oil','comb','razor','balm','key','crown'];

/**
 * Presentation-only mirror of the existing evaluator.
 * It never awards credits, mutates state, or changes the resolved result.
 */
export function describeWaysWins(grid,bet){
 const groups=[];
 for(const symbol of SYMBOLS){
  const positions=[];
  for(let reelIndex=0;reelIndex<grid.length;reelIndex++){
   const matches=[];
   grid[reelIndex].forEach((cell,rowIndex)=>{
    if(cell===symbol||cell==='vernon')matches.push({reel:reelIndex,row:rowIndex});
   });
   if(matches.length===0)break;
   positions.push(matches);
  }
  const length=positions.length;
  const multiplier=PAY[symbol]?.[length];
  if(length<3||multiplier===undefined)continue;
  const ways=positions.reduce((product,reel)=>product*reel.length,1);
  const payout=round((multiplier*ways*bet)/243);
  groups.push({
   symbol,label:LABELS[symbol],length,ways,payout,
   positions:positions.flat()
  });
 }
 return groups;
}
const round=value=>Math.round(value*100)/100;
