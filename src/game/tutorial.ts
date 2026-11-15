// First-run tutorial coach-marks (Phase 2). The steps are plain data plus a
// couple of pure helpers; App.tsx watches gameplay signals (movement,
// dialogue, kills, cooldowns, consumable counts, resting) and advances the
// sequence when the matching action happens. Every step can also be
// advanced manually, and the whole sequence is skippable — the overlay
// never blocks input to the canvas.

export type TutorialStepId = 'move' | 'talk' | 'fight' | 'skills' | 'potion' | 'rest';

export interface TutorialStep {
  id: TutorialStepId;
  title: string;
  body: string;
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    id: 'move',
    title: 'Find your feet',
    body: 'Move with WASD or the arrow keys — on touch, swipe the map or use the D-Pad. Walk into a glowing stair (>) to descend, and into townsfolk to speak with them.',
  },
  {
    id: 'talk',
    title: 'Talk to the town',
    body: 'Bump into Warden Vance (the @ in Oakhaven) and take his quest. Every ◆ objective is pinned at the top of your screen; the full story lives in the Journal [J].',
  },
  {
    id: 'fight',
    title: 'First blood',
    body: 'Combat is bump-to-fight: step into a foe to strike it. Watch for red telegraph tiles and [!] wind-ups — step off them before the blow lands.',
  },
  {
    id: 'skills',
    title: 'Use your skills',
    body: 'Your hotbar skills sit on keys 1–5, Inscription runes on 6–8. Open Skills [K] to spend the points you earn from levels, and check enemy intents with Look before you commit.',
  },
  {
    id: 'potion',
    title: 'Drink to live',
    body: 'Press Q for a quick draught, or open your Pack [I] to use a Crimson Draught. Draughts heal a share of your maximum health, so they stay useful all the way down.',
  },
  {
    id: 'rest',
    title: 'Rest & save',
    body: 'Press R to Safe Rest when no enemies are near — it restores health, mana, and cooldowns. The game also autosaves as you play, and the Menu saves your slot outright. Good delving!',
  },
];

/** Snapshot of the gameplay signals the tutorial watches, taken when a step starts. */
export interface TutorialBaseline {
  x: number;
  y: number;
  kills: number;
  consumableCount: number;
}

export interface TutorialSignals {
  x: number;
  y: number;
  kills: number;
  consumableCount: number;
  dialogueOpen: boolean;
  anySkillOnCooldown: boolean;
  restedOrSaved: boolean;
}

/** Pure completion check for one tutorial step, given the baseline snapshot
 *  from when the step started and the current signals. */
export function isTutorialStepComplete(
  stepId: TutorialStepId,
  baseline: TutorialBaseline,
  signals: TutorialSignals
): boolean {
  switch (stepId) {
    case 'move':
      return signals.x !== baseline.x || signals.y !== baseline.y;
    case 'talk':
      return signals.dialogueOpen;
    case 'fight':
      return signals.kills > baseline.kills;
    case 'skills':
      return signals.anySkillOnCooldown;
    case 'potion':
      return signals.consumableCount < baseline.consumableCount;
    case 'rest':
      return signals.restedOrSaved;
    default:
      return false;
  }
}

/** Total consumables (by quantity) currently carried — the potion step
 *  completes when this drops below its baseline. */
export function countConsumables(
  inventory: ReadonlyArray<{ category: string; quantity?: number }>
): number {
  return inventory
    .filter((item) => item.category === 'consumable')
    .reduce((sum, item) => sum + (item.quantity ?? 1), 0);
}
