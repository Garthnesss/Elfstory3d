import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DIFFICULTY_MULTIPLIERS,
  getCurrentDifficulty,
  normalizeDifficulty,
  scaleEnemyForDifficulty,
  scaleXpForDifficulty,
  setCurrentDifficulty,
} from '../src/game/difficulty';
import {
  SAVE_VERSION,
  SavedBundle,
  bundleDifficulty,
  getLocalSlotKey,
  parseStoredBundle,
  readAllSlotStates,
  stampBundle,
  withCompletionStamp,
} from '../src/game/saveSlots';
import {
  DEFAULT_KEYMAP,
  Keymap,
  loadSettings,
  mergeKeymap,
  normalizeKeyInput,
  rebindKeymap,
  resolveKeyAction,
  saveSettings,
} from '../src/game/settings';
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

// ------------------------------------------------------- difficulty tiers

test('difficulty: multiplier table matches the Phase 4 spec', () => {
  assert.deepEqual(DIFFICULTY_MULTIPLIERS.story, { enemyHp: 0.75, enemyAtk: 0.85, xp: 1.15 });
  assert.deepEqual(DIFFICULTY_MULTIPLIERS.standard, { enemyHp: 1.0, enemyAtk: 1.0, xp: 1.0 });
  assert.deepEqual(DIFFICULTY_MULTIPLIERS.hardened, { enemyHp: 1.25, enemyAtk: 1.15, xp: 1.1 });
  assert.equal(normalizeDifficulty(undefined), 'standard');
  assert.equal(normalizeDifficulty('nonsense'), 'standard');
  assert.equal(normalizeDifficulty('hardened'), 'hardened');
});

test('difficulty: Standard is identity against the P1 constants (normal enemy)', () => {
  setCurrentDifficulty('standard');
  const skeleton = createEnemy('crypt_skeleton', 0, 0, 1);
  assert.equal(skeleton.hp, 58);
  assert.equal(skeleton.maxHp, 58);
  assert.equal(skeleton.atk, 11);
  // The scaler itself returns the enemy untouched at Standard.
  const rat = createEnemy('plague_rat', 0, 0, 1);
  assert.equal(scaleEnemyForDifficulty(rat, 'standard'), rat);
});

test('difficulty: Standard is identity against the P1 constants (story boss)', () => {
  setCurrentDifficulty('standard');
  const malakor = createEnemy('boss_malakor', 0, 0, 5);
  assert.equal(malakor.hp, 1000);
  assert.equal(malakor.maxHp, 1000);
  assert.equal(malakor.atk, 36);
  const vaelen = createEnemy('boss_bone_cantor', 0, 0, 2);
  assert.equal(vaelen.hp, 420);
  assert.equal(vaelen.atk, 21);
});

test('difficulty: Story scales enemy HP/ATK by 0.75 / 0.85', () => {
  setCurrentDifficulty('story');
  const skeleton = createEnemy('crypt_skeleton', 0, 0, 1);
  assert.equal(skeleton.hp, 44); // round(58 * 0.75)
  assert.equal(skeleton.maxHp, 44);
  assert.equal(skeleton.atk, 9); // round(11 * 0.85)
  const malakor = createEnemy('boss_malakor', 0, 0, 5);
  assert.equal(malakor.hp, 750);
  assert.equal(malakor.atk, 31); // round(36 * 0.85)
  setCurrentDifficulty('standard');
});

test('difficulty: Hardened scales enemy HP/ATK by 1.25 / 1.15', () => {
  setCurrentDifficulty('hardened');
  const skeleton = createEnemy('crypt_skeleton', 0, 0, 1);
  assert.equal(skeleton.hp, 73); // round(58 * 1.25)
  assert.equal(skeleton.atk, 13); // round(11 * 1.15)
  const malakor = createEnemy('boss_malakor', 0, 0, 5);
  assert.equal(malakor.hp, 1250);
  assert.equal(malakor.atk, 41); // round(36 * 1.15)
  setCurrentDifficulty('standard');
});

test('difficulty: side bosses scale through createEnemy + promote + tune', () => {
  const morvathAt = (tier: 'story' | 'standard' | 'hardened') => {
    setCurrentDifficulty(tier);
    const zone = generateSideDungeonFloor('barrow', 2);
    const boss = zone.enemies.find((e) => e.id === 'boss_morvath');
    assert.ok(boss, 'Morvath is placed on barrow floor 2');
    return boss;
  };
  // Standard pins the P1 side-boss tuning exactly (376 HP / 24 ATK).
  const standard = morvathAt('standard');
  assert.equal(standard.hp, 376);
  assert.equal(standard.atk, 24);
  const story = morvathAt('story');
  assert.equal(story.hp, 281);
  assert.equal(story.atk, 21);
  const hardened = morvathAt('hardened');
  assert.equal(hardened.hp, 471);
  assert.equal(hardened.atk, 28);
  setCurrentDifficulty('standard');
  assert.equal(getCurrentDifficulty(), 'standard');
});

test('difficulty: XP multiplier applies in the grant helper', () => {
  assert.equal(scaleXpForDifficulty(100, 'standard'), 100);
  assert.equal(scaleXpForDifficulty(100, 'story'), 115);
  assert.equal(scaleXpForDifficulty(100, 'hardened'), 110);
  assert.equal(scaleXpForDifficulty(33, 'hardened'), 36); // rounds
  assert.equal(scaleXpForDifficulty(0, 'story'), 0);
});

// ------------------------------------------------------- save versioning

test('saves: stampBundle writes the current SAVE_VERSION', () => {
  const stamped = stampBundle(makeBundle());
  assert.equal(stamped.version, SAVE_VERSION);
  assert.equal(SAVE_VERSION, 1);
});

test('saves: version round-trip preserves version, difficulty and stamp', () => {
  const bundle = makeBundle({ difficulty: 'hardened', completedAtMs: 123_456 });
  const raw = JSON.stringify(stampBundle(bundle));
  const result = parseStoredBundle(raw);
  assert.equal(result.status, 'ok');
  if (result.status === 'ok') {
    assert.equal(result.bundle.version, SAVE_VERSION);
    assert.equal(result.bundle.difficulty, 'hardened');
    assert.equal(bundleDifficulty(result.bundle), 'hardened');
    assert.equal(result.bundle.completedAtMs, 123_456);
  }
});

test('saves: legacy bundle (no version field) loads and defaults to Standard', () => {
  const legacy = JSON.stringify(makeBundle()); // no version, no difficulty
  const result = parseStoredBundle(legacy);
  assert.equal(result.status, 'ok');
  if (result.status === 'ok') {
    assert.equal(result.bundle.version, undefined);
    assert.equal(bundleDifficulty(result.bundle), 'standard');
    assert.equal(result.bundle.completedAtMs, undefined);
  }
});

test('saves: future-version bundle is refused gracefully, without throwing', () => {
  const future = JSON.stringify(makeBundle({ version: SAVE_VERSION + 1 }));
  let result: ReturnType<typeof parseStoredBundle> | undefined;
  assert.doesNotThrow(() => {
    result = parseStoredBundle(future);
  });
  assert.equal(result?.status, 'future-version');
  if (result?.status === 'future-version') {
    assert.equal(result.version, SAVE_VERSION + 1);
    assert.match(result.message, /newer version/);
  }
});

test('saves: corrupt slot is isolated — other slots still read fine', () => {
  const good = JSON.stringify(stampBundle(makeBundle({ difficulty: 'story' })));
  const future = JSON.stringify(makeBundle({ version: 99 }));
  const storage = makeStorage({
    [getLocalSlotKey('slot_1')]: 'garbage{not json',
    [getLocalSlotKey('slot_2')]: good,
    [getLocalSlotKey('slot_3')]: future,
  });
  const states = readAllSlotStates(storage);
  assert.equal(states.slot_1.status, 'corrupt');
  assert.equal(states.slot_2.status, 'ok');
  assert.equal(states.slot_3.status, 'future-version');
  if (states.slot_2.status === 'ok') {
    assert.equal(bundleDifficulty(states.slot_2.bundle), 'story');
  }
  // A slot with nothing stored is simply empty, and a parseable bundle
  // without a player object counts as corrupt, not loadable.
  assert.equal(readAllSlotStates(makeStorage()).slot_1.status, 'empty');
  assert.equal(parseStoredBundle('{"zones":{}}').status, 'corrupt');
  assert.equal(parseStoredBundle(null).status, 'empty');
});

test('saves: completion stamp is set once and never moved', () => {
  const fresh = makeBundle();
  const stamped = withCompletionStamp(fresh, 1_000);
  assert.equal(stamped.completedAtMs, 1_000);
  const restamped = withCompletionStamp(stamped, 2_000);
  assert.equal(restamped.completedAtMs, 1_000);
  // ...and it survives a version-stamp + serialize + parse round-trip.
  const roundTripped = parseStoredBundle(JSON.stringify(stampBundle(stamped)));
  assert.equal(roundTripped.status, 'ok');
  if (roundTripped.status === 'ok') {
    assert.equal(roundTripped.bundle.completedAtMs, 1_000);
  }
});

// ------------------------------------------------------------- keymap

test('keymap: defaults are the pre-Phase-4 bindings', () => {
  assert.equal(DEFAULT_KEYMAP.moveUp, 'w');
  assert.equal(DEFAULT_KEYMAP.moveDown, 's');
  assert.equal(DEFAULT_KEYMAP.moveLeft, 'a');
  assert.equal(DEFAULT_KEYMAP.moveRight, 'd');
  assert.equal(DEFAULT_KEYMAP.interact, ' ');
  assert.equal(DEFAULT_KEYMAP.explore, 'z');
  assert.equal(DEFAULT_KEYMAP.journal, 'j');
  assert.equal(DEFAULT_KEYMAP.map, 'm');
  assert.equal(DEFAULT_KEYMAP.guide, '?');
  // A fresh settings load (no blob) hydrates the full default keymap.
  assert.deepEqual(loadSettings(makeStorage()).keymap, DEFAULT_KEYMAP);
});

test('keymap: partial stored blob merges over defaults', () => {
  const storage = makeStorage({
    'elfstory-settings': JSON.stringify({ keymap: { journal: 'g' } }),
  });
  const s = loadSettings(storage);
  assert.equal(s.keymap.journal, 'g');
  assert.equal(s.keymap.moveUp, 'w');
  assert.equal(s.keymap.interact, ' ');
});

test('keymap: a rebind moves the action and frees the old key', () => {
  const km = rebindKeymap(DEFAULT_KEYMAP, 'journal', 'g');
  assert.equal(km.journal, 'g');
  assert.equal(resolveKeyAction(km, 'g'), 'journal');
  assert.equal(resolveKeyAction(km, 'j'), null);
  // The original keymap object is not mutated.
  assert.equal(DEFAULT_KEYMAP.journal, 'j');
});

test('keymap: rebinding onto a taken key swaps the two bindings', () => {
  const km = rebindKeymap(DEFAULT_KEYMAP, 'moveUp', 's');
  assert.equal(km.moveUp, 's');
  assert.equal(km.moveDown, 'w');
  assert.equal(resolveKeyAction(km, 's'), 'moveUp');
  assert.equal(resolveKeyAction(km, 'w'), 'moveDown');
});

test('keymap: reset restores the factory bindings', () => {
  const rebound = rebindKeymap(DEFAULT_KEYMAP, 'journal', 'g');
  assert.notDeepEqual(rebound, DEFAULT_KEYMAP);
  // The Settings modal's Reset Defaults writes a fresh copy of the
  // factory keymap through the same settings save/load path.
  const storage = makeStorage();
  const current = loadSettings(storage);
  saveSettings({ ...current, keymap: rebound }, storage);
  assert.equal(loadSettings(storage).keymap.journal, 'g');
  saveSettings({ ...current, keymap: { ...DEFAULT_KEYMAP } }, storage);
  assert.deepEqual(loadSettings(storage).keymap, DEFAULT_KEYMAP);
  assert.deepEqual(mergeKeymap(undefined), DEFAULT_KEYMAP);
});

test('keymap: arrows and Enter are hardcoded fallbacks regardless of bindings', () => {
  const km: Keymap = { ...DEFAULT_KEYMAP, moveUp: 'e', interact: 'f' };
  assert.equal(resolveKeyAction(km, 'ArrowUp'), 'moveUp');
  assert.equal(resolveKeyAction(km, 'ArrowDown'), 'moveDown');
  assert.equal(resolveKeyAction(km, 'ArrowLeft'), 'moveLeft');
  assert.equal(resolveKeyAction(km, 'ArrowRight'), 'moveRight');
  assert.equal(resolveKeyAction(km, 'Enter'), 'interact');
  assert.equal(resolveKeyAction(km, 'e'), 'moveUp');
  assert.equal(resolveKeyAction(km, 'f'), 'interact');
});

test('keymap: resolver covers the default actions; unbindable keys are rejected', () => {
  assert.equal(resolveKeyAction(DEFAULT_KEYMAP, 'w'), 'moveUp');
  assert.equal(resolveKeyAction(DEFAULT_KEYMAP, 'W'), 'moveUp'); // case-insensitive
  assert.equal(resolveKeyAction(DEFAULT_KEYMAP, ' '), 'interact');
  assert.equal(resolveKeyAction(DEFAULT_KEYMAP, 'z'), 'explore');
  assert.equal(resolveKeyAction(DEFAULT_KEYMAP, '?'), 'guide');
  assert.equal(resolveKeyAction(DEFAULT_KEYMAP, 'x'), null);
  // Digits stay fixed for skills/runes, named keys can't be captured.
  assert.equal(normalizeKeyInput('5'), null);
  assert.equal(normalizeKeyInput('Escape'), null);
  assert.equal(normalizeKeyInput('Enter'), null);
  assert.equal(normalizeKeyInput('Tab'), null);
  assert.equal(normalizeKeyInput('W'), 'w');
  assert.equal(normalizeKeyInput(' '), ' ');
  // A rejected capture leaves the keymap untouched.
  assert.equal(rebindKeymap(DEFAULT_KEYMAP, 'journal', '5'), DEFAULT_KEYMAP);
  assert.equal(rebindKeymap(DEFAULT_KEYMAP, 'journal', 'Escape'), DEFAULT_KEYMAP);
});
