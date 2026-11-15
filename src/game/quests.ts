import { QUEST_DEFS } from './npcs';
import { QuestProgress, WorldFlags } from './types';

// Quest "what do I do next" derivation. This logic originally lived inside
// QuestJournalModal; it moved here (Phase 2) so the HUD quest tracker and
// the journal always agree on the current objective.

export const MAIN_QUEST_ID = 'sovereign_cinder';

/** Stage-aware "Next:" guidance for one quest (verbatim journal wording). */
export function getQuestNextHint(q: QuestProgress, worldFlags: WorldFlags): string {
  if (q.id === 'shadows_beneath') {
    if (q.stage >= 2) return 'Next: Deliver the Sealed Contraband Ledger to Warden Vance or Smuggler Vex in Oakhaven.';
    return 'Next: Descend to Sunken Reliquary Floor 1 and locate the glowing Smuggler Cache (▤).';
  }
  if (q.id === 'herbalist_blight') {
    if (q.stage >= 2) return 'Next: Return to Herbalist Mira in Oakhaven with the cure or peace pact.';
    return 'Next: Gather Pale Nightbloom (✿) on Floors 1–2, or commune with the Bone Cantor.';
  }
  if (q.id === 'whispering_bell') {
    if (q.stage >= 2) return 'Next: Bring the Whispering Bell to Archivist Lyra or Corvus in Highspire Citadel.';
    return 'Next: Reach Ember Vaults (Floor 3) and recover the Whispering Bell (⍾).';
  }
  if (q.id === 'sovereign_cinder') {
    if (worldFlags.malakorWeakened) {
      return 'Malakor’s ward is weakened! Descend to Floor 5 (Obsidian Sanctum) and end his reign.';
    }
    return 'Next: Fight down to Floor 5 — Obsidian Sanctum — and defeat Malakor, Sovereign of Cinder.';
  }
  if (q.id === 'outrider_oath') {
    const attuned = worldFlags.waystonesAttuned ?? 0;
    if (q.stage >= 3 || attuned >= 2) {
      return 'Next: Return to Archivist Lyra in Highspire Citadel to claim your Starlight Outrider Relic.';
    }
    return `Next: Attune Elven Waystones (◈) found in Silverwood Vale and dungeon chambers (${Math.min(2, attuned)}/2 attuned).`;
  }
  if (q.id === 'silverwood_road') {
    if (q.stage >= 2) return 'Next: Return Rowan’s Stolen Satchel to Rowan at Silverbridge Camp in Silverwood Vale.';
    return 'Next: Cross Silverbridge in Silverwood Vale (Overworld) and loot the Brigand Tollhouse Chest ($).';
  }
  if (q.id === 'spores_of_bog') {
    if (q.stage >= 2 || worldFlags.mireBossDefeated) {
      return 'Next: Deliver the Bioluminescent Fungal Heart to Elder Sylva in Thornwick Fen.';
    }
    return 'Next: Enter Fungal Hollow (2 floors) east of Thornwick Fen and slay Spore-Matron Vexis.';
  }
  if (q.id === 'barrow_purge') {
    if (q.stage >= 2 || worldFlags.barrowBossDefeated) {
      return 'Next: Present Morvath’s Barrow Seal to Captain Darek in Cinderwatch Bastion.';
    }
    return 'Next: Descend Whispering Barrow (2 floors) in northern Silverwood Vale and defeat Arch-Wight Morvath.';
  }
  if (q.id === 'cinder_and_frost') {
    if (q.stage >= 2 || worldFlags.frostBossDefeated) {
      return 'Next: Return the Ashen Ore Heart to Forgemistress Halda in Cinderwatch Bastion.';
    }
    return 'Next: Conquer Frostpeak & Ashen Caldera (3 floors) northeast of Cinderwatch and slay Ignis-Warden Kaelthar.';
  }
  if (q.id === 'deep_survey') {
    const read = Math.min(6, worldFlags.readLoreIds.length);
    if (q.stage >= 6 || read >= 6) {
      return 'Next: Report your completed survey to Rowan at Silverbridge Camp in Silverwood Vale.';
    }
    return `Next: Transcribe carved steles (‡) in towns, the Vale, and the vaults (${read}/6 read).`;
  }
  return 'Follow leads across Oakhaven, Silverwood Vale, Thornwick Fen, Cinderwatch, and Highspire.';
}

export interface TrackedObjective {
  questId: string;
  title: string;
  /** Hint text with any leading "Next:" prefix stripped (the tracker adds its own marker). */
  hint: string;
  isMain: boolean;
}

export interface TrackedObjectives {
  main: TrackedObjective | null;
  side: TrackedObjective | null;
  /** How many further active side quests exist beyond the tracked one. */
  extraSideCount: number;
}

function stripNextPrefix(hint: string): string {
  return hint.replace(/^Next:\s*/, '');
}

function toObjective(q: QuestProgress, worldFlags: WorldFlags, isMain: boolean): TrackedObjective {
  return {
    questId: q.id,
    title: QUEST_DEFS[q.id]?.title ?? q.id,
    hint: stripNextPrefix(getQuestNextHint(q, worldFlags)),
    isMain,
  };
}

/**
 * Derive the HUD tracker contents from quest state:
 * - main: the Sovereign of Cinder quest while active. If the run has not
 *   picked it up yet (no record at all) the tracker points at its giver so
 *   a fresh player always has a pinned objective; once completed (or
 *   Malakor is dead) it disappears.
 * - side: the earliest-defined active side quest (QUEST_DEFS order keeps
 *   this deterministic), with a count of any others.
 */
export function deriveTrackedObjectives(
  quests: Record<string, QuestProgress>,
  worldFlags: WorldFlags
): TrackedObjectives {
  let main: TrackedObjective | null = null;
  const mainQuest = quests[MAIN_QUEST_ID];
  if (mainQuest && mainQuest.status === 'active') {
    main = toObjective(mainQuest, worldFlags, true);
  } else if (!mainQuest && !worldFlags.malakorDefeated) {
    main = {
      questId: MAIN_QUEST_ID,
      title: QUEST_DEFS[MAIN_QUEST_ID]?.title ?? 'The Sovereign of Cinder',
      hint: 'Speak with Warden Vance in Oakhaven Outpost to take up the descent.',
      isMain: true,
    };
  }

  const sideActive = Object.keys(QUEST_DEFS)
    .filter((id) => id !== MAIN_QUEST_ID)
    .map((id) => quests[id])
    .filter((q): q is QuestProgress => Boolean(q) && q.status === 'active');

  const side = sideActive.length > 0 ? toObjective(sideActive[0], worldFlags, false) : null;

  return { main, side, extraSideCount: Math.max(0, sideActive.length - 1) };
}
