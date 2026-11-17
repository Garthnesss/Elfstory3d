import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { KEY_ACTIONS, mergeKeymap } from '../src/game/settings';

// Phase 7 fix pack — structural pins over the App/modal sources, in the
// same style as the Phase 6 service-worker test. These guard the audit
// fixes against silent regression:
//  1. a completed run can return to the Ending Screen (NG+ ascend)
//     after a save/reload, gated on the CURRENT run's victory flag;
//  2. a bundle saved on the death turn (hp <= 0) loads into GAME_OVER
//     instead of a frozen, unrecoverable scene;
//  3. the complete_quest handler refuses to pay a completion twice;
//  4. selling a stacked consumable sells one unit, not the whole stack.

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const pauseModal = readFileSync(
  new URL('../src/components/EndPauseModal.tsx', import.meta.url),
  'utf8'
);

test('Phase 7 ascend: pause menu can return to the Ending Screen for a completed run', () => {
  assert.ok(pauseModal.includes('canReturnToEnding'), 'modal accepts the return-to-ending gate');
  assert.ok(pauseModal.includes('Return to the Ending'), 'modal renders the button');
  // The gate itself is behaviour-tested in tests/runRules.test.ts; this only
  // pins that App feeds it the current run's flag (not the carried-over stamp).
  assert.ok(
    app.includes('canReturnToEnding={canOfferReturnToEnding({') &&
      app.includes('malakorDefeated: Boolean(worldFlags.malakorDefeated),'),
    'gate is the current run\u2019s malakorDefeated flag (not the carried-over stamp)'
  );
  assert.ok(
    app.includes("onReturnToEnding={() => setGameState('VICTORY')}"),
    'the button reopens the Ending Screen'
  );
});

test('Phase 7 saves: an hp <= 0 bundle loads into GAME_OVER, never a frozen run', () => {
  assert.ok(
    app.includes("setGameState(normalizedPlayer.hp <= 0 ? 'GAME_OVER' : 'PLAYING')"),
    'applySavedBundle routes death-turn saves to the death flow'
  );
});

test('Phase 7 quests: the completion handler guards its own payout', () => {
  assert.ok(app.includes('questRewardGuardRef'), 'a synchronous payout guard exists');
  assert.ok(
    app.includes("quests[act.questId]?.status === 'completed'"),
    'already-completed quests are refused by the handler itself'
  );
  // The guard is seeded from the loaded bundle and cleared for fresh runs.
  assert.ok(app.includes('.filter((q) => q.status === \'completed\')'), 'guard seeded on load');
});

test('Tidy-up keymap: a partial blob can no longer manufacture a duplicate binding', () => {
  // The audit case: storing moveUp='s' used to leave moveDown on its 's'
  // default too — two actions, one key, moveDown letter-unreachable.
  const merged = mergeKeymap({ moveUp: 's' });
  assert.equal(merged.moveUp, 's', 'the stored binding is honoured');
  assert.notEqual(merged.moveDown, 's', 'moveDown is not shadowed by the duplicate');
  const keys = KEY_ACTIONS.map((a) => merged[a]);
  assert.equal(new Set(keys).size, KEY_ACTIONS.length, 'every action has a distinct key');
  // A clean default merge stays the default merge.
  const plain = mergeKeymap(null);
  assert.equal(new Set(KEY_ACTIONS.map((a) => plain[a])).size, KEY_ACTIONS.length);
});

test('Phase 7 merchants: selling a stack sells a single unit at the shown price', () => {
  const sellStart = app.indexOf('const handleSellItem');
  assert.ok(sellStart >= 0, 'sell handler exists');
  const sellBody = app.slice(sellStart, sellStart + 1400);
  assert.ok(
    sellBody.includes('quantity: (cur.quantity ?? 1) - 1'),
    'a stacked item is decremented, not removed wholesale'
  );
});
