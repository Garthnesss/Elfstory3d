import React from 'react';
import { TutorialStep } from '../game/tutorial';

interface TutorialOverlayProps {
  step: TutorialStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
}

/**
 * First-run coach-mark card (Phase 2). Non-blocking: only the card itself
 * takes pointer events, the canvas stays fully playable underneath. Steps
 * auto-advance when the coached action is performed; Next always works too.
 */
export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onSkip,
}) => {
  const isLast = stepIndex >= totalSteps - 1;
  return (
    <div className="absolute bottom-24 sm:bottom-5 left-1/2 -translate-x-1/2 z-30 w-[min(92vw,440px)]">
      <div className="rounded-lg border border-sky-400/40 bg-[#0D1420]/95 backdrop-blur-sm shadow-2xl px-4 py-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono-glyph tracking-widest text-sky-300">
            GUIDE · {stepIndex + 1}/{totalSteps}
          </span>
          <button
            type="button"
            onClick={onSkip}
            className="text-[11px] text-slate-400 hover:text-white underline underline-offset-4 cursor-pointer"
          >
            Skip tutorial
          </button>
        </div>
        <div className="font-display text-sm font-bold text-[#ECE4D4]">{step.title}</div>
        <p className="text-xs text-slate-300 leading-relaxed">{step.body}</p>
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <span className="text-[10px] text-slate-500">Do it now, or just move on —</span>
          <button
            type="button"
            onClick={onNext}
            className="min-h-[36px] px-4 py-1.5 rounded bg-sky-500 hover:bg-sky-400 text-[#0B0D12] font-semibold text-xs cursor-pointer"
          >
            {isLast ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};
