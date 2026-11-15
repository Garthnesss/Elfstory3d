import React from 'react';
import { Trophy, Skull, X } from 'lucide-react';
import { LifetimeStats } from '../game/lifetime';
import { ChronicleEntry } from '../game/types';

interface HallOfFameModalProps {
  entries: ChronicleEntry[];
  isSignedIn: boolean;
  /** Phase 5: per-device lifetime record (all runs, all slots). */
  lifetime?: LifetimeStats;
  onClose: () => void;
}

export const HallOfFameModal: React.FC<HallOfFameModalProps> = ({
  entries,
  isSignedIn,
  lifetime,
  onClose,
}) => {
  const lifetimeStats: Array<{ label: string; value: number }> = lifetime
    ? [
        { label: 'Expeditions Started', value: lifetime.expeditionsStarted },
        { label: 'Victories', value: lifetime.victories },
        { label: 'Deaths', value: lifetime.deaths },
        { label: 'Foes Slain', value: lifetime.totalKills },
        { label: 'Deepest Floor', value: lifetime.deepestFloor },
        { label: 'Highest Cycle', value: lifetime.highestCycle },
      ]
    : [];
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2.5 sm:p-5">
      <div className="w-full max-w-2xl rounded-md border border-amber-500/30 bg-[#10141D] shadow-2xl flex flex-col max-h-[90dvh]">
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-white/10 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-amber-200">Hall of Fame Chronicle</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isSignedIn
                ? 'Synced record of your victorious and fallen expeditions across cloud and browser.'
                : 'Recorded runs from this browser. Sign in with Google to preserve chronicles in the cloud.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Hall of Fame"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto rpg-scroll space-y-3">
          {lifetime && (
            <div className="p-4 rounded border border-amber-500/25 bg-[#141923]">
              <div className="text-[11px] font-mono-glyph tracking-[0.25em] text-amber-400/80">
                LIFETIME — EVERY DELVE, EVERY FALL
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 text-xs font-mono-glyph">
                {lifetimeStats.map((s) => (
                  <div key={s.label}>
                    <div className="text-slate-400">{s.label}</div>
                    <div className="text-[#ECE4D4] font-semibold mt-0.5 text-sm tabular-nums">
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {entries.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400 border border-white/10 rounded bg-[#141923]">
              No completed expeditions recorded yet. Defeat Malakor on Floor 5—or fall in the deep—to etch your name into the Chronicle.
            </div>
          ) : (
            entries.map((entry) => {
              const isWin = entry.outcome === 'victory';
              const dateLabel = new Date(entry.createdAtMs).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              return (
                <div
                  key={entry.id}
                  className={`p-4 rounded border ${
                    isWin
                      ? 'border-amber-500/40 bg-amber-500/8'
                      : 'border-white/10 bg-[#141923]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isWin ? (
                        <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <Skull className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-display text-sm font-bold text-[#ECE4D4]">
                            {entry.buildTitle}
                          </span>
                          <span className="text-xs text-slate-400">
                            ({entry.starterClass})
                          </span>
                        </div>
                        <div className="text-[11px] font-mono-glyph text-slate-400 mt-0.5 tabular-nums">
                          {isWin ? 'Sovereign Vanquished' : 'Fallen Delver'} · Lv {entry.level} · Floor {entry.deepestDepth} · {entry.kills} Slain · {entry.turnsElapsed} Turns · {entry.gold}g
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono-glyph text-slate-500 shrink-0">
                      {dateLabel}
                    </span>
                  </div>

                  {entry.keyDecisions.length > 0 && (
                    <div className="mt-2.5 pt-2.5 border-t border-white/8 text-xs text-slate-300 space-y-1">
                      {entry.keyDecisions.map((dec, idx) => (
                        <div key={idx} className="text-[11px] text-slate-300">
                          · {dec}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
