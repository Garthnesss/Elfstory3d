import React from 'react';
import { X } from 'lucide-react';

interface LegendModalProps {
  onClose: () => void;
  /** Phase 2: the first-run tutorial can be replayed from the Guide. */
  onReplayTutorial?: () => void;
}

const TILE_ITEMS = [
  { glyph: '>', color: 'text-amber-400', name: 'Descent Stair', desc: 'Descend to the next dungeon floor or unlock the Endless Abyss (Floor 6+).' },
  { glyph: '<', color: 'text-sky-300', name: 'Ascent Stair', desc: 'Return upward toward earlier floors or Oakhaven Outpost.' },
  { glyph: '⊞', color: 'text-orange-400', name: 'Sealed Vault Door', desc: 'High-risk treasure vault lock (Depth 2+). Raises a danger warning before unsealing Rare guards & Relic loot.' },
  { glyph: 'Ω', color: 'text-amber-300', name: 'Realm Road Gate', desc: 'Cross between Silverwood Vale Overworld and the four towns: Oakhaven, Thornwick Fen, Cinderwatch Bastion, and Highspire Citadel.' },
  { glyph: '┼', color: 'text-sky-400', name: 'Glyph Shrine', desc: 'Restores full HP/Mana or lets you freely respec Attributes & Skills.' },
  { glyph: '☼', color: 'text-orange-400', name: 'Restorative Brazier', desc: 'Single-use hearth that mends all wounds, refills Mana, and clears ailments.' },
  { glyph: '◈', color: 'text-sky-300', name: 'Elven Waystone', desc: 'Ancient outrider cairn. Attune to mend 35% HP/MP, draw Starlight Surge, and progress Oath of the Silver Bough.' },
  { glyph: '⚒', color: 'text-orange-300', name: 'Forgotten Forge', desc: 'Smoldering anvil. Temper equipped gear +1, smelt Set Relics, or rake embers for Glyph Dust.' },
  { glyph: 'Ψ', color: 'text-purple-300', name: 'Occult Blood Altar', desc: 'Forbidden pact stone. Trade 25% HP for a Set Relic/Epic Gear, or Purify with Resolve 3+.' },
  { glyph: '$', color: 'text-amber-300', name: 'Ironbound Chest', desc: 'Contains gold, draughts, Inscriptions, and procedural Uncommon+ equipment.' },
  { glyph: '‡', color: 'text-violet-300', name: 'Carved Stele', desc: 'Ancient inscription revealing lore and tactical dungeon hints.' },
  { glyph: '^', color: 'text-rose-400', name: 'Spike Snare', desc: 'Hidden floor trap. Agility 3+ automatically spots and disarms snares.' },
  { glyph: '»', color: 'text-lime-400', name: 'Venom Dart Snare', desc: 'Wall-mounted dart trap (Depth 2+). Harder to spot — Agility 4+ disarms it; its darts deal damage and Poison (3t).' },
  { glyph: '☼', color: 'text-amber-400', name: 'Seal Brazier & Brazier-Sealed Door', desc: 'Set-piece puzzle (main descent): light every Seal Brazier in the Brazier Hall and its rune-sealed treasure door grinds open.' },
  { glyph: '≈', color: 'text-emerald-400', name: 'Biome Hazards (Spore / Frost / Ember / Shock)', desc: 'Hazardous dungeon floor patches. High Agility, Resolve, or Arcana harvests Glyph Dust instead of taking harm.' },
];

const STATUS_ITEMS = [
  { name: 'Spirit Companions (Lynx & Owl)', tone: 'text-sky-300', desc: 'Active allies granting passive stats and fighting alongside Garth. Cycle Aggressive, Guard, or Recall stance in the action dock, or swap at Vance/Kaelen.' },
  { name: 'Monster Bestiary & Feats', tone: 'text-amber-300', desc: 'Open Journal [J] -> Bestiary to track kill milestones (+10% Hunter damage & permanent Slayer stats) and Expedition Feats.' },
  { name: 'Runeforge & Town Upgrades', tone: 'text-emerald-300', desc: 'Visit merchants -> Runeforge to etch permanent Rune Seals or reforge Rare+ affixes. Fund Apothecary, Smithy & Watchtower via Vance or Kaelen.' },
  { name: 'Floor Mini-Bosses & Rare Foes', tone: 'text-sky-300', desc: 'Named Wardens & Rare elites wielding player skills with pinned Boss Threat bars and Set Relic / Epic drops.' },
  { name: 'Relic Sets (2-Piece Bonus)', tone: 'text-amber-200', desc: 'Equip 2 pieces of a set — Starlight Outrider, Cinderforged Covenant, Thornbound Covenant, or Rimebound Regalia — to unlock permanent set bonuses.' },
  { name: 'Set-Piece Rooms & Deep Fauna', tone: 'text-lime-300', desc: 'Each dungeon floor hides one hand-built set-piece room (a trapped Sepulcher, the Spore-Heart Chamber, the Rime Circle, or a Brazier-Sealed hall). Side dungeons breed their own foes — Grave Husks cheat death once, Spore Hulks burst when slain, and Rime Revenant bolts Chill.' },
  { name: 'Telegraphed Red Tiles', tone: 'text-rose-400', desc: 'Enemies with a [!] badge are winding up Ground Slam, Hex Bolt, or player skills. Step off red tiles to evade.' },
  { name: 'Runes & Infusions [6–8]', tone: 'text-emerald-300', desc: '3 permanent cooldown-based Inscription slots (Shielding, Phase Door, Wild Cleanse, Regen, Movement). Recharge naturally or via Safe Rest.' },
  { name: 'Milestone Prodigies (Lv 6 & 10)', tone: 'text-violet-300', desc: 'Build-defining capstones unlocked at Levels 6 and 10 inside Skills [K] -> Milestone Prodigies.' },
  { name: 'Stunned / Chilled / Marked', tone: 'text-amber-300', desc: 'Stunned skips turns & breaks windups; Chilled cuts foe ATK by 35%; Marked amplifies damage taken.' },
];

const CONTROLS = [
  { key: 'WASD / Arrows / D-Pad', action: 'Move, melee-attack adjacent foes, or talk to NPCs (hold D-Pad to walk)' },
  { key: '[ / ] or ↺ / ↻', action: 'Rotate the 2.5D isometric camera 90° left or right' },
  { key: 'Swipe / Tap Tile', action: 'Swipe canvas to step 1 tile, or tap tile to path & act' },
  { key: 'Look / Long-Press', action: 'Inspect enemy skills, intents, shrines, or vault doors safely' },
  { key: 'Map / - + Zoom', action: 'Toggle phone corner minimap or adjust tile size' },
  { key: '1 – 5 / 6 – 8 / Tab', action: 'Cast Active Skills / Runes / Cycle Aimed Target' },
  { key: 'Z / R / Q / .', action: 'Auto-Explore / Safe Rest / Quick Draught / Wait 1 turn' },
  { key: 'K / I / J / M', action: 'Open Skills & Prodigies, Pack, Journal & Bestiary, or Waypoints' },
  { key: 'Enter / Space / Esc', action: 'Accept dialogue/prompts or close/cancel targeting & open Menu' },
];

export const LegendModal: React.FC<LegendModalProps> = ({ onClose, onReplayTutorial }) => {
  return (
    <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-2.5 sm:p-5">
      <div className="w-full max-w-3xl rounded-md border border-white/15 bg-[#10141D] shadow-2xl flex flex-col max-h-[90dvh]">
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-white/10 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-amber-200">Delver’s Field Guide</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Garth Elfstrom’s chronicle, dungeon props, combat telegraphs, and desktop/phone controls.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close guide"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto rpg-scroll space-y-5">
          {onReplayTutorial && (
            <button
              type="button"
              onClick={onReplayTutorial}
              className="w-full min-h-[44px] py-2.5 rounded border border-sky-400/40 bg-sky-500/10 hover:bg-sky-500/20 text-sky-100 font-medium text-sm cursor-pointer"
            >
              Replay the First-Run Tutorial
            </button>
          )}

          <div className="p-3.5 rounded border border-amber-500/25 bg-amber-500/8 text-xs text-slate-300 leading-relaxed">
            <span className="font-semibold text-amber-200">The Expedition:</span> Centuries after the First Ember sealed
            Sovereign Malakor beneath the Sunken Citadel, the Ashen Glyph stirs once more. Step outside Oakhaven’s gate
            to explore the Silverwood Vale Overworld, visit Thornwick Fen, Cinderwatch Bastion, and Highspire Citadel,
            conquer side dungeons like Whispering Barrow, Fungal Hollow, and Frostpeak Cavern, and descend to Floor 5.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="space-y-2.5">
              <h3 className="font-display text-sm font-semibold text-[#ECE4D4]">Terrain & Dungeon Props</h3>
              <div className="space-y-2">
                {TILE_ITEMS.map((item) => (
                  <div key={item.name} className="p-2.5 rounded border border-white/10 bg-[#141923] flex items-start gap-3">
                    <span className={`font-mono-glyph text-base font-bold w-5 text-center shrink-0 ${item.color}`}>
                      {item.glyph}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#ECE4D4]">{item.name}</div>
                      <div className="text-[11px] text-slate-400 leading-snug mt-0.5">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="space-y-6">
              <section className="space-y-2.5">
                <h3 className="font-display text-sm font-semibold text-[#ECE4D4]">Combat Telegraphs & Statuses</h3>
                <div className="space-y-2">
                  {STATUS_ITEMS.map((item) => (
                    <div key={item.name} className="p-2.5 rounded border border-white/10 bg-[#141923]">
                      <div className={`text-xs font-semibold ${item.tone}`}>{item.name}</div>
                      <div className="text-[11px] text-slate-400 leading-snug mt-0.5">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-2.5">
                <h3 className="font-display text-sm font-semibold text-[#ECE4D4]">Controls</h3>
                <div className="rounded border border-white/10 bg-[#141923] divide-y divide-white/8">
                  {CONTROLS.map((c) => (
                    <div key={c.key} className="px-3 py-2 flex items-center justify-between gap-3 text-xs">
                      <span className="font-mono-glyph text-amber-200 shrink-0">{c.key}</span>
                      <span className="text-slate-300 text-right">{c.action}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
