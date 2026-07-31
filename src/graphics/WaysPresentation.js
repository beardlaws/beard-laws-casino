const PAY={
 oil:{3:2,4:5,5:12},comb:{3:2,4:6,5:15},razor:{3:3,4:8,5:20},
 balm:{3:3,4:10,5:25},key:{3:5,4:18,5:60},crown:{3:8,4:30,5:120}
};
const LABELS={
 oil:'BEARD OIL',comb:'MASTER COMB',razor:'STRAIGHT RAZOR',
 balm:'BEARD BALM',key:'GOLDEN KEY',crown:'ROYAL CROWN'
};
const SYMBOLS=['oil','comb','razor','balm','key','crown'];

export function describeWaysWins(grid,bet){
 const groups=[];
 for(const symbol of SYMBOLS){
  const positionsByReel=[];
  for(let reelIndex=0;reelIndex<grid.length;reelIndex++){
   const matches=[];
   grid[reelIndex].forEach((cell,rowIndex)=>{
    if(cell===symbol||cell==='vernon')matches.push({reel:reelIndex,row:rowIndex});
   });
   if(matches.length===0)break;
   positionsByReel.push(matches);
  }

  const length=positionsByReel.length;
  const multiplier=PAY[symbol]?.[length];
  if(length<3||multiplier===undefined)continue;

  const ways=positionsByReel.reduce((product,reel)=>product*reel.length,1);
  const payout=round((multiplier*ways*bet)/243);

  // One representative path is drawn at a time. All matching symbols still illuminate.
  const path=positionsByReel.map(reelMatches=>reelMatches[0]);

  groups.push({
   symbol,
   label:LABELS[symbol],
   length,
   ways,
   payout,
   positions:positionsByReel.flat(),
   path,
  });
 }
 return groups;
}

export function markerForGroup(group,index){
 const rowSignature=group.path.reduce((sum,position)=>sum+position.row,0);
 return ((rowSignature+index)%9)+1;
}

const round=value=>Math.round(value*100)/100;
