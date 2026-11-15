import React, { useState } from 'react';
import { Flame, RefreshCw, Sparkles, X } from 'lucide-react';
import {
  ALL_RUNE_ENCHANTS,
  formatStatList,
  RARITY_COLOR,
} from '../game/loot';
import { Item, PlayerState, RuneEnchantId, WorldFlags } from '../game/types';

interface MerchantModalProps {
  merchantName: string;
  stock: Item[];
  player: PlayerState;
  worldFlags: WorldFlags;
  onBuyItem: (itemId: string) => void;
  onSellItem: (itemId: string) => void;
  onUpgradeItem: (itemId: string, isEquipped: boolean) => void;
  onEnchantItem: (itemId: string, isEquipped: boolean, runeId: RuneEnchantId) => void;
  onRerollAffix: (itemId: string, isEquipped: boolean) => void;
  onOpenTownUpgrades?: () => void;
  onClose: () => void;
}

export const MerchantModal: React.FC<MerchantModalProps> = ({
  merchantName,
  stock,
  player,
  worldFlags,
  onBuyItem,
  onSellItem,
  onUpgradeItem,
  onEnchantItem,
  onRerollAffix,
  onOpenTownUpgrades,
  onClose,
}) => {
  const [tab, setTab] = useState<'buy' | 'sell' | 'forge' | 'runeforge'>('buy');

  const smithyLv = worldFlags.townUpgrades?.smithy ?? 0;
  const maxTemperLv = smithyLv >= 2 ? 4 : 3;
  const discountMult = smithyLv >= 1 ? 0.75 : 1;

  const upgradeCost = (item: Item) => ({
    gold: Math.max(8, Math.round((25 + item.upgradeLevel * 25) * discountMult)),
    dust: Math.max(3, Math.round((8 + item.upgradeLevel * 8) * discountMult)),
  });

  const runeCost = {
    gold: Math.max(10, Math.round(30 * discountMult)),
    dust: Math.max(4, Math.round(10 * discountMult)),
  };

  const reforgeCost = {
    gold: Math.max(10, Math.round(25 * discountMult)),
    dust: Math.max(4, Math.round(8 * discountMult)),
  };

  const equippedList = Object.values(player.equipped).filter((i): i is Item => Boolean(i));
  const bagEquip = player.inventory.filter((i) => i.category === 'equipment');
  const forgeGear = [
    ...equippedList.map((item) => ({ item, eq: true })),
    ...bagEquip.map((item) => ({ item, eq: false })),
  ];
  const sellableItems = player.inventory.filter((i) => i.category !== 'quest' && i.value > 0);

  return (
    <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-2.5 sm:p-5">
      <div className="w-full max-w-4xl rounded-md border border-white/15 bg-[#10141D] shadow-2xl flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-amber-200">{merchantName}</h2>
            <p className="text-xs text-slate-400 font-mono-glyph mt-0.5 tabular-nums">
              Purse: {player.gold} Gold · {player.glyphDust} Glyph Dust
              {smithyLv > 0 ? ` · Smithy Lv ${smithyLv}` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {onOpenTownUpgrades && (
              <button
                type="button"
                onClick={onOpenTownUpgrades}
                className="min-h-[44px] px-3 py-1.5 rounded border border-amber-400/35 bg-amber-500/12 text-amber-200 hover:bg-amber-500/20 text-xs font-medium cursor-pointer"
              >
                Town Upgrades
              </button>
            )}

            <div className="flex items-center gap-1 p-1 rounded bg-[#0A0D14] border border-white/10">
              {(
                [
                  { id: 'buy', label: 'Buy' },
                  { id: 'sell', label: 'Sell' },
                  { id: 'forge', label: 'Temper' },
                  { id: 'runeforge', label: 'Runeforge' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`min-h-[44px] px-2.5 sm:px-3 py-1 rounded text-xs font-medium cursor-pointer ${
                    tab === t.id ? 'bg-amber-500 text-[#0B0D12] font-semibold' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close merchant"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto rpg-scroll p-4 sm:p-6 space-y-3">
          {tab === 'buy' && (
            <>
              {stock.length === 0 ? (
                <div className="text-xs text-slate-500 py-8 text-center">No goods remaining in stock.</div>
              ) : (
                stock.map((item) => {
                  const buyPrice = item.value;
                  const canAfford = player.gold >= buyPrice;
                  return (
                    <div
                      key={item.id}
                      className="p-3 sm:p-3.5 rounded border border-white/10 bg-[#141923] flex flex-wrap sm:flex-nowrap items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono-glyph text-sm" style={{ color: RARITY_COLOR[item.rarity] }}>
                            {item.glyph}
                          </span>
                          <span className="text-sm font-semibold" style={{ color: RARITY_COLOR[item.rarity] }}>
                            {item.name}
                          </span>
                          <span className="text-xs text-slate-400">
                            · {item.rarity} {item.quantity && item.quantity > 1 ? `(x${item.quantity})` : ''}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {item.category === 'equipment'
                            ? formatStatList(item.stats)
                                .map((s) => `${s.label} ${s.value}`)
                                .join(' · ')
                            : item.description}
                          {item.affixLabel ? ` · ${item.affixLabel}` : ''}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => onBuyItem(item.id)}
                        className="min-h-[44px] px-4 py-2 rounded text-xs font-semibold bg-amber-500 text-[#0B0D12] hover:bg-amber-400 disabled:bg-white/10 disabled:text-slate-500 shrink-0 cursor-pointer font-mono-glyph tabular-nums"
                      >
                        Buy · {buyPrice}g
                      </button>
                    </div>
                  );
                })
              )}
            </>
          )}

          {tab === 'sell' && (
            <>
              {sellableItems.length === 0 ? (
                <div className="text-xs text-slate-500 py-8 text-center">No sellable items in your pack.</div>
              ) : (
                sellableItems.map((item) => {
                  const sellPrice = Math.max(4, Math.round(item.value * 0.55));
                  return (
                    <div
                      key={item.id}
                      className="p-3 sm:p-3.5 rounded border border-white/10 bg-[#141923] flex flex-wrap sm:flex-nowrap items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold" style={{ color: RARITY_COLOR[item.rarity] }}>
                          {item.glyph} {item.name}
                          {item.quantity && item.quantity > 1 ? ` x${item.quantity}` : ''}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {item.rarity} · {item.slot ?? item.category}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSellItem(item.id)}
                        className="min-h-[44px] px-4 py-2 rounded text-xs font-semibold border border-amber-400/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25 shrink-0 cursor-pointer font-mono-glyph tabular-nums"
                      >
                        Sell · +{sellPrice}g
                      </button>
                    </div>
                  );
                })
              )}
            </>
          )}

          {tab === 'forge' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Temper equipped or carried gear up to +{maxTemperLv} using Gold and Glyph Dust salvaged from spare loot.
                {smithyLv >= 1 ? ' (25% Smithy discount active)' : ''}
              </p>
              {forgeGear.length === 0 ? (
                <div className="text-xs text-slate-500 py-8 text-center">No equipment to temper.</div>
              ) : (
                forgeGear.map(({ item, eq }) => {
                  const cost = upgradeCost(item);
                  const maxed = item.upgradeLevel >= maxTemperLv;
                  const canUpgrade = !maxed && player.gold >= cost.gold && player.glyphDust >= cost.dust;
                  return (
                    <div
                      key={item.id}
                      className="p-3 sm:p-3.5 rounded border border-white/10 bg-[#141923] flex flex-wrap sm:flex-nowrap items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold" style={{ color: RARITY_COLOR[item.rarity] }}>
                            {item.glyph} {item.name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {eq ? 'Equipped' : 'In Pack'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {formatStatList(item.stats)
                            .map((s) => `${s.label} ${s.value}`)
                            .join(' · ')}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!canUpgrade}
                        onClick={() => onUpgradeItem(item.id, eq)}
                        className="min-h-[44px] px-4 py-2 rounded text-xs font-semibold bg-sky-500 text-[#0B0D12] hover:bg-sky-400 disabled:bg-white/10 disabled:text-slate-500 shrink-0 cursor-pointer font-mono-glyph tabular-nums"
                      >
                        {maxed ? `Max +${maxTemperLv}` : `Temper (${cost.gold}g · ${cost.dust} Dust)`}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === 'runeforge' && (
            <div className="space-y-4">
              <div className="p-3 rounded border border-sky-400/25 bg-[#121824] text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-300 shrink-0" />
                  <span>
                    Etch permanent Rune Seals ({runeCost.gold}g · {runeCost.dust} Dust) or Reforge passive Affixes on Rare+ gear ({reforgeCost.gold}g · {reforgeCost.dust} Dust).
                  </span>
                </div>
              </div>

              {forgeGear.length === 0 ? (
                <div className="text-xs text-slate-500 py-8 text-center">No equipment ready for the Runeforge.</div>
              ) : (
                forgeGear.map(({ item, eq }) => {
                  const canAffordRune = player.gold >= runeCost.gold && player.glyphDust >= runeCost.dust;
                  const canReforge =
                    (item.rarity === 'Rare' || item.rarity === 'Epic' || item.rarity === 'Relic') &&
                    player.gold >= reforgeCost.gold &&
                    player.glyphDust >= reforgeCost.dust;

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded border border-white/12 bg-[#141923] space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold" style={{ color: RARITY_COLOR[item.rarity] }}>
                              {item.glyph} {item.name}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {eq ? 'Equipped' : 'In Pack'}
                            </span>
                          </div>
                          {item.runeEnchant && (
                            <div className="text-xs text-sky-300 mt-0.5 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              <span>Etched: {item.runeEnchant.label}</span>
                            </div>
                          )}
                          {item.affixLabel && (
                            <div className="text-xs text-amber-200/90 mt-0.5 flex items-center gap-1">
                              <Flame className="w-3 h-3 text-amber-300" />
                              <span>{item.affixLabel}</span>
                            </div>
                          )}
                        </div>

                        {(item.rarity === 'Rare' || item.rarity === 'Epic' || item.rarity === 'Relic') && (
                          <button
                            type="button"
                            disabled={!canReforge}
                            onClick={() => onRerollAffix(item.id, eq)}
                            className="min-h-[44px] px-3 py-1.5 rounded text-xs font-semibold border border-amber-400/40 bg-amber-500/12 text-amber-200 hover:bg-amber-500/20 disabled:opacity-40 flex items-center gap-1.5 cursor-pointer font-mono-glyph tabular-nums shrink-0"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>
                              Reforge Affix ({reforgeCost.gold}g · {reforgeCost.dust} Dust)
                            </span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {ALL_RUNE_ENCHANTS.map((rune) => {
                          const isSame = item.runeEnchant?.id === rune.id;
                          return (
                            <button
                              key={rune.id}
                              type="button"
                              disabled={!canAffordRune || isSame}
                              onClick={() => onEnchantItem(item.id, eq, rune.id)}
                              className={`min-h-[44px] px-3 py-2 rounded border text-left transition-colors cursor-pointer disabled:cursor-default ${
                                isSame
                                  ? 'border-sky-400 bg-sky-500/20 text-sky-100'
                                  : 'border-white/12 bg-[#101520] hover:border-sky-400/50 disabled:opacity-45 text-slate-200'
                              }`}
                            >
                              <div className="text-xs font-semibold truncate">{rune.name}</div>
                              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                {isSame ? 'Active Seal' : rune.label}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
