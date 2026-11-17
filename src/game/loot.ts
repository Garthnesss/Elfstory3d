import {
  ConsumableKind,
  Item,
  ItemAffixId,
  ItemRarity,
  ItemSlot,
  ItemStats,
  PlayerState,
  RelicSetId,
} from './types';

export const RELIC_SETS: Record<
  RelicSetId,
  { name: string; bonusLabel: string; summary: string; pieces: string[] }
> = {
  starlight_outrider: {
    name: 'Starlight Outrider',
    bonusLabel: '+4 ATK · +8% Crit · +6% Dodge · +10 Max HP',
    summary: '2-Piece Set: Elven ranger regalia woven with silver-star thread.',
    pieces: ['Sylvanthorn Longblade', 'Starlight Outrider Mantle'],
  },
  cinderforged: {
    name: 'Cinderforged Covenant',
    bonusLabel: '+4 DEF · +6 Spell · +6 Thorns · +15 Max HP',
    summary: '2-Piece Set: Obsidian-plate & emberheart wards tempered in deep vaults.',
    pieces: ['Cinderforged Crown', 'Emberheart Signet'],
  },
  thornbound: {
    name: 'Thornbound Covenant',
    bonusLabel: '+3 ATK · +4 Thorns · +3% Lifesteal · +12 Max HP',
    summary: '2-Piece Set: Fen-root regalia grown, not forged, in the Fungal Hollow.',
    pieces: ['Thornbound Circlet', 'Fenroot Talisman'],
  },
  rimebound: {
    name: 'Rimebound Regalia',
    bonusLabel: '+5 DEF · +8% Dodge · +10 Max Mana · +8 Max HP',
    summary: '2-Piece Set: Glacier-heart plate sealed in Frostpeak rime.',
    pieces: ['Glacierheart Pendant', 'Rimebound Plate'],
  },
};

let lootCounter = 100;
function nextItemId(): string {
  lootCounter += 1;
  return `itm_${Date.now().toString(36)}_${lootCounter}`;
}

export const RARITY_COLOR: Record<ItemRarity, string> = {
  Common: '#C2B9A7',
  Uncommon: '#4EA885',
  Rare: '#5B8DEF',
  Epic: '#C084FC',
  Relic: '#F59E0B',
};

const SLOT_BASES: Record<ItemSlot, Array<{ name: string; glyph: string; primary: keyof ItemStats; secondary?: keyof ItemStats }>> = {
  weapon: [
    { name: 'Iron Longsword', glyph: '/', primary: 'atk' },
    { name: 'Obsidian Dagger', glyph: '†', primary: 'atk', secondary: 'critChance' },
    { name: 'Runed Ash Staff', glyph: '⚚', primary: 'spellPower', secondary: 'maxMana' },
    { name: 'Halberd', glyph: '↑', primary: 'atk', secondary: 'def' },
    { name: 'Cinder Falchion', glyph: '⚔', primary: 'atk', secondary: 'spellPower' },
  ],
  armor: [
    { name: 'Brigandine Coat', glyph: '⛨', primary: 'def', secondary: 'maxHp' },
    { name: 'Shadowweave Vest', glyph: '▒', primary: 'def', secondary: 'dodgeChance' },
    { name: 'Plate Cuirass', glyph: '☗', primary: 'def', secondary: 'thorns' },
    { name: 'Archivist Robes', glyph: '☥', primary: 'spellPower', secondary: 'maxMana' },
  ],
  helm: [
    { name: 'Barred Sallet', glyph: '⍾', primary: 'def', secondary: 'maxHp' },
    { name: 'Raven Hood', glyph: '∩', primary: 'dodgeChance', secondary: 'critChance' },
    { name: 'Rune Circlet', glyph: '⍟', primary: 'spellPower', secondary: 'maxMana' },
  ],
  ring: [
    { name: 'Signet Band', glyph: '°', primary: 'atk', secondary: 'critChance' },
    { name: 'Opal Loop', glyph: '◦', primary: 'spellPower', secondary: 'maxMana' },
    { name: 'Bastion Ring', glyph: '○', primary: 'def', secondary: 'maxHp' },
  ],
  amulet: [
    { name: 'Amber Pendant', glyph: '◈', primary: 'maxHp', secondary: 'def' },
    { name: 'Aether Locket', glyph: '❖', primary: 'maxMana', secondary: 'spellPower' },
    { name: 'Tooth Talisman', glyph: '◊', primary: 'critChance', secondary: 'lifesteal' },
  ],
};

const PREFIXES: Array<{ name: string; stat: keyof ItemStats; mult: number }> = [
  { name: 'Keen', stat: 'atk', mult: 1.2 },
  { name: 'Tempered', stat: 'def', mult: 1.2 },
  { name: 'Aetherial', stat: 'spellPower', mult: 1.25 },
  { name: 'Stalwart', stat: 'maxHp', mult: 2.5 },
  { name: 'Whispering', stat: 'dodgeChance', mult: 1.4 },
  { name: 'Wicked', stat: 'critChance', mult: 1.5 },
  { name: 'Vampiric', stat: 'lifesteal', mult: 1 },
  { name: 'Barbed', stat: 'thorns', mult: 1.3 },
];

const SUFFIXES: Array<{ name: string; stat: keyof ItemStats; mult: number }> = [
  { name: 'of Ash', stat: 'spellPower', mult: 1 },
  { name: 'of the Bastion', stat: 'def', mult: 1 },
  { name: 'of Precision', stat: 'critChance', mult: 1.3 },
  { name: 'of Resolve', stat: 'maxHp', mult: 2.2 },
  { name: 'of Echoes', stat: 'maxMana', mult: 1.8 },
  { name: 'of Ruin', stat: 'atk', mult: 1.1 },
  { name: 'of Mists', stat: 'dodgeChance', mult: 1.2 },
];

const AFFIX_POOL: Array<{ id: ItemAffixId; label: string }> = [
  { id: 'bleed_on_crit', label: 'Passive: Critical hits inflict Bleed (2t)' },
  { id: 'mana_on_kill', label: 'Passive: Slaying a foe restores 4 Mana' },
  { id: 'thorns_burst', label: 'Passive: Reflects +4 extra damage when hit' },
  { id: 'first_strike', label: 'Passive: First hit in each skirmish deals +35% dmg' },
  { id: 'execute_bonus', label: 'Passive: +25% damage to foes below 40% HP' },
  { id: 'chill_on_hit', label: 'Passive: Strikes have 30% chance to Chill target' },
  { id: 'vampiric_touch', label: 'Passive: Heals 3 HP on every Critical Hit' },
  { id: 'arcane_ward', label: 'Passive: Start floor with Shielded (+4 DEF, 4t)' },
];

function rollRarity(depth: number, forceMinRarity?: ItemRarity): ItemRarity {
  const order: ItemRarity[] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Relic'];
  const roll = Math.random() * 100 + depth * 9;
  let picked: ItemRarity = 'Common';
  if (roll > 118) picked = 'Relic';
  else if (roll > 96) picked = 'Epic';
  else if (roll > 72) picked = 'Rare';
  else if (roll > 42) picked = 'Uncommon';

  if (forceMinRarity) {
    const minIdx = order.indexOf(forceMinRarity);
    if (order.indexOf(picked) < minIdx) picked = forceMinRarity;
  }
  return picked;
}

export function generateProceduralItem(
  depth: number,
  options?: { slot?: ItemSlot; minRarity?: ItemRarity }
): Item {
  const slots: ItemSlot[] = ['weapon', 'armor', 'helm', 'ring', 'amulet'];
  const slot = options?.slot ?? slots[Math.floor(Math.random() * slots.length)];
  const rarity = rollRarity(depth, options?.minRarity);
  const rarityScale =
    rarity === 'Common' ? 1 : rarity === 'Uncommon' ? 1.35 : rarity === 'Rare' ? 1.75 : rarity === 'Epic' ? 2.2 : 2.7;

  const baseList = SLOT_BASES[slot];
  const base = baseList[Math.floor(Math.random() * baseList.length)];
  const power = Math.max(1, Math.round((1.8 + depth * 1.1) * rarityScale));

  const stats: ItemStats = {};
  const addStat = (stat: keyof ItemStats, amount: number) => {
    stats[stat] = (stats[stat] ?? 0) + Math.max(1, Math.round(amount));
  };

  const scaleForStat = (stat: keyof ItemStats, basePower: number) => {
    if (stat === 'maxHp') return basePower * 3;
    if (stat === 'maxMana') return basePower * 2;
    if (stat === 'critChance' || stat === 'dodgeChance') return Math.min(18, Math.max(2, Math.round(basePower * 1.4)));
    if (stat === 'lifesteal') return Math.min(10, Math.max(2, Math.round(basePower * 0.7)));
    return basePower;
  };

  addStat(base.primary, scaleForStat(base.primary, power));
  if (base.secondary && rarity !== 'Common') {
    addStat(base.secondary, Math.max(1, Math.round(scaleForStat(base.secondary, power * 0.55))));
  }

  let name = base.name;
  if (rarity !== 'Common') {
    const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
    name = `${prefix.name} ${name}`;
    addStat(prefix.stat, Math.max(1, Math.round(power * 0.65 * prefix.mult)));
  }

  if (rarity === 'Rare' || rarity === 'Epic' || rarity === 'Relic') {
    const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
    name = `${name} ${suffix.name}`;
    addStat(suffix.stat, Math.max(1, Math.round(power * 0.6 * suffix.mult)));
  }

  let affix: ItemAffixId | undefined;
  let affixLabel: string | undefined;
  if (rarity === 'Rare' || rarity === 'Epic' || rarity === 'Relic') {
    const pickedAffix = AFFIX_POOL[Math.floor(Math.random() * AFFIX_POOL.length)];
    affix = pickedAffix.id;
    affixLabel = pickedAffix.label;
  }

  const value = Math.round(14 * rarityScale + depth * 10);

  const biomeOrigins: Record<number, string> = {
    1: 'Moss-Sunken Reliquary',
    2: 'Frost-Bound Ossuary',
    3: 'Ember Vaults',
    4: 'Inquisitor Crucible',
    5: 'Obsidian Sanctum',
  };
  const originLabel = depth >= 6 ? 'Endless Abyss' : biomeOrigins[depth] ?? 'outer catacombs';

  return {
    id: nextItemId(),
    name,
    category: 'equipment',
    slot,
    rarity,
    glyph: base.glyph,
    levelReq: Math.max(1, depth),
    upgradeLevel: 0,
    stats,
    affix,
    affixLabel,
    value,
    description: `${rarity} ${slot} recovered from the ${originLabel}.`,
  };
}

export function createConsumable(kind: ConsumableKind, quantity = 1): Item {
  switch (kind) {
    case 'heal_potion':
      return {
        id: nextItemId(),
        name: 'Crimson Draught',
        category: 'consumable',
        consumableKind: 'heal_potion',
        rarity: 'Common',
        glyph: '!',
        levelReq: 1,
        upgradeLevel: 0,
        stats: {},
        value: 18,
        quantity,
        description: 'Restores at least 35% of Max HP immediately without ending your combat poise.',
      };
    case 'mana_potion':
      return {
        id: nextItemId(),
        name: 'Aether Vial',
        category: 'consumable',
        consumableKind: 'mana_potion',
        rarity: 'Uncommon',
        glyph: '¡',
        levelReq: 1,
        upgradeLevel: 0,
        stats: {},
        value: 22,
        quantity,
        description: 'Restores at least 40% of Max Mana and clears minor fatigue.',
      };
    case 'scroll_blink':
      return {
        id: nextItemId(),
        name: 'Scroll of Phase',
        category: 'consumable',
        consumableKind: 'scroll_blink',
        rarity: 'Rare',
        glyph: '?',
        levelReq: 1,
        upgradeLevel: 0,
        stats: {},
        value: 32,
        quantity,
        description: 'Instantly blinks you away to a safe nearby floor tile.',
      };
    case 'ward_talisman':
      return {
        id: nextItemId(),
        name: 'Warden Charm',
        category: 'consumable',
        consumableKind: 'ward_talisman',
        rarity: 'Uncommon',
        glyph: '◊',
        levelReq: 1,
        upgradeLevel: 0,
        stats: {},
        value: 26,
        quantity,
        description: 'Grants Shielded (+7 DEF for 4 turns).',
      };
    case 'throwing_knife':
      return {
        id: nextItemId(),
        name: 'Serrated Dart',
        category: 'consumable',
        consumableKind: 'throwing_knife',
        rarity: 'Common',
        glyph: '-',
        levelReq: 1,
        upgradeLevel: 0,
        stats: {},
        value: 14,
        quantity,
        description: 'Strikes the nearest visible foe for 14 damage + Bleed.',
      };
  }
}

export function createStarterItem(tag: string): Item {
  if (tag === 'starter_vanguard') {
    return {
      id: nextItemId(),
      name: 'Recruit Broadsword',
      category: 'equipment',
      slot: 'weapon',
      rarity: 'Uncommon',
      glyph: '/',
      levelReq: 1,
      upgradeLevel: 0,
      stats: { atk: 5, def: 1 },
      value: 24,
      description: 'Balanced steel issued to Oakhaven gate-guards.',
    };
  }
  if (tag === 'starter_shadow') {
    return {
      id: nextItemId(),
      name: 'Twin-Edged Dirk',
      category: 'equipment',
      slot: 'weapon',
      rarity: 'Uncommon',
      glyph: '†',
      levelReq: 1,
      upgradeLevel: 0,
      stats: { atk: 4, critChance: 7, dodgeChance: 3 },
      value: 24,
      description: 'Light blackened blade favoring vital gaps.',
    };
  }
  if (tag === 'starter_rune') {
    return {
      id: nextItemId(),
      name: 'Charred Oak Focus',
      category: 'equipment',
      slot: 'weapon',
      rarity: 'Uncommon',
      glyph: '⚚',
      levelReq: 1,
      upgradeLevel: 0,
      stats: { atk: 2, spellPower: 6, maxMana: 6 },
      value: 24,
      description: 'Etched with silver cinder-glyphs to channel ember spells.',
    };
  }
  return {
    id: nextItemId(),
    name: "Traveler's Sabre",
    category: 'equipment',
    slot: 'weapon',
    rarity: 'Uncommon',
    glyph: '/',
    levelReq: 1,
    upgradeLevel: 0,
    stats: { atk: 4, spellPower: 3, critChance: 4 },
    value: 24,
    description: 'Versatile curved blade carried across border roads.',
  };
}

export function createNamedRelic(tag: string): Item {
  switch (tag) {
    case 'vex_whisperblade':
      return {
        id: nextItemId(),
        name: "Vex's Whisperblade",
        category: 'equipment',
        slot: 'weapon',
        rarity: 'Relic',
        glyph: '†',
        levelReq: 2,
        upgradeLevel: 0,
        stats: { atk: 12, critChance: 12, dodgeChance: 6 },
        affix: 'bleed_on_crit',
        affixLabel: 'Passive: Critical hits inflict Bleed (2t)',
        value: 145,
        description: 'Smuggler heirloom forged from silent star-iron.',
      };
    case 'warden_oathplate':
      return {
        id: nextItemId(),
        name: "Warden's Oathplate",
        category: 'equipment',
        slot: 'armor',
        rarity: 'Relic',
        glyph: '☗',
        levelReq: 2,
        upgradeLevel: 0,
        stats: { def: 11, maxHp: 22, thorns: 5 },
        affix: 'arcane_ward',
        affixLabel: 'Passive: Start floor with Shielded (+4 DEF, 4t)',
        value: 150,
        description: 'Ceremonial Highspire plate tempered against crypt hexes.',
      };
    case 'chime_first_ash':
      return {
        id: nextItemId(),
        name: 'Chime of First Ash',
        category: 'equipment',
        slot: 'amulet',
        rarity: 'Relic',
        glyph: '❖',
        levelReq: 3,
        upgradeLevel: 0,
        stats: { spellPower: 12, maxMana: 16, critChance: 6 },
        affix: 'mana_on_kill',
        affixLabel: 'Passive: Slaying a foe restores 4 Mana',
        value: 185,
        description: 'Resonates softly whenever an arcane glyph is spoken.',
      };
    case 'citadel_halberd':
      return {
        id: nextItemId(),
        name: 'Magistrate Greatspear',
        category: 'equipment',
        slot: 'weapon',
        rarity: 'Epic',
        glyph: '↑',
        levelReq: 3,
        upgradeLevel: 0,
        stats: { atk: 15, def: 4, maxHp: 12 },
        affix: 'execute_bonus',
        affixLabel: 'Passive: +25% damage to foes below 40% HP',
        value: 160,
        description: 'Presented by Magistrate Corvus to Citadel champions.',
      };
    case 'sylvan_longblade':
      return {
        id: nextItemId(),
        name: 'Sylvanthorn Longblade',
        category: 'equipment',
        slot: 'weapon',
        rarity: 'Relic',
        glyph: '/',
        levelReq: 2,
        upgradeLevel: 0,
        stats: { atk: 13, critChance: 9, dodgeChance: 4 },
        affix: 'first_strike',
        affixLabel: 'Passive: First hit in each skirmish deals +35% dmg',
        setId: 'starlight_outrider',
        value: 175,
        description: 'Elven star-silver longblade carried by Highspire’s ancient Outriders.',
      };
    case 'starlight_mantle':
      return {
        id: nextItemId(),
        name: 'Starlight Outrider Mantle',
        category: 'equipment',
        slot: 'armor',
        rarity: 'Relic',
        glyph: '▒',
        levelReq: 2,
        upgradeLevel: 0,
        stats: { def: 9, dodgeChance: 9, maxHp: 18, spellPower: 4 },
        affix: 'chill_on_hit',
        affixLabel: 'Passive: Strikes have 30% chance to Chill target',
        setId: 'starlight_outrider',
        value: 175,
        description: 'Midnight-green elven cloak threaded with shimmer-silver wards.',
      };
    case 'cinder_crown':
      return {
        id: nextItemId(),
        name: 'Cinderforged Crown',
        category: 'equipment',
        slot: 'helm',
        rarity: 'Relic',
        glyph: '⍟',
        levelReq: 3,
        upgradeLevel: 0,
        stats: { def: 8, spellPower: 9, maxHp: 16, maxMana: 10 },
        affix: 'arcane_ward',
        affixLabel: 'Passive: Start floor with Shielded (+4 DEF, 4t)',
        setId: 'cinderforged',
        value: 190,
        description: 'Smelted in the Ember Vaults, humming with defiant heat.',
      };
    case 'emberheart_signet':
      return {
        id: nextItemId(),
        name: 'Emberheart Signet',
        category: 'equipment',
        slot: 'ring',
        rarity: 'Relic',
        glyph: '°',
        levelReq: 3,
        upgradeLevel: 0,
        stats: { atk: 6, spellPower: 8, thorns: 6, critChance: 6 },
        affix: 'vampiric_touch',
        affixLabel: 'Passive: Heals 3 HP on every Critical Hit',
        setId: 'cinderforged',
        value: 190,
        description: 'A glowing ruby band forged from Sovereign furnace embers.',
      };
    case 'thornbound_circlet':
      return {
        id: nextItemId(),
        name: 'Thornbound Circlet',
        category: 'equipment',
        slot: 'helm',
        rarity: 'Relic',
        glyph: '⍟',
        levelReq: 3,
        upgradeLevel: 0,
        stats: { atk: 5, thorns: 6, maxHp: 14, def: 4 },
        affix: 'thorns_burst',
        affixLabel: 'Passive: Thorns reflect +6 bonus damage',
        setId: 'thornbound',
        value: 180,
        description: 'A living circlet of fen-thorn, still slowly growing around its wearer.',
      };
    case 'fenroot_talisman':
      return {
        id: nextItemId(),
        name: 'Fenroot Talisman',
        category: 'equipment',
        slot: 'amulet',
        rarity: 'Relic',
        glyph: '◊',
        levelReq: 3,
        upgradeLevel: 0,
        stats: { lifesteal: 4, maxHp: 16, spellPower: 5, def: 3 },
        affix: 'vampiric_touch',
        affixLabel: 'Passive: Heals 3 HP on every Critical Hit',
        setId: 'thornbound',
        value: 180,
        description: 'Root-heart of a Hollow bloom-mother, pulsing with stolen sap.',
      };
    case 'glacierheart_pendant':
      return {
        id: nextItemId(),
        name: 'Glacierheart Pendant',
        category: 'equipment',
        slot: 'amulet',
        rarity: 'Relic',
        glyph: '❖',
        levelReq: 4,
        upgradeLevel: 0,
        stats: { def: 5, maxMana: 18, dodgeChance: 6, spellPower: 6 },
        affix: 'arcane_ward',
        affixLabel: 'Passive: Start floor with Shielded (+4 DEF, 4t)',
        setId: 'rimebound',
        value: 195,
        description: 'A shard of the first Frostpeak glacier, cold enough to slow arrows.',
      };
    case 'rimebound_plate':
      return {
        id: nextItemId(),
        name: 'Rimebound Plate',
        category: 'equipment',
        slot: 'armor',
        rarity: 'Relic',
        glyph: '☗',
        levelReq: 4,
        upgradeLevel: 0,
        stats: { def: 12, dodgeChance: 5, maxHp: 16 },
        affix: 'chill_on_hit',
        affixLabel: 'Passive: Strikes have 30% chance to Chill target',
        setId: 'rimebound',
        value: 195,
        description: 'Caldera-forged plate quenched in glacier melt; frost blooms across it nightly.',
      };
    case 'surveyor_compass':
      return {
        id: nextItemId(),
        name: 'Surveyor’s Star-Compass',
        category: 'equipment',
        slot: 'amulet',
        rarity: 'Epic',
        glyph: '✦',
        levelReq: 2,
        upgradeLevel: 0,
        stats: { spellPower: 7, maxMana: 12, dodgeChance: 6, critChance: 5 },
        affix: 'first_strike',
        affixLabel: 'Passive: First Strike on floor deals +30% damage',
        value: 150,
        description: 'Rowan’s own survey compass; its needle points at the nearest unread stele.',
      };
    case 'silverbridge_band':
      return {
        id: nextItemId(),
        name: 'Wayfarer’s Silverbridge Band',
        category: 'equipment',
        slot: 'ring',
        rarity: 'Rare',
        glyph: '°',
        levelReq: 1,
        upgradeLevel: 0,
        stats: { atk: 3, def: 2, dodgeChance: 5, maxMana: 6 },
        affix: 'first_strike',
        affixLabel: 'Passive: First Strike on floor deals +30% damage',
        value: 95,
        description: 'Engraved with compass notches worn smooth on Silverwood patrol roads.',
      };
    case 'sporeguard_amulet':
      return {
        id: nextItemId(),
        name: 'Thornwick Sporeguard Charm',
        category: 'equipment',
        slot: 'amulet',
        rarity: 'Epic',
        glyph: '♀',
        levelReq: 2,
        upgradeLevel: 0,
        stats: { def: 4, maxHp: 18, maxMana: 10, thorns: 5 },
        affix: 'mana_on_kill',
        affixLabel: 'Passive: Restore +3 Mana on kill',
        value: 145,
        description: 'Amber-resin fen talisman woven by Elder Sylva to ward off bog rot.',
      };
    case 'morvath_shroud':
      return {
        id: nextItemId(),
        name: 'Barrow-Wight Shroud',
        category: 'equipment',
        slot: 'helm',
        rarity: 'Epic',
        glyph: '^',
        levelReq: 2,
        upgradeLevel: 0,
        stats: { def: 5, spellPower: 7, critChance: 7, dodgeChance: 4 },
        affix: 'chill_on_hit',
        affixLabel: 'Passive: Hits have 25% chance to Chill foes',
        value: 155,
        description: 'Cold funerary circlet claimed from Arch-Wight Morvath’s tomb.',
      };
    default:
      return generateProceduralItem(3, { minRarity: 'Rare' });
  }
}

export function createRandomSetRelic(depth: number): Item {
  // Phase 3: pool grows with depth across all four relic sets (8 pieces).
  const pool =
    depth <= 2
      ? ['sylvan_longblade', 'starlight_mantle']
      : depth === 3
        ? [
            'sylvan_longblade',
            'starlight_mantle',
            'cinder_crown',
            'emberheart_signet',
            'thornbound_circlet',
            'fenroot_talisman',
          ]
        : [
            'sylvan_longblade',
            'starlight_mantle',
            'cinder_crown',
            'emberheart_signet',
            'thornbound_circlet',
            'fenroot_talisman',
            'glacierheart_pendant',
            'rimebound_plate',
          ];
  const picked = pool[Math.floor(Math.random() * pool.length)];
  return createNamedRelic(picked);
}

export function createQuestItem(tag: string): Item {
  if (tag === 'smuggler_ledger') {
    return {
      id: nextItemId(),
      name: 'Sealed Contraband Ledger',
      category: 'quest',
      rarity: 'Rare',
      glyph: '▤',
      levelReq: 1,
      upgradeLevel: 0,
      stats: {},
      value: 0,
      questTag: 'smuggler_ledger',
      description: 'Wax-sealed manifest naming Citadel officials trading in crypt relics.',
    };
  }
  if (tag === 'pale_nightbloom') {
    return {
      id: nextItemId(),
      name: 'Pale Nightbloom',
      category: 'quest',
      rarity: 'Uncommon',
      glyph: '✿',
      levelReq: 1,
      upgradeLevel: 0,
      stats: {},
      value: 0,
      questTag: 'pale_nightbloom',
      description: 'Luminescent moss-flower that neutralizes crypt miasma.',
    };
  }
  if (tag === 'wayfarer_satchel') {
    return {
      id: nextItemId(),
      name: 'Wayfarer’s Stolen Satchel',
      category: 'quest',
      rarity: 'Rare',
      glyph: '▤',
      levelReq: 1,
      upgradeLevel: 0,
      stats: {},
      value: 0,
      questTag: 'wayfarer_satchel',
      description: 'Rowan’s weathered leather map-satchel, plundered by Silverbridge brigands.',
    };
  }
  if (tag === 'morvath_seal') {
    return {
      id: nextItemId(),
      name: 'Morvath’s Barrow Seal',
      category: 'quest',
      rarity: 'Epic',
      glyph: '◈',
      levelReq: 1,
      upgradeLevel: 0,
      stats: {},
      value: 0,
      questTag: 'morvath_seal',
      description: 'Tarnished iron crown-seal taken from Arch-Wight Morvath in Whispering Barrow.',
    };
  }
  if (tag === 'fungal_heart') {
    return {
      id: nextItemId(),
      name: 'Bioluminescent Fungal Heart',
      category: 'quest',
      rarity: 'Epic',
      glyph: '✿',
      levelReq: 1,
      upgradeLevel: 0,
      stats: {},
      value: 0,
      questTag: 'fungal_heart',
      description: 'Pulsing core harvested from Spore-Matron Vexis deep inside Fungal Hollow.',
    };
  }
  if (tag === 'ashen_ore_heart') {
    return {
      id: nextItemId(),
      name: 'Ashen Ore Heart',
      category: 'quest',
      rarity: 'Relic',
      glyph: '♦',
      levelReq: 1,
      upgradeLevel: 0,
      stats: {},
      value: 0,
      questTag: 'ashen_ore_heart',
      description: 'White-hot meteoric slag-core torn from Ignis-Warden Kaelthar in Ashen Caldera.',
    };
  }
  return {
    id: nextItemId(),
    name: 'Whispering Bell',
    category: 'quest',
    rarity: 'Relic',
    glyph: '⍾',
    levelReq: 1,
    upgradeLevel: 0,
    stats: {},
    value: 0,
    questTag: 'whispering_bell',
    description: 'Ancient bronze bell humming with dormant ember resonance.',
  };
}

export function upgradeEquipmentItem(item: Item): Item {
  const nextLv = item.upgradeLevel + 1;
  const updatedStats: ItemStats = { ...item.stats };
  const keys = Object.keys(updatedStats) as Array<keyof ItemStats>;
  keys.forEach((k) => {
    const cur = updatedStats[k] ?? 0;
    if (cur > 0) {
      updatedStats[k] = k === 'maxHp' ? cur + 5 : k === 'maxMana' ? cur + 3 : cur + 2;
    }
  });
  const baseName = item.name.replace(/\s\+\d+$/, '');
  return {
    ...item,
    upgradeLevel: nextLv,
    name: `${baseName} +${nextLv}`,
    stats: updatedStats,
    value: Math.round(item.value * 1.3),
  };
}

export function getSalvageGoldYield(item: Item): number {
  // Audit Tier 2: salvage pays the merchant sell price (55% of value,
  // which already includes the temper premium). The old flat rarity
  // table (3-32g) made the convenient in-Pack option a trap — strictly
  // worse than walking to a merchant for nearly everything Uncommon+.
  return Math.max(4, Math.round(item.value * 0.55));
}

export function formatStatList(stats: ItemStats): Array<{ label: string; value: string; key: keyof ItemStats; num: number }> {
  const map: Array<{ key: keyof ItemStats; label: string; suffix?: string }> = [
    { key: 'atk', label: 'ATK' },
    { key: 'def', label: 'DEF' },
    { key: 'spellPower', label: 'Spell' },
    { key: 'maxHp', label: 'Max HP' },
    { key: 'maxMana', label: 'Max MP' },
    { key: 'critChance', label: 'Crit', suffix: '%' },
    { key: 'dodgeChance', label: 'Dodge', suffix: '%' },
    { key: 'lifesteal', label: 'Lifesteal', suffix: '%' },
    { key: 'thorns', label: 'Thorns' },
  ];
  const out: Array<{ label: string; value: string; key: keyof ItemStats; num: number }> = [];
  for (const m of map) {
    const val = stats[m.key];
    if (val && val !== 0) {
      out.push({
        key: m.key,
        label: m.label,
        value: `+${val}${m.suffix ?? ''}`,
        num: val,
      });
    }
  }
  return out;
}
