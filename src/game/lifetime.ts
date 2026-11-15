// Lifetime stats (Phase 5 "Ascension").
//
// A per-device record of everything the player has ever done in ElfStory,
// across all runs and save slots: expeditions started, victories, deaths,
// total kills, deepest dungeon floor reached, and highest NG+ cycle
// reached. It lives OUTSIDE the save bundles (a run can be deleted without
// erasing history) in its own localStorage blob, following the settings.ts
// discipline: merge over defaults on load, corrupt data falls back to
// defaults, storage access is injectable for unit tests.

import { StorageLike } from './settings';

export interface LifetimeStats {
  expeditionsStarted: number;
  victories: number;
  deaths: number;
  totalKills: number;
  deepestFloor: number;
  highestCycle: number;
}

export const LIFETIME_KEY = 'elfstory-lifetime';

export const DEFAULT_LIFETIME: LifetimeStats = {
  expeditionsStarted: 0,
  victories: 0,
  deaths: 0,
  totalKills: 0,
  deepestFloor: 0,
  highestCycle: 0,
};

const LIFETIME_FIELDS = Object.keys(DEFAULT_LIFETIME) as Array<keyof LifetimeStats>;

function sanitizeCount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return Math.floor(value);
}

/**
 * Merge a stored (possibly partial / legacy / hostile) blob over the
 * defaults. Invalid fields fall back to their default; unknown fields are
 * ignored.
 */
export function mergeLifetime(raw: unknown): LifetimeStats {
  const out: LifetimeStats = { ...DEFAULT_LIFETIME };
  if (!raw || typeof raw !== 'object') return out;
  const source = raw as Partial<Record<keyof LifetimeStats, unknown>>;
  for (const field of LIFETIME_FIELDS) {
    const clean = sanitizeCount(source[field]);
    if (clean !== null) out[field] = clean;
  }
  return out;
}

function defaultStorage(): StorageLike | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    // storage access can throw in hardened/private contexts
  }
  return null;
}

export function loadLifetime(storage: StorageLike | null = defaultStorage()): LifetimeStats {
  if (!storage) return { ...DEFAULT_LIFETIME };
  try {
    const raw = storage.getItem(LIFETIME_KEY);
    if (!raw) return { ...DEFAULT_LIFETIME };
    return mergeLifetime(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_LIFETIME };
  }
}

export function saveLifetime(
  stats: LifetimeStats,
  storage: StorageLike | null = defaultStorage()
): void {
  if (!storage) return;
  try {
    storage.setItem(LIFETIME_KEY, JSON.stringify(stats));
  } catch {
    // the record just won't persist — never fatal
  }
}

// ------------------------------------------------------------ events

export type LifetimeEvent =
  | { kind: 'expeditionStarted' }
  | { kind: 'victory' }
  | { kind: 'death' }
  | { kind: 'kills'; count: number }
  | { kind: 'floorReached'; depth: number }
  | { kind: 'cycleReached'; cycle: number };

/**
 * Apply one real gameplay event to the record. Pure: returns a new object
 * when something changed, the same object when the event is a no-op (e.g.
 * a floor at or above the recorded deepest is never re-counted).
 */
export function applyLifetimeEvent(stats: LifetimeStats, event: LifetimeEvent): LifetimeStats {
  switch (event.kind) {
    case 'expeditionStarted':
      return { ...stats, expeditionsStarted: stats.expeditionsStarted + 1 };
    case 'victory':
      return { ...stats, victories: stats.victories + 1 };
    case 'death':
      return { ...stats, deaths: stats.deaths + 1 };
    case 'kills': {
      const count = sanitizeCount(event.count) ?? 0;
      if (count === 0) return stats;
      return { ...stats, totalKills: stats.totalKills + count };
    }
    case 'floorReached': {
      const depth = sanitizeCount(event.depth) ?? 0;
      if (depth <= stats.deepestFloor) return stats;
      return { ...stats, deepestFloor: depth };
    }
    case 'cycleReached': {
      const cycle = sanitizeCount(event.cycle) ?? 0;
      if (cycle <= stats.highestCycle) return stats;
      return { ...stats, highestCycle: cycle };
    }
  }
}

/**
 * The deepest dungeon depth implied by a set of discovered zones, using
 * the same depth conventions as the Hall of Fame chronicle: main-descent
 * floors by their zone id, side dungeons by their fixed effective depths,
 * and the current zone's own depth as a floor.
 */
export function deepestDepthForZones(discoveredZones: readonly string[], currentDepth = 0): number {
  const sideZoneDepths: Record<string, number> = {
    barrow_1: 2,
    barrow_2: 3,
    mire_1: 3,
    mire_2: 4,
    frost_1: 4,
    frost_2: 5,
    frost_3: 6,
  };
  let deepest = Math.max(0, Math.floor(currentDepth) || 0);
  for (const z of discoveredZones) {
    if (z in sideZoneDepths) {
      deepest = Math.max(deepest, sideZoneDepths[z]);
    } else if (z.startsWith('dungeon_')) {
      const d = Number(z.replace('dungeon_', ''));
      if (Number.isFinite(d)) deepest = Math.max(deepest, d);
    }
  }
  return deepest;
}
