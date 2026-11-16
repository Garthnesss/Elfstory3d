import { EnemyArchetype, PlayerState, WorldFlags } from './types';

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
  },
};

export const ALL_BESTIARY_LIST: BestiaryEntryDef[] = Object.values(BESTIARY_DEFS);

export function computeBestiaryRanks(worldFlags?: WorldFlags): {
  unlockedHunters: number;
  unlockedSlayers: number;
} {
  const kills = worldFlags?.bestiaryKills ?? {};
  let unlockedHunters = 0;
  let unlockedSlayers = 0;

  for (const def of ALL_BESTIARY_LIST) {
    const count = kills[def.archetype] ?? 0;
    if (count >= def.hunterKills) unlockedHunters += 1;
    if (count >= def.slayerKills) unlockedSlayers += 1;
  }

  return { unlockedHunters, unlockedSlayers };
}

export interface FeatDef {
  id: string;
  title: string;
  summary: string;
  rewardLabel: string;
  rewardGold?: number;
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
    rewardLabel: '+30 Gold',
    rewardGold: 30,
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
    rewardLabel: '+25 Gold',
    rewardGold: 25,
    check: (_p, f) => (f.readLoreIds?.length ?? 0) >= 4,
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
    rewardLabel: '+30 Gold',
    rewardGold: 30,
    check: (_p, f) => computeBestiaryRanks(f).unlockedHunters >= 3,
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
      { gold: 45, benefit: 'Lv 1: Crimson Draughts heal +10 extra HP & Aether Vials restore +6 Mana.' },
      { gold: 80, benefit: 'Lv 2: Auto-brews 1 Crimson Draught upon descending if carrying fewer than 2.' },
    ],
  },
  {
    id: 'smithy',
    name: 'Torin’s Forge Bellows',
    glyph: '⚒',
    maxLevel: 2,
    summary: 'Outfits the forge with high-heat vents for cheaper Runeforging and masterwork tempering.',
    levels: [
      { gold: 50, benefit: 'Lv 1: Reduces Tempering gold costs by 25%.' },
      { gold: 95, benefit: 'Lv 2: Unlocks +4 Masterwork Tempering cap (up from +3) at all forges.' },
    ],
  },
  {
    id: 'watchtower',
    name: 'Outrider Watchtower',
    glyph: '◈',
    maxLevel: 2,
    summary: 'Charts subterranean survey beacons to aid Garth and his Spirit Companion.',
    levels: [
      { gold: 45, benefit: 'Lv 1: Reveals Descent Stairs & Elven Waystones upon entering any floor.' },
      { gold: 85, benefit: 'Lv 2: Grants +1 Sight Radius and Shielded (+4 DEF, 4t) on floor entry.' },
    ],
  },
];
