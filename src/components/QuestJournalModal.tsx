import React, { useState } from 'react';
import { Award, BookOpen, Skull, X } from 'lucide-react';
import { ALL_BESTIARY_LIST, computeBestiaryPerks, FEAT_DEFS } from '../game/codex';
import { formatStatList } from '../game/loot';
import { LORE_ENTRIES, QUEST_DEFS } from '../game/npcs';
import { getQuestNextHint } from '../game/quests';
import { QuestProgress, WorldFlags } from '../game/types';

interface QuestJournalModalProps {
  quests: Record<string, QuestProgress>;
  worldFlags: WorldFlags;
  onClose: () => void;
}

type CodexTab = 'quests' | 'bestiary' | 'feats';

const TOTAL_STELE_COUNT = Object.keys(LORE_ENTRIES).length;

export const QuestJournalModal: React.FC<QuestJournalModalProps> = ({
  quests,
  worldFlags,
  onClose,
}) => {
  const [tab, setTab] = useState<CodexTab>('quests');

  const entries = Object.values(quests);
  const active = entries.filter((q) => q.status === 'active');
  const completed = entries.filter((q) => q.status === 'completed');
  const readLore = (worldFlags.readLoreIds ?? [])
    .map((id) => ({ id, entry: LORE_ENTRIES[id] }))
    .filter((item) => Boolean(item.entry));

  const bestiaryKills = worldFlags.bestiaryKills ?? {};
  const perks = computeBestiaryPerks(worldFlags);
  const activeSlayerList = formatStatList(perks.slayerStats);
  const unlockedFeats = new Set(worldFlags.unlockedFeats ?? []);

  return (
    <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-2.5 sm:p-5">
      <div className="w-full max-w-4xl rounded-md border border-white/15 bg-[#10141D] shadow-2xl flex flex-col max-h-[90dvh]">
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-amber-200">
              Expedition Journal &amp; Codex
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
              Quests: {active.length} active · Steles: {readLore.length}/{TOTAL_STELE_COUNT} · Bestiary Hunters: {perks.unlockedHunters}/{ALL_BESTIARY_LIST.length} · Feats: {unlockedFeats.size}/{FEAT_DEFS.length}
            </p>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-1 p-1 rounded bg-[#0A0D14] border border-white/10">
              {(
                [
                  { id: 'quests', label: 'Quests & Lore' },
                  { id: 'bestiary', label: 'Bestiary' },
                  { id: 'feats', label: 'Feats' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`min-h-[44px] px-2.5 sm:px-3 py-1.5 rounded text-xs font-medium cursor-pointer ${
                    tab === t.id ? 'bg-amber-500 text-[#0B0D12] font-semibold' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

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
          {tab === 'quests' && (
            <>
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

          {tab === 'bestiary' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded border border-sky-400/25 bg-[#131926] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Skull className="w-4 h-4 text-sky-300" />
                  <span className="text-xs font-semibold text-[#ECE4D4]">
                    Active Slayer Bonuses ({perks.unlockedSlayers}/{ALL_BESTIARY_LIST.length} Mastered)
                  </span>
                </div>
                <div className="text-xs font-mono-glyph text-sky-200 tabular-nums">
                  {activeSlayerList.length > 0
                    ? activeSlayerList.map((s) => `${s.label} ${s.value}`).join(' · ')
                    : 'Slay foes to unlock +10% Hunter damage and permanent Slayer stat milestones'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ALL_BESTIARY_LIST.map((def) => {
                  const kills = bestiaryKills[def.archetype] ?? 0;
                  const discovered = kills > 0;
                  const hunterDone = kills >= def.hunterKills;
                  const slayerDone = kills >= def.slayerKills;
                  const progressPct = Math.min(100, (kills / def.slayerKills) * 100);

                  return (
                    <div
                      key={def.archetype}
                      className={`p-3.5 rounded border space-y-2 ${
                        slayerDone
                          ? 'border-amber-400/45 bg-[#161B27]'
                          : hunterDone
                            ? 'border-sky-400/35 bg-[#141A25]'
                            : 'border-white/10 bg-[#131720]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="font-mono-glyph text-lg font-bold w-5 text-center shrink-0"
                            style={{ color: discovered ? def.color : '#475569' }}
                          >
                            {discovered ? def.glyph : '?'}
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[#ECE4D4] truncate">
                              {discovered ? def.name : `Unknown ${def.tier}`}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">{def.biome}</div>
                          </div>
                        </div>
                        <div className="text-xs font-mono-glyph text-amber-300 tabular-nums shrink-0">
                          {kills} slain
                        </div>
                      </div>

                      {discovered ? (
                        <>
                          <p className="text-xs text-slate-300 leading-snug">{def.lore}</p>
                          <div className="text-[11px] text-slate-400">
                            <span className="text-sky-300 font-medium">Tactic:</span> {def.tacticalTip}
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-slate-500 italic">
                          Slay at least 1 specimen to transcribe lore and tactics.
                        </p>
                      )}

                      <div className="h-1.5 rounded-sm bg-[#0C1018] overflow-hidden border border-white/10">
                        <div
                          className={`h-full transition-transform duration-150 origin-left ${
                            slayerDone ? 'bg-amber-400' : 'bg-sky-400'
                          }`}
                          style={{ transform: `scaleX(${progressPct / 100})` }}
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-glyph tabular-nums">
                        <span className={hunterDone ? 'text-emerald-300' : 'text-slate-500'}>
                          [{Math.min(kills, def.hunterKills)}/{def.hunterKills}] {def.hunterBonusLabel}
                        </span>
                        <span className={slayerDone ? 'text-amber-300' : 'text-slate-500'}>
                          [{Math.min(kills, def.slayerKills)}/{def.slayerKills}] {def.slayerBonusLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'feats' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {FEAT_DEFS.map((feat) => {
                const done = unlockedFeats.has(feat.id);
                return (
                  <div
                    key={feat.id}
                    className={`p-4 rounded border space-y-1.5 ${
                      done
                        ? 'border-emerald-500/40 bg-[#121D1A]'
                        : 'border-white/10 bg-[#131720]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-sm font-semibold flex items-center gap-1.5 ${
                          done ? 'text-emerald-200' : 'text-[#ECE4D4]'
                        }`}
                      >
                        <Award className={`w-4 h-4 ${done ? 'text-emerald-300' : 'text-slate-500'}`} />
                        <span>{feat.title}</span>
                      </span>
                      <span
                        className={`font-mono-glyph text-[11px] font-semibold ${
                          done ? 'text-emerald-300' : 'text-amber-300'
                        }`}
                      >
                        {done ? 'Claimed' : feat.rewardLabel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-snug">{feat.summary}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
