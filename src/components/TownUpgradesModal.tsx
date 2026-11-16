import React from 'react';
import { Hammer, X } from 'lucide-react';
import { TOWN_UPGRADE_DEFS } from '../game/codex';
import { PlayerState, WorldFlags } from '../game/types';

interface TownUpgradesModalProps {
  player: PlayerState;
  worldFlags: WorldFlags;
  onPurchaseUpgrade: (id: 'apothecary' | 'smithy' | 'watchtower') => void;
  onClose: () => void;
}

export const TownUpgradesModal: React.FC<TownUpgradesModalProps> = ({
  player,
  worldFlags,
  onPurchaseUpgrade,
  onClose,
}) => {
  const upgrades = worldFlags.townUpgrades ?? {
    apothecary: 0,
    smithy: 0,
    watchtower: 0,
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-2.5 sm:p-5">
      <div className="w-full max-w-3xl rounded-md border border-white/15 bg-[#10141D] shadow-2xl flex flex-col max-h-[90dvh]">
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-white/10 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-amber-200 flex items-center gap-2">
              <Hammer className="w-4 h-4 text-amber-300" />
              <span>Outpost &amp; Citadel Upgrades</span>
            </h2>
            <p className="text-xs text-slate-400 font-mono-glyph mt-0.5 tabular-nums">
              Purse: {player.gold} Gold
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close town upgrades"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto rpg-scroll p-4 sm:p-6 space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Invest Gold into realm infrastructure across all four sanctuaries (Oakhaven, Thornwick Fen, Cinderwatch Bastion, and Highspire Citadel). Permanent upgrades empower every expedition across Silverwood Vale and the Abyss.
          </p>

          <div className="space-y-3">
            {TOWN_UPGRADE_DEFS.map((def) => {
              const curLv = upgrades[def.id] ?? 0;
              const isMax = curLv >= def.maxLevel;
              const nextSpec = !isMax ? def.levels[curLv] : null;
              const canAfford = Boolean(
                nextSpec && player.gold >= nextSpec.gold
              );

              return (
                <div
                  key={def.id}
                  className="p-4 rounded border border-white/12 bg-[#141923] space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono-glyph text-lg text-amber-300">{def.glyph}</span>
                      <div>
                        <div className="font-display text-sm sm:text-base font-bold text-[#ECE4D4]">
                          {def.name}
                        </div>
                        <div className="text-xs text-slate-400">{def.summary}</div>
                      </div>
                    </div>
                    <span className="font-mono-glyph text-xs font-semibold text-amber-300 tabular-nums shrink-0">
                      Tier {curLv}/{def.maxLevel}
                    </span>
                  </div>

                  <div className="space-y-1.5 border-t border-white/8 pt-2.5">
                    {def.levels.map((lvl, idx) => {
                      const unlocked = curLv > idx;
                      const isNext = curLv === idx;
                      return (
                        <div
                          key={idx}
                          className={`text-xs px-2.5 py-1.5 rounded border ${
                            unlocked
                              ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
                              : isNext
                                ? 'border-amber-500/30 bg-[#182030] text-slate-200'
                                : 'border-white/8 bg-[#10141D] text-slate-500'
                          }`}
                        >
                          <span className="font-semibold mr-1.5">
                            {unlocked ? '[Active]' : isNext ? '[Next]' : '[Locked]'}
                          </span>
                          {lvl.benefit}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end">
                    {isMax ? (
                      <div className="min-h-[44px] px-4 flex items-center text-xs font-mono-glyph font-semibold text-emerald-300">
                        Fully Constructed
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => onPurchaseUpgrade(def.id)}
                        className="min-h-[44px] px-4 py-2 rounded text-xs font-semibold bg-amber-500 text-[#0B0D12] hover:bg-amber-400 disabled:bg-white/10 disabled:text-slate-500 cursor-pointer font-mono-glyph tabular-nums"
                      >
                        Fund Tier {curLv + 1} ({nextSpec!.gold}g)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
