import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Crown,
  Flame,
  Gem,
  Shield,
  Sparkles,
  Sword,
  Trash2,
  X,
} from 'lucide-react';
import { formatStatList, getSalvageGoldYield, RARITY_COLOR, RELIC_SETS } from '../game/loot';
import { getEquippedSetCounts } from '../game/skills';
import { DerivedStats, Item, ItemRarity, ItemSlot, ItemStats, PlayerState, RelicSetId } from '../game/types';

interface InventoryModalProps {
  player: PlayerState;
  derived: DerivedStats;
  onEquipItem: (itemId: string) => void;
  onUnequipItem: (slot: ItemSlot) => void;
  onUseConsumable: (itemId: string) => void;
  onSalvageItem: (itemId: string) => void;
  onSalvageCommon: () => void;
  onClose: () => void;
}

type BagFilter = 'all' | 'equipment' | 'consumable' | 'quest';
type SortMode = 'rarity' | 'slot' | 'value';

const RARITY_RANK: Record<ItemRarity, number> = {
  Relic: 5,
  Epic: 4,
  Rare: 3,
  Uncommon: 2,
  Common: 1,
};

const SLOT_ORDER: Record<ItemSlot, number> = {
  weapon: 1,
  armor: 2,
  helm: 3,
  amulet: 4,
  ring: 5,
};

const STAT_DEFS: Array<{ key: keyof ItemStats; label: string; suffix?: string }> = [
  { key: 'atk', label: 'Attack' },
  { key: 'def', label: 'Defense' },
  { key: 'spellPower', label: 'Spell Power' },
  { key: 'maxHp', label: 'Max HP' },
  { key: 'maxMana', label: 'Max Mana' },
  { key: 'critChance', label: 'Crit', suffix: '%' },
  { key: 'dodgeChance', label: 'Dodge', suffix: '%' },
  { key: 'lifesteal', label: 'Lifesteal', suffix: '%' },
  { key: 'thorns', label: 'Thorns' },
];

function itemPowerScore(item?: Item): number {
  if (!item || item.category !== 'equipment') return 0;
  const s = item.stats;
  return (
    (s.atk ?? 0) * 1.2 +
    (s.def ?? 0) * 1.2 +
    (s.spellPower ?? 0) * 1.2 +
    (s.maxHp ?? 0) * 0.22 +
    (s.maxMana ?? 0) * 0.25 +
    (s.critChance ?? 0) * 0.65 +
    (s.dodgeChance ?? 0) * 0.65 +
    (s.lifesteal ?? 0) * 0.8 +
    (s.thorns ?? 0) * 0.5 +
    (item.affix ? 3 : 0)
  );
}

function renderSlotPlaceholder(slot: ItemSlot) {
  const cls = 'w-4 h-4 text-slate-600';
  switch (slot) {
    case 'helm':
      return <Crown className={cls} />;
    case 'weapon':
      return <Sword className={cls} />;
    case 'armor':
      return <Shield className={cls} />;
    case 'amulet':
      return <Sparkles className={cls} />;
    case 'ring':
      return <Gem className={cls} />;
  }
}

const SLOT_LABEL: Record<ItemSlot, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  helm: 'Helm',
  amulet: 'Amulet',
  ring: 'Ring',
};

export const InventoryModal: React.FC<InventoryModalProps> = ({
  player,
  derived,
  onEquipItem,
  onUnequipItem,
  onUseConsumable,
  onSalvageItem,
  onSalvageCommon,
  onClose,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(
    player.inventory[0]?.id ?? Object.values(player.equipped).find(Boolean)?.id ?? null
  );
  const [filter, setFilter] = useState<BagFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('rarity');
  const [mobilePane, setMobilePane] = useState<'pack' | 'loadout'>('pack');

  const equippedSetCounts = useMemo(() => getEquippedSetCounts(player), [player]);

  const categoryCounts = useMemo(() => {
    const counts: Record<BagFilter, number> = {
      all: player.inventory.length,
      equipment: 0,
      consumable: 0,
      quest: 0,
    };
    for (const item of player.inventory) {
      counts[item.category] = (counts[item.category] ?? 0) + 1;
    }
    return counts;
  }, [player.inventory]);

  const commonSalvageStats = useMemo(() => {
    const commons = player.inventory.filter((i) => i.category === 'equipment' && i.rarity === 'Common');
    return {
      count: commons.length,
      gold: commons.reduce((sum, i) => sum + getSalvageGoldYield(i), 0),
    };
  }, [player.inventory]);

  const visiblePack = useMemo(() => {
    const list =
      filter === 'all'
        ? [...player.inventory]
        : player.inventory.filter((i) => i.category === filter);

    list.sort((a, b) => {
      if (sortMode === 'rarity') {
        const diff = RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity];
        if (diff !== 0) return diff;
        return b.value - a.value;
      }
      if (sortMode === 'value') {
        const diff = b.value - a.value;
        if (diff !== 0) return diff;
        return RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity];
      }
      const sa = a.slot ? SLOT_ORDER[a.slot] : a.category === 'consumable' ? 6 : 7;
      const sb = b.slot ? SLOT_ORDER[b.slot] : b.category === 'consumable' ? 6 : 7;
      if (sa !== sb) return sa - sb;
      return RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity];
    });
    return list;
  }, [player.inventory, filter, sortMode]);

  const selectedItem: Item | undefined = useMemo(() => {
    return (
      player.inventory.find((i) => i.id === selectedId) ??
      Object.values(player.equipped).find((i) => i?.id === selectedId) ??
      visiblePack[0] ??
      Object.values(player.equipped).find(Boolean)
    );
  }, [player.inventory, player.equipped, selectedId, visiblePack]);

  const isSelectedInPack = Boolean(selectedItem && player.inventory.some((i) => i.id === selectedItem.id));
  const equippedSlotMatch = (Object.keys(player.equipped) as ItemSlot[]).find(
    (slot) => player.equipped[slot]?.id === selectedItem?.id
  );

  const equippedCompare =
    selectedItem?.slot && selectedItem.category === 'equipment'
      ? player.equipped[selectedItem.slot]
      : undefined;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (visiblePack.length === 0) return;
      const activeTag = document.activeElement?.tagName;
      const idx = selectedItem ? visiblePack.findIndex((i) => i.id === selectedItem.id) : -1;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIdx = idx < 0 ? 0 : (idx + 1) % visiblePack.length;
        setSelectedId(visiblePack[nextIdx].id);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIdx = idx <= 0 ? visiblePack.length - 1 : idx - 1;
        setSelectedId(visiblePack[prevIdx].id);
      } else if (e.key === 'Enter' && activeTag !== 'BUTTON' && selectedItem && isSelectedInPack) {
        if (selectedItem.category === 'equipment') {
          e.preventDefault();
          onEquipItem(selectedItem.id);
        } else if (selectedItem.category === 'consumable') {
          e.preventDefault();
          onUseConsumable(selectedItem.id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visiblePack, selectedItem, isSelectedInPack, onEquipItem, onUseConsumable]);

  const cycleSort = () => {
    setSortMode((cur) => (cur === 'rarity' ? 'slot' : cur === 'slot' ? 'value' : 'rarity'));
  };

  const renderPaperdollSlot = (slot: ItemSlot) => {
    const eq = player.equipped[slot];
    const active = Boolean(eq && selectedItem?.id === eq.id);
    const rarityHex = eq ? RARITY_COLOR[eq.rarity] : undefined;

    return (
      <button
        key={slot}
        type="button"
        onClick={() => eq && setSelectedId(eq.id)}
        disabled={!eq}
        aria-label={eq ? `${SLOT_LABEL[slot]}: ${eq.name}` : `Empty ${SLOT_LABEL[slot]} slot`}
        className={`group relative rounded border p-2 min-h-[76px] flex flex-col items-center justify-between text-center transition-colors ${
          eq
            ? active
              ? 'border-amber-400 bg-[#1B2333] cursor-pointer shadow-[inset_0_0_0_1px_rgba(251,191,36,0.28)]'
              : 'border-white/14 bg-[#141A25] hover:border-white/30 cursor-pointer'
            : 'border-dashed border-white/10 bg-[#0D1119]/75 cursor-default'
        }`}
        style={eq && !active ? { borderColor: `${rarityHex}55` } : undefined}
      >
        <div className="w-full flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400">
          <span>{SLOT_LABEL[slot]}</span>
          {eq && eq.upgradeLevel > 0 && (
            <span className="font-mono-glyph text-amber-300 font-semibold">+{eq.upgradeLevel}</span>
          )}
        </div>

        <div className="my-0.5 flex items-center justify-center">
          {eq ? (
            <span
              className="font-mono-glyph text-xl leading-none"
              style={{ color: rarityHex }}
            >
              {eq.glyph}
            </span>
          ) : (
            renderSlotPlaceholder(slot)
          )}
        </div>

        <div
          className={`w-full text-[11px] leading-tight truncate ${
            eq ? 'font-medium text-[#ECE4D4]' : 'text-slate-600'
          }`}
        >
          {eq ? eq.name.replace(/\s\+\d+$/, '') : 'Empty'}
        </div>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-6xl rounded-md border border-white/15 bg-[#0F131C] shadow-2xl flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-white/10 flex items-center justify-between gap-3 bg-[#131823] rounded-t-md">
          <div className="min-w-0">
            <h2 className="font-display text-base sm:text-lg font-bold text-amber-200 truncate">
              {player.name} · Armaments & Pack
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono-glyph tabular-nums">
              {player.gold} Gold · {player.inventory.length}/28 Pack Slots
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close inventory"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile View Switcher (< lg) */}
        <div className="lg:hidden px-3.5 pt-2.5 grid grid-cols-2 gap-1.5 bg-[#0F131C]">
          <button
            type="button"
            onClick={() => setMobilePane('pack')}
            className={`min-h-[44px] rounded text-xs font-semibold transition-colors cursor-pointer ${
              mobilePane === 'pack'
                ? 'bg-amber-500 text-[#0B0D12]'
                : 'bg-[#141923] text-slate-300 border border-white/10'
            }`}
          >
            Pack & Inspect ({player.inventory.length})
          </button>
          <button
            type="button"
            onClick={() => setMobilePane('loadout')}
            className={`min-h-[44px] rounded text-xs font-semibold transition-colors cursor-pointer ${
              mobilePane === 'loadout'
                ? 'bg-amber-500 text-[#0B0D12]'
                : 'bg-[#141923] text-slate-300 border border-white/10'
            }`}
          >
            Loadout & Runes
          </button>
        </div>

        {/* 3-Zone Workspace */}
        <div className="flex-1 overflow-y-auto rpg-scroll p-3.5 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
          {/* LEFT ZONE: Hero Paperdoll + Combat Totals */}
          <div className={`lg:col-span-4 space-y-3.5 ${mobilePane === 'loadout' ? 'block' : 'hidden lg:block'}`}>
            <div className="rounded border border-white/10 bg-[#121722] p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Equipped Loadout
                </h3>
                <span className="text-[11px] text-slate-500">Lv {player.level} {player.starterClass}</span>
              </div>

              {/* Symmetrical Paperdoll Cross */}
              <div className="grid grid-cols-3 gap-2">
                <div />
                {renderPaperdollSlot('helm')}
                <div />

                {renderPaperdollSlot('weapon')}
                {renderPaperdollSlot('armor')}
                {renderPaperdollSlot('amulet')}

                <div />
                {renderPaperdollSlot('ring')}
                <div />
              </div>

              {/* Live Combat Totals Strip */}
              <div className="grid grid-cols-5 gap-1 pt-2 border-t border-white/10 text-center font-mono-glyph tabular-nums">
                <div className="rounded bg-[#0C1018] py-1.5 px-1">
                  <div className="text-[9px] text-slate-500">ATK</div>
                  <div className="text-xs font-semibold text-rose-300">{derived.atk}</div>
                </div>
                <div className="rounded bg-[#0C1018] py-1.5 px-1">
                  <div className="text-[9px] text-slate-500">DEF</div>
                  <div className="text-xs font-semibold text-amber-200">{derived.def}</div>
                </div>
                <div className="rounded bg-[#0C1018] py-1.5 px-1">
                  <div className="text-[9px] text-slate-500">SP</div>
                  <div className="text-xs font-semibold text-sky-300">{derived.spellPower}</div>
                </div>
                <div className="rounded bg-[#0C1018] py-1.5 px-1">
                  <div className="text-[9px] text-slate-500">CRIT</div>
                  <div className="text-xs font-semibold text-amber-300">{derived.critChance}%</div>
                </div>
                <div className="rounded bg-[#0C1018] py-1.5 px-1">
                  <div className="text-[9px] text-slate-500">DODGE</div>
                  <div className="text-xs font-semibold text-emerald-300">{derived.dodgeChance}%</div>
                </div>
              </div>

              {(Object.keys(equippedSetCounts) as RelicSetId[]).some((id) => equippedSetCounts[id] > 0) && (
                <div className="pt-2 border-t border-white/10 space-y-1.5">
                  {(Object.keys(equippedSetCounts) as RelicSetId[]).map((setId) => {
                    const count = equippedSetCounts[setId];
                    if (count === 0) return null;
                    const meta = RELIC_SETS[setId];
                    const activeSet = count >= 2;
                    return (
                      <div
                        key={setId}
                        className={`rounded border px-2.5 py-1.5 text-[11px] ${
                          activeSet
                            ? 'border-amber-400/50 bg-amber-500/10 text-amber-200'
                            : 'border-white/10 bg-[#0E121B] text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between font-medium">
                          <span>{meta.name}</span>
                          <span className="font-mono-glyph tabular-nums">
                            {count}/2 pieces
                          </span>
                        </div>
                        <div className="text-[10px] mt-0.5 opacity-90">{meta.summary.replace('2-Piece Set: ', '')}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Companion Spirit Bond */}
            {player.companion && (
              <div className="rounded border border-white/10 bg-[#121722] p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-amber-200">{player.companion.name}</span>
                  <span className="font-mono-glyph text-[11px] text-emerald-300 tabular-nums">
                    {player.companion.respawnCooldown > 0
                      ? `Reforming (${player.companion.respawnCooldown}t)`
                      : `${player.companion.hp}/${player.companion.maxHp} HP`}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {player.companion.kind === 'silverwind_lynx'
                    ? 'Aura: +4% Crit & Dodge · Ferocious melee pounce'
                    : 'Aura: +1 Sight Radius & +3 Spell Power · Restores +1 MP on strike'}
                </div>
              </div>
            )}
          </div>

          {/* CENTER ZONE: Filterable Visual Pack Grid */}
          <div
            className={`lg:col-span-5 flex-col rounded border border-white/10 bg-[#121722] p-3 space-y-3 min-h-[240px] ${
              mobilePane === 'pack' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {/* Category Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'equipment', label: 'Gear' },
                  { id: 'consumable', label: 'Potions' },
                  { id: 'quest', label: 'Quest' },
                ] as Array<{ id: BagFilter; label: string }>
              ).map((tab) => {
                const isActive = filter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilter(tab.id)}
                    className={`min-h-[44px] px-2.5 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors cursor-pointer tabular-nums ${
                      isActive
                        ? 'bg-amber-500 text-[#0B0D12] font-semibold'
                        : 'bg-[#171E2B] text-slate-300 border border-white/10 hover:border-white/25'
                    }`}
                  >
                    {tab.label} ({categoryCounts[tab.id]})
                  </button>
                );
              })}
            </div>

            {/* Sort & Batch Salvage Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
              <button
                type="button"
                onClick={cycleSort}
                className="min-h-[44px] px-2.5 py-1 rounded border border-white/12 bg-[#161C28] hover:border-white/25 text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-amber-300" />
                <span>
                  Sort: {sortMode === 'rarity' ? 'Rarity' : sortMode === 'slot' ? 'Type' : 'Value'}
                </span>
              </button>

              {commonSalvageStats.count > 0 && (
                <button
                  type="button"
                  onClick={onSalvageCommon}
                  className="min-h-[44px] px-2.5 py-1 rounded border border-sky-400/35 bg-sky-500/10 hover:bg-sky-500/20 text-xs text-sky-200 flex items-center gap-1.5 cursor-pointer tabular-nums"
                >
                  <Trash2 className="w-3.5 h-3.5 text-sky-300" />
                  <span>
                    Salvage {commonSalvageStats.count} Common (+{commonSalvageStats.gold} Gold)
                  </span>
                </button>
              )}
            </div>

            {/* Pack Grid */}
            {visiblePack.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-slate-500">
                {player.inventory.length === 0
                  ? 'Your pack is empty. Open chests, clear vaults, or defeat foes to gather loot.'
                  : 'No items match this filter category.'}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[250px] lg:max-h-[390px] overflow-y-auto rpg-scroll pr-0.5 content-start">
                {visiblePack.map((item) => {
                  const active = selectedItem?.id === item.id;
                  const rarityHex = RARITY_COLOR[item.rarity];
                  const curEquipped = item.slot ? player.equipped[item.slot] : undefined;
                  const isUpgrade =
                    item.category === 'equipment' &&
                    itemPowerScore(item) > itemPowerScore(curEquipped);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`relative text-left rounded border p-2.5 min-h-[82px] flex flex-col justify-between transition-colors cursor-pointer ${
                        active
                          ? 'border-amber-400 bg-[#1B2333] shadow-[inset_0_0_0_1px_rgba(251,191,36,0.3)]'
                          : 'border-white/10 bg-[#151B27] hover:border-white/28'
                      }`}
                    >
                      {/* Rarity corner stripe */}
                      <span
                        className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r"
                        style={{ backgroundColor: rarityHex }}
                      />

                      <div className="pl-1.5 flex items-start justify-between gap-1">
                        <span
                          className="font-mono-glyph text-lg leading-none"
                          style={{ color: rarityHex }}
                        >
                          {item.glyph}
                        </span>
                        <div className="flex items-center gap-1 font-mono-glyph text-[10px] tabular-nums">
                          {isUpgrade && (
                            <span
                              title="Stronger than currently equipped gear"
                              className="text-emerald-400 font-bold"
                            >
                              ▲
                            </span>
                          )}
                          {item.upgradeLevel > 0 && (
                            <span className="text-amber-300">+{item.upgradeLevel}</span>
                          )}
                          {item.quantity && item.quantity > 1 && (
                            <span className="text-slate-300">x{item.quantity}</span>
                          )}
                        </div>
                      </div>

                      <div className="pl-1.5 mt-1.5">
                        <div className="text-xs font-medium text-[#ECE4D4] leading-snug truncate">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center justify-between gap-1 mt-0.5 font-mono-glyph tabular-nums">
                          <span className="truncate capitalize">
                            {item.slot ?? item.category}
                          </span>
                          <span className="text-amber-300/90 shrink-0">
                            {item.value > 0 ? `${item.value}g` : 'Quest'}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT ZONE: Side-by-Side Stat-Delta Inspector & Actions */}
          <div className="lg:col-span-3 flex flex-col rounded border border-white/10 bg-[#121722] p-3.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2.5">
              Item Inspector
            </h3>

            {selectedItem ? (
              <div className="flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <div className="pb-2.5 border-b border-white/10">
                    <div className="flex items-start gap-2">
                      <span
                        className="font-mono-glyph text-xl leading-tight shrink-0"
                        style={{ color: RARITY_COLOR[selectedItem.rarity] }}
                      >
                        {selectedItem.glyph}
                      </span>
                      <div className="min-w-0">
                        <div
                          className="text-sm font-bold leading-snug"
                          style={{ color: RARITY_COLOR[selectedItem.rarity] }}
                        >
                          {selectedItem.name}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 capitalize">
                          {selectedItem.rarity}{' '}
                          {`· ${selectedItem.slot ?? selectedItem.category}`}
                          {equippedSlotMatch ? ' · Equipped' : ''}
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{selectedItem.description}</p>

                  {selectedItem.category === 'equipment' && (
                    <div className="space-y-1.5 pt-2 border-t border-white/10">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center justify-between">
                        <span>Stats</span>
                        {!equippedSlotMatch && equippedCompare && (
                          <span>vs Equipped {SLOT_LABEL[selectedItem.slot!]}</span>
                        )}
                      </div>

                      {STAT_DEFS.map(({ key, label, suffix }) => {
                        const val = selectedItem.stats[key] ?? 0;
                        const eqVal = equippedCompare?.stats[key] ?? 0;
                        const isSelfEquipped = equippedCompare?.id === selectedItem.id;
                        if (val === 0 && (isSelfEquipped || eqVal === 0)) return null;
                        const diff = val - eqVal;
                        return (
                          <div
                            key={key}
                            className="flex items-center justify-between text-xs font-mono-glyph tabular-nums"
                          >
                            <span className="text-slate-300">{label}</span>
                            <div className="flex items-center gap-1.5">
                              <span className={val > 0 ? 'text-[#ECE4D4]' : 'text-slate-500'}>
                                {val > 0 ? `+${val}${suffix ?? ''}` : `0${suffix ?? ''}`}
                              </span>
                              {!isSelfEquipped && diff !== 0 && (
                                <span className={diff > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                  ({diff > 0 ? `+${diff}` : diff}
                                  {suffix ?? ''})
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {formatStatList(selectedItem.stats).length === 0 && !equippedCompare && (
                        <div className="text-xs text-slate-500">No combat bonuses.</div>
                      )}

                      {selectedItem.affixLabel && (
                        <div className="pt-2 border-t border-white/10 text-xs text-sky-300 font-medium flex items-start gap-1.5">
                          <Flame className="w-3.5 h-3.5 shrink-0 mt-0.5 text-sky-400" />
                          <span>{selectedItem.affixLabel}</span>
                        </div>
                      )}

                      {selectedItem.setId && (
                        <div className="pt-2 border-t border-white/10 space-y-1">
                          <div className="flex items-center justify-between text-xs font-semibold text-amber-200">
                            <span>Set: {RELIC_SETS[selectedItem.setId].name}</span>
                            <span className="font-mono-glyph tabular-nums">
                              {equippedSetCounts[selectedItem.setId]}/2
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-300 leading-snug">
                            {RELIC_SETS[selectedItem.setId].summary}
                          </div>
                          <div
                            className={`text-[11px] font-medium ${
                              equippedSetCounts[selectedItem.setId] >= 2
                                ? 'text-emerald-300'
                                : 'text-slate-400'
                            }`}
                          >
                            2-Piece: {RELIC_SETS[selectedItem.setId].bonusLabel}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* Action Footer */}
                <div className="pt-3 border-t border-white/10 space-y-2">
                  {equippedSlotMatch && (
                    <button
                      type="button"
                      onClick={() => onUnequipItem(equippedSlotMatch)}
                      className="w-full min-h-[44px] px-3 py-2 rounded border border-white/18 bg-[#1A2130] hover:border-amber-400/60 text-xs font-semibold text-[#ECE4D4] cursor-pointer"
                    >
                      Unequip to Pack
                    </button>
                  )}

                  {isSelectedInPack && selectedItem.category === 'equipment' && (
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => onEquipItem(selectedItem.id)}
                        className="w-full min-h-[44px] px-4 py-2 rounded text-xs font-semibold bg-amber-500 text-[#0B0D12] hover:bg-amber-400 cursor-pointer"
                      >
                        {equippedCompare ? `Swap ${SLOT_LABEL[selectedItem.slot!]}` : `Equip ${SLOT_LABEL[selectedItem.slot!]}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => onSalvageItem(selectedItem.id)}
                        className="w-full min-h-[44px] px-3 py-2 rounded text-xs font-medium border border-white/15 bg-[#19202E] text-sky-200 hover:border-sky-400/60 cursor-pointer tabular-nums"
                      >
                        Salvage (+{getSalvageGoldYield(selectedItem)} Gold)
                      </button>
                    </div>
                  )}

                  {isSelectedInPack && selectedItem.category === 'consumable' && (
                    <button
                      type="button"
                      onClick={() => onUseConsumable(selectedItem.id)}
                      className="w-full min-h-[44px] px-4 py-2 rounded text-xs font-semibold bg-emerald-500 text-[#0B0D12] hover:bg-emerald-400 cursor-pointer"
                    >
                      Use Item
                    </button>
                  )}

                  {isSelectedInPack && selectedItem.category === 'quest' && (
                    <div className="text-[11px] text-slate-400 text-center py-1">
                      Quest Relic · Deliver or use at the matching Sanctuary / NPC.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-500 text-center p-4">
                Select any equipped piece or pack item to inspect stats and compare upgrades.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
