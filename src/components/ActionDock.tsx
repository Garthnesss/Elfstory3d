import React, { useState } from 'react';
import { SKILLS } from '../game/skills';
import { LogEntry, PlayerState, SkillId } from '../game/types';

interface ActionDockProps {
  player: PlayerState;
  armedSkill: SkillId | null;
  armedInscriptionSlot: number | null;
  autoExploring: boolean;
  canCycleTarget?: boolean;
  hasAimedTarget?: boolean;
  logs: LogEntry[];
  onTriggerHotbar: (slotIdx: number) => void;
  onTriggerInscription: (slotIdx: number) => void;
  onQuickHeal: () => void;
  onToggleAutoExplore: () => void;
  onSafeRest: () => void;
  onWaitTurn: () => void;
  onCycleTarget?: () => void;
  onConfirmAimedTarget?: () => void;
  onCycleCompanionStance?: () => void;
}

export const ActionDock: React.FC<ActionDockProps> = ({
  player,
  armedSkill,
  armedInscriptionSlot,
  autoExploring,
  canCycleTarget,
  hasAimedTarget,
  logs,
  onTriggerHotbar,
  onTriggerInscription,
  onQuickHeal,
  onToggleAutoExplore,
  onSafeRest,
  onWaitTurn,
  onCycleTarget,
  onConfirmAimedTarget,
  onCycleCompanionStance,
}) => {
  const [mobileDeck, setMobileDeck] = useState<'skills' | 'runes'>('skills');
  const [logExpanded, setLogExpanded] = useState(false);

  const healPotions = player.inventory
    .filter((i) => i.consumableKind === 'heal_potion')
    .reduce((sum, i) => sum + (i.quantity ?? 1), 0);

  const inscriptions = player.inscriptions ?? [null, null, null];
  const inscCds = player.inscriptionCooldowns ?? [0, 0, 0];
  const recentLogs = logs.slice(0, 3);
  const drawerLogs = logs.slice(0, 8);

  const toneColor = (tone: LogEntry['tone']) => {
    switch (tone) {
      case 'crit':
        return 'text-amber-300';
      case 'combat':
        return 'text-slate-200';
      case 'danger':
        return 'text-rose-400';
      case 'loot':
        return 'text-emerald-300';
      case 'quest':
        return 'text-amber-200';
      case 'arcane':
        return 'text-sky-300';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <footer className="relative w-full bg-[#0D1017] border-t border-white/10 shrink-0 flex flex-col pb-[env(safe-area-inset-bottom)]">
      {/* Expandable Chronicle Drawer Overlay (< 2xl) */}
      {logExpanded && drawerLogs.length > 0 && (
        <div className="2xl:hidden absolute bottom-full left-0 right-0 z-30 border-t border-amber-400/30 bg-[#0B0E15]/95 backdrop-blur-sm px-3 py-2.5 shadow-2xl space-y-1 max-h-48 overflow-y-auto rpg-scroll">
          <div className="flex items-center justify-between pb-1 border-b border-white/10">
            <span className="text-[11px] font-semibold text-amber-200">Recent Chronicle</span>
            <button
              type="button"
              onClick={() => setLogExpanded(false)}
              aria-label="Close recent chronicle"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-xs text-slate-400 hover:text-white px-2 cursor-pointer"
            >
              Close
            </button>
          </div>
          {drawerLogs.map((entry) => (
            <div key={entry.id} className={`text-xs leading-snug ${toneColor(entry.tone)}`}>
              <span className="font-mono-glyph text-[10px] text-slate-500 mr-1.5 tabular-nums">
                T{entry.turn}
              </span>
              {entry.text}
            </div>
          ))}
        </div>
      )}

      {/* Compact 1-line Tappable Log Ticker on Phone / Tablet / Laptop (< 2xl) */}
      {recentLogs[0] && (
        <button
          type="button"
          onClick={() => setLogExpanded((v) => !v)}
          aria-label="Toggle recent combat log"
          className="2xl:hidden w-full min-h-[44px] sm:min-h-0 text-left px-3 py-1.5 border-b border-white/8 bg-[#0A0D13] hover:bg-[#101520] text-[11px] flex items-center justify-between gap-2 cursor-pointer"
        >
          <span className="truncate min-w-0">
            <span className="font-mono-glyph text-[10px] text-slate-500 mr-1.5 tabular-nums">
              T{recentLogs[0].turn}
            </span>
            <span className={toneColor(recentLogs[0].tone)}>{recentLogs[0].text}</span>
          </span>
          <span className="text-[10px] font-mono-glyph text-slate-400 shrink-0">
            {logExpanded ? 'Hide' : 'Log'}
          </span>
        </button>
      )}

      {/* === PHONE LAYOUT (< md): Zero-Scroll Ergonomic Controls (all >= 44px) === */}
      <div className="md:hidden px-2 py-1.5 space-y-1.5">
        {canCycleTarget && onCycleTarget && onConfirmAimedTarget && (
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onCycleTarget();
              }}
              className="min-h-[44px] px-3 rounded border border-sky-400/50 bg-sky-500/15 text-sky-100 text-xs font-semibold cursor-pointer"
            >
              Cycle Target [Tab]
            </button>
            <button
              type="button"
              disabled={!hasAimedTarget}
              onClick={(e) => {
                e.currentTarget.blur();
                onConfirmAimedTarget();
              }}
              className="min-h-[44px] px-3 rounded bg-amber-500 text-[#0B0D12] disabled:bg-white/10 disabled:text-slate-500 text-xs font-semibold cursor-pointer"
            >
              Confirm Cast
            </button>
          </div>
        )}

        {/* Row 1: Skills / Runes Switcher + Full-Width Hotbar Slots */}
        <div className="flex items-stretch gap-1.5">
          <div className="flex items-stretch gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setMobileDeck('skills')}
              className={`min-h-[46px] min-w-[44px] px-2 py-1 rounded text-[11px] font-semibold leading-none cursor-pointer ${
                mobileDeck === 'skills'
                  ? 'bg-amber-500 text-[#0B0D12]'
                  : 'bg-[#141923] text-slate-400 border border-white/10'
              }`}
            >
              Skills
            </button>
            <button
              type="button"
              onClick={() => setMobileDeck('runes')}
              className={`min-h-[46px] min-w-[44px] px-2 py-1 rounded text-[11px] font-semibold leading-none cursor-pointer ${
                mobileDeck === 'runes'
                  ? 'bg-sky-500 text-[#0B0D12]'
                  : 'bg-[#141923] text-slate-400 border border-white/10'
              }`}
            >
              Runes
            </button>
          </div>

          {mobileDeck === 'skills' ? (
            <div className="flex-1 grid grid-cols-5 gap-1 min-w-0">
              {player.hotbar.map((skillId, idx) => {
                const def = skillId ? SKILLS[skillId] : null;
                const rank = skillId ? player.skills[skillId] ?? 0 : 0;
                const cd = skillId ? player.cooldowns[skillId] ?? 0 : 0;
                const isArmed = skillId !== null && armedSkill === skillId;
                const noMana = def ? player.mana < def.manaCost : false;
                const usable = Boolean(def && rank > 0 && cd === 0 && !noMana);

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={!def || rank === 0}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onTriggerHotbar(idx);
                    }}
                    className={`min-h-[46px] px-1 py-1 rounded border text-center flex flex-col items-center justify-between transition-colors cursor-pointer disabled:cursor-default ${
                      !def || rank === 0
                        ? 'border-white/5 bg-[#121620]/40 text-slate-600'
                        : isArmed
                          ? 'border-amber-400 bg-amber-500/20 text-amber-100'
                          : usable
                            ? 'border-white/15 bg-[#141923] text-[#ECE4D4]'
                            : 'border-white/10 bg-[#121620] text-slate-500'
                    }`}
                  >
                    <span className="text-sm leading-none mt-0.5">
                      {def && rank > 0 ? def.glyph : '·'}
                    </span>
                    <span className="w-full text-[9px] leading-none truncate font-medium mt-0.5 tabular-nums">
                      {def && rank > 0
                        ? cd > 0
                          ? `CD ${cd}`
                          : `${def.manaCost}mp`
                        : `[${idx + 1}]`}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-3 gap-1.5 min-w-0">
              {[0, 1, 2].map((slotIdx) => {
                const item = inscriptions[slotIdx] ?? null;
                const cd = inscCds[slotIdx] ?? 0;
                const isRune = item?.inscriptionCategory === 'rune';
                const isArmed = armedInscriptionSlot === slotIdx;
                const usable = Boolean(item && cd === 0);

                return (
                  <button
                    key={`m_inscr_${slotIdx}`}
                    type="button"
                    disabled={!item}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onTriggerInscription(slotIdx);
                    }}
                    className={`min-h-[46px] px-2 py-1 rounded border text-left flex flex-col justify-between transition-colors cursor-pointer disabled:cursor-default ${
                      !item
                        ? 'border-white/5 bg-[#121620]/40 text-slate-600'
                        : isArmed
                          ? 'border-sky-400 bg-sky-500/20 text-sky-100'
                          : usable
                            ? isRune
                              ? 'border-sky-400/25 bg-[#121926] text-[#ECE4D4]'
                              : 'border-emerald-400/25 bg-[#121B1A] text-[#ECE4D4]'
                            : 'border-white/10 bg-[#121620] text-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono-glyph">
                      <span className={isRune ? 'text-sky-300' : 'text-emerald-300'}>
                        {item ? item.glyph : `[${slotIdx + 6}]`}
                      </span>
                      {item && (
                        <span className="text-[9px] text-slate-400 tabular-nums">
                          {cd > 0 ? `CD ${cd}` : isRune ? 'Rune' : 'Infus'}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-medium truncate">
                      {item ? item.name.replace(/^(Rare|Epic|Relic|Common)\s+/, '') : 'Open'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Row 2: Always-Visible Quick Action Strip */}
        <div className="grid grid-cols-5 gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onQuickHeal();
            }}
            disabled={healPotions === 0}
            className="min-h-[44px] px-1.5 py-1 rounded border border-white/15 bg-[#141923] active:border-emerald-400 disabled:opacity-45 text-center cursor-pointer tabular-nums"
          >
            <div className="text-[11px] font-medium text-emerald-200 leading-tight">
              Heal ({healPotions})
            </div>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleAutoExplore();
            }}
            className={`min-h-[44px] px-1.5 py-1 rounded border text-center cursor-pointer ${
              autoExploring
                ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                : 'border-white/15 bg-[#141923] text-slate-200'
            }`}
          >
            <div className="text-[11px] font-medium leading-tight">
              {autoExploring ? 'Stop' : 'Explore'}
            </div>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onSafeRest();
            }}
            className="min-h-[44px] px-1.5 py-1 rounded border border-white/15 bg-[#141923] active:border-sky-400 text-center text-sky-200 cursor-pointer"
          >
            <div className="text-[11px] font-medium leading-tight">Rest</div>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onWaitTurn();
            }}
            className="min-h-[44px] px-1.5 py-1 rounded border border-white/15 bg-[#141923] active:border-white/40 text-center text-slate-200 cursor-pointer"
          >
            <div className="text-[11px] font-medium leading-tight">Wait</div>
          </button>

          {player.companion && onCycleCompanionStance && (
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onCycleCompanionStance();
              }}
              className="min-h-[44px] px-1 py-1 rounded border border-sky-400/30 bg-[#121926] text-center text-sky-200 cursor-pointer"
            >
              <div className="text-[10px] font-medium leading-tight capitalize truncate">
                {player.companion.stance}
              </div>
            </button>
          )}
        </div>
      </div>

      {/* === DESKTOP / TABLET LAYOUT (md+): Unified Hotbar + Chronicle === */}
      <div className="hidden md:flex w-full px-3 py-2 items-center justify-between gap-3 overflow-x-auto rpg-scroll">
        {/* Skill Hotbar + Inscriptions + Quick Utilities */}
        <div className="flex items-center gap-1.5 shrink-0">
          {player.hotbar.map((skillId, idx) => {
            const def = skillId ? SKILLS[skillId] : null;
            const rank = skillId ? player.skills[skillId] ?? 0 : 0;
            const cd = skillId ? player.cooldowns[skillId] ?? 0 : 0;
            const isArmed = skillId !== null && armedSkill === skillId;
            const noMana = def ? player.mana < def.manaCost : false;
            const usable = Boolean(def && rank > 0 && cd === 0 && !noMana);

            return (
              <button
                key={idx}
                type="button"
                disabled={!def || rank === 0}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onTriggerHotbar(idx);
                }}
                title={def ? `${def.name} (${def.manaCost} MP) — ${def.summary}` : 'Empty Skill Slot'}
                className={`relative px-2.5 py-1.5 rounded border text-left transition-colors min-w-[100px] max-w-[116px] cursor-pointer disabled:cursor-default ${
                  !def || rank === 0
                    ? 'border-white/5 bg-[#121620]/40 text-slate-600'
                    : isArmed
                      ? 'border-amber-400 bg-amber-500/20 text-amber-100'
                      : usable
                        ? 'border-white/15 bg-[#141923] text-[#ECE4D4] hover:border-amber-400/50'
                        : 'border-white/10 bg-[#121620] text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 text-[10px]">
                  <span className="font-mono-glyph text-amber-300">[{idx + 1}]</span>
                  {def && rank > 0 && (
                    <span className="font-mono-glyph text-[10px] text-sky-300 tabular-nums">
                      {cd > 0 ? `CD ${cd}` : `${def.manaCost} MP`}
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-medium truncate mt-0.5">
                  {def && rank > 0 ? `${def.glyph} ${def.name}` : 'Empty'}
                </div>
              </button>
            );
          })}

          <div className="h-8 w-px bg-white/10 mx-0.5" />

          {/* 3 Cooldown Inscription Slots [6] [7] [8] */}
          {[0, 1, 2].map((slotIdx) => {
            const item = inscriptions[slotIdx] ?? null;
            const cd = inscCds[slotIdx] ?? 0;
            const isRune = item?.inscriptionCategory === 'rune';
            const isArmed = armedInscriptionSlot === slotIdx;
            const usable = Boolean(item && cd === 0);

            return (
              <button
                key={`inscr_${slotIdx}`}
                type="button"
                disabled={!item}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onTriggerInscription(slotIdx);
                }}
                title={item ? `${item.name} — ${item.description}` : 'Empty Inscription Slot (Equip in Pack [I])'}
                className={`relative px-2.5 py-1.5 rounded border text-left transition-colors min-w-[92px] max-w-[112px] cursor-pointer disabled:cursor-default ${
                  !item
                    ? 'border-white/5 bg-[#121620]/40 text-slate-600'
                    : isArmed
                      ? 'border-sky-400 bg-sky-500/20 text-sky-100'
                      : usable
                        ? isRune
                          ? 'border-sky-400/25 bg-[#121926] text-[#ECE4D4] hover:border-sky-400/60'
                          : 'border-emerald-400/25 bg-[#121B1A] text-[#ECE4D4] hover:border-emerald-400/60'
                        : 'border-white/10 bg-[#121620] text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 text-[10px]">
                  <span className={`font-mono-glyph ${isRune ? 'text-sky-300' : 'text-emerald-300'}`}>
                    [{slotIdx + 6}]
                  </span>
                  {item && (
                    <span className="font-mono-glyph text-[10px] text-slate-400 tabular-nums">
                      {cd > 0 ? `CD ${cd}` : isRune ? 'Rune' : 'Infus'}
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-medium truncate mt-0.5">
                  {item ? `${item.glyph} ${item.name.replace(/^(Rare|Epic|Relic|Common)\s+/, '')}` : 'Inscription'}
                </div>
              </button>
            );
          })}

          <div className="h-8 w-px bg-white/10 mx-0.5" />

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onQuickHeal();
            }}
            disabled={healPotions === 0}
            className="px-2.5 py-1.5 rounded border border-white/15 bg-[#141923] hover:border-emerald-400/50 disabled:opacity-45 text-left transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <div className="flex items-center justify-between gap-2 text-[10px]">
              <span className="font-mono-glyph text-emerald-300">[Q]</span>
              <span className="font-mono-glyph text-slate-400 tabular-nums">x{healPotions}</span>
            </div>
            <div className="text-[11px] font-medium text-[#ECE4D4] mt-0.5">Draught</div>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleAutoExplore();
            }}
            title="Auto-Explore nearest frontier & loot (stops on danger)"
            className={`px-2.5 py-1.5 rounded border text-left transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              autoExploring
                ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                : 'border-white/15 bg-[#141923] hover:border-emerald-400/50 text-slate-200'
            }`}
          >
            <div className="text-[10px] font-mono-glyph text-emerald-300">[Z]</div>
            <div className="text-[11px] font-medium mt-0.5">{autoExploring ? 'Exploring' : 'Explore'}</div>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onSafeRest();
            }}
            title="Safe Rest to restore HP, Mana, and all Cooldowns when unseen"
            className="px-2.5 py-1.5 rounded border border-white/15 bg-[#141923] hover:border-sky-400/50 text-left transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <div className="text-[10px] font-mono-glyph text-sky-300">[R]</div>
            <div className="text-[11px] font-medium text-slate-200 mt-0.5">Rest</div>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onWaitTurn();
            }}
            className="px-2.5 py-1.5 rounded border border-white/15 bg-[#141923] hover:border-white/30 text-left transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <div className="text-[10px] font-mono-glyph text-slate-400">[.]</div>
            <div className="text-[11px] font-medium text-slate-200 mt-0.5">Wait</div>
          </button>

          {player.companion && onCycleCompanionStance && (
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onCycleCompanionStance();
              }}
              title="Cycle Spirit Companion Stance (Aggressive -> Guard -> Recall)"
              className="px-2.5 py-1.5 rounded border border-sky-400/30 bg-[#121926] hover:border-sky-400/60 text-left transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <div className="text-[10px] font-mono-glyph text-sky-300 truncate">
                {player.companion.kind === 'silverwind_lynx' ? 'Lynx' : 'Owl'}
              </div>
              <div className="text-[11px] font-medium text-slate-200 capitalize mt-0.5">
                {player.companion.stance}
              </div>
            </button>
          )}
        </div>

        {/* Compact Rolling Chronicle Log */}
        <div className="hidden 2xl:flex flex-col justify-center min-w-0 flex-1 max-w-md border-l border-white/10 pl-3 space-y-0.5">
          {recentLogs.map((entry, idx) => (
            <div
              key={entry.id}
              className={`text-xs truncate ${toneColor(entry.tone)} ${idx === 0 ? 'opacity-100' : idx === 1 ? 'opacity-70' : 'opacity-45'}`}
            >
              <span className="font-mono-glyph text-[10px] text-slate-500 mr-1.5 tabular-nums">T{entry.turn}</span>
              {entry.text}
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
};
