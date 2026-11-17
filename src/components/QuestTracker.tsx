import React from 'react';
import { deriveTrackedObjectives } from '../game/quests';
import { QuestProgress, WorldFlags, ZoneMap } from '../game/types';

interface QuestTrackerProps {
  quests: Record<string, QuestProgress>;
  worldFlags: WorldFlags;
  /** Hide while a dialogue / special prompt owns the screen. */
  hidden?: boolean;
  /** Live position + zone, for objective compass hints. */
  playerPos?: { x: number; y: number };
  zone?: ZoneMap;
}

/** 8-way compass + Chebyshev distance from the player to a tile. */
function compassTo(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.max(Math.abs(dx), Math.abs(dy));
  if (dist === 0) return 'here';
  const ns = dy < 0 ? 'N' : dy > 0 ? 'S' : '';
  const ew = dx < 0 ? 'W' : dx > 0 ? 'E' : '';
  return `${ns}${ew} · ${dist} tiles`;
}

/**
 * HUD quest tracker (Phase 2): pins the current main-quest objective — the
 * same stage-aware guidance the Journal computes — at the top-right of the
 * playfield, with the tracked side quest beneath it. Pointer-transparent so
 * it never eats canvas input; compact single-line on small screens.
 */
export const QuestTracker: React.FC<QuestTrackerProps> = ({ quests, worldFlags, hidden, playerPos, zone }) => {
  if (hidden) return null;
  const { main, side, extraSideCount } = deriveTrackedObjectives(quests, worldFlags);

  // Smuggler Cache compass: while Vance's cache quest is at the recovery
  // stage and the player is on the cache's floor, point at the cache tile
  // itself — the static hint alone left players wandering a dark maze.
  let cacheCompass: string | null = null;
  const cacheQuest = quests['shadows_beneath'];
  if (playerPos && zone && cacheQuest?.status === 'active' && cacheQuest.stage < 2) {
    let target: { x: number; y: number } | null = null;
    for (let y = 0; y < zone.height && !target; y++) {
      for (let x = 0; x < zone.width; x++) {
        const t = zone.tiles[y][x];
        if (t.kind === 'contraband_cache' && !t.used) {
          target = { x, y };
          break;
        }
      }
    }
    if (target) cacheCompass = `▤ Smuggler Cache: ${compassTo(playerPos, target)}`;
  }

  if (!main && !side && !cacheCompass) return null;

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
      {cacheCompass && (
        <div className="rounded border border-violet-400/30 bg-[#0D111A]/80 backdrop-blur-sm px-2.5 py-1 shadow-lg">
          <p className="text-[11px] sm:text-xs text-violet-200/95 leading-snug">{cacheCompass}</p>
        </div>
      )}
    </div>
  );
};
