export type CasinoGameId = "beard-bank" | "neema" | "megh" | "blackjack" | "roulette" | "free-drop";

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

export interface CasinoProgress {
  readonly xp: number;
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
  readonly missions: readonly MissionProgress[];
}

const dayKey = (date = new Date()): string => date.toISOString().slice(0, 10);
const previousDayKey = (): string => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return dayKey(date);
};

const missionSet = (): MissionProgress[] => [
  { id: "spins", label: "SPIN ANY SLOT 25 TIMES", target: 25, progress: 0, reward: 500, claimed: false },
  { id: "bonus", label: "TRIGGER ONE FEATURE", target: 1, progress: 0, reward: 750, claimed: false },
  { id: "explore", label: "PLAY TWO DIFFERENT GAMES", target: 2, progress: 0, reward: 500, claimed: false },
];

export const freshCasinoProgress = (): CasinoProgress => ({
  xp: 0,
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
  missions: missionSet(),
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
    missions: sameDay && value?.missions?.length ? value.missions.map((m) => ({ ...m })) : missionSet(),
  };
};

export const rankForXp = (xp: number): { name: string; level: number; next: number } => {
  const ranks = [
    ["FIVE O'CLOCK SHADOW", 0], ["SCRUFFY REGULAR", 500], ["FULL BEARD", 1500],
    ["LEGENDARY BEARD", 3500], ["VAULTMASTER", 7000],
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
  let totalWageredUnits = progress.totalWageredUnits;
  let totalWonUnits = progress.totalWonUnits;
  let biggestMultiplier = progress.biggestMultiplier;
  const achievements = new Set(progress.achievements);
  if (activity.type === "spin") {
    totalSpins += 1; xp += 10;
    totalWageredUnits += Math.max(0, activity.wager ?? 0);
    gameSpins[activity.game] = (gameSpins[activity.game] ?? 0) + 1;
    if (totalSpins >= 1) achievements.add("FIRST SPIN");
    if (totalSpins >= 100) achievements.add("CENTURY CLUB");
  }
  if (activity.type === "bonus") { totalBonuses += 1; xp += 100; achievements.add(`FIRST ${activity.game.toUpperCase()} FEATURE`); }
  if (activity.type === "win") {
    biggestWinUnits = Math.max(biggestWinUnits, activity.amount ?? 0);
    totalWonUnits += Math.max(0, activity.amount ?? 0);
    biggestMultiplier = Math.max(biggestMultiplier, activity.value ?? 0);
    if ((activity.value ?? 0) >= 50) achievements.add("50× CLUB");
  }
  if (activity.type === "coin" && (activity.value ?? 0) >= 1) achievements.add("VAULT COLLECTOR");
  if (activity.type === "stage" && (activity.value ?? 0) >= 3) achievements.add("COSMIC HEADLINER");
  if (activity.type === "voyage" && (activity.value ?? 0) >= 4) achievements.add("CAPTAIN'S DECK");
  const playedGames = Object.values(gameSpins).filter((count) => Number(count) > 0).length;
  const missions = progress.missions.map((mission) => {
    const amount = mission.id === "spins" ? totalSpins - (progress.totalSpins - mission.progress) : mission.id === "bonus" ? totalBonuses - (progress.totalBonuses - mission.progress) : playedGames;
    return { ...mission, progress: Math.min(mission.target, Math.max(mission.progress, amount)) };
  });
  const favoriteGame = (Object.entries(gameSpins).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] ?? "none") as CasinoProgress["favoriteGame"];
  return { ...progress, xp, totalSpins, totalBonuses, biggestWinUnits, totalWageredUnits, totalWonUnits, biggestMultiplier, gameSpins, favoriteGame, achievements: [...achievements], missions };
};
