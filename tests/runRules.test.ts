import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bossBlockingDescent,
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

test('auto-explore stops beside the stairs instead of descending', async () => {
  const { findAutoExploreTarget } = await import('../src/game/combat.ts');
  const row = (kinds: string[], y: number) =>
    kinds.map((kind, x) => ({ x, y, kind, walkable: kind !== 'wall', explored: true, visible: true }));
  const zone = {
    id: 'dungeon_1', isTown: false, depth: 1, width: 5, height: 3, npcs: [], enemies: [], loot: [],
    tiles: [
      row(['wall', 'wall', 'wall', 'wall', 'wall'], 0),
      row(['wall', 'floor', 'floor', 'stairs_down', 'wall'], 1),
      row(['wall', 'wall', 'wall', 'wall', 'wall'], 2),
    ],
  } as never;
  const far = findAutoExploreTarget(zone, 1, 1);
  assert.deepEqual(far, { nextStep: { x: 2, y: 1 }, reason: 'stairs' });
  const beside = findAutoExploreTarget(zone, 2, 1);
  assert.deepEqual(beside, { nextStep: null, reason: 'stairs' });
});

test('runRules: a living story boss seals the stairs down', () => {
  const boss = { isBoss: true, hp: 596, name: 'Vaelen, Bone Cantor' };
  const rat = { isBoss: false, hp: 10, name: 'Blight Rat' };
  assert.equal(bossBlockingDescent({ enemies: [rat, boss] }), 'Vaelen, Bone Cantor');
  assert.equal(bossBlockingDescent({ enemies: [rat, { ...boss, hp: 0 }] }), null);
  assert.equal(bossBlockingDescent({ enemies: [rat] }), null);
  assert.equal(bossBlockingDescent({ isTown: true, enemies: [boss] }), null);
});

test('loot curve: Epics arrive mid-descent and ordinary drops never roll Relic', async () => {
  const { rollRarity } = await import('../src/game/loot.ts');
  const orig = Math.random;
  const dist = (depth: number, min?: 'Epic') => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < 1000; i++) {
      Math.random = () => (i + 0.5) / 1000;
      const r = rollRarity(depth, min);
      counts[r] = (counts[r] ?? 0) + 1;
    }
    Math.random = orig;
    return counts;
  };
  try {
    const f1 = dist(1);
    assert.ok((f1.Epic ?? 0) <= 20, `Floor 1 Epic ${f1.Epic}/1000`);
    const f3 = dist(3);
    assert.ok((f3.Epic ?? 0) >= 80 && (f3.Epic ?? 0) <= 140, `Floor 3 Epic ${f3.Epic}/1000`);
    for (const d of [1, 5, 8, 20, 60]) assert.equal(dist(d).Relic ?? 0, 0, `depth ${d} ordinary Relic`);
    assert.ok((dist(8, 'Epic').Relic ?? 0) > 0, 'premium sources can still roll Relic');
    assert.deepEqual(dist(60), dist(10), 'the depth bonus is capped');
  } finally {
    Math.random = orig;
  }
});

test('Garth voice: rate limits ordinary quips, always speaks on big moments', async () => {
  const v = await import('../src/game/garthVoice.ts');
  assert.equal(v.shouldQuip('levelUp', 0, 0.99), true);
  assert.equal(v.shouldQuip('bossKill', 0, 0.99), true);
  assert.equal(v.shouldQuip('kill', 2, 0), false, 'cooldown holds');
  assert.equal(v.shouldQuip('kill', 20, 0.1), true);
  assert.equal(v.shouldQuip('kill', 20, 0.9), false, 'most kills pass in silence');
  assert.equal(v.shouldQuip('lowHp', 20, 0.99), true);
  for (const ev of Object.keys(v.GARTH_LINES) as Array<keyof typeof v.GARTH_LINES>) {
    const first = v.pickGarthLine(ev, 0);
    assert.notEqual(v.pickGarthLine(ev, 0, first), first, `${ev} never repeats back to back`);
  }
  assert.equal(v.formatGarthLine('Hah.'), 'Garth: “Hah.”');
});
