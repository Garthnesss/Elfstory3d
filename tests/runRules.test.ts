import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canOfferReturnToEnding,
  mainFloorDepth,
  pruneAbyssZones,
} from '../src/game/runRules.ts';

const zonesThrough = (deepest: number): Record<string, { id: string }> => {
  const zones: Record<string, { id: string }> = {
    oakhaven: { id: 'oakhaven' },
    overworld: { id: 'overworld' },
    barrow_1: { id: 'barrow_1' },
  };
  for (let d = 1; d <= deepest; d++) zones[`dungeon_${d}`] = { id: `dungeon_${d}` };
  return zones;
};

test('runRules: mainFloorDepth reads only main-descent ids', () => {
  assert.equal(mainFloorDepth('dungeon_7'), 7);
  assert.equal(mainFloorDepth('barrow_1'), null);
  assert.equal(mainFloorDepth('oakhaven'), null);
});

test('runRules: a run that never left the story floors is untouched', () => {
  const zones = zonesThrough(5);
  assert.equal(pruneAbyssZones(zones, 'dungeon_5'), zones);
});

test('runRules: deep Abyss saves keep only neighbours and the deepest floor', () => {
  const zones = zonesThrough(80);
  const pruned = pruneAbyssZones(zones, 'dungeon_40');
  const abyss = Object.keys(pruned)
    .map(mainFloorDepth)
    .filter((d): d is number => d !== null && d > 5)
    .sort((a, b) => a - b);
  assert.deepEqual(abyss, [39, 40, 41, 80]);
  for (const id of ['oakhaven', 'overworld', 'barrow_1', 'dungeon_1', 'dungeon_5']) {
    assert.ok(id in pruned, `${id} must survive pruning`);
  }
  assert.ok(Object.keys(zones).length === 83, 'input is not mutated');
});

test('runRules: pruning from town keeps the deepest Abyss floor', () => {
  const pruned = pruneAbyssZones(zonesThrough(30), 'oakhaven');
  const abyss = Object.keys(pruned).filter((id) => (mainFloorDepth(id) ?? 0) > 5);
  assert.deepEqual(abyss, ['dungeon_30']);
});

test('runRules: stored Abyss floors stay bounded however deep the run goes', () => {
  for (const deepest of [6, 7, 20, 200]) {
    const pruned = pruneAbyssZones(zonesThrough(deepest), `dungeon_${deepest}`);
    const abyss = Object.keys(pruned).filter((id) => (mainFloorDepth(id) ?? 0) > 5);
    assert.ok(abyss.length <= 4, `floor ${deepest} kept ${abyss.length} Abyss floors`);
    assert.ok(`dungeon_${deepest}` in pruned);
  }
});

test('runRules: Return to the Ending needs a finished run', () => {
  assert.equal(
    canOfferReturnToEnding({ malakorDefeated: false, hardcore: false, inTown: true }),
    false
  );
  assert.equal(
    canOfferReturnToEnding({ malakorDefeated: true, hardcore: false, inTown: false }),
    true
  );
});

test('runRules: Hardcore cannot reach the ascend heal from a dungeon', () => {
  assert.equal(
    canOfferReturnToEnding({ malakorDefeated: true, hardcore: true, inTown: false }),
    false
  );
  assert.equal(
    canOfferReturnToEnding({ malakorDefeated: true, hardcore: true, inTown: true }),
    true
  );
});
