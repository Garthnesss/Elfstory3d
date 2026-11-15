import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export interface SpecialPrompt {
  title: string;
  subtitle: string;
  body: string;
  options: Array<{
    id: string;
    label: string;
    disabled?: boolean;
    tone?: 'primary' | 'secondary' | 'danger';
    onSelect: () => void;
  }>;
}

interface SpecialEncounterModalProps {
  prompt: SpecialPrompt;
  onClose: () => void;
}

export const SpecialEncounterModal: React.FC<SpecialEncounterModalProps> = ({
  prompt,
  onClose,
}) => {
  const firstEnabled = Math.max(
    0,
    prompt.options.findIndex((o) => !o.disabled)
  );
  const [selectedIdx, setSelectedIdx] = useState(firstEnabled);

  useEffect(() => {
    const idx = Math.max(
      0,
      prompt.options.findIndex((o) => !o.disabled)
    );
    setSelectedIdx(idx);
  }, [prompt]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const enabledIndices = prompt.options
        .map((o, i) => (o.disabled ? -1 : i))
        .filter((i) => i >= 0);
      if (enabledIndices.length === 0) return;

      const key = e.key.toLowerCase();
      if (e.key === 'ArrowDown' || key === 's') {
        e.preventDefault();
        const curPos = enabledIndices.indexOf(selectedIdx);
        const nextPos = curPos >= 0 ? (curPos + 1) % enabledIndices.length : 0;
        setSelectedIdx(enabledIndices[nextPos]);
      } else if (e.key === 'ArrowUp' || key === 'w') {
        e.preventDefault();
        const curPos = enabledIndices.indexOf(selectedIdx);
        const prevPos =
          curPos >= 0
            ? (curPos - 1 + enabledIndices.length) % enabledIndices.length
            : 0;
        setSelectedIdx(enabledIndices[prevPos]);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const opt = prompt.options[selectedIdx];
        if (opt && !opt.disabled) opt.onSelect();
      } else if (key >= '1' && key <= '9') {
        const idx = Number(key) - 1;
        const opt = prompt.options[idx];
        if (opt && !opt.disabled) {
          e.preventDefault();
          opt.onSelect();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [prompt.options, selectedIdx]);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-lg rounded-md border border-amber-500/30 bg-[#10141D] shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-amber-200">{prompt.title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{prompt.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close encounter prompt"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto rpg-scroll">
          <p className="text-sm text-[#ECE4D4] leading-relaxed">{prompt.body}</p>
          <div className="space-y-2">
            {prompt.options.map((opt, idx) => {
              const isSelected = idx === selectedIdx && !opt.disabled;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={opt.disabled}
                  onMouseEnter={() => !opt.disabled && setSelectedIdx(idx)}
                  onClick={opt.onSelect}
                  className={`min-h-[44px] w-full text-left px-4 py-2.5 rounded text-sm font-medium transition-colors cursor-pointer disabled:opacity-45 flex items-center justify-between gap-2 ${
                    opt.tone === 'primary'
                      ? 'bg-amber-500 text-[#0B0D12] hover:bg-amber-400'
                      : opt.tone === 'danger'
                        ? 'border border-rose-500/50 bg-rose-950/30 text-rose-200 hover:bg-rose-900/40'
                        : 'border border-white/15 bg-[#161B26] text-[#ECE4D4] hover:border-amber-400/50'
                  } ${isSelected ? 'ring-2 ring-amber-300/75' : ''}`}
                >
                  <span>
                    <span className="font-mono-glyph text-xs opacity-70 mr-2">{idx + 1}.</span>
                    {opt.label}
                  </span>
                  {isSelected && (
                    <span className="hidden sm:inline font-mono-glyph text-[10px] opacity-80 shrink-0">
                      [Enter]
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
