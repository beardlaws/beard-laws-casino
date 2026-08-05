import type { CasinoGameId } from './CasinoProgression';

export interface SimulationReport {
  game: CasinoGameId;
  spins: number;
  rtp: number;
  baseRtp: number;
  featureRtp: number;
  hitFrequency: number;
  profitableFrequency: number;
  featureFrequency: number;
  averageFeatureX: number;
  medianFeatureX: number;
  maxWinX: number;
  longestLosingStreak: number;
  longestFeatureDrought: number;
  nearMissFrequency: number;
  volatility: number;
}

type Profile = {
  baseHit: number;
  baseMeanX: number;
  baseShape: number;
  featureChance: number;
  featureMeanX: number;
  featureShape: number;
  nearMissChance: number;
};

const profiles: Record<'barber'|'megh'|'neema', Profile> = {
  barber: { baseHit:.255, baseMeanX:1.85, baseShape:2.7, featureChance:1/155, featureMeanX:46, featureShape:2.15, nearMissChance:.042 },
  megh: { baseHit:.315, baseMeanX:1.55, baseShape:2.2, featureChance:1/128, featureMeanX:34, featureShape:1.9, nearMissChance:.035 },
  neema: { baseHit:.29, baseMeanX:1.7, baseShape:2.45, featureChance:1/142, featureMeanX:40, featureShape:2.05, nearMissChance:.04 },
};

const mulberry32 = (seed:number) => () => {
  seed |= 0; seed = seed + 0x6D2B79F5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

const gammaish = (rng:()=>number, mean:number, shape:number):number => {
  const samples = Math.max(2, Math.round(shape * 2));
  let sum = 0;
  for(let i=0;i<samples;i++) sum += -Math.log(Math.max(1e-9, rng()));
  return Math.max(.05, sum / samples * mean);
};

export const runModelSimulation = (game:'barber'|'megh'|'neema', spins=100000, seed=7601):SimulationReport => {
  const p=profiles[game]; const rng=mulberry32(seed + game.length * 997);
  let wager=0, baseWon=0, featureWon=0, wins=0, profitable=0, features=0, nearMisses=0;
  let losing=0, longestLosing=0, drought=0, longestDrought=0, maxWin=0;
  const featureWins:number[]=[]; const returns:number[]=[];
  for(let i=0;i<spins;i++){
    wager += 1; drought += 1;
    let win=0;
    if(rng()<p.baseHit){ win += gammaish(rng,p.baseMeanX,p.baseShape); baseWon += win; }
    if(rng()<p.featureChance){
      const bonus=gammaish(rng,p.featureMeanX,p.featureShape);
      featureWon += bonus; win += bonus; features++; featureWins.push(bonus);
      longestDrought=Math.max(longestDrought,drought-1); drought=0;
    } else if(rng()<p.nearMissChance) nearMisses++;
    returns.push(win); maxWin=Math.max(maxWin,win);
    if(win>0){wins++; losing=0;} else {losing++; longestLosing=Math.max(longestLosing,losing);}
    if(win>=1) profitable++;
  }
  longestDrought=Math.max(longestDrought,drought);
  featureWins.sort((a,b)=>a-b);
  const avg=featureWins.length?featureWins.reduce((a,b)=>a+b,0)/featureWins.length:0;
  const med=featureWins.length?featureWins[Math.floor(featureWins.length/2)]!:0;
  const mean=returns.reduce((a,b)=>a+b,0)/returns.length;
  const variance=returns.reduce((a,b)=>a+(b-mean)**2,0)/returns.length;
  return {game,spins,rtp:(baseWon+featureWon)/wager,baseRtp:baseWon/wager,featureRtp:featureWon/wager,hitFrequency:wins/spins,profitableFrequency:profitable/spins,featureFrequency:features/spins,averageFeatureX:avg,medianFeatureX:med,maxWinX:maxWin,longestLosingStreak:longestLosing,longestFeatureDrought:longestDrought,nearMissFrequency:nearMisses/spins,volatility:Math.sqrt(variance)};
};

export const simulationCsv = (reports:SimulationReport[]):string => {
  const header='game,spins,rtp,base_rtp,feature_rtp,hit_frequency,profitable_frequency,feature_frequency,average_feature_x,median_feature_x,max_win_x,longest_losing_streak,longest_feature_drought,near_miss_frequency,volatility';
  return [header,...reports.map(r=>[r.game,r.spins,r.rtp,r.baseRtp,r.featureRtp,r.hitFrequency,r.profitableFrequency,r.featureFrequency,r.averageFeatureX,r.medianFeatureX,r.maxWinX,r.longestLosingStreak,r.longestFeatureDrought,r.nearMissFrequency,r.volatility].join(','))].join('\n');
};
