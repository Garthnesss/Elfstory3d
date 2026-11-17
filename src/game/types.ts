export type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'GAME_OVER';

export type ActivePanel =
  | 'NONE'
  | 'SKILLS'
  | 'INVENTORY'
  | 'DIALOGUE'
  | 'QUESTS'
  | 'MERCHANT'
  | 'TRAVEL'
  | 'LEGEND'
  | 'UPGRADES';

export type ZoneId =
  | 'oakhaven'
  | 'overworld'
  | 'highspire'
  | 'thornwick'
  | 'cinderwatch'
  | `dungeon_${number}`
  | `barrow_${number}`
  | `mire_${number}`
  | `frost_${number}`;

export type SaveSlotId = 'slot_1' | 'slot_2' | 'slot_3';

export type TileKind =
  | 'wall'
  | 'floor'
  | 'road'
  | 'water'
  | 'chasm'
  | 'door'
  | 'stairs_down'
  | 'stairs_up'
  | 'gate_city'
  | 'torch'
  | 'shrine'
  | 'brazier'
  | 'chest'
  | 'trap'
  | 'dart_trap'
  | 'lore_tablet'
  | 'tree'
  | 'pillar'
  | 'market_stall'
  | 'fountain'
  | 'herb_node'
  | 'contraband_cache'
  | 'whispering_bell'
  | 'vault_door'
  | 'waystone'
  | 'forgotten_forge'
  | 'cursed_altar'
  | 'spore_pool'
  | 'frost_vent'
  | 'ember_crust'
  | 'shock_rune';

export interface Tile {
  x: number;
  y: number;
  kind: TileKind;
  glyph: string;
  color: string;
  bg?: string;
  walkable: boolean;
  blocksSight: boolean;
  explored: boolean;
  visible: boolean;
  interactId?: string;
  used?: boolean;
  revealed?: boolean;
  label?: string;
}

export type AttributeKey = 'might' | 'agility' | 'arcana' | 'resolve';

export interface Attributes {
  might: number;
  agility: number;
  arcana: number;
  resolve: number;
}

export type SkillBranch = 'vanguard' | 'shadowcraft' | 'runecaster';

export type SkillId =
  | 'cleave'
  | 'shield_bash'
  | 'bloodlust'
  | 'iron_fortress'
  | 'shadowstep'
  | 'venom_tip'
  | 'evasive_instinct'
  | 'executioners_mark'
  | 'ember_lance'
  | 'frost_nova'
  | 'siphon_soul'
  | 'arcane_echo';

export type SkillTargeting = 'self' | 'adjacent' | 'ranged' | 'line' | 'blink' | 'passive';

export interface SkillDef {
  id: SkillId;
  name: string;
  branch: SkillBranch;
  tier: 1 | 2 | 3;
  kind: 'active' | 'passive';
  targeting: SkillTargeting;
  range: number;
  manaCost: number;
  cooldown: number;
  glyph: string;
  summary: string;
  rankDescriptions: [string, string, string];
  scalingNote: string;
}

export type ItemSlot = 'weapon' | 'armor' | 'helm' | 'ring' | 'amulet';

export type ItemRarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Relic';

export type ItemAffixId =
  | 'bleed_on_crit'
  | 'mana_on_kill'
  | 'thorns_burst'
  | 'first_strike'
  | 'execute_bonus'
  | 'chill_on_hit'
  | 'vampiric_touch'
  | 'arcane_ward';

export interface ItemStats {
  atk?: number;
  def?: number;
  spellPower?: number;
  maxHp?: number;
  maxMana?: number;
  critChance?: number;
  dodgeChance?: number;
  lifesteal?: number;
  thorns?: number;
}

export type ConsumableKind =
  | 'heal_potion'
  | 'mana_potion'
  | 'scroll_blink'
  | 'ward_talisman'
  | 'throwing_knife';

export type ProdigyId =
  | 'cauterize'
  | 'draconic_will'
  | 'flexible_combat'
  | 'carry_the_world'
  | 'arcane_conduit'
  | 'spine_of_world';

export interface ProdigyDef {
  id: ProdigyId;
  name: string;
  glyph: string;
  pillar: 'Vanguard' | 'Shadowcraft' | 'Runecaster' | 'Hybrid';
  requirementLabel: string;
  requirements: Partial<Attributes>;
  summary: string;
  effectNote: string;
}

export type RelicSetId = 'starlight_outrider' | 'cinderforged' | 'thornbound' | 'rimebound';


export type CompanionKind = 'silverwind_lynx' | 'starlight_owl';

export interface CompanionState {
  kind: CompanionKind;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  respawnCooldown: number;
}

export interface Item {
  id: string;
  name: string;
  category: 'equipment' | 'consumable' | 'quest';
  slot?: ItemSlot;
  consumableKind?: ConsumableKind;
  rarity: ItemRarity;
  glyph: string;
  levelReq: number;
  upgradeLevel: number;
  stats: ItemStats;
  affix?: ItemAffixId;
  affixLabel?: string;
  setId?: RelicSetId;
  value: number;
  description: string;
  quantity?: number;
  questTag?: string;
}

export type StatusKind =
  | 'bleed'
  | 'burn'
  | 'poison'
  | 'stunned'
  | 'shielded'
  | 'marked'
  | 'chilled'
  | 'regen'
  | 'hasted'
  | 'cauterized'
  | 'spine_guard';

export interface StatusEffect {
  kind: StatusKind;
  turns: number;
  potency: number;
}

export type EnemyArchetype =
  | 'goblin_skirmisher'
  | 'crypt_skeleton'
  | 'plague_rat'
  | 'bone_acolyte'
  | 'ash_cultist'
  | 'shadow_stalker'
  | 'iron_golem'
  | 'cinder_wisp'
  | 'dread_wraith'
  | 'blight_weaver'
  | 'obsidian_warden'
  | 'grave_husk'
  | 'spore_hulk'
  | 'rime_revenant'
  | 'boss_bone_cantor'
  | 'boss_ashen_inquisitor'
  | 'boss_malakor';

export type EnemyRank = 'normal' | 'elite' | 'rare' | 'randboss';

export interface EnemyIntent {
  type: 'strike' | 'heavy_windup' | 'hex_bolt' | 'ground_slam' | 'enemy_skill';
  label: string;
  damage: number;
  targetTiles: Array<{ x: number; y: number }>;
  skillId?: SkillId;
}

export interface Enemy {
  id: string;
  archetype: EnemyArchetype;
  name: string;
  glyph: string;
  color: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  xpReward: number;
  goldReward: number;
  isBoss?: boolean;
  isElite?: boolean;
  rank?: EnemyRank;
  rankTitle?: string;
  skillLoadout?: SkillId[];
  skillCooldowns?: Partial<Record<SkillId, number>>;
  runeCharge?: boolean;
  /** Phase 3: Grave Husk "Deathless" — set once its one free death-cheat is spent. */
  undyingUsed?: boolean;
  statuses: StatusEffect[];
  intent?: EnemyIntent;
  alerted: boolean;
  pacified?: boolean;
  description: string;
}

export interface GroundLoot {
  id: string;
  x: number;
  y: number;
  gold?: number;
  item?: Item;
}

export interface NpcPlacement {
  id: string;
  x: number;
  y: number;
  glyph: string;
  color: string;
  name: string;
  title: string;
  /** Phase 3 ambient life: post the NPC idles around (defaults to spawn x/y). */
  homeX?: number;
  homeY?: number;
  /** Phase 3 ambient life: ambient townsfolk wander a few tiles from their post. */
  roams?: boolean;
}

export type CritterKind = 'vale_rabbit' | 'ash_fox' | 'cinder_crow' | 'cave_bat' | 'town_cat' | 'fen_frog';

/** Phase 3 ambient life: non-combat, non-blocking wildlife. Never interacts
 *  with combat, pathing or quests; persisted as plain zone data and safely
 *  absent (undefined) in older saves. */
export interface CritterState {
  id: string;
  kind: CritterKind;
  name: string;
  glyph: string;
  color: string;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
}

export interface ZoneMap {
  id: ZoneId;
  name: string;
  subtitle: string;
  isTown: boolean;
  depth: number;
  width: number;
  height: number;
  tiles: Tile[][];
  enemies: Enemy[];
  npcs: NpcPlacement[];
  /** Phase 3 ambient life: optional so pre-Phase-3 saves hydrate unchanged. */
  critters?: CritterState[];
  loot: GroundLoot[];
  spawnPoint: { x: number; y: number };
  returnPoint: { x: number; y: number };
}

export interface PlayerState {
  name: string;
  starterClass: 'Vanguard' | 'Shadowcraft' | 'Runecaster' | 'Wanderer';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  level: number;
  xp: number;
  xpToNext: number;
  gold: number;
  attributePoints: number;
  skillPoints: number;
  attributes: Attributes;
  skills: Partial<Record<SkillId, number>>;
  prodigies?: ProdigyId[];
  prodigyCooldowns?: Partial<Record<ProdigyId, number>>;
  hotbar: Array<SkillId | null>;
  cooldowns: Partial<Record<SkillId, number>>;
  hasteSteps?: number;
  bonusHp?: number;
  statuses: StatusEffect[];
  equipped: Partial<Record<ItemSlot, Item>>;
  inventory: Item[];
  kills: number;
  turnsElapsed: number;
  firstStrikeReady: boolean;
  lastDirX?: -1 | 1;
  companion?: CompanionState;
}

export interface DerivedStats {
  maxHp: number;
  maxMana: number;
  atk: number;
  def: number;
  spellPower: number;
  critChance: number;
  dodgeChance: number;
  lifesteal: number;
  thorns: number;
  buildTitle: string;
}

export interface WorldFlags {
  discoveredZones: ZoneId[];
  caravanChoice?: 'arrested_vex' | 'smuggler_pact';
  blightChoice?: 'herbs_gathered' | 'cantor_appeased';
  bellChoice?: 'attuned_lyra' | 'sold_corvus' | 'shattered_self';
  vexTipClaimed?: boolean;
  malakorWeakened?: boolean;
  cipherInscribed?: boolean;
  malakorDefeated?: boolean;
  cantorDefeated?: boolean;
  cantorPacified?: boolean;
  inquisitorDefeated?: boolean;
  barrowBossDefeated?: boolean;
  mireBossDefeated?: boolean;
  frostBossDefeated?: boolean;
  silverbridgeCleared?: boolean;
  miraPotionTier: number;
  citadelAccess: boolean;
  floor3Shortcut: boolean;
  npcMet: Record<string, boolean>;
  npcDisposition: Record<string, number>;
  readLoreIds: string[];
  confrontedBosses?: string[];
  /** Audit Tier 2: set once the run's guaranteed early gear drop lands. */
  firstGearDropped?: boolean;
  waystonesAttuned?: number;
  bestiaryKills?: Partial<Record<EnemyArchetype, number>>;
  unlockedFeats?: string[];
  townUpgrades?: {
    apothecary: number;
    smithy: number;
    watchtower: number;
  };
}

export type QuestStatus = 'active' | 'completed' | 'failed';

export interface QuestProgress {
  id: string;
  status: QuestStatus;
  stage: number;
  outcomeLabel?: string;
  history: string[];
}

export interface DialogueSkillCheck {
  attribute: AttributeKey;
  threshold: number;
}

export interface DialogueCondition {
  flag?: keyof WorldFlags;
  flagEquals?: string | boolean | number;
  questId?: string;
  questStatus?: QuestStatus;
  questMinStage?: number;
  questMaxStage?: number;
  hasItemTag?: string;
  minGold?: number;
  notFlag?: keyof WorldFlags;
}

export interface DialogueChoice {
  id: string;
  label: string;
  nextNodeId?: string;
  check?: DialogueSkillCheck;
  failNodeId?: string;
  condition?: DialogueCondition;
  action?:
    | { type: 'open_merchant'; merchantId: string }
    | { type: 'respec_skills'; cost: number }
    | { type: 'heal_full' }
    | { type: 'start_quest'; questId: string; log: string }
    | { type: 'advance_quest'; questId: string; stage: number; log: string }
    | { type: 'complete_quest'; questId: string; outcomeLabel: string; log: string; rewardGold?: number; rewardXp?: number; rewardSkillPoint?: number; rewardAttrPoint?: number; rewardItemTag?: string }
    | { type: 'set_flag'; flag: keyof WorldFlags; value: unknown }
    | { type: 'consume_quest_item'; tag: string }
    | { type: 'give_gold'; amount: number }
    | { type: 'spend_gold'; amount: number }
    | { type: 'grant_buff'; text: string; hpBonus?: number }
    | { type: 'unlock_highspire' }
    | { type: 'open_upgrades' }
    | { type: 'switch_companion' }
    | { type: 'close_dialogue' };
  extraActions?: Array<NonNullable<DialogueChoice['action']>>;
}

export interface DialogueNode {
  id: string;
  speakerName?: string;
  text: string;
  choices: DialogueChoice[];
}

export interface NpcDef {
  id: string;
  name: string;
  title: string;
  glyph: string;
  color: string;
  zone: ZoneId;
  portraitUrl?: string;
  portrait: Array<{ text: string; color: string }>;
  merchantId?: string;
  rootNodeId: string;
  nodes: Record<string, DialogueNode>;
}

export interface LogEntry {
  id: string;
  turn: number;
  text: string;
  tone: 'neutral' | 'combat' | 'crit' | 'loot' | 'quest' | 'danger' | 'arcane';
}

export interface FloatingEffect {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  createdAt: number;
  duration: number;
}

export interface ParticleBurst {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  char: string;
  createdAt: number;
  duration: number;
}

export interface ProjectileEffect {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  glyph: string;
  createdAt: number;
  duration: number;
}

export interface HitFlash {
  id: string;
  x: number;
  y: number;
  color: string;
  until: number;
}

export interface ChronicleEntry {
  id: string;
  outcome: 'victory' | 'fallen';
  starterClass: PlayerState['starterClass'];
  buildTitle: string;
  level: number;
  deepestDepth: number;
  kills: number;
  turnsElapsed: number;
  gold: number;
  keyDecisions: string[];
  createdAtMs: number;
}
