import React from 'react';
import { Award, BookOpen, Skull, X } from 'lucide-react';
import { formatStatList } from '../game/loot';
import { LORE_ENTRIES, QUEST_DEFS } from '../game/npcs';
import { getQuestNextHint } from '../game/quests';
import { QuestProgress, WorldFlags } from '../game/types';

interface QuestJournalModalProps {
  quests: Record<string, QuestProgress>;
  worldFlags: WorldFlags;
  zoneBrief?: {
    name: string;
    subtitle: string;
    lore: string;
    tactical: string;
    recommended: string;
  };
  onClose: () => void;
}


const TOTAL_STELE_COUNT = Object.keys(LORE_ENTRIES).length;

export const QuestJournalModal: React.FC<QuestJournalModalProps> = ({
  quests,
  worldFlags,
  zoneBrief,
  onClose,
}) => {

  const entries = Object.values(quests);
  const active = entries.filter((q) => q.status === 'active');
  const completed = entries.filter((q) => q.status === 'completed');
  const readLore = (worldFlags.readLoreIds ?? [])
    .map((id) => ({ id, entry: LORE_ENTRIES[id] }))
    .filter((item) => Boolean(item.entry));

  return (
    <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-2.5 sm:p-5">
      <div className="w-full max-w-4xl rounded-md border border-white/15 bg-[#10141D] shadow-2xl flex flex-col max-h-[90dvh]">
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-amber-200">
              Expedition Journal
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
              Quests: {active.length} active · Steles: {readLore.length}/{TOTAL_STELE_COUNT}
            </p>
          </div>

          <div className="flex items-center gap-2 ml-auto">

            <button
              type="button"
              onClick={onClose}
              aria-label="Close quest journal"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto rpg-scroll p-4 sm:p-6 space-y-6">
          {(
            <>
              {zoneBrief && (
                <section className="p-4 rounded border border-amber-500/25 bg-[#151A25] space-y-1.5">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-display text-base font-bold text-amber-200">{zoneBrief.name}</span>
                    <span className="text-[11px] font-mono-glyph text-slate-400">
                      {zoneBrief.subtitle} · {zoneBrief.recommended}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{zoneBrief.lore}</p>
                  <p className="text-[11px] text-amber-300/90 leading-snug">{zoneBrief.tactical}</p>
                </section>
              )}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-[#ECE4D4]">Active Quests</h3>
                {active.length === 0 ? (
                  <div className="p-4 rounded border border-white/10 bg-[#141923] text-xs text-slate-500">
                    No active quests. Speak with townsfolk across the realm: Oakhaven (Vance, Vex, Mira), Silverbridge (Rowan), Thornwick Fen (Elder Sylva), Cinderwatch Bastion (Captain Darek, Forgemistress Halda), or Highspire Citadel (Kaelen, Lyra).
                  </div>
                ) : (
                  active.map((q) => {
                    const def = QUEST_DEFS[q.id];
                    return (
                      <div key={q.id} className="p-4 rounded border border-amber-500/25 bg-[#151A25] space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-display text-base font-bold text-amber-200">
                            {def?.title ?? q.id}
                          </span>
                          <span className="text-xs text-slate-400">{def?.location}</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{def?.summary}</p>
                        <div className="text-xs text-amber-200/90 bg-amber-500/10 border border-amber-400/25 rounded px-2.5 py-1.5">
                          {getQuestNextHint(q, worldFlags)}
                        </div>
                        <ul className="space-y-1 pt-2 border-t border-white/8 text-xs text-slate-400">
                          {q.history.map((h, i) => (
                            <li key={i}>• {h}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  })
                )}
              </section>

              {completed.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-[#ECE4D4]">Completed Chronicles</h3>
                  {completed.map((q) => {
                    const def = QUEST_DEFS[q.id];
                    return (
                      <div key={q.id} className="p-4 rounded border border-white/10 bg-[#131720] space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-emerald-300">
                            {def?.title ?? q.id}
                          </span>
                          {q.outcomeLabel && (
                            <span className="text-xs font-mono-glyph text-amber-300">{q.outcomeLabel}</span>
                          )}
                        </div>
                        <ul className="space-y-1 text-xs text-slate-400">
                          {q.history.map((h, i) => (
                            <li key={i}>• {h}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </section>
              )}

              <section className="p-4 rounded border border-white/10 bg-[#131720] space-y-2">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Realm Standing</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400">
                  <div>
                    Citadel Access: <span className="text-[#ECE4D4]">{worldFlags.citadelAccess ? 'Granted' : 'Sealed'}</span>
                  </div>
                  <div>
                    Mira’s Draughts:{' '}
                    <span className="text-[#ECE4D4]">
                      {worldFlags.miraPotionTier > 1 ? 'Distilled (Enhanced)' : 'Standard'}
                    </span>
                  </div>
                  <div>
                    Floor 3 Shortcut:{' '}
                    <span className="text-[#ECE4D4]">{worldFlags.floor3Shortcut ? 'Unlocked' : 'Locked'}</span>
                  </div>
                  <div>
                    Malakor’s Ward:{' '}
                    <span className="text-[#ECE4D4]">{worldFlags.malakorWeakened ? 'Weakened' : 'Intact'}</span>
                  </div>
                  <div>
                    Silverbridge Road:{' '}
                    <span className="text-[#ECE4D4]">{worldFlags.silverbridgeCleared ? 'Secured' : 'Brigand Tolled'}</span>
                  </div>
                  <div>
                    Whispering Barrow:{' '}
                    <span className="text-[#ECE4D4]">{worldFlags.barrowBossDefeated ? 'Purged' : 'Haunted'}</span>
                  </div>
                  <div>
                    Fungal Hollow:{' '}
                    <span className="text-[#ECE4D4]">{worldFlags.mireBossDefeated ? 'Cleansed' : 'Spore-Bound'}</span>
                  </div>
                  <div>
                    Frostpeak &amp; Caldera:{' '}
                    <span className="text-[#ECE4D4]">{worldFlags.frostBossDefeated ? 'Subdued' : 'Burning'}</span>
                  </div>
                </div>
              </section>

              <section className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#ECE4D4] flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-violet-300" />
                    <span>Discovered Carved Steles</span>
                  </h3>
                  <span className="text-xs font-mono-glyph text-slate-400 tabular-nums">
                    {readLore.length}/{TOTAL_STELE_COUNT}
                  </span>
                </div>
                {readLore.length === 0 ? (
                  <div className="p-4 rounded border border-white/10 bg-[#131720] text-xs text-slate-500">
                    Inspect glowing Carved Steles (‡) across towns and dungeon floors to archive ancient warnings and lore here.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {readLore.map(({ id, entry }) => (
                      <div key={id} className="p-3 rounded border border-violet-400/20 bg-[#141724] space-y-1">
                        <div className="text-xs font-semibold text-violet-200">{entry.title}</div>
                        <p className="text-xs text-slate-300 leading-relaxed">{entry.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
