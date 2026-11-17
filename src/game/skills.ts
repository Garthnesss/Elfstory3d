import {
  AttributeKey,
  Attributes,
  DerivedStats,
  ItemStats,
  PlayerState,
  ProdigyDef,
  ProdigyId,
  QuestProgress,
  RelicSetId,
  SkillBranch,
  SkillDef,
  SkillId,
  WorldFlags,
} from './types';

export const ATTRIBUTE_META: Record<
  AttributeKey,
  { name: string; short: string; description: string; color: string }
> = {
  might: {
    name: 'Might',
    short: 'MIG',
    description: '+3 Attack Power and +5 Max HP per point. Breaks rusted gates & empowers Vanguard strikes.',
    color: '#D9534F',
  },
  agility: {
    name: 'Agility',
    short: 'AGI',
    description: '+2.5% Crit Chance, +2% Dodge, and +1 Attack Power per point. Detects hidden traps & vaults.',
    color: '#4EA885',
  },
  arcana: {
    name: 'Arcana',
    short: 'ARC',
    description: '+3 Spell Power and +4 Max Mana per point. Unlocks ancient runes & potent Runecaster spells.',
    color: '#5B8DEF',
  },
  resolve: {
    name: 'Resolve',
    short: 'RES',
    description: '+2 Defense and +6 Max HP per point. Steadies morale in tense dialogue & boosts ward scaling.',
    color: '#D99B26',
  },
};

export const BRANCH_META: Record<
  SkillBranch,
  { name: string; subtitle: string; color: string; accentClass: string }
> = {
  vanguard: {
    name: 'Vanguard',
    subtitle: 'Heavy strikes, guard stances, and crimson sustain.',
    color: '#D9534F',
    accentClass: 'text-rose-400',
  },
  shadowcraft: {
    name: 'Shadowcraft',
    subtitle: 'Blink ambushes, toxic edges, and lethal precision.',
    color: '#4EA885',
    accentClass: 'text-emerald-400',
  },
  runecaster: {
    name: 'Runecaster',
    subtitle: 'Piercing ember lances, frost control, and mana echo.',
    color: '#5B8DEF',
    accentClass: 'text-sky-400',
  },
};

export const SKILLS: Record<SkillId, SkillDef> = {
  cleave: {
    id: 'cleave',
    name: 'Sundering Cleave',
    branch: 'vanguard',
    tier: 1,
    kind: 'active',
    targeting: 'adjacent',
    range: 1,
    manaCost: 5,
    cooldown: 2,
    glyph: '⚔',
    summary: 'Strike an enemy and sweep adjacent foes around you.',
    rankDescriptions: [
      'Deals 135% ATK to target and 75% ATK to adjacent enemies.',
      'Deals 155% ATK to target, 95% ATK splash, and applies Bleed (2t).',
      'Deals 180% ATK to target, 120% ATK splash, and Bleed (3t).',
    ],
    scalingNote: 'Scales with Might & Weapon ATK',
  },
  shield_bash: {
    id: 'shield_bash',
    name: 'Bastion Bash',
    branch: 'vanguard',
    tier: 1,
    kind: 'active',
    targeting: 'adjacent',
    range: 1,
    manaCost: 6,
    cooldown: 3,
    glyph: '⛨',
    summary: 'Slam a foe with armor-scaled force, interrupting telegraphed attacks.',
    rankDescriptions: [
      'Deals 90% ATK + 100% DEF and Stuns target for 1 turn.',
      'Deals 110% ATK + 130% DEF, Stuns 1t, and grants Shielded (+4 DEF, 2t).',
      'Deals 130% ATK + 160% DEF, Stuns 2t, and grants Shielded (+6 DEF, 3t).',
    ],
    scalingNote: 'Scales with Defense & Resolve',
  },
  bloodlust: {
    id: 'bloodlust',
    name: 'Crimson Vigor',
    branch: 'vanguard',
    tier: 2,
    kind: 'passive',
    targeting: 'passive',
    range: 0,
    manaCost: 0,
    cooldown: 0,
    glyph: '🩸',
    summary: 'Passive: Drain life on melee attacks and strike harder when wounded.',
    rankDescriptions: [
      '+4% Lifesteal and +10% Crit against enemies below 50% HP.',
      '+7% Lifesteal and +18% Crit against enemies below 50% HP.',
      '+10% Lifesteal, +25% Crit vs wounded foes, and kills heal 5 HP.',
    ],
    scalingNote: 'Synergizes with Shadowcraft Crit',
  },
  iron_fortress: {
    id: 'iron_fortress',
    name: 'Iron Fortress',
    branch: 'vanguard',
    tier: 3,
    kind: 'active',
    targeting: 'self',
    range: 0,
    manaCost: 8,
    cooldown: 5,
    glyph: '♜',
    summary: 'Brace behind an unyielding ward, gaining massive Defense and Thorns.',
    rankDescriptions: [
      'Grants Shielded (+8 DEF, 3t) and +6 Thorns retaliation.',
      'Grants Shielded (+11 DEF, 3t), +10 Thorns, and cleanses Bleed/Poison.',
      'Grants Shielded (+14 DEF, 4t), +15 Thorns, cleanses debuffs, and heals 12 HP.',
    ],
    scalingNote: 'Keystone · Scales with Resolve',
  },

  shadowstep: {
    id: 'shadowstep',
    name: 'Shadowstep',
    branch: 'shadowcraft',
    tier: 1,
    kind: 'active',
    targeting: 'blink',
    range: 4,
    manaCost: 6,
    cooldown: 3,
    glyph: '◈',
    summary: 'Blink through shadow to any visible tile within 4 paces; strikes next to a foe.',
    rankDescriptions: [
      'Teleport up to 4 tiles; if landing adjacent to a foe, ambush for 125% ATK.',
      'Teleport up to 5 tiles; ambush deals 150% ATK with guaranteed Critical Hit.',
      'Teleport up to 5 tiles; ambush deals 175% ATK Crit and grants 1t Dodge surge.',
    ],
    scalingNote: 'Scales with Agility & Crit',
  },
  venom_tip: {
    id: 'venom_tip',
    name: 'Viper Edge',
    branch: 'shadowcraft',
    tier: 1,
    kind: 'active',
    targeting: 'ranged',
    range: 4,
    manaCost: 5,
    cooldown: 2,
    glyph: '➶',
    summary: 'Hurl a coated blade from range, inflicting stacking Poison and Bleed.',
    rankDescriptions: [
      'Range 4: Deals 95% ATK + Agility and applies Poison (3 dmg/turn, 3t).',
      'Range 5: Deals 115% ATK + Agility, applies Poison (5/t, 3t) and Bleed (2t).',
      'Range 5: Deals 135% ATK + Agility, Poison (7/t, 4t), Bleed (3t), ignores 50% DEF.',
    ],
    scalingNote: 'Scales with Agility',
  },
  evasive_instinct: {
    id: 'evasive_instinct',
    name: 'Phantom Reflex',
    branch: 'shadowcraft',
    tier: 2,
    kind: 'passive',
    targeting: 'passive',
    range: 0,
    manaCost: 0,
    cooldown: 0,
    glyph: '✦',
    summary: 'Passive: Heighten evasion and retaliate when enemies miss.',
    rankDescriptions: [
      '+8% Dodge Chance and +5% Crit Chance.',
      '+13% Dodge Chance, +8% Crit Chance, and dodging restores 2 Mana.',
      '+18% Dodge Chance, +12% Crit, and dodging triggers a free counter-slash!',
    ],
    scalingNote: 'Synergizes with Runecaster Mana',
  },
  executioners_mark: {
    id: 'executioners_mark',
    name: "Executioner's Mark",
    branch: 'shadowcraft',
    tier: 3,
    kind: 'active',
    targeting: 'ranged',
    range: 5,
    manaCost: 7,
    cooldown: 4,
    glyph: '⌖',
    summary: 'Brand a foe with a death glyph so all hits deal amplified damage.',
    rankDescriptions: [
      'Marks target for 4 turns (+35% damage taken) and deals 110% ATK.',
      'Marks target for 4 turns (+45% damage taken) and deals 140% ATK.',
      'Marks target for 5 turns (+60% damage taken), deals 170% ATK; kills reset cooldown.',
    ],
    scalingNote: 'Keystone · Amplifies Spells & Strikes',
  },

  ember_lance: {
    id: 'ember_lance',
    name: 'Ember Lance',
    branch: 'runecaster',
    tier: 1,
    kind: 'active',
    targeting: 'ranged',
    range: 5,
    manaCost: 7,
    cooldown: 2,
    glyph: '🜂',
    summary: 'Project a piercing lance of cinder fire, scorching and igniting the target.',
    rankDescriptions: [
      'Range 5: Deals 10 + 125% Spell Power fire damage and inflicts Burn (3/t, 2t).',
      'Range 6: Deals 13 + 145% Spell Power, Burn (5/t, 3t), and pierces 1 tile behind.',
      'Range 6: Deals 13 + 155% Spell Power, Burn (7/t, 3t), and explodes in a 1-tile radius.',
    ],
    scalingNote: 'Scales with Arcana & Spell Power',
  },
  frost_nova: {
    id: 'frost_nova',
    name: 'Rime Nova',
    branch: 'runecaster',
    tier: 1,
    kind: 'active',
    targeting: 'self',
    range: 2,
    manaCost: 8,
    cooldown: 3,
    glyph: '❄',
    summary: 'Erupt an icy ring around you, damaging and Chilling nearby enemies.',
    rankDescriptions: [
      'Radius 2: Deals 10 + 110% Spell Power and Chills enemies (halves damage, 2t).',
      'Radius 2: Deals 14 + 140% Spell Power, Chills 2t, and Stuns adjacent foes 1t.',
      'Radius 3: Deals 18 + 170% Spell Power, Chills 3t, Stuns adjacent foes 1t.',
    ],
    scalingNote: 'Crowd Control · Scales with Arcana',
  },
  siphon_soul: {
    id: 'siphon_soul',
    name: 'Soul Siphon',
    branch: 'runecaster',
    tier: 2,
    kind: 'passive',
    targeting: 'passive',
    range: 0,
    manaCost: 0,
    cooldown: 0,
    glyph: '☽',
    summary: 'Passive: Recover Mana and Health whenever you slay or cast spells.',
    rankDescriptions: [
      '+4 Spell Power. Slaying an enemy restores 3 Mana.',
      '+7 Spell Power. Slaying restores 5 Mana and 4 HP.',
      '+11 Spell Power. Slaying restores 7 Mana and 7 HP; crits restore 2 Mana.',
    ],
    scalingNote: 'Sustain Engine · Pairs with any build',
  },
  arcane_echo: {
    id: 'arcane_echo',
    name: 'Arcane Echo',
    branch: 'runecaster',
    tier: 3,
    kind: 'passive',
    targeting: 'passive',
    range: 0,
    manaCost: 0,
    cooldown: 0,
    glyph: '❖',
    summary: 'Keystone Passive: Active skills gain a chance to echo a second blast for free.',
    rankDescriptions: [
      '25% chance for active skills to trigger a bonus 50% power Arcane Bolt.',
      '40% chance for active skills to trigger a 65% power Arcane Bolt and reduce cooldowns by 1.',
      '55% chance to trigger an 85% power Arcane Bolt, reduce cooldowns, and gain +10% Crit.',
    ],
    scalingNote: 'Keystone · Amplifies ALL Active Skills',
  },
};

export const ALL_SKILLS_LIST: SkillDef[] = Object.values(SKILLS);

export function getBranchInvestedPoints(
  skills: Partial<Record<SkillId, number>>,
  branch: SkillBranch
): number {
  return ALL_SKILLS_LIST.filter((s) => s.branch === branch).reduce(
    (sum, s) => sum + (skills[s.id] ?? 0),
    0
  );
}

export function canLearnSkill(player: PlayerState, skillId: SkillId): { ok: boolean; reason?: string } {
  const def = SKILLS[skillId];
  const currentRank = player.skills[skillId] ?? 0;
  if (currentRank >= 3) {
    return { ok: false, reason: 'Mastered (Rank 3/3)' };
  }
  if (player.skillPoints <= 0) {
    return { ok: false, reason: 'Requires 1 Skill Point' };
  }
  const branchPts = getBranchInvestedPoints(player.skills, def.branch);
  if (def.tier === 2 && branchPts < 1) {
    return { ok: false, reason: `Requires 1 pt in ${BRANCH_META[def.branch].name}` };
  }
  if (def.tier === 3 && branchPts < 3) {
    return { ok: false, reason: `Requires 3 pts in ${BRANCH_META[def.branch].name}` };
  }
  return { ok: true };
}

export function computeBuildTitle(player: PlayerState): string {
  const v = getBranchInvestedPoints(player.skills, 'vanguard');
  const s = getBranchInvestedPoints(player.skills, 'shadowcraft');
  const r = getBranchInvestedPoints(player.skills, 'runecaster');
  const total = v + s + r;
  if (total === 0) return player.starterClass;

  const activeBranches = [
    { b: 'vanguard' as const, pts: v },
    { b: 'shadowcraft' as const, pts: s },
    { b: 'runecaster' as const, pts: r },
  ]
    .filter((x) => x.pts > 0)
    .sort((a, b) => b.pts - a.pts);

  if (activeBranches.length >= 3 && activeBranches[2].pts >= 1) {
    return 'Tri-Glyph Paragon';
  }
  if (activeBranches.length >= 2 && activeBranches[1].pts >= 2) {
    const pair = [activeBranches[0].b, activeBranches[1].b].sort().join('+');
    if (pair === 'shadowcraft+vanguard') return 'Crimson Duelist';
    if (pair === 'runecaster+vanguard') return 'Ashen Templar';
    if (pair === 'runecaster+shadowcraft') return 'Runic Nightblade';
  }
  const top = activeBranches[0].b;
  if (top === 'vanguard') return v >= 5 ? 'Iron Juggernaut' : 'Oathsworn Vanguard';
  if (top === 'shadowcraft') return s >= 5 ? 'Phantom Executioner' : 'Shadow Stalker';
  return r >= 5 ? 'Archon of Cinder' : 'Runecaster Adept';
}

export function getEquippedSetCounts(player: PlayerState): Record<RelicSetId, number> {
  const counts: Record<RelicSetId, number> = {
    starlight_outrider: 0,
    cinderforged: 0,
    thornbound: 0,
    rimebound: 0,
  };
  for (const item of Object.values(player.equipped)) {
    if (item?.setId) {
      counts[item.setId] = (counts[item.setId] ?? 0) + 1;
    }
  }
  return counts;
}

// Audit Tier 2: the 2-piece relic set bonuses are live again. The Pack's
// set cards have always promised exactly these numbers (RELIC_SETS
// bonusLabel in loot.ts); the Nov 15 cut pass removed the application,
// not the text — so the chase had no payoff and the cards quietly lied.
export const RELIC_SET_BONUSES: Record<RelicSetId, Partial<ItemStats>> = {
  starlight_outrider: { atk: 4, critChance: 8, dodgeChance: 6, maxHp: 10 },
  cinderforged: { def: 4, spellPower: 6, thorns: 6, maxHp: 15 },
  thornbound: { atk: 3, thorns: 4, lifesteal: 3, maxHp: 12 },
  rimebound: { def: 5, dodgeChance: 8, maxMana: 10, maxHp: 8 },
};

export function computeDerivedStats(player: PlayerState, worldFlags?: WorldFlags): DerivedStats {
  const { might, agility, arcana, resolve } = player.attributes;
  let maxHp = 34 + (player.level - 1) * 6 + might * 5 + resolve * 6 + (player.bonusHp ?? 0);
  let maxMana = 14 + (player.level - 1) * 2 + arcana * 4;
  let atk = 6 + might * 3 + agility * 1;
  let def = 1 + resolve * 2;
  let spellPower = 4 + arcana * 3;
  let critChance = 6 + agility * 2.5;
  let dodgeChance = 3 + agility * 2;
  let lifesteal = 0;
  let thorns = 0;

  for (const item of Object.values(player.equipped)) {
    if (!item) continue;
    const s = item.stats;
    maxHp += s.maxHp ?? 0;
    maxMana += s.maxMana ?? 0;
    atk += s.atk ?? 0;
    def += s.def ?? 0;
    spellPower += s.spellPower ?? 0;
    critChance += s.critChance ?? 0;
    dodgeChance += s.dodgeChance ?? 0;
    lifesteal += s.lifesteal ?? 0;
    thorns += s.thorns ?? 0;
  }

  const setCounts = getEquippedSetCounts(player);
  for (const setId of Object.keys(RELIC_SET_BONUSES) as RelicSetId[]) {
    if ((setCounts[setId] ?? 0) < 2) continue;
    const b = RELIC_SET_BONUSES[setId];
    maxHp += b.maxHp ?? 0;
    maxMana += b.maxMana ?? 0;
    atk += b.atk ?? 0;
    def += b.def ?? 0;
    spellPower += b.spellPower ?? 0;
    critChance += b.critChance ?? 0;
    dodgeChance += b.dodgeChance ?? 0;
    lifesteal += b.lifesteal ?? 0;
    thorns += b.thorns ?? 0;
  }

  const bloodRank = player.skills.bloodlust ?? 0;
  if (bloodRank > 0) {
    lifesteal += bloodRank === 1 ? 4 : bloodRank === 2 ? 7 : 10;
  }

  const evasiveRank = player.skills.evasive_instinct ?? 0;
  if (evasiveRank > 0) {
    dodgeChance += evasiveRank === 1 ? 8 : evasiveRank === 2 ? 13 : 18;
    critChance += evasiveRank === 1 ? 5 : evasiveRank === 2 ? 8 : 12;
  }

  const siphonRank = player.skills.siphon_soul ?? 0;
  if (siphonRank > 0) {
    spellPower += siphonRank === 1 ? 4 : siphonRank === 2 ? 7 : 11;
  }

  const echoRank = player.skills.arcane_echo ?? 0;
  if (echoRank === 3) {
    critChance += 10;
  }

  const prodigies = player.prodigies ?? [];
  if (prodigies.includes('carry_the_world')) {
    atk += 12;
    maxHp += 20;
  }
  if (prodigies.includes('draconic_will')) {
    def += 4;
    maxHp += 12;
  }
  if (prodigies.includes('flexible_combat')) {
    critChance += 5;
  }
  if (prodigies.includes('arcane_conduit')) {
    spellPower += 8;
  }

  if (player.companion && player.companion.hp > 0) {
    if (player.companion.kind === 'silverwind_lynx') {
      critChance += 3;
    } else if (player.companion.kind === 'starlight_owl') {
      spellPower += 2;
    }
  }

  for (const st of player.statuses) {
    if (st.kind === 'shielded') {
      def += st.potency;
    } else if (st.kind === 'spine_guard') {
      def += 5;
      thorns += 6;
    }
  }

  return {
    maxHp,
    maxMana,
    atk,
    def,
    spellPower,
    critChance: Math.min(75, Math.round(critChance)),
    dodgeChance: Math.min(55, Math.round(dodgeChance)),
    lifesteal,
    thorns,
    buildTitle: computeBuildTitle(player),
  };
}

export const PRODIGIES: Record<ProdigyId, ProdigyDef> = {
  cauterize: {
    id: 'cauterize',
    name: 'Cauterize',
    glyph: '🜂',
    pillar: 'Runecaster',
    requirementLabel: 'Level 6+ · Arcana 6',
    requirements: { arcana: 6 },
    summary: 'Your arcane fire refuses to let death claim you.',
    effectNote:
      'Once every 25 turns, lethal damage leaves you alive at 25% HP with +10 DEF Cauterize Ward for 3 turns.',
  },
  draconic_will: {
    id: 'draconic_will',
    name: 'Draconic Will',
    glyph: '⛨',
    pillar: 'Vanguard',
    requirementLabel: 'Level 6+ · Resolve 6',
    requirements: { resolve: 6 },
    summary: 'Harden body and mind like ancient wyrm-scale.',
    effectNote:
      '+4 DEF, +12 Max HP, 60% chance to resist incoming ailments, and auto-cleanse 1 debuff every 4 turns.',
  },
  flexible_combat: {
    id: 'flexible_combat',
    name: 'Flexible Combat',
    glyph: '◈',
    pillar: 'Shadowcraft',
    requirementLabel: 'Level 6+ · Agility 6',
    requirements: { agility: 6 },
    summary: 'Weave seamless unarmed follow-ups into every strike.',
    effectNote:
      '+5% Crit Chance and 45% chance on melee or Shadowcraft hits to land a free bonus follow-up strike (65% ATK).',
  },
  carry_the_world: {
    id: 'carry_the_world',
    name: 'I Can Carry the World',
    glyph: '⚔',
    pillar: 'Vanguard',
    requirementLabel: 'Level 6+ · Might 6',
    requirements: { might: 6 },
    summary: 'Towering strength turns every swing into a shockwave.',
    effectNote:
      '+12 Attack Power, +20 Max HP, and +25% bonus damage on Sundering Cleave and Bastion Bash.',
  },
  arcane_conduit: {
    id: 'arcane_conduit',
    name: 'Arcane Conduit',
    glyph: '❖',
    pillar: 'Hybrid',
    requirementLabel: 'Level 6+ · Arcana 5 · Resolve 5',
    requirements: { arcana: 5, resolve: 5 },
    summary: 'Channel spells in an unbroken cycle.',
    effectNote:
      '+8 Spell Power; casting any Runecaster skill shaves 1 turn off all other cooldowns.',
  },
  spine_of_world: {
    id: 'spine_of_world',
    name: 'Spine of the World',
    glyph: '♜',
    pillar: 'Hybrid',
    requirementLabel: 'Level 6+ · Might 5 · Resolve 5',
    requirements: { might: 5, resolve: 5 },
    summary: 'Stone-hard poise punishes any foe bold enough to strike you.',
    effectNote:
      'Whenever an enemy hits you, gain Spine Guard for 3 turns (+5 DEF and +6 Thorns retaliation).',
  },
};

export const ALL_PRODIGIES_LIST: ProdigyDef[] = Object.values(PRODIGIES);

/** Capstones are part of the skill tree now: bought with Skill Points. */
export const PRODIGY_SKILL_COST = 2;

export function hasProdigy(player: PlayerState, id: ProdigyId): boolean {
  return Boolean(player.prodigies?.includes(id));
}

export function canLearnProdigy(
  player: PlayerState,
  id: ProdigyId
): { ok: boolean; reason?: string } {
  if (hasProdigy(player, id)) {
    return { ok: false, reason: 'Already Claimed' };
  }
  const def = PRODIGIES[id];
  if (player.level < 6) {
    return { ok: false, reason: 'Unlocks at Level 6' };
  }
  if ((player.skillPoints ?? 0) < PRODIGY_SKILL_COST) {
    return { ok: false, reason: `Costs ${PRODIGY_SKILL_COST} Skill Points` };
  }
  for (const [attr, req] of Object.entries(def.requirements)) {
    const cur = player.attributes[attr as AttributeKey] ?? 0;
    if (req && cur < req) {
      return { ok: false, reason: `Needs ${ATTRIBUTE_META[attr as AttributeKey].name} ${req} (${cur}/${req})` };
    }
  }
  return { ok: true };
}

export function getStarterPreset(
  starterClass: PlayerState['starterClass']
): {
  attributes: Attributes;
  initialSkill: SkillId;
  weaponTag: string;
} {
  switch (starterClass) {
    case 'Vanguard':
      return {
        attributes: { might: 3, agility: 1, arcana: 1, resolve: 2 },
        initialSkill: 'cleave',
        weaponTag: 'starter_vanguard',
      };
    case 'Shadowcraft':
      return {
        attributes: { might: 1, agility: 3, arcana: 1, resolve: 2 },
        initialSkill: 'shadowstep',
        weaponTag: 'starter_shadow',
      };
    case 'Runecaster':
      return {
        attributes: { might: 1, agility: 1, arcana: 3, resolve: 2 },
        initialSkill: 'ember_lance',
        weaponTag: 'starter_rune',
      };
    default:
      return {
        attributes: { might: 2, agility: 2, arcana: 2, resolve: 1 },
        initialSkill: 'venom_tip',
        weaponTag: 'starter_wanderer',
      };
  }
}

export function computeRespecPoints(
  level: number,
  worldFlags: WorldFlags,
  quests: Record<string, QuestProgress>
): { attributePoints: number; skillPoints: number } {
  const safeLevel = Math.max(1, level);
  const miraCantorTurnedIn = quests.herbalist_blight?.outcomeLabel === 'Silenced the Bone Cantor';
  const pacifiedVaelen =
    worldFlags.cantorPacified === true ||
    (worldFlags.cantorPacified === undefined &&
      worldFlags.blightChoice === 'cantor_appeased' &&
      !miraCantorTurnedIn);

  const skillPoints =
    2 +
    (safeLevel - 1) +
    (worldFlags.bellChoice === 'attuned_lyra' ? 1 : 0) +
    (pacifiedVaelen ? 1 : 0) +
    (miraCantorTurnedIn ? 1 : 0) +
    (quests.spores_of_bog?.status === 'completed' ? 1 : 0);

  const attributePoints =
    (safeLevel - 1) * 2 +
    (worldFlags.bellChoice === 'shattered_self' ? 2 : 0) +
    (quests.barrow_purge?.status === 'completed' ? 1 : 0) +
    (quests.cinder_and_frost?.status === 'completed' ? 1 : 0);

  return { attributePoints, skillPoints };
}
