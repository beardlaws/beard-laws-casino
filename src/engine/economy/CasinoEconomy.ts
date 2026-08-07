export interface CasinoTicket {
  readonly id: string;
  readonly valueUnits: number;
  readonly issuedAtIso: string;
  readonly redeemedAtIso: string | null;
}

export interface CasinoSessionSummary {
  readonly id: string;
  readonly startedAtIso: string;
  readonly endedAtIso: string;
  readonly startingWalletUnits: number;
  readonly atmWithdrawalsUnits: number;
  readonly atmFeesUnits: number;
  readonly totalWageredUnits: number;
  readonly totalWonUnits: number;
  readonly endingWalletUnits: number;
  readonly resultUnits: number;
  readonly spins: number;
  readonly features: number;
  readonly biggestWinUnits: number;
  readonly favoriteGame: string;
}

export interface ActiveCasinoSession {
  readonly id: string;
  readonly startedAtIso: string;
  readonly startingWalletUnits: number;
  readonly atmWithdrawalsUnits: number;
  readonly atmFeesUnits: number;
  readonly totalWageredUnits: number;
  readonly totalWonUnits: number;
  readonly spins: number;
  readonly features: number;
  readonly biggestWinUnits: number;
  readonly gameSpins: Readonly<Record<string, number>>;
}

export interface CasinoEconomyState {
  readonly checkingUnits: number;
  readonly savingsUnits: number;
  readonly lifetimeAtmFeesUnits: number;
  readonly activeSession: ActiveCasinoSession | null;
  readonly tickets: readonly CasinoTicket[];
  readonly sessions: readonly CasinoSessionSummary[];
}

export type CashoutDestination = "checking" | "savings" | "ticket";

const clampUnits = (value: unknown): number => {
  const amount = Math.round(Number(value ?? 0));
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
};

const id = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const freshCasinoEconomy = (): CasinoEconomyState => ({
  checkingUnits: 100_000,
  savingsUnits: 0,
  lifetimeAtmFeesUnits: 0,
  activeSession: null,
  tickets: [],
  sessions: [],
});

export const normalizeCasinoEconomy = (
  value: Partial<CasinoEconomyState> | null | undefined,
): CasinoEconomyState => {
  const base = freshCasinoEconomy();
  const tickets = Array.isArray(value?.tickets)
    ? value!.tickets.slice(0, 100).map((ticket) => ({
        id: String(ticket.id || id("BLT")),
        valueUnits: clampUnits(ticket.valueUnits),
        issuedAtIso: String(ticket.issuedAtIso || new Date().toISOString()),
        redeemedAtIso: ticket.redeemedAtIso ? String(ticket.redeemedAtIso) : null,
      }))
    : [];
  const sessions = Array.isArray(value?.sessions)
    ? value!.sessions.slice(-50).map((session) => ({
        ...session,
        id: String(session.id || id("BLS")),
        startedAtIso: String(session.startedAtIso || new Date().toISOString()),
        endedAtIso: String(session.endedAtIso || new Date().toISOString()),
        startingWalletUnits: clampUnits(session.startingWalletUnits),
        atmWithdrawalsUnits: clampUnits(session.atmWithdrawalsUnits),
        atmFeesUnits: clampUnits(session.atmFeesUnits),
        totalWageredUnits: clampUnits(session.totalWageredUnits),
        totalWonUnits: clampUnits(session.totalWonUnits),
        endingWalletUnits: clampUnits(session.endingWalletUnits),
        resultUnits: Math.round(Number(session.resultUnits ?? 0)) || 0,
        spins: clampUnits(session.spins),
        features: clampUnits(session.features),
        biggestWinUnits: clampUnits(session.biggestWinUnits),
        favoriteGame: String(session.favoriteGame || "none"),
      }))
    : [];
  const active = value?.activeSession;
  const activeSession: ActiveCasinoSession | null = active
    ? {
        id: String(active.id || id("BLS")),
        startedAtIso: String(active.startedAtIso || new Date().toISOString()),
        startingWalletUnits: clampUnits(active.startingWalletUnits),
        atmWithdrawalsUnits: clampUnits(active.atmWithdrawalsUnits),
        atmFeesUnits: clampUnits(active.atmFeesUnits),
        totalWageredUnits: clampUnits(active.totalWageredUnits),
        totalWonUnits: clampUnits(active.totalWonUnits),
        spins: clampUnits(active.spins),
        features: clampUnits(active.features),
        biggestWinUnits: clampUnits(active.biggestWinUnits),
        gameSpins: typeof active.gameSpins === "object" && active.gameSpins
          ? Object.fromEntries(Object.entries(active.gameSpins).map(([key, count]) => [key, clampUnits(count)]))
          : {},
      }
    : null;
  return {
    checkingUnits: clampUnits(value?.checkingUnits ?? base.checkingUnits),
    savingsUnits: clampUnits(value?.savingsUnits ?? base.savingsUnits),
    lifetimeAtmFeesUnits: clampUnits(value?.lifetimeAtmFeesUnits),
    activeSession,
    tickets,
    sessions,
  };
};

export const ensureCasinoSession = (
  state: CasinoEconomyState,
  walletUnits: number,
  now = new Date(),
): CasinoEconomyState => state.activeSession ? state : {
  ...state,
  activeSession: {
    id: id("BLS"),
    startedAtIso: now.toISOString(),
    startingWalletUnits: clampUnits(walletUnits),
    atmWithdrawalsUnits: 0,
    atmFeesUnits: 0,
    totalWageredUnits: 0,
    totalWonUnits: 0,
    spins: 0,
    features: 0,
    biggestWinUnits: 0,
    gameSpins: {},
  },
};

export interface AtmWithdrawalResult {
  readonly state: CasinoEconomyState;
  readonly walletUnits: number;
  readonly feeUnits: number;
}

export const withdrawFromChecking = (
  state: CasinoEconomyState,
  walletUnits: number,
  amountUnits: number,
  feeUnits = 399,
): AtmWithdrawalResult => {
  const amount = clampUnits(amountUnits);
  const fee = amount > 0 ? clampUnits(feeUnits) : 0;
  if (amount <= 0) throw new RangeError("ATM withdrawal must be greater than zero.");
  if (state.checkingUnits < amount + fee) throw new RangeError("Insufficient Beard Laws Bank checking balance.");
  const withSession = ensureCasinoSession(state, walletUnits);
  return {
    walletUnits: clampUnits(walletUnits) + amount,
    feeUnits: fee,
    state: {
      ...withSession,
      checkingUnits: withSession.checkingUnits - amount - fee,
      lifetimeAtmFeesUnits: withSession.lifetimeAtmFeesUnits + fee,
      activeSession: withSession.activeSession ? {
        ...withSession.activeSession,
        atmWithdrawalsUnits: withSession.activeSession.atmWithdrawalsUnits + amount,
        atmFeesUnits: withSession.activeSession.atmFeesUnits + fee,
      } : null,
    },
  };
};

export const recordEconomyActivity = (
  state: CasinoEconomyState,
  walletUnits: number,
  activity: { readonly type: string; readonly game: string; readonly wager?: number; readonly amount?: number },
): CasinoEconomyState => {
  const withSession = ensureCasinoSession(state, walletUnits);
  const session = withSession.activeSession!;
  const isSpin = activity.type === "spin";
  const isFeature = activity.type === "bonus";
  const win = activity.type === "win" ? clampUnits(activity.amount) : 0;
  const wager = isSpin ? clampUnits(activity.wager) : 0;
  const gameSpins = isSpin
    ? { ...session.gameSpins, [activity.game]: (session.gameSpins[activity.game] ?? 0) + 1 }
    : session.gameSpins;
  return {
    ...withSession,
    activeSession: {
      ...session,
      totalWageredUnits: session.totalWageredUnits + wager,
      totalWonUnits: session.totalWonUnits + win,
      spins: session.spins + (isSpin ? 1 : 0),
      features: session.features + (isFeature ? 1 : 0),
      biggestWinUnits: Math.max(session.biggestWinUnits, win),
      gameSpins,
    },
  };
};

export interface CashoutResult {
  readonly state: CasinoEconomyState;
  readonly walletUnits: number;
  readonly ticket?: CasinoTicket;
  readonly summary?: CasinoSessionSummary;
}

export const cashOutCasinoWallet = (
  state: CasinoEconomyState,
  walletUnits: number,
  destination: CashoutDestination,
  now = new Date(),
): CashoutResult => {
  const amount = clampUnits(walletUnits);
  const sessionState = ensureCasinoSession(state, amount);
  const active = sessionState.activeSession!;
  const favoriteGame = Object.entries(active.gameSpins).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "none";
  const resultUnits = amount - active.startingWalletUnits - active.atmWithdrawalsUnits - active.atmFeesUnits;
  const summary: CasinoSessionSummary = {
    id: active.id,
    startedAtIso: active.startedAtIso,
    endedAtIso: now.toISOString(),
    startingWalletUnits: active.startingWalletUnits,
    atmWithdrawalsUnits: active.atmWithdrawalsUnits,
    atmFeesUnits: active.atmFeesUnits,
    totalWageredUnits: active.totalWageredUnits,
    totalWonUnits: active.totalWonUnits,
    endingWalletUnits: amount,
    resultUnits,
    spins: active.spins,
    features: active.features,
    biggestWinUnits: active.biggestWinUnits,
    favoriteGame,
  };
  let ticket: CasinoTicket | undefined;
  let checkingUnits = sessionState.checkingUnits;
  let savingsUnits = sessionState.savingsUnits;
  let tickets = [...sessionState.tickets];
  if (destination === "checking") checkingUnits += amount;
  if (destination === "savings") savingsUnits += amount;
  if (destination === "ticket") {
    ticket = { id: id("BLT"), valueUnits: amount, issuedAtIso: now.toISOString(), redeemedAtIso: null };
    tickets = [ticket, ...tickets].slice(0, 100);
  }
  const result: CashoutResult = {
    walletUnits: 0,
    summary,
    state: {
      ...sessionState,
      checkingUnits,
      savingsUnits,
      tickets,
      activeSession: null,
      sessions: [...sessionState.sessions, summary].slice(-50),
    },
    ...(ticket ? { ticket } : {}),
  };
  return result;
};

export const redeemCasinoTicket = (
  state: CasinoEconomyState,
  ticketId: string,
  destination: "checking" | "savings",
  now = new Date(),
): CasinoEconomyState => {
  const ticket = state.tickets.find((item) => item.id === ticketId);
  if (!ticket) throw new Error("Ticket not found.");
  if (ticket.redeemedAtIso) throw new Error("Ticket has already been redeemed.");
  return {
    ...state,
    checkingUnits: destination === "checking" ? state.checkingUnits + ticket.valueUnits : state.checkingUnits,
    savingsUnits: destination === "savings" ? state.savingsUnits + ticket.valueUnits : state.savingsUnits,
    tickets: state.tickets.map((item) => item.id === ticketId ? { ...item, redeemedAtIso: now.toISOString() } : item),
  };
};
