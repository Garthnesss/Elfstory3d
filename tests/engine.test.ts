import assert from 'node:assert/strict';
import test from 'node:test';
import { packZones, unpackZones } from '../src/game/cloudSave';
import { BESTIARY_DEFS, computeBestiaryRanks, FEAT_DEFS } from '../src/game/codex';
import {
  calculatePlayerHit,
  findPathNextStep,
  findPathPoints,
} from '../src/game/combat';
import {
  createNamedRelic,
  createStarterItem,
} from '../src/game/loot';
import { NPCS } from '../src/game/npcs';
import { computeDerivedStats, computeRespecPoints, getStarterPreset } from '../src/game/skills';
import { Enemy, PlayerState, Tile, WorldFlags, ZoneId, ZoneMap } from '../src/game/types';
import {
  createEnemy,
  createInitialZones,
  generateDungeonFloor,
  generateSideDungeonFloor,
  generateZoneById,
} from '../src/game/world';

function makeTestPlayer(): PlayerState {
  const preset = getStarterPreset('Vanguard');
  const weapon = createStarterItem(preset.weaponTag);
  return {
    name: 'Garth Elfstrom',
    starterClass: 'Vanguard',
    x: 2,
    y: 2,
    lastDirX: 1,
    hp: 48,
    maxHp: 48,
    mana: 18,
    maxMana: 18,
    level: 1,
    xp: 0,
    xpToNext: 65,
    gold: 50,
    attributePoints: 0,
    skillPoints: 1,
    attributes: { ...preset.attributes },
    skills: { [preset.initialSkill]: 1 },
    hotbar: [preset.initialSkill, null, null, null, null],
    cooldowns: {},
    prodigies: [],
    prodigyCooldowns: {},
    bonusHp: 0,
    statuses: [],
    equipped: { weapon },
    inventory: [],
    kills: 0,
    turnsElapsed: 0,
    firstStrikeReady: false,
  };
}

function makeTestFlags(overrides: Partial<WorldFlags> = {}): WorldFlags {
  return {
    discoveredZones: ['oakhaven', 'dungeon_1'],
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

function makeTestZone(rows: string[]): ZoneMap {
  const height = rows.length;
  const width = rows[0].length;
  const tiles: Tile[][] = rows.map((row, y) =>
    row.split('').map((ch, x) => ({
      x,
      y,
      kind: ch === '#' ? 'wall' : 'floor',
      glyph: ch,
      color: '#ECE4D4',
      walkable: ch !== '#',
      blocksSight: ch === '#',
      explored: true,
      visible: true,
    }))
  );
  return {
    id: 'dungeon_1',
    name: 'Test Chamber',
    subtitle: 'Test',
    depth: 1,
    width,
    height,
    tiles,
    enemies: [],
    npcs: [],
    loot: [],
    spawnPoint: { x: 1, y: 1 },
    returnPoint: { x: 1, y: 1 },
    isTown: false,
  };
}

test('pathfinding does not cut diagonally past blocking wall corners', () => {
  // Wall at (2, 1) and (1, 3), leaving a diagonal gap between (1, 1) and (2, 2) blocked at (2, 1) if (1, 2) is also wall
  const zone = makeTestZone([
    '#####',
    '#.#.#',
    '##..#',
    '#...#',
    '#####',
  ]);
  // From (1,1) to (2,2): (2,1) is '#' and (1,2) is '#' -> completely sealed!
  const step = findPathNextStep(zone, 1, 1, 2, 2);
  assert.equal(step, null);

  // Open corner around (3,1): from (1,1) to (3,1) wait let's test an open detour where corner cut is disallowed:
  const cornerZone = makeTestZone([
    '######',
    '#.#..#',
    '#..#.#',
    '#....#',
    '######',
  ]);
  const path = findPathPoints(cornerZone, 1, 1, 3, 1);
  assert.ok(path.length > 0);
  // Every consecutive step in path must have orthogonal neighbors open if diagonal
  let prev = { x: 1, y: 1 };
  for (const pt of path) {
    const dx = pt.x - prev.x;
    const dy = pt.y - prev.y;
    if (dx !== 0 && dy !== 0) {
      assert.equal(cornerZone.tiles[prev.y][pt.x].walkable, true);
      assert.equal(cornerZone.tiles[pt.y][prev.x].walkable, true);
    }
    prev = pt;
  }
});

test('bestiary ranks are codex honors only: no derived-stat or damage effect', () => {
  const player = makeTestPlayer();
  const baseFlags = makeTestFlags();
  const hunterFlags = makeTestFlags({ bestiaryKills: { crypt_skeleton: 3 } });
  const slayerFlags = makeTestFlags({ bestiaryKills: { crypt_skeleton: 8, plague_rat: 8 } });

  const baseStats = computeDerivedStats(player, baseFlags);
  const slayerStats = computeDerivedStats(player, slayerFlags);

  // Ranks grant no stats after the cut pass: derived stats are identical.
  assert.deepEqual(slayerStats, baseStats);
  assert.equal(computeBestiaryRanks(hunterFlags).unlockedHunters, 1);
  assert.equal(computeBestiaryRanks(slayerFlags).unlockedSlayers, 2);
  assert.equal(computeBestiaryRanks(baseFlags).unlockedHunters, 0);

  const enemy: Enemy = {
    id: 'test_skel',
    archetype: 'crypt_skeleton',
    name: 'Crypt Sentinel',
    glyph: 's',
    color: '#D6D3D1',
    x: 3,
    y: 2,
    hp: 30,
    maxHp: 30,
    atk: 6,
    def: 2,
    xpReward: 15,
    goldReward: 5,
    alerted: true,
    statuses: [],
    description: 'Undead sentry patrolling the ossuary.',
  };

  const normalHit = calculatePlayerHit(player, enemy, 2, false, true, 0, baseFlags);
  const hunterHit = calculatePlayerHit(player, enemy, 2, false, true, 0, hunterFlags);
  assert.equal(hunterHit.damage, normalHit.damage);
});

test('bonusHp increases maxHp without mutating resolve or defense, and Lyra cipher is one-time', () => {
  const basePlayer = makeTestPlayer();
  const buffedPlayer: PlayerState = { ...basePlayer, bonusHp: 8 };

  const baseDerived = computeDerivedStats(basePlayer);
  const buffedDerived = computeDerivedStats(buffedPlayer);

  assert.equal(buffedDerived.maxHp, baseDerived.maxHp + 8);
  assert.equal(buffedDerived.def, baseDerived.def);

  const lyraRootChoices = NPCS.lyra.nodes.root.choices;
  const cipherChoice = lyraRootChoices.find((c) => c.id === 'arcana_lore');
  assert.ok(cipherChoice);
  assert.equal(cipherChoice.nextNodeId, 'malakor_cipher');
  assert.equal(cipherChoice.condition?.notFlag, 'cipherInscribed');

  const cipherNode = NPCS.lyra.nodes.malakor_cipher;
  const applyChoice = cipherNode.choices[0];
  const actions = [
    ...(applyChoice.action ? [applyChoice.action] : []),
    ...(applyChoice.extraActions ?? []),
  ];
  assert.ok(actions.some((a) => a.type === 'set_flag' && a.flag === 'cipherInscribed' && a.value === true));
});

test('feat predicates unlock town_patron and first_blood; runeforger and set_collector are gone', () => {
  const basePlayer = makeTestPlayer();
  const blade = createNamedRelic('sylvan_longblade');
  const mantle = createNamedRelic('starlight_mantle');

  const equippedPlayer: PlayerState = {
    ...basePlayer,
    kills: 10,
    equipped: {
      weapon: blade,
      armor: mantle,
    },
  };
  const flags = makeTestFlags({
    townUpgrades: { apothecary: 1, smithy: 0, watchtower: 0 },
  });

  const firstBlood = FEAT_DEFS.find((f) => f.id === 'first_blood')!;
  assert.equal(FEAT_DEFS.find((f) => f.id === 'runeforger'), undefined);
  assert.equal(FEAT_DEFS.find((f) => f.id === 'set_collector'), undefined);
  const townPatron = FEAT_DEFS.find((f) => f.id === 'town_patron')!;

  assert.equal(firstBlood.check(equippedPlayer, flags), true);
  assert.equal(townPatron.check(equippedPlayer, flags), true);
});

test('procedural dungeon floors 1-5 have connected spawn and stairs across 50 runs', () => {
  for (let depth = 1; depth <= 5; depth++) {
    for (let run = 0; run < 10; run++) {
      const floor = generateDungeonFloor(depth);
      let stairPos: { x: number; y: number } | null = null;
      for (let y = 0; y < floor.height; y++) {
        for (let x = 0; x < floor.width; x++) {
          if (floor.tiles[y][x].kind === 'stairs_down') {
            stairPos = { x, y };
          }
        }
      }
      assert.ok(stairPos, `depth ${depth} run ${run} missing stairs_down`);
      const walkableOnly = { ...floor, enemies: [] };
      const walkableStep = findPathNextStep(walkableOnly, floor.spawnPoint.x, floor.spawnPoint.y, stairPos.x, stairPos.y);
      assert.ok(walkableStep, `depth ${depth} run ${run} has disconnected walkable stairs_down`);
    }
  }
});

test('Silverwood Vale overworld, new towns, and side dungeons have connected portals and landmarks', () => {
  const overworld = generateZoneById('overworld')!;
  assert.ok(overworld);
  const cleanOverworld = { ...overworld, enemies: [] };
  const requiredIds = [
    'gate_to_oakhaven',
    'gate_to_highspire',
    'gate_to_thornwick',
    'gate_to_cinderwatch',
    'to_barrow_1',
    'to_mire_1',
    'to_frost_1',
    'to_dungeon_1',
    'waystone_overworld',
    'overworld_satchel_chest',
  ];
  for (const interactId of requiredIds) {
    let found: { x: number; y: number } | null = null;
    for (let y = 0; y < overworld.height; y++) {
      for (let x = 0; x < overworld.width; x++) {
        if (overworld.tiles[y][x].interactId === interactId) {
          found = { x, y };
        }
      }
    }
    assert.ok(found, `missing overworld interactId ${interactId}`);
    const step = findPathNextStep(cleanOverworld, overworld.spawnPoint.x, overworld.spawnPoint.y, found.x, found.y);
    assert.ok(step, `overworld landmark ${interactId} unreachable from spawn`);
  }

  for (const townId of ['thornwick', 'cinderwatch'] as const) {
    const town = generateZoneById(townId)!;
    assert.ok(town);
    assert.equal(town.isTown, true);
    assert.ok(town.npcs.length >= 2);
  }

  for (const sideId of ['barrow_1', 'barrow_2', 'mire_1', 'mire_2', 'frost_1', 'frost_2', 'frost_3'] as const) {
    const floor = generateZoneById(sideId)!;
    assert.ok(floor, `missing side dungeon ${sideId}`);
    const clean = { ...floor, enemies: [] };
    const step = findPathNextStep(clean, floor.spawnPoint.x, floor.spawnPoint.y, floor.returnPoint.x, floor.returnPoint.y);
    assert.ok(step, `side dungeon ${sideId} disconnected`);
  }

  assert.equal(overworld.tiles[2][15].label, 'Silverwood Elven Waystone');
  const oakhaven = generateZoneById('oakhaven')!;
  assert.equal(oakhaven.tiles[7][0].label, 'Silverwood Vale West Gate');
});

test('side dungeons never spawn story bosses and terminal side bosses never overlap enemies or walls', () => {
  const storyBosses = new Set(['boss_bone_cantor', 'boss_ashen_inquisitor', 'boss_malakor']);
  const expectedTerminal: Partial<Record<ZoneId, string>> = {
    barrow_2: 'boss_morvath',
    mire_2: 'boss_vexis',
    frost_3: 'boss_kaelthar',
  };
  const sideIds: ZoneId[] = ['barrow_1', 'barrow_2', 'mire_1', 'mire_2', 'frost_1', 'frost_2', 'frost_3'];

  for (let run = 0; run < 15; run++) {
    for (const id of sideIds) {
      const zone = generateZoneById(id)!;
      assert.ok(zone);
      for (const e of zone.enemies) {
        assert.equal(storyBosses.has(e.archetype), false, `${id} spawned story boss ${e.archetype}`);
        assert.equal(zone.tiles[e.y]?.[e.x]?.walkable, true, `${id} enemy ${e.name} on non-walkable tile`);
      }
      const coords = new Set(zone.enemies.map((e) => `${e.x},${e.y}`));
      assert.equal(coords.size, zone.enemies.length, `${id} has stacked enemies on the same tile`);

      const bossId = expectedTerminal[id];
      if (bossId) {
        const boss = zone.enemies.find((e) => e.id === bossId);
        assert.ok(boss, `${id} missing terminal boss ${bossId}`);
        const step = findPathNextStep({ ...zone, enemies: [] }, zone.spawnPoint.x, zone.spawnPoint.y, boss.x, boss.y);
        assert.ok(step, `${id} terminal boss ${bossId} unreachable`);
      }
    }
  }
});

test('RLE packZones/unpackZones compacts 17 zones cleanly and stays compatible with legacy rows', () => {
  const zones: Record<ZoneId, ZoneMap> = { ...createInitialZones() };
  for (const id of [
    'dungeon_1',
    'dungeon_2',
    'dungeon_3',
    'dungeon_4',
    'dungeon_5',
    'barrow_1',
    'barrow_2',
    'mire_1',
    'mire_2',
    'frost_1',
    'frost_2',
    'frost_3',
  ] as ZoneId[]) {
    const z = generateZoneById(id);
    if (z) zones[id] = z;
  }

  // Mark sample edge-case flags including used trap & custom interactId/label on ember_crust glyph '~'
  zones.dungeon_1.tiles[1][1] = {
    ...zones.dungeon_1.tiles[1][1],
    kind: 'ember_crust',
    glyph: '~',
    explored: true,
    visible: true,
    used: true,
    revealed: true,
    interactId: 'custom_node',
    label: 'Scorched Crust',
  };

  const packed = packZones(zones);
  const packedBytes = new TextEncoder().encode(JSON.stringify(packed)).length;
  assert.ok(packedBytes < 220_000, `Expected compact 17-zone payload < 220 KB, got ${packedBytes} bytes`);

  const unpacked = unpackZones(packed);
  assert.equal(Object.keys(unpacked).length, Object.keys(zones).length);
  const sample = unpacked.dungeon_1.tiles[1][1];
  assert.equal(sample.kind, 'ember_crust');
  assert.equal(sample.glyph, '~');
  assert.equal(sample.explored, true);
  assert.equal(sample.visible, true);
  assert.equal(sample.used, true);
  assert.equal(sample.revealed, true);
  assert.equal(sample.interactId, 'custom_node');
  assert.equal(sample.label, 'Scorched Crust');

  // Legacy 11-field non-RLE row + raw uncompressed ZoneMap fallback
  const legacyPacked = {
    legacy_floor: {
      id: 'dungeon_1',
      name: 'Legacy',
      subtitle: 'Legacy',
      depth: 1,
      width: 2,
      height: 1,
      enemies: [],
      npcs: [],
      loot: [],
      spawnPoint: { x: 0, y: 0 },
      returnPoint: { x: 1, y: 0 },
      isTown: false,
      packedTileRows: ['wall|#|#3F4756|0|1|1|0|0|0||Stone Wall;stairs_down|>|#F59E0B|1|0|1|1|0|0|to_2|Descent'],
    },
    raw_floor: makeTestZone(['##', '..']),
  };
  const legacyUnpacked = unpackZones(legacyPacked as unknown as Record<string, Record<string, unknown>>);
  assert.equal(legacyUnpacked['legacy_floor' as ZoneId].tiles[0][0].blocksSight, true);
  assert.equal(legacyUnpacked['legacy_floor' as ZoneId].tiles[0][1].interactId, 'to_2');
  assert.equal(legacyUnpacked['raw_floor' as ZoneId].tiles[1][0].walkable, true);
});

test('computeRespecPoints refunds initial starter skill point plus all quest and pacify rewards', () => {
  const lv1 = computeRespecPoints(1, makeTestFlags(), {});
  assert.equal(lv1.skillPoints, 2);
  assert.equal(lv1.attributePoints, 0);

  const maxed = computeRespecPoints(
    6,
    makeTestFlags({
      bellChoice: 'attuned_lyra',
      cantorPacified: true,
      blightChoice: 'cantor_appeased',
    }),
    {
      herbalist_blight: { id: 'herbalist_blight', status: 'completed', stage: 2, outcomeLabel: 'Silenced the Bone Cantor', history: [] },
      spores_of_bog: { id: 'spores_of_bog', status: 'completed', stage: 2, history: [] },
      barrow_purge: { id: 'barrow_purge', status: 'completed', stage: 2, history: [] },
      cinder_and_frost: { id: 'cinder_and_frost', status: 'completed', stage: 2, history: [] },
    }
  );
  // 2 initial + 5 level ups + 1 bell + 1 pacify + 1 mira turn-in + 1 spores = 11 skill points
  assert.equal(maxed.skillPoints, 11);
  // 5*2 level ups + 1 barrow + 1 cinder_and_frost = 12 attribute points
  assert.equal(maxed.attributePoints, 12);
});

test('P0 regression: Vex smuggler tip is gated one-time by the vexTipClaimed flag', () => {
  const rootChoices = NPCS.vex.nodes.root.choices;
  const tip = rootChoices.find((c) => c.id === 'cunning_tip');
  assert.ok(tip, 'cunning_tip choice missing');
  assert.equal(tip.condition?.notFlag, 'vexTipClaimed');
  const takeTip = NPCS.vex.nodes.shortcut_pass.choices.find((c) => c.id === 'take_tip');
  assert.ok(takeTip, 'take_tip choice missing');
  assert.equal(takeTip.action?.type, 'give_gold');
  assert.ok(
    takeTip.extraActions?.some((a) => a.type === 'set_flag' && a.flag === 'vexTipClaimed' && a.value === true),
    'take_tip must set vexTipClaimed so the +15g cannot be farmed'
  );
});

test('P0 regression: side dungeons never spawn story quest nodes (bell / cache / herb)', () => {
  const storyKinds = new Set(['whispering_bell', 'contraband_cache', 'herb_node']);
  for (let run = 0; run < 25; run++) {
    for (const zoneId of ['barrow_1', 'barrow_2', 'mire_1', 'mire_2', 'frost_1', 'frost_2', 'frost_3'] as ZoneId[]) {
      const zone = generateZoneById(zoneId);
      assert.ok(zone, `zone ${zoneId} failed to generate`);
      for (const row of zone.tiles) {
        for (const tile of row) {
          assert.ok(!storyKinds.has(tile.kind), `${zoneId} spawned story node ${tile.kind} (run ${run})`);
        }
      }
    }
  }
  // And the real Floor 3 still gets its Bell across runs.
  let bellSeen = false;
  for (let run = 0; run < 25 && !bellSeen; run++) {
    const d3 = generateDungeonFloor(3);
    bellSeen = d3.tiles.some((row) => row.some((t) => t.kind === 'whispering_bell'));
  }
  assert.ok(bellSeen, 'main Floor 3 should still spawn the Whispering Bell');
});

test('bestiary glyphs match enemy archetypes in world generators', () => {
  assert.equal(BESTIARY_DEFS.blight_weaver.glyph, 'v');
  assert.equal(BESTIARY_DEFS.cinder_wisp.glyph, 'w');
  const d4 = generateDungeonFloor(4);
  const wisp = d4.enemies.find((e) => e.archetype === 'cinder_wisp');
  if (wisp) {
    assert.equal(wisp.glyph, BESTIARY_DEFS.cinder_wisp.glyph);
  }
});

test('P1 regression: floor-1 enemies survive a starter Vanguard opening hit', () => {
  const player = makeTestPlayer();
  const stats = computeDerivedStats(player);
  for (const arch of ['plague_rat', 'goblin_skirmisher', 'crypt_skeleton'] as const) {
    const enemy = createEnemy(arch, 0, 0, 1);
    // Non-crit basic hit must not one-shot any F1 archetype anymore.
    const expected = Math.max(2, Math.round(stats.atk - enemy.def * 0.6));
    assert.ok(enemy.hp > expected, `${arch} HP ${enemy.hp} should exceed one basic hit (${expected})`);
  }
});

test('P1 regression: final boss out-stats every side boss (no Kaelthar inversion)', () => {
  const malakor = createEnemy('boss_malakor', 0, 0, 5);
  assert.equal(malakor.hp, 1000);
  const frost = generateSideDungeonFloor('frost', 3);
  const kaelthar = frost.enemies.find((e) => e.id === 'boss_kaelthar');
  assert.ok(kaelthar, 'Kaelthar should guard frost_3');
  assert.ok(kaelthar.hp < malakor.hp, `Kaelthar HP ${kaelthar.hp} must stay below Malakor ${malakor.hp}`);
  assert.ok(kaelthar.atk <= malakor.atk, `Kaelthar ATK ${kaelthar.atk} must not exceed Malakor ${malakor.atk}`);
  const barrow = generateSideDungeonFloor('barrow', 2);
  const morvath = barrow.enemies.find((e) => e.id === 'boss_morvath');
  assert.ok(morvath && morvath.hp < 420, 'Morvath should sit below Vaelen-tier HP');
});

test('P1 regression: story bosses are scaled to arrival level, not 3-hit kills', () => {
  assert.equal(createEnemy('boss_bone_cantor', 0, 0, 2).hp, 420);
  assert.equal(createEnemy('boss_ashen_inquisitor', 0, 0, 4).hp, 690);
  assert.equal(createEnemy('boss_malakor', 0, 0, 5).atk, 36);
});
