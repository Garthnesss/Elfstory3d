import { createConsumable, generateProceduralItem } from './loot';
import { Item, NpcDef, QuestProgress } from './types';
import corvusPortrait from '../assets/images/portrait_corvus_1794537785514.jpg';
import kaelenPortrait from '../assets/images/portrait_kaelen_1794537786190.jpg';
import lyraPortrait from '../assets/images/portrait_lyra_1794537782827.jpg';
import miraPortrait from '../assets/images/portrait_mira_1794537782634.jpg';
import orinPortrait from '../assets/images/portrait_orin_1794537785766.jpg';
import torinPortrait from '../assets/images/portrait_torin_1794537782658.jpg';
import vancePortrait from '../assets/images/portrait_vance_1794537783424.jpg';
import vexPortrait from '../assets/images/portrait_vex_1794537783530.jpg';
import rowanPortrait from '../assets/images/portrait_rowan_1794634591930.jpg';
import sylvaPortrait from '../assets/images/portrait_sylva_1794634618311.jpg';
import bramPortrait from '../assets/images/portrait_bram_1794634617902.jpg';
import haldaPortrait from '../assets/images/portrait_halda_1794634618989.jpg';
import darekPortrait from '../assets/images/portrait_darek_1794634620253.jpg';

export interface QuestDef {
  id: string;
  title: string;
  giver: string;
  location: string;
  summary: string;
}

export const QUEST_DEFS: Record<string, QuestDef> = {
  shadows_beneath: {
    id: 'shadows_beneath',
    title: 'Shadows Beneath Oakhaven',
    giver: 'Warden Vance / Vex',
    location: 'Oakhaven & Floor 1',
    summary:
      'Retrieve the Sealed Contraband Ledger from Floor 1 of the Sunken Reliquary and decide whether to hand it to Warden Vance or Smuggler Vex.',
  },
  herbalist_blight: {
    id: 'herbalist_blight',
    title: "The Herbalist's Blight",
    giver: 'Herbalist Mira',
    location: 'Oakhaven & Floors 1–2',
    summary:
      'Collect Pale Nightbloom from the upper crypts, or commune with the Bone Cantor using your Resolve or Arcana to lift the miasma.',
  },
  whispering_bell: {
    id: 'whispering_bell',
    title: 'The Whispering Bell',
    giver: 'Archivist Lyra / Corvus',
    location: 'Highspire Citadel & Floor 3',
    summary:
      'Recover the resonant bronze bell from the Ember Vaults (Floor 3) and choose its fate: attune it with Lyra, sell it to Corvus, or shatter it yourself.',
  },
  sovereign_cinder: {
    id: 'sovereign_cinder',
    title: 'The Sovereign of Cinder',
    giver: 'Guildmaster Kaelen',
    location: 'Highspire & Floor 5',
    summary:
      'Descend to the Obsidian Sanctum on Floor 5 and end the reign of Malakor, Sovereign of Cinder.',
  },
  outrider_oath: {
    id: 'outrider_oath',
    title: 'Oath of the Silver Bough',
    giver: 'Archivist Lyra / Elven Waystones',
    location: 'Highspire & Floors 1–4',
    summary:
      'Attune 2 ancient Elven Waystones (◈) hidden in the sunken vaults to rekindle the Outrider beacon and claim an elven Starlight Relic.',
  },
  silverwood_road: {
    id: 'silverwood_road',
    title: 'The Silverbridge Toll',
    giver: 'Rowan the Wayfarer',
    location: 'Silverwood Vale Overworld',
    summary:
      'Cross Silverbridge in the Silverwood Vale Overworld, rout the brigands holding the eastern watchtower, and reclaim Rowan’s Stolen Satchel.',
  },
  spores_of_bog: {
    id: 'spores_of_bog',
    title: 'Spores of the Bog',
    giver: 'Elder Sylva',
    location: 'Thornwick Fen & Fungal Hollow',
    summary:
      'Venture east of Thornwick Fen into Fungal Hollow (2 floors), slay Spore-Matron Vexis, and bring Elder Sylva the Bioluminescent Fungal Heart.',
  },
  barrow_purge: {
    id: 'barrow_purge',
    title: 'Wights of the Barrow',
    giver: 'Captain Darek',
    location: 'Cinderwatch & Whispering Barrow',
    summary:
      'Descend into Whispering Barrow in northern Silverwood Vale (2 floors) and bring Captain Darek Arch-Wight Morvath’s Barrow Seal.',
  },
  cinder_and_frost: {
    id: 'cinder_and_frost',
    title: 'Heart of the Caldera',
    giver: 'Forgemistress Halda',
    location: 'Cinderwatch & Frostpeak Cavern',
    summary:
      'Conquer the 3 depths of Frostpeak & Ashen Caldera northeast of Cinderwatch and return Ignis-Warden Kaelthar’s Ashen Ore Heart to Halda.',
  },
  deep_survey: {
    id: 'deep_survey',
    title: 'Charting the Deep Roads',
    giver: 'Rowan the Wayfarer',
    location: 'Silverwood Vale & the Sunken Vaults',
    summary:
      'No blade required: transcribe 6 carved steles (‡) scattered across towns, the Vale, and the vaults to finish Rowan’s survey of the deep roads.',
  },
};

export const LORE_ENTRIES: Record<string, { title: string; text: string }> = {
  lore_oakhaven_post: {
    title: 'Oakhaven Gate Ledger',
    text: 'Founded beside the sunken seal after the First Ember, Oakhaven stands watch over the descent stairs. Those who enter the Reliquary rarely return empty-handed—if they return at all.',
  },
  lore_highspire_archive: {
    title: 'Marble Edict of Highspire',
    text: 'Only bearers of the Citadel Seal or proved delve-wardens may walk Highspire’s upper galleries. Beneath our marble fountains, three tiers of basalt vaults hold the Cinder Sovereign’s crown.',
  },
  lore_floor_1: {
    title: 'Etched Wall Warning',
    text: '"Listen before stepping through dark arches. The skeletons wind their heavy blades before swinging; a nimble step or timely shield bash breaks their rhythm."',
  },
  lore_floor_2: {
    title: 'Cantor Vaelen’s Dirge',
    text: '"We did not turn to bone out of malice. We were bound to guard the lower bell until someone spoke the old words of release."',
  },
  lore_floor_3: {
    title: 'Inquisitor Tablet',
    text: '"Stone golems cannot be rushed headlong. Watch where their shadow falls before the ground slams—or shatter their plating with ember lances."',
  },
  lore_floor_4: {
    title: 'Crucible Inscription',
    text: '"Three masteries anchor the old order: Steel to hold the breach, Shadow to strike the unseen seam, and Rune to bend the ember’s breath."',
  },
  lore_floor_5: {
    title: 'Sovereign’s Epitaph',
    text: '"Malakor forged the Sunken Citadel not to hoard gold, but to outlast the fading of his own name. Speak firmly before drawing steel."',
  },
  lore_waystone: {
    title: 'Outrider Waystone Hymn',
    text: '"Before Highspire raised marble walls, elven Outriders set starlight stones along these subterranean roads so no lost sentinel would walk in utter dark."',
  },
  lore_forge: {
    title: 'Anvil Ledger of Torin’s Kin',
    text: '"Deep-vault coal burns hotter than surface oak. Even a cracked blade can drink deep-vault heat here and emerge keen enough to cleave obsidian."',
  },
  lore_altar: {
    title: 'Edict of the Scarlet Pact',
    text: '"Power purchased in blood lingers in steel. Those of steady Resolve may cleanse the altar instead—turning malice into quiet clarity."',
  },
  lore_overworld_vale: {
    title: 'Silverbridge Milestone',
    text: '"West to Oakhaven’s timber palisade; north past Whispering Barrow to Cinderwatch Bastion and Frostpeak; southeast through the fen to Thornwick and the Fungal Hollow."',
  },
  lore_thornwick_post: {
    title: 'Thornwick Stilt-Post Chronicle',
    text: '"Built on ironwood pilings above rising bog-water, Thornwick endures only while the druid wards hold back the Fungal Hollow’s spore-bloom."',
  },
  lore_cinderwatch_post: {
    title: 'Cinderwatch Ridge Tablet',
    text: '"Where glacial aquifers meet the Caldera’s magma vents, meteoric cinder-iron forms—fiercer than any steel smelted in Highspire."',
  },
  lore_barrow: {
    title: 'Whispering Barrow Epitaph',
    text: '"Do not speak Morvath’s true title aloud in the crypts. The wight-lord hears steel draw three halls away."',
  },
  lore_mire: {
    title: 'Mycelial Ward Note',
    text: '"Blight pools sap breath and marrow alike, yet those quick of step or rich in arcana can harvest gold from the glowing spores."',
  },
  lore_frost: {
    title: 'Frostpeak Miner’s Warning',
    text: '"Ice above, ember below. Carry healing draughts and clear the rime vents carefully before facing the Caldera Warden."',
  },
  lore_roadside_shrine: {
    title: 'Roadside Shrine of the Vale',
    text: '"For the road that watches back. Travelers leave a copper, a crust, or a confession — the Vale accepts all three currencies." Weathered offerings crowd the shrine’s base: bent nails, bird skulls, one very small boot.',
  },
};

export const NPCS: Record<string, NpcDef> = {
  torin: {
    id: 'torin',
    name: 'Torin Ironhand',
    title: 'Blacksmith & Forgemaster',
    glyph: '@',
    color: '#F59E0B',
    zone: 'oakhaven',
    merchantId: 'torin',
    portraitUrl: torinPortrait,
    portrait: [
      { text: '   .=======.   ', color: '#94A3B8' },
      { text: '  /  _   _  \\  ', color: '#E2E8F0' },
      { text: ' |  (o) (o)  | ', color: '#F59E0B' },
      { text: ' |   \\___/   | ', color: '#CBD5E1' },
      { text: '  \\__#####__/  ', color: '#78716C' },
      { text: '  /[=======]\\  ', color: '#D97706' },
    ],
    rootNodeId: 'root',
    nodes: {
      root: {
        id: 'root',
        text: 'Sparks drift from Torin’s anvil as he sets down a heavy hammer. "Fresh steel or a sturdy helm—whatever you haul up from the Reliquary, my forge can temper it into something worthy of the lower vaults."',
        choices: [
          {
            id: 'trade',
            label: 'Browse Armory & Arcane Forge',
            action: { type: 'open_merchant', merchantId: 'torin' },
          },
          {
            id: 'ask_craft',
            label: '[Might 3] Inspect his masterwork anvil techniques.',
            check: { attribute: 'might', threshold: 3 },
            nextNodeId: 'craft_pass',
            failNodeId: 'craft_fail',
          },
          {
            id: 'leave',
            label: 'Step back from the forge.',
            action: { type: 'close_dialogue' },
          },
        ],
      },
      craft_pass: {
        id: 'craft_pass',
        text: 'Torin eyes your stance and nods in genuine approval. "You’ve got a warrior’s grip. Salvage dull trinkets in your pack for gold—bring it to my Temper tab and I’ll push any weapon or armor past its limits."',
        choices: [
          {
            id: 'open_shop',
            label: 'Open Forge & Armory',
            action: { type: 'open_merchant', merchantId: 'torin' },
          },
          { id: 'back', label: 'Thank him and return.', nextNodeId: 'root' },
        ],
      },
      craft_fail: {
        id: 'craft_fail',
        text: 'Torin chuckles softly. "Build your strength first, traveler. Until then, let my bellows do the heavy lifting—bring gold whenever you need an edge."',
        choices: [{ id: 'back', label: 'Back', nextNodeId: 'root' }],
      },
    },
  },

  mira: {
    id: 'mira',
    name: 'Herbalist Mira',
    title: 'Oakhaven Apothecary',
    glyph: '@',
    color: '#4EA885',
    zone: 'oakhaven',
    merchantId: 'mira',
    portraitUrl: miraPortrait,
    portrait: [
      { text: '    .~~~~~.', color: '#34D399' },
      { text: '   / .   . \\', color: '#D1FAE5' },
      { text: '  |  ^   ^  |', color: '#6EE7B7' },
      { text: '  |   \\_/   |', color: '#A7F3D0' },
      { text: '   \\_______/', color: '#10B981' },
      { text: '  {✿} [!] {✿}', color: '#F59E0B' },
    ],
    rootNodeId: 'root',
    nodes: {
      root: {
        id: 'root',
        text: 'Glass phials chime gently along Mira’s shelves. "The Reliquary air carries a creeping chill lately. Need draughts brewed, wounds dressed, or word on the blight below?"',
        choices: [
          {
            id: 'buy_potions',
            label: 'Browse Draughts & Scrolls',
            action: { type: 'open_merchant', merchantId: 'mira' },
          },
          {
            id: 'heal_free',
            label: 'Rest by her hearth to mend wounds (Restore Full HP & MP)',
            action: { type: 'heal_full' },
            nextNodeId: 'healed',
          },
          {
            id: 'quest_offer',
            label: 'Ask about the creeping blight in the crypts.',
            condition: { questId: 'herbalist_blight', questStatus: undefined },
            nextNodeId: 'blight_intro',
          },
          {
            id: 'turn_in_herb',
            label: 'Deliver the Pale Nightblooms.',
            condition: { questId: 'herbalist_blight', questStatus: 'active', hasItemTag: 'pale_nightbloom' },
            nextNodeId: 'blight_herb_done',
          },
          {
            id: 'turn_in_cantor',
            label: 'Report that the Bone Cantor has been appeased.',
            condition: { questId: 'herbalist_blight', questStatus: 'active', flag: 'cantorDefeated', flagEquals: true },
            nextNodeId: 'blight_cantor_done',
          },
          {
            id: 'leave',
            label: 'Leave the apothecary.',
            action: { type: 'close_dialogue' },
          },
        ],
      },
      healed: {
        id: 'healed',
        text: 'Warm sage steam clears your lungs. Your wounds knit cleanly and your mana steadies.',
        choices: [{ id: 'ok', label: 'Thank Mira.', nextNodeId: 'root' }],
      },
      blight_intro: {
        id: 'blight_intro',
        text: '"Pale Nightblooms grow on the first two crypt floors—bring me a sprig and I can distill stronger healing draughts. Though... rumor says the Bone Cantor on Floor 2 is the true source. If you can reach him, perhaps he can be quelled."',
        choices: [
          {
            id: 'accept_blight',
            label: 'I will bring back Pale Nightbloom or quell the Cantor.',
            action: {
              type: 'start_quest',
              questId: 'herbalist_blight',
              log: 'Agreed to aid Herbalist Mira with the Reliquary blight.',
            },
            nextNodeId: 'blight_accepted',
          },
          { id: 'decline', label: 'Maybe later.', nextNodeId: 'root' },
        ],
      },
      blight_accepted: {
        id: 'blight_accepted',
        text: '"Watch your footing near the damp alcoves—and take a Crimson Draught with my blessing."',
        choices: [{ id: 'done', label: 'Head back out.', action: { type: 'close_dialogue' } }],
      },
      blight_herb_done: {
        id: 'blight_herb_done',
        text: 'Mira’s eyes brighten as she lifts the luminous petals. "Flawless! With these spores distilled, every Crimson Draught you drink will mend far deeper wounds."',
        choices: [
          {
            id: 'finish_herb',
            label: 'Accept her reward (+55g, +60 XP, Stronger Potions)',
            action: { type: 'consume_quest_item', tag: 'pale_nightbloom' },
            extraActions: [
              { type: 'set_flag', flag: 'blightChoice', value: 'herbs_gathered' },
              { type: 'set_flag', flag: 'miraPotionTier', value: 2 },
              {
                type: 'complete_quest',
                questId: 'herbalist_blight',
                outcomeLabel: 'Distilled Pale Nightbloom',
                log: 'Delivered Pale Nightbloom to Mira; potions permanently upgraded.',
                rewardGold: 55,
                rewardXp: 60,
              },
            ],
            nextNodeId: 'root',
          },
        ],
      },
      blight_cantor_done: {
        id: 'blight_cantor_done',
        text: 'Mira exhales in relief as the cool breeze shifts outside. "You silenced the Cantor’s dirge! Even the stones feel lighter. Take this gold and my deepest thanks."',
        choices: [
          {
            id: 'finish_cantor',
            label: 'Accept her reward (+85g, +85 XP, +1 Skill Point)',
            action: { type: 'set_flag', flag: 'blightChoice', value: 'cantor_appeased' },
            extraActions: [
              { type: 'set_flag', flag: 'miraPotionTier', value: 2 },
              {
                type: 'complete_quest',
                questId: 'herbalist_blight',
                outcomeLabel: 'Silenced the Bone Cantor',
                log: 'Ended the Cantor’s miasma on Floor 2; earned Mira’s mastery reward.',
                rewardGold: 85,
                rewardXp: 85,
                rewardSkillPoint: 1,
              },
            ],
            nextNodeId: 'root',
          },
        ],
      },
    },
  },

  vance: {
    id: 'vance',
    name: 'Warden Vance',
    title: 'Oakhaven Outpost Captain',
    glyph: '@',
    color: '#60A5FA',
    zone: 'oakhaven',
    portraitUrl: vancePortrait,
    portrait: [
      { text: '   .-[===]-.   ', color: '#60A5FA' },
      { text: '  |  |   |  |  ', color: '#93C5FD' },
      { text: '  | (•) (•) |  ', color: '#E2E8F0' },
      { text: '  |   ===   |  ', color: '#94A3B8' },
      { text: '   \\_______/   ', color: '#475569' },
      { text: '  [⛨=======⛨]  ', color: '#3B82F6' },
    ],
    rootNodeId: 'root',
    nodes: {
      root: {
        id: 'root',
        text: 'Captain Vance studies a weathered map pinned with brass tacks. "Someone has been smuggling sealed relics up from Floor 1 while my patrols are stretched thin. Speak plainly—what brings you to the gate?"',
        choices: [
          {
            id: 'start_shadows',
            label: 'Offer to track down the smuggler cache on Floor 1.',
            condition: { questId: 'shadows_beneath', questStatus: undefined },
            nextNodeId: 'shadows_offer',
          },
          {
            id: 'turn_in_ledger',
            label: 'Hand over the Sealed Contraband Ledger.',
            condition: { questId: 'shadows_beneath', questStatus: 'active', hasItemTag: 'smuggler_ledger' },
            nextNodeId: 'ledger_vance',
          },
          {
            id: 'citadel_ask',
            label: 'Ask about passage to Highspire Citadel.',
            condition: { flag: 'citadelAccess', flagEquals: false },
            nextNodeId: 'citadel_info',
          },
          {
            id: 'persuade_gate',
            label: '[Resolve 3] Demand a Citadel Seal now—Oakhaven needs reinforcements.',
            condition: { flag: 'citadelAccess', flagEquals: false },
            check: { attribute: 'resolve', threshold: 3 },
            nextNodeId: 'citadel_unlocked_early',
            failNodeId: 'citadel_denied',
          },
          {
            id: 'outrider_heritage',
            label: '[Agility 2] Ask about earlier elven scouts in the Reliquary.',
            check: { attribute: 'agility', threshold: 2 },
            nextNodeId: 'outrider_vance_pass',
            failNodeId: 'outrider_vance_fail',
          },
          {
            id: 'vance_upgrades',
            label: '[Town Upgrades] Fund Outpost & Citadel Improvements',
            action: { type: 'open_upgrades' },
          },
          {
            id: 'vance_companion',
            label: 'Swap Spirit Companion (Silverwind Lynx <-> Starlight Owl)',
            action: { type: 'switch_companion' },
            nextNodeId: 'root',
          },
          {
            id: 'leave',
            label: 'Dismiss yourself.',
            action: { type: 'close_dialogue' },
          },
        ],
      },
      outrider_vance_pass: {
        id: 'outrider_vance_pass',
        text: 'Vance nods with respect at your elven cloak. "Two Outriders ventured below before the seal fractured. Look for glowing Elven Waystones (◈) down there—attuning them will steady your spirit and point Archivist Lyra toward their legacy."',
        choices: [{ id: 'back', label: 'Keep watch.', nextNodeId: 'root' }],
      },
      outrider_vance_fail: {
        id: 'outrider_vance_fail',
        text: '"Outriders moved too swift for our garrison to track. Sharpen your Agility and watch for blue starlight stones in the crypts."',
        choices: [{ id: 'back', label: 'Back', nextNodeId: 'root' }],
      },
      shadows_offer: {
        id: 'shadows_offer',
        text: '"Good. Check the eastern chambers on Floor 1 for a Sealed Contraband Ledger. Bring it straight to me—and don’t let that hooded broker Vex talk you into turning traitor."',
        choices: [
          {
            id: 'accept',
            label: 'I will investigate Floor 1.',
            action: {
              type: 'start_quest',
              questId: 'shadows_beneath',
              log: 'Warden Vance asked you to recover the Sealed Contraband Ledger on Floor 1.',
            },
            nextNodeId: 'root',
          },
        ],
      },
      ledger_vance: {
        id: 'ledger_vance',
        text: 'Vance breaks the wax seal and his jaw tightens. "Highspire names... just as I feared. You’ve done Oakhaven a true service. Take my Guard Oathplate, gold, and the Citadel Seal—use the West Gate anytime."',
        choices: [
          {
            id: 'claim_vance',
            label: 'Accept Warden’s Oathplate & Citadel Access (+80g, +90 XP)',
            action: { type: 'consume_quest_item', tag: 'smuggler_ledger' },
            extraActions: [
              { type: 'set_flag', flag: 'caravanChoice', value: 'arrested_vex' },
              { type: 'unlock_highspire' },
              {
                type: 'complete_quest',
                questId: 'shadows_beneath',
                outcomeLabel: 'Sided with Warden Vance',
                log: 'Delivered the Contraband Ledger to Vance; earned Warden’s Oathplate & Citadel Access.',
                rewardGold: 80,
                rewardXp: 90,
                rewardItemTag: 'warden_oathplate',
              },
            ],
            nextNodeId: 'root',
          },
        ],
      },
      citadel_info: {
        id: 'citadel_info',
        text: '"Highspire’s road is sealed to drifters. Either prove your loyalty with the Floor 1 ledger, strike your own way through the underground, or convince me you have the spine of a true warden."',
        choices: [{ id: 'back', label: 'Understood.', nextNodeId: 'root' }],
      },
      citadel_unlocked_early: {
        id: 'citadel_unlocked_early',
        text: 'Vance meets your gaze for three long seconds, then tosses an iron passkey onto the table. "Fair enough. Highspire needs steel more than paperwork. The West Gate is open to you."',
        choices: [
          {
            id: 'take_seal',
            label: 'Take the Citadel Passkey',
            action: { type: 'unlock_highspire' },
            nextNodeId: 'root',
          },
        ],
      },
      citadel_denied: {
        id: 'citadel_denied',
        text: '"Words are cheap in frontier mud, traveler. Prove yourself in the Reliquary first."',
        choices: [{ id: 'back', label: 'Back', nextNodeId: 'root' }],
      },
    },
  },

  vex: {
    id: 'vex',
    name: 'Vex the Quiet',
    title: 'Shadow Broker',
    glyph: '@',
    color: '#C084FC',
    zone: 'oakhaven',
    merchantId: 'vex',
    portraitUrl: vexPortrait,
    portrait: [
      { text: '    .-------.  ', color: '#7E22CE' },
      { text: '   /  #####  \\ ', color: '#A855F7' },
      { text: '  |  (•) (•)  |', color: '#FDE047' },
      { text: '  |   \\___/   |', color: '#C084FC' },
      { text: '   \\_________/ ', color: '#581C87' },
      { text: '   //  †††  \\\\ ', color: '#9333EA' },
    ],
    rootNodeId: 'root',
    nodes: {
      root: {
        id: 'root',
        text: 'Vex leans out of the alley shade, flipping a tarnished silver coin across her knuckles. "Vance marches in circles while real treasure rots below. Looking to trade rare curios—or make an arrangement?"',
        choices: [
          {
            id: 'black_market',
            label: 'Inspect Hidden Stock',
            action: { type: 'open_merchant', merchantId: 'vex' },
          },
          {
            id: 'start_vex_quest',
            label: 'Ask what "arrangement" she has in mind.',
            condition: { questId: 'shadows_beneath', questStatus: undefined },
            nextNodeId: 'vex_offer',
          },
          {
            id: 'give_ledger_vex',
            label: 'Slip her the Sealed Contraband Ledger instead of Vance.',
            condition: { questId: 'shadows_beneath', questStatus: 'active', hasItemTag: 'smuggler_ledger' },
            nextNodeId: 'ledger_vex',
          },
          {
            id: 'cunning_tip',
            label: '[Agility 3] Press her for smuggler shortcuts into the deeper vaults.',
            condition: { notFlag: 'vexTipClaimed' },
            check: { attribute: 'agility', threshold: 3 },
            nextNodeId: 'shortcut_pass',
            failNodeId: 'shortcut_fail',
          },
          {
            id: 'leave',
            label: 'Step out of the alley.',
            action: { type: 'close_dialogue' },
          },
        ],
      },
      vex_offer: {
        id: 'vex_offer',
        text: '"One of my runners dropped a Sealed Contraband Ledger on Floor 1. Vance wants it to hang half of Highspire. Bring it to *me*, and I’ll hand you my Whisperblade plus a forged Citadel pass."',
        choices: [
          {
            id: 'accept_vex',
            label: 'Deal. I’ll look for the ledger.',
            action: {
              type: 'start_quest',
              questId: 'shadows_beneath',
              log: 'Vex offered a generous bounty if you bring the Floor 1 ledger to her.',
            },
            nextNodeId: 'root',
          },
        ],
      },
      ledger_vex: {
        id: 'ledger_vex',
        text: 'Vex grins sharply as the ledger vanishes inside her cloak. "Smart choice. Here—my Whisperblade, forged Highspire papers, and a secret stairwell shortcut straight down to the Ember Vaults."',
        choices: [
          {
            id: 'claim_vex',
            label: "Accept Vex's Whisperblade & Citadel Access (+110g, +90 XP)",
            action: { type: 'consume_quest_item', tag: 'smuggler_ledger' },
            extraActions: [
              { type: 'set_flag', flag: 'caravanChoice', value: 'smuggler_pact' },
              { type: 'unlock_highspire' },
              { type: 'set_flag', flag: 'floor3Shortcut', value: true },
              {
                type: 'complete_quest',
                questId: 'shadows_beneath',
                outcomeLabel: 'Struck Pact with Vex',
                log: 'Delivered the Contraband Ledger to Vex; gained Whisperblade & Floor 3 Shortcut.',
                rewardGold: 110,
                rewardXp: 90,
                rewardItemTag: 'vex_whisperblade',
              },
            ],
            nextNodeId: 'root',
          },
        ],
      },
      shortcut_pass: {
        id: 'shortcut_pass',
        text: '"Quick fingers, quick eyes. Remember: press [Space] or click a wall trap only after spotting it, and always keep a Scroll of Phase for enclosed boss rooms." She slips you 15 gold for the banter.',
        choices: [
          {
            id: 'take_tip',
            label: 'Pocket the advice (+15g)',
            action: { type: 'give_gold', amount: 15 },
            extraActions: [{ type: 'set_flag', flag: 'vexTipClaimed', value: true }],
            nextNodeId: 'root',
          },
        ],
      },
      shortcut_fail: {
        id: 'shortcut_fail',
        text: '"Information isn’t charity, friend. Sharpen your reflexes first."',
        choices: [{ id: 'back', label: 'Back', nextNodeId: 'root' }],
      },
    },
  },

  lyra: {
    id: 'lyra',
    name: 'Archivist Lyra',
    title: 'Keeper of Glyphs',
    glyph: '@',
    color: '#60A5FA',
    zone: 'highspire',
    portraitUrl: lyraPortrait,
    portrait: [
      { text: '    .◈◈◈.    ', color: '#60A5FA' },
      { text: '   /  _  \\   ', color: '#DBEAFE' },
      { text: '  | (✦)(✦) | ', color: '#93C5FD' },
      { text: '  |  \\__/  | ', color: '#BFDBFE' },
      { text: '   \\______/  ', color: '#3B82F6' },
      { text: '  [❖======❖] ', color: '#1D4ED8' },
    ],
    rootNodeId: 'root',
    nodes: {
      root: {
        id: 'root',
        text: 'Floating chalk runes orbit Lyra’s lectern. "Welcome to Highspire’s Archive. The lower Ember Vaults are waking—and the Whispering Bell on Floor 3 is ringing again."',
        choices: [
          {
            id: 'start_bell',
            label: 'Ask about the Whispering Bell on Floor 3.',
            condition: { questId: 'whispering_bell', questStatus: undefined },
            nextNodeId: 'bell_intro',
          },
          {
            id: 'turn_in_bell_lyra',
            label: 'Present the Whispering Bell for arcane attunement.',
            condition: { questId: 'whispering_bell', questStatus: 'active', hasItemTag: 'whispering_bell' },
            nextNodeId: 'bell_lyra_complete',
          },
          {
            id: 'start_outrider',
            label: 'Ask about the ancient Elven Waystones below.',
            condition: { questId: 'outrider_oath', questStatus: undefined },
            nextNodeId: 'outrider_intro',
          },
          {
            id: 'complete_outrider',
            label: 'Report that 2 Elven Waystones are rekindled!',
            condition: { questId: 'outrider_oath', questStatus: 'active', questMinStage: 3 },
            nextNodeId: 'outrider_reward',
          },
          {
            id: 'arcana_lore',
            label: '[Arcana 3] Study the resonance ciphers protecting Malakor on Floor 5.',
            condition: { notFlag: 'cipherInscribed' },
            check: { attribute: 'arcana', threshold: 3 },
            nextNodeId: 'malakor_cipher',
            failNodeId: 'cipher_fail',
          },
          {
            id: 'leave',
            label: 'Close the tome.',
            action: { type: 'close_dialogue' },
          },
        ],
      },
      outrider_intro: {
        id: 'outrider_intro',
        text: '"An elven outrider of your line! Two Starlight Waystones remain dormant beneath Highspire. Attune any two glowing Waystones (◈) in the vaults, and I will unseal an Outrider Relic from our vault for you."',
        choices: [
          {
            id: 'accept_outrider',
            label: 'I swear the Oath of the Silver Bough.',
            action: {
              type: 'start_quest',
              questId: 'outrider_oath',
              log: 'Archivist Lyra asked Garth "Big Dick" Elfstrom to attune 2 Elven Waystones (◈) in the sunken vaults.',
            },
            nextNodeId: 'root',
          },
        ],
      },
      outrider_reward: {
        id: 'outrider_reward',
        text: 'Silver dust rises from Lyra’s astrolabe as the subterranean beacons answer in unison. "The Silver Bough shines again, Garth "Big Dick" Elfstrom. Choose which Starlight Relic shall accompany you to the Sanctum."',
        choices: [
          {
            id: 'take_sylvan_blade',
            label: 'Claim Sylvanthorn Longblade (+100g, +110 XP)',
            action: {
              type: 'complete_quest',
              questId: 'outrider_oath',
              outcomeLabel: 'Claimed Sylvanthorn Longblade',
              log: 'Rekindled the Elven Waystones and claimed the Sylvanthorn Longblade from Archivist Lyra.',
              rewardGold: 100,
              rewardXp: 110,
              rewardItemTag: 'sylvan_longblade',
            },
            nextNodeId: 'root',
          },
          {
            id: 'take_starlight_mantle',
            label: 'Claim Starlight Outrider Mantle (+100g, +110 XP)',
            action: {
              type: 'complete_quest',
              questId: 'outrider_oath',
              outcomeLabel: 'Claimed Starlight Mantle',
              log: 'Rekindled the Elven Waystones and claimed the Starlight Outrider Mantle from Archivist Lyra.',
              rewardGold: 100,
              rewardXp: 110,
              rewardItemTag: 'starlight_mantle',
            },
            nextNodeId: 'root',
          },
        ],
      },
      bell_intro: {
        id: 'bell_intro',
        text: '"Bring the Whispering Bell to me from Floor 3 so I can attune it against Malakor’s wards. Beware—Magistrate Corvus wants to auction it to mercenaries instead."',
        choices: [
          {
            id: 'accept_bell',
            label: 'I will retrieve the Whispering Bell.',
            action: {
              type: 'start_quest',
              questId: 'whispering_bell',
              log: 'Archivist Lyra asked you to recover the Whispering Bell from Floor 3.',
            },
            nextNodeId: 'root',
          },
        ],
      },
      bell_lyra_complete: {
        id: 'bell_lyra_complete',
        text: 'Lyra strikes the bronze rim with a silver rod. A clear chord echoes through the stone, shattering dormant curses. "Take the Chime of First Ash and a new mastery point—you’ve earned both."',
        choices: [
          {
            id: 'finish_bell_lyra',
            label: 'Accept Chime of First Ash (+1 Skill Point, +120 XP)',
            action: { type: 'consume_quest_item', tag: 'whispering_bell' },
            extraActions: [
              { type: 'set_flag', flag: 'bellChoice', value: 'attuned_lyra' },
              { type: 'set_flag', flag: 'malakorWeakened', value: true },
              {
                type: 'complete_quest',
                questId: 'whispering_bell',
                outcomeLabel: 'Attuned Bell with Lyra',
                log: 'Attuned the Whispering Bell with Archivist Lyra; earned Chime of First Ash and weakened Malakor’s ward.',
                rewardXp: 120,
                rewardSkillPoint: 1,
                rewardItemTag: 'chime_first_ash',
              },
            ],
            nextNodeId: 'root',
          },
        ],
      },
      malakor_cipher: {
        id: 'malakor_cipher',
        text: 'Lyra traces a sigil onto your palm. "You grasp the third resonance! When you stand before Malakor on Floor 5, his ward-stone will falter at your approach."',
        choices: [
          {
            id: 'apply_cipher',
            label: 'Inscribe the Ward-Breaker Cipher',
            action: { type: 'set_flag', flag: 'malakorWeakened', value: true },
            extraActions: [
              { type: 'set_flag', flag: 'cipherInscribed', value: true },
              { type: 'grant_buff', text: 'Ward-Breaker Cipher inscribed (+8 Max HP).', hpBonus: 8 },
            ],
            nextNodeId: 'root',
          },
        ],
      },
      cipher_fail: {
        id: 'cipher_fail',
        text: '"The glyphs slip past untrained eyes. Raise your Arcana to 3 if you wish to pierce Malakor’s ward."',
        choices: [{ id: 'back', label: 'Back', nextNodeId: 'root' }],
      },
    },
  },

  corvus: {
    id: 'corvus',
    name: 'Magistrate Corvus',
    title: 'Citadel Arbiter',
    glyph: '@',
    color: '#F59E0B',
    zone: 'highspire',
    portraitUrl: corvusPortrait,
    portrait: [
      { text: '    .▲▲▲.    ', color: '#FBBF24' },
      { text: '   / === \\   ', color: '#FDE68A' },
      { text: '  | (•) (•) | ', color: '#E2E8F0' },
      { text: '  |   ---   | ', color: '#CBD5E1' },
      { text: '   \\_______/  ', color: '#D97706' },
      { text: '  {█=======█} ', color: '#92400E' },
    ],
    rootNodeId: 'root',
    nodes: {
      root: {
        id: 'root',
        text: 'Magistrate Corvus adjusts his gold-trimmed mantle. "Highspire pays for results, not dusty superstitions. If you find the Whispering Bell on Floor 3, bring it straight to my vault—not Lyra’s lectern."',
        choices: [
          {
            id: 'sell_bell',
            label: 'Turn over the Whispering Bell to Corvus.',
            condition: { questId: 'whispering_bell', questStatus: 'active', hasItemTag: 'whispering_bell' },
            nextNodeId: 'bell_corvus_complete',
          },
          {
            id: 'start_bell_corvus',
            label: 'Agree to recover the Whispering Bell for the Citadel.',
            condition: { questId: 'whispering_bell', questStatus: undefined },
            nextNodeId: 'corvus_offer',
          },
          {
            id: 'leave',
            label: 'Take your leave.',
            action: { type: 'close_dialogue' },
          },
        ],
      },
      corvus_offer: {
        id: 'corvus_offer',
        text: '"Sensible. Fetch the bell from Floor 3 and you’ll walk away with Citadel gold and my finest Greatspear."',
        choices: [
          {
            id: 'accept_c',
            label: 'Understood.',
            action: {
              type: 'start_quest',
              questId: 'whispering_bell',
              log: 'Magistrate Corvus offered top coin and steel for the Floor 3 Whispering Bell.',
            },
            nextNodeId: 'root',
          },
        ],
      },
      bell_corvus_complete: {
        id: 'bell_corvus_complete',
        text: 'Corvus locks the bell inside a lead-lined coffer. "Pragmatism always wins out. Take your coin and the Magistrate Greatspear."',
        choices: [
          {
            id: 'finish_bell_corvus',
            label: 'Accept Magistrate Greatspear & Bounty (+180g, +110 XP)',
            action: { type: 'consume_quest_item', tag: 'whispering_bell' },
            extraActions: [
              { type: 'set_flag', flag: 'bellChoice', value: 'sold_corvus' },
              {
                type: 'complete_quest',
                questId: 'whispering_bell',
                outcomeLabel: 'Sold Bell to Corvus',
                log: 'Sold the Whispering Bell to Magistrate Corvus for heavy gold and the Magistrate Greatspear.',
                rewardGold: 180,
                rewardXp: 110,
                rewardItemTag: 'citadel_halberd',
              },
            ],
            nextNodeId: 'root',
          },
        ],
      },
    },
  },

  kaelen: {
    id: 'kaelen',
    name: 'Guildmaster Kaelen',
    title: 'Warden of the Descent',
    glyph: '@',
    color: '#EF4444',
    zone: 'highspire',
    portraitUrl: kaelenPortrait,
    portrait: [
      { text: '   /▲\\_/▲\\   ', color: '#EF4444' },
      { text: '  |  ___  |  ', color: '#FCA5A5' },
      { text: '  | (x) (•) | ', color: '#E2E8F0' },
      { text: '  |  \\_/  |  ', color: '#CBD5E1' },
      { text: '   \\_____/   ', color: '#991B1B' },
      { text: '  [⚔=====⚔]  ', color: '#DC2626' },
    ],
    rootNodeId: 'root',
    nodes: {
      root: {
        id: 'root',
        text: 'Guildmaster Kaelen cleans soot from a notched claymore. "Below these stones lies the Ember Vaults, and beneath them, the Obsidian Sanctum. Only one name remains to settle: Malakor, Sovereign of Cinder."',
        choices: [
          {
            id: 'accept_final',
            label: 'Take the Guild’s commission to slay Malakor on Floor 5.',
            condition: { questId: 'sovereign_cinder', questStatus: undefined },
            nextNodeId: 'final_offer',
          },
          {
            id: 'respec_ask',
            label: 'Request Guild Training Reset (Respec all Skills & Attributes · 40g)',
            condition: { minGold: 40 },
            action: { type: 'respec_skills', cost: 40 },
            nextNodeId: 'respec_done',
          },
          {
            id: 'kaelen_upgrades',
            label: '[Town Upgrades] Review Citadel & Outpost Improvements',
            action: { type: 'open_upgrades' },
          },
          {
            id: 'kaelen_companion',
            label: 'Swap Spirit Companion (Silverwind Lynx <-> Starlight Owl)',
            action: { type: 'switch_companion' },
            nextNodeId: 'root',
          },
          {
            id: 'leave',
            label: 'Head toward the Deep Stair.',
            action: { type: 'close_dialogue' },
          },
        ],
      },
      final_offer: {
        id: 'final_offer',
        text: '"Descend through the Ember Vaults, break Inquisitor Serath on Floor 4, and strike down Malakor on Floor 5. Highspire remembers those who finish the climb."',
        choices: [
          {
            id: 'start_fin',
            label: 'I will descend to the Obsidian Sanctum.',
            action: {
              type: 'start_quest',
              questId: 'sovereign_cinder',
              log: 'Guildmaster Kaelen commissioned you to defeat Malakor on Floor 5.',
            },
            nextNodeId: 'root',
          },
        ],
      },
      respec_done: {
        id: 'respec_done',
        text: 'Kaelen walks you through a brisk sparring drill, clearing old habits. All your Attribute and Skill Points have been refunded for a fresh build.',
        choices: [{ id: 'ok', label: 'Ready to rebuild.', nextNodeId: 'root' }],
      },
    },
  },

  orin: {
    id: 'orin',
    name: 'Relic Appraiser Orin',
    title: 'Master Artificer',
    glyph: '@',
    color: '#C084FC',
    zone: 'highspire',
    merchantId: 'orin',
    portraitUrl: orinPortrait,
    portrait: [
      { text: '    .⍟⍟⍟.    ', color: '#C084FC' },
      { text: '   / o o \\   ', color: '#F3E8FF' },
      { text: '  | [◉|◉] |  ', color: '#E9D5FF' },
      { text: '  |  \\_/  |  ', color: '#D8B4FE' },
      { text: '   \\_____/   ', color: '#7E22CE' },
      { text: '  {◊=====◊}  ', color: '#A855F7' },
    ],
    rootNodeId: 'root',
    nodes: {
      root: {
        id: 'root',
        text: 'Orin peers through twin brass loupes. "High-grade relics, enchanted rings, and masterwork forging—name what your build is missing."',
        choices: [
          {
            id: 'open_orin',
            label: 'Open Relic Market & Forge',
            action: { type: 'open_merchant', merchantId: 'orin' },
          },
          {
            id: 'leave',
            label: 'Step away.',
            action: { type: 'close_dialogue' },
          },
        ],
      },
    },
  },

  rowan: {
    id: 'rowan',
    name: 'Rowan the Wayfarer',
    title: 'Outrider Scout',
    glyph: '@',
    color: '#34D399',
    zone: 'overworld',
    portraitUrl: rowanPortrait,
    portrait: [
      { text: '    /^^^^^\\    ', color: '#34D399' },
      { text: '   / o   o \\   ', color: '#E2E8F0' },
      { text: '  |   \\_/   |  ', color: '#CBD5E1' },
      { text: '   \\_______/   ', color: '#166534' },
      { text: '  /|__|*|__|\\  ', color: '#D97706' },
      { text: '   |  | |  |   ', color: '#475569' },
    ],
    rootNodeId: 'root',
    nodes: {
      root: {
        id: 'root',
        text: 'Rowan banks the Silverbridge campfire and nods toward the eastern woods. "Welcome to Silverwood Vale, outrider. North leads to Whispering Barrow and Cinderwatch Bastion; southeast lies Thornwick Fen."',
        choices: [
          {
            id: 'ask_roads',
            label: 'Tell me about the Silverbridge brigands.',
            condition: { questId: 'silverwood_road', questStatus: undefined },
            nextNodeId: 'brigand_intro',
          },
          {
            id: 'turn_in_satchel',
            label: 'Return Rowan’s Stolen Satchel (+75g, +90 XP, Rare Band)',
            condition: { questId: 'silverwood_road', questStatus: 'active', hasItemTag: 'wayfarer_satchel' },
            nextNodeId: 'brigand_complete',
          },
          {
            id: 'ask_survey',
            label: 'Ask about the carved steles (‡) across the realm.',
            condition: { questId: 'deep_survey', questStatus: undefined },
            nextNodeId: 'survey_intro',
          },
          {
            id: 'turn_in_survey',
            label: 'Report the completed Deep Roads survey (+60g, +120 XP, Star-Compass)',
            condition: { questId: 'deep_survey', questStatus: 'active', questMinStage: 6 },
            nextNodeId: 'survey_complete',
          },
          {
            id: 'scout_tip',
            label: '[Agility 3] Ask for covert overworld trails.',
            check: { attribute: 'agility', threshold: 3 },
            nextNodeId: 'trail_secret',
            failNodeId: 'trail_fail',
          },
          {
            id: 'leave',
            label: 'Watch the road.',
            action: { type: 'close_dialogue' },
          },
        ],
      },
      brigand_intro: {
        id: 'brigand_intro',
        text: '"Harlan and his cutthroats seized the ruined watchtower east across Silverbridge—and lifted my dispatch satchel while I slept. Clear out their tollhouse chest and bring my satchel back, and you can keep my Silverbridge Band."',
        choices: [
          {
            id: 'accept_silverbridge',
            label: 'I will reclaim your satchel from the watchtower.',
            action: {
              type: 'start_quest',
              questId: 'silverwood_road',
              log: 'Rowan asked you to cross Silverbridge and recover his Stolen Satchel from the eastern brigand watchtower.',
            },
            nextNodeId: 'root',
          },
          { id: 'back', label: 'Back', nextNodeId: 'root' },
        ],
      },
      brigand_complete: {
        id: 'brigand_complete',
        text: '"My maps and cipher seals—intact!" Rowan unclasps a silver compass ring from his cloak. "Wear the Silverbridge Band well on the high roads."',
        choices: [
          {
            id: 'finish_silverbridge',
            label: 'Accept Wayfarer’s Silverbridge Band (+75g, +90 XP)',
            action: { type: 'consume_quest_item', tag: 'wayfarer_satchel' },
            extraActions: [
              { type: 'set_flag', flag: 'silverbridgeCleared', value: true },
              {
                type: 'complete_quest',
                questId: 'silverwood_road',
                outcomeLabel: 'Cleared Silverbridge Toll',
                log: 'Recovered Rowan’s Stolen Satchel from the eastern watchtower and earned the Wayfarer’s Silverbridge Band.',
                rewardGold: 75,
                rewardXp: 90,
                rewardItemTag: 'silverbridge_band',
              },
            ],
            nextNodeId: 'root',
          },
        ],
      },
      survey_intro: {
        id: 'survey_intro',
        text: '"The old roads are written down, outrider — on carved steles (‡), one in every town and scattered through the vaults. Transcribe six of them for my survey and the deep roads will never lose you. No blood price. Just boot leather and literacy."',
        choices: [
          {
            id: 'accept_survey',
            label: 'I will chart the deep roads (read 6 carved steles).',
            action: {
              type: 'start_quest',
              questId: 'deep_survey',
              log: 'Rowan commissioned a survey of the deep roads: transcribe 6 carved steles (‡) across the realm.',
            },
            nextNodeId: 'root',
          },
          { id: 'back', label: 'Back', nextNodeId: 'root' },
        ],
      },
      survey_complete: {
        id: 'survey_complete',
        text: '"Six steles, faithfully copied!" Rowan inks your transcriptions into a vellum road-chart, then unhooks the star-compass from his own cloak. "Take it. Its needle points at the nearest unread stele — a surveyor’s sixth sense."',
        choices: [
          {
            id: 'finish_survey',
            label: 'Accept the Surveyor’s Star-Compass (+60g, +120 XP)',
            action: {
              type: 'complete_quest',
              questId: 'deep_survey',
              outcomeLabel: 'Charted the Deep Roads',
              log: 'Transcribed 6 carved steles across the realm and completed Rowan’s survey of the deep roads.',
              rewardGold: 60,
              rewardXp: 120,
              rewardItemTag: 'surveyor_compass',
            },
            nextNodeId: 'root',
          },
        ],
      },
      trail_secret: {
        id: 'trail_secret',
        text: '"Sharp eyes. North of this camp, beyond the whispering pines, rests an unattuned Elven Waystone—and Frostpeak Cavern in the far northeast holds meteoric ore hotter than Highspire steel."',
        choices: [{ id: 'back', label: 'Good to know.', nextNodeId: 'root' }],
      },
      trail_fail: {
        id: 'trail_fail',
        text: '"Stick to the cobbled causeways until your footing is surer. Blight weavers near the southeast fen hit hard if they flank you."',
        choices: [{ id: 'back', label: 'Back', nextNodeId: 'root' }],
      },
    },
  },

  sylva: {
    id: 'sylva',
    name: 'Elder Sylva',
    title: 'Mire-Druid & Lorekeeper',
    glyph: '@',
    color: '#34D399',
    zone: 'thornwick',
    portraitUrl: sylvaPortrait,
    portrait: [
      { text: '    \\.|.|./    ', color: '#34D399' },
      { text: '   /  ^ ^  \\   ', color: '#ECFDF5' },
      { text: '  |  (o o)  |  ', color: '#2DD4BF' },
      { text: '   \\  \\_/  /   ', color: '#A7F3D0' },
      { text: '  /[=======]\\  ', color: '#115E59' },
    ],
    rootNodeId: 'root',
    nodes: {
      root: {
        id: 'root',
        text: 'Bioluminescent spores drift from Elder Sylva’s antler crown. "Thornwick Fen breathes uneasily, child of the Silver Bough. Beneath the eastern marsh, Spore-Matron Vexis swells the Fungal Hollow."',
        choices: [
          {
            id: 'ask_bog',
            label: 'How can I stem the Fungal Hollow blight?',
            condition: { questId: 'spores_of_bog', questStatus: undefined },
            nextNodeId: 'bog_intro',
          },
          {
            id: 'turn_in_heart',
            label: 'Deliver the Bioluminescent Fungal Heart (+120g, +150 XP, +1 Skill, Charm)',
            condition: { questId: 'spores_of_bog', questStatus: 'active', hasItemTag: 'fungal_heart' },
            nextNodeId: 'bog_complete',
          },
          {
            id: 'sylva_mend',
            label: 'Ask Sylva to purge toxins & restore vigor (Free)',
            action: { type: 'heal_full' },
            nextNodeId: 'healed',
          },
          {
            id: 'leave',
            label: 'Walk in peace.',
            action: { type: 'close_dialogue' },
          },
        ],
      },
      bog_intro: {
        id: 'bog_intro',
        text: '"Enter Fungal Hollow east of Thornwick Gate, descend to its Mycelial Heart on the second floor, and end Spore-Matron Vexis. Bring her Bioluminescent Heart so I may seal the roots."',
        choices: [
          {
            id: 'accept_bog',
            label: 'I will cleanse the Fungal Hollow.',
            action: {
              type: 'start_quest',
              questId: 'spores_of_bog',
              log: 'Elder Sylva of Thornwick Fen asked you to slay Spore-Matron Vexis inside Fungal Hollow (2 floors).',
            },
            nextNodeId: 'root',
          },
          { id: 'back', label: 'Back', nextNodeId: 'root' },
        ],
      },
      bog_complete: {
        id: 'bog_complete',
        text: 'Sylva presses the glowing heart into moss-stone, and cool mist sweeps across Thornwick. "The fen breathes freely once more. Take this charm and my blessing."',
        choices: [
          {
            id: 'finish_bog',
            label: 'Claim Sporeguard Charm (+120g, +150 XP, +1 Skill Point, +10 Max HP)',
            action: { type: 'consume_quest_item', tag: 'fungal_heart' },
            extraActions: [
              { type: 'grant_buff', text: 'Mire-Druid vitality blooms (+10 Max HP).', hpBonus: 10 },
              {
                type: 'complete_quest',
                questId: 'spores_of_bog',
                outcomeLabel: 'Purged Fungal Hollow',
                log: 'Delivered the Bioluminescent Fungal Heart to Elder Sylva, earning the Sporeguard Charm and +1 Skill Point.',
                rewardGold: 120,
                rewardXp: 150,
                rewardSkillPoint: 1,
                rewardItemTag: 'sporeguard_amulet',
              },
            ],
            nextNodeId: 'root',
          },
        ],
      },
      healed: {
        id: 'healed',
        text: 'Warm willow-sap salve seals every wound and clears your lungs. Your HP and Mana are fully restored.',
        choices: [{ id: 'back', label: 'Thank you, Elder.', nextNodeId: 'root' }],
      },
    },
  },

  bram: {
    id: 'bram',
    name: 'Tinker Bram',
    title: 'Relic Scavenger',
    glyph: '@',
    color: '#FBBF24',
    zone: 'thornwick',
    merchantId: 'bram',
    portraitUrl: bramPortrait,
    portrait: [
      { text: '    .-[o=o]-.  ', color: '#FBBF24' },
      { text: '   /  _   _  \\ ', color: '#E2E8F0' },
      { text: '  |  (◉) (◉) | ', color: '#FDE68A' },
      { text: '   \\  \\___/  / ', color: '#CBD5E1' },
      { text: '   /[|===|]\\   ', color: '#92400E' },
    ],
    rootNodeId: 'root',
    nodes: {
      root: {
        id: 'root',
        text: 'Tinker Bram adjusts his brass loupes over a crate of salvaged runes. "Runes, blink scrolls, throwing knives, bog-recovered trinkets—all priced for real delvers!"',
        choices: [
          {
            id: 'open_bram',
            label: 'Browse Bram’s Salvage',
            action: { type: 'open_merchant', merchantId: 'bram' },
          },
          {
            id: 'leave',
            label: 'Maybe later.',
            action: { type: 'close_dialogue' },
          },
        ],
      },
    },
  },

  halda: {
    id: 'halda',
    name: 'Forgemistress Halda',
    title: 'Master Runesmith',
    glyph: '@',
    color: '#FB923C',
    zone: 'cinderwatch',
    merchantId: 'halda',
    portraitUrl: haldaPortrait,
    portrait: [
      { text: '   .=======.   ', color: '#FB923C' },
      { text: '  /  \\___/  \\  ', color: '#FDBA74' },
      { text: ' |  (o) (o)  | ', color: '#F59E0B' },
      { text: ' |  /=====\\  | ', color: '#9A3412' },
      { text: '  \\_[=====]_/  ', color: '#78350F' },
    ],
    rootNodeId: 'root',
    nodes: {
      root: {
        id: 'root',
        text: 'Sparks cascade off Halda’s runic anvil. "Highspire polishes parade armor; Cinderwatch forges gear that survives Ashen Caldera. Need volcanic steel, or looking for heavy smithing work?"',
        choices: [
          {
            id: 'open_halda',
            label: 'Browse Bastion Armory',
            action: { type: 'open_merchant', merchantId: 'halda' },
          },
          {
            id: 'ask_caldera',
            label: 'Ask about the Ashen Caldera quest.',
            condition: { questId: 'cinder_and_frost', questStatus: undefined },
            nextNodeId: 'caldera_intro',
          },
          {
            id: 'turn_in_ore',
            label: 'Deliver the Ashen Ore Heart (+180g, +200 XP, Cinder Crown Relic)',
            condition: { questId: 'cinder_and_frost', questStatus: 'active', hasItemTag: 'ashen_ore_heart' },
            nextNodeId: 'caldera_complete',
          },
          {
            id: 'leave',
            label: 'Step away from the forge.',
            action: { type: 'close_dialogue' },
          },
        ],
      },
      caldera_intro: {
        id: 'caldera_intro',
        text: '"East of Cinderwatch, Frostpeak Cavern bores three tiers straight down into magma. Slay Ignis-Warden Kaelthar on Floor 3 and haul back the Ashen Ore Heart. I’ll forge you the Cinder Crown Relic."',
        choices: [
          {
            id: 'accept_caldera',
            label: 'I will bring back the Ashen Ore Heart.',
            action: {
              type: 'start_quest',
              questId: 'cinder_and_frost',
              log: 'Forgemistress Halda asked you to descend Frostpeak Cavern (3 floors) and slay Ignis-Warden Kaelthar for the Ashen Ore Heart.',
            },
            nextNodeId: 'root',
          },
          { id: 'back', label: 'Back', nextNodeId: 'root' },
        ],
      },
      caldera_complete: {
        id: 'caldera_complete',
        text: 'Halda quenches the white-hot core in oil and beats out a blazing circlet in minutes. "True Caldera work! Wear the Cinder Crown into Malakor’s own Sanctum."',
        choices: [
          {
            id: 'finish_caldera',
            label: 'Claim the Cinder Crown Relic (+180g, +200 XP, +1 Attribute Point)',
            action: { type: 'consume_quest_item', tag: 'ashen_ore_heart' },
            extraActions: [
              {
                type: 'complete_quest',
                questId: 'cinder_and_frost',
                outcomeLabel: 'Forged Caldera Relic',
                log: 'Delivered the Ashen Ore Heart to Forgemistress Halda and claimed the Cinder Crown Relic.',
                rewardGold: 180,
                rewardXp: 200,
                rewardAttrPoint: 1,
                rewardItemTag: 'cinder_crown',
              },
            ],
            nextNodeId: 'root',
          },
        ],
      },
    },
  },

  darek: {
    id: 'darek',
    name: 'Captain Darek',
    title: 'Rift Sentinel',
    glyph: '@',
    color: '#EF4444',
    zone: 'cinderwatch',
    portraitUrl: darekPortrait,
    portrait: [
      { text: '    /[===]\\    ', color: '#94A3B8' },
      { text: '   | *   * |   ', color: '#F87171' },
      { text: '   |  ---  |   ', color: '#E2E8F0' },
      { text: '  /|_______|\\  ', color: '#7F1D1D' },
      { text: '   |  | |  |   ', color: '#475569' },
    ],
    rootNodeId: 'root',
    nodes: {
      root: {
        id: 'root',
        text: 'Captain Darek scans the ridge parapets. "Between Whispering Barrow to the west and Frostpeak east, Cinderwatch holds the whole northern pass. Looking to earn garrison bounty?"',
        choices: [
          {
            id: 'ask_barrow',
            label: 'Tell me about Whispering Barrow.',
            condition: { questId: 'barrow_purge', questStatus: undefined },
            nextNodeId: 'barrow_intro',
          },
          {
            id: 'turn_in_barrow',
            label: 'Present Morvath’s Barrow Seal (+140g, +150 XP, +1 Attribute, Shroud)',
            condition: { questId: 'barrow_purge', questStatus: 'active', hasItemTag: 'morvath_seal' },
            nextNodeId: 'barrow_complete',
          },
          {
            id: 'darek_respec',
            label: 'Ask Darek for tactical drills (Respec Attributes & Skills — Free)',
            action: { type: 'respec_skills', cost: 0 },
            nextNodeId: 'respec_done',
          },
          {
            id: 'leave',
            label: 'Carry on, Captain.',
            action: { type: 'close_dialogue' },
          },
        ],
      },
      barrow_intro: {
        id: 'barrow_intro',
        text: '"West of here, Whispering Barrow has been spilling wights onto the north trail. Put down Arch-Wight Morvath on Barrow Floor 2 and bring me his iron Barrow Seal."',
        choices: [
          {
            id: 'accept_barrow',
            label: 'Consider Arch-Wight Morvath dealt with.',
            action: {
              type: 'start_quest',
              questId: 'barrow_purge',
              log: 'Captain Darek placed a garrison bounty on Arch-Wight Morvath on Floor 2 of Whispering Barrow.',
            },
            nextNodeId: 'root',
          },
          { id: 'back', label: 'Back', nextNodeId: 'root' },
        ],
      },
      barrow_complete: {
        id: 'barrow_complete',
        text: 'Darek weighs the cracked crown-seal and salutes sharply. "Clean work, outrider. Claim your garrison gold, our spare Barrow-Wight Shroud, and veteran conditioning."',
        choices: [
          {
            id: 'finish_barrow',
            label: 'Claim Barrow Bounty (+140g, +150 XP, +1 Attribute Point, Shroud)',
            action: { type: 'consume_quest_item', tag: 'morvath_seal' },
            extraActions: [
              {
                type: 'complete_quest',
                questId: 'barrow_purge',
                outcomeLabel: 'Purged Whispering Barrow',
                log: 'Slayed Arch-Wight Morvath and turned in the Barrow Seal to Captain Darek.',
                rewardGold: 140,
                rewardXp: 150,
                rewardAttrPoint: 1,
                rewardItemTag: 'morvath_shroud',
              },
            ],
            nextNodeId: 'root',
          },
        ],
      },
      respec_done: {
        id: 'respec_done',
        text: 'Darek drills your stance on the basalt ramparts. All Attribute and Skill Points have been refunded for reallocation.',
        choices: [{ id: 'back', label: 'Ready.', nextNodeId: 'root' }],
      },
    },
  },

  // ---------------------------------------------------------------------
  // Phase 3 ambient townsfolk — no quests, just local colour. They wander
  // a few tiles around their posts (see NpcPlacement.roams in world.ts).
  // ---------------------------------------------------------------------
  pell: {
    id: 'pell',
    name: 'Pell the Carter',
    title: 'Outpost Carter',
    glyph: '@',
    color: '#A8A29E',
    zone: 'oakhaven',
    portrait: [
      { text: '    _______    ', color: '#A8A29E' },
      { text: '   / o   o \\   ', color: '#E2E8F0' },
      { text: '  |   ___   |  ', color: '#CBD5E1' },
      { text: '   \\_______/   ', color: '#78716C' },
      { text: '  /|==| |==|\\  ', color: '#92400E' },
      { text: '   |  | |  |   ', color: '#475569' },
    ],
    rootNodeId: 'root',
    nodes: {
      root: {
        id: 'root',
        text: 'Pell is re-shoeing his mule and cursing the cart axle in three languages. "Hauls ore up from the gate, stories down from the Vale. Stories pay worse, weigh less. Mind the mule — she bites critics."',
        choices: [{ id: 'leave', label: 'Leave him to the axle.', action: { type: 'close_dialogue' } }],
      },
    },
  },

  wren: {
    id: 'wren',
    name: 'Sister Wren',
    title: 'Shrine Keeper',
    glyph: '@',
    color: '#FDE68A',
    zone: 'oakhaven',
    portrait: [
      { text: '    .-----.    ', color: '#FDE68A' },
      { text: '   / o   o \\   ', color: '#FEF3C7' },
      { text: '  |   \\_/   |  ', color: '#FDE68A' },
      { text: '   \\_______/   ', color: '#B45309' },
      { text: '  /|  |*|  |\\  ', color: '#F59E0B' },
      { text: '   |  | |  |   ', color: '#475569' },
    ],
    rootNodeId: 'root',
    nodes: {
      root: {
        id: 'root',
        text: 'Sister Wren tends a row of shrine candles that never quite go out. "Blessings are free, delver. Candles cost a copper. The Outpost runs on priorities." She glances at the Old Oak. "It was old when the Outpost was young. Leave it a kind word when you pass."',
        choices: [{ id: 'leave', label: 'Bow and go.', action: { type: 'close_dialogue' } }],
      },
    },
  },

  tomas: {
    id: 'tomas',
    name: 'Page Tomas',
    title: 'Citadel Page',
    glyph: '@',
    color: '#93C5FD',
    zone: 'highspire',
    portrait: [
      { text: '    /^^^^^\\    ', color: '#93C5FD' },
      { text: '   / o   o \\   ', color: '#E2E8F0' },
      { text: '  |   \\o/   |  ', color: '#BFDBFE' },
      { text: '   \\_______/   ', color: '#2563EB' },
      { text: '  /|__|▤|__|\\  ', color: '#D97706' },
      { text: '   |  | |  |   ', color: '#475569' },
    ],
    rootNodeId: 'root',
    nodes: {
      root: {
        id: 'root',
        text: 'Page Tomas skids to a halt, scrolls bundled under both arms. "Messages, maps, and misplaced magistrates — that’s my whole job! I know every stair in Highspire. Fallen down most of them, too. Archivist Lyra’s archive is north, if you’re hunting reading."',
        choices: [{ id: 'leave', label: 'Let him run.', action: { type: 'close_dialogue' } }],
      },
    },
  },

  fenwick: {
    id: 'fenwick',
    name: 'Fenwick the Fisher',
    title: 'Fen Fisher',
    glyph: '@',
    color: '#4ADE80',
    zone: 'thornwick',
    portrait: [
      { text: '   _________   ', color: '#4ADE80' },
      { text: '  /  o   o  \\  ', color: '#DCFCE7' },
      { text: '  |   \\_/   |  ', color: '#86EFAC' },
      { text: '   \\_______/   ', color: '#166534' },
      { text: '  /|  |~|  |\\  ', color: '#0EA5E9' },
      { text: '   |  | |  |   ', color: '#475569' },
    ],
    rootNodeId: 'root',
    nodes: {
      root: {
        id: 'root',
        text: 'Fenwick holds up today’s catch: a boot. "Yesterday: a boot. The fen gives what the fen gives." He nods toward the frogs. "When they sing, the Hollow’s calm. When they stop — that’s when you wade careful."',
        choices: [{ id: 'leave', label: 'Tight lines.', action: { type: 'close_dialogue' } }],
      },
    },
  },

  sella: {
    id: 'sella',
    name: 'Sella the Quartermaster',
    title: 'Bastion Quartermaster',
    glyph: '@',
    color: '#FDE68A',
    zone: 'cinderwatch',
    portrait: [
      { text: '    /=====\\    ', color: '#FDE68A' },
      { text: '   / o   o \\   ', color: '#E2E8F0' },
      { text: '  |   \\_/   |  ', color: '#FDE68A' },
      { text: '   \\_______/   ', color: '#B45309' },
      { text: '  /|==|▤|==|\\  ', color: '#92400E' },
      { text: '   |  | |  |   ', color: '#475569' },
    ],
    rootNodeId: 'root',
    nodes: {
      root: {
        id: 'root',
        text: 'Sella is chalking inventory onto a basalt slab. "Rations, rope, rime-wool. If it isn’t on my list, it isn’t in the Bastion. The mountain provides the rest — rudely, and usually on fire."',
        choices: [{ id: 'leave', label: 'Salute the list.', action: { type: 'close_dialogue' } }],
      },
    },
  },
};

export function createMerchantStock(merchantId: string): Item[] {
  if (merchantId === 'mira') {
    return [
      createConsumable('heal_potion', 3),
      createConsumable('mana_potion', 2),
      createConsumable('ward_talisman', 2),
      createConsumable('scroll_blink', 1),
      createConsumable('heal_potion', 2),
      createConsumable('ward_talisman', 1),
    ];
  }
  if (merchantId === 'vex') {
    return [
      generateProceduralItem(2, { slot: 'weapon', minRarity: 'Rare' }),
      generateProceduralItem(2, { slot: 'ring', minRarity: 'Uncommon' }),
      createConsumable('scroll_blink', 1),
      createConsumable('throwing_knife', 3),
      createConsumable('scroll_blink', 2),
    ];
  }
  if (merchantId === 'bram') {
    return [
      generateProceduralItem(2, { slot: 'amulet', minRarity: 'Rare' }),
      generateProceduralItem(2, { slot: 'ring', minRarity: 'Uncommon' }),
      createConsumable('scroll_blink', 1),
      createConsumable('throwing_knife', 2),
      createConsumable('scroll_blink', 2),
      createConsumable('throwing_knife', 3),
    ];
  }
  if (merchantId === 'halda') {
    return [
      generateProceduralItem(5, { slot: 'weapon', minRarity: 'Epic' }),
      generateProceduralItem(5, { slot: 'armor', minRarity: 'Rare' }),
      generateProceduralItem(5, { slot: 'helm', minRarity: 'Rare' }),
      createConsumable('throwing_knife', 3),
      createConsumable('mana_potion', 2),
      createConsumable('heal_potion', 3),
      createConsumable('ward_talisman', 2),
    ];
  }
  if (merchantId === 'orin') {
    return [
      generateProceduralItem(4, { slot: 'weapon', minRarity: 'Rare' }),
      generateProceduralItem(4, { slot: 'armor', minRarity: 'Rare' }),
      generateProceduralItem(4, { slot: 'amulet', minRarity: 'Epic' }),
      createConsumable('ward_talisman', 1),
      createConsumable('heal_potion', 2),
      createConsumable('heal_potion', 2),
      createConsumable('mana_potion', 2),
    ];
  }
  // Torin default
  return [
    generateProceduralItem(1, { slot: 'weapon', minRarity: 'Uncommon' }),
    generateProceduralItem(1, { slot: 'armor', minRarity: 'Uncommon' }),
    generateProceduralItem(2, { slot: 'helm', minRarity: 'Uncommon' }),
    createConsumable('throwing_knife', 2),
  ];
}

export function isQuestActive(quests: Record<string, QuestProgress>, questId: string): boolean {
  return quests[questId]?.status === 'active';
}
