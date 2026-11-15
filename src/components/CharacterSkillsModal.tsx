import React, { useState } from 'react';
import { X } from 'lucide-react';
import {
  ALL_PRODIGIES_LIST,
  ALL_SKILLS_LIST,
  ATTRIBUTE_META,
  BRANCH_META,
  canLearnProdigy,
  canLearnSkill,
  computeDerivedStats,
  getBranchInvestedPoints,
  hasProdigy,
  SKILLS,
} from '../game/skills';
import { AttributeKey, PlayerState, ProdigyId, SkillBranch, SkillId, WorldFlags } from '../game/types';

interface CharacterSkillsModalProps {
  player: PlayerState;
  worldFlags?: WorldFlags;
  onSpendAttribute: (attr: AttributeKey) => void;
  onLearnSkill: (skillId: SkillId) => void;
  onAssignHotbar: (skillId: SkillId, slotIdx: number) => void;
  onClaimProdigy: (prodigyId: ProdigyId) => void;
  onClose: () => void;
}

export const CharacterSkillsModal: React.FC<CharacterSkillsModalProps> = ({
  player,
  worldFlags,
  onSpendAttribute,
  onLearnSkill,
  onAssignHotbar,
  onClaimProdigy,
  onClose,
}) => {
  const [tab, setTab] = useState<'skills' | 'prodigies'>('skills');
  const derived = computeDerivedStats(player, worldFlags);
  const branches: SkillBranch[] = ['vanguard', 'shadowcraft', 'runecaster'];
  const attrs: AttributeKey[] = ['might', 'agility', 'arcana', 'resolve'];
  const prodigyPts = player.prodigyPoints ?? 0;

  return (
    <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-2.5 sm:p-5">
      <div className="w-full max-w-6xl rounded-md border border-white/15 bg-[#10141D] shadow-2xl flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-amber-200">
              {player.name} — Character & Skill Progression
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono-glyph tabular-nums">
              Level {player.level} · {derived.buildTitle} · XP {player.xp}/{player.xpToNext} ·{' '}
              <span className="text-amber-300 font-medium">
                {player.attributePoints} Attr · {player.skillPoints} Skill
                {prodigyPts > 0 ? ` · ${prodigyPts} Prodigy` : ''}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1 p-1 rounded bg-[#0A0D14] border border-white/10">
              <button
                type="button"
                onClick={() => setTab('skills')}
                className={`min-h-[44px] px-2.5 sm:px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                  tab === 'skills' ? 'bg-amber-500 text-[#0B0D12]' : 'text-slate-300 hover:text-white'
                }`}
              >
                Attributes & Skills
              </button>
              <button
                type="button"
                onClick={() => setTab('prodigies')}
                className={`min-h-[44px] px-2.5 sm:px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                  tab === 'prodigies'
                    ? 'bg-violet-500 text-[#0B0D12]'
                    : prodigyPts > 0
                      ? 'text-violet-300 hover:text-white'
                      : 'text-slate-300 hover:text-white'
                }`}
              >
                Prodigies{prodigyPts > 0 ? ` (${prodigyPts})` : ''}
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close character panel"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        {tab === 'skills' ? (
          <div className="flex-1 overflow-y-auto rpg-scroll p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
            {/* Attributes & Derived Combat Telemetry */}
            <div className="lg:col-span-4 space-y-5">
              <section className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#ECE4D4]">Core Attributes</h3>
                  <span className="text-xs font-mono-glyph text-amber-300 tabular-nums">
                    {player.attributePoints} available
                  </span>
                </div>
                <div className="space-y-2">
                  {attrs.map((key) => {
                    const meta = ATTRIBUTE_META[key];
                    return (
                      <div
                        key={key}
                        className="p-3 rounded border border-white/10 bg-[#151A25] flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold" style={{ color: meta.color }}>
                              {meta.name}
                            </span>
                            <span className="font-mono-glyph text-sm font-bold text-[#ECE4D4] tabular-nums">
                              {player.attributes[key]}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 leading-snug">{meta.description}</p>
                        </div>
                        <button
                          type="button"
                          disabled={player.attributePoints <= 0}
                          onClick={() => onSpendAttribute(key)}
                          className="min-h-[44px] min-w-[44px] px-3 py-1 rounded text-xs font-mono-glyph font-semibold bg-amber-500 text-[#0B0D12] hover:bg-amber-400 disabled:opacity-30 disabled:bg-slate-700 disabled:text-slate-400 shrink-0 cursor-pointer"
                        >
                          +1
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="p-4 rounded border border-white/10 bg-[#151A25] space-y-2.5">
                <h3 className="text-sm font-semibold text-[#ECE4D4]">Derived Combat Profile</h3>
                <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-xs font-mono-glyph tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Attack</span>
                    <span className="text-[#ECE4D4]">{derived.atk}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Defense</span>
                    <span className="text-[#ECE4D4]">{derived.def}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Spell Power</span>
                    <span className="text-sky-300">{derived.spellPower}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Crit Chance</span>
                    <span className="text-amber-300">{derived.critChance}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dodge</span>
                    <span className="text-emerald-300">{derived.dodgeChance}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Lifesteal</span>
                    <span className="text-rose-300">{derived.lifesteal}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Thorns</span>
                    <span className="text-slate-200">{derived.thorns}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Max HP / MP</span>
                    <span className="text-slate-200">
                      {derived.maxHp}/{derived.maxMana}
                    </span>
                  </div>
                </div>
              </section>
            </div>

            {/* 3-Branch Skill Trees */}
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              {branches.map((branch) => {
                const bMeta = BRANCH_META[branch];
                const branchPts = getBranchInvestedPoints(player.skills, branch);
                const branchSkills = ALL_SKILLS_LIST.filter((s) => s.branch === branch);

                return (
                  <div
                    key={branch}
                    className="rounded border border-white/10 bg-[#131822] p-4 flex flex-col gap-3"
                  >
                    <div className="pb-2 border-b border-white/10">
                      <div className="flex items-center justify-between">
                        <h3 className={`font-display text-base font-bold ${bMeta.accentClass}`}>
                          {bMeta.name}
                        </h3>
                        <span className="font-mono-glyph text-xs text-slate-400 tabular-nums">{branchPts} pts</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{bMeta.subtitle}</p>
                    </div>

                    <div className="space-y-3 flex-1">
                      {branchSkills.map((sk) => {
                        const rank = player.skills[sk.id] ?? 0;
                        const check = canLearnSkill(player, sk.id);
                        const hotbarIdx = player.hotbar.indexOf(sk.id);
                        const desc = rank > 0 ? sk.rankDescriptions[rank - 1] : sk.rankDescriptions[0];

                        return (
                          <div
                            key={sk.id}
                            className={`p-3 rounded border transition-colors ${
                              rank > 0
                                ? 'border-white/20 bg-[#19202D]'
                                : 'border-white/8 bg-[#10141C]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono-glyph text-sm" style={{ color: bMeta.color }}>
                                    {sk.glyph}
                                  </span>
                                  <span className="text-xs font-semibold text-[#ECE4D4] truncate">
                                    {sk.name}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  Tier {sk.tier} · {sk.kind === 'passive' ? 'Passive' : `${sk.manaCost} MP · CD ${sk.cooldown}`} · Rank {rank}/3
                                </div>
                              </div>

                              <button
                                type="button"
                                disabled={!check.ok}
                                onClick={() => onLearnSkill(sk.id)}
                                title={check.reason ?? 'Upgrade skill'}
                                className="min-h-[44px] min-w-[54px] px-2.5 py-1 rounded text-[11px] font-medium bg-amber-500 text-[#0B0D12] hover:bg-amber-400 disabled:bg-white/8 disabled:text-slate-500 shrink-0 cursor-pointer"
                              >
                                {rank === 0 ? 'Learn' : rank < 3 ? 'Rank +' : 'Max'}
                              </button>
                            </div>

                            <p className="text-[11px] text-slate-300 mt-2 leading-snug">{desc}</p>
                            <div className="text-[10px] text-slate-500 mt-1">{sk.scalingNote}</div>

                            {!check.ok && rank < 3 && (
                              <div className="text-[10px] text-amber-400/80 mt-1">{check.reason}</div>
                            )}

                            {/* Hotbar Assignment for learned Active Skills */}
                            {sk.kind === 'active' && rank > 0 && (
                              <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-white/8">
                                <span className="text-[10px] text-slate-400 mr-1">Slot:</span>
                                {[0, 1, 2, 3, 4].map((slotIdx) => (
                                  <button
                                    key={slotIdx}
                                    type="button"
                                    onClick={() => onAssignHotbar(sk.id, slotIdx)}
                                    className={`flex-1 min-h-[44px] md:min-h-[28px] rounded text-[11px] font-mono-glyph cursor-pointer ${
                                      hotbarIdx === slotIdx
                                        ? 'bg-amber-500 text-[#0B0D12] font-bold'
                                        : 'bg-[#0C1018] text-slate-400 hover:text-white border border-white/10'
                                    }`}
                                  >
                                    {slotIdx + 1}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto rpg-scroll p-4 sm:p-6 space-y-5">
            <div className="p-4 rounded border border-violet-400/25 bg-[#151226] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-base font-bold text-violet-200">
                  Build-Defining Milestone Prodigies
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Earned at Level 6 and Level 10. Prodigies reshape your hero permanently and stack with every skill tree.
                </p>
              </div>
              <div className="font-mono-glyph text-xs text-violet-300 tabular-nums">
                {prodigyPts} Prodigy Point{prodigyPts === 1 ? '' : 's'} Available · {(player.prodigies ?? []).length}/2 Claimed
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ALL_PRODIGIES_LIST.map((p) => {
                const claimed = hasProdigy(player, p.id);
                const check = canLearnProdigy(player, p.id);

                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded border transition-colors flex flex-col justify-between gap-3 ${
                      claimed
                        ? 'border-violet-400/60 bg-[#1B1830]'
                        : check.ok
                          ? 'border-amber-400/40 bg-[#161B26]'
                          : 'border-white/10 bg-[#121620]'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono-glyph text-base text-violet-300">{p.glyph}</span>
                            <h4 className="font-display text-base font-bold text-[#ECE4D4]">{p.name}</h4>
                          </div>
                          <div className="text-[11px] font-mono-glyph text-amber-300/90 mt-0.5 tabular-nums">
                            {p.requirementLabel} · {p.pillar}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={!check.ok}
                          onClick={() => onClaimProdigy(p.id)}
                          className={`min-h-[44px] px-3.5 py-1.5 rounded text-xs font-semibold shrink-0 cursor-pointer ${
                            claimed
                              ? 'bg-violet-500/25 text-violet-200 border border-violet-400/40'
                              : check.ok
                                ? 'bg-violet-500 text-[#0B0D12] hover:bg-violet-400'
                                : 'bg-white/8 text-slate-500'
                          }`}
                        >
                          {claimed ? 'Claimed' : 'Claim'}
                        </button>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">{p.summary}</p>
                      <p className="text-xs text-sky-300/90 leading-relaxed border-t border-white/8 pt-2">
                        {p.effectNote}
                      </p>
                    </div>

                    {!claimed && !check.ok && (
                      <div className="text-[11px] font-mono-glyph text-amber-400/80 tabular-nums">
                        {check.reason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Tip */}
        <div className="px-4 py-2.5 sm:px-6 sm:py-3 border-t border-white/10 text-[11px] sm:text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
          <span>
            Visit any Glyph Shrine in Oakhaven or Guildmaster Kaelen in Highspire to respec attributes & skills.
          </span>
          <span className="font-mono-glyph text-slate-500 truncate max-w-full">
            Hotbar: {player.hotbar.map((id, i) => `${i + 1}:${id ? SKILLS[id].name : '—'}`).join(' · ')}
          </span>
        </div>
      </div>
    </div>
  );
};
