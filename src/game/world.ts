import { makeCritter } from './ambient';
import { scaleEnemyForDifficulty } from './difficulty';
import { createConsumable, generateInscription, generateProceduralItem } from './loot';
import { CritterState, Enemy, EnemyArchetype, GroundLoot, SkillId, Tile, TileKind, ZoneId, ZoneMap } from './types';

let enemyIdSeq = 1;
function nextEnemyId(): string {
  enemyIdSeq += 1;
  return `en_${enemyIdSeq}`;
}

function makeTile(x: number, y: number, kind: TileKind): Tile {
  switch (kind) {
    case 'wall':
      return { x, y, kind, glyph: '#', color: '#3F4756', walkable: false, blocksSight: true, explored: false, visible: false };
    case 'floor':
      return { x, y, kind, glyph: '·', color: '#39414E', walkable: true, blocksSight: false, explored: false, visible: false };
    case 'road':
      return { x, y, kind, glyph: '░', color: '#5E5647', walkable: true, blocksSight: false, explored: false, visible: false };
    case 'water':
      return { x, y, kind, glyph: '≈', color: '#3B7EA1', walkable: false, blocksSight: false, explored: false, visible: false, label: 'Fountain Water' };
    case 'chasm':
      return { x, y, kind, glyph: '~', color: '#C2512D', walkable: false, blocksSight: false, explored: false, visible: false, label: 'Ember Fissure' };
    case 'door':
      return { x, y, kind, glyph: '+', color: '#D99B26', walkable: true, blocksSight: false, explored: false, visible: false, label: 'Timber Gate' };
    case 'stairs_down':
      return { x, y, kind, glyph: '>', color: '#F59E0B', walkable: true, blocksSight: false, explored: false, visible: false, label: 'Descent Stair' };
    case 'stairs_up':
      return { x, y, kind, glyph: '<', color: '#93C5FD', walkable: true, blocksSight: false, explored: false, visible: false, label: 'Ascent Stair' };
    case 'gate_city':
      return { x, y, kind, glyph: 'Ω', color: '#FBBF24', walkable: true, blocksSight: false, explored: false, visible: false, label: 'Citadel Road Gate' };
    case 'torch':
      return { x, y, kind, glyph: '*', color: '#FB923C', walkable: false, blocksSight: false, explored: false, visible: false, label: 'Wall Torch' };
    case 'shrine':
      return { x, y, kind, glyph: '┼', color: '#60A5FA', walkable: true, blocksSight: false, explored: false, visible: false, label: 'Glyph Shrine' };
    case 'brazier':
      return { x, y, kind, glyph: '☼', color: '#F59E0B', walkable: true, blocksSight: false, explored: false, visible: false, label: 'Restorative Brazier' };
    case 'chest':
      return { x, y, kind, glyph: '$', color: '#FBBF24', walkable: true, blocksSight: false, explored: false, visible: false, label: 'Ironbound Chest' };
    case 'trap':
      return { x, y, kind, glyph: '^', color: '#EF4444', walkable: true, blocksSight: false, explored: false, visible: false, revealed: false, label: 'Spike Snare' };
    case 'dart_trap':
      return { x, y, kind, glyph: '»', color: '#A3E635', walkable: true, blocksSight: false, explored: false, visible: false, revealed: false, label: 'Venom Dart Snare' };
    case 'lore_tablet':
      return { x, y, kind, glyph: '‡', color: '#A78BFA', walkable: true, blocksSight: false, explored: false, visible: false, label: 'Carved Stele' };
    case 'tree':
      return { x, y, kind, glyph: '♣', color: '#4EA885', walkable: false, blocksSight: true, explored: false, visible: false, label: 'Ashen Pine' };
    case 'pillar':
      return { x, y, kind, glyph: '║', color: '#6B7280', walkable: false, blocksSight: true, explored: false, visible: false, label: 'Stone Pillar' };
    case 'market_stall':
      return { x, y, kind, glyph: 'Π', color: '#D99B26', walkable: false, blocksSight: false, explored: false, visible: false, label: 'Market Stall' };
    case 'fountain':
      return { x, y, kind, glyph: '◎', color: '#60A5FA', walkable: false, blocksSight: false, explored: false, visible: false, label: 'Citadel Fountain' };
    case 'herb_node':
      return { x, y, kind, glyph: '✿', color: '#34D399', walkable: true, blocksSight: false, explored: false, visible: false, label: 'Pale Nightbloom' };
    case 'contraband_cache':
      return { x, y, kind, glyph: '▤', color: '#F472B6', walkable: true, blocksSight: false, explored: false, visible: false, label: 'Smuggler Cache' };
    case 'whispering_bell':
      return { x, y, kind, glyph: '⍾', color: '#60A5FA', walkable: true, blocksSight: false, explored: false, visible: false, label: 'The Whispering Bell' };
    case 'vault_door':
      return { x, y, kind, glyph: '⊞', color: '#F59E0B', walkable: false, blocksSight: true, explored: false, visible: false, label: 'Sealed Treasure Vault Door (Danger)' };
    case 'waystone':
      return { x, y, kind, glyph: '◈', color: '#38BDF8', walkable: true, blocksSight: false, explored: false, visible: false, label: 'Elven Waystone' };
    case 'forgotten_forge':
      return { x, y, kind, glyph: '⚒', color: '#FB923C', walkable: true, blocksSight: false, explored: false, visible: false, label: 'Forgotten Forge' };
    case 'cursed_altar':
      return { x, y, kind, glyph: '☠', color: '#C084FC', walkable: true, blocksSight: false, explored: false, visible: false, label: 'Occult Blood Altar' };
    case 'spore_pool':
      return { x, y, kind, glyph: '≈', color: '#10B981', walkable: true, blocksSight: false, explored: false, visible: false, label: 'Blight Spore Pool (Poison Hazard)' };
    case 'frost_vent':
      return { x, y, kind, glyph: '❄', color: '#38BDF8', walkable: true, blocksSight: false, explored: false, visible: false, label: 'Crypt Frost Vent (Chill Hazard)' };
    case 'ember_crust':
      return { x, y, kind, glyph: '~', color: '#F97316', walkable: true, blocksSight: false, explored: false, visible: false, label: 'Molten Ember Crust (Burn Hazard)' };
    case 'shock_rune':
      return { x, y, kind, glyph: '⚡', color: '#C084FC', walkable: true, blocksSight: false, explored: false, visible: false, label: 'Arcane Shock Rune (Mana/HP Hazard)' };
  }
}

function buildTownFromAscii(
  id: ZoneId,
  name: string,
  subtitle: string,
  rows: string[],
  npcs: ZoneMap['npcs'],
  spawnPoint: { x: number; y: number },
  returnPoint: { x: number; y: number }
): ZoneMap {
  const height = rows.length;
  const width = rows[0].length;
  const tiles: Tile[][] = [];

  for (let y = 0; y < height; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < width; x++) {
      const ch = rows[y][x] ?? '#';
      let kind: TileKind = 'floor';
      if (ch === '#') kind = 'wall';
      else if (ch === '░' || ch === '=') kind = 'road';
      else if (ch === '♣') kind = 'tree';
      else if (ch === '≈') kind = 'water';
      else if (ch === '~') kind = 'chasm';
      else if (ch === '◎') kind = 'fountain';
      else if (ch === 'Π') kind = 'market_stall';
      else if (ch === '║') kind = 'pillar';
      else if (ch === '*') kind = 'torch';
      else if (ch === '┼') kind = 'shrine';
      else if (ch === '☼') kind = 'brazier';
      else if (ch === '$') kind = 'chest';
      else if (ch === '◈') kind = 'waystone';
      else if (ch === '✿') kind = 'herb_node';
      else if (ch === '%') kind = 'spore_pool';
      else if (ch === '+') kind = 'door';
      else if (ch === '>') kind = 'stairs_down';
      else if (ch === 'Ω') kind = 'gate_city';
      else if (ch === '‡') kind = 'lore_tablet';
      else kind = 'floor';

      const tile = makeTile(x, y, kind);
      if (id === 'highspire' && kind === 'wall') tile.color = '#596377';
      if (id === 'highspire' && kind === 'road') tile.color = '#7C7465';
      if (kind === 'shrine') {
        tile.interactId =
          id === 'oakhaven'
            ? 'respec_shrine'
            : id === 'highspire'
              ? 'citadel_shrine'
              : `${id}_shrine`;
      }
      if (kind === 'lore_tablet') {
        tile.interactId =
          id === 'oakhaven'
            ? 'lore_oakhaven_post'
            : id === 'highspire'
              ? 'lore_highspire_archive'
              : `lore_${id}_post`;
      }
      tile.explored = id !== 'overworld';
      tile.visible = id !== 'overworld';
      row.push(tile);
    }
    tiles.push(row);
  }

  return {
    id,
    name,
    subtitle,
    isTown: true,
    depth: 0,
    width,
    height,
    tiles,
    enemies: [],
    npcs,
    loot: [],
    spawnPoint,
    returnPoint,
  };
}

export function createOakhavenMap(): ZoneMap {
  const layout = [
    '♣♣♣♣♣♣♣♣♣♣♣♣♣♣♣♣♣♣♣♣♣♣♣♣♣♣♣♣',
    '♣♣...#####..♣....♣..#####..♣',
    '♣.♣..#...#........♣.#...#..♣',
    '♣....##+##..........##+##..♣',
    '♣......░.Π.Π..........░.♣..♣',
    '♣......░.......Π....✿.░✿.✿.♣',
    '♣..♣...░....*.*.....┼✿░*║.║♣',
    'Ω░░░░░░░░░░░░◎░░░░░░░░░░..░♣',
    '♣............░.........░>>░♣',
    '♣.♣.♣........░.........░░░*♣',
    '♣.....♣......░░░░░░░......♣♣',
    '♣....................≈≈≈≈..♣',
    '♣..###..✿.✿...#####.≈≈≈≈≈≈.♣',
    '♣..#.+...✿....#...+.≈≈≈≈≈≈≈♣',
    '♣..###........#####♣.≈≈≈≈≈≈♣',
    '♣..........♣..........≈≈≈≈.♣',
    '♣♣♣♣♣♣♣♣♣♣♣♣♣♣♣♣♣♣♣♣♣♣♣♣♣♣♣♣',
  ];

  const town = buildTownFromAscii(
    'oakhaven',
    'Oakhaven Outpost',
    'Sunny Frontier Village',
    layout,
    [
      { id: 'torin', x: 7, y: 2, glyph: '@', color: '#F59E0B', name: 'Torin Ironhand', title: 'Blacksmith & Forgemaster' },
      { id: 'mira', x: 22, y: 4, glyph: '@', color: '#4EA885', name: 'Herbalist Mira', title: 'Apothecary' },
      { id: 'vance', x: 14, y: 8, glyph: '@', color: '#60A5FA', name: 'Warden Vance', title: 'Outpost Captain' },
      { id: 'vex', x: 6, y: 13, glyph: '@', color: '#C084FC', name: 'Vex the Quiet', title: 'Shadow Broker' },
      { id: 'pell', x: 10, y: 5, glyph: '@', color: '#A8A29E', name: 'Pell the Carter', title: 'Outpost Carter', homeX: 10, homeY: 5, roams: true },
      { id: 'wren', x: 19, y: 8, glyph: '@', color: '#FDE68A', name: 'Sister Wren', title: 'Shrine Keeper', homeX: 19, homeY: 8, roams: true },
    ],
    { x: 13, y: 9 },
    { x: 13, y: 11 }
  );
  town.tiles[7][0].label = 'Silverwood Vale West Gate';
  // Phase 3 POI: the Old Outpost Oak — flavor landmark by the north wall.
  town.tiles[1][1].interactId = 'poi_old_oak';
  town.tiles[1][1].label = 'The Old Outpost Oak';
  town.critters = [makeCritter('town_cat', 15, 6)];
  // Village pond in the south-east (Phase 7 village redo): label its water.
  for (const [px, py] of [
    [21, 11], [22, 11], [23, 11], [24, 11],
    [20, 12], [21, 12], [22, 12], [23, 12], [24, 12], [25, 12],
    [20, 13], [21, 13], [22, 13], [23, 13], [24, 13], [25, 13], [26, 13],
    [21, 14], [22, 14], [23, 14], [24, 14], [25, 14], [26, 14],
    [22, 15], [23, 15], [24, 15], [25, 15],
  ] as const) {
    town.tiles[py][px].label = 'Oakhaven Pond';
  }
  return town;
}

export function createHighspireMap(): ZoneMap {
  const layout = [
    '################################',
    '#║....║.....######......║.....║#',
    '#..*..║..‡..#....#..*...║..*...#',
    '#...........+....+.............#',
    '#..#######..######..#######....#',
    '#..#.....#....░░....#.....#....#',
    '#..#.....+░░░░░░░...+.....#....#',
    '#..#######....░░....#######....#',
    '#.............░░...............#',
    'Ω░░░░░░░░░░░░░◎░░░░░░░░░░░░░*..#',
    '#......Π.Π....░░....Π.Π........#',
    '#..*..........░░..........┼....#',
    '#.....║.......░░.......║.......#',
    '#.............░░...............#',
    '#......*......>>.......║.......#',
    '#.............░░...............#',
    '################################',
  ];

  const town = buildTownFromAscii(
    'highspire',
    'Highspire Citadel',
    'Upper Stone Bastion',
    layout,
    [
      { id: 'lyra', x: 14, y: 2, glyph: '@', color: '#60A5FA', name: 'Archivist Lyra', title: 'Keeper of Glyphs' },
      { id: 'corvus', x: 5, y: 6, glyph: '@', color: '#F59E0B', name: 'Magistrate Corvus', title: 'Citadel Arbiter' },
      { id: 'kaelen', x: 23, y: 6, glyph: '@', color: '#EF4444', name: 'Guildmaster Kaelen', title: 'Warden of the Descent' },
      { id: 'orin', x: 21, y: 11, glyph: '@', color: '#C084FC', name: 'Relic Appraiser Orin', title: 'Master Artificer' },
      { id: 'tomas', x: 10, y: 8, glyph: '@', color: '#93C5FD', name: 'Page Tomas', title: 'Citadel Page', homeX: 10, homeY: 8, roams: true },
    ],
    { x: 14, y: 11 },
    { x: 14, y: 13 }
  );
  town.critters = [makeCritter('cinder_crow', 25, 2)];
  return town;
}

/**
 * Every enemy spawn in the game funnels through here, so the Phase 4
 * difficulty scaling is applied exactly once, at creation: regular spawns,
 * story bosses, elites, side bosses (promoteEnemyRank + SIDE_BOSS_TUNE
 * multiply on top of the scaled base) and Abyss spawns are all covered.
 * At Standard difficulty the scaler is the identity and the P1 constants
 * below are the exact stats.
 */
export function createEnemy(archetype: EnemyArchetype, x: number, y: number, depth: number): Enemy {
  return scaleEnemyForDifficulty(createEnemyBase(archetype, x, y, depth));
}

function createEnemyBase(archetype: EnemyArchetype, x: number, y: number, depth: number): Enemy {
  const abyssBonus = depth > 5 ? (depth - 5) * 0.16 : 0;
  const scale = 1 + (depth - 1) * 0.28 + abyssBonus;
  switch (archetype) {
    case 'plague_rat':
      return {
        id: nextEnemyId(),
        archetype,
        name: 'Blight Rat',
        glyph: 'r',
        color: '#A8A29E',
        x,
        y,
        hp: Math.round(32 * scale),
        maxHp: Math.round(32 * scale),
        atk: Math.round(7 * scale),
        def: 0,
        xpReward: Math.round(12 * scale),
        goldReward: Math.round(5 * scale),
        statuses: [],
        alerted: false,
        description: 'Quick tunnel scavenger whose bite carries rot.',
      };
    case 'goblin_skirmisher':
      return {
        id: nextEnemyId(),
        archetype,
        name: 'Goblin Skirmisher',
        glyph: 'g',
        color: '#4EA885',
        x,
        y,
        hp: Math.round(46 * scale),
        maxHp: Math.round(46 * scale),
        atk: Math.round(9 * scale),
        def: 1 + Math.floor(depth / 2),
        xpReward: Math.round(18 * scale),
        goldReward: Math.round(9 * scale),
        statuses: [],
        alerted: false,
        description: 'Nimble raider that telegraphs ferocious lunging slashes.',
      };
    case 'crypt_skeleton':
      return {
        id: nextEnemyId(),
        archetype,
        name: 'Crypt Sentinel',
        glyph: 's',
        color: '#E5DEC9',
        x,
        y,
        hp: Math.round(58 * scale),
        maxHp: Math.round(58 * scale),
        atk: Math.round(11 * scale),
        def: 2 + Math.floor(depth / 2),
        xpReward: Math.round(22 * scale),
        goldReward: Math.round(11 * scale),
        statuses: [],
        alerted: false,
        description: 'Ancient guard animated by lingering oath-runes.',
      };
    case 'bone_acolyte':
      return {
        id: nextEnemyId(),
        archetype,
        name: 'Bone Acolyte',
        glyph: 'a',
        color: '#A78BFA',
        x,
        y,
        hp: Math.round(50 * scale),
        maxHp: Math.round(50 * scale),
        atk: Math.round(10 * scale),
        def: 1 + Math.floor(depth / 2),
        xpReward: Math.round(28 * scale),
        goldReward: Math.round(14 * scale),
        statuses: [],
        alerted: false,
        description: 'Channels telegraphed Hex Bolts from afar.',
      };
    case 'ash_cultist':
      return {
        id: nextEnemyId(),
        archetype,
        name: 'Ash Cultist',
        glyph: 'c',
        color: '#FB923C',
        x,
        y,
        hp: Math.round(64 * scale),
        maxHp: Math.round(64 * scale),
        atk: Math.round(10 * scale),
        def: 2 + Math.floor(depth / 2),
        xpReward: Math.round(32 * scale),
        goldReward: Math.round(16 * scale),
        statuses: [],
        alerted: false,
        description: 'Zealot of the Ember Vaults who ignites the stone.',
      };
    case 'shadow_stalker':
      return {
        id: nextEnemyId(),
        archetype,
        name: 'Shadow Stalker',
        glyph: 'S',
        color: '#C084FC',
        x,
        y,
        hp: Math.round(69 * scale),
        maxHp: Math.round(69 * scale),
        atk: Math.round(12 * scale),
        def: 2 + Math.floor(depth / 2),
        xpReward: Math.round(38 * scale),
        goldReward: Math.round(20 * scale),
        statuses: [],
        alerted: false,
        isElite: true,
        description: 'Elusive predator that winds up lethal backstabs.',
      };
    case 'iron_golem':
      return {
        id: nextEnemyId(),
        archetype,
        name: 'Runed Iron Golem',
        glyph: 'G',
        color: '#94A3B8',
        x,
        y,
        hp: Math.round(104 * scale),
        maxHp: Math.round(104 * scale),
        atk: Math.round(13 * scale),
        def: 5 + depth,
        xpReward: Math.round(48 * scale),
        goldReward: Math.round(24 * scale),
        statuses: [],
        alerted: false,
        isElite: true,
        description: 'Armored automaton that telegraphs earth-shaking Ground Slams.',
      };
    case 'cinder_wisp':
      return {
        id: nextEnemyId(),
        archetype,
        name: 'Cinder Wisp',
        glyph: 'w',
        color: '#FBBF24',
        x,
        y,
        hp: Math.round(41 * scale),
        maxHp: Math.round(41 * scale),
        atk: Math.round(10 * scale),
        def: 1,
        xpReward: Math.round(20 * scale),
        goldReward: Math.round(10 * scale),
        statuses: [],
        alerted: false,
        description: 'Volatile spark summoned from deep obsidian hearths.',
      };
    case 'dread_wraith':
      return {
        id: nextEnemyId(),
        archetype,
        name: 'Dread Wraith',
        glyph: 'W',
        color: '#38BDF8',
        x,
        y,
        hp: Math.round(71 * scale),
        maxHp: Math.round(71 * scale),
        atk: Math.round(11 * scale),
        def: 2 + Math.floor(depth / 2),
        xpReward: Math.round(42 * scale),
        goldReward: Math.round(22 * scale),
        statuses: [],
        alerted: false,
        isElite: true,
        description: 'Frost-shrouded specter of fallen delvers that channels Soul Chill.',
      };
    case 'blight_weaver':
      return {
        id: nextEnemyId(),
        archetype,
        name: 'Blight Weaver',
        glyph: 'v',
        color: '#34D399',
        x,
        y,
        hp: Math.round(62 * scale),
        maxHp: Math.round(62 * scale),
        atk: Math.round(10 * scale),
        def: 2 + Math.floor(depth / 2),
        xpReward: Math.round(36 * scale),
        goldReward: Math.round(19 * scale),
        statuses: [],
        alerted: false,
        description: 'Venom-scribing hexer whose bolts sap vitality from afar.',
      };
    case 'obsidian_warden':
      return {
        id: nextEnemyId(),
        archetype,
        name: 'Obsidian Warden',
        glyph: 'O',
        color: '#FB7185',
        x,
        y,
        hp: Math.round(120 * scale),
        maxHp: Math.round(120 * scale),
        atk: Math.round(14 * scale),
        def: 6 + depth,
        xpReward: Math.round(58 * scale),
        goldReward: Math.round(30 * scale),
        statuses: [],
        alerted: false,
        isElite: true,
        description: 'Towering black-glass sentinel wielding crushing Obsidian Cleaves.',
      };
    case 'grave_husk':
      return {
        id: nextEnemyId(),
        archetype,
        name: 'Grave Husk',
        glyph: 'h',
        color: '#D97706',
        x,
        y,
        hp: Math.round(66 * scale),
        maxHp: Math.round(66 * scale),
        atk: Math.round(12 * scale),
        def: 3 + Math.floor(depth / 2),
        xpReward: Math.round(30 * scale),
        goldReward: Math.round(13 * scale),
        statuses: [],
        alerted: false,
        description: 'Desiccated barrow-guard. Deathless: the first killing blow leaves it standing.',
      };
    case 'spore_hulk':
      return {
        id: nextEnemyId(),
        archetype,
        name: 'Spore Hulk',
        glyph: 'H',
        color: '#84CC16',
        x,
        y,
        hp: Math.round(130 * scale),
        maxHp: Math.round(130 * scale),
        atk: Math.round(13 * scale),
        def: 4 + Math.floor(depth / 2),
        xpReward: Math.round(55 * scale),
        goldReward: Math.round(26 * scale),
        statuses: [],
        alerted: false,
        isElite: true,
        description: 'Siege-sized bloom-mother. Bursts in a spore cloud when slain — kill it at range.',
      };
    case 'rime_revenant':
      return {
        id: nextEnemyId(),
        archetype,
        name: 'Rime Revenant',
        glyph: 'R',
        color: '#7DD3FC',
        x,
        y,
        hp: Math.round(56 * scale),
        maxHp: Math.round(56 * scale),
        atk: Math.round(12 * scale),
        def: 2 + Math.floor(depth / 2),
        xpReward: Math.round(40 * scale),
        goldReward: Math.round(21 * scale),
        statuses: [],
        alerted: false,
        isElite: true,
        description: 'Frostpeak dead that refused the thaw. Its Rime Bolts Chill their target.',
      };
    case 'boss_bone_cantor':
      return {
        id: nextEnemyId(),
        archetype,
        name: 'Vaelen, Bone Cantor',
        glyph: 'B',
        color: '#F472B6',
        x,
        y,
        hp: 420,
        maxHp: 420,
        atk: 21,
        def: 5,
        xpReward: 180,
        goldReward: 65,
        isBoss: true,
        statuses: [],
        alerted: false,
        description: 'Lord of the Sunken Reliquary. Resonates with sorrowful dirges.',
      };
    case 'boss_ashen_inquisitor':
      return {
        id: nextEnemyId(),
        archetype,
        name: 'Inquisitor Serath',
        glyph: 'I',
        color: '#FB923C',
        x,
        y,
        hp: 690,
        maxHp: 690,
        atk: 29,
        def: 7,
        xpReward: 280,
        goldReward: 110,
        isBoss: true,
        statuses: [],
        alerted: false,
        description: 'High sentinel of the Ember Vaults wielding purifying cinder.',
      };
    case 'boss_malakor':
      return {
        id: nextEnemyId(),
        archetype,
        name: 'Malakor, Sovereign of Cinder',
        glyph: 'M',
        color: '#EF4444',
        x,
        y,
        hp: 1000,
        maxHp: 1000,
        atk: 36,
        def: 9,
        xpReward: 550,
        goldReward: 250,
        isBoss: true,
        statuses: [],
        alerted: false,
        description: 'The undying monarch anchored to the Obsidian Sanctum.',
      };
  }
}

const RARE_PROFILES: Array<{ title: string; skills: SkillId[] }> = [
  { title: 'Pyromancer', skills: ['ember_lance', 'frost_nova'] },
  { title: 'Nightblade', skills: ['shadowstep', 'venom_tip'] },
  { title: 'Juggernaut', skills: ['shield_bash', 'cleave'] },
  { title: 'Spellblade', skills: ['ember_lance', 'shield_bash'] },
];

export function promoteEnemyRank(enemy: Enemy, depth: number, rank: 'rare' | 'randboss'): Enemy {
  let profile = RARE_PROFILES[Math.floor(Math.random() * RARE_PROFILES.length)];
  if (enemy.archetype === 'bone_acolyte' || enemy.archetype === 'ash_cultist' || enemy.archetype === 'cinder_wisp') {
    profile = Math.random() < 0.65 ? RARE_PROFILES[0] : RARE_PROFILES[3];
  } else if (enemy.archetype === 'shadow_stalker' || enemy.archetype === 'goblin_skirmisher') {
    profile = RARE_PROFILES[1];
  } else if (enemy.archetype === 'iron_golem' || enemy.archetype === 'crypt_skeleton') {
    profile = Math.random() < 0.7 ? RARE_PROFILES[2] : RARE_PROFILES[3];
  }

  const isRandboss = rank === 'randboss';
  const hpMult = isRandboss ? 2.3 : 1.6;
  const atkMult = isRandboss ? 1.35 : 1.2;
  const defBonus = isRandboss ? 4 : 2;
  const rewardMult = isRandboss ? 4 : 2.5;

  return {
    ...enemy,
    name: `${enemy.name}, ${isRandboss ? `Dread ${profile.title}` : profile.title}`,
    hp: Math.round(enemy.hp * hpMult),
    maxHp: Math.round(enemy.maxHp * hpMult),
    atk: Math.round(enemy.atk * atkMult),
    def: enemy.def + defBonus,
    xpReward: Math.round(enemy.xpReward * rewardMult),
    goldReward: Math.round(enemy.goldReward * rewardMult),
    isElite: true,
    rank,
    rankTitle: isRandboss ? `Randboss · ${profile.title}` : `Rare · ${profile.title}`,
    skillLoadout: [...profile.skills],
    skillCooldowns: {},
    runeCharge: isRandboss || depth >= 4,
    description: `${enemy.description} Wields ${profile.skills.join(' & ').replace(/_/g, ' ')}.`,
  };
}

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

export function generateDungeonFloor(
  depth: number,
  options?: { skipStoryBoss?: boolean; sideBranch?: 'barrow' | 'mire' | 'frost' }
): ZoneMap {
  const width = 46;
  const height = 32;
  const tiles: Tile[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => makeTile(x, y, 'wall'))
  );

  const biomeNames: Record<number, { name: string; subtitle: string }> = {
    1: { name: 'Moss-Sunken Reliquary', subtitle: 'Floor 1 · Blight Spore Pools' },
    2: { name: 'Frost-Bound Ossuary', subtitle: 'Floor 2 · Cantor Crypt & Frost Vents' },
    3: { name: 'The Ember Vaults', subtitle: 'Floor 3 · Basalt Halls & Molten Crusts' },
    4: { name: 'Inquisitor Crucible', subtitle: 'Floor 4 · Brass Forges & Shock Runes' },
    5: { name: 'The Obsidian Sanctum', subtitle: 'Floor 5 · Sovereign Throne' },
  };

  const rooms: Room[] = [];
  const targetRooms = Math.min(18, 9 + depth);
  for (let attempt = 0; attempt < 95 && rooms.length < targetRooms; attempt++) {
    const w = 5 + Math.floor(Math.random() * 5);
    const h = 4 + Math.floor(Math.random() * 4);
    const x = 2 + Math.floor(Math.random() * (width - w - 4));
    const y = 2 + Math.floor(Math.random() * (height - h - 4));

    const overlaps = rooms.some(
      (r) => x <= r.x + r.w + 1 && x + w + 1 >= r.x && y <= r.y + r.h + 1 && y + h + 1 >= r.y
    );
    if (overlaps) continue;

    rooms.push({
      x,
      y,
      w,
      h,
      cx: Math.floor(x + w / 2),
      cy: Math.floor(y + h / 2),
    });

    for (let ry = y; ry < y + h; ry++) {
      for (let rx = x; rx < x + w; rx++) {
        tiles[ry][rx] = makeTile(rx, ry, 'floor');
        if (depth >= 6) {
          tiles[ry][rx].color = '#3B3054';
        } else if (depth >= 3) {
          tiles[ry][rx].color = '#483D3B';
        }
      }
    }
  }

  // Connect rooms sequentially
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1];
    const b = rooms[i];
    let cx = a.cx;
    let cy = a.cy;
    while (cx !== b.cx) {
      tiles[cy][cx] = makeTile(cx, cy, 'floor');
      if (depth >= 6) tiles[cy][cx].color = '#3B3054';
      else if (depth >= 3) tiles[cy][cx].color = '#483D3B';
      cx += cx < b.cx ? 1 : -1;
    }
    while (cy !== b.cy) {
      tiles[cy][cx] = makeTile(cx, cy, 'floor');
      if (depth >= 6) tiles[cy][cx].color = '#3B3054';
      else if (depth >= 3) tiles[cy][cx].color = '#483D3B';
      cy += cy < b.cy ? 1 : -1;
    }
  }

  const startRoom = rooms[0];
  const endRoom = rooms[rooms.length - 1];
  const spawnPoint = { x: startRoom.cx, y: startRoom.cy };
  const returnPoint = { x: endRoom.cx, y: endRoom.cy };

  tiles[spawnPoint.y][spawnPoint.x] = makeTile(spawnPoint.x, spawnPoint.y, 'stairs_up');
  tiles[returnPoint.y][returnPoint.x] = makeTile(returnPoint.x, returnPoint.y, 'stairs_down');
  if (depth === 5 && !options?.skipStoryBoss) {
    tiles[returnPoint.y][returnPoint.x].label = 'Abyssal Descent (Unlocks after Malakor falls)';
  } else if (depth >= 6 && !options?.skipStoryBoss) {
    tiles[returnPoint.y][returnPoint.x].label = `Abyssal Stair (Floor ${depth + 1})`;
  }

  // Place torches & pillars in rooms without blocking corridor entries
  rooms.forEach((room, idx) => {
    if (room.w >= 7 && room.h >= 6 && idx !== 0 && idx !== rooms.length - 1) {
      tiles[room.y + 1][room.x + 1] = makeTile(room.x + 1, room.y + 1, 'torch');
      tiles[room.y + room.h - 2][room.x + room.w - 2] = makeTile(room.x + room.w - 2, room.y + room.h - 2, 'pillar');
    } else if (
      Math.random() < 0.65 &&
      !tiles[room.y - 1]?.[room.x]?.walkable &&
      !tiles[room.y]?.[room.x - 1]?.walkable &&
      tiles[room.y][room.x].kind === 'floor'
    ) {
      tiles[room.y][room.x] = makeTile(room.x, room.y, 'torch');
    }
  });

  // Add special quest & atmospheric nodes
  const midRoom = rooms[Math.floor(rooms.length / 2)] ?? rooms[1];
  // Story quest nodes belong only to the main descent. Side dungeons reuse
  // this generator at effective depths 1-3 (skipStoryBoss), and previously
  // inherited the Floor 3 Whispering Bell — allowing repeated bell shatters
  // (+2 Attribute Points each) and duplicate quest items.
  if (depth === 1 && rooms.length > 2 && !options?.skipStoryBoss) {
    const cacheRoom = rooms[2];
    const cx = cacheRoom.cx;
    const cy = cacheRoom.cy;
    tiles[cy][cx] = makeTile(cx, cy, 'contraband_cache');
    tiles[cy][cx].interactId = 'contraband_cache';
  }
  if ((depth === 1 || depth === 2) && rooms.length > 3 && !options?.skipStoryBoss) {
    const herbRoom = rooms[3];
    tiles[herbRoom.cy][herbRoom.cx] = makeTile(herbRoom.cx, herbRoom.cy, 'herb_node');
    tiles[herbRoom.cy][herbRoom.cx].interactId = 'herb_node';
  }
  if (depth === 3 && midRoom && !options?.skipStoryBoss) {
    tiles[midRoom.cy][midRoom.cx] = makeTile(midRoom.cx, midRoom.cy, 'whispering_bell');
    tiles[midRoom.cy][midRoom.cx].interactId = 'whispering_bell';
  }

  // Place Special Landmark Rooms (Elven Waystone, Forgotten Forge, Occult Blood Altar)
  const specialRoomIndices = new Set<number>();
  const reservedRooms = new Set<number>([0, rooms.length - 1]);
  if (depth === 1 && rooms.length > 2) reservedRooms.add(2);
  if ((depth === 1 || depth === 2) && rooms.length > 3) reservedRooms.add(3);
  if (depth === 3 && rooms.length > 1) reservedRooms.add(Math.floor(rooms.length / 2));

  const candidateRooms = rooms
    .map((room, idx) => ({ room, idx }))
    .filter(({ idx }) => !reservedRooms.has(idx));

  const paintRoomFloorTint = (room: Room, tint: string) => {
    for (let ry = room.y; ry < room.y + room.h; ry++) {
      for (let rx = room.x; rx < room.x + room.w; rx++) {
        if (tiles[ry]?.[rx]?.kind === 'floor') {
          tiles[ry][rx].color = tint;
        }
      }
    }
  };

  if (candidateRooms.length > 0 && (depth <= 4 || Math.random() < 0.6)) {
    const pick = candidateRooms.shift()!;
    specialRoomIndices.add(pick.idx);
    paintRoomFloorTint(pick.room, '#284552');
    tiles[pick.room.cy][pick.room.cx] = makeTile(pick.room.cx, pick.room.cy, 'waystone');
    tiles[pick.room.cy][pick.room.cx].interactId = `waystone_${depth}`;
  }

  if (candidateRooms.length > 0) {
    const pick2 = candidateRooms.shift()!;
    specialRoomIndices.add(pick2.idx);
    const secondKind: TileKind =
      depth % 2 === 1 ? 'forgotten_forge' : 'cursed_altar';
    paintRoomFloorTint(pick2.room, secondKind === 'forgotten_forge' ? '#452A21' : '#342347');
    tiles[pick2.room.cy][pick2.room.cx] = makeTile(pick2.room.cx, pick2.room.cy, secondKind);
  }

  // ------------------------------------------------------------------
  // Phase 3: hand-built set-piece rooms — one per floor, injected into a
  // spare room's interior. Set pieces only redecorate the interior (the
  // sealed-brazier nook partitions one corner), so the reachability
  // guarantee at the end of this generator still holds: every room centre
  // stays walkable or openly connected, and boss/story placement is
  // untouched (set pieces never take the first or final room).
  // ------------------------------------------------------------------
  const setPieceRoomIndices = new Set<number>();
  const setPieceEnemies: Enemy[] = [];

  const setPieceTileOk = (x: number, y: number): boolean =>
    tiles[y]?.[x]?.kind === 'floor' &&
    (x !== spawnPoint.x || y !== spawnPoint.y) &&
    (x !== returnPoint.x || y !== returnPoint.y);

  // Decor placement may also overwrite the generator's decorative pillars
  // and torches (e.g. the corner pillar sits exactly on a Seal Brazier
  // spot) — but never gameplay tiles.
  const setPieceDecorOk = (x: number, y: number): boolean => {
    const k = tiles[y]?.[x]?.kind;
    return (
      (k === 'floor' || k === 'pillar' || k === 'torch') &&
      (x !== spawnPoint.x || y !== spawnPoint.y) &&
      (x !== returnPoint.x || y !== returnPoint.y)
    );
  };

  const setP = (x: number, y: number, kind: TileKind, label?: string, interactId?: string) => {
    tiles[y][x] = makeTile(x, y, kind);
    if (label) tiles[y][x].label = label;
    if (interactId) tiles[y][x].interactId = interactId;
  };

  const placeSetPieceEnemy = (arch: EnemyArchetype, spots: Array<{ x: number; y: number }>) => {
    for (const s of spots) {
      if (!setPieceTileOk(s.x, s.y)) continue;
      if (setPieceEnemies.some((e) => e.x === s.x && e.y === s.y)) continue;
      setPieceEnemies.push(createEnemy(arch, s.x, s.y, depth));
      return;
    }
  };

  type SetPieceKind = 'sepulcher' | 'spore_heart' | 'rime_circle' | 'sealed_brazier';
  let setPieceKind: SetPieceKind =
    options?.sideBranch === 'mire'
      ? 'spore_heart'
      : options?.sideBranch === 'frost'
        ? 'rime_circle'
        : options?.sideBranch === 'barrow' || depth === 1
          ? 'sepulcher'
          : 'sealed_brazier';

  const findSetPieceRoom = (minW: number, minH: number) =>
    rooms
      .map((room, idx) => ({ room, idx }))
      .filter(
        ({ room, idx }) =>
          !reservedRooms.has(idx) && !specialRoomIndices.has(idx) && room.w >= minW && room.h >= minH
      )
      .sort((a, b) => b.room.w * b.room.h - a.room.w * a.room.h)[0];

  let setPiecePick =
    setPieceKind === 'sealed_brazier' ? findSetPieceRoom(7, 6) : findSetPieceRoom(6, 5);
  if (!setPiecePick && setPieceKind === 'sealed_brazier') {
    setPieceKind = 'sepulcher';
    setPiecePick = findSetPieceRoom(6, 5);
  }

  if (setPiecePick) {
    const room = setPiecePick.room;
    setPieceRoomIndices.add(setPiecePick.idx);
    const { x: rx0, y: ry0, w: rw, h: rh, cx, cy } = room;

    if (setPieceKind === 'sepulcher') {
      // Whispering Sepulcher: pillar corners, twin sarcophagi guarded by
      // trapped approaches, and an epitaph stele at the heart.
      paintRoomFloorTint(room, '#3A362F');
      for (const [px, py] of [
        [rx0 + 1, ry0 + 1],
        [rx0 + rw - 2, ry0 + 1],
        [rx0 + 1, ry0 + rh - 2],
        [rx0 + rw - 2, ry0 + rh - 2],
      ]) {
        if (setPieceDecorOk(px, py)) setP(px, py, 'pillar', 'Sepulcher Pillar');
      }
      if (setPieceTileOk(cx - 2, cy)) setP(cx - 2, cy, 'chest', 'Stone Sarcophagus');
      if (setPieceTileOk(cx + 2, cy)) setP(cx + 2, cy, 'chest', 'Stone Sarcophagus');
      if (setPieceTileOk(cx, cy + 1)) setP(cx, cy + 1, 'lore_tablet', 'Sepulcher Epitaph', `lore_floor_${depth}`);
      if (setPieceTileOk(cx - 2, cy + 1)) setP(cx - 2, cy + 1, 'trap');
      if (setPieceTileOk(cx + 2, cy + 1)) setP(cx + 2, cy + 1, depth >= 2 ? 'dart_trap' : 'trap');
      const guards: EnemyArchetype[] =
        options?.sideBranch === 'barrow'
          ? ['grave_husk', 'crypt_skeleton']
          : ['crypt_skeleton', 'plague_rat'];
      placeSetPieceEnemy(guards[0], [
        { x: cx - 1, y: cy - 1 },
        { x: cx, y: cy - 1 },
      ]);
      placeSetPieceEnemy(guards[1], [
        { x: cx + 1, y: cy - 1 },
        { x: cx, y: cy + 2 },
      ]);
    } else if (setPieceKind === 'spore_heart') {
      // Spore-Heart Chamber: a cursed altar "heart" ringed by live spore
      // pools — cross the poison or skirt the walls to make the pact.
      paintRoomFloorTint(room, '#1F3D2B');
      setP(cx, cy, 'cursed_altar', 'Spore-Heart Bloom');
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (setPieceTileOk(cx + dx, cy + dy)) setP(cx + dx, cy + dy, 'spore_pool', 'Heart-Sap Pool (Poison Hazard)');
        }
      }
      if (setPieceTileOk(rx0 + 1, ry0 + 1)) setP(rx0 + 1, ry0 + 1, 'chest', 'Bloom-Husk Cache');
      placeSetPieceEnemy('spore_hulk', [
        { x: cx - 3, y: cy },
        { x: cx, y: cy - 3 },
      ]);
      placeSetPieceEnemy('blight_weaver', [
        { x: cx + 3, y: cy },
        { x: cx, y: cy + 3 },
      ]);
    } else if (setPieceKind === 'rime_circle') {
      // Rime Circle: a rimebound cache ringed by frost vents and pillars,
      // watched by the revenants who froze mid-ritual.
      paintRoomFloorTint(room, '#22384A');
      for (const [px, py] of [
        [cx - 2, cy - 2],
        [cx + 2, cy - 2],
        [cx - 2, cy + 2],
        [cx + 2, cy + 2],
      ]) {
        if (setPieceDecorOk(px, py)) setP(px, py, 'pillar', 'Rime-Circle Pillar');
      }
      for (const [hx, hy] of [
        [cx - 1, cy],
        [cx + 1, cy],
        [cx, cy - 1],
        [cx, cy + 1],
      ]) {
        if (setPieceTileOk(hx, hy)) setP(hx, hy, 'frost_vent', 'Rime-Circle Vent (Chill Hazard)');
      }
      setP(cx, cy, 'chest', 'Rimebound Cache');
      if (setPieceTileOk(cx, cy + 2)) setP(cx, cy + 2, 'lore_tablet', 'Rime-Circle Litany', `lore_floor_${depth}`);
      if (setPieceTileOk(cx - 1, cy - 2)) setP(cx - 1, cy - 2, 'dart_trap');
      placeSetPieceEnemy('rime_revenant', [
        { x: cx - 3, y: cy },
        { x: cx - 2, y: cy - 1 },
      ]);
      placeSetPieceEnemy('dread_wraith', [
        { x: cx + 3, y: cy },
        { x: cx + 2, y: cy + 1 },
      ]);
    } else {
      // Sealed Brazier Hall (main descent): a treasure nook in the corner,
      // its vault door bound to three Seal Braziers spread across the hall.
      // Lighting all three (App: interactWithTile) grinds the seal open.
      paintRoomFloorTint(room, '#3A2E28');
      setP(rx0 + 1, ry0 + 1, 'chest', 'Sealed Reliquary Cache');
      setP(rx0 + 2, ry0, 'wall');
      setP(rx0 + 2, ry0 + 1, 'vault_door', 'Brazier-Sealed Door', 'seal_door');
      setP(rx0, ry0 + 2, 'wall');
      setP(rx0 + 1, ry0 + 2, 'wall');
      setP(rx0 + 2, ry0 + 2, 'wall');
      const brazierSpots = [
        { x: rx0 + rw - 2, y: ry0 + 1 },
        { x: rx0 + rw - 2, y: ry0 + rh - 2 },
        { x: rx0 + 1, y: ry0 + rh - 2 },
      ];
      for (const s of brazierSpots) {
        if (setPieceDecorOk(s.x, s.y)) setP(s.x, s.y, 'brazier', 'Seal Brazier', 'seal_brazier');
      }
      const guards: EnemyArchetype[] =
        depth >= 6
          ? ['obsidian_warden', 'dread_wraith']
          : depth >= 4
            ? ['iron_golem', 'shadow_stalker']
            : ['crypt_skeleton', 'bone_acolyte'];
      placeSetPieceEnemy(guards[0], [
        { x: cx + 1, y: cy },
        { x: cx, y: cy },
      ]);
      placeSetPieceEnemy(guards[1], [
        { x: cx - 1, y: cy + 1 },
        { x: cx, y: cy + 1 },
      ]);
    }
  }

  // Add chests, healing braziers, lore tablets, traps
  const loot: GroundLoot[] = [];
  rooms.slice(1).forEach((room, idx) => {
    const roomIdx = idx + 1;
    const rx = room.x + 1 + Math.floor(Math.random() * Math.max(1, room.w - 2));
    const ry = room.y + 1 + Math.floor(Math.random() * Math.max(1, room.h - 2));
    if (tiles[ry][rx].kind === 'floor' && !specialRoomIndices.has(roomIdx) && !setPieceRoomIndices.has(roomIdx)) {
      if (idx % 3 === 0) {
        tiles[ry][rx] = makeTile(rx, ry, 'chest');
      } else if (idx === 1) {
        tiles[ry][rx] = makeTile(rx, ry, 'brazier');
      } else if (idx === 2) {
        tiles[ry][rx] = makeTile(rx, ry, 'lore_tablet');
        tiles[ry][rx].interactId = `lore_floor_${depth}`;
      } else if (Math.random() < 0.45) {
        // Phase 3: a second trap type — the Venom Dart Snare — joins the
        // Spike Snare in the mix from depth 2 down.
        const dart = depth >= 2 && Math.random() < 0.4;
        tiles[ry][rx] = makeTile(rx, ry, dart ? 'dart_trap' : 'trap');
      }
    }
    // Scatter thematic floor biome hazards on open floor tiles
    if (!specialRoomIndices.has(roomIdx) && !setPieceRoomIndices.has(roomIdx) && Math.random() < 0.55) {
      const hx = room.x + 1 + Math.floor(Math.random() * Math.max(1, room.w - 2));
      const hy = room.y + 1 + Math.floor(Math.random() * Math.max(1, room.h - 2));
      if (
        tiles[hy]?.[hx]?.kind === 'floor' &&
        (hx !== spawnPoint.x || hy !== spawnPoint.y) &&
        (hx !== returnPoint.x || hy !== returnPoint.y)
      ) {
        const hazardKind: TileKind =
          depth === 1
            ? 'spore_pool'
            : depth === 2
              ? Math.random() < 0.7 ? 'frost_vent' : 'spore_pool'
              : depth === 3
                ? 'ember_crust'
                : depth === 4
                  ? Math.random() < 0.7 ? 'shock_rune' : 'ember_crust'
                  : Math.random() < 0.5 ? 'ember_crust' : 'shock_rune';
        tiles[hy][hx] = makeTile(hx, hy, hazardKind);
      }
    }
    if (Math.random() < 0.45) {
      const lx = room.cx + (Math.random() < 0.5 ? 1 : -1);
      const ly = room.cy;
      if (tiles[ly]?.[lx]?.walkable && tiles[ly]?.[lx]?.kind === 'floor') {
        loot.push({
          id: `gl_${depth}_${idx}`,
          x: lx,
          y: ly,
          gold: Math.random() < 0.5 ? 8 + depth * 5 : undefined,
          item: Math.random() < 0.6 ? createConsumable(Math.random() < 0.6 ? 'heal_potion' : 'mana_potion', 1) : generateProceduralItem(depth),
        });
      }
    }
  });

  // Populate enemies
  const enemies: Enemy[] = [];
  enemies.push(...setPieceEnemies);
  const pools: Record<number, EnemyArchetype[]> = {
    1: ['plague_rat', 'goblin_skirmisher', 'crypt_skeleton'],
    2: ['goblin_skirmisher', 'crypt_skeleton', 'bone_acolyte', 'blight_weaver'],
    3: ['crypt_skeleton', 'bone_acolyte', 'ash_cultist', 'shadow_stalker', 'blight_weaver', 'dread_wraith'],
    4: ['ash_cultist', 'shadow_stalker', 'iron_golem', 'cinder_wisp', 'dread_wraith', 'obsidian_warden'],
    5: ['ash_cultist', 'shadow_stalker', 'iron_golem', 'dread_wraith', 'obsidian_warden'],
  };

  const abyssPool: EnemyArchetype[] = [
    'ash_cultist',
    'shadow_stalker',
    'iron_golem',
    'cinder_wisp',
    'bone_acolyte',
    'dread_wraith',
    'blight_weaver',
    'obsidian_warden',
    // Phase 3: the side-dungeon archetypes also haunt the Endless Abyss.
    'grave_husk',
    'spore_hulk',
    'rime_revenant',
  ];

  // Phase 3: side dungeons draw from their own biome pools so each branch
  // has a distinct roster (previously they reused the main depth pools).
  const sidePools: Record<'barrow' | 'mire' | 'frost', EnemyArchetype[]> = {
    barrow: ['crypt_skeleton', 'grave_husk', 'bone_acolyte', 'grave_husk', 'crypt_skeleton', 'plague_rat'],
    mire: ['blight_weaver', 'spore_hulk', 'plague_rat', 'blight_weaver', 'spore_hulk', 'ash_cultist'],
    frost: ['dread_wraith', 'rime_revenant', 'rime_revenant', 'iron_golem', 'obsidian_warden', 'cinder_wisp'],
  };

  const activePool: EnemyArchetype[] = options?.sideBranch
    ? sidePools[options.sideBranch]
    : depth >= 6
      ? abyssPool
      : (pools[depth] ?? pools[1]);

  let rareCount = 0;
  let roamingRandbossSpawned = false;

  rooms.slice(1).forEach((room, rIdx) => {
    const isFinalRoom = rIdx === rooms.length - 2;
    if (!options?.skipStoryBoss && isFinalRoom && (depth === 2 || depth === 4 || depth === 5)) {
      const bossType: EnemyArchetype =
        depth === 2 ? 'boss_bone_cantor' : depth === 4 ? 'boss_ashen_inquisitor' : 'boss_malakor';
      const bx = Math.max(room.x + 1, room.cx - 1);
      const by = room.cy;
      enemies.push(createEnemy(bossType, bx, by, depth));
      return;
    }

    if (!options?.skipStoryBoss && isFinalRoom && depth >= 6 && depth % 2 === 0) {
      const bossTypes: EnemyArchetype[] = ['boss_bone_cantor', 'boss_ashen_inquisitor', 'boss_malakor'];
      const arch = bossTypes[(depth / 2) % bossTypes.length];
      const warden = createEnemy(arch, Math.max(room.x + 1, room.cx - 1), room.cy, depth);
      const mult = 1 + (depth - 5) * 0.24;
      warden.name = `Abyssal Echo · ${warden.name}`;
      warden.hp = Math.round(warden.hp * mult);
      warden.maxHp = warden.hp;
      warden.atk = Math.round(warden.atk * (1 + (depth - 5) * 0.14));
      warden.def = warden.def + Math.floor((depth - 4) / 2);
      warden.xpReward = Math.round(warden.xpReward * mult);
      warden.goldReward = Math.round(warden.goldReward * mult);
      enemies.push(warden);
      return;
    }

    // Named Floor Mini-Boss Wardens on non-major-boss floors (Floors 1, 3, and odd Abyss floors)
    if (!options?.skipStoryBoss && isFinalRoom && (depth === 1 || depth === 3 || (depth >= 7 && depth % 2 === 1))) {
      const miniArch: EnemyArchetype =
        depth === 1 ? 'goblin_skirmisher' : depth === 3 ? 'blight_weaver' : 'obsidian_warden';
      const miniRank = depth === 1 ? 'rare' : 'randboss';
      const mini = promoteEnemyRank(
        createEnemy(miniArch, Math.max(room.x + 1, room.cx - 1), room.cy, depth),
        depth,
        miniRank
      );
      mini.name =
        depth === 1
          ? 'Skrag, Reliquary Gatekeeper'
          : depth === 3
            ? 'Vaelkor, Blight-Weaver Warden'
            : `Abyssal Harbinger (Depth ${depth})`;
      mini.rankTitle = depth === 1 ? 'Mini-Boss · Gatekeeper' : 'Mini-Boss · Floor Warden';
      enemies.push(mini);
      return;
    }

    const count = 1 + (Math.random() < 0.65 ? 1 : 0) + (depth >= 3 && Math.random() < 0.35 ? 1 : 0);
    const pool = activePool;
    for (let i = 0; i < count; i++) {
      const ex = room.x + 1 + Math.floor(Math.random() * Math.max(1, room.w - 2));
      const ey = room.y + 1 + Math.floor(Math.random() * Math.max(1, room.h - 2));
      if (
        tiles[ey][ex].walkable &&
        tiles[ey][ex].kind === 'floor' &&
        (ex !== spawnPoint.x || ey !== spawnPoint.y) &&
        (ex !== returnPoint.x || ey !== returnPoint.y) &&
        !enemies.some((e) => e.x === ex && e.y === ey)
      ) {
        const arch = pool[Math.floor(Math.random() * pool.length)];
        let created = createEnemy(arch, ex, ey, depth);
        if (depth >= 6 && !roamingRandbossSpawned && i === 0 && Math.random() < 0.12) {
          created = promoteEnemyRank(created, depth, 'randboss');
          roamingRandbossSpawned = true;
        } else if (depth >= 2 && rareCount < 2 && i === 0 && Math.random() < 0.16) {
          created = promoteEnemyRank(created, depth, 'rare');
          rareCount += 1;
        }
        enemies.push(created);
      }
    }
  });

  // Sealed High-Risk Treasure Vault Chamber (Depth 2+)
  if (depth >= 2 && Math.random() < 0.88) {
    const floorPoints: Array<{ x: number; y: number }> = [];
    for (let y = 2; y < height - 2; y++) {
      for (let x = 2; x < width - 2; x++) {
        if (tiles[y][x].kind === 'floor') floorPoints.push({ x, y });
      }
    }

    // Try finding an uncarved 7x5 block (5x3 interior + 1-tile perimeter walls)
    let bestVault: { vx: number; vy: number; doorX: number; doorY: number; linkX: number; linkY: number; dist: number } | null = null;
    for (let vy = 2; vy <= height - 7; vy++) {
      for (let vx = 2; vx <= width - 9; vx++) {
        let allWall = true;
        for (let py = vy - 1; py <= vy + 5 && allWall; py++) {
          for (let px = vx - 1; px <= vx + 7; px++) {
            if (tiles[py]?.[px]?.kind !== 'wall') {
              allWall = false;
              break;
            }
          }
        }
        if (!allWall) continue;

        // Find nearest existing floor tile to one of the 4 cardinal midpoints
        const doorMidpoints = [
          { dx: vx + 3, dy: vy, ox: 0, oy: -1 },
          { dx: vx + 3, dy: vy + 4, ox: 0, oy: 1 },
          { dx: vx, dy: vy + 2, ox: -1, oy: 0 },
          { dx: vx + 6, dy: vy + 2, ox: 1, oy: 0 },
        ];
        for (const mp of doorMidpoints) {
          const outX = mp.dx + mp.ox;
          const outY = mp.dy + mp.oy;
          if (outX < 1 || outX >= width - 1 || outY < 1 || outY >= height - 1) continue;
          for (const fp of floorPoints) {
            const safeL =
              mp.oy !== 0
                ? fp.x < vx || fp.x > vx + 6 || Math.sign(fp.y - (vy + 2)) === mp.oy
                : fp.y < vy || fp.y > vy + 4 || Math.sign(fp.x - (vx + 3)) === mp.ox;
            if (!safeL) continue;
            const dist = Math.abs(fp.x - outX) + Math.abs(fp.y - outY);
            if (dist >= 1 && dist <= 7 && (!bestVault || dist < bestVault.dist)) {
              bestVault = { vx, vy, doorX: mp.dx, doorY: mp.dy, linkX: fp.x, linkY: fp.y, dist };
            }
          }
        }
      }
    }

    if (bestVault) {
      const { vx, vy, doorX, doorY, linkX, linkY } = bestVault;
      for (let ry = vy + 1; ry <= vy + 3; ry++) {
        for (let rx = vx + 1; rx <= vx + 5; rx++) {
          tiles[ry][rx] = makeTile(rx, ry, 'floor');
          tiles[ry][rx].color = '#4D3D2C';
        }
      }
      // Seal entrance with Vault Door
      tiles[doorY][doorX] = makeTile(doorX, doorY, 'vault_door');

      // Carve approach corridor along safe outward axis first without breaching vault walls
      const horizDoor = doorX === vx || doorX === vx + 6;
      let cx = doorX + (doorX === vx ? -1 : doorX === vx + 6 ? 1 : 0);
      let cy = doorY + (doorY === vy ? -1 : doorY === vy + 4 ? 1 : 0);
      while (cx !== linkX || cy !== linkY) {
        const insideVaultBox = cx >= vx && cx <= vx + 6 && cy >= vy && cy <= vy + 4;
        if (!insideVaultBox && cx >= 1 && cx < width - 1 && cy >= 1 && cy < height - 1 && tiles[cy][cx].kind === 'wall') {
          tiles[cy][cx] = makeTile(cx, cy, 'floor');
        }
        if (horizDoor) {
          if (cy !== linkY) cy += cy < linkY ? 1 : -1;
          else if (cx !== linkX) cx += cx < linkX ? 1 : -1;
        } else {
          if (cx !== linkX) cx += cx < linkX ? 1 : -1;
          else if (cy !== linkY) cy += cy < linkY ? 1 : -1;
        }
      }

      // Vault Chests + Relic Inscription + Guard(s)
      tiles[vy + 1][vx + 1] = makeTile(vx + 1, vy + 1, 'chest');
      tiles[vy + 1][vx + 1].interactId = 'vault_chest';
      tiles[vy + 1][vx + 1].label = 'Vault Relic Chest';

      tiles[vy + 1][vx + 5] = makeTile(vx + 5, vy + 1, 'chest');
      tiles[vy + 1][vx + 5].interactId = 'vault_chest';
      tiles[vy + 1][vx + 5].label = 'Vault Relic Chest';

      loot.push({
        id: `gl_vault_${depth}`,
        x: vx + 3,
        y: vy + 1,
        gold: 25 + depth * 12,
        item: generateInscription(depth + 1, { minRarity: depth >= 4 ? 'Epic' : 'Rare' }),
      });

      const vaultPool = options?.sideBranch
        ? sidePools[options.sideBranch]
        : depth >= 6
          ? abyssPool
          : (pools[depth] ?? pools[2]);
      const guardArch = vaultPool[Math.floor(Math.random() * vaultPool.length)];
      // P1: guard is created at the floor's own depth and only becomes a
      // randboss in the Abyss (depth >= 6), so a vault guard can no longer
      // out-stat the final boss on the floor where he waits.
      const mainGuard = promoteEnemyRank(
        createEnemy(guardArch, vx + 3, vy + 2, depth),
        depth,
        depth >= 6 ? 'randboss' : 'rare'
      );
      enemies.push(mainGuard);

      if (depth >= 3) {
        const wingArch = vaultPool[Math.floor(Math.random() * vaultPool.length)];
        const wingGuard = promoteEnemyRank(createEnemy(wingArch, vx + 2, vy + 3, depth), depth, 'rare');
        enemies.push(wingGuard);
      }
    }
  }

  // Guarantee orthogonal walkable connectivity from spawnPoint to every room center and returnPoint
  const getReachable = (sx: number, sy: number): Set<string> => {
    const visited = new Set<string>([`${sx},${sy}`]);
    const queue: Array<{ x: number; y: number }> = [{ x: sx, y: sy }];
    const dirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const { dx, dy } of dirs) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        const k = `${nx},${ny}`;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height || visited.has(k)) continue;
        if (tiles[ny][nx].walkable) {
          visited.add(k);
          queue.push({ x: nx, y: ny });
        }
      }
    }
    return visited;
  };

  const carveFloorIfWall = (tx: number, ty: number) => {
    const t = tiles[ty]?.[tx];
    if (!t || t.walkable || t.kind === 'vault_door') return;
    tiles[ty][tx] = makeTile(tx, ty, 'floor');
    if (depth >= 6) tiles[ty][tx].color = '#3B3054';
    else if (depth >= 3) tiles[ty][tx].color = '#483D3B';
  };

  let reachable = getReachable(spawnPoint.x, spawnPoint.y);
  const targets = [...rooms.map((r) => ({ x: r.cx, y: r.cy })), returnPoint];
  for (const tgt of targets) {
    if (reachable.has(`${tgt.x},${tgt.y}`)) continue;
    let bestSrc = spawnPoint;
    let bestDist = Infinity;
    for (const key of reachable) {
      const [kx, ky] = key.split(',').map(Number);
      const d = Math.abs(kx - tgt.x) + Math.abs(ky - tgt.y);
      if (d < bestDist) {
        bestDist = d;
        bestSrc = { x: kx, y: ky };
      }
    }
    let cx = bestSrc.x;
    let cy = bestSrc.y;
    while (cx !== tgt.x) {
      carveFloorIfWall(cx, cy);
      cx += cx < tgt.x ? 1 : -1;
    }
    while (cy !== tgt.y) {
      carveFloorIfWall(cx, cy);
      cy += cy < tgt.y ? 1 : -1;
    }
    carveFloorIfWall(tgt.x, tgt.y);
    reachable = getReachable(spawnPoint.x, spawnPoint.y);
  }

  // Phase 3 ambient life: cave bats drift the galleries. Non-combat,
  // non-blocking — they only ever stand on plain floor and flee the player.
  const critters: CritterState[] = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    if (Math.random() >= 0.65) continue;
    const room = rooms[1 + Math.floor(Math.random() * Math.max(1, rooms.length - 1))];
    if (!room) continue;
    const bx = room.x + 1 + Math.floor(Math.random() * Math.max(1, room.w - 2));
    const by = room.y + 1 + Math.floor(Math.random() * Math.max(1, room.h - 2));
    if (
      tiles[by]?.[bx]?.kind === 'floor' &&
      (bx !== spawnPoint.x || by !== spawnPoint.y) &&
      !enemies.some((e) => e.x === bx && e.y === by) &&
      !critters.some((c) => c.x === bx && c.y === by)
    ) {
      critters.push(makeCritter('cave_bat', bx, by));
    }
  }

  const info =
    biomeNames[depth] ??
    (depth >= 6
      ? { name: 'The Endless Abyss', subtitle: `Floor ${depth} · Abyssal Depths` }
      : biomeNames[1]);
  return {
    id: `dungeon_${depth}` as ZoneId,
    name: info.name,
    subtitle: info.subtitle,
    isTown: false,
    depth,
    width,
    height,
    tiles,
    enemies,
    npcs: [],
    critters,
    loot,
    spawnPoint,
    returnPoint,
  };
}

export function createThornwickMap(): ZoneMap {
  const layout = [
    '############################',
    '#≈≈≈♣..#####....#####..♣≈≈≈#',
    '#≈≈....#...#....#...#...≈≈≈#',
    '#≈.....#...+....+...#....≈≈#',
    '#♣.....#####.░░.#####...♣..#',
    '#............░░........┼...#',
    '#..♣....*....░░....*.......#',
    '#............░░............#',
    'Ω░░░░░░░░░░░░░░░.....‡.....#',
    '#......Π.Π...░░............#',
    '#..*.........░░.....*...♣..#',
    '#.....#####..░░..#####.....#',
    '#.....#...#..░░..#...#..≈≈≈#',
    '#≈≈...#...+..░░..+...#..≈≈≈#',
    '#≈≈≈..#####......#####..≈≈≈#',
    '#≈≈≈≈♣.......✿........♣≈≈≈≈#',
    '############################',
  ];

  const zone = buildTownFromAscii(
    'thornwick',
    'Thornwick Fen',
    'Stilt-Timber Bog Settlement',
    layout,
    [
      { id: 'sylva', x: 16, y: 2, glyph: '@', color: '#34D399', name: 'Elder Sylva', title: 'Mire-Druid & Lorekeeper' },
      { id: 'bram', x: 9, y: 2, glyph: '@', color: '#FBBF24', name: 'Tinker Bram', title: 'Relic Scavenger' },
      { id: 'fenwick', x: 18, y: 9, glyph: '@', color: '#4ADE80', name: 'Fenwick the Fisher', title: 'Fen Fisher', homeX: 18, homeY: 9, roams: true },
    ],
    { x: 2, y: 8 },
    { x: 2, y: 8 }
  );
  zone.tiles[8][0].interactId = 'gate_to_overworld';
  zone.tiles[8][0].label = 'Gate to Silverwood Vale';
  zone.critters = [makeCritter('fen_frog', 20, 7), makeCritter('fen_frog', 12, 14)];
  return zone;
}

export function createCinderwatchMap(): ZoneMap {
  const layout = [
    '##############################',
    '#~~~║......########......║~~~#',
    '#~~........#......#.........~#',
    '#.....*....+......+....*.....#',
    '#..######..########..######..#',
    '#..#....#.....░░.....#....#..#',
    '#..#....+░░░░░░░░░░░░+....#..#',
    '#..######.....░░.....######..#',
    '#.............░░.......┼.....#',
    '#.....*.......░░.....*.......#',
    '#......‡......░░.............#',
    '#............░░░░............#',
    '#..║.........░░░░........║...#',
    '#.............░░.............#',
    '#......~......░░......~......#',
    '#~~~..........░░..........~~~#',
    '##############Ω###############',
  ];

  const zone = buildTownFromAscii(
    'cinderwatch',
    'Cinderwatch Bastion',
    'Volcanic Ridge Garrison',
    layout,
    [
      { id: 'halda', x: 6, y: 6, glyph: '@', color: '#FB923C', name: 'Forgemistress Halda', title: 'Master Runesmith' },
      { id: 'darek', x: 23, y: 6, glyph: '@', color: '#EF4444', name: 'Captain Darek', title: 'Rift Sentinel' },
      { id: 'sella', x: 10, y: 10, glyph: '@', color: '#FDE68A', name: 'Sella the Quartermaster', title: 'Bastion Quartermaster', homeX: 10, homeY: 10, roams: true },
    ],
    { x: 14, y: 14 },
    { x: 14, y: 14 }
  );
  zone.tiles[16][14].interactId = 'gate_to_overworld';
  zone.tiles[16][14].label = 'Ridge Gate to Silverwood Vale';
  zone.critters = [makeCritter('cinder_crow', 8, 10)];
  return zone;
}

export function createOverworldMap(): ZoneMap {
  const width = 48;
  const height = 26;
  const rawRows = [
    '################################################',
    '#♣♣♣♣....♣♣♣.......♣♣≈≈♣♣......Ω........♣♣♣♣♣♣♣#',
    '#♣♣......♣♣....◈.....≈≈........░.......♣♣...♣♣♣#',
    '#♣...♣♣......♣♣♣.....≈≈........░............>.♣#',
    '#♣...♣..░░>░░░░░░░░░░░≈≈░░░░░░░░░░░░░░░░░░░░░..#',
    '#♣......░............≈≈........░......♣♣....♣..#',
    '#....♣..░...♣♣.......≈≈...♣....░...............#',
    '#♣......░............≈≈........░...♣♣.....♣♣...#',
    '#.......░.....♣♣.....≈≈........░...............#',
    '#..♣....░............≈≈♣.......░.......♣.......#',
    '#.......░.....☼......≈≈........░...............#',
    '#.......░............≈≈........░..........♣....#',
    'Ω░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░Ω',
    '#.......░............≈≈........░...............#',
    '#..♣....░.....‡......≈≈........░...######......#',
    '#.......░............≈≈...♣....░...#....#..♣...#',
    '#.......░.....♣......≈≈........░...+..$.#......#',
    '#...♣...░............≈≈........░...######......#',
    '#.......░............≈≈........░...............#',
    '#♣......░..♣♣........≈≈...♣....░....♣♣.....♣...#',
    '#.......░............≈≈........░...............#',
    '#..♣....░.......♣....≈≈........░.........%%....#',
    '#.......░░░░░░░░░░░░.≈≈....░░░░░░░░░░░░░░░>.✿..#',
    '#♣..........♣.......>≈≈........░..........%....#',
    '#♣♣..♣♣.............♣≈≈...♣♣...░.....♣♣.......♣#',
    '################################Ω###############',
  ];

  const rows = rawRows.map((r) => r.padEnd(width, '#').slice(0, width));
  const zone = buildTownFromAscii(
    'overworld',
    'Silverwood Vale',
    'Frontier Overworld · Crossroads of the Realm',
    rows,
    [
      { id: 'rowan', x: 15, y: 11, glyph: '@', color: '#34D399', name: 'Rowan the Wayfarer', title: 'Outrider Scout' },
    ],
    { x: 2, y: 12 },
    { x: 45, y: 12 }
  );
  zone.isTown = false;
  zone.depth = 0;

  // Assign crisp interactIds & labels for every overworld gate & dungeon portal
  const setTileMeta = (x: number, y: number, kind: TileKind, interactId: string, label: string) => {
    zone.tiles[y][x] = makeTile(x, y, kind);
    zone.tiles[y][x].interactId = interactId;
    zone.tiles[y][x].label = label;
  };

  setTileMeta(0, 12, 'gate_city', 'gate_to_oakhaven', 'Oakhaven Outpost West Gate');
  setTileMeta(47, 12, 'gate_city', 'gate_to_highspire', 'Highspire Citadel Causeway Gate');
  setTileMeta(31, 1, 'gate_city', 'gate_to_cinderwatch', 'Cinderwatch Bastion Ridge Gate');
  setTileMeta(32, 25, 'gate_city', 'gate_to_thornwick', 'Thornwick Fen Timber Gate');

  setTileMeta(10, 4, 'stairs_down', 'to_barrow_1', 'Whispering Barrow Entrance (Lv 2–4)');
  setTileMeta(44, 3, 'stairs_down', 'to_frost_1', 'Frostpeak Cavern Entrance (Lv 5–8)');
  setTileMeta(42, 22, 'stairs_down', 'to_mire_1', 'Fungal Hollow Entrance (Lv 3–5)');
  setTileMeta(20, 23, 'stairs_down', 'to_dungeon_1', 'Sunken Reliquary Outer Descent (Lv 1–2)');

  setTileMeta(15, 2, 'waystone', 'waystone_overworld', 'Silverwood Elven Waystone');
  setTileMeta(14, 14, 'lore_tablet', 'lore_overworld_vale', 'Silverbridge Crossroads Stele');

  // Phase 3 POIs: quiet landmarks that reward a second look, never progress.
  setTileMeta(13, 18, 'pillar', 'poi_standing_stones', 'Standing Stones of the Vale');
  setTileMeta(15, 18, 'pillar', 'poi_standing_stones', 'Standing Stones of the Vale');
  setTileMeta(14, 19, 'pillar', 'poi_standing_stones', 'Standing Stones of the Vale');
  setTileMeta(14, 20, 'pillar', 'poi_standing_stones', 'Standing Stones of the Vale');
  setTileMeta(33, 19, 'brazier', 'poi_hunter_camp', "Hunter's Cold Camp");
  setTileMeta(24, 13, 'lore_tablet', 'lore_roadside_shrine', 'Roadside Shrine of the Vale');

  // Phase 3 ambient life: Vale wildlife (non-combat, flees the player).
  zone.critters = [
    makeCritter('vale_rabbit', 6, 16),
    makeCritter('vale_rabbit', 18, 20),
    makeCritter('ash_fox', 27, 8),
    makeCritter('cinder_crow', 30, 5),
  ];
  setTileMeta(14, 10, 'brazier', 'brazier_overworld', 'Wayfarer Campfire');
  setTileMeta(38, 16, 'chest', 'overworld_satchel_chest', 'Brigand Tollhouse Chest');
  setTileMeta(44, 22, 'herb_node', 'herb_node', 'Pale Nightbloom');
  zone.tiles[21][41] = makeTile(41, 21, 'spore_pool');
  zone.tiles[21][42] = makeTile(42, 21, 'spore_pool');
  zone.tiles[23][42] = makeTile(42, 23, 'spore_pool');
  zone.tiles[5][43] = makeTile(43, 5, 'frost_vent');
  zone.tiles[5][45] = makeTile(45, 5, 'frost_vent');

  // Ensure the Silverstream bridges & approaches are cleanly walkable road
  zone.tiles[4][21] = makeTile(21, 4, 'road');
  zone.tiles[4][22] = makeTile(22, 4, 'road');
  zone.tiles[12][21] = makeTile(21, 12, 'road');
  zone.tiles[12][22] = makeTile(22, 12, 'road');
  zone.tiles[23][19] = makeTile(19, 23, 'road');
  zone.tiles[22][19] = makeTile(19, 22, 'road');
  zone.tiles[22][20] = makeTile(20, 22, 'road');
  zone.tiles[24][32] = makeTile(32, 24, 'road');
  zone.tiles[23][32] = makeTile(32, 23, 'road');
  zone.tiles[22][32] = makeTile(32, 22, 'road');
  zone.tiles[2][31] = makeTile(31, 2, 'road');
  zone.tiles[3][31] = makeTile(31, 3, 'road');
  zone.tiles[2][15] = makeTile(15, 2, 'waystone');
  zone.tiles[2][15].interactId = 'waystone_overworld';
  zone.tiles[2][15].label = 'Silverwood Elven Waystone';
  zone.tiles[3][15] = makeTile(15, 3, 'floor');
  zone.tiles[4][44] = makeTile(44, 4, 'road');

  // Populate overworld encounters (kept clear of Oakhaven west road spawn)
  const brigandCaptain = promoteEnemyRank(createEnemy('shadow_stalker', 37, 16, 2), 2, 'rare');
  brigandCaptain.id = 'overworld_brigand_captain';
  brigandCaptain.name = 'Harlan, Silverbridge Brigand';
  brigandCaptain.rankTitle = 'Rare Outlaw · Tollhouse';

  zone.enemies = [
    createEnemy('plague_rat', 9, 17, 1),
    createEnemy('goblin_skirmisher', 11, 7, 1),
    createEnemy('crypt_skeleton', 12, 5, 2),
    createEnemy('goblin_skirmisher', 28, 17, 2),
    createEnemy('goblin_skirmisher', 34, 16, 2),
    brigandCaptain,
    createEnemy('blight_weaver', 39, 21, 3),
    createEnemy('plague_rat', 37, 23, 2),
    createEnemy('iron_golem', 40, 5, 4),
    createEnemy('cinder_wisp', 35, 6, 3),
  ];

  zone.loot = [
    {
      id: 'gl_overworld_camp',
      x: 17,
      y: 11,
      gold: 18,
      item: createConsumable('heal_potion', 1),
    },
    {
      id: 'gl_overworld_ridge',
      x: 38,
      y: 6,
      gold: 30,
      item: generateProceduralItem(3),
    },
  ];

  return zone;
}

export function generateSideDungeonFloor(
  branch: 'barrow' | 'mire' | 'frost',
  floorNum: number
): ZoneMap {
  const effectiveDepth =
    branch === 'barrow'
      ? 1 + floorNum
      : branch === 'mire'
        ? 2 + floorNum
        : 3 + floorNum;

  const zone = generateDungeonFloor(effectiveDepth, { skipStoryBoss: true, sideBranch: branch });
  const zoneId = `${branch}_${floorNum}` as ZoneId;
  zone.id = zoneId;

  const titles: Record<
    string,
    {
      name: string;
      subtitle: string;
      upLabel: string;
      downLabel?: string;
      boss?: { id: string; name: string; title: string; arch: EnemyArchetype; chestLabel: string };
    }
  > = {
    barrow_1: {
      name: 'Whispering Barrow · Upper Vaults',
      subtitle: 'Barrow Floor 1 · Spectral Crypts',
      upLabel: 'Ascend to Silverwood Vale',
      downLabel: 'Descent to Morvath’s Crypt (Floor 2)',
    },
    barrow_2: {
      name: 'Whispering Barrow · Morvath’s Crypt',
      subtitle: 'Barrow Floor 2 · Wight-Lord Sanctum',
      upLabel: 'Ascend to Upper Vaults (Floor 1)',
      boss: {
        id: 'boss_morvath',
        name: 'Arch-Wight Morvath',
        title: 'Barrow Sovereign · Side Boss',
        arch: 'dread_wraith',
        chestLabel: 'Morvath’s Barrow Chest',
      },
    },
    mire_1: {
      name: 'Fungal Hollow · Spore Galleries',
      subtitle: 'Hollow Floor 1 · Bioluminescent Mire',
      upLabel: 'Ascend to Silverwood Vale',
      downLabel: 'Descent to Mycelial Heart (Floor 2)',
    },
    mire_2: {
      name: 'Fungal Hollow · Mycelial Heart',
      subtitle: 'Hollow Floor 2 · Spore-Matron Lair',
      upLabel: 'Ascend to Spore Galleries (Floor 1)',
      boss: {
        id: 'boss_vexis',
        name: 'Spore-Matron Vexis',
        title: 'Broodmother of the Mire · Side Boss',
        arch: 'blight_weaver',
        chestLabel: 'Mycelial Relic Chest',
      },
    },
    frost_1: {
      name: 'Frostpeak Cavern · Glacial Drift',
      subtitle: 'Frostpeak Floor 1 · Rime Tunnels',
      upLabel: 'Ascend to Silverwood Vale',
      downLabel: 'Descent to Shattered Chasm (Floor 2)',
    },
    frost_2: {
      name: 'Frostpeak Cavern · Shattered Chasm',
      subtitle: 'Frostpeak Floor 2 · Frozen Rune Vaults',
      upLabel: 'Ascend to Glacial Drift (Floor 1)',
      downLabel: 'Descent to Ashen Caldera (Floor 3)',
    },
    frost_3: {
      name: 'Ashen Caldera · Magma Heart',
      subtitle: 'Caldera Floor 3 · Crucible Core',
      upLabel: 'Ascend to Shattered Chasm (Floor 2)',
      boss: {
        id: 'boss_kaelthar',
        name: 'Ignis-Warden Kaelthar',
        title: 'Lord of the Caldera · Side Boss',
        arch: 'obsidian_warden',
        chestLabel: 'Caldera Relic Hoard',
      },
    },
  };

  const meta = titles[zoneId];
  if (meta) {
    zone.name = meta.name;
    zone.subtitle = meta.subtitle;
    zone.tiles[zone.spawnPoint.y][zone.spawnPoint.x].label = meta.upLabel;
    if (meta.downLabel && zone.tiles[zone.returnPoint.y]?.[zone.returnPoint.x]?.kind === 'stairs_down') {
      zone.tiles[zone.returnPoint.y][zone.returnPoint.x].label = meta.downLabel;
    }
  }

  // Re-tag lore tablets & bias side-dungeon hazards to their biome
  for (let y = 0; y < zone.height; y++) {
    for (let x = 0; x < zone.width; x++) {
      if (zone.tiles[y][x].kind === 'lore_tablet') {
        zone.tiles[y][x].interactId = `lore_${branch}`;
      }
      if (branch === 'mire' && (zone.tiles[y][x].kind === 'frost_vent' || zone.tiles[y][x].kind === 'ember_crust')) {
        zone.tiles[y][x] = makeTile(x, y, 'spore_pool');
      }
      if (branch === 'frost' && floorNum <= 2 && zone.tiles[y][x].kind === 'ember_crust') {
        zone.tiles[y][x] = makeTile(x, y, 'frost_vent');
      }
    }
  }

  // On terminal floor of a side dungeon, swap stairs_down into a guarded Relic Chest + sole named side boss
  if (meta?.boss) {
    const rx = zone.returnPoint.x;
    const ry = zone.returnPoint.y;
    zone.tiles[ry][rx] = makeTile(rx, ry, 'chest');
    zone.tiles[ry][rx].label = meta.boss.chestLabel;
    zone.tiles[ry][rx].interactId = `${zoneId}_boss_chest`;

    // Find a free walkable tile near the hoard chest so the boss never stacks on another enemy or wall
    let bx = Math.max(2, rx - 1);
    let by = ry;
    let placed = false;
    for (let radius = 1; radius <= 5 && !placed; radius++) {
      for (let dy = -radius; dy <= radius && !placed; dy++) {
        for (let dx = -radius; dx <= radius && !placed; dx++) {
          if (dx === 0 && dy === 0) continue;
          const cx = rx + dx;
          const cy = ry + dy;
          if (
            zone.tiles[cy]?.[cx]?.walkable &&
            (cx !== zone.spawnPoint.x || cy !== zone.spawnPoint.y) &&
            !zone.enemies.some((e) => e.x === cx && e.y === cy)
          ) {
            bx = cx;
            by = cy;
            placed = true;
          }
        }
      }
    }
    if (!placed) {
      zone.enemies = zone.enemies.filter((e) => e.x !== bx || e.y !== by);
    }

    const boss = promoteEnemyRank(
      createEnemy(meta.boss.arch, bx, by, effectiveDepth + 1),
      effectiveDepth + 1,
      'randboss'
    );
    // P1: side bosses are tuned explicitly so none of them out-stats the
    // final boss (the Kaelthar inversion: 359 HP / 57 ATK vs Malakor's
    // 230 / 24 before this pass). Kaelthar needs the deepest cut because
    // his warden base and effective depth 7 stack the highest.
    const SIDE_BOSS_TUNE: Record<string, { hp: number; atk: number }> = {
      boss_morvath: { hp: 1.25, atk: 0.9 },
      boss_vexis: { hp: 1.25, atk: 0.9 },
      boss_kaelthar: { hp: 0.62, atk: 0.6 },
    };
    const tune = SIDE_BOSS_TUNE[meta.boss.id] ?? { hp: 1, atk: 1 };
    boss.hp = Math.round(boss.hp * tune.hp);
    boss.maxHp = Math.round(boss.maxHp * tune.hp);
    boss.atk = Math.max(1, Math.round(boss.atk * tune.atk));
    boss.id = meta.boss.id;
    boss.name = meta.boss.name;
    boss.rankTitle = meta.boss.title;
    boss.isBoss = true;
    zone.enemies.push(boss);
  }

  return zone;
}

export function generateZoneById(zoneId: ZoneId): ZoneMap | null {
  if (zoneId === 'oakhaven') return createOakhavenMap();
  if (zoneId === 'overworld') return createOverworldMap();
  if (zoneId === 'highspire') return createHighspireMap();
  if (zoneId === 'thornwick') return createThornwickMap();
  if (zoneId === 'cinderwatch') return createCinderwatchMap();
  if (zoneId.startsWith('dungeon_')) {
    const d = Number(zoneId.replace('dungeon_', ''));
    return Number.isFinite(d) && d >= 1 ? generateDungeonFloor(d) : null;
  }
  if (zoneId.startsWith('barrow_')) {
    const f = Number(zoneId.replace('barrow_', ''));
    return Number.isFinite(f) && f >= 1 && f <= 2 ? generateSideDungeonFloor('barrow', f) : null;
  }
  if (zoneId.startsWith('mire_')) {
    const f = Number(zoneId.replace('mire_', ''));
    return Number.isFinite(f) && f >= 1 && f <= 2 ? generateSideDungeonFloor('mire', f) : null;
  }
  if (zoneId.startsWith('frost_')) {
    const f = Number(zoneId.replace('frost_', ''));
    return Number.isFinite(f) && f >= 1 && f <= 3 ? generateSideDungeonFloor('frost', f) : null;
  }
  return null;
}

export function createInitialZones(): Record<ZoneId, ZoneMap> {
  return {
    oakhaven: createOakhavenMap(),
    overworld: createOverworldMap(),
    highspire: createHighspireMap(),
    thornwick: createThornwickMap(),
    cinderwatch: createCinderwatchMap(),
    dungeon_1: generateDungeonFloor(1),
    dungeon_2: generateDungeonFloor(2),
    dungeon_3: generateDungeonFloor(3),
    dungeon_4: generateDungeonFloor(4),
    dungeon_5: generateDungeonFloor(5),
  };
}

export interface ZoneContextBrief {
  lore: string;
  tactical: string;
  recommended: string;
}

export function getZoneContext(zoneId: ZoneId, depth: number): ZoneContextBrief {
  if (zoneId === 'oakhaven') {
    return {
      lore: 'A timber frontier watchpost built around the outer Reliquary stair. Torin’s forge and Mira’s apothecary keep delvers supplied.',
      tactical: 'Safe Haven · Step out the West Gate (Ω) onto Silverwood Vale Overworld, or descend >> into the Reliquary.',
      recommended: 'Town Sanctuary',
    };
  }
  if (zoneId === 'overworld') {
    return {
      lore: 'Twilight forest roads, Silverstream crossings, and ruined watchtowers linking Oakhaven, Thornwick Fen, Highspire, and Cinderwatch.',
      tactical: 'Overworld · Speak with Rowan at Silverbridge, hunt brigands, attune the forest Waystone, or enter 4 dungeon regions.',
      recommended: 'Lv 1–6 Overworld',
    };
  }
  if (zoneId === 'highspire') {
    return {
      lore: 'Marble sanctuary perched above the sunken vaults. Guildmaster Kaelen and Archivist Lyra coordinate expeditions to Floor 5.',
      tactical: 'Safe Haven · Temper gear, trade Relics with Orin, and attune the Whispering Bell.',
      recommended: 'Citadel Sanctuary',
    };
  }
  if (zoneId === 'thornwick') {
    return {
      lore: 'A stilt-timber bog hamlet tucked beside the Fungal Hollow. Elder Sylva tends the mire wards while Tinker Bram salvages deep curios.',
      tactical: 'Safe Haven · Trade with Tinker Bram or help Elder Sylva cleanse Fungal Hollow to the east.',
      recommended: 'Fen Sanctuary',
    };
  }
  if (zoneId === 'cinderwatch') {
    return {
      lore: 'An iron-bound basalt garrison guarding the Frostpeak & Caldera passes. Forgemistress Halda tempers volcanic steel.',
      tactical: 'Safe Haven · Gear up with Halda’s Runesmith stock or take bounties from Captain Darek.',
      recommended: 'Ridge Sanctuary',
    };
  }
  if (zoneId.startsWith('barrow_')) {
    return {
      lore: 'Ancient pre-Citadel barrow tombs haunted by skeletal guardians and Arch-Wight Morvath.',
      tactical: 'Side Dungeon (2 Floors) · Defeat Arch-Wight Morvath on Floor 2 for Barrow Relics and Captain Darek’s bounty.',
      recommended: 'Lv 2–4',
    };
  }
  if (zoneId.startsWith('mire_')) {
    return {
      lore: 'Bioluminescent subterranean caverns choked with toxic spore pools beneath Thornwick Fen.',
      tactical: 'Side Dungeon (2 Floors) · Watch Blight Spore Pools and slay Spore-Matron Vexis on Floor 2.',
      recommended: 'Lv 3–5',
    };
  }
  if (zoneId.startsWith('frost_')) {
    return {
      lore: 'Rime-crusted crystal galleries descending straight into the molten veins of the Ashen Caldera.',
      tactical: 'Side Dungeon (3 Floors) · Brave Frost Vents & Shock Runes to reach Ignis-Warden Kaelthar on Floor 3.',
      recommended: 'Lv 5–8',
    };
  }
  if (depth === 1) {
    return {
      lore: 'Cold limestone arches scarred by decades of treasure hunters and restless bone-sentinels.',
      tactical: 'Watch skeletal archer lines of fire and spike snares (Agility 3+ spots traps automatically).',
      recommended: 'Lv 1–2',
    };
  }
  if (depth === 2) {
    return {
      lore: 'Echoing ossuary galleries where Bone Cantors weave protective wards over the dead.',
      tactical: 'Sealed Treasure Vaults appear here—expect Rare skill-using guards behind amber doors.',
      recommended: 'Lv 2–4',
    };
  }
  if (depth === 3) {
    return {
      lore: 'Basalt forge-halls warmed by deep fissures, home to Stone Golems and the Whispering Bell.',
      tactical: 'Step off red Ground Slam tiles when Golems wind up, or break them with Stuns.',
      recommended: 'Lv 4–6',
    };
  }
  if (depth === 4) {
    return {
      lore: 'The Inquisitor Crucible burns with cinder wards and high-ranking Reliquary champions.',
      tactical: 'Unlocks Milestone Prodigies at Lv 6+. Temper equipment to +2/+3 before entering Floor 5.',
      recommended: 'Lv 6–8',
    };
  }
  if (depth === 5) {
    return {
      lore: 'Black glass columns frame the Obsidian Sanctum where Malakor guards the Ashen Glyph.',
      tactical: 'Boss Floor: Malakor, Sovereign of Cinder awaits. Bring full Runes, Infusions & Draughts.',
      recommended: 'Lv 8+',
    };
  }
  return {
    lore: `Untamed reality fractures across Abyssal Depth ${depth}, teeming with empowered champions.`,
    tactical: `Endless Abyss (Floor ${depth}): Randbosses and Relic-tier Sealed Vaults scale with depth.`,
    recommended: `Lv ${Math.max(9, depth + 4)}+`,
  };
}

