import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { ScrollText, SlidersHorizontal, Trash2, Trophy } from 'lucide-react';
import { CloudSaveSummary, SAVE_SLOTS } from '../game/cloudSave';
import { DIFFICULTY_INFO, DIFFICULTY_ORDER, DifficultyTier } from '../game/difficulty';
import { SlotIssue } from '../game/saveSlots';
import { PlayerState, SaveSlotId } from '../game/types';
import titleBackdrop from '../assets/images/title_crypt_backdrop_1794536484639.jpg';

export interface LocalSlotSummary {
  slotId: SaveSlotId;
  starterClass: PlayerState['starterClass'];
  level: number;
  zoneName: string;
  buildTitle: string;
  kills: number;
  updatedAtMs?: number;
  /** Phase 4: set when the run has reached the ending (completion stamp). */
  completedAtMs?: number;
  /** Phase 4: the run's difficulty tier. */
  difficulty?: DifficultyTier;
  /** Phase 5: the run's NG+ ascension cycle (absent => 0). */
  ngPlusCycle?: number;
  /** Phase 5: whether the run is hardcore (permadeath). */
  hardcore?: boolean;
  /** Phase 5: epoch ms of a hardcore run's final death — set means the
   *  slot is fallen: rendered as fallen, Load disabled, Delete works. */
  deadAtMs?: number;
  /** Phase 5: short death note (floor / zone) for the fallen line. */
  deathNote?: string;
}

interface TitleScreenProps {
  activeSlot: SaveSlotId;
  onSelectSlot: (slotId: SaveSlotId) => void;
  localSlots: Partial<Record<SaveSlotId, LocalSlotSummary>>;
  cloudSlots: Partial<Record<SaveSlotId, CloudSaveSummary>>;
  /** Phase 4: slots whose local save exists but cannot be loaded
   *  (corrupt JSON or a newer save format). Rendered in place of a
   *  summary; the slot's delete action still works. */
  slotIssues?: Partial<Record<SaveSlotId, SlotIssue>>;
  chronicleCount: number;
  authUser: User | null;
  authBusy: boolean;
  authError: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onStartNew: (
    starterClass: PlayerState['starterClass'],
    slotId: SaveSlotId,
    difficulty: DifficultyTier,
    hardcore: boolean
  ) => void;
  onContinueLocal: (slotId: SaveSlotId) => void;
  onContinueCloud: (slotId: SaveSlotId) => void;
  onDeleteSlot: (slotId: SaveSlotId) => void;
  onOpenHallOfFame: () => void;
  onOpenSettings: () => void;
  onOpenCredits: () => void;
  blockKeys?: boolean;
  /** Phase 6: a gamepad is connected — the control hint line says so. */
  gamepadConnected?: boolean;
}

const STARTER_CLASSES: Array<{
  id: PlayerState['starterClass'];
  name: string;
  glyph: string;
  focus: string;
  stats: string;
  lore: string;
}> = [
  {
    id: 'Vanguard',
    name: 'Vanguard',
    glyph: '⚔',
    focus: 'Sundering Cleave & Iron Guard',
    stats: 'Might 3 · Resolve 2 · Agility 1 · Arcana 1 · Starts with Shielding Rune',
    lore: 'Once a bridge-warden of the Silverglades, Garth answers cinder-giants with broadsteel and unyielding poise.',
  },
  {
    id: 'Shadowcraft',
    name: 'Shadowcraft',
    glyph: '◈',
    focus: 'Shadowstep Ambush & Precision Crit',
    stats: 'Agility 3 · Resolve 2 · Might 1 · Arcana 1 · Starts with Phase Door Rune',
    lore: 'Trained among elven night-scouts, Garth slips through shadow seams and spots hidden traps long before they spring.',
  },
  {
    id: 'Runecaster',
    name: 'Runecaster',
    glyph: '🜂',
    focus: 'Ember Lance & Arcane Mastery',
    stats: 'Arcana 3 · Resolve 2 · Might 1 · Agility 1 · Starts with Shielding + Phase Runes',
    lore: 'An exiled scholar of the Ashen Glyph, Garth bends ancient sigils into piercing fire and frost wards.',
  },
  {
    id: 'Wanderer',
    name: 'Wanderer',
    glyph: '➶',
    focus: 'Balanced Hybrid & Viper Edge',
    stats: 'Might 2 · Agility 2 · Arcana 2 · Resolve 1 · Balanced Inscription Kit',
    lore: 'A seasoned frontier ranger who mixes venom-tipped darts, wild infusions, and quick steel as the ruin demands.',
  },
];

const SLOT_LABELS: Record<SaveSlotId, string> = {
  slot_1: 'Slot 1',
  slot_2: 'Slot 2',
  slot_3: 'Slot 3',
};

export const TitleScreen: React.FC<TitleScreenProps> = ({
  activeSlot,
  onSelectSlot,
  localSlots,
  cloudSlots,
  slotIssues,
  chronicleCount,
  authUser,
  authBusy,
  authError,
  onSignIn,
  onSignOut,
  onStartNew,
  onContinueLocal,
  onContinueCloud,
  onDeleteSlot,
  onOpenHallOfFame,
  onOpenSettings,
  onOpenCredits,
  blockKeys = false,
  gamepadConnected = false,
}) => {
  const [selectedClass, setSelectedClass] = useState<PlayerState['starterClass']>('Vanguard');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyTier>('standard');
  const [hardcore, setHardcore] = useState(false);
  const [imgError, setImgError] = useState(false);

  const selectedCloud = cloudSlots[activeSlot];
  const selectedLocal = localSlots[activeSlot];
  // Phase 5: a fallen hardcore run can never be loaded again.
  const selectedCloudFallen = selectedCloud?.deadAtMs != null;
  const selectedLocalFallen = selectedLocal?.deadAtMs != null;

  // NOTE: No Enter/Space keyboard shortcut here on purpose. It previously
  // auto-started a New Adventure over whatever save occupied the selected
  // slot — a stray keypress could destroy a run. Starting fresh is a
  // deliberate button click only, and App.tsx additionally confirms when
  // the target slot is occupied.

  return (
    <div className="relative w-screen h-[100dvh] overflow-y-auto rpg-scroll bg-[#090B10] text-[#ECE4D4]">
      {/* Key-Art Atmospheric Backdrop */}
      {!imgError ? (
        <img
          src={titleBackdrop}
          alt="Stone archway descending into the Sunken Citadel"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="fixed inset-0 w-full h-full object-cover object-center opacity-85 pointer-events-none"
        />
      ) : (
        <div className="fixed inset-0 bg-gradient-to-br from-[#161922] via-[#0B0D12] to-[#1C1410] pointer-events-none" />
      )}

      {/* Measured Scrim */}
      <div className="fixed inset-0 bg-gradient-to-r from-[#07090D]/95 via-[#07090D]/80 to-[#07090D]/35 pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-t from-[#07090D]/90 via-transparent to-[#07090D]/55 pointer-events-none" />

      <div className="relative z-10 min-h-full max-w-6xl mx-auto px-4 sm:px-8 md:px-14 py-5 sm:py-8 flex flex-col justify-between gap-4">
        {/* Top Row: Realm Crest, Hall of Fame & Optional Google Cloud Account */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 text-xs font-mono-glyph text-amber-400/80 tracking-widest">
            <span>◈</span>
            <span>THE SUNKEN CITADEL · FULL 3D</span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={onOpenHallOfFame}
              className="min-h-[44px] px-3 py-1.5 rounded border border-amber-400/35 bg-[#11151E]/90 hover:border-amber-400/70 text-amber-200 font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Hall of Fame{chronicleCount > 0 ? ` (${chronicleCount})` : ''}</span>
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              className="min-h-[44px] px-3 py-1.5 rounded border border-white/15 bg-[#11151E]/90 hover:border-amber-400/50 text-[#ECE4D4] font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>

            <button
              type="button"
              onClick={onOpenCredits}
              className="min-h-[44px] px-3 py-1.5 rounded border border-white/15 bg-[#11151E]/90 hover:border-amber-400/50 text-[#ECE4D4] font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <ScrollText className="w-3.5 h-3.5" />
              <span>Credits</span>
            </button>

            {authUser ? (
              <>
                <span className="text-slate-300 hidden sm:inline">
                  <span className="text-amber-200 font-medium">{authUser.displayName ?? 'Adventurer'}</span>
                </span>
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={onSignOut}
                  className="min-h-[44px] px-2 text-slate-400 hover:text-white underline underline-offset-4 cursor-pointer"
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={authBusy}
                onClick={onSignIn}
                className="min-h-[44px] px-3.5 py-1.5 rounded border border-white/15 bg-[#11151E]/90 hover:border-amber-400/50 text-[#ECE4D4] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {authBusy ? 'Connecting...' : 'Sign in with Google'}
              </button>
            )}
          </div>
        </div>

        {/* Center Content: Left Title + Class Selection | Right Character Save Slots */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end my-auto py-4">
          <div className="lg:col-span-7 space-y-5">
            <div className="space-y-2.5">
              <svg
                viewBox="0 0 380 84"
                className="w-full max-w-[350px] h-auto"
                role="img"
                aria-label="ElfStory"
              >
                <defs>
                  <linearGradient id="glyphGold" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#F5E6C8" />
                    <stop offset="55%" stopColor="#E5A93B" />
                    <stop offset="100%" stopColor="#B8731E" />
                  </linearGradient>
                </defs>
                <g fill="none" stroke="url(#glyphGold)" strokeWidth="1.4" opacity="0.8">
                  <polygon points="24,14 40,42 24,70 8,42" />
                  <circle cx="24" cy="42" r="6" />
                  <line x1="24" y1="6" x2="24" y2="20" />
                  <line x1="24" y1="64" x2="24" y2="78" />
                </g>
                <text
                  x="56"
                  y="51"
                  fill="url(#glyphGold)"
                  fontFamily="Cinzel, Georgia, serif"
                  fontWeight="700"
                  fontSize="42"
                  letterSpacing="3.5"
                >
                  ELFSTORY
                </text>
                <line x1="56" y1="64" x2="328" y2="64" stroke="#D99B26" strokeOpacity="0.4" strokeWidth="1" />
              </svg>

              <p className="text-sm text-[#D6CEBE] leading-relaxed max-w-lg">
                An elven outrider drawn south by the awakening of the Ashen Glyph, <span className="text-amber-200 font-medium">Garth &ldquo;Big Dick&rdquo; Elfstrom</span> descends
                beneath Oakhaven Outpost and Highspire Citadel. Read enemy windups, inscribe cooldown Runes &amp; Infusions,
                claim Milestone Prodigies, and confront Sovereign Malakor.
              </p>
            </div>

            {/* Starting Path Selector */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-amber-200/80">
                Choose Garth’s Starting Discipline (All skill branches remain freely combinable)
              </div>
              <div className="grid grid-cols-2 gap-2.5 max-w-lg">
                {STARTER_CLASSES.map((cls) => {
                  const active = selectedClass === cls.id;
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => setSelectedClass(cls.id)}
                      className={`text-left px-3.5 py-2.5 rounded border transition-colors cursor-pointer ${
                        active
                          ? 'border-amber-400/70 bg-amber-500/12 text-[#FDF6E3]'
                          : 'border-white/10 bg-[#11151E]/80 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{cls.name}</span>
                        <span className="font-mono-glyph text-amber-300 text-sm">{cls.glyph}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate">{cls.focus}</div>
                    </button>
                  );
                })}
              </div>
              <div className="max-w-lg space-y-1 pt-0.5">
                <div className="text-xs text-slate-300 leading-snug">
                  {STARTER_CLASSES.find((c) => c.id === selectedClass)?.lore}
                </div>
                <div className="text-[11px] font-mono-glyph text-amber-300/85">
                  {STARTER_CLASSES.find((c) => c.id === selectedClass)?.stats}
                </div>
              </div>
            </div>

            {/* Difficulty Selector (Phase 4) */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-amber-200/80">Difficulty</div>
              <div className="grid grid-cols-3 gap-2.5 max-w-lg">
                {DIFFICULTY_ORDER.map((tier) => {
                  const active = selectedDifficulty === tier;
                  return (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setSelectedDifficulty(tier)}
                      aria-pressed={active}
                      className={`min-h-[44px] px-3 py-2 rounded border text-sm font-semibold transition-colors cursor-pointer ${
                        active
                          ? 'border-amber-400/70 bg-amber-500/12 text-[#FDF6E3]'
                          : 'border-white/10 bg-[#11151E]/80 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      {DIFFICULTY_INFO[tier].label}
                    </button>
                  );
                })}
              </div>
              <div className="max-w-lg text-[11px] text-slate-400 leading-snug">
                {DIFFICULTY_INFO[selectedDifficulty].blurb} Changeable later in Settings — a
                change applies to newly encountered foes, not ones already spawned.
              </div>
            </div>

            {/* Hardcore Toggle (Phase 5) — set at run creation only */}
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setHardcore((v) => !v)}
                aria-pressed={hardcore}
                className={`min-h-[44px] w-full max-w-lg px-3.5 py-2.5 rounded border text-left transition-colors cursor-pointer ${
                  hardcore
                    ? 'border-rose-400/70 bg-rose-500/12 text-[#FDF6E3]'
                    : 'border-white/10 bg-[#11151E]/80 text-slate-300 hover:border-white/25'
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">Hardcore — death is final</span>
                  <span
                    className={`text-[11px] font-mono-glyph font-bold ${
                      hardcore ? 'text-rose-300' : 'text-slate-500'
                    }`}
                  >
                    {hardcore ? 'ON' : 'OFF'}
                  </span>
                </span>
                <span className="block text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Permadeath: if Garth falls, the run ends forever — the slot is marked fallen
                  and can never be loaded again. Chosen now, at creation; it cannot be changed
                  mid-run.
                </span>
              </button>
            </div>

            {authError && <div className="text-xs text-rose-300">{authError}</div>}

            {/* Primary CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onStartNew(selectedClass, activeSlot, selectedDifficulty, hardcore)}
                className="min-h-[44px] px-6 py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-[#0B0D12] font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {selectedLocal || selectedCloud
                  ? `New Adventure in ${SLOT_LABELS[activeSlot]}`
                  : `Start Adventure (${SLOT_LABELS[activeSlot]})`}
              </button>

              {selectedCloud && !selectedCloudFallen && (
                <button
                  type="button"
                  onClick={() => onContinueCloud(activeSlot)}
                  className="min-h-[44px] px-4 py-2.5 rounded border border-sky-400/50 bg-[#111A29]/90 hover:bg-[#18253A] text-sky-100 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Load Cloud ({SLOT_LABELS[activeSlot]})
                </button>
              )}

              {selectedLocal && !selectedLocalFallen && (
                <button
                  type="button"
                  onClick={() => onContinueLocal(activeSlot)}
                  className="min-h-[44px] px-4 py-2.5 rounded border border-amber-400/40 bg-[#121620]/90 hover:bg-[#19202E] text-amber-100 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Load Local ({SLOT_LABELS[activeSlot]})
                </button>
              )}
            </div>
          </div>

          {/* 3 Character Save Slots */}
          <div className="lg:col-span-5 space-y-2.5 bg-[#0D1018]/85 border border-white/12 rounded-md p-4">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-semibold text-amber-200">
                Expedition Save Slots
              </span>
              <span className="text-[11px] text-slate-400">
                {authUser ? 'Cloud + Local' : 'Browser Local'}
              </span>
            </div>

            <div className="space-y-2">
              {SAVE_SLOTS.map((slotId) => {
                const cloud = cloudSlots[slotId];
                const local = localSlots[slotId];
                const primary = cloud ?? local;
                // Phase 5: fallen hardcore runs render as fallen and lose
                // their Load buttons (Delete still works).
                const cloudFallen = cloud?.deadAtMs != null;
                const localFallen = local?.deadAtMs != null;
                const primaryFallen = primary?.deadAtMs != null;
                const isSelected = activeSlot === slotId;
                // Phase 4: a local save that exists but cannot be loaded
                // (corrupt / newer format) shows its issue in place of a
                // summary — unless a loadable local or cloud save exists.
                const issue = !local ? slotIssues?.[slotId] : undefined;

                return (
                  <div
                    key={slotId}
                    onClick={() => onSelectSlot(slotId)}
                    className={`p-3 rounded border transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-amber-400/70 bg-amber-500/10'
                        : 'border-white/10 bg-[#121620]/90 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono-glyph text-xs font-bold text-amber-300 shrink-0">
                          {SLOT_LABELS[slotId]}
                        </span>
                        {primary ? (
                          primaryFallen ? (
                            <span className="text-sm font-semibold text-rose-300 truncate">
                              ☠ Fallen
                            </span>
                          ) : (
                            <span className="text-sm font-semibold text-[#ECE4D4] truncate">
                              {primary.buildTitle}
                            </span>
                          )
                        ) : issue ? (
                          <span className="text-xs font-semibold text-rose-300">
                            {issue.kind === 'corrupt' ? 'Save Corrupted' : 'Newer Save Format'}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">Empty Slot</span>
                        )}
                        {primary?.completedAtMs != null && (
                          <span className="shrink-0 text-[11px] font-semibold text-amber-300">
                            ✦ Completed
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {cloud && !cloudFallen && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onContinueCloud(slotId);
                            }}
                            className="min-h-[44px] px-3 py-1 rounded text-xs font-medium border border-sky-400/40 bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 cursor-pointer"
                          >
                            Cloud
                          </button>
                        )}
                        {local && !localFallen && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onContinueLocal(slotId);
                            }}
                            className="min-h-[44px] px-3 py-1 rounded text-xs font-medium border border-amber-400/40 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 cursor-pointer"
                          >
                            Local
                          </button>
                        )}
                        {issue && !local && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onContinueLocal(slotId);
                            }}
                            className="min-h-[44px] px-3 py-1 rounded text-xs font-medium border border-rose-400/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-200 cursor-pointer"
                          >
                            Load
                          </button>
                        )}
                        {(local || cloud || issue) && (
                          <button
                            type="button"
                            aria-label={`Delete ${SLOT_LABELS[slotId]}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSlot(slotId);
                            }}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded text-slate-400 hover:text-rose-300 hover:bg-white/10 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {primary && primaryFallen && (
                      <div className="text-[11px] font-mono-glyph text-rose-200/85 mt-1 truncate tabular-nums">
                        ☠ Fallen — Cycle {primary.ngPlusCycle ?? 0}
                        {primary.deathNote ? ` · ${primary.deathNote}` : ''} · Lv {primary.level}{' '}
                        {primary.starterClass} · Hardcore
                      </div>
                    )}
                    {primary && !primaryFallen && (
                      <div className="text-[11px] font-mono-glyph text-slate-400 mt-1 truncate tabular-nums">
                        Lv {primary.level} · {primary.starterClass} · {primary.zoneName} · {primary.kills} Slain
                        {local && primary === local && local.difficulty
                          ? ` · ${DIFFICULTY_INFO[local.difficulty].label}`
                          : ''}
                        {(primary.ngPlusCycle ?? 0) > 0 ? ` · Cycle ${primary.ngPlusCycle}` : ''}
                        {primary.hardcore ? ' · Hardcore' : ''}
                      </div>
                    )}
                    {issue && !primary && (
                      <div className="text-[11px] text-rose-200/80 mt-1 leading-snug">
                        {issue.message}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Single Flat Control Hint Line */}
        <div className="text-xs font-mono-glyph text-slate-400">
          Desktop: WASD / Arrows · Click Tile · 1–5 Skills · 6–8 Runes · Z Explore · ? Guide · Phone: Swipe / D-Pad · Look · Map
          {gamepadConnected ? ' · 🎮 Gamepad' : ''}
        </div>
      </div>
    </div>
  );
};
