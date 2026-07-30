const PAY={
 oil:{3:2,4:5,5:12},comb:{3:2,4:6,5:15},razor:{3:3,4:8,5:20},
 balm:{3:3,4:10,5:25},key:{3:5,4:18,5:60},crown:{3:8,4:30,5:120}
};
const symbols=['oil','comb','razor','balm','key','crown'];
export function evaluate243Ways(grid,bet){
 let amount=0;
 for(const symbol of symbols){
  const counts=[];
  for(const reel of grid){
   const count=reel.filter(cell=>cell===symbol||cell==='vernon').length;
   if(!count)break;
   counts.push(count);
  }
  const len=counts.length;
  if(len>=3&&PAY[symbol]?.[len]){
   amount+=(PAY[symbol][len]*counts.reduce((a,b)=>a*b,1)*bet)/243;
  }
 }
 return round(amount);
}
export function evaluateScatters(grid,bet){
 const count=grid.flat().filter(s=>s==='vault').length;
 return round((count===3?2:count===4?10:count>=5?50:0)*bet);
}
const round=v=>Math.round(v*100)/100;