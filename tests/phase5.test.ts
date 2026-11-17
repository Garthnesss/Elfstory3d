import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cycleMultipliers,
  getCurrentCycle,
  normalizeCycle,
  scaleEnemyForDifficulty,
  scaleXpForDifficulty,
  setCurrentCycle,
  setCurrentDifficulty,
} from '../src/game/difficulty';
import { deepestDepthForZones } from '../src/game/runRules';
import {
  SAVE_VERSION,
  SavedBundle,
  bundleCycle,
  bundleHardcore,
  canLoadBundle,
  fallenBundleMessage,
  getLocalSlotKey,
  isBundleDead,
  parseStoredBundle,
  readAllSlotStates,
  stampBundle,
  withDeathStamp,
} from '../src/game/saveSlots';
import { createEnemy, generateSideDungeonFloor } from '../src/game/world';

// ---------------------------------------------------------------- fixtures

function makeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    _map: map,
  };
}

/** Minimal bundle: parseStoredBundle only requires a player object. */
function makeBundle(overrides: Record<string, unknown> = {}): SavedBundle {
  return {
    player: { name: 'Garth Elfstrom', level: 3 },
    zones: {},
    currentZoneId: 'oakhaven',
    worldFlags: {},
    quests: {},
    merchantStocks: {},
    logs: [],
    ...overrides,
  } as unknown as SavedBundle;
}

function resetScaling() {
  setCurrentDifficulty('standard');
  setCurrentCycle(0);
}

// ------------------------------------------------------- cycle multipliers

test('ascension: cycle multiplier table matches the Phase 5 spec', () => {
  assert.deepEqual(cycleMultipliers(0), { enemyHp: 1, enemyAtk: 1, xp: 1 });
  assert.deepEqual(cycleMultipliers(1), { enemyHp: 1.35, enemyAtk: 1.25, xp: 1.2 });
  assert.deepEqual(cycleMultipliers(3), { enemyHp: 2.05, enemyAtk: 1.75, xp: 1.6 });
  // Hostile / legacy values normalize to cycle 0.
  assert.equal(normalizeCycle(undefined), 0);
  assert.equal(normalizeCycle(-2), 0);
  assert.equal(normalizeCycle(2.9), 2);
  assert.equal(normalizeCycle(Number.NaN), 0);
});

test('ascension: cycle 0 at Standard is identity against the current pins', () => {
  resetScaling();
  const skeleton = createEnemy('crypt_skeleton', 0, 0, 1);
  assert.equal(skeleton.hp, 58);
  assert.equal(skeleton.atk, 11);
  const malakor = createEnemy('boss_malakor', 0, 0, 5);
  assert.equal(malakor.hp, 1750);
  assert.equal(malakor.atk, 55);
  // The composed scaler still returns the enemy untouched.
  const rat = createEnemy('plague_rat', 0, 0, 1);
  assert.equal(scaleEnemyForDifficulty(rat, 'standard', 0), rat);
  assert.equal(getCurrentCycle(), 0);
});

test('ascension: cycle 1 scales a normal enemy and a story boss', () => {
  setCurrentDifficulty('standard');
  setCurrentCycle(1);
  const skeleton = createEnemy('crypt_skeleton', 0, 0, 1);
  assert.equal(skeleton.hp, 78); // round(58 * 1.35)
  assert.equal(skeleton.maxHp, 78);
  assert.equal(skeleton.atk, 14); // round(11 * 1.25)
  const malakor = createEnemy('boss_malakor', 0, 0, 5);
  assert.equal(malakor.hp, 2363); // 1750 * 1.35
  assert.equal(malakor.atk, 69); // 55 * 1.25
  resetScaling();
});

test('ascension: cycle 3 scales a normal enemy and a story boss', () => {
  setCurrentDifficulty('standard');
  setCurrentCycle(3);
  const skeleton = createEnemy('crypt_skeleton', 0, 0, 1);
  assert.equal(skeleton.hp, 119); // round(58 * 2.05)
  assert.equal(skeleton.atk, 19); // round(11 * 1.75)
  const malakor = createEnemy('boss_malakor', 0, 0, 5);
  assert.equal(malakor.hp, 3587); // 1750 * 2.05
  assert.equal(malakor.atk, 96); // 55 * 1.75
  resetScaling();
});

test('ascension: side bosses compose through createEnemy + promote + tune', () => {
  const morvathAt = (cycle: number) => {
    setCurrentDifficulty('standard');
    setCurrentCycle(cycle);
    const zone = generateSideDungeonFloor('barrow', 2);
    const boss = zone.enemies.find((e) => e.id === 'boss_morvath');
    assert.ok(boss, 'Morvath is placed on barrow floor 2');
    return boss;
  };
  // Cycle 0 pins the audit-retuned side-boss tuning exactly (617 HP / 37 ATK).
  const c0 = morvathAt(0);
  assert.equal(c0.hp, 617);
  assert.equal(c0.atk, 37);
  const c1 = morvathAt(1);
  assert.equal(c1.hp, 834); // 617 * 1.35 through the promote/tune pipeline
  assert.equal(c1.atk, 47);
  const c3 = morvathAt(3);
  assert.equal(c3.hp, 1269);
  assert.equal(c3.atk, 65);
  resetScaling();
});

test('ascension: difficulty tier and cycle compose multiplicatively', () => {
  // Hardened (HP x1.25, ATK x1.15) on cycle 1 (HP x1.35, ATK x1.25).
  setCurrentDifficulty('hardened');
  setCurrentCycle(1);
  const skeleton = createEnemy('crypt_skeleton', 0, 0, 1);
  assert.equal(skeleton.hp, 98); // round(58 * 1.25 * 1.35)
  assert.equal(skeleton.atk, 16); // round(11 * 1.15 * 1.25)
  resetScaling();
});

test('ascension: XP multiplier composes tier x cycle in the grant helper', () => {
  assert.equal(scaleXpForDifficulty(550, 'standard', 0), 550);
  assert.equal(scaleXpForDifficulty(550, 'standard', 1), 660); // Malakor XP x1.20
  assert.equal(scaleXpForDifficulty(550, 'standard', 3), 880); // x1.60
  assert.equal(scaleXpForDifficulty(100, 'story', 1), 138); // 1.15 * 1.20
  assert.equal(scaleXpForDifficulty(100, 'hardened', 1), 132); // 1.10 * 1.20
  assert.equal(scaleXpForDifficulty(0, 'hardened', 3), 0);
});

// ------------------------------------------------------------- NG+ bundles

test('ngplus: bundle round-trip persists cycle, hardcore and stamp', () => {
  const bundle = makeBundle({ ngPlusCycle: 2, hardcore: true, completedAtMs: 777 });
  const result = parseStoredBundle(JSON.stringify(stampBundle(bundle)));
  assert.equal(result.status, 'ok');
  if (result.status === 'ok') {
    // No version bump was needed: the new fields are optional-with-defaults.
    assert.equal(result.bundle.version, SAVE_VERSION);
    assert.equal(SAVE_VERSION, 1);
    assert.equal(bundleCycle(result.bundle), 2);
    assert.equal(bundleHardcore(result.bundle), true);
    assert.equal(result.bundle.completedAtMs, 777);
    assert.equal(canLoadBundle(result.bundle), true);
  }
});

test('ngplus: legacy bundle defaults to cycle 0, non-hardcore, alive', () => {
  const result = parseStoredBundle(JSON.stringify(makeBundle()));
  assert.equal(result.status, 'ok');
  if (result.status === 'ok') {
    assert.equal(bundleCycle(result.bundle), 0);
    assert.equal(bundleHardcore(result.bundle), false);
    assert.equal(isBundleDead(result.bundle), false);
    assert.equal(canLoadBundle(result.bundle), true);
  }
  // A garbage cycle value also normalizes to 0 rather than poisoning scaling.
  assert.equal(bundleCycle(makeBundle({ ngPlusCycle: 'two' })), 0);
  assert.equal(bundleCycle(makeBundle({ ngPlusCycle: -1 })), 0);
});

// ------------------------------------------------------- hardcore death

test('hardcore: death stamp marks the run fallen and refuses load', () => {
  const alive = makeBundle({ hardcore: true, ngPlusCycle: 1 });
  assert.equal(canLoadBundle(alive), true);
  const fallen = withDeathStamp(alive, 424_242, 'Fell on Floor 5 · The Sunken Vaults');
  assert.equal(fallen.deadAtMs, 424_242);
  assert.equal(fallen.deathNote, 'Fell on Floor 5 · The Sunken Vaults');
  assert.equal(isBundleDead(fallen), true);
  assert.equal(canLoadBundle(fallen), false);
  assert.match(fallenBundleMessage(fallen), /death is final/);
  assert.match(fallenBundleMessage(fallen), /Fell on Floor 5/);
  // First stamp wins: re-stamping never moves the death.
  const restamped = withDeathStamp(fallen, 999_999, 'Somewhere else');
  assert.equal(restamped.deadAtMs, 424_242);
  assert.equal(restamped.deathNote, 'Fell on Floor 5 · The Sunken Vaults');
});

test('hardcore: fallen bundle survives the storage round-trip as fallen', () => {
  const fallen = withDeathStamp(
    makeBundle({ hardcore: true, ngPlusCycle: 2 }),
    1000,
    'Fell on Floor 3 · Cantor Crypt'
  );
  const alive = makeBundle({ ngPlusCycle: 0 });
  const storage = makeStorage({
    [getLocalSlotKey('slot_1')]: JSON.stringify(stampBundle(fallen)),
    [getLocalSlotKey('slot_2')]: JSON.stringify(stampBundle(alive)),
  });
  const states = readAllSlotStates(storage);
  // The fallen slot still parses (its data is valid) — the fallen state is
  // reported by the bundle helpers the Title Screen / load guard consult.
  assert.equal(states.slot_1.status, 'ok');
  assert.equal(states.slot_2.status, 'ok');
  if (states.slot_1.status === 'ok') {
    assert.equal(isBundleDead(states.slot_1.bundle), true);
    assert.equal(canLoadBundle(states.slot_1.bundle), false);
    assert.equal(bundleCycle(states.slot_1.bundle), 2);
  }
  if (states.slot_2.status === 'ok') {
    assert.equal(canLoadBundle(states.slot_2.bundle), true);
  }
});

// ------------------------------------------------------------- lifetime

test('lifetime: deepest depth derives from discovered zones like the chronicle', () => {
  assert.equal(deepestDepthForZones(['oakhaven'], 0), 0);
  assert.equal(deepestDepthForZones(['oakhaven', 'dungeon_3'], 0), 3);
  assert.equal(deepestDepthForZones(['barrow_2', 'mire_1'], 0), 3);
  assert.equal(deepestDepthForZones(['frost_3'], 0), 6);
  // The current zone's own depth counts too (e.g. Abyss floors).
  assert.equal(deepestDepthForZones(['dungeon_5'], 8), 8);
  assert.equal(deepestDepthForZones([], 0), 0);
});
