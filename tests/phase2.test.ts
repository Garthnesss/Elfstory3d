import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveMusicTheme } from '../src/game/audio';
import { deriveTrackedObjectives, getQuestNextHint, MAIN_QUEST_ID } from '../src/game/quests';
import {
  DEFAULT_KEYMAP,
  DEFAULT_SETTINGS,
  isTutorialDone,
  loadSettings,
  loadTileSize,
  markTutorialDone,
  saveSettings,
  saveTileSize,
} from '../src/game/settings';
import {
  countConsumables,
  isTutorialStepComplete,
  TUTORIAL_STEPS,
  TutorialBaseline,
  TutorialSignals,
} from '../src/game/tutorial';
import { QuestProgress, WorldFlags } from '../src/game/types';

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

function makeFlags(overrides: Partial<WorldFlags> = {}): WorldFlags {
  return {
    discoveredZones: ['oakhaven'],
    miraPotionTier: 1,
    citadelAccess: false,
    floor3Shortcut: false,
    npcMet: {},
    npcDisposition: {},
    readLoreIds: [],
    confrontedBosses: [],
    waystonesAttuned: 0,
    bestiaryKills: {},
    unlockedFeats: [],
    townUpgrades: { apothecary: 0, smithy: 0, watchtower: 0 },
    ...overrides,
  };
}

function quest(id: string, status: QuestProgress['status'] = 'active', stage = 1): QuestProgress {
  return { id, status, stage, history: [] };
}

// ---------------------------------------------------------------- settings

test('settings: defaults when storage is empty', () => {
  const s = loadSettings(makeStorage());
  assert.deepEqual(s, DEFAULT_SETTINGS);
});

test('settings: legacy P0 mute key is honoured when no blob exists', () => {
  const s = loadSettings(makeStorage({ 'elfstory-muted': '1' }));
  assert.equal(s.muted, true);
  assert.equal(s.sfxVolume, DEFAULT_SETTINGS.sfxVolume);
});

test('settings: save/load roundtrip persists and rewrites the legacy key', () => {
  const storage = makeStorage();
  const next = {
    sfxVolume: 0.25,
    musicVolume: 0.5,
    muted: true,
    screenShake: false,
    // Phase 4: GameSettings gained the keymap; the roundtrip fixture
    // carries the factory bindings.
    keymap: DEFAULT_KEYMAP,
    // Phase 6: GameSettings gained the accessibility fields; the fixture
    // carries non-default values so the roundtrip proves they persist.
    textSize: 'large' as const,
    patternSignals: false,
  };
  saveSettings(next, storage);
  assert.equal(storage._map.get('elfstory-muted'), '1');
  assert.deepEqual(loadSettings(storage), next);
});

test('settings: corrupt blob falls back to defaults (plus legacy mute)', () => {
  const s = loadSettings(makeStorage({ 'elfstory-settings': '{not json', 'elfstory-muted': '1' }));
  assert.equal(s.muted, true);
  assert.equal(s.musicVolume, DEFAULT_SETTINGS.musicVolume);
  assert.equal(s.screenShake, true);
});

test('settings: partial blob merges over defaults, volumes are clamped', () => {
  const s = loadSettings(
    makeStorage({ 'elfstory-settings': JSON.stringify({ sfxVolume: 7, musicVolume: -2 }) })
  );
  assert.equal(s.sfxVolume, 1);
  assert.equal(s.musicVolume, 0);
  assert.equal(s.screenShake, DEFAULT_SETTINGS.screenShake);
});

test('settings: tile size validates against the zoom steps', () => {
  const storage = makeStorage();
  assert.equal(loadTileSize(storage), 36);
  saveTileSize(44, storage);
  assert.equal(loadTileSize(storage), 44);
  saveTileSize(30, storage); // not a step — ignored
  assert.equal(loadTileSize(storage), 44);
  assert.equal(loadTileSize(makeStorage({ 'elfstory-tile-size': 'banana' })), 36);
});

test('settings: tutorial-done flag roundtrips and defaults to not-done with storage', () => {
  const storage = makeStorage();
  assert.equal(isTutorialDone(storage), false);
  markTutorialDone(storage);
  assert.equal(isTutorialDone(storage), true);
  // No storage at all => treat as done so the tutorial never nags.
  assert.equal(isTutorialDone(null), true);
});

// ------------------------------------------------------------------ quests

test('quests: fresh run pins the main-quest giver as the objective', () => {
  const { main, side, extraSideCount } = deriveTrackedObjectives({}, makeFlags());
  assert.ok(main);
  assert.equal(main.questId, MAIN_QUEST_ID);
  assert.equal(main.isMain, true);
  assert.match(main.hint, /Warden Vance/);
  assert.equal(side, null);
  assert.equal(extraSideCount, 0);
});

test('quests: active main quest uses its stage-aware journal hint', () => {
  const quests = { [MAIN_QUEST_ID]: quest(MAIN_QUEST_ID) };
  const { main } = deriveTrackedObjectives(quests, makeFlags());
  assert.ok(main);
  assert.match(main.hint, /Floor 5/);
  assert.doesNotMatch(main.hint, /^Next:/); // tracker strips the prefix
});

test('quests: weakened Malakor changes the main objective text', () => {
  const quests = { [MAIN_QUEST_ID]: quest(MAIN_QUEST_ID) };
  const { main } = deriveTrackedObjectives(quests, makeFlags({ malakorWeakened: true }));
  assert.match(main!.hint, /weakened/i);
});

test('quests: completed main quest clears the tracker main line', () => {
  const quests = { [MAIN_QUEST_ID]: quest(MAIN_QUEST_ID, 'completed', 2) };
  const { main } = deriveTrackedObjectives(quests, makeFlags({ malakorDefeated: true }));
  assert.equal(main, null);
});

test('quests: side tracker picks the earliest-defined active side quest and counts the rest', () => {
  const quests = {
    [MAIN_QUEST_ID]: quest(MAIN_QUEST_ID),
    cinder_and_frost: quest('cinder_and_frost'),
    barrow_purge: quest('barrow_purge'),
    spores_of_bog: quest('spores_of_bog', 'completed', 2),
  };
  const { side, extraSideCount } = deriveTrackedObjectives(quests, makeFlags());
  assert.ok(side);
  // QUEST_DEFS order: spores_of_bog < barrow_purge < cinder_and_frost, but
  // spores is completed, so barrow_purge wins and cinder_and_frost is extra.
  assert.equal(side.questId, 'barrow_purge');
  assert.equal(extraSideCount, 1);
});

test('quests: journal hints remain stage-aware (shadows_beneath delivery stage)', () => {
  const flags = makeFlags();
  assert.match(getQuestNextHint(quest('shadows_beneath', 'active', 1), flags), /Smuggler Cache/);
  assert.match(getQuestNextHint(quest('shadows_beneath', 'active', 2), flags), /Deliver the Sealed Contraband Ledger/);
});

// ------------------------------------------------------------------- music

test('music theme: towns and the overworld are calm', () => {
  assert.equal(resolveMusicTheme({ isTown: true, zoneId: 'oakhaven', bossAlerted: false }), 'town');
  assert.equal(resolveMusicTheme({ isTown: false, zoneId: 'overworld', bossAlerted: false }), 'town');
});

test('music theme: dungeons are tense, alerted bosses take over', () => {
  assert.equal(resolveMusicTheme({ isTown: false, zoneId: 'dungeon_3', bossAlerted: false }), 'dungeon');
  assert.equal(resolveMusicTheme({ isTown: false, zoneId: 'dungeon_5', bossAlerted: true }), 'boss');
  // A boss in a town (should not happen) never overrides the calm theme.
  assert.equal(resolveMusicTheme({ isTown: true, zoneId: 'oakhaven', bossAlerted: true }), 'town');
});

// ---------------------------------------------------------------- tutorial

const baseline: TutorialBaseline = { x: 5, y: 5, kills: 0, consumableCount: 3 };
const idleSignals: TutorialSignals = {
  x: 5,
  y: 5,
  kills: 0,
  consumableCount: 3,
  dialogueOpen: false,
  anySkillOnCooldown: false,
  restedOrSaved: false,
};

test('tutorial: steps complete only on their own signal', () => {
  assert.equal(isTutorialStepComplete('move', baseline, idleSignals), false);
  assert.equal(isTutorialStepComplete('move', baseline, { ...idleSignals, x: 6 }), true);
  assert.equal(isTutorialStepComplete('talk', baseline, { ...idleSignals, dialogueOpen: true }), true);
  assert.equal(isTutorialStepComplete('fight', baseline, { ...idleSignals, kills: 1 }), true);
  assert.equal(isTutorialStepComplete('skills', baseline, { ...idleSignals, anySkillOnCooldown: true }), true);
  assert.equal(isTutorialStepComplete('potion', baseline, { ...idleSignals, consumableCount: 2 }), true);
  assert.equal(isTutorialStepComplete('potion', baseline, { ...idleSignals, consumableCount: 4 }), false);
  assert.equal(isTutorialStepComplete('rest', baseline, { ...idleSignals, restedOrSaved: true }), true);
});

test('tutorial: sequence covers the required coaching beats', () => {
  assert.deepEqual(
    TUTORIAL_STEPS.map((s) => s.id),
    ['move', 'talk', 'fight', 'skills', 'potion', 'rest']
  );
});

test('tutorial: consumable counting respects stack quantities', () => {
  assert.equal(
    countConsumables([
      { category: 'consumable', quantity: 3 },
      { category: 'weapon' },
      { category: 'consumable' },
    ]),
    4
  );
});
