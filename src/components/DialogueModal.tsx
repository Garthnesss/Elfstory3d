import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ATTRIBUTE_META } from '../game/skills';
import { DialogueChoice, DialogueNode, NpcDef, PlayerState, QuestProgress, WorldFlags } from '../game/types';

interface DialogueModalProps {
  npc: NpcDef;
  node: DialogueNode;
  player: PlayerState;
  worldFlags: WorldFlags;
  quests: Record<string, QuestProgress>;
  onSelectChoice: (choice: DialogueChoice) => void;
  onClose: () => void;
}

export const DialogueModal: React.FC<DialogueModalProps> = ({
  npc,
  node,
  player,
  worldFlags,
  quests,
  onSelectChoice,
  onClose,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const isChoiceVisible = (choice: DialogueChoice): boolean => {
    const cond = choice.condition;
    if (!cond) return true;

    if (cond.flag !== undefined) {
      const val = worldFlags[cond.flag];
      if (cond.flagEquals !== undefined && val !== cond.flagEquals) return false;
      if (cond.flagEquals === undefined && !val) return false;
    }
    if (cond.notFlag !== undefined && worldFlags[cond.notFlag]) {
      return false;
    }
    if (cond.questId !== undefined) {
      const q = quests[cond.questId];
      if (cond.questStatus === undefined && q !== undefined) return false;
      if (cond.questStatus !== undefined && q?.status !== cond.questStatus) return false;
      if (cond.questMinStage !== undefined && (q?.stage ?? 0) < cond.questMinStage) return false;
      if (cond.questMaxStage !== undefined && (q?.stage ?? 0) > cond.questMaxStage) return false;
    }
    if (cond.hasItemTag !== undefined) {
      const has = player.inventory.some((i) => i.questTag === cond.hasItemTag);
      if (!has) return false;
    }
    if (cond.minGold !== undefined && player.gold < cond.minGold) {
      return false;
    }
    return true;
  };

  const visibleChoices = node.choices.filter(isChoiceVisible);
  const clampedIdx = visibleChoices.length > 0 ? Math.min(selectedIdx, visibleChoices.length - 1) : 0;

  useEffect(() => {
    setSelectedIdx(0);
  }, [npc.id, node.id]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (visibleChoices.length === 0) return;
      const key = e.key.toLowerCase();
      if (e.key === 'ArrowDown' || key === 's') {
        e.preventDefault();
        setSelectedIdx((prev) => (prev + 1) % visibleChoices.length);
      } else if (e.key === 'ArrowUp' || key === 'w') {
        e.preventDefault();
        setSelectedIdx((prev) => (prev - 1 + visibleChoices.length) % visibleChoices.length);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const choice = visibleChoices[clampedIdx];
        if (choice) onSelectChoice(choice);
      } else if (key >= '1' && key <= '9') {
        const idx = Number(key) - 1;
        if (visibleChoices[idx]) {
          e.preventDefault();
          onSelectChoice(visibleChoices[idx]);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [clampedIdx, onSelectChoice, visibleChoices]);

  return (
    <div className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-2.5 sm:p-6">
      <div className="w-full max-w-4xl rounded-md border border-amber-500/30 bg-[#10141D] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[92dvh] md:max-h-[86vh]">
        {/* Left Illustrated Portrait & Speaker Plate */}
        <aside className="md:w-72 shrink-0 bg-[#0B0E15] border-b md:border-b-0 md:border-r border-white/10 p-3.5 sm:p-5 flex flex-row md:flex-col items-center justify-between gap-3 sm:gap-4">
          <div className="flex flex-row md:flex-col items-center md:text-center gap-3 md:gap-3.5 md:w-full min-w-0">
            <div className="relative w-16 h-16 md:w-full md:h-auto md:aspect-square shrink-0 rounded border border-amber-500/25 bg-[#07090E] overflow-hidden shadow-inner">
              {npc.portraitUrl && !imgFailed ? (
                <img
                  src={npc.portraitUrl}
                  alt={`${npc.name}, ${npc.title}`}
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#161B26] to-[#080A0F] p-2 md:p-4">
                  <pre className="font-mono-glyph text-[8px] md:text-sm leading-snug select-none">
                    {npc.portrait.map((line, i) => (
                      <div key={i} style={{ color: line.color }}>
                        {line.text}
                      </div>
                    ))}
                  </pre>
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B0E15]/80 via-transparent to-transparent" />
            </div>

            <div className="min-w-0">
              <h2 className="font-display text-base md:text-lg font-bold text-amber-200 truncate">{npc.name}</h2>
              <p className="text-xs text-slate-400 mt-0.5 truncate">{npc.title}</p>
            </div>
          </div>

          <div className="hidden md:grid w-full pt-3 border-t border-white/10 text-xs text-slate-400 grid-cols-2 gap-x-4 gap-y-1 font-mono-glyph">
            <div className="flex justify-between">
              <span>Might</span>
              <span className="text-rose-300">{player.attributes.might}</span>
            </div>
            <div className="flex justify-between">
              <span>Agility</span>
              <span className="text-emerald-300">{player.attributes.agility}</span>
            </div>
            <div className="flex justify-between">
              <span>Arcana</span>
              <span className="text-sky-300">{player.attributes.arcana}</span>
            </div>
            <div className="flex justify-between">
              <span>Resolve</span>
              <span className="text-amber-300">{player.attributes.resolve}</span>
            </div>
          </div>
        </aside>

        {/* Right Narrative & Branching Choices */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 flex items-center justify-between">
            <span className="text-xs font-medium text-amber-300/90">
              {node.speakerName ?? npc.name}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialogue"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 sm:p-6 flex-1 overflow-y-auto rpg-scroll space-y-5">
            <p className="text-sm sm:text-base leading-relaxed text-[#ECE4D4]">{node.text}</p>

            <div className="space-y-2 pt-2 border-t border-white/10">
              {visibleChoices.map((choice, idx) => {
                const check = choice.check;
                const checkPasses = check ? player.attributes[check.attribute] >= check.threshold : true;
                const checkAttrName = check ? ATTRIBUTE_META[check.attribute].name : '';
                const isActive = idx === clampedIdx;

                return (
                  <button
                    key={choice.id}
                    type="button"
                    onMouseEnter={() => setSelectedIdx(idx)}
                    onClick={() => onSelectChoice(choice)}
                    className={`min-h-[44px] w-full text-left px-3.5 sm:px-4 py-3 rounded border transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                      isActive
                        ? 'border-amber-400/75 bg-[#1B2230]'
                        : 'border-white/12 bg-[#161B26] hover:border-amber-400/60 hover:bg-[#1B2230]'
                    }`}
                  >
                    <span className="text-sm text-[#ECE4D4]">
                      <span className="font-mono-glyph text-amber-400 mr-2">{idx + 1}.</span>
                      {choice.label}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {check && (
                        <span
                          className={`text-[11px] font-mono-glyph whitespace-nowrap ${
                            checkPasses ? 'text-emerald-300' : 'text-rose-300'
                          }`}
                        >
                          {checkAttrName} {player.attributes[check.attribute]}/{check.threshold}{' '}
                          {checkPasses ? '(Ready)' : '(Risky)'}
                        </span>
                      )}
                      {isActive && (
                        <span className="hidden sm:inline text-[10px] font-mono-glyph text-amber-300/80">
                          [Enter]
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
