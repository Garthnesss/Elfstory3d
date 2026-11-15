// Difficulty tiers (Phase 4 "polish & hardening").
//
// Difficulty is a PER-RUN choice: it is picked on the New Adventure flow,
// stored inside the save bundle (not in the per-device settings blob), and
// can be changed mid-run from the Settings modal. Changing it only affects
// enemies spawned afterwards — zones already generated keep the stats their
// enemies were created with.
//
// The P1 tuning constants in world.ts (createEnemy bases, story boss stats,
// SIDE_BOSS_TUNE) and the ×1.30 XP curve are the STANDARD tier, untouched.
// Tiers layer multipliers on top at enemy creation / XP grant time; at
// Standard every multiplier is exactly 1.0, so Standard play is bit-for-bit
// the P1 game.
//
// world.ts cannot receive the tier as an argument (zone generation is
// called from many places, and createEnemy's signature is load-bearing in
// tests and generators), so the active tier lives in this module as a
// single source of truth. App.tsx sets it whenever a run starts, loads, or
// the player changes it in Settings — always BEFORE any new zone is
// generated.

import { Enemy } from './types';

export type DifficultyTier = 'story' | 'standard' | 'hardened';

export const DEFAULT_DIFFICULTY: DifficultyTier = 'standard';

export interface DifficultyMultipliers {
  /** Multiplier on enemy max HP (and current HP) at creation. */
  enemyHp: number;
  /** Multiplier on enemy attack at creation. */
  enemyAtk: number;
  /** Multiplier on XP granted by the XP grant function. */
  xp: number;
}

export const DIFFICULTY_MULTIPLIERS: Record<DifficultyTier, DifficultyMultipliers> = {
  story: { enemyHp: 0.75, enemyAtk: 0.85, xp: 1.15 },
  standard: { enemyHp: 1.0, enemyAtk: 1.0, xp: 1.0 },
  hardened: { enemyHp: 1.25, enemyAtk: 1.15, xp: 1.1 },
};

export const DIFFICULTY_INFO: Record<
  DifficultyTier,
  { label: string; blurb: string }
> = {
  story: {
    label: 'Story',
    blurb: 'Foes are frailer and strike softer; XP flows 15% faster. For the tale, not the trial.',
  },
  standard: {
    label: 'Standard',
    blurb: 'The descent as tuned — every foe at full strength, XP as earned.',
  },
  hardened: {
    label: 'Hardened',
    blurb: 'Foes are tougher and hit harder; XP flows 10% faster as compensation.',
  },
};

export const DIFFICULTY_ORDER: DifficultyTier[] = ['story', 'standard', 'hardened'];

export function isDifficultyTier(value: unknown): value is DifficultyTier {
  return value === 'story' || value === 'standard' || value === 'hardened';
}

/** Anything unrecognized (including a legacy save's missing field) is Standard. */
export function normalizeDifficulty(value: unknown): DifficultyTier {
  return isDifficultyTier(value) ? value : DEFAULT_DIFFICULTY;
}

// ------------------------------------------------------------ active tier

let currentDifficulty: DifficultyTier = DEFAULT_DIFFICULTY;

export function setCurrentDifficulty(tier: DifficultyTier): void {
  currentDifficulty = tier;
}

export function getCurrentDifficulty(): DifficultyTier {
  return currentDifficulty;
}

// ------------------------------------------- NG+ ascension cycles (Phase 5)
//
// After a victory the player may ascend: the world is rebuilt fresh while
// the character carries over, and every cycle makes the remade world
// stronger — HP ×(1 + 0.35·cycle), ATK ×(1 + 0.25·cycle), XP ×(1 + 0.20·cycle).
// Cycle scaling composes MULTIPLICATIVELY with the difficulty tier inside
// the same two funnels below (scaleEnemyForDifficulty / scaleXpForDifficulty),
// so there is still exactly one scaling application point. At cycle 0 every
// factor is exactly 1 and the game is bit-for-bit the Phase 4 game.

/** Normalize an arbitrary stored value into a valid cycle count. */
export function normalizeCycle(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

/** The ascension multipliers for a given NG+ cycle (cycle 0 = all 1.0). */
export function cycleMultipliers(cycle: number): DifficultyMultipliers {
  const c = normalizeCycle(cycle);
  return {
    enemyHp: 1 + 0.35 * c,
    enemyAtk: 1 + 0.25 * c,
    xp: 1 + 0.2 * c,
  };
}

let currentCycle = 0;

export function setCurrentCycle(cycle: number): void {
  currentCycle = normalizeCycle(cycle);
}

export function getCurrentCycle(): number {
  return currentCycle;
}

// ------------------------------------------------------------ scaling

/**
 * Apply the active difficulty tier AND NG+ cycle multipliers to a freshly
 * created enemy. This is the single helper every spawn path funnels
 * through (createEnemy calls it, so regular spawns, story bosses, elites,
 * side bosses and Abyss spawns are all covered; rank promotion and
 * side-boss tuning multiply on top of the already-scaled base). At
 * Standard + cycle 0 the enemy is returned unchanged.
 */
export function scaleEnemyForDifficulty(
  enemy: Enemy,
  tier: DifficultyTier = currentDifficulty,
  cycle: number = currentCycle
): Enemy {
  const tierMult = DIFFICULTY_MULTIPLIERS[tier];
  const cycleMult = cycleMultipliers(cycle);
  const hpMult = tierMult.enemyHp * cycleMult.enemyHp;
  const atkMult = tierMult.enemyAtk * cycleMult.enemyAtk;
  if (hpMult === 1 && atkMult === 1) return enemy;
  const maxHp = Math.max(1, Math.round(enemy.maxHp * hpMult));
  return {
    ...enemy,
    maxHp,
    hp: Math.max(1, Math.round(enemy.hp * hpMult)),
    atk: Math.max(1, Math.round(enemy.atk * atkMult)),
  };
}

/** Apply the tier × cycle XP multipliers inside the XP grant function. */
export function scaleXpForDifficulty(
  xp: number,
  tier: DifficultyTier = currentDifficulty,
  cycle: number = currentCycle
): number {
  const mult = DIFFICULTY_MULTIPLIERS[tier].xp * cycleMultipliers(cycle).xp;
  if (mult === 1) return xp;
  return Math.round(xp * mult);
}
