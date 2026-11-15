// Contextual coach-marks (Phase 6 "reach & refinement").
//
// Three one-time hints at first-time moments the Phase 2 tutorial could
// not anticipate: the first telegraphed heavy strike, the first new
// inscription gained, and the first Prodigy point earned. Each fires at
// most once per device, gated by its own localStorage flag — the same
// per-device pattern as the tutorial's `elfstory-tutorial-done` key
// (see game/settings.ts). The claim logic is pure and storage-injectable
// so the fire-once behaviour is unit-testable; App.tsx claims a mark at
// the real event point and renders it as a log line + a brief toast.

import type { StorageLike } from './settings';

export type CoachMarkId = 'telegraph' | 'inscription' | 'prodigy';

export interface CoachMark {
  id: CoachMarkId;
  title: string;
  body: string;
}

export const COACH_MARKS: Record<CoachMarkId, CoachMark> = {
  telegraph: {
    id: 'telegraph',
    title: 'Telegraphed Strike!',
    body: 'Step off the marked tile or brace — telegraphed strikes land hard.',
  },
  inscription: {
    id: 'inscription',
    title: 'A New Rune!',
    body: 'You gained a new Inscription. Open your Pack [I] to inscribe it into a rune slot (keys 6–8), or swap it for one you already carry.',
  },
  prodigy: {
    id: 'prodigy',
    title: 'Milestone Prodigy!',
    body: 'You earned a Prodigy Point. Open Skills [K] → Milestone Prodigies to choose a permanent capstone for this run.',
  },
};

export const COACH_MARK_KEYS: Record<CoachMarkId, string> = {
  telegraph: 'elfstory-coach-telegraph',
  inscription: 'elfstory-coach-inscription',
  prodigy: 'elfstory-coach-prodigy',
};

function defaultStorage(): StorageLike | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    // storage access can throw in hardened/private contexts
  }
  return null;
}

/** Whether this mark has already been shown on this device. With no
 *  storage available the answer is "seen" — never nag. */
export function coachMarkSeen(
  id: CoachMarkId,
  storage: StorageLike | null = defaultStorage()
): boolean {
  if (!storage) return true;
  try {
    return storage.getItem(COACH_MARK_KEYS[id]) === '1';
  } catch {
    return true;
  }
}

/**
 * Claim a coach-mark for display: returns true exactly once per device
 * (the first call), recording the flag as a side effect; every later call
 * returns false. Safe to call from anywhere, including hot paths — after
 * the first claim it is a single storage read.
 */
export function claimCoachMark(
  id: CoachMarkId,
  storage: StorageLike | null = defaultStorage()
): boolean {
  if (!storage) return false;
  try {
    if (storage.getItem(COACH_MARK_KEYS[id]) === '1') return false;
    storage.setItem(COACH_MARK_KEYS[id], '1');
    return true;
  } catch {
    return false;
  }
}
