import { EnemyArchetype, ItemStats, PlayerState, WorldFlags } from './types';

export interface BestiaryEntryDef {
  archetype: EnemyArchetype;
  name: string;
  glyph: string;
  color: string;
  biome: string;
  tier: 'Common' | 'Elite' | 'Boss';
  hunterKills: number;
  slayerKills: number;
  lore: string;
  tacticalTip: string;
  hunterBonusLabel: string;
  slayerBonusLabel: string;
  slayerStats: ItemStats;
}

export const BESTIARY_DEFS: Record<EnemyArchetype, BestiaryEntryDef> = {
  plague_rat: {
    archetype: 'plague_rat',
    name: 'Blight Rat',
    glyph: 'r',
    color: '#A8A29E',
    biome: 'Floor 1 · Moss-Sunken Reliquary',
    tier: 'Common',
    hunterKills: 3,
    slayerKills: 8,
    lore: 'Oversized tunnel scavengers thriving amidst damp moss and spore pools.',
    tacticalTip: 'Low armor; clear packs quickly before their bites stack fatigue.',
    hunterBonusLabel: '+10% Damage vs Blight Rats',
    slayerBonusLabel: '+4 Max HP',
    slayerStats: { maxHp: 4 },
  },
  goblin_skirmisher: {
    archetype: 'goblin_skirmisher',
    name: 'Goblin Skirmisher',
    glyph: 'g',
    color: '#4EA885',
    biome: 'Floors 1–2 · Reliquary & Ossuary',
    tier: 'Common',
    hunterKills: 3,
    slayerKills: 8,
    lore: 'Cunning subterranean raiders armed with scavenged bronze blades.',
    tacticalTip: 'Step aside or stun when they wind up Heavy Strikes.',
    hunterBonusLabel: '+10% Damage vs Goblin Skirmishers',
    slayerBonusLabel: '+2% Dodge Chance',
    slayerStats: { dodgeChance: 2 },
  },
  crypt_skeleton: {
    archetype: 'crypt_skeleton',
    name: 'Crypt Sentinel',
    glyph: 's',
    color: '#D6D3D1',
    biome: 'Floors 1–3 · Sunken Crypts',
    tier: 'Common',
    hunterKills: 3,
    slayerKills: 8,
    lore: 'Restless bone-guards bound by fading Highspire funeral oaths.',
    tacticalTip: 'Predictable melee swings; armored foes fall faster to spells or Viper Edge.',
    hunterBonusLabel: '+10% Damage vs Crypt Sentinels',
    slayerBonusLabel: '+1 Defense',
    slayerStats: { def: 1 },
  },
  bone_acolyte: {
    archetype: 'bone_acolyte',
    name: 'Bone Acolyte',
    glyph: 'a',
    color: '#A78BFA',
    biome: 'Floors 2–3 · Frost Ossuary & Vaults',
    tier: 'Common',
    hunterKills: 3,
    slayerKills: 8,
    lore: 'Skeletal chanters who weave bone-chill hex bolts down long corridors.',
    tacticalTip: 'Break line of sight behind pillars to cancel their Hex Bolt windup.',
    hunterBonusLabel: '+10% Damage vs Bone Acolytes',
    slayerBonusLabel: '+3 Max Mana',
    slayerStats: { maxMana: 3 },
  },
  blight_weaver: {
    archetype: 'blight_weaver',
    name: 'Blight-Weaver',
    glyph: 'v',
    color: '#34D399',
    biome: 'Overworld · Fungal Hollow & Ossuary',
    tier: 'Elite',
    hunterKills: 3,
    slayerKills: 8,
    lore: 'Venomous brood-mystics that lace bolts with lingering crypt poison.',
    tacticalTip: 'Keep Wild Infusion ready or rush them with Shadowstep before they hex.',
    hunterBonusLabel: '+10% Damage vs Blight-Weavers',
    slayerBonusLabel: '+2% Crit Chance',
    slayerStats: { critChance: 2 },
  },
  ash_cultist: {
    archetype: 'ash_cultist',
    name: 'Ash Cultist',
    glyph: 'c',
    color: '#FB923C',
    biome: 'Floors 3–5 · Ember & Crucible',
    tier: 'Common',
    hunterKills: 3,
    slayerKills: 8,
    lore: 'Zealots of Sovereign Malakor who sear intruders with ember invocations.',
    tacticalTip: 'Frail in melee—close the distance quickly to interrupt ranged casts.',
    hunterBonusLabel: '+10% Damage vs Ash Cultists',
    slayerBonusLabel: '+2 Spell Power',
    slayerStats: { spellPower: 2 },
  },
  shadow_stalker: {
    archetype: 'shadow_stalker',
    name: 'Shadow Stalker',
    glyph: 'S',
    color: '#C084FC',
    biome: 'Floors 3–5 · Deep Vaults',
    tier: 'Elite',
    hunterKills: 3,
    slayerKills: 8,
    lore: 'Silent assassins clad in gloom-silk who ambush from torchless corners.',
    tacticalTip: 'Watch for their heavy windup and apply Chill or Stun early.',
    hunterBonusLabel: '+10% Damage vs Shadow Stalkers',
    slayerBonusLabel: '+2% Crit · +2% Dodge',
    slayerStats: { critChance: 2, dodgeChance: 2 },
  },
  dread_wraith: {
    archetype: 'dread_wraith',
    name: 'Dread Wraith',
    glyph: 'W',
    color: '#38BDF8',
    biome: 'Floors 3–5 · Ossuary & Abyss',
    tier: 'Elite',
    hunterKills: 3,
    slayerKills: 8,
    lore: 'Frost-cold phantoms whose Soul Chill drains heat from living steel.',
    tacticalTip: 'High evasion—Arcane spells and guaranteed-crit ambushes bypass their drift.',
    hunterBonusLabel: '+10% Damage vs Dread Wraiths',
    slayerBonusLabel: '+4 Max Mana · +1 Spell Power',
    slayerStats: { maxMana: 4, spellPower: 1 },
  },
  iron_golem: {
    archetype: 'iron_golem',
    name: 'Stone Golem',
    glyph: 'G',
    color: '#94A3B8',
    biome: 'Floors 3–5 · Forges & Crucible',
    tier: 'Elite',
    hunterKills: 3,
    slayerKills: 8,
    lore: 'Heavy dwarven-forged sentinels animated by deep ember cores.',
    tacticalTip: 'Step off red Ground Slam tiles when they wind up; spells pierce their armor.',
    hunterBonusLabel: '+10% Damage vs Stone Golems',
    slayerBonusLabel: '+6 Max HP · +1 DEF',
    slayerStats: { maxHp: 6, def: 1 },
  },
  cinder_wisp: {
    archetype: 'cinder_wisp',
    name: 'Cinder Wisp',
    glyph: 'w',
    color: '#FBBF24',
    biome: 'Overworld · Frostpeak & Crucible',
    tier: 'Common',
    hunterKills: 3,
    slayerKills: 8,
    lore: 'Living sparks born where molten veins meet arcane wards.',
    tacticalTip: 'Rime Nova extinguishes their high evasion cleanly.',
    hunterBonusLabel: '+10% Damage vs Cinder Wisps',
    slayerBonusLabel: '+2 Spell Power',
    slayerStats: { spellPower: 2 },
  },
  obsidian_warden: {
    archetype: 'obsidian_warden',
    name: 'Obsidian Warden',
    glyph: 'O',
    color: '#F43F5E',
    biome: 'Floors 4+ · Crucible & Sanctum',
    tier: 'Elite',
    hunterKills: 3,
    slayerKills: 8,
    lore: 'Towering glass-armored knights guarding the inner sanctum approaches.',
    tacticalTip: 'Respect Obsidian Cleave telegraphs; apply Mark before bursting them down.',
    hunterBonusLabel: '+10% Damage vs Obsidian Wardens',
    slayerBonusLabel: '+2 Attack · +2 Thorns',
    slayerStats: { atk: 2, thorns: 2 },
  },
  grave_husk: {
    archetype: 'grave_husk',
    name: 'Grave Husk',
    glyph: 'h',
    color: '#D97706',
    biome: 'Whispering Barrow · Side Dungeon & Abyss',
    tier: 'Common',
    hunterKills: 3,
    slayerKills: 8,
    lore: 'Desiccated barrow-guards whose burial oaths outlived their flesh. Death, the first time, does not take them.',
    tacticalTip: 'Deathless: the first killing blow leaves it standing at a thread of HP. Budget one more hit — and respect its Heavy Strike wind-up.',
    hunterBonusLabel: '+10% Damage vs Grave Husks',
    slayerBonusLabel: '+2 Defense',
    slayerStats: { def: 2 },
  },
  spore_hulk: {
    archetype: 'spore_hulk',
    name: 'Spore Hulk',
    glyph: 'H',
    color: '#84CC16',
    biome: 'Fungal Hollow · Side Dungeon & Abyss',
    tier: 'Elite',
    hunterKills: 3,
    slayerKills: 8,
    lore: 'A bloom-mother grown to siege-engine size, its cap a pressurized sac of weaponized spores.',
    tacticalTip: 'Ground Slams shake the galleries — and when it dies it BURSTS. Kill it at range or step away from the corpse.',
    hunterBonusLabel: '+10% Damage vs Spore Hulks',
    slayerBonusLabel: '+6 Max HP · +2 Thorns',
    slayerStats: { maxHp: 6, thorns: 2 },
  },
  rime_revenant: {
    archetype: 'rime_revenant',
    name: 'Rime Revenant',
    glyph: 'R',
    color: '#7DD3FC',
    biome: 'Frostpeak Cavern · Side Dungeon & Abyss',
    tier: 'Elite',
    hunterKills: 3,
    slayerKills: 8,
    lore: 'Frostpeak dead who refused the thaw, drifting the rime tunnels with a grudge against the warm.',
    tacticalTip: 'Its Rime Bolts Chill even when they only graze — keep moving and break line of sight between volleys.',
    hunterBonusLabel: '+10% Damage vs Rime Revenants',
    slayerBonusLabel: '+2% Dodge Chance · +2 Spell Power',
    slayerStats: { dodgeChance: 2, spellPower: 2 },
  },
  boss_bone_cantor: {
    archetype: 'boss_bone_cantor',
    name: 'Vaelen, Bone Cantor',
    glyph: 'B',
    color: '#F472B6',
    biome: 'Floor 2 Boss · Frost-Bound Ossuary',
    tier: 'Boss',
    hunterKills: 1,
    slayerKills: 3,
    lore: 'Choir-master bound to guard the upper ossuary until released by oath or steel.',
    tacticalTip: 'High Arcana or Resolve can lay Vaelen to rest peacefully before battle.',
    hunterBonusLabel: '+10% Damage vs Bone Cantor',
    slayerBonusLabel: '+4 Max Mana · +2 Spell Power',
    slayerStats: { maxMana: 4, spellPower: 2 },
  },
  boss_ashen_inquisitor: {
    archetype: 'boss_ashen_inquisitor',
    name: 'Inquisitor Serath',
    glyph: 'I',
    color: '#F97316',
    biome: 'Floor 4 Boss · Inquisitor Crucible',
    tier: 'Boss',
    hunterKills: 1,
    slayerKills: 3,
    lore: 'Armored zealot commanding the Crucible before Sovereign Malakor’s throne.',
    tacticalTip: 'High Might or Agility opens devastating pre-battle advantages.',
    hunterBonusLabel: '+10% Damage vs Inquisitor Serath',
    slayerBonusLabel: '+2 Attack · +2 Defense',
    slayerStats: { atk: 2, def: 2 },
  },
  boss_malakor: {
    archetype: 'boss_malakor',
    name: 'Malakor, Sovereign of Cinder',
    glyph: 'M',
    color: '#EF4444',
    biome: 'Floor 5 Boss · Obsidian Sanctum',
    tier: 'Boss',
    hunterKills: 1,
    slayerKills: 2,
    lore: 'Undying monarch who raised the Sunken Citadel around the Ashen Glyph.',
    tacticalTip: 'Attune the Whispering Bell with Lyra to fracture his cinder ward first.',
    hunterBonusLabel: '+10% Damage vs Malakor',
    slayerBonusLabel: '+3 Attack · +10 Max HP',
    slayerStats: { atk: 3, maxHp: 10 },
  },
};

export const ALL_BESTIARY_LIST: BestiaryEntryDef[] = Object.values(BESTIARY_DEFS);

export function computeBestiaryPerks(worldFlags?: WorldFlags): {
  slayerStats: ItemStats;
  unlockedHunters: number;
  unlockedSlayers: number;
  damageMultiplierVs: (archetype: EnemyArchetype) => number;
} {
  const kills = worldFlags?.bestiaryKills ?? {};
  const slayerStats: ItemStats = {};
  let unlockedHunters = 0;
  let unlockedSlayers = 0;

  for (const def of ALL_BESTIARY_LIST) {
    const count = kills[def.archetype] ?? 0;
    if (count >= def.hunterKills) unlockedHunters += 1;
    if (count >= def.slayerKills) {
      unlockedSlayers += 1;
      for (const [k, v] of Object.entries(def.slayerStats)) {
        const key = k as keyof ItemStats;
        slayerStats[key] = (slayerStats[key] ?? 0) + (v ?? 0);
      }
    }
  }

  return {
    slayerStats,
    unlockedHunters,
    unlockedSlayers,
    damageMultiplierVs: (archetype: EnemyArchetype) => {
      const def = BESTIARY_DEFS[archetype];
      if (!def) return 1;
      return (kills[archetype] ?? 0) >= def.hunterKills ? 1.1 : 1;
    },
  };
}

export interface FeatDef {
  id: string;
  title: string;
  summary: string;
  rewardLabel: string;
  rewardGold?: number;
  rewardDust?: number;
  check: (player: PlayerState, flags: WorldFlags) => boolean;
}

export const FEAT_DEFS: FeatDef[] = [
  {
    id: 'first_blood',
    title: 'Reliquary Cleanser',
    summary: 'Defeat 10 dungeon enemies in a single expedition.',
    rewardLabel: '+25 Gold',
    rewardGold: 25,
    check: (p) => p.kills >= 10,
  },
  {
    id: 'veteran_slayer',
    title: 'Bane of the Vaults',
    summary: 'Defeat 35 dungeon enemies and master the Bestiary.',
    rewardLabel: '+12 Glyph Dust',
    rewardDust: 12,
    check: (p) => p.kills >= 35,
  },
  {
    id: 'waystone_keeper',
    title: 'Silver Bough Keeper',
    summary: 'Attune 2 Elven Waystones in sunken chambers.',
    rewardLabel: '+40 Gold',
    rewardGold: 40,
    check: (_p, f) => (f.waystonesAttuned ?? 0) >= 2,
  },
  {
    id: 'codex_scholar',
    title: 'Keeper of Carved Steles',
    summary: 'Transcribe 4 Lore entries into your Codex.',
    rewardLabel: '+10 Glyph Dust',
    rewardDust: 10,
    check: (_p, f) => (f.readLoreIds?.length ?? 0) >= 4,
  },
  {
    id: 'runeforger',
    title: 'Master Runeforger',
    summary: 'Equip an item bearing an etched Rune Seal.',
    rewardLabel: '+8 Glyph Dust',
    rewardDust: 8,
    check: (p) => Object.values(p.equipped).some((it) => Boolean(it?.runeEnchant)),
  },
  {
    id: 'set_collector',
    title: 'Covenant Bearer',
    summary: 'Equip 2 matching pieces of a Relic Set.',
    rewardLabel: '+50 Gold',
    rewardGold: 50,
    check: (p) => {
      const counts: Record<string, number> = {};
      for (const it of Object.values(p.equipped)) {
        if (it?.setId) counts[it.setId] = (counts[it.setId] ?? 0) + 1;
      }
      return Object.values(counts).some((c) => c >= 2);
    },
  },
  {
    id: 'town_patron',
    title: 'Outpost Benefactor',
    summary: 'Fund at least 1 Town Infrastructure Upgrade.',
    rewardLabel: '+35 Gold',
    rewardGold: 35,
    check: (_p, f) => {
      const u = f.townUpgrades;
      return Boolean(u && (u.apothecary > 0 || u.smithy > 0 || u.watchtower > 0));
    },
  },
  {
    id: 'codex_hunter',
    title: 'Seasoned Bestiary Hunter',
    summary: 'Unlock Hunter Rank for 3 distinct monster species.',
    rewardLabel: '+12 Glyph Dust',
    rewardDust: 12,
    check: (_p, f) => computeBestiaryPerks(f).unlockedHunters >= 3,
  },
  {
    id: 'deep_delver',
    title: 'Crucible Pathfinder',
    summary: 'Reach Floor 4 (Inquisitor Crucible) or deeper.',
    rewardLabel: '+55 Gold',
    rewardGold: 55,
    check: (_p, f) => f.discoveredZones.some((z) => z === 'dungeon_4' || z === 'dungeon_5' || z === 'dungeon_6'),
  },
  {
    id: 'sovereign_fall',
    title: 'Ashen Sovereign’s End',
    summary: 'Vanquish Malakor, Sovereign of Cinder on Floor 5.',
    rewardLabel: '+120 Gold',
    rewardGold: 120,
    check: (_p, f) => Boolean(f.malakorDefeated),
  },
];

export interface TownUpgradeDef {
  id: 'apothecary' | 'smithy' | 'watchtower';
  name: string;
  glyph: string;
  maxLevel: number;
  summary: string;
  levels: Array<{
    gold: number;
    dust: number;
    benefit: string;
  }>;
}

export const TOWN_UPGRADE_DEFS: TownUpgradeDef[] = [
  {
    id: 'apothecary',
    name: 'Mira’s Stillhouse',
    glyph: '✿',
    maxLevel: 2,
    summary: 'Expands Oakhaven’s apothecary kettles to enrich every draught and vial you drink.',
    levels: [
      { gold: 45, dust: 6, benefit: 'Lv 1: Crimson Draughts heal +10 extra HP & Aether Vials restore +6 Mana.' },
      { gold: 80, dust: 12, benefit: 'Lv 2: Auto-brews 1 Crimson Draught upon descending if carrying fewer than 2.' },
    ],
  },
  {
    id: 'smithy',
    name: 'Torin’s Runeforge Bellows',
    glyph: '⚒',
    maxLevel: 2,
    summary: 'Outfits the forge with high-heat vents for cheaper Runeforging and masterwork tempering.',
    levels: [
      { gold: 50, dust: 8, benefit: 'Lv 1: Reduces Temper & Runeforging Gold/Dust costs by 25%.' },
      { gold: 95, dust: 14, benefit: 'Lv 2: Unlocks +4 Masterwork Tempering cap (up from +3) at all forges.' },
    ],
  },
  {
    id: 'watchtower',
    name: 'Outrider Watchtower',
    glyph: '◈',
    maxLevel: 2,
    summary: 'Charts subterranean survey beacons to aid Garth and his Spirit Companion.',
    levels: [
      { gold: 45, dust: 6, benefit: 'Lv 1: Reveals Descent Stairs & Elven Waystones upon entering any floor.' },
      { gold: 85, dust: 12, benefit: 'Lv 2: Grants +1 Sight Radius and Shielded (+4 DEF, 4t) on floor entry.' },
    ],
  },
];
