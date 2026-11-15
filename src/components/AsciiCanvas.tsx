import React, { useEffect, useRef, useState } from 'react';
import { Eye, Map as MapIcon, X, ZoomIn, ZoomOut } from 'lucide-react';
import { chebyshev, findPathPoints } from '../game/combat';
import { shouldDrawTelegraphMarker } from '../game/settings';
import { SKILLS } from '../game/skills';
import {
  getCompanionSprite,
  getCritterSprite,
  getEnemySprite,
  getLootSprite,
  getNpcSprite,
  getPlayerSprite,
  getPropSprite,
} from '../game/sprites';
import {
  getAnimatedFluidTile,
  getAnimatedHazardTile,
  getBiomePalette,
  getFloorTileCanvas,
  getRoadTileCanvas,
  getSpecialStructureCanvas,
  getWallTileCanvas,
  getZoneBiome,
  pickTileVariant,
} from '../game/tileset';
import {
  CompanionState,
  Enemy,
  FloatingEffect,
  HitFlash,
  NpcPlacement,
  ParticleBurst,
  PlayerState,
  ProjectileEffect,
  SkillId,
  Tile,
  ZoneMap,
} from '../game/types';

interface AsciiCanvasProps {
  zone: ZoneMap;
  player: PlayerState;
  armedSkill: SkillId | null;
  armedInscriptionRange?: number | null;
  aimedTarget?: { x: number; y: number } | null;
  floatingEffects: FloatingEffect[];
  particles: ParticleBurst[];
  projectiles: ProjectileEffect[];
  hitFlashes: HitFlash[];
  shakeUntil: number;
  /** Controlled tile zoom (Phase 2 settings). When omitted, the canvas
   *  manages its own persisted zoom exactly as before. */
  tileSize?: number;
  /** Phase 6 accessibility: when on (the default), telegraphed danger
   *  tiles also draw a "!" marker so they are never signalled by the
   *  red colour wash alone. When off, telegraph rendering is unchanged. */
  patternSignals?: boolean;
  onTileSizeChange?: (tileSize: number) => void;
  onTileClick: (x: number, y: number) => void;
  onStep?: (dx: number, dy: number) => void;
  onCancelTargeting?: () => void;
}

interface HoverInfo {
  x: number;
  y: number;
  tile: Tile;
  enemy?: Enemy;
  npc?: NpcPlacement;
  companion?: CompanionState;
  lootLabel?: string;
  pinned?: boolean;
}

function getTileContextHint(tile: Tile): string | null {
  if (tile.used) return 'Already exhausted or collected.';
  switch (tile.kind) {
    case 'shrine':
      return 'Step onto & press ACT (E) to respec attributes, skills, or receive blessing.';
    case 'brazier':
      return 'Step onto & press ACT (E) to restore HP & Mana once.';
    case 'chest':
      return 'Step onto & press ACT (E) to pry open for gear, gold, or potions.';
    case 'vault_door':
      return 'Sealed Treasure Vault — press ACT adjacent to unseal high-tier loot & Rare guards.';
    case 'waystone':
      return 'Step onto & press ACT (E) to attune an Elven Waystone blessing or recharge runes.';
    case 'forgotten_forge':
      return 'Step onto & press ACT (E) to temper equipped gear or smelt Relic cache.';
    case 'cursed_altar':
      return 'Step onto & press ACT (E) to risk vitality for a Relic pact or purify the stone.';
    case 'lore_tablet':
      return 'Step onto & press ACT (E) to transcribe this carved stele into your Codex.';
    case 'trap':
      return tile.revealed
        ? 'Armed Spike Snare — deals piercing bleed if stepped on.'
        : 'Dangerous dungeon tile.';
    case 'dart_trap':
      return tile.revealed
        ? 'Venom Dart Snare — wall darts deal damage and Poison (3t). Agility 4+ spots and disarms it.'
        : 'Dangerous dungeon tile.';
    case 'spore_pool':
      return 'Venomous Spore Pool — Agility 3+ harvests Dust safely, else deals Poison damage.';
    case 'frost_vent':
      return 'Freezing Vent — Agility 3+ or Resolve 3+ harvests Dust, else deals Frost damage & Chill.';
    case 'ember_crust':
      return 'Molten Ember Crust — Resolve 3+ clears Dust safely, else sears with Burn.';
    case 'shock_rune':
      return 'Arcane Shock Rune — Arcana 3+ absorbs +6 Mana & Dust, else zaps HP & Mana.';
    case 'stairs_down':
      return 'Press ACT (E) or tap Descend to venture deeper.';
    case 'stairs_up':
      return 'Press ACT (E) or tap Ascend to return toward safety.';
    case 'gate_city':
      return 'Press ACT (E) to travel along the safe Citadel Road.';
    case 'herb_node':
      return 'Quest flora — step onto & press ACT (E) to harvest for Mira.';
    case 'contraband_cache':
      return 'Quest stash — step onto & press ACT (E) to recover for Vex.';
    case 'whispering_bell':
      return 'Quest relic — step onto & press ACT (E) to chime for Lyra (weakens Malakor).';
    case 'chasm':
      return 'Impassable ember fissure (can be crossed with Shadowstep or Phase Door).';
    case 'water':
      return 'Deep water — blocks walking, lets arrows and bolts pass.';
    default:
      return null;
  }
}

const ZOOM_STEPS = [28, 36, 44] as const;

interface AmbientMote {
  rx: number;
  ry: number;
  speedX: number;
  speedY: number;
  size: number;
  phase: number;
}

const AMBIENT_MOTES: AmbientMote[] = Array.from({ length: 24 }, (_, idx) => ({
  rx: ((idx * 37) % 100) / 100,
  ry: ((idx * 61) % 100) / 100,
  speedX: (idx % 2 === 0 ? 1 : -1) * (0.008 + (idx % 5) * 0.004),
  speedY: -0.009 - (idx % 4) * 0.004,
  size: idx % 3 === 0 ? 2.5 : 1.8,
  phase: idx * 0.7,
}));

export const AsciiCanvas: React.FC<AsciiCanvasProps> = ({
  zone,
  player,
  armedSkill,
  armedInscriptionRange,
  aimedTarget,
  floatingEffects,
  particles,
  projectiles,
  hitFlashes,
  shakeUntil,
  tileSize: controlledTileSize,
  patternSignals,
  onTileSizeChange,
  onTileClick,
  onStep,
  onCancelTargeting,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [internalTileSize, setInternalTileSize] = useState<number>(() => {
    // Persisted zoom preference (previously reset to 36 on every reload).
    try {
      const v = Number(localStorage.getItem('elfstory-tile-size'));
      if (ZOOM_STEPS.includes(v as (typeof ZOOM_STEPS)[number])) return v;
    } catch {
      // storage unavailable — use default
    }
    return 36;
  });

  // Controlled when App passes tileSize (settings menu); otherwise internal.
  const tileSize = controlledTileSize ?? internalTileSize;
  const setTileSize = (next: number) => {
    if (onTileSizeChange) onTileSizeChange(next);
    else setInternalTileSize(next);
  };

  useEffect(() => {
    try {
      localStorage.setItem('elfstory-tile-size', String(tileSize));
    } catch {
      // ignore — preference just won't persist
    }
  }, [tileSize]);
  const [showMobileMap, setShowMobileMap] = useState<boolean>(false);
  const [inspectMode, setInspectMode] = useState<boolean>(false);

  const touchRef = useRef<{
    startX: number;
    startY: number;
    swipeUsed: boolean;
    longPressTimer: number | null;
    longPressUsed: boolean;
  }>({
    startX: 0,
    startY: 0,
    swipeUsed: false,
    longPressTimer: null,
    longPressUsed: false,
  });

  const stateRef = useRef({
    zone,
    player,
    armedSkill,
    armedInscriptionRange: armedInscriptionRange ?? null,
    aimedTarget: aimedTarget ?? null,
    floatingEffects,
    particles,
    projectiles,
    hitFlashes,
    shakeUntil,
    patternSignals: patternSignals ?? true,
    tileSize: 36,
    showMobileMap: false,
    hoverCoord: null as { x: number; y: number } | null,
    hoverPath: [] as Array<{ x: number; y: number }>,
    camX: player.x,
    camY: player.y,
  });

  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

  useEffect(() => {
    stateRef.current.zone = zone;
    stateRef.current.player = player;
    stateRef.current.armedSkill = armedSkill;
    stateRef.current.armedInscriptionRange = armedInscriptionRange ?? null;
    stateRef.current.aimedTarget = aimedTarget ?? null;
    stateRef.current.floatingEffects = floatingEffects;
    stateRef.current.particles = particles;
    stateRef.current.projectiles = projectiles;
    stateRef.current.hitFlashes = hitFlashes;
    stateRef.current.shakeUntil = shakeUntil;
    stateRef.current.patternSignals = patternSignals ?? true;
    stateRef.current.tileSize = tileSize;
    stateRef.current.showMobileMap = showMobileMap;

    if (stateRef.current.hoverCoord && !armedSkill && !armedInscriptionRange) {
      stateRef.current.hoverPath = findPathPoints(
        zone,
        player.x,
        player.y,
        stateRef.current.hoverCoord.x,
        stateRef.current.hoverCoord.y,
        true,
        16
      );
    } else {
      stateRef.current.hoverPath = [];
    }
  }, [zone, player, armedSkill, armedInscriptionRange, aimedTarget, floatingEffects, particles, projectiles, hitFlashes, shakeUntil, patternSignals, tileSize, showMobileMap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let animId = 0;
    let lastTime = performance.now();
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const isWallAt = (z: ZoneMap, x: number, y: number) =>
      x < 0 || y < 0 || x >= z.width || y >= z.height || z.tiles[y][x].kind === 'wall';

    const render = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      const dt = Math.min(rawDt, 0.05);
      lastTime = now;

      const s = stateRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animId = requestAnimationFrame(render);
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewW = canvas.width / dpr;
      const viewH = canvas.height / dpr;
      const TILE_SIZE = s.tileSize;

      const lerpFactor = reduceMotion ? 1 : Math.min(1, dt * 12);
      s.camX += (s.player.x - s.camX) * lerpFactor;
      s.camY += (s.player.y - s.camY) * lerpFactor;

      let shakeX = 0;
      let shakeY = 0;
      if (!reduceMotion && now < s.shakeUntil) {
        const mag = ((s.shakeUntil - now) / 180) * 6;
        shakeX = (Math.random() - 0.5) * mag;
        shakeY = (Math.random() - 0.5) * mag;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = false;

      const biome = getZoneBiome(s.zone.id, s.zone.depth);
      const palette = getBiomePalette(biome);
      const isDeep = s.zone.depth >= 3;
      const isAbyss = s.zone.depth >= 5;

      ctx.fillStyle = palette.voidBg;
      ctx.fillRect(0, 0, viewW, viewH);

      const offsetX = Math.round(viewW / 2 - (s.camX + 0.5) * TILE_SIZE + shakeX);
      const offsetY = Math.round(viewH / 2 - (s.camY + 0.5) * TILE_SIZE + shakeY);

      const minCol = Math.max(0, Math.floor(-offsetX / TILE_SIZE) - 1);
      const maxCol = Math.min(s.zone.width - 1, Math.ceil((viewW - offsetX) / TILE_SIZE) + 1);
      const minRow = Math.max(0, Math.floor(-offsetY / TILE_SIZE) - 1);
      const maxRow = Math.min(s.zone.height - 1, Math.ceil((viewH - offsetY) / TILE_SIZE) + 1);

      const animFrame = reduceMotion ? 0 : Math.floor(now / 280);
      const spriteFrame = reduceMotion ? 0 : Math.floor(now / 380) % 2;

      const lights: Array<{
        x: number;
        y: number;
        radius: number;
        r: number;
        g: number;
        b: number;
        alpha: number;
        phase: number;
      }> = [];
      lights.push({
        x: s.player.x,
        y: s.player.y,
        radius: 5.8,
        r: isAbyss ? 192 : 245,
        g: isAbyss ? 132 : 168,
        b: isAbyss ? 252 : 42,
        alpha: 0.15,
        phase: 0.4,
      });

      const emberSources: Array<{ x: number; y: number; r: number; g: number; b: number }> = [];

      for (let y = minRow; y <= maxRow; y++) {
        for (let x = minCol; x <= maxCol; x++) {
          const tile = s.zone.tiles[y][x];
          if (!tile.visible) continue;
          const phase = (x * 17 + y * 31) * 0.23;
          if (tile.kind === 'torch' || (tile.kind === 'brazier' && !tile.used)) {
            lights.push({
              x,
              y,
              radius: 3.6,
              r: isAbyss ? 168 : 251,
              g: isAbyss ? 85 : 146,
              b: isAbyss ? 247 : 56,
              alpha: 0.23,
              phase,
            });
            emberSources.push({ x, y, r: isAbyss ? 192 : 253, g: isAbyss ? 132 : 186, b: isAbyss ? 252 : 116 });
          } else if (tile.kind === 'forgotten_forge' && !tile.used) {
            lights.push({
              x,
              y,
              radius: 4.1,
              r: 249,
              g: 115,
              b: 22,
              alpha: 0.26,
              phase,
            });
            emberSources.push({ x, y, r: 251, g: 146, b: 60 });
          } else if (tile.kind === 'waystone' && !tile.used) {
            lights.push({
              x,
              y,
              radius: 4.0,
              r: 56,
              g: 189,
              b: 248,
              alpha: 0.24,
              phase,
            });
            emberSources.push({ x, y, r: 125, g: 211, b: 252 });
          } else if (tile.kind === 'cursed_altar' && !tile.used) {
            lights.push({
              x,
              y,
              radius: 3.6,
              r: 192,
              g: 132,
              b: 252,
              alpha: 0.22,
              phase,
            });
          } else if (tile.kind === 'shrine' || tile.kind === 'whispering_bell') {
            lights.push({
              x,
              y,
              radius: 3.4,
              r: 96,
              g: 165,
              b: 250,
              alpha: 0.22,
              phase,
            });
          } else if (tile.kind === 'vault_door') {
            lights.push({
              x,
              y,
              radius: 2.8,
              r: 245,
              g: 158,
              b: 11,
              alpha: 0.2,
              phase,
            });
          } else if (tile.kind === 'chasm') {
            lights.push({
              x,
              y,
              radius: 2.3,
              r: 234,
              g: 88,
              b: 12,
              alpha: 0.16,
              phase,
            });
          }
        }
      }

      const telegraphedKeys = new Set<string>();
      for (const enemy of s.zone.enemies) {
        if (enemy.intent && s.zone.tiles[enemy.y]?.[enemy.x]?.visible) {
          for (const t of enemy.intent.targetTiles) {
            telegraphedKeys.add(`${t.x},${t.y}`);
          }
        }
      }

      // === 1. TERRAIN & MULTI-BIOME AUTOTILED ARCHITECTURE ===
      for (let y = minRow; y <= maxRow; y++) {
        for (let x = minCol; x <= maxCol; x++) {
          const tile = s.zone.tiles[y][x];
          if (!tile.explored) continue;

          const px = offsetX + x * TILE_SIZE;
          const py = offsetY + y * TILE_SIZE;

          if (tile.kind === 'wall') {
            const southOpen = y + 1 < s.zone.height && s.zone.tiles[y + 1][x].kind !== 'wall';
            const northWall = isWallAt(s.zone, x, y - 1);
            const westWall = isWallAt(s.zone, x - 1, y);
            const eastWall = isWallAt(s.zone, x + 1, y);
            const nwOpenCorner = northWall && westWall && !isWallAt(s.zone, x - 1, y - 1);
            const neOpenCorner = northWall && eastWall && !isWallAt(s.zone, x + 1, y - 1);
            const variant = pickTileVariant(x, y, 12);
            const wallCanvas = getWallTileCanvas(
              biome,
              TILE_SIZE,
              northWall,
              southOpen,
              westWall,
              eastWall,
              nwOpenCorner,
              neOpenCorner,
              variant
            );
            ctx.drawImage(wallCanvas, px, py);
          } else {
            const propVariant = pickTileVariant(x, y, 6);
            if (tile.kind === 'road') {
              const roadCanvas = getRoadTileCanvas(biome, TILE_SIZE, pickTileVariant(x, y, 8));
              ctx.drawImage(roadCanvas, px, py);

              // Subtle cobblestone curb edges against grass/floor
              const kN = s.zone.tiles[y - 1]?.[x]?.kind;
              const kS = s.zone.tiles[y + 1]?.[x]?.kind;
              const kW = s.zone.tiles[y]?.[x - 1]?.kind;
              const kE = s.zone.tiles[y]?.[x + 1]?.kind;
              ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
              if (kN && kN !== 'road' && kN !== 'wall') ctx.fillRect(px, py, TILE_SIZE, 2);
              if (kS && kS !== 'road' && kS !== 'wall') ctx.fillRect(px, py + TILE_SIZE - 2, TILE_SIZE, 2);
              if (kW && kW !== 'road' && kW !== 'wall') ctx.fillRect(px, py, 2, TILE_SIZE);
              if (kE && kE !== 'road' && kE !== 'wall') ctx.fillRect(px + TILE_SIZE - 2, py, 2, TILE_SIZE);
            } else if (tile.kind === 'water' || tile.kind === 'fountain' || tile.kind === 'chasm') {
              const fluidCanvas = getAnimatedFluidTile(
                tile.kind,
                TILE_SIZE,
                animFrame + ((x * 3 + y * 5) % 6)
              );
              ctx.drawImage(fluidCanvas, px, py);

              // Shoreline bank / chasm overhang rim transitions
              const isSameFluid = (nx: number, ny: number) => {
                const nk = s.zone.tiles[ny]?.[nx]?.kind;
                return nk === tile.kind || (tile.kind === 'water' && nk === 'fountain');
              };
              const bankColor =
                tile.kind === 'chasm'
                  ? 'rgba(251, 146, 60, 0.34)'
                  : 'rgba(186, 230, 253, 0.24)';
              const rimColor =
                tile.kind === 'chasm' ? 'rgba(9, 6, 8, 0.72)' : 'rgba(12, 24, 38, 0.56)';
              if (!isSameFluid(x, y - 1)) {
                ctx.fillStyle = rimColor;
                ctx.fillRect(px, py, TILE_SIZE, 3);
                ctx.fillStyle = bankColor;
                ctx.fillRect(px, py + 3, TILE_SIZE, 1);
              }
              if (!isSameFluid(x, y + 1)) {
                ctx.fillStyle = rimColor;
                ctx.fillRect(px, py + TILE_SIZE - 2, TILE_SIZE, 2);
                ctx.fillStyle = bankColor;
                ctx.fillRect(px, py + TILE_SIZE - 3, TILE_SIZE, 1);
              }
              if (!isSameFluid(x - 1, y)) {
                ctx.fillStyle = rimColor;
                ctx.fillRect(px, py, 2, TILE_SIZE);
                ctx.fillStyle = bankColor;
                ctx.fillRect(px + 2, py, 1, TILE_SIZE);
              }
              if (!isSameFluid(x + 1, y)) {
                ctx.fillStyle = rimColor;
                ctx.fillRect(px + TILE_SIZE - 2, py, 2, TILE_SIZE);
                ctx.fillStyle = bankColor;
                ctx.fillRect(px + TILE_SIZE - 3, py, 1, TILE_SIZE);
              }
            } else {
              const isVaultInterior = tile.color === '#4D3D2C';
              const floorCanvas = getFloorTileCanvas(
                biome,
                TILE_SIZE,
                pickTileVariant(x, y, 16),
                isVaultInterior
              );
              ctx.drawImage(floorCanvas, px, py);

              if (tile.color === '#284552') {
                ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
              } else if (tile.color === '#452A21') {
                ctx.fillStyle = 'rgba(249, 115, 22, 0.08)';
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
              } else if (tile.color === '#342347') {
                ctx.fillStyle = 'rgba(192, 132, 252, 0.08)';
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
              }
            }

            // 2.5D Wall ambient occlusion shadows (north + west corners)
            const wallNorth = y > 0 && s.zone.tiles[y - 1][x].kind === 'wall';
            const wallWest = x > 0 && s.zone.tiles[y][x - 1].kind === 'wall';
            if (wallNorth) {
              const gradN = ctx.createLinearGradient(px, py, px, py + 9);
              gradN.addColorStop(0, 'rgba(0, 0, 0, 0.56)');
              gradN.addColorStop(1, 'rgba(0, 0, 0, 0)');
              ctx.fillStyle = gradN;
              ctx.fillRect(px, py, TILE_SIZE, 9);
            }
            if (wallWest) {
              const gradW = ctx.createLinearGradient(px, py, px + 6, py);
              gradW.addColorStop(0, 'rgba(0, 0, 0, 0.36)');
              gradW.addColorStop(1, 'rgba(0, 0, 0, 0)');
              ctx.fillStyle = gradW;
              ctx.fillRect(px, py, 6, TILE_SIZE);
            }

            if (tile.kind === 'market_stall' || tile.kind === 'gate_city') {
              const structCanvas = getSpecialStructureCanvas(tile.kind, TILE_SIZE, tile.used);
              ctx.drawImage(structCanvas, px, py);
            } else if (tile.kind === 'trap' && tile.revealed) {
              const trapCanvas = getSpecialStructureCanvas('trap', TILE_SIZE, tile.used);
              ctx.drawImage(trapCanvas, px, py);
            } else if (tile.kind === 'dart_trap' && tile.revealed) {
              const dartCanvas = getSpecialStructureCanvas('dart_trap', TILE_SIZE, tile.used);
              ctx.drawImage(dartCanvas, px, py);
            } else if (
              (tile.kind === 'spore_pool' ||
                tile.kind === 'frost_vent' ||
                tile.kind === 'ember_crust' ||
                tile.kind === 'shock_rune') &&
              !tile.used
            ) {
              const hazardCanvas = getAnimatedHazardTile(
                tile.kind,
                TILE_SIZE,
                animFrame + ((x + y) % 4)
              );
              ctx.drawImage(hazardCanvas, px, py);
            }

            const propSprite = getPropSprite(tile.kind, tile.used, animFrame, isDeep, propVariant);
            if (propSprite) {
              ctx.drawImage(propSprite, px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            }

            if (tile.kind === 'vault_door') {
              ctx.strokeStyle = 'rgba(245, 158, 11, 0.48)';
              ctx.lineWidth = 1;
              ctx.strokeRect(px + 1.5, py + 1.5, TILE_SIZE - 3, TILE_SIZE - 3);
            }
          }

          // Fog-of-war memory veil for explored-but-not-currently-visible tiles
          if (!tile.visible) {
            ctx.fillStyle = 'rgba(7, 10, 18, 0.68)';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          }

          if (tile.visible && telegraphedKeys.has(`${x},${y}`)) {
            const pulse = 0.24 + Math.sin(now * 0.01) * 0.1;
            ctx.fillStyle = `rgba(239, 68, 68, ${pulse.toFixed(2)})`;
            ctx.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
            ctx.strokeStyle = 'rgba(248, 113, 113, 0.9)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(px + 1.5, py + 1.5, TILE_SIZE - 3, TILE_SIZE - 3);
            // Phase 6 pattern signals: a "!" glyph over the colour wash,
            // so a telegraphed tile reads as danger without relying on
            // red alone. Off = the wash exactly as before.
            if (shouldDrawTelegraphMarker(s.patternSignals, true)) {
              ctx.fillStyle = 'rgba(254, 242, 242, 0.95)';
              ctx.font = `700 ${Math.max(10, Math.round(TILE_SIZE * 0.52))}px "JetBrains Mono", monospace`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('!', px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 1);
            }
          }

          if (s.armedSkill && tile.visible && tile.walkable) {
            const sk = SKILLS[s.armedSkill];
            const dist = chebyshev(s.player.x, s.player.y, x, y);
            if (dist > 0 && dist <= sk.range) {
              ctx.fillStyle =
                sk.branch === 'runecaster'
                  ? 'rgba(91, 141, 239, 0.12)'
                  : sk.branch === 'shadowcraft'
                    ? 'rgba(78, 168, 133, 0.12)'
                    : 'rgba(217, 83, 79, 0.12)';
              ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
              ctx.strokeStyle =
                sk.branch === 'runecaster'
                  ? 'rgba(91, 141, 239, 0.72)'
                  : sk.branch === 'shadowcraft'
                    ? 'rgba(78, 168, 133, 0.72)'
                    : 'rgba(217, 83, 79, 0.72)';
              ctx.lineWidth = 1.5;
              ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            }
          } else if (s.armedInscriptionRange && tile.visible && tile.walkable) {
            const dist = chebyshev(s.player.x, s.player.y, x, y);
            if (dist > 0 && dist <= s.armedInscriptionRange) {
              ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
              ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
              ctx.strokeStyle = 'rgba(56, 189, 248, 0.78)';
              ctx.lineWidth = 1.5;
              ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            }
          }

          if (s.hoverCoord && s.hoverCoord.x === x && s.hoverCoord.y === y) {
            ctx.strokeStyle = 'rgba(253, 246, 227, 0.78)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
          }

          if ((s.armedSkill || s.armedInscriptionRange) && s.aimedTarget && s.aimedTarget.x === x && s.aimedTarget.y === y) {
            const retPulse = 0.65 + (reduceMotion ? 0.2 : Math.sin(now * 0.012) * 0.25);
            ctx.strokeStyle = `rgba(253, 224, 71, ${retPulse.toFixed(2)})`;
            ctx.lineWidth = 2.5;
            ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            const cxT = px + TILE_SIZE / 2;
            const cyT = py + TILE_SIZE / 2;
            ctx.beginPath();
            ctx.moveTo(cxT - 5, cyT);
            ctx.lineTo(cxT + 5, cyT);
            ctx.moveTo(cxT, cyT - 5);
            ctx.lineTo(cxT, cyT + 5);
            ctx.stroke();
          }
        }
      }

      // === 1.3 SMOOTH PER-SOURCE FLICKERING TORCH / WAYSTONE / FORGE LIGHTING ===
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const l of lights) {
        const localFlicker = reduceMotion
          ? 0.94
          : 0.84 +
            Math.sin(now * 0.0065 + l.phase) * 0.1 +
            Math.cos(now * 0.015 + l.phase * 1.7) * 0.06;
        const lx = offsetX + (l.x + 0.5) * TILE_SIZE;
        const ly = offsetY + (l.y + 0.5) * TILE_SIZE;
        const radPx = l.radius * TILE_SIZE * (0.95 + localFlicker * 0.08);
        const effAlpha = l.alpha * localFlicker;
        const grad = ctx.createRadialGradient(lx, ly, 2, lx, ly, radPx);
        grad.addColorStop(0, `rgba(${l.r}, ${l.g}, ${l.b}, ${effAlpha.toFixed(3)})`);
        grad.addColorStop(0.5, `rgba(${l.r}, ${l.g}, ${l.b}, ${(effAlpha * 0.44).toFixed(3)})`);
        grad.addColorStop(1, `rgba(${l.r}, ${l.g}, ${l.b}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(lx, ly, radPx, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // === 1.35 RISING EMBER & STARLIGHT SPARKS FROM LIGHT SOURCES ===
      if (!reduceMotion && emberSources.length > 0) {
        for (const src of emberSources) {
          for (let k = 0; k < 2; k++) {
            const t = ((now * 0.0008 + src.x * 0.37 + src.y * 0.53 + k * 0.5) % 1);
            const sx =
              offsetX +
              (src.x + 0.5) * TILE_SIZE +
              Math.sin(t * Math.PI * 2 + src.x + k) * (TILE_SIZE * 0.18);
            const sy = offsetY + (src.y + 0.48 - t * 0.65) * TILE_SIZE;
            const alpha = Math.sin(t * Math.PI) * 0.7;
            ctx.fillStyle = `rgba(${src.r}, ${src.g}, ${src.b}, ${alpha.toFixed(2)})`;
            ctx.fillRect(sx - 1, sy - 1, 2.2, 2.2);
          }
        }
      }

      // === 1.4 SUBTLE DUNGEON SIGHT VIGNETTE ===
      if (!s.zone.isTown) {
        const pxCenter = offsetX + (s.player.x + 0.5) * TILE_SIZE;
        const pyCenter = offsetY + (s.player.y + 0.5) * TILE_SIZE;
        const vig = ctx.createRadialGradient(
          pxCenter,
          pyCenter,
          TILE_SIZE * 4.5,
          pxCenter,
          pyCenter,
          TILE_SIZE * 9.5
        );
        vig.addColorStop(0, 'rgba(5, 7, 12, 0)');
        vig.addColorStop(1, 'rgba(5, 7, 12, 0.42)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, viewW, viewH);
      }

      // === 1.5 MOUSE-PATH PREVIEW ===
      if (!s.armedSkill && !s.armedInscriptionRange && s.hoverPath.length > 0) {
        for (let i = 0; i < s.hoverPath.length; i++) {
          const step = s.hoverPath[i];
          const px = offsetX + (step.x + 0.5) * TILE_SIZE;
          const py = offsetY + (step.y + 0.5) * TILE_SIZE;
          const isEnd = i === s.hoverPath.length - 1;
          ctx.fillStyle =
            i === 0
              ? 'rgba(245, 158, 11, 0.88)'
              : isEnd
                ? 'rgba(253, 246, 227, 0.85)'
                : 'rgba(253, 246, 227, 0.42)';
          ctx.beginPath();
          ctx.arc(px, py, isEnd ? 4.2 : 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // === 2. GROUND LOOT ===
      for (const drop of s.zone.loot) {
        const tile = s.zone.tiles[drop.y]?.[drop.x];
        if (!tile?.visible) continue;
        const px = offsetX + drop.x * TILE_SIZE;
        const py = offsetY + drop.y * TILE_SIZE;
        const cx = px + TILE_SIZE / 2;
        const cy = py + TILE_SIZE / 2;
        const bob = reduceMotion ? 0 : Math.sin(now * 0.005 + drop.x) * 1.5;

        const rarity = drop.item?.rarity;
        if (rarity === 'Rare' || rarity === 'Epic' || rarity === 'Relic') {
          const gleamColor =
            rarity === 'Relic'
              ? 'rgba(245, 158, 11, 0.34)'
              : rarity === 'Epic'
                ? 'rgba(192, 132, 252, 0.32)'
                : 'rgba(96, 165, 250, 0.28)';
          const gleam = ctx.createRadialGradient(cx, cy, 2, cx, cy, TILE_SIZE * 0.48);
          gleam.addColorStop(0, gleamColor);
          gleam.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = gleam;
          ctx.beginPath();
          ctx.arc(cx, cy, TILE_SIZE * 0.48, 0, Math.PI * 2);
          ctx.fill();
        }

        const sprite = getLootSprite(drop.item);
        ctx.drawImage(sprite, px + 5, py + 5 + bob, TILE_SIZE - 10, TILE_SIZE - 10);
      }

      // === 2.5 CRITTERS (Phase 3 ambient wildlife — purely decorative) ===
      for (const critter of s.zone.critters ?? []) {
        const ctile = s.zone.tiles[critter.y]?.[critter.x];
        if (!ctile?.visible && !(s.zone.id === 'overworld' && ctile?.explored)) continue;
        const px = offsetX + critter.x * TILE_SIZE;
        const py = offsetY + critter.y * TILE_SIZE;
        const critterSprite = getCritterSprite(critter.kind, spriteFrame + critter.x + critter.y);
        ctx.drawImage(critterSprite, px + 5, py + 6, TILE_SIZE - 10, TILE_SIZE - 10);
      }

      // === 3. NPCS ===
      for (const npc of s.zone.npcs) {
        const px = offsetX + npc.x * TILE_SIZE;
        const py = offsetY + npc.y * TILE_SIZE;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
        ctx.beginPath();
        ctx.ellipse(px + TILE_SIZE / 2, py + TILE_SIZE - 4, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        const npcSprite = getNpcSprite(npc.id, npc.color);
        ctx.drawImage(npcSprite, px + 2, py + 1, TILE_SIZE - 4, TILE_SIZE - 4);
      }

      // === 4. ENEMIES & BOSSES ===
      for (const enemy of s.zone.enemies) {
        const tile = s.zone.tiles[enemy.y]?.[enemy.x];
        if (!tile?.visible) continue;
        const px = offsetX + enemy.x * TILE_SIZE;
        const py = offsetY + enemy.y * TILE_SIZE;
        const cx = px + TILE_SIZE / 2;
        const cy = py + TILE_SIZE / 2;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(cx, py + TILE_SIZE - 4, enemy.isBoss ? 13 : 10, 4.2, 0, 0, Math.PI * 2);
        ctx.fill();

        if (enemy.isBoss || enemy.isElite || enemy.rank === 'rare' || enemy.rank === 'randboss') {
          ctx.strokeStyle =
            enemy.isBoss || enemy.rank === 'randboss'
              ? 'rgba(245, 158, 11, 0.88)'
              : enemy.rank === 'rare'
                ? 'rgba(56, 189, 248, 0.85)'
                : 'rgba(192, 132, 252, 0.6)';
          ctx.lineWidth = enemy.rank === 'randboss' ? 2 : 1.5;
          ctx.beginPath();
          ctx.ellipse(cx, py + TILE_SIZE - 4, 14, 5.2, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        const isShielded = enemy.statuses.some((st) => st.kind === 'shielded') || enemy.runeCharge;
        if (isShielded) {
          ctx.strokeStyle = enemy.runeCharge ? 'rgba(56, 189, 248, 0.65)' : 'rgba(96, 165, 250, 0.72)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx, cy, TILE_SIZE * 0.42, 0, Math.PI * 2);
          ctx.stroke();
        }

        const enemyAnim = (spriteFrame + (enemy.x + enemy.y)) % 2;
        const sprite = getEnemySprite(enemy.archetype, enemyAnim);
        const pad = enemy.isBoss || enemy.rank === 'randboss' ? 0 : 2;
        const stunned = enemy.statuses.some((st) => st.kind === 'stunned');
        const enemyBob =
          reduceMotion || stunned
            ? 0
            : enemy.archetype === 'cinder_wisp' || enemy.archetype === 'dread_wraith'
              ? Math.sin(now * 0.006 + enemy.x) * 2
              : 0;
        ctx.globalAlpha = stunned ? 0.65 : 1;
        ctx.drawImage(sprite, px + pad, py + pad - 1 + enemyBob, TILE_SIZE - pad * 2, TILE_SIZE - pad * 2);
        ctx.globalAlpha = 1;

        if (enemy.rank === 'randboss' || enemy.rank === 'rare') {
          const isRandboss = enemy.rank === 'randboss';
          ctx.fillStyle = isRandboss ? '#F59E0B' : '#38BDF8';
          ctx.fillRect(px + 1, py + 1, 10, 10);
          ctx.font = '700 8px "JetBrains Mono", monospace';
          ctx.fillStyle = '#090B10';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(isRandboss ? '♛' : '◆', px + 6, py + 6);
        }

        if (enemy.hp < enemy.maxHp) {
          const barW = TILE_SIZE - 6;
          const ratio = Math.max(0, enemy.hp / enemy.maxHp);
          ctx.fillStyle = 'rgba(0,0,0,0.85)';
          ctx.fillRect(px + 3, py + TILE_SIZE - 4, barW, 3);
          ctx.fillStyle = '#EF4444';
          ctx.fillRect(px + 3, py + TILE_SIZE - 4, barW * ratio, 3);
        }

        if (enemy.intent) {
          ctx.fillStyle = '#EF4444';
          ctx.fillRect(px + TILE_SIZE - 9, py + 1, 8, 10);
          ctx.font = '700 10px "JetBrains Mono", monospace';
          ctx.fillStyle = '#FEF2F2';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('!', px + TILE_SIZE - 5, py + 6);
        }
      }

      // === 4.5 SPIRIT COMPANION SPRITE ===
      if (
        !s.zone.isTown &&
        s.player.companion &&
        s.player.companion.hp > 0 &&
        s.player.companion.respawnCooldown === 0 &&
        s.player.companion.stance !== 'recall'
      ) {
        const comp = s.player.companion;
        const cTile = s.zone.tiles[comp.y]?.[comp.x];
        if (cTile?.visible) {
          const px = offsetX + comp.x * TILE_SIZE;
          const py = offsetY + comp.y * TILE_SIZE;
          const cx = px + TILE_SIZE / 2;
          const cy = py + TILE_SIZE / 2;

          ctx.fillStyle = 'rgba(0, 0, 0, 0.44)';
          ctx.beginPath();
          ctx.ellipse(cx, py + TILE_SIZE - 5, 9, 3.5, 0, 0, Math.PI * 2);
          ctx.fill();

          const compSprite = getCompanionSprite(comp.kind, spriteFrame);
          const compBob =
            reduceMotion
              ? 0
              : comp.kind === 'starlight_owl'
                ? Math.sin(now * 0.007) * 2
                : Math.sin(now * 0.006) > 0.35
                  ? -1
                  : 0;
          ctx.drawImage(compSprite, px + 3, py + 2 + compBob, TILE_SIZE - 6, TILE_SIZE - 6);

          if (comp.hp < comp.maxHp) {
            const barW = TILE_SIZE - 8;
            const ratio = Math.max(0, comp.hp / comp.maxHp);
            ctx.fillStyle = 'rgba(0,0,0,0.85)';
            ctx.fillRect(px + 4, py + TILE_SIZE - 4, barW, 2.5);
            ctx.fillStyle = '#38BDF8';
            ctx.fillRect(px + 4, py + TILE_SIZE - 4, barW * ratio, 2.5);
          }
          void cy;
        }
      }

      // === 5. LAYERED ELF HERO SPRITE (GARTH ELFSTROM) ===
      {
        const px = offsetX + s.player.x * TILE_SIZE;
        const py = offsetY + s.player.y * TILE_SIZE;
        const cx = px + TILE_SIZE / 2;
        const cy = py + TILE_SIZE / 2;

        const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 28);
        grad.addColorStop(0, 'rgba(245, 158, 11, 0.28)');
        grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, 28, 0, Math.PI * 2);
        ctx.fill();

        const hasWard = s.player.statuses.some((st) => st.kind === 'shielded' || st.kind === 'spine_guard');
        if (hasWard) {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.78)';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(cx, cy, TILE_SIZE * 0.46, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = 'rgba(0, 0, 0, 0.54)';
        ctx.beginPath();
        ctx.ellipse(cx, py + TILE_SIZE - 4, 11, 4.2, 0, 0, Math.PI * 2);
        ctx.fill();

        const { body, weapon } = getPlayerSprite(s.player, spriteFrame);
        const bob = reduceMotion ? 0 : Math.sin(now * 0.005) > 0.3 ? -1 : 0;
        const facingLeft = s.player.lastDirX === -1;
        ctx.save();
        if (facingLeft) {
          ctx.translate(cx, py);
          ctx.scale(-1, 1);
          ctx.drawImage(body, -TILE_SIZE / 2 + 2, 1 + bob, TILE_SIZE - 4, TILE_SIZE - 4);
          ctx.drawImage(weapon, -TILE_SIZE / 2 + 3, 1 + bob, TILE_SIZE - 4, TILE_SIZE - 4);
        } else {
          ctx.drawImage(body, px + 2, py + 1 + bob, TILE_SIZE - 4, TILE_SIZE - 4);
          ctx.drawImage(weapon, px + 3, py + 1 + bob, TILE_SIZE - 4, TILE_SIZE - 4);
        }
        ctx.restore();
      }

      // === 5.5 SPRITE HIT-FLASH OVERLAYS ===
      for (const hf of s.hitFlashes) {
        if (now > hf.until) continue;
        const px = offsetX + hf.x * TILE_SIZE;
        const py = offsetY + hf.y * TILE_SIZE;
        const alpha = Math.min(0.82, ((hf.until - now) / 140) * 0.82);
        ctx.fillStyle = hf.color === 'white' ? `rgba(255,255,255,${alpha.toFixed(2)})` : hf.color;
        ctx.globalAlpha = hf.color === 'white' ? 1 : alpha;
        ctx.fillRect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6);
        ctx.globalAlpha = 1;
      }

      // === 5.8 ANIMATED PROJECTILE STREAKS ===
      for (const proj of s.projectiles) {
        const age = now - proj.createdAt;
        if (age > proj.duration) continue;
        const t = age / proj.duration;
        const tailT = Math.max(0, t - 0.25);
        const sx = offsetX + (proj.fromX + 0.5 + (proj.toX - proj.fromX) * tailT) * TILE_SIZE;
        const sy = offsetY + (proj.fromY + 0.5 + (proj.toY - proj.fromY) * tailT) * TILE_SIZE;
        const ex = offsetX + (proj.fromX + 0.5 + (proj.toX - proj.fromX) * t) * TILE_SIZE;
        const ey = offsetY + (proj.fromY + 0.5 + (proj.toY - proj.fromY) * t) * TILE_SIZE;

        ctx.strokeStyle = proj.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(ex - 3, ey - 3, 6, 6);
        ctx.fillStyle = proj.color;
        ctx.fillRect(ex - 2, ey - 2, 4, 4);
      }

      // === 6. PARTICLE BURSTS & FLOATING COMBAT NUMBERS ===
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (const p of s.particles) {
        const age = now - p.createdAt;
        if (age > p.duration) continue;
        const t = age / p.duration;
        const px = offsetX + (p.x + 0.5 + p.vx * t * 1.4) * TILE_SIZE;
        const py = offsetY + (p.y + 0.5 + p.vy * t * 1.4) * TILE_SIZE;
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle = p.color;
        ctx.fillRect(px - 2, py - 2, 4, 4);
        ctx.globalAlpha = 1;
      }

      for (const fx of s.floatingEffects) {
        const age = now - fx.createdAt;
        if (age > fx.duration) continue;
        const t = age / fx.duration;
        const fxX = offsetX + (fx.x + 0.5) * TILE_SIZE;
        const fxY = offsetY + (fx.y + 0.15) * TILE_SIZE - t * 26;
        ctx.globalAlpha = Math.min(1, (1 - t) * 1.45);
        ctx.font = '700 12px "JetBrains Mono", monospace';
        ctx.fillStyle = '#090B10';
        ctx.fillText(fx.text, fxX + 1, fxY + 1);
        ctx.fillStyle = fx.color;
        ctx.fillText(fx.text, fxX, fxY);
        ctx.globalAlpha = 1;
      }

      // === 6.5 AMBIENT BIOME FLOATING MOTES & SUBTLE VIGNETTE ===
      if (!reduceMotion) {
        const sec = now * 0.001;
        const moteColor =
          biome === 'oakhaven' || biome === 'overworld'
            ? 'rgba(110, 231, 183, 0.28)'
            : biome === 'thornwick'
              ? 'rgba(45, 212, 191, 0.30)'
              : biome === 'cinderwatch' || biome === 'ember'
                ? 'rgba(251, 146, 60, 0.34)'
                : biome === 'highspire'
                  ? 'rgba(253, 224, 71, 0.24)'
                  : biome === 'abyss'
                    ? 'rgba(192, 132, 252, 0.32)'
                    : 'rgba(148, 163, 184, 0.22)';
        ctx.fillStyle = moteColor;
        for (const m of AMBIENT_MOTES) {
          const mx = ((m.rx + sec * m.speedX + 10) % 1) * viewW;
          const my = ((m.ry + sec * m.speedY + 10) % 1) * viewH;
          const pulse = 0.5 + 0.5 * Math.sin(sec * 2 + m.phase);
          ctx.globalAlpha = pulse * 0.85;
          ctx.fillRect(Math.round(mx), Math.round(my), m.size, m.size);
        }
        ctx.globalAlpha = 1;
      }

      const vig = ctx.createRadialGradient(
        viewW / 2,
        viewH / 2,
        Math.min(viewW, viewH) * 0.32,
        viewW / 2,
        viewH / 2,
        Math.max(viewW, viewH) * 0.72
      );
      vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vig.addColorStop(1, 'rgba(5, 7, 12, 0.52)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, viewW, viewH);

      // === 7. NON-OCCLUDING CORNER MINIMAP (Desktop bottom-right or Mobile toggle top-right) ===
      const showDesktopMap = viewW >= 768 && viewH >= 320;
      const showCompactMobileMap = viewW < 768 && s.showMobileMap;
      if (showDesktopMap || showCompactMobileMap) {
        const cell = showDesktopMap ? 3 : 2.5;
        const mmW = s.zone.width * cell;
        const mmH = s.zone.height * cell;
        const mmX = viewW - mmW - (showDesktopMap ? 14 : 10);
        const mmY = showDesktopMap ? viewH - mmH - 14 : 48;

        ctx.fillStyle = 'rgba(9, 11, 16, 0.9)';
        ctx.fillRect(mmX - 4, mmY - 4, mmW + 8, mmH + 8);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1;
        ctx.strokeRect(mmX - 4.5, mmY - 4.5, mmW + 9, mmH + 9);

        for (let my = 0; my < s.zone.height; my++) {
          for (let mx = 0; mx < s.zone.width; mx++) {
            const t = s.zone.tiles[my][mx];
            if (!t.explored) continue;
            if (t.kind === 'wall') {
              ctx.fillStyle = t.visible ? '#475569' : '#232936';
            } else if (t.kind === 'vault_door') {
              ctx.fillStyle = '#FB923C';
            } else if (t.kind === 'stairs_down' || t.kind === 'gate_city') {
              ctx.fillStyle = '#F59E0B';
            } else if (t.kind === 'stairs_up') {
              ctx.fillStyle = '#60A5FA';
            } else if (t.kind === 'shrine' || t.kind === 'whispering_bell') {
              ctx.fillStyle = '#A78BFA';
            } else {
              ctx.fillStyle = t.visible ? '#1D2433' : '#121620';
            }
            ctx.fillRect(mmX + mx * cell, mmY + my * cell, cell, cell);
          }
        }

        for (const npc of s.zone.npcs) {
          ctx.fillStyle = '#38BDF8';
          ctx.fillRect(mmX + npc.x * cell, mmY + npc.y * cell, cell, cell);
        }
        for (const enemy of s.zone.enemies) {
          if (!s.zone.tiles[enemy.y]?.[enemy.x]?.visible) continue;
          ctx.fillStyle = enemy.isBoss ? '#F43F5E' : '#EF4444';
          ctx.fillRect(mmX + enemy.x * cell, mmY + enemy.y * cell, cell, cell);
        }
        ctx.fillStyle = '#FDE047';
        ctx.fillRect(mmX + s.player.x * cell, mmY + s.player.y * cell, cell, cell);
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  const coordFromClient = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const s = stateRef.current;
    const ts = s.tileSize;
    const offsetX = Math.round(rect.width / 2 - (s.camX + 0.5) * ts);
    const offsetY = Math.round(rect.height / 2 - (s.camY + 0.5) * ts);
    const tx = Math.floor((mx - offsetX) / ts);
    const ty = Math.floor((my - offsetY) / ts);
    if (tx < 0 || ty < 0 || tx >= zone.width || ty >= zone.height) return null;
    return { x: tx, y: ty };
  };

  const inspectTileAt = (coord: { x: number; y: number }, pinned = false) => {
    const tile = zone.tiles[coord.y][coord.x];
    if (!tile.explored) {
      setHoverInfo(null);
      return;
    }
    const enemy = tile.visible ? zone.enemies.find((en) => en.x === coord.x && en.y === coord.y) : undefined;
    const npc = zone.npcs.find((n) => n.x === coord.x && n.y === coord.y);
    const companion =
      player.companion &&
      player.companion.hp > 0 &&
      player.companion.respawnCooldown === 0 &&
      player.companion.x === coord.x &&
      player.companion.y === coord.y
        ? player.companion
        : undefined;
    const drop = tile.visible ? zone.loot.find((l) => l.x === coord.x && l.y === coord.y) : undefined;
    const lootLabel = drop ? (drop.item ? drop.item.name : `${drop.gold} Gold`) : undefined;
    setHoverInfo({ x: coord.x, y: coord.y, tile, enemy, npc, companion, lootLabel, pinned });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'touch') return;
    const coord = coordFromClient(e.clientX, e.clientY);
    stateRef.current.hoverCoord = coord;
    if (!coord) {
      stateRef.current.hoverPath = [];
      setHoverInfo(null);
      return;
    }
    const tile = zone.tiles[coord.y][coord.x];
    if (!tile.explored) {
      stateRef.current.hoverPath = [];
      setHoverInfo(null);
      return;
    }

    if (!armedSkill) {
      stateRef.current.hoverPath = findPathPoints(zone, player.x, player.y, coord.x, coord.y, true, 16);
    } else {
      stateRef.current.hoverPath = [];
    }

    inspectTileAt(coord, false);
  };

  const handlePointerLeave = () => {
    stateRef.current.hoverCoord = null;
    stateRef.current.hoverPath = [];
    setHoverInfo((cur) => (cur?.pinned ? cur : null));
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const t = touchRef.current;
    t.startX = touch.clientX;
    t.startY = touch.clientY;
    t.swipeUsed = false;
    t.longPressUsed = false;
    if (t.longPressTimer) window.clearTimeout(t.longPressTimer);
    t.longPressTimer = window.setTimeout(() => {
      const coord = coordFromClient(t.startX, t.startY);
      if (coord) {
        t.longPressUsed = true;
        inspectTileAt(coord, true);
      }
    }, 420);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const t = touchRef.current;
    const dx = touch.clientX - t.startX;
    const dy = touch.clientY - t.startY;
    if (Math.hypot(dx, dy) > 12 && t.longPressTimer) {
      window.clearTimeout(t.longPressTimer);
      t.longPressTimer = null;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const t = touchRef.current;
    if (t.longPressTimer) {
      window.clearTimeout(t.longPressTimer);
      t.longPressTimer = null;
    }
    if (t.longPressUsed || armedSkill || armedInscriptionRange || inspectMode || !onStep) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - t.startX;
    const dy = touch.clientY - t.startY;
    const dist = Math.hypot(dx, dy);
    if (dist >= 32) {
      t.swipeUsed = true;
      const angle = Math.atan2(dy, dx);
      const octant = Math.round(angle / (Math.PI / 4));
      const dirMap: Record<number, [number, number]> = {
        0: [1, 0],
        1: [1, 1],
        2: [0, 1],
        3: [-1, 1],
        4: [-1, 0],
        [-4]: [-1, 0],
        [-3]: [-1, -1],
        [-2]: [0, -1],
        [-1]: [1, -1],
      };
      const step = dirMap[octant];
      if (step) {
        setHoverInfo(null);
        onStep(step[0], step[1]);
      }
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const t = touchRef.current;
    if (t.swipeUsed || t.longPressUsed) {
      t.swipeUsed = false;
      t.longPressUsed = false;
      return;
    }
    const coord = coordFromClient(e.clientX, e.clientY);
    if (!coord) return;
    if (inspectMode) {
      inspectTileAt(coord, true);
      return;
    }
    setHoverInfo((cur) => (cur?.pinned ? null : cur));
    onTileClick(coord.x, coord.y);
  };

  const zoomIndex = ZOOM_STEPS.indexOf(tileSize as (typeof ZOOM_STEPS)[number]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
        className={`block w-full h-full touch-none ${
          inspectMode
            ? 'cursor-help'
            : armedSkill || armedInscriptionRange
              ? 'cursor-crosshair'
              : 'cursor-pointer'
        }`}
      />

      {/* Mobile Top-Right Map / Look / Zoom Controls */}
      <div className="md:hidden absolute top-2 right-2 z-20 flex items-center gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            setInspectMode((v) => {
              if (v) setHoverInfo(null);
              return !v;
            });
          }}
          aria-label="Toggle tile inspect mode"
          className={`h-11 min-w-[44px] px-2.5 rounded border text-[11px] font-medium flex items-center justify-center gap-1 shadow-md cursor-pointer ${
            inspectMode
              ? 'border-amber-400 bg-amber-500 text-[#0B0D12]'
              : 'border-white/15 bg-[#0D121A]/88 text-slate-200'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{inspectMode ? 'Looking' : 'Look'}</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            setShowMobileMap((v) => !v);
          }}
          aria-label="Toggle corner minimap"
          className={`h-11 min-w-[44px] px-2.5 rounded border text-[11px] font-medium flex items-center justify-center gap-1 shadow-md cursor-pointer ${
            showMobileMap
              ? 'border-sky-400/70 bg-sky-500/25 text-sky-100'
              : 'border-white/15 bg-[#0D121A]/88 text-slate-200'
          }`}
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span>Map</span>
        </button>

        <button
          type="button"
          disabled={zoomIndex <= 0}
          onClick={(e) => {
            e.currentTarget.blur();
            if (zoomIndex > 0) setTileSize(ZOOM_STEPS[zoomIndex - 1]);
          }}
          aria-label="Zoom out tiles"
          className="h-11 w-11 rounded border border-white/15 bg-[#0D121A]/88 text-slate-200 disabled:opacity-35 flex items-center justify-center shadow-md cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={zoomIndex >= ZOOM_STEPS.length - 1}
          onClick={(e) => {
            e.currentTarget.blur();
            if (zoomIndex < ZOOM_STEPS.length - 1) setTileSize(ZOOM_STEPS[zoomIndex + 1]);
          }}
          aria-label="Zoom in tiles"
          className="h-11 w-11 rounded border border-white/15 bg-[#0D121A]/88 text-slate-200 disabled:opacity-35 flex items-center justify-center shadow-md cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {armedSkill && (
        <div className="absolute top-12 md:top-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 max-w-[94vw] px-3 py-1.5 rounded border border-amber-500/40 bg-[#0B0D12]/94 text-[11px] sm:text-xs font-medium text-amber-200 shadow-lg">
          <span className="truncate">
            Targeting: {SKILLS[armedSkill].name} (Range {SKILLS[armedSkill].range})
          </span>
          {onCancelTargeting && (
            <button
              type="button"
              onClick={onCancelTargeting}
              className="min-h-[44px] md:min-h-0 px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-[#ECE4D4] text-[11px] font-semibold shrink-0 cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {!armedSkill && armedInscriptionRange && (
        <div className="absolute top-12 md:top-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 max-w-[94vw] px-3 py-1.5 rounded border border-sky-400/50 bg-[#0B0D12]/94 text-[11px] sm:text-xs font-medium text-sky-200 shadow-lg">
          <span className="truncate">
            Phase Door Rune (Range {armedInscriptionRange}) · Tap tile
          </span>
          {onCancelTargeting && (
            <button
              type="button"
              onClick={onCancelTargeting}
              className="min-h-[44px] md:min-h-0 px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-[#ECE4D4] text-[11px] font-semibold shrink-0 cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {inspectMode && !armedSkill && !armedInscriptionRange && (
        <div className="pointer-events-none absolute top-12 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded border border-amber-400/45 bg-[#0B0D12]/90 text-[11px] text-amber-200 whitespace-nowrap">
          Look Mode · Tap any explored tile to inspect
        </div>
      )}

      {/* Pinned Boss / Mini-Boss Threat Bar */}
      {(() => {
        if (armedSkill || armedInscriptionRange || inspectMode) return null;
        const visibleBosses = zone.enemies
          .filter(
            (e) =>
              !e.pacified &&
              zone.tiles[e.y]?.[e.x]?.visible &&
              (e.isBoss || e.rank === 'randboss' || e.rank === 'rare')
          )
          .sort((a, b) => {
            const score = (e: Enemy) => (e.isBoss ? 3 : e.rank === 'randboss' ? 2 : 1);
            const diff = score(b) - score(a);
            if (diff !== 0) return diff;
            return chebyshev(a.x, a.y, player.x, player.y) - chebyshev(b.x, b.y, player.x, player.y);
          });
        const boss = visibleBosses[0];
        if (!boss) return null;
        const hpPct = Math.max(0, Math.min(100, (boss.hp / boss.maxHp) * 100));
        return (
          <div className="pointer-events-none absolute top-12 md:top-2.5 left-1/2 -translate-x-1/2 z-10 w-[min(92vw,360px)] px-3 py-1.5 rounded border border-rose-500/40 bg-[#0D1017]/90 backdrop-blur-sm shadow-lg">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="font-display font-bold text-amber-200 truncate">
                {boss.name}
              </span>
              <span className="font-mono-glyph text-rose-300 shrink-0 tabular-nums">
                {boss.hp}/{boss.maxHp}
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-sm bg-[#1A202C] overflow-hidden border border-white/10">
              <div
                className={`h-full transition-transform duration-150 origin-left ${
                  boss.isBoss ? 'bg-rose-500' : boss.rank === 'randboss' ? 'bg-amber-500' : 'bg-sky-400'
                }`}
                style={{ transform: `scaleX(${hpPct / 100})` }}
              />
            </div>
            {boss.intent && (
              <div className="mt-1 text-[10px] font-medium text-rose-300 truncate">
                Intent: {boss.intent.label} ({boss.intent.damage} dmg)
              </div>
            )}
          </div>
        );
      })()}

      {hoverInfo &&
        (hoverInfo.enemy ||
          hoverInfo.npc ||
          hoverInfo.companion ||
          hoverInfo.lootLabel ||
          hoverInfo.tile.label) && (
        <div
          className={`z-20 rounded border border-white/12 bg-[#0E1219]/95 px-3 py-2 text-xs shadow-xl ${
            hoverInfo.pinned
              ? 'absolute top-12 left-2.5 max-w-[260px]'
              : 'pointer-events-none absolute top-2.5 right-2.5 max-w-[225px] sm:max-w-[270px]'
          }`}
        >
          {hoverInfo.pinned && (
            <button
              type="button"
              onClick={() => setHoverInfo(null)}
              aria-label="Dismiss tile inspection"
              className="float-right ml-2 -mr-1.5 -mt-1.5 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 p-1 flex items-center justify-center rounded text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {hoverInfo.enemy ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-[#ECE4D4]">{hoverInfo.enemy.name}</span>
                <span className="font-mono-glyph text-rose-400 tabular-nums">
                  {hoverInfo.enemy.hp}/{hoverInfo.enemy.maxHp} HP
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono-glyph tabular-nums">
                ATK {hoverInfo.enemy.atk} · DEF {hoverInfo.enemy.def}
                {hoverInfo.enemy.isBoss
                  ? ' · Boss'
                  : hoverInfo.enemy.rank === 'randboss'
                    ? ' · Randboss'
                    : hoverInfo.enemy.rank === 'rare'
                      ? ' · Rare'
                      : hoverInfo.enemy.isElite
                        ? ' · Elite'
                        : ''}
              </div>
              {hoverInfo.enemy.skillLoadout && hoverInfo.enemy.skillLoadout.length > 0 && (
                <div className="text-[11px] text-sky-300">
                  Skills: {hoverInfo.enemy.skillLoadout.map((id) => SKILLS[id]?.name ?? id).join(' · ')}
                </div>
              )}
              {hoverInfo.enemy.intent && (
                <div className="text-[11px] font-medium text-rose-300">
                  Intent: {hoverInfo.enemy.intent.label} ({hoverInfo.enemy.intent.damage} dmg)
                </div>
              )}
              {hoverInfo.enemy.statuses.length > 0 && (
                <div className="text-[11px] text-amber-300">
                  {hoverInfo.enemy.statuses.map((st) => `${st.kind} (${st.turns}t)`).join(' · ')}
                </div>
              )}
            </div>
          ) : hoverInfo.companion ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-sky-200">{hoverInfo.companion.name}</span>
                <span className="font-mono-glyph text-emerald-300 tabular-nums">
                  {hoverInfo.companion.hp}/{hoverInfo.companion.maxHp} HP
                </span>
              </div>
              <div className="text-[11px] text-slate-300">
                Stance: <span className="capitalize text-amber-200">{hoverInfo.companion.stance}</span> · Step onto tile to swap
              </div>
            </div>
          ) : hoverInfo.npc ? (
            <div>
              <div className="font-semibold text-amber-200">{hoverInfo.npc.name}</div>
              <div className="text-[11px] text-slate-400">{hoverInfo.npc.title} · Tap ACT or NPC to talk</div>
            </div>
          ) : hoverInfo.lootLabel ? (
            <div>
              <div className="font-semibold text-amber-300">{hoverInfo.lootLabel}</div>
              <div className="text-[11px] text-slate-400">Step onto tile to collect</div>
            </div>
          ) : (
            <div>
              <div className="text-slate-200 font-medium">
                {hoverInfo.tile.used
                  ? `${hoverInfo.tile.label ?? 'Floor'} (Used)`
                  : hoverInfo.tile.label ?? (hoverInfo.tile.kind === 'wall' ? 'Stone Wall' : 'Stone Floor')}
              </div>
              {(() => {
                const hint = getTileContextHint(hoverInfo.tile);
                return hint ? (
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{hint}</div>
                ) : null;
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
