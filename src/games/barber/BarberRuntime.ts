import type { SpinOutcome } from "../../engine/contracts/SpinOutcome";
import type { FeatureExecutionPlan, FeatureExecutionStep } from "../../engine/contracts/FeatureExecution";

export interface BarberBuilderUpgrade {
  readonly reel: number;
  readonly fromLevel: number;
  readonly toLevel: number;
}

export interface BarberAttackPlan {
  readonly targetReel: number;
  readonly fortressLevel: number;
  readonly multiplier: number;
  readonly awardUnits: number;
}

export interface BarberRuntimeDecision {
  readonly builderUpgrades: readonly BarberBuilderUpgrade[];
  readonly triggerShaveDown: boolean;
  readonly attack: BarberAttackPlan | null;
  readonly message: string;
  readonly fortressLevelsAfter: readonly number[];
}

export interface ResolveBarberRuntimeInput {
  readonly fortressLevels: readonly number[];
  readonly builderCounts: readonly number[];
  readonly maxLevel: number;
  readonly fortressMultipliers: readonly number[];
  readonly razorCount: number;
  readonly baseWinUnits: number;
  readonly isBonusSpin: boolean;
  readonly wagerUnits: number;
  readonly attackChance: number;
  /** 0 <= value < 1. Used only when an attack roll is required. */
  readonly attackRoll: number;
  /** 0 <= value < 1. Used only when an attack target is required. */
  readonly targetRoll: number;
  /** Multiplies the displayed fortress multiplier into a production payout. */
  readonly fortressAwardScale?: number;
}

export function resolveBarberRuntime(input: ResolveBarberRuntimeInput): BarberRuntimeDecision {
  const levels = [...input.fortressLevels];
  const upgrades: BarberBuilderUpgrade[] = [];

  input.builderCounts.forEach((count, reel) => {
    for (let index = 0; index < Math.max(0, Math.floor(count)); index += 1) {
      const current = levels[reel] ?? 0;
      if (current >= input.maxLevel) break;
      const next = current + 1;
      upgrades.push({ reel, fromLevel: current, toLevel: next });
      levels[reel] = next;
    }
  });

  const triggerShaveDown = input.razorCount >= 3 && !input.isBonusSpin;
  let attack: BarberAttackPlan | null = null;

  const canAttack = upgrades.length === 0
    && input.baseWinUnits <= 0
    && levels.some((level) => level > 0)
    && !triggerShaveDown
    && (input.isBonusSpin || input.attackRoll < input.attackChance);

  if (canAttack) {
    const built = levels
      .map((level, reel) => ({ level, reel }))
      .filter((entry) => entry.level > 0);
    const targetIndex = Math.min(
      built.length - 1,
      Math.floor(Math.max(0, Math.min(0.999999, input.targetRoll)) * built.length),
    );
    const target = built[targetIndex]!;
    const multiplier = input.fortressMultipliers[target.level] ?? 0;
    attack = {
      targetReel: target.reel,
      fortressLevel: target.level,
      multiplier,
      awardUnits: Math.max(0, Math.round(input.wagerUnits * multiplier * (input.fortressAwardScale ?? 1))),
    };
    levels[target.reel] = 0;
  }

  const message = upgrades.length > 0
    ? "FORTRESSES UPGRADED • KEEP BUILDING"
    : triggerShaveDown
      ? "THE SHAVE DOWN IS COMING!"
      : attack
        ? `THE BIG BAD BARBER TARGETS FORTRESS ${attack.targetReel + 1}!`
        : input.razorCount === 2
          ? "ONE MORE RAZOR FOR THE SHAVE DOWN"
          : input.isBonusSpin
            ? "SHAVE DOWN CONTINUES"
            : "THE BARBER IS STILL OUT THERE…";

  return {
    builderUpgrades: Object.freeze(upgrades.map((upgrade) => Object.freeze({ ...upgrade }))),
    triggerShaveDown,
    attack: attack ? Object.freeze({ ...attack }) : null,
    message,
    fortressLevelsAfter: Object.freeze(levels),
  };
}

export interface CreateBarberOutcomeInput {
  readonly id: string;
  readonly startedAtIso: string;
  readonly completedAtIso: string;
  readonly wagerUnits: number;
  readonly baseWinUnits: number;
  readonly resultGrid: readonly (readonly string[])[];
  readonly winnerKeys: readonly string[];
  readonly razorCount: number;
  readonly isBonusSpin: boolean;
  readonly fortressLevelsBefore: readonly number[];
  readonly decision: BarberRuntimeDecision;
}

export function createBarberSpinOutcome(input: CreateBarberOutcomeInput): SpinOutcome {
  const featureWinUnits = input.decision.attack?.awardUnits ?? 0;
  const totalWinUnits = input.baseWinUnits + featureWinUnits;
  const features = [] as Array<{ id: string; value?: number; amountUnits?: number }>;
  if (input.decision.triggerShaveDown) features.push({ id: "barber-shave-down" });
  if (input.decision.attack) {
    features.push({
      id: "barber-attack",
      value: input.decision.attack.fortressLevel,
      amountUnits: input.decision.attack.awardUnits,
    });
  }

  return Object.freeze({
    schemaVersion: 1,
    id: input.id,
    game: "barber",
    startedAtIso: input.startedAtIso,
    completedAtIso: input.completedAtIso,
    wagerUnits: input.wagerUnits,
    baseWinUnits: input.baseWinUnits,
    featureWinUnits,
    totalWinUnits,
    winMultiplier: input.wagerUnits > 0 ? totalWinUnits / input.wagerUnits : 0,
    features: Object.freeze(features.map((feature) => Object.freeze(feature))),
    progression: Object.freeze(input.decision.builderUpgrades.map((upgrade) => Object.freeze({
      kind: "custom" as const,
      value: upgrade.toLevel,
    }))),
    presentation: Object.freeze([]),
    resultGrid: Object.freeze(input.resultGrid.map((row) => Object.freeze([...row]))),
    metadata: Object.freeze({
      runtime: "project-beard-m5",
      isBonusSpin: input.isBonusSpin,
      razorCount: input.razorCount,
      winnerKeys: [...input.winnerKeys],
      fortressLevelsBefore: [...input.fortressLevelsBefore],
      fortressLevelsAfter: [...input.decision.fortressLevelsAfter],
      builderUpgrades: input.decision.builderUpgrades.map((upgrade) => ({ ...upgrade })),
      attack: input.decision.attack ? { ...input.decision.attack } : null,
      message: input.decision.message,
    }),
  });
}

export function createBarberFeaturePlan(outcome: SpinOutcome): FeatureExecutionPlan {
  const metadata = outcome.metadata;
  const upgrades = Array.isArray(metadata.builderUpgrades)
    ? metadata.builderUpgrades as Array<{ reel: number; fromLevel: number; toLevel: number }>
    : [];
  const attack = metadata.attack && typeof metadata.attack === "object"
    ? metadata.attack as { targetReel: number; fortressLevel: number; multiplier: number; awardUnits: number }
    : null;
  const steps: FeatureExecutionStep[] = [];
  let order = 0;

  for (const upgrade of upgrades) {
    steps.push({
      id: `${outcome.id}-builder-${order}`,
      kind: "progression",
      game: "barber",
      order: order++,
      delayMs: 0,
      label: "barber-builder-upgrade",
      payload: Object.freeze({ ...upgrade }),
    });
  }

  if (upgrades.length > 0) {
    steps.push({
      id: `${outcome.id}-upgrade-message-${order}`,
      kind: "presentation",
      game: "barber",
      order: order++,
      delayMs: 0,
      label: "barber-message",
      payload: Object.freeze({ message: "FORTRESSES UPGRADED • KEEP BUILDING" }),
    });
  }

  if (outcome.features.some((feature) => feature.id === "barber-shave-down")) {
    steps.push({
      id: `${outcome.id}-shave-down-${order}`,
      kind: "feature",
      game: "barber",
      order: order++,
      delayMs: 0,
      label: "barber-shave-down",
      payload: Object.freeze({ spins: 8 }),
    });
  } else if (attack) {
    steps.push({
      id: `${outcome.id}-attack-${order}`,
      kind: "feature",
      game: "barber",
      order: order++,
      delayMs: 0,
      label: "barber-attack",
      payload: Object.freeze({ ...attack }),
    });
  }

  if (outcome.baseWinUnits > 0) {
    steps.push({
      id: `${outcome.id}-payout-${order}`,
      kind: "payout",
      game: "barber",
      order: order++,
      delayMs: 0,
      label: "barber-base-payout",
      payload: Object.freeze({
        amountUnits: outcome.baseWinUnits,
        winnerKeys: Array.isArray(metadata.winnerKeys) ? metadata.winnerKeys : [],
      }),
    });
  }

  if (steps.length === 0) {
    steps.push({
      id: `${outcome.id}-message-${order}`,
      kind: "presentation",
      game: "barber",
      order: order++,
      delayMs: 0,
      label: "barber-message",
      payload: Object.freeze({ message: String(metadata.message ?? "THE BARBER IS STILL OUT THERE…") }),
    });
  }

  steps.push({
    id: `${outcome.id}-complete-${order}`,
    kind: "complete",
    game: "barber",
    order,
    delayMs: 0,
    label: "ready",
    payload: Object.freeze({ outcomeId: outcome.id }),
  });

  return Object.freeze({
    schemaVersion: 1,
    id: `barber-plan-${outcome.id}`,
    spinOutcomeId: outcome.id,
    game: "barber",
    createdAtIso: new Date().toISOString(),
    steps: Object.freeze(steps.map((step) => Object.freeze(step))),
  });
}
