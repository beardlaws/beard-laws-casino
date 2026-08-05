export type CasinoGameId = "beard-bank" | "neema" | "megh" | "blackjack" | "roulette" | "free-drop" | "barber";

export interface CasinoActivity {
  readonly type: "spin" | "bonus" | "win" | "coin" | "stage" | "voyage";
  readonly game: CasinoGameId;
  readonly amount?: number;
  readonly value?: number;
  readonly wager?: number;
}

export interface MissionProgress {
  readonly id: string;
  readonly label: string;
  readonly target: number;
  readonly progress: number;
  readonly reward: number;
  readonly claimed: boolean;
}

export interface CasinoMastery {
  readonly level: number;
  readonly progress: number;
  readonly claimed: readonly string[];
}

export interface CasinoProgress {
  readonly xp: number;
  readonly beardChips: number;
  readonly unlockedRewards: readonly string[];
  readonly totalSpins: number;
  readonly totalBonuses: number;
  readonly biggestWinUnits: number;
  readonly totalWageredUnits: number;
  readonly totalWonUnits: number;
  readonly biggestMultiplier: number;
  readonly favoriteGame: CasinoGameId | "none";
  readonly gameSpins: Partial<Record<CasinoGameId, number>>;
  readonly achievements: readonly string[];
  readonly dailyKey: string;
  readonly dailyStreak: number;
  readonly lastVisitKey: string;
  readonly dailyRewardKey: string;
  readonly dailyFreePlayUnits: number;
  readonly missions: readonly MissionProgress[];
  readonly mastery: Partial<Record<CasinoGameId, CasinoMastery>>;
  readonly discoveredEvents: readonly string[];
}

const dayKey = (date = new Date()): string => date.toISOString().slice(0, 10);
const previousDayKey = (): string => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return dayKey(date);
};

const missionSet = (): MissionProgress[] => [
  { id: "spins", label: "SPIN ANY SLOT 25 TIMES", target: 25, progress: 0, reward: 50, claimed: false },
  { id: "bonus", label: "TRIGGER ONE FEATURE", target: 1, progress: 0, reward: 75, claimed: false },
  { id: "explore", label: "PLAY TWO DIFFERENT GAMES", target: 2, progress: 0, reward: 50, claimed: false },
];

export const freshCasinoProgress = (): CasinoProgress => ({
  xp: 0,
  beardChips: 0,
  unlockedRewards: [],
  totalSpins: 0,
  totalBonuses: 0,
  biggestWinUnits: 0,
  totalWageredUnits: 0,
  totalWonUnits: 0,
  biggestMultiplier: 0,
  favoriteGame: "none",
  gameSpins: {},
  achievements: [],
  dailyKey: dayKey(),
  dailyStreak: 1,
  lastVisitKey: dayKey(),
  dailyRewardKey: "",
  dailyFreePlayUnits: 0,
  missions: missionSet(),
  mastery: {},
  discoveredEvents: [],
});

export const normalizeCasinoProgress = (value?: Partial<CasinoProgress>): CasinoProgress => {
  const base = freshCasinoProgress();
  const today = dayKey();
  const storedKey = String(value?.dailyKey ?? "");
  const sameDay = storedKey === today;
  const gameSpins = { ...(value?.gameSpins ?? {}) };
  const favoriteGame = (Object.entries(gameSpins).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] ?? "none") as CasinoProgress["favoriteGame"];
  return {
    ...base,
    ...value,
    xp: Math.max(0, Math.round(Number(value?.xp ?? 0))),
    beardChips: Math.max(0, Math.round(Number(value?.beardChips ?? 0))),
    unlockedRewards: Array.from(new Set(value?.unlockedRewards ?? [])),
    totalSpins: Math.max(0, Math.round(Number(value?.totalSpins ?? 0))),
    totalBonuses: Math.max(0, Math.round(Number(value?.totalBonuses ?? 0))),
    biggestWinUnits: Math.max(0, Math.round(Number(value?.biggestWinUnits ?? 0))),
    totalWageredUnits: Math.max(0, Math.round(Number(value?.totalWageredUnits ?? 0))),
    totalWonUnits: Math.max(0, Math.round(Number(value?.totalWonUnits ?? 0))),
    biggestMultiplier: Math.max(0, Number(value?.biggestMultiplier ?? 0)),
    gameSpins,
    favoriteGame,
    achievements: Array.from(new Set(value?.achievements ?? [])),
    dailyKey: today,
    dailyStreak: sameDay ? Math.max(1, Number(value?.dailyStreak ?? 1)) : value?.lastVisitKey === previousDayKey() ? Math.min(7, Number(value?.dailyStreak ?? 1) + 1) : 1,
    lastVisitKey: today,
    dailyRewardKey: String(value?.dailyRewardKey ?? ""),
    dailyFreePlayUnits: Math.max(0, Math.round(Number(value?.dailyFreePlayUnits ?? 0))),
    missions: sameDay && value?.missions?.length ? value.missions.map((m) => ({ ...m })) : missionSet(),
    mastery: { ...(value?.mastery ?? {}) },
    discoveredEvents: Array.from(new Set(value?.discoveredEvents ?? [])),
  };
};

export const rankForXp = (xp: number): { name: string; level: number; next: number } => {
  const ranks = [
    ["BRONZE BEARD", 0], ["SILVER BEARD", 500], ["GOLD BEARD", 1500],
    ["PLATINUM BEARD", 3500], ["LEGENDARY BEARD", 7000],
  ] as const;
  let index = 0;
  ranks.forEach((rank, i) => { if (xp >= rank[1]) index = i; });
  return { name: ranks[index]![0], level: index + 1, next: ranks[index + 1]?.[1] ?? ranks[index]![1] };
};

export const applyActivity = (current: CasinoProgress, activity: CasinoActivity): CasinoProgress => {
  const progress = normalizeCasinoProgress(current);
  const gameSpins = { ...progress.gameSpins };
  let totalSpins = progress.totalSpins;
  let totalBonuses = progress.totalBonuses;
  let xp = progress.xp;
  let biggestWinUnits = progress.biggestWinUnits;
  let beardChips = progress.beardChips;
  let totalWageredUnits = progress.totalWageredUnits;
  let totalWonUnits = progress.totalWonUnits;
  let biggestMultiplier = progress.biggestMultiplier;
  const achievements = new Set(progress.achievements);
  if (activity.type === "spin") {
    totalSpins += 1;
    const wager = Math.max(0, activity.wager ?? 0);
    totalWageredUnits += wager;
    xp += Math.floor(wager / 100);
    gameSpins[activity.game] = (gameSpins[activity.game] ?? 0) + 1;
    if (totalSpins >= 1) achievements.add("FIRST SPIN");
    if (totalSpins >= 100) achievements.add("CENTURY CLUB");
  }
  if (activity.type === "bonus") { totalBonuses += 1; xp += 100; beardChips += 25; achievements.add(`FIRST ${activity.game.toUpperCase()} FEATURE`); }
  if (activity.type === "win") {
    biggestWinUnits = Math.max(biggestWinUnits, activity.amount ?? 0);
    totalWonUnits += Math.max(0, activity.amount ?? 0);
    biggestMultiplier = Math.max(biggestMultiplier, activity.value ?? 0);
    if ((activity.value ?? 0) >= 50) { achievements.add("50× CLUB"); beardChips += 10; }
    if ((activity.value ?? 0) >= 100) beardChips += 25;
  }
  if (activity.type === "coin" && (activity.value ?? 0) >= 1) achievements.add("VAULT COLLECTOR");
  if (activity.type === "stage" && (activity.value ?? 0) >= 3) achievements.add("COSMIC HEADLINER");
  if (activity.type === "voyage" && (activity.value ?? 0) >= 4) achievements.add("CAPTAIN'S DECK");
  const playedGames = Object.values(gameSpins).filter((count) => Number(count) > 0).length;
  const missions = progress.missions.map((mission) => {
    const amount = mission.id === "spins" ? totalSpins - (progress.totalSpins - mission.progress) : mission.id === "bonus" ? totalBonuses - (progress.totalBonuses - mission.progress) : playedGames;
    return { ...mission, progress: Math.min(mission.target, Math.max(mission.progress, amount)) };
  });
  const mastery = { ...progress.mastery };
  const currentMastery = mastery[activity.game] ?? { level: 1, progress: 0, claimed: [] };
  const masteryGain = activity.type === "spin" ? 1 : activity.type === "bonus" ? 30 : activity.type === "win" && (activity.value ?? 0) >= 20 ? 10 : activity.type === "stage" || activity.type === "voyage" ? 20 : 0;
  const masteryProgress = currentMastery.progress + masteryGain;
  const masteryLevel = Math.min(10, 1 + Math.floor(masteryProgress / 100));
  if (masteryLevel > currentMastery.level) beardChips += (masteryLevel - currentMastery.level) * 25;
  mastery[activity.game] = { ...currentMastery, level: masteryLevel, progress: masteryProgress };
  const discoveredEvents = new Set(progress.discoveredEvents);
  if (activity.type === "bonus") discoveredEvents.add(`${activity.game}:feature`);
  if (activity.type === "stage" && (activity.value ?? 0) >= 3) discoveredEvents.add("megh:headliner");
  if (activity.type === "voyage" && (activity.value ?? 0) >= 4) discoveredEvents.add("neema:captains-deck");
  if (activity.type === "coin") discoveredEvents.add("beard-bank:collector");
  if (activity.type === "win" && (activity.value ?? 0) >= 100) discoveredEvents.add(`${activity.game}:100x`);
  const favoriteGame = (Object.entries(gameSpins).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] ?? "none") as CasinoProgress["favoriteGame"];
  return { ...progress, xp, beardChips, totalSpins, totalBonuses, biggestWinUnits, totalWageredUnits, totalWonUnits, biggestMultiplier, gameSpins, favoriteGame, achievements: [...achievements], missions, mastery, discoveredEvents: [...discoveredEvents] };
};
