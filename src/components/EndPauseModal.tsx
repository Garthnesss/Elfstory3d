import React, { useEffect } from 'react';
import { User } from 'firebase/auth';
import { DerivedStats, GameState, PlayerState, SaveSlotId } from '../game/types';

interface EndPauseModalProps {
  mode: Extract<GameState, 'PAUSED' | 'VICTORY' | 'GAME_OVER'>;
  activeSlot: SaveSlotId;
  player: PlayerState;
  derived: DerivedStats;
  /** Phase 4: current run difficulty label (e.g. 'Standard'), shown in the
   *  stats grid so the tier is visible without opening Settings. */
  difficultyLabel?: string;
  /** Phase 5: current NG+ ascension cycle (shown when > 0). */
  ngPlusCycle?: number;
  /** Phase 5: whether this run is hardcore (permadeath). */
  hardcore?: boolean;
  authUser: User | null;
  cloudBusy: boolean;
  onSignIn: () => void;
  onResume: () => void;
  onSaveRun: () => void;
  onOpenHallOfFame: () => void;
  onPlayAgain: () => void;
  onReturnToTitle: () => void;
  /** Phase 2: settings are reachable from the pause menu too. */
  onOpenSettings?: () => void;
  /** Phase 7: when this run has already felled Malakor, the pause menu
   *  offers a way back to the Ending Screen — and its New Game+ ascend —
   *  which a save/reload after victory would otherwise strand. */
  canReturnToEnding?: boolean;
  onReturnToEnding?: () => void;
}

const SLOT_LABEL: Record<SaveSlotId, string> = {
  slot_1: 'Slot 1',
  slot_2: 'Slot 2',
  slot_3: 'Slot 3',
};

export const EndPauseModal: React.FC<EndPauseModalProps> = ({
  mode,
  activeSlot,
  player,
  derived,
  difficultyLabel,
  ngPlusCycle = 0,
  hardcore = false,
  authUser,
  cloudBusy,
  onSignIn,
  onResume,
  onSaveRun,
  onOpenHallOfFame,
  onPlayAgain,
  onReturnToTitle,
  onOpenSettings,
  canReturnToEnding = false,
  onReturnToEnding,
}) => {
  const title =
    mode === 'VICTORY'
      ? 'Sovereign Vanquished'
      : mode === 'GAME_OVER'
        ? 'Fallen in the Vaults'
        : 'Expedition Paused';

  const subtitle =
    mode === 'VICTORY'
      ? 'Malakor’s cinder crown has shattered. You may descend Floor 5’s Abyssal Stair into the Endless Abyss—or start a fresh build.'
      : mode === 'GAME_OVER'
        ? hardcore
          ? 'Your lantern fades among the cold stones — and in Hardcore, it does not rekindle. This run is etched into the Chronicle as fallen, forever.'
          : 'Your lantern fades among the cold stones, though every delve teaches a sharper build.'
        : authUser
          ? `Saving to ${SLOT_LABEL[activeSlot]} in Cloud (${authUser.displayName ?? 'Google'}) & browser.`
          : `Saving locally to ${SLOT_LABEL[activeSlot]}. Sign in with Google to sync runs to the cloud.`;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (document.activeElement instanceof HTMLButtonElement) return;
      // GAME_OVER deliberately has no keyboard shortcut to Play Again:
      // restarting discards the slot's saved run, so it requires an
      // explicit click (and App.tsx confirms if the slot is occupied).
      if (mode === 'GAME_OVER') return;
      e.preventDefault();
      onResume();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, onPlayAgain, onResume]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-md rounded-md border border-amber-500/30 bg-[#10141D] p-5 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 max-h-[90dvh] overflow-y-auto rpg-scroll">
        <div>
          <h2
            className={`font-display text-2xl font-bold ${
              mode === 'VICTORY'
                ? 'text-amber-300'
                : mode === 'GAME_OVER'
                  ? 'text-rose-400'
                  : 'text-[#ECE4D4]'
            }`}
          >
            {title}
          </h2>
          <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">{subtitle}</p>
        </div>

        <div className="p-4 rounded border border-white/10 bg-[#141923] grid grid-cols-2 gap-3 text-xs font-mono-glyph">
          <div>
            <div className="text-slate-400">{player.name}</div>
            <div className="text-amber-200 font-semibold mt-0.5">{derived.buildTitle}</div>
          </div>
          <div>
            <div className="text-slate-400">Level</div>
            <div className="text-[#ECE4D4] font-semibold mt-0.5">{player.level}</div>
          </div>
          <div>
            <div className="text-slate-400">Foes Slain</div>
            <div className="text-[#ECE4D4] font-semibold mt-0.5">{player.kills}</div>
          </div>
          <div>
            <div className="text-slate-400">Turns Taken</div>
            <div className="text-[#ECE4D4] font-semibold mt-0.5">{player.turnsElapsed}</div>
          </div>
          {difficultyLabel && (
            <div>
              <div className="text-slate-400">Difficulty</div>
              <div className="text-[#ECE4D4] font-semibold mt-0.5">{difficultyLabel}</div>
            </div>
          )}
          {ngPlusCycle > 0 && (
            <div>
              <div className="text-slate-400">Ascension Cycle</div>
              <div className="text-[#ECE4D4] font-semibold mt-0.5">Cycle {ngPlusCycle}</div>
            </div>
          )}
          {hardcore && (
            <div>
              <div className="text-slate-400">Mode</div>
              <div className="text-rose-300 font-semibold mt-0.5">Hardcore — death is final</div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          {mode === 'PAUSED' && (
            <>
              <button
                type="button"
                onClick={onResume}
                className="min-h-[44px] w-full py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-[#0B0D12] font-semibold text-sm cursor-pointer"
              >
                Resume
              </button>
              <button
                type="button"
                disabled={cloudBusy}
                onClick={onSaveRun}
                className="min-h-[44px] w-full py-2.5 rounded border border-white/15 bg-[#161B26] hover:border-amber-400/50 text-[#ECE4D4] font-medium text-sm cursor-pointer"
              >
                {cloudBusy
                  ? 'Saving...'
                  : authUser
                    ? `Save ${SLOT_LABEL[activeSlot]} (Cloud & Local)`
                    : `Save ${SLOT_LABEL[activeSlot]} Locally`}
              </button>
              {canReturnToEnding && onReturnToEnding && (
                <button
                  type="button"
                  onClick={onReturnToEnding}
                  className="min-h-[44px] w-full py-2.5 rounded border border-amber-400/50 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 font-semibold text-sm cursor-pointer"
                >
                  ✦ Return to the Ending
                </button>
              )}
              {!authUser && (
                <button
                  type="button"
                  disabled={cloudBusy}
                  onClick={onSignIn}
                  className="min-h-[44px] w-full py-2.5 rounded border border-sky-400/40 bg-[#111A29] hover:bg-[#18253A] text-sky-100 font-medium text-sm cursor-pointer"
                >
                  Sign in with Google for Cloud Saves
                </button>
              )}
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="min-h-[44px] w-full py-2.5 rounded border border-white/15 bg-[#161B26] hover:border-amber-400/50 text-[#ECE4D4] font-medium text-sm cursor-pointer"
                >
                  Settings
                </button>
              )}
            </>
          )}

          {mode === 'VICTORY' && (
            <button
              type="button"
              onClick={onResume}
              className="min-h-[44px] w-full py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-[#0B0D12] font-semibold text-sm cursor-pointer"
            >
              Descend to Endless Abyss
            </button>
          )}

          <button
            type="button"
            onClick={onOpenHallOfFame}
            className="min-h-[44px] w-full py-2.5 rounded border border-amber-400/35 bg-[#141923] hover:border-amber-400/60 text-amber-200 font-medium text-sm cursor-pointer"
          >
            Hall of Fame Chronicle
          </button>

          {(mode === 'GAME_OVER' || mode === 'VICTORY') && (
            <button
              type="button"
              onClick={onPlayAgain}
              className="min-h-[44px] w-full py-2.5 rounded border border-amber-400/50 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 font-semibold text-sm cursor-pointer"
            >
              Play Again
            </button>
          )}

          <button
            type="button"
            onClick={onReturnToTitle}
            className="min-h-[44px] w-full py-2.5 rounded border border-white/12 bg-[#141923] hover:bg-white/8 text-slate-300 font-medium text-sm cursor-pointer"
          >
            Return to Title
          </button>
        </div>
      </div>
    </div>
  );
};
