import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { DerivedStats, PlayerState, ZoneMap } from '../game/types';

interface TopHudProps {
  zone: ZoneMap;
  player: PlayerState;
  derived: DerivedStats;
  muted: boolean;
  onToggleMute: () => void;
  onOpenPanel: (panel: 'SKILLS' | 'INVENTORY' | 'QUESTS' | 'TRAVEL' | 'LEGEND') => void;
  onPause: () => void;
}

export const TopHud: React.FC<TopHudProps> = ({
  zone,
  player,
  derived,
  muted,
  onToggleMute,
  onOpenPanel,
  onPause,
}) => {
  const hpPct = Math.max(0, Math.min(100, (player.hp / derived.maxHp) * 100));
  const mpPct = Math.max(0, Math.min(100, (player.mana / derived.maxMana) * 100));
  const totalPts = player.attributePoints + player.skillPoints + (player.prodigyPoints ?? 0);
  const hasPoints = totalPts > 0;

  return (
    <header className="w-full px-2.5 sm:px-4 py-1.5 lg:py-0 lg:h-12 bg-[#0D1017] border-b border-white/10 flex flex-wrap lg:flex-nowrap items-center justify-between gap-2 lg:gap-4 shrink-0">
      {/* Zone & Compact Mobile Lv/Gold */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <span className="font-display text-xs sm:text-sm font-semibold text-amber-200 whitespace-nowrap truncate max-w-[130px] sm:max-w-none">
          {zone.name}
        </span>
        <span className="xl:hidden text-[11px] font-mono-glyph text-slate-300 whitespace-nowrap tabular-nums">
          Lv {player.level} · <span className="text-amber-300">{player.gold}g</span>
        </span>
        <span className="text-slate-600 hidden xl:inline" aria-hidden="true">·</span>
        <span className="text-xs text-slate-400 whitespace-nowrap hidden xl:inline truncate">
          {zone.subtitle}
        </span>
      </div>

      {/* Vital Bars & Tabular Readouts */}
      <div className="flex items-center gap-2.5 sm:gap-5 shrink-0">
        {/* Health */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-[10px] sm:text-[11px] font-medium text-rose-300">HP</span>
          <div className="w-12 sm:w-24 h-2 rounded-sm bg-[#1A202C] overflow-hidden border border-white/10">
            <div
              className="h-full bg-rose-500 transition-transform duration-150 origin-left"
              style={{ transform: `scaleX(${hpPct / 100})` }}
            />
          </div>
          <span className="font-mono-glyph text-[11px] sm:text-xs text-[#ECE4D4] tabular-nums">
            {player.hp}/{derived.maxHp}
          </span>
        </div>

        {/* Mana */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-[10px] sm:text-[11px] font-medium text-sky-300">MP</span>
          <div className="w-10 sm:w-20 h-2 rounded-sm bg-[#1A202C] overflow-hidden border border-white/10">
            <div
              className="h-full bg-sky-500 transition-transform duration-150 origin-left"
              style={{ transform: `scaleX(${mpPct / 100})` }}
            />
          </div>
          <span className="font-mono-glyph text-[11px] sm:text-xs text-[#ECE4D4] tabular-nums">
            {player.mana}/{derived.maxMana}
          </span>
        </div>

        {/* Level, Build Title & Gold */}
        <div className="hidden xl:flex items-center gap-2 text-xs text-slate-300 font-mono-glyph tabular-nums">
          <span className="font-sans font-medium text-[#ECE4D4]">{player.name}</span>
          <span className="text-slate-600">·</span>
          <span className="text-amber-300">Lv {player.level}</span>
          <span className="text-slate-600">·</span>
          <span className="font-sans text-slate-300">{derived.buildTitle}</span>
          <span className="text-slate-600">·</span>
          <span className="text-amber-400">{player.gold}g</span>
        </div>
      </div>

      {/* Action Buttons */}
      <nav className="w-full lg:w-auto flex items-center justify-between lg:justify-end gap-1 sm:gap-1.5 overflow-x-auto rpg-scroll shrink-0 pb-0.5 lg:pb-0">
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenPanel('SKILLS');
          }}
          className={`min-h-[44px] lg:min-h-0 px-2.5 py-1 rounded text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            hasPoints
              ? 'bg-amber-500/20 text-amber-200 border border-amber-400/50 hover:bg-amber-500/30'
              : 'text-slate-200 hover:bg-white/8 border border-white/10'
          }`}
        >
          Skills<span className="hidden sm:inline"> [K]</span>{hasPoints ? ` (${totalPts})` : ''}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenPanel('INVENTORY');
          }}
          className="min-h-[44px] lg:min-h-0 px-2.5 py-1 rounded text-[11px] sm:text-xs font-medium text-slate-200 hover:bg-white/8 border border-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Pack<span className="hidden sm:inline"> [I]</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenPanel('QUESTS');
          }}
          className="min-h-[44px] lg:min-h-0 px-2.5 py-1 rounded text-[11px] sm:text-xs font-medium text-slate-200 hover:bg-white/8 border border-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Quests<span className="hidden sm:inline"> [J]</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenPanel('TRAVEL');
          }}
          className="min-h-[44px] lg:min-h-0 px-2.5 py-1 rounded text-[11px] sm:text-xs font-medium text-slate-200 hover:bg-white/8 border border-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Travel<span className="hidden sm:inline"> [M]</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenPanel('LEGEND');
          }}
          className="min-h-[44px] lg:min-h-0 px-2.5 py-1 rounded text-[11px] sm:text-xs font-medium text-slate-200 hover:bg-white/8 border border-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Guide<span className="hidden sm:inline"> [?]</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleMute();
          }}
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 p-1.5 rounded text-slate-300 hover:bg-white/8 border border-white/10 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
        >
          {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onPause();
          }}
          className="min-h-[44px] lg:min-h-0 px-2.5 py-1 rounded text-[11px] sm:text-xs font-medium text-slate-300 hover:bg-white/8 border border-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Menu
        </button>
      </nav>
    </header>
  );
};
