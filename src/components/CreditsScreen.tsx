import React, { useEffect } from 'react';

interface CreditsScreenProps {
  onClose: () => void;
}

const CREDITS: Array<{ role: string; names: string[] }> = [
  { role: 'Game design & code', names: ['Garth Elfstrom'] },
  { role: 'Development, balancing & QA assistance', names: ['Muse'] },
  { role: 'Music & sound', names: ['Procedural Web Audio, generated in your browser'] },
  { role: 'Portraits & backdrop', names: ['Bundled game art'] },
];

/**
 * Phase 4 credits roll: a slow auto-scrolling overlay (CSS animation),
 * dismissible at any time with any key or a click. Reachable from the
 * Title Screen and from the Ending Screen.
 */
export const CreditsScreen: React.FC<CreditsScreenProps> = ({ onClose }) => {
  useEffect(() => {
    const onKey = () => onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/92 flex items-stretch justify-center cursor-pointer overflow-hidden"
      onClick={onClose}
      role="dialog"
      aria-label="Credits"
    >
      <style>{`
        @keyframes elfstory-credits-roll {
          from { transform: translateY(58vh); }
          to { transform: translateY(-105%); }
        }
        .elfstory-credits-scroll {
          animation: elfstory-credits-roll 32s linear forwards;
        }
      `}</style>
      <div className="elfstory-credits-scroll w-full max-w-lg px-6 text-center space-y-14 py-8">
        <div className="space-y-2">
          <div className="font-display text-4xl font-bold tracking-[0.2em] text-amber-300">
            ELFSTORY
          </div>
          <div className="text-sm text-slate-400">The Sunken Citadel</div>
        </div>

        {CREDITS.map((block) => (
          <div key={block.role} className="space-y-2">
            <div className="text-[11px] font-mono-glyph tracking-[0.25em] text-slate-400 uppercase">
              {block.role}
            </div>
            {block.names.map((name) => (
              <div key={name} className="text-base text-[#ECE4D4]">
                {name}
              </div>
            ))}
          </div>
        ))}

        <div className="space-y-2 text-sm leading-relaxed text-slate-300">
          <p>
            With thanks to the friends and playtesters of the Vale — every
            descent is better for your lantern-light.
          </p>
          <p className="text-[#ECE4D4]">Thanks for playing.</p>
        </div>
      </div>
      <div className="absolute bottom-4 inset-x-0 text-center text-[11px] font-mono-glyph text-slate-500">
        Click or press any key to close
      </div>
    </div>
  );
};
