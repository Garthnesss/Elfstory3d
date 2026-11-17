// Pure run-level rules that App.tsx applies but must not own, so they can be
// behaviour-tested directly (the Phase 7 tests only string-matched source).

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
 * each costs ~12 KB packed, so an unpruned save passes the 940 KB cloud cap
 * around floor 65-70. Kept: every non-Abyss zone, floors within one step of
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
