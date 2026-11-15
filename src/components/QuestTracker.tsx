import React from 'react';
import { deriveTrackedObjectives } from '../game/quests';
import { QuestProgress, WorldFlags } from '../game/types';

interface QuestTrackerProps {
  quests: Record<string, QuestProgress>;
  worldFlags: WorldFlags;
  /** Hide while a dialogue / special prompt owns the screen. */
  hidden?: boolean;
}

/**
 * HUD quest tracker (Phase 2): pins the current main-quest objective — the
 * same stage-aware guidance the Journal computes — at the top-right of the
 * playfield, with the tracked side quest beneath it. Pointer-transparent so
 * it never eats canvas input; compact single-line on small screens.
 */
export const QuestTracker: React.FC<QuestTrackerProps> = ({ quests, worldFlags, hidden }) => {
  if (hidden) return null;
  const { main, side, extraSideCount } = deriveTrackedObjectives(quests, worldFlags);
  if (!main && !side) return null;

  return (
    <div className="pointer-events-none absolute top-2.5 right-2.5 z-10 max-w-[54vw] sm:max-w-[340px] space-y-1">
      {main && (
        <div className="rounded border border-amber-400/30 bg-[#0D111A]/88 backdrop-blur-sm px-2.5 py-1.5 shadow-lg">
          <div className="text-[9px] sm:text-[10px] font-mono-glyph tracking-widest text-amber-400/90 truncate">
            ◆ {main.title.toUpperCase()}
          </div>
          <p className="text-[11px] sm:text-xs text-amber-100/95 leading-snug truncate sm:whitespace-normal sm:line-clamp-2">
            {main.hint}
          </p>
        </div>
      )}
      {side && (
        <div className="hidden sm:block rounded border border-white/12 bg-[#0D111A]/80 backdrop-blur-sm px-2.5 py-1.5 shadow-lg">
          <div className="text-[10px] font-mono-glyph tracking-widest text-sky-300/90 truncate">
            ◇ {side.title.toUpperCase()}
            {extraSideCount > 0 ? ` · +${extraSideCount} MORE IN JOURNAL [J]` : ''}
          </div>
          <p className="text-xs text-slate-300 leading-snug line-clamp-2">{side.hint}</p>
        </div>
      )}
    </div>
  );
};
