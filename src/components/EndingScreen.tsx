import React from 'react';
import { DerivedStats, PlayerState, WorldFlags } from '../game/types';

interface EndingScreenProps {
  player: PlayerState;
  derived: DerivedStats;
  worldFlags: WorldFlags;
  /** Wall-clock duration of this expedition session, if tracked. */
  playTimeMs?: number | null;
  /** Phase 5: the NG+ cycle this victory was won on (0 = first descent). */
  ngPlusCycle?: number;
  /** Phase 5: begin New Game+ at cycle + 1 (optional, like onShowCredits). */
  onAscend?: () => void;
  onContinueAbyss: () => void;
  onOpenHallOfFame: () => void;
  /** Phase 4: open the credits roll (optional so older callers still work). */
  onShowCredits?: () => void;
  onPlayAgain: () => void;
  onReturnToTitle: () => void;
}

export function formatPlayTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  return `${seconds}s`;
}

/** Epilogue lines reflecting the run's major choices (Ledger, Blight, Bell). */
function epilogueLines(flags: WorldFlags): string[] {
  const lines: string[] = [
    'With Malakor unmade, the cinder-throne cools for the first time in an age. The Ember Blight gutters out. Somewhere far above, Oakhaven feels the change, looks around, and reluctantly concludes that Garth did it.',
  ];
  if (flags.bellChoice === 'attuned_lyra') {
    lines.push(
      'In Highspire, Archivist Lyra rings the attuned Whispering Bell once at dawn. Its note carries over the Vale: a ward renewed, a promise kept. She files your name under “Heroes (Unexpected).”'
    );
  } else if (flags.bellChoice === 'sold_corvus') {
    lines.push(
      'The Whispering Bell hangs silent in Magistrate Corvus’s vault. What he paid for it buys roads, roofs, and quiet. He sends you an invoice for the paperwork anyway.'
    );
  } else if (flags.bellChoice === 'shattered_self') {
    lines.push(
      'The Bell you shattered sings on inside you — a low cinder-hum beneath your heartbeat. You tell everyone it is the sound of destiny. It is mostly indigestion.'
    );
  }
  if (flags.caravanChoice === 'arrested_vex') {
    lines.push(
      'The Contraband Ledger, delivered to Warden Vance, closes the smuggler roads beneath Oakhaven. Vance shakes your hand, which he has never done, and immediately regrets it, which he has always done.'
    );
  } else if (flags.caravanChoice === 'smuggler_pact') {
    lines.push(
      'Your shadow pact with Vex the Quiet holds: certain doors in Oakhaven will never close to you again. Vex still won’t say your name out loud. Nobody can say it with a straight face.'
    );
  }
  if (flags.blightChoice === 'cantor_appeased') {
    lines.push(
      'Vaelen, the Bone Cantor, was laid to rest by words rather than steel. His last request was that you never sing. You have honoured it, mostly.'
    );
  } else if (flags.blightChoice === 'herbs_gathered') {
    lines.push(
      'Mira’s apothecary, restocked with Pale Nightbloom, tends the blight-sick of Oakhaven back to health. She names a wart cream after you. It sells well.'
    );
  }
  if (flags.malakorWeakened) {
    lines.push(
      'Those who study such things will note the Sovereign’s ward was broken before the final descent — and that you broke it. You will mention this at every dinner for the rest of your life.'
    );
  }
  lines.push(
    'But the stair below Floor 5 does not end. The Endless Abyss waits with its lanterns lit. The town would very much like you to go down there for a while.'
  );
  return lines;
}

export const EndingScreen: React.FC<EndingScreenProps> = ({
  player,
  derived,
  worldFlags,
  playTimeMs,
  ngPlusCycle = 0,
  onAscend,
  onContinueAbyss,
  onOpenHallOfFame,
  onShowCredits,
  onPlayAgain,
  onReturnToTitle,
}) => {
  const stats: Array<{ label: string; value: string }> = [
    { label: 'Level', value: String(player.level) },
    { label: 'Foes Slain', value: String(player.kills) },
    { label: 'Turns Taken', value: String(player.turnsElapsed) },
    { label: 'Gold Held', value: `${player.gold}g` },
  ];
  if (playTimeMs != null && playTimeMs > 0) {
    stats.push({ label: 'Expedition Time', value: formatPlayTime(playTimeMs) });
  }
  if (ngPlusCycle > 0) {
    stats.push({ label: 'Ascension Cycle', value: `Cycle ${ngPlusCycle}` });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-lg rounded-md border border-amber-500/40 bg-[#10141D] p-5 sm:p-7 shadow-2xl space-y-5 max-h-[92dvh] overflow-y-auto rpg-scroll">
        <div className="text-center space-y-1.5">
          <div className="text-[11px] font-mono-glyph tracking-[0.3em] text-amber-400/80">
            THE SOVEREIGN OF CINDER
          </div>
          <h2 className="font-display text-3xl font-bold text-amber-300">Malakor Vanquished</h2>
          <p className="text-xs font-mono-glyph text-slate-400">
            {player.name} · {derived.buildTitle}
          </p>
        </div>

        <div className="space-y-3 text-sm text-slate-300 leading-relaxed border-y border-white/10 py-4">
          {epilogueLines(worldFlags).map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>

        <div className="p-4 rounded border border-white/10 bg-[#141923] grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono-glyph">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-slate-400">{s.label}</div>
              <div className="text-[#ECE4D4] font-semibold mt-0.5 text-sm">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          {onAscend && (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={onAscend}
                className="min-h-[44px] w-full py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-[#0B0D12] font-semibold text-sm cursor-pointer"
              >
                Begin New Game+ — Cycle {ngPlusCycle + 1}
              </button>
              <p className="text-[11px] text-slate-400 leading-snug text-center">
                Keep your level, attributes, skills, equipment, gold, and companion. The world is
                remade fresh — and every cycle its foes grow stronger (+35% HP, +25% ATK, +20% XP
                per cycle).
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={onContinueAbyss}
            className={`min-h-[44px] w-full py-2.5 rounded font-semibold text-sm cursor-pointer ${
              onAscend
                ? 'border border-amber-400/50 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200'
                : 'bg-amber-500 hover:bg-amber-400 text-[#0B0D12]'
            }`}
          >
            Continue into the Endless Abyss
          </button>
          <button
            type="button"
            onClick={onOpenHallOfFame}
            className="min-h-[44px] w-full py-2.5 rounded border border-amber-400/35 bg-[#141923] hover:border-amber-400/60 text-amber-200 font-medium text-sm cursor-pointer"
          >
            Hall of Fame Chronicle
          </button>
          {onShowCredits && (
            <button
              type="button"
              onClick={onShowCredits}
              className="min-h-[44px] w-full py-2.5 rounded border border-white/12 bg-[#141923] hover:bg-white/8 text-slate-300 font-medium text-sm cursor-pointer"
            >
              Credits
            </button>
          )}
          <button
            type="button"
            onClick={onPlayAgain}
            className="min-h-[44px] w-full py-2.5 rounded border border-amber-400/50 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 font-semibold text-sm cursor-pointer"
          >
            Play Again
          </button>
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
