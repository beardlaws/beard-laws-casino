import type { CasinoGameId } from './CasinoProgression';
import { BARBER_PRODUCTION_MATH } from '../games/BigBadBarber';
import { resolveBarberFinale } from '../games/barber/BarberRuntime';
import { MEGH_PRODUCTION_MATH } from '../games/MeghsCosmicJam';
import { NEEMA_PRODUCTION_MATH } from '../games/NeemasHighSeas';

export interface ProductionSimulationReport {
  game: CasinoGameId;
  spins: number;
  seed: number;
  source: 'production-rules';
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
  notes: string[];
}

type Rng = () => number;
type MathSymbol = { id: string; weight: number; pay: number | readonly number[] };

const mulberry32 = (seed: number): Rng => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const pickWeighted = <T extends { weight: number }>(items: readonly T[], rng: Rng): T => {
  let roll = rng() * items.reduce((sum, item) => sum + item.weight, 0);
  for (const item of items) {
    roll -= item.weight;
    if (roll < 0) return item;
  }
  return items[0]!;
};

const summarize = (
  game: CasinoGameId,
  spins: number,
  seed: number,
  baseWon: number,
  featureWon: number,
  returns: number[],
  featureWins: number[],
  nearMisses: number,
  longestLosingStreak: number,
  longestFeatureDrought: number,
  notes: string[],
): ProductionSimulationReport => {
  const wins = returns.filter((value) => value > 0).length;
  const profitable = returns.filter((value) => value >= 1).length;
  const sorted = [...featureWins].sort((a, b) => a - b);
  const averageFeatureX = sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0;
  const medianFeatureX = sorted.length ? sorted[Math.floor(sorted.length / 2)]! : 0;
  const mean = returns.reduce((a, b) => a + b, 0) / Math.max(1, returns.length);
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, returns.length);
  return {
    game,
    spins,
    seed,
    source: 'production-rules',
    rtp: (baseWon + featureWon) / spins,
    baseRtp: baseWon / spins,
    featureRtp: featureWon / spins,
    hitFrequency: wins / spins,
    profitableFrequency: profitable / spins,
    featureFrequency: featureWins.length / spins,
    averageFeatureX,
    medianFeatureX,
    maxWinX: Math.max(0, ...returns),
    longestLosingStreak,
    longestFeatureDrought,
    nearMissFrequency: nearMisses / spins,
    volatility: Math.sqrt(variance),
    notes,
  };
};

const simulateBarber = (spins: number, seed: number): ProductionSimulationReport => {
  const rng = mulberry32(seed);
  const config = BARBER_PRODUCTION_MATH;
  const symbols = config.symbols as readonly MathSymbol[];
  const forts = [0, 0, 0, 0, 0];
  let baseWon = 0;
  let featureWon = 0;
  let losing = 0;
  let longestLosing = 0;
  let drought = 0;
  let longestDrought = 0;
  let nearMisses = 0;
  const returns: number[] = [];
  const featureWins: number[] = [];

  const grid = () => Array.from({ length: config.rows }, () => Array.from({ length: config.cols }, () => pickWeighted(symbols, rng)));
  const evaluate = (board: MathSymbol[][]): number => {
    let total = 0;
    for (const target of symbols.filter((symbol) => !['razor', 'wild', 'builder'].includes(symbol.id))) {
      let ways = 1;
      let length = 0;
      for (let x = 0; x < config.cols; x += 1) {
        const matches = board.filter((row) => row[x]!.id === target.id || row[x]!.id === 'wild').length;
        if (!matches) break;
        length += 1;
        ways *= matches;
      }
      if (length >= config.minimumMatch) total += Number(target.pay) * config.basePayScale * ways * (length - config.minimumMatch + 1) / 10;
    }
    return total;
  };
  const applyBuilders = (board: MathSymbol[][]): boolean => {
    let upgraded = false;
    for (let x = 0; x < config.cols; x += 1) {
      const count = board.filter((row) => row[x]!.id === 'builder').length;
      for (let n = 0; n < count; n += 1) {
        if (forts[x]! < config.maxFortressLevel) {
          forts[x] = forts[x]! + 1;
          upgraded = true;
        }
      }
    }
    return upgraded;
  };
  const attack = (): number => {
    const built = forts.map((level, index) => ({ level, index })).filter(({ level }) => level > 0);
    if (!built.length) return 0;
    const target = built[Math.floor(rng() * built.length)]!;
    forts[target.index] = 0;
    return config.fortressMultipliers[target.level]! * config.fortressAwardScale;
  };

  for (let paid = 0; paid < spins; paid += 1) {
    drought += 1;
    let paidReturn = 0;
    const board = grid();
    const base = evaluate(board);
    const razors = board.flat().filter((symbol) => symbol.id === 'razor').length;
    if (razors === 2) nearMisses += 1;
    const upgraded = applyBuilders(board);
    paidReturn += base;
    baseWon += base;

    if (razors >= 3) {
      let bonus = 0;
      for (let free = 0; free < config.bonusSpins; free += 1) {
        const freeBoard = grid();
        const freeBase = evaluate(freeBoard);
        bonus += freeBase;
        const built = applyBuilders(freeBoard);
        if (!built && freeBase === 0 && forts.some((level) => level > 0)) bonus += attack();
      }
      // Project Beard M13 Final Trim: every fortress that survives the eight
      // free spins reveals once at a lower finale scale, then resets.
      const finale = resolveBarberFinale(
        forts,
        config.fortressMultipliers,
        100,
        Number(config.finalFortressAwardScale ?? 0),
      );
      for (const reveal of finale) {
        bonus += reveal.awardUnits / 100;
        forts[reveal.reel] = 0;
      }
      featureWon += bonus;
      featureWins.push(bonus);
      paidReturn += bonus;
      longestDrought = Math.max(longestDrought, drought - 1);
      drought = 0;
    } else if (!upgraded && base === 0 && forts.some((level) => level > 0) && rng() < config.attackChance) {
      const reveal = attack();
      featureWon += reveal;
      paidReturn += reveal;
    }

    returns.push(paidReturn);
    if (paidReturn > 0) losing = 0;
    else {
      losing += 1;
      longestLosing = Math.max(longestLosing, losing);
    }
  }
  longestDrought = Math.max(longestDrought, drought);
  return summarize('barber', spins, seed, baseWon, featureWon, returns, featureWins, nearMisses, longestLosing, longestDrought, [
    'Uses Big Bad Barber production symbol weights, 243-ways evaluator, four-reel minimum match, Builder upgrades, 14% paid-spin attack rule, scaled fortress awards, eight Shave Down free spins, and the Final Trim reveal of surviving fortresses.',
    'Presentation-only Barber variants are intentionally excluded because they do not change payouts.',
  ]);
};

type MeghSymbol = { id: string; weight: number; pay: number };
const simulateMegh = (spins: number, seed: number): ProductionSimulationReport => {
  const rng = mulberry32(seed);
  const config = MEGH_PRODUCTION_MATH;
  const symbols = config.symbols as readonly MeghSymbol[];
  let soundcheck = 0;
  const soundboard = new Set<string>();
  let baseWon = 0;
  let featureWon = 0;
  let losing = 0;
  let longestLosing = 0;
  let drought = 0;
  let longestDrought = 0;
  let nearMisses = 0;
  const returns: number[] = [];
  const featureWins: number[] = [];
  const channelMap: Record<string, string> = { amp: 'BASS', guitar: 'LEAD', goat: 'DRUMS', megh: 'VOCALS', ufo: 'UFO', vinyl: 'BASS', strawberry: 'VOCALS' };

  const pick = (ufoBoost = 1): MeghSymbol => {
    const adjusted = symbols.map((symbol) => symbol.id === 'ufo' ? { ...symbol, weight: symbol.weight * ufoBoost } : symbol);
    return pickWeighted(adjusted, rng);
  };
  const makeGrid = (ufoBoost = 1) => Array.from({ length: config.rows }, () => Array.from({ length: config.cols }, () => pick(ufoBoost)));
  const clusters = (board: MeghSymbol[][]) => {
    const visited = new Set<string>();
    const found: Array<{ cells: Set<string>; symbol: MeghSymbol }> = [];
    for (let y = 0; y < config.rows; y += 1) for (let x = 0; x < config.cols; x += 1) {
      const key = `${x}:${y}`;
      if (visited.has(key)) continue;
      const base = board[y]![x]!;
      if (base.id === 'ufo' || base.id === 'wild') { visited.add(key); continue; }
      const cells = new Set<string>();
      const queue: Array<[number, number]> = [[x, y]];
      while (queue.length) {
        const [cx, cy] = queue.pop()!;
        const ck = `${cx}:${cy}`;
        if (visited.has(ck)) continue;
        const current = board[cy]?.[cx];
        if (!current || (current.id !== base.id && current.id !== 'wild')) continue;
        visited.add(ck); cells.add(ck);
        queue.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
      }
      if (cells.size >= config.clusterMinimum) found.push({ cells, symbol: base });
    }
    return found;
  };
  const tumble = (board: MeghSymbol[][], removed: Set<string>, ufoBoost = 1): MeghSymbol[][] => {
    const next = board.map((row) => [...row]);
    for (let x = 0; x < config.cols; x += 1) {
      const kept: MeghSymbol[] = [];
      for (let y = config.rows - 1; y >= 0; y -= 1) if (!removed.has(`${x}:${y}`)) kept.push(board[y]![x]!);
      for (let y = config.rows - 1; y >= 0; y -= 1) next[y]![x] = kept[config.rows - 1 - y] ?? pick(ufoBoost);
    }
    return next;
  };
  const playDrop = (free: boolean, startingMultiplier: number, ufoBoost = 1) => {
    let board = makeGrid(ufoBoost);
    let multiplier = startingMultiplier;
    let total = 0;
    let cascadeCount = 0;
    let removedEnergy = 0;
    const channels = new Set<string>();
    for (let cascade = 0; cascade < config.maxCascades; cascade += 1) {
      const matches = clusters(board);
      if (!matches.length) break;
      cascadeCount += 1;
      const removed = new Set(matches.flatMap((match) => [...match.cells]));
      const raw = matches.reduce((sum, match) => sum + match.symbol.pay * match.cells.size, 0);
      total += raw * multiplier * config.cascadePayScale * (free ? config.featurePayScale : 1) / 100;
      removedEnergy += removed.size;
      for (const match of matches) {
        const channel = channelMap[match.symbol.id];
        if (channel) channels.add(channel);
      }
      board = tumble(board, removed, ufoBoost);
      multiplier += 1;
      if (free) {
        const stage = removedEnergy >= 60 ? 3 : removedEnergy >= 40 ? 2 : removedEnergy >= 18 ? 1 : 0;
        multiplier = Math.max(multiplier, startingMultiplier + cascadeCount + stage);
      }
    }
    return { total, cascadeCount, finalMultiplier: multiplier, ufos: board.flat().filter((symbol) => symbol.id === 'ufo').length, channels };
  };

  for (let paid = 0; paid < spins; paid += 1) {
    drought += 1;
    const result = playDrop(false, 1);
    baseWon += result.total;
    let paidReturn = result.total;
    soundcheck = Math.min(config.soundcheckTarget, soundcheck + 1 + result.ufos);
    result.channels.forEach((channel) => soundboard.add(channel));
    const feature = result.ufos >= 3 || result.cascadeCount >= 4 || soundcheck >= config.soundcheckTarget;
    if (result.ufos === 2) nearMisses += 1;
    if (feature) {
      soundcheck = 0;
      const headliner = soundboard.size >= 5;
      const modeRoll = rng();
      const mode = modeRoll < 1 / 3 ? 'long-set' : modeRoll < 2 / 3 ? 'power-chords' : 'ufo-storm';
      let drops = result.cascadeCount >= 8 ? 50 : result.ufos >= 5 ? 16 : result.ufos >= 4 ? 12 : 8;
      if (mode === 'long-set') drops += 4;
      if (headliner) drops += 5;
      let multiplier = headliner ? 5 : mode === 'power-chords' ? 3 : Math.max(1, result.finalMultiplier);
      let bonus = 0;
      let played = 0;
      let retriggered = 0;
      while (drops > 0 && played < config.maxFeatureDrops) {
        drops -= 1; played += 1;
        const drop = playDrop(true, multiplier, mode === 'ufo-storm' ? 3.2 : 1);
        bonus += drop.total;
        multiplier = Math.max(multiplier, drop.finalMultiplier);
        if (drop.ufos >= 3 && retriggered < config.maxRetriggerDrops) {
          const requested = drop.ufos >= 5 ? 5 : drop.ufos >= 4 ? 4 : 3;
          const added = Math.min(requested, config.maxFeatureDrops - played - drops, config.maxRetriggerDrops - retriggered);
          drops += Math.max(0, added);
          retriggered += Math.max(0, added);
        }
      }
      bonus += Math.max(1, bonus * ([0.22, 0.15, 0.1][Math.floor(rng() * 3)] ?? 0.1));
      featureWon += bonus;
      featureWins.push(bonus);
      paidReturn += bonus;
      soundboard.clear();
      longestDrought = Math.max(longestDrought, drought - 1); drought = 0;
    }
    returns.push(paidReturn);
    if (paidReturn > 0) losing = 0;
    else { losing += 1; longestLosing = Math.max(longestLosing, losing); }
  }
  longestDrought = Math.max(longestDrought, drought);
  return summarize('megh', spins, seed, baseWon, featureWon, returns, featureWins, nearMisses, longestLosing, longestDrought, [
    'Uses Cosmic Jam production symbol weights, 6+ orthogonal cluster rules, wild substitution, gravity tumbles, 100-point Soundcheck guarantee, feature-only payout scaling, Encore drop counts, retriggers, and Guitar Smash factors.',
    'Player choice among Encore modes and Guitar Smash picks is simulated uniformly.',
  ]);
};

type NeemaSymbol = { id: string; weight: number; pay: readonly number[] };
const simulateNeema = (spins: number, seed: number): ProductionSimulationReport => {
  const rng = mulberry32(seed);
  const config = NEEMA_PRODUCTION_MATH;
  const symbols = config.symbols as readonly NeemaSymbol[];
  let departure = 0;
  let baseWon = 0;
  let featureWon = 0;
  let losing = 0;
  let longestLosing = 0;
  let drought = 0;
  let longestDrought = 0;
  let nearMisses = 0;
  const returns: number[] = [];
  const featureWins: number[] = [];
  let eventDeck: string[] = [];
  const pick = () => pickWeighted(symbols, rng);
  const makeGrid = () => Array.from({ length: config.reels }, () => Array.from({ length: config.rows }, pick));
  const symbol = (id: string) => symbols.find((item) => item.id === id)!;
  const dealEvent = () => {
    if (!eventDeck.length) eventDeck = ['DOUBLE POUR', 'GOLDEN SUNSET', "CAPTAIN'S PICK", 'PARTY COVE RUSH', 'CALM SEAS', 'CALM SEAS', 'CALM SEAS'].sort(() => rng() - 0.5);
    return eventDeck.pop()!;
  };
  const applyEvent = (board: NeemaSymbol[][], event: string) => {
    const next = board.map((reel) => [...reel]);
    const place = (id: string) => { next[Math.floor(rng() * config.reels)]![Math.floor(rng() * config.rows)] = symbol(id); };
    if (event === 'DOUBLE POUR') place('ticket');
    if (event === 'GOLDEN SUNSET') { place('wild'); place('wild'); }
    if (event === "CAPTAIN'S PICK") place('captain');
    if (event === 'PARTY COVE RUSH') { place('cranberry'); place('cranberry'); place('ticket'); }
    return next;
  };
  const evaluate = (board: NeemaSymbol[][]) => {
    let totalX = 0;
    for (const line of config.lines) {
      const first = board[0]![line[0]]!;
      const base = first.id === 'wild' ? (board.slice(1).map((reel, index) => reel[line[index + 1]!]!).find((candidate) => candidate.id !== 'wild' && candidate.id !== 'ticket') ?? first) : first;
      if (base.id === 'ticket') continue;
      let length = 0;
      for (let reel = 0; reel < config.reels; reel += 1) {
        const candidate = board[reel]![line[reel]!]!;
        if (candidate.id === base.id || candidate.id === 'wild') length += 1;
        else break;
      }
      if (length >= 3) totalX += base.pay[length - 3] ?? 0;
    }
    return totalX * config.linePayScale;
  };
  const frozenHappyHour = (startingDrinks: number) => {
    type Drink = { value: number; kind: string };
    const board: Array<Drink | null> = Array(20).fill(null);
    let respins = 3;
    let total = 0;
    let rounds = 0;
    let extraRespins = 0;
    const empty = () => board.map((value, index) => value ? -1 : index).filter((index) => index >= 0);
    const makeDrink = (): Drink => {
      const roll = rng();
      const multiple = roll < 0.56 ? 1 : roll < 0.78 ? 2 : roll < 0.9 ? 3 : roll < 0.965 ? 5 : 10;
      const kind = roll < 0.62 ? 'cash' : roll < 0.7 ? 'ice' : roll < 0.77 ? 'cranberry' : roll < 0.83 ? 'vodka' : roll < 0.88 ? 'neema' : roll < 0.93 ? 'bell' : roll < 0.98 ? 'wheel' : 'jackpot';
      return { kind, value: kind === 'jackpot' ? 10 : multiple };
    };
    for (let i = 0; i < Math.min(startingDrinks, 20); i += 1) {
      const open = empty(); const at = open[Math.floor(rng() * open.length)]!; const drink = makeDrink(); board[at] = drink; total += drink.value;
    }
    while (respins > 0 && empty().length && rounds < 60) {
      rounds += 1;
      const open = empty(); const locked = 20 - open.length;
      const chance = locked < 10 ? 0.5 : locked < 14 ? 0.36 : locked < 17 ? 0.2 : 0.08;
      const hitCount = rng() >= chance ? 0 : rng() < 0.88 ? 1 : 2;
      const hits = [...open].sort(() => rng() - 0.5).slice(0, hitCount);
      if (!hits.length) respins -= 1;
      else respins = 3;
      for (const at of hits) {
        const drink = makeDrink(); board[at] = drink; total += drink.value;
        if (drink.kind === 'ice') { total += drink.value; drink.value *= 2; }
        if (drink.kind === 'cranberry') board.forEach((other, index) => { if (other && index % 5 === at % 5) { total += other.value; other.value *= 2; } });
        if (drink.kind === 'vodka') total += board.reduce((sum, other) => sum + (other?.value ?? 0), 0) * 0.2;
        if (drink.kind === 'neema') { const remaining = empty(); if (remaining.length) { const extra = makeDrink(); board[remaining[0]!] = extra; total += extra.value; } }
        if (drink.kind === 'bell' && extraRespins < 8) { respins += 1; extraRespins += 1; }
        if (drink.kind === 'wheel') total += [2, 3, 5, 10][Math.floor(rng() * 4)]!;
      }
    }
    return total;
  };

  for (let paid = 0; paid < spins; paid += 1) {
    drought += 1;
    let board = applyEvent(makeGrid(), dealEvent());
    const base = evaluate(board);
    baseWon += base;
    let paidReturn = base;
    const tickets = board.flat().filter((item) => item.id === 'ticket').length;
    if (tickets === 2) nearMisses += 1;
    departure = Math.min(config.departureTarget, departure + 1 + tickets);
    const feature = tickets >= config.happyHourTrigger || departure >= config.departureTarget;
    if (feature) {
      departure = 0;
      const route = rng() < 1 / 3 ? 'party' : rng() < 0.5 ? 'casino' : 'mystery';
      let bonus = frozenHappyHour(Math.max(6, tickets + 3)) * config.featurePayScale;
      let freeSpins = route === 'party' ? 14 : 10;
      let cabin = 1;
      let multiplier = 2;
      let played = 0;
      let voyageStops = 0;
      let retriggers = 0;
      while (freeSpins > 0 && played < config.maxVoyageSpins) {
        freeSpins -= 1; played += 1;
        const freeBoard = makeGrid();
        let win = evaluate(freeBoard) * multiplier;
        if (route === 'casino') win *= 1.35;
        else if (route === 'mystery' && rng() < 0.3) win *= 2;
        bonus += win * config.featurePayScale;
        const captains = freeBoard.flat().filter((item) => item.id === 'captain').length;
        if (captains > 0) {
          voyageStops = Math.min(4, voyageStops + captains);
          if (voyageStops === 2) freeSpins += Math.min(2, config.maxVoyageSpins - played - freeSpins);
          if (voyageStops === 3) multiplier += 1;
        }
        if (freeSpins > 0 && freeSpins % 2 === 0) { cabin = Math.min(4, cabin + 1); multiplier = 1 + cabin; }
        const freeTickets = freeBoard.flat().filter((item) => item.id === 'ticket').length;
        if (freeTickets >= config.happyHourTrigger && retriggers < config.maxVoyageRetriggers) {
          freeSpins += Math.min(5, config.maxVoyageSpins - played - freeSpins); retriggers += 1;
        }
      }
      featureWon += bonus;
      featureWins.push(bonus);
      paidReturn += bonus;
      longestDrought = Math.max(longestDrought, drought - 1); drought = 0;
    }
    returns.push(paidReturn);
    if (paidReturn > 0) losing = 0;
    else { losing += 1; longestLosing = Math.max(longestLosing, losing); }
  }
  longestDrought = Math.max(longestDrought, drought);
  return summarize('neema', spins, seed, baseWon, featureWon, returns, featureWins, nearMisses, longestLosing, longestDrought, [
    'Uses High Seas production symbol weights, five displayed paylines, wild substitution, 0.62 line scale, 110-point Departure guarantee, feature-only payout scaling, rotating Happy Hour event deck, Ticket triggers, Frozen Happy Hour rules, voyage routes, cabin multipliers, Captain stops, and retriggers.',
    'Interactive route choice is simulated uniformly; Frozen Happy Hour player input is automatic in the live game as well.',
  ]);
};

export const runProductionSimulation = (game: 'barber' | 'megh' | 'neema', spins = 100000, seed = 7702): ProductionSimulationReport => {
  if (game === 'barber') return simulateBarber(spins, seed + 101);
  if (game === 'megh') return simulateMegh(spins, seed + 202);
  return simulateNeema(spins, seed + 303);
};

export const productionSimulationCsv = (reports: ProductionSimulationReport[]): string => {
  const header = 'game,source,spins,seed,rtp,base_rtp,feature_rtp,hit_frequency,profitable_frequency,feature_frequency,average_feature_x,median_feature_x,max_win_x,longest_losing_streak,longest_feature_drought,near_miss_frequency,volatility';
  return [header, ...reports.map((report) => [report.game, report.source, report.spins, report.seed, report.rtp, report.baseRtp, report.featureRtp, report.hitFrequency, report.profitableFrequency, report.featureFrequency, report.averageFeatureX, report.medianFeatureX, report.maxWinX, report.longestLosingStreak, report.longestFeatureDrought, report.nearMissFrequency, report.volatility].join(','))].join('\n');
};
