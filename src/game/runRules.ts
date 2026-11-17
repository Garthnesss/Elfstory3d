// Pure run-level rules that App.tsx applies but must not own, so they can be
// behaviour-tested directly (the Phase 7 tests only string-matched source).

/**
 * Chance that an ordinary (non-boss, non-elite, non-rare) kill drops
 * something; ~18% of those drops are potions, the rest gear. Was 0.42 —
 * the round-2 playtest carried 20 gear pieces by Lv 4 (Nov 16, 2026).
 */
export const NORMAL_KILL_DROP_CHANCE = 0.3;

/** The last hand-authored floor of the main descent; deeper is the Abyss. */
export const LAST_STORY_FLOOR = 5;

const MAIN_FLOOR_ID = /^dungeon_(\d+)$/;

/** Depth of a main-descent / Abyss zone id (`dungeon_N`), or null otherwise. */
export function mainFloorDepth(zoneId: string): number | null {
  const m = MAIN_FLOOR_ID.exec(zoneId);
  return m ? Number(m[1]) : null;
}

/**
 * Drop stored Endless Abyss floors that are neither next to the player nor
 * the deepest one reached. Abyss floors are procedural and regenerate on
 * entry (`performZoneTransition` falls back to `generateDungeonFloor`), but
 * each costs ~12 KB packed, so an unpruned save grew past 1 MB of browser
 * storage by floor 80. Kept: every non-Abyss zone, floors within one step of
 * the current floor, and the deepest stored Abyss floor.
 *
 * Returns the same object when nothing needs dropping.
 */
export function pruneAbyssZones<Z>(
  zones: Record<string, Z>,
  currentZoneId: string
): Record<string, Z> {
  const currentDepth = mainFloorDepth(currentZoneId);
  let deepest = 0;
  for (const id of Object.keys(zones)) {
    const d = mainFloorDepth(id);
    if (d !== null && d > deepest) deepest = d;
  }
  if (deepest <= LAST_STORY_FLOOR) return zones;

  let dropped = false;
  const kept: Record<string, Z> = {};
  for (const [id, zone] of Object.entries(zones)) {
    const d = mainFloorDepth(id);
    const keep =
      d === null ||
      d <= LAST_STORY_FLOOR ||
      d === deepest ||
      id === currentZoneId ||
      (currentDepth !== null && Math.abs(d - currentDepth) <= 1);
    if (keep) kept[id] = zone;
    else dropped = true;
  }
  return dropped ? kept : zones;
}

/**
 * Whether the pause menu may offer "Return to the Ending" (which leads to
 * the NG+ ascend: full heal, fresh world). A finished run always may — except
 * a Hardcore run outside a town, where it was a one-click escape from a
 * death that is supposed to be final.
 */
export function canOfferReturnToEnding(state: {
  malakorDefeated: boolean;
  hardcore: boolean;
  inTown: boolean;
}): boolean {
  if (!state.malakorDefeated) return false;
  return !state.hardcore || state.inTown;
}

/**
 * The story boss that still guards a floor's way down, or null. Vaelen
 * (Floor 2) and Serath (Floor 4) stand beside their stairs, not on them, so
 * a player could walk straight past (Nov 14 audit; reproduced live Nov 16).
 * While one lives, the floor's stairs down stay sealed.
 */
export function bossBlockingDescent(zone: {
  isTown?: boolean;
  enemies: Array<{ isBoss?: boolean; hp: number; name: string }>;
}): string | null {
  if (zone.isTown) return null;
  const boss = zone.enemies.find((e) => e.isBoss && e.hp > 0);
  return boss ? boss.name : null;
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
