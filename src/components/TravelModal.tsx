import React from 'react';
import { X } from 'lucide-react';
import { getZoneContext } from '../game/world';
import { WorldFlags, ZoneId } from '../game/types';

interface TravelModalProps {
  currentZone: ZoneId;
  inCombatDanger: boolean;
  worldFlags: WorldFlags;
  onTravel: (zoneId: ZoneId) => void;
  onClose: () => void;
}

const BASE_DESTINATIONS: Array<{
  id: ZoneId;
  depth: number;
  name: string;
  subtitle: string;
  glyph: string;
}> = [
  { id: 'oakhaven', depth: 0, name: 'Oakhaven Outpost', subtitle: 'Timber Settlement · Torin, Mira, Vance, Vex', glyph: '⌂' },
  { id: 'overworld', depth: 0, name: 'Silverwood Vale (Overworld)', subtitle: 'Frontier Crossroads · Rowan & 4 Dungeon Trails', glyph: '♣' },
  { id: 'thornwick', depth: 0, name: 'Thornwick Fen', subtitle: 'Bog Settlement · Elder Sylva & Tinker Bram', glyph: '⌂' },
  { id: 'cinderwatch', depth: 0, name: 'Cinderwatch Bastion', subtitle: 'Volcanic Ridge Fort · Halda & Captain Darek', glyph: '⚒' },
  { id: 'highspire', depth: 0, name: 'Highspire Citadel', subtitle: 'Upper Stone City · Lyra, Corvus, Kaelen, Orin', glyph: '♜' },
  { id: 'dungeon_1', depth: 1, name: 'Sunken Reliquary · Floor 1', subtitle: 'Mossy Threshold', glyph: '>' },
  { id: 'dungeon_2', depth: 2, name: 'Sunken Reliquary · Floor 2', subtitle: 'Cantor Ossuary', glyph: '>' },
  { id: 'dungeon_3', depth: 3, name: 'Ember Vaults · Floor 3', subtitle: 'Basalt Galleries', glyph: '>' },
  { id: 'dungeon_4', depth: 4, name: 'Ember Vaults · Floor 4', subtitle: 'Inquisitor Crucible', glyph: '>' },
  { id: 'dungeon_5', depth: 5, name: 'Obsidian Sanctum · Floor 5', subtitle: 'Sovereign Throne', glyph: '◈' },
  { id: 'barrow_1', depth: 2, name: 'Whispering Barrow · Floor 1', subtitle: 'Side Dungeon · Spectral Crypts', glyph: '>' },
  { id: 'barrow_2', depth: 3, name: 'Whispering Barrow · Floor 2', subtitle: 'Arch-Wight Morvath’s Sanctum', glyph: '◈' },
  { id: 'mire_1', depth: 3, name: 'Fungal Hollow · Floor 1', subtitle: 'Side Dungeon · Spore Galleries', glyph: '>' },
  { id: 'mire_2', depth: 4, name: 'Fungal Hollow · Floor 2', subtitle: 'Spore-Matron Vexis’ Lair', glyph: '✿' },
  { id: 'frost_1', depth: 4, name: 'Frostpeak Cavern · Floor 1', subtitle: 'Side Dungeon · Rime Tunnels', glyph: '>' },
  { id: 'frost_2', depth: 5, name: 'Frostpeak Cavern · Floor 2', subtitle: 'Frozen Rune Vaults', glyph: '>' },
  { id: 'frost_3', depth: 6, name: 'Ashen Caldera · Floor 3', subtitle: 'Ignis-Warden Kaelthar’s Core', glyph: '♦' },
];

export const TravelModal: React.FC<TravelModalProps> = ({
  currentZone,
  inCombatDanger,
  worldFlags,
  onTravel,
  onClose,
}) => {
  const abyssDestinations = worldFlags.discoveredZones
    .filter((z) => z.startsWith('dungeon_') && Number(z.replace('dungeon_', '')) >= 6)
    .sort((a, b) => Number(a.replace('dungeon_', '')) - Number(b.replace('dungeon_', '')))
    .map((z) => {
      const depth = Number(z.replace('dungeon_', ''));
      return {
        id: z,
        depth,
        name: `The Endless Abyss · Floor ${depth}`,
        subtitle: 'Abyssal Depths',
        glyph: '✦',
      };
    });

  const destinations = [...BASE_DESTINATIONS, ...abyssDestinations];

  const canVisit = (id: ZoneId): { ok: boolean; reason?: string } => {
    if (id === currentZone) return { ok: false, reason: 'Current Location' };
    if (inCombatDanger) return { ok: false, reason: 'Nearby enemies block fast travel' };
    if (id === 'highspire' && !worldFlags.citadelAccess) {
      return { ok: false, reason: 'Requires Citadel Seal from Vance or Vex' };
    }
    if (id === 'dungeon_3' && (worldFlags.floor3Shortcut || worldFlags.discoveredZones.includes('dungeon_3'))) {
      return { ok: true };
    }
    if (!worldFlags.discoveredZones.includes(id)) {
      return { ok: false, reason: 'Reach on foot via Silverwood Vale first' };
    }
    return { ok: true };
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-2.5 sm:p-5">
      <div className="w-full max-w-2xl rounded-md border border-white/15 bg-[#10141D] shadow-2xl flex flex-col max-h-[90dvh]">
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-white/10 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-amber-200">Realm Waypoints</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Fast travel between towns and discovered dungeon depths when out of combat danger.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close travel map"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto rpg-scroll space-y-2.5">
          {inCombatDanger && (
            <div className="p-3 rounded border border-rose-500/40 bg-rose-950/30 text-xs text-rose-200 mb-3">
              Hostile creatures are alerted nearby. Defeat or evade them before using waypoints.
            </div>
          )}

          {destinations.map((dest) => {
            const check = canVisit(dest.id);
            const isCurrent = dest.id === currentZone;
            const ctxBrief = getZoneContext(dest.id, dest.depth);
            return (
              <div
                key={dest.id}
                className={`p-3 sm:p-3.5 rounded border flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 ${
                  isCurrent
                    ? 'border-amber-400/50 bg-amber-500/10'
                    : 'border-white/10 bg-[#141923]'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="font-mono-glyph text-lg text-amber-300 w-6 text-center shrink-0 mt-0.5">
                    {dest.glyph}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-sm font-semibold text-[#ECE4D4]">{dest.name}</span>
                      <span className="text-[11px] font-mono-glyph text-amber-300/85">{ctxBrief.recommended}</span>
                    </div>
                    <div className="text-xs text-slate-400">{dest.subtitle}</div>
                    <div className="text-[11px] text-slate-300/85 mt-1 leading-snug">{ctxBrief.lore}</div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!check.ok}
                  onClick={() => onTravel(dest.id)}
                  className="min-h-[44px] px-4 py-1.5 rounded text-xs font-medium bg-amber-500 text-[#0B0D12] hover:bg-amber-400 disabled:bg-white/8 disabled:text-slate-500 shrink-0 cursor-pointer"
                >
                  {isCurrent ? 'Here' : check.ok ? 'Travel' : check.reason}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
