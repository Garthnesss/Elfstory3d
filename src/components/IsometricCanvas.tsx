import React, { useEffect, useRef, useState } from 'react';
import { Eye, Map as MapIcon, RotateCcw, RotateCw, X, ZoomIn, ZoomOut } from 'lucide-react';
import * as THREE from 'three';
import { chebyshev, findPathPoints } from '../game/combat';
import {
  CameraYawIndex,
  getCameraYawRadians,
  ISO_ELEVATION_RAD,
  isOccludingTile,
  normalizeYawIndex,
  tileSizeToOrthoHalfHeight,
  worldDirFromScreenDrag,
} from '../game/isoCamera';
import {
  getBiomeAtmosphere,
  getContactShadowTexture,
  getGlowDiscTexture,
  getTelegraphExclaimTexture,
  textureFromCanvas,
} from '../game/isoMaterials';
import {
  buildZoneTerrain,
  createIsoGeometries,
  disposeIsoGeometries,
  IsoGeometries,
  IsoMaterialPool,
  syncTileNode,
  TileNode,
} from '../game/isoSceneBuilder';
import { shouldDrawTelegraphMarker } from '../game/settings';
import { SKILLS } from '../game/skills';
import {
  getCompanionSprite,
  getCritterSprite,
  getEnemySprite,
  getLootSprite,
  getNpcSprite,
  getPlayerSprite,
} from '../game/sprites';
import { getZoneBiome } from '../game/tileset';
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

interface IsometricCanvasProps {
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
  tileSize?: number;
  patternSignals?: boolean;
  cameraYawIndex?: CameraYawIndex;
  onCameraYawChange?: (yaw: CameraYawIndex) => void;
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

interface EnemyRenderCache {
  x: number;
  z: number;
}

export const IsometricCanvas: React.FC<IsometricCanvasProps> = ({
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
  cameraYawIndex: controlledYawIndex,
  onCameraYawChange,
  onTileSizeChange,
  onTileClick,
  onStep,
  onCancelTargeting,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const glCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hudCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [internalTileSize, setInternalTileSize] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem('elfstory-tile-size'));
      if (ZOOM_STEPS.includes(v as (typeof ZOOM_STEPS)[number])) return v;
    } catch {
      // storage unavailable
    }
    return 36;
  });

  const tileSize = controlledTileSize ?? internalTileSize;
  const setTileSize = (next: number) => {
    if (onTileSizeChange) onTileSizeChange(next);
    else setInternalTileSize(next);
  };

  useEffect(() => {
    try {
      localStorage.setItem('elfstory-tile-size', String(tileSize));
    } catch {
      // ignore
    }
  }, [tileSize]);

  const [internalYawIndex, setInternalYawIndex] = useState<CameraYawIndex>(() => {
    try {
      const v = Number(localStorage.getItem('elfstory3d-camera-yaw'));
      if (!Number.isNaN(v)) return normalizeYawIndex(v);
    } catch {
      // ignore
    }
    return 0;
  });

  const yawIndex = controlledYawIndex ?? internalYawIndex;
  const setYawIndex = (next: CameraYawIndex) => {
    if (onCameraYawChange) onCameraYawChange(next);
    else setInternalYawIndex(next);
    try {
      localStorage.setItem('elfstory3d-camera-yaw', String(next));
    } catch {
      // ignore
    }
  };

  const rotateCamera = (delta: number) => {
    setYawIndex(normalizeYawIndex(yawIndex + delta));
  };

  const [showMobileMap, setShowMobileMap] = useState<boolean>(false);
  const [inspectMode, setInspectMode] = useState<boolean>(false);
  const [webglError, setWebglError] = useState<string | null>(null);

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
    yawIndex: 0 as CameraYawIndex,
    yawRad: getCameraYawRadians(0),
    hoverCoord: null as { x: number; y: number } | null,
    hoverPath: [] as Array<{ x: number; y: number }>,
    camX: player.x,
    camZ: player.y,
    heroVisX: player.x,
    heroVisZ: player.y,
    enemyVisPos: new Map<string, EnemyRenderCache>(),
    compVisX: player.companion?.x ?? player.x,
    compVisZ: player.companion?.y ?? player.y,
    camera: null as THREE.OrthographicCamera | null,
    nodes: [] as TileNode[],
    cutawaySet: new Set<string>(),
    lastZoneKey: '',
  });

  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

  useEffect(() => {
    const s = stateRef.current;
    s.zone = zone;
    s.player = player;
    s.armedSkill = armedSkill;
    s.armedInscriptionRange = armedInscriptionRange ?? null;
    s.aimedTarget = aimedTarget ?? null;
    s.floatingEffects = floatingEffects;
    s.particles = particles;
    s.projectiles = projectiles;
    s.hitFlashes = hitFlashes;
    s.shakeUntil = shakeUntil;
    s.patternSignals = patternSignals ?? true;
    s.tileSize = tileSize;
    s.showMobileMap = showMobileMap;
    s.yawIndex = yawIndex;

    if (s.hoverCoord && !armedSkill && !armedInscriptionRange) {
      s.hoverPath = findPathPoints(
        zone,
        player.x,
        player.y,
        s.hoverCoord.x,
        s.hoverCoord.y,
        true,
        16
      );
    } else {
      s.hoverPath = [];
    }
  }, [
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
    patternSignals,
    tileSize,
    showMobileMap,
    yawIndex,
  ]);

  useEffect(() => {
    const glCanvas = glCanvasRef.current;
    const hudCanvas = hudCanvasRef.current;
    const container = containerRef.current;
    if (!glCanvas || !hudCanvas || !container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: glCanvas,
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch (err) {
      setWebglError(err instanceof Error ? err.message : 'WebGL unavailable');
      return;
    }

    const dprCap = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dprCap);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-10, 10, 8, -8, 0.1, 160);
    stateRef.current.camera = camera;

    const hemiLight = new THREE.HemisphereLight(0xcbe8ff, 0x26382f, 1.0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfff3d6, 1.05);
    dirLight.position.set(14, 24, 10);
    scene.add(dirLight);

    const playerLight = new THREE.PointLight(0xf5a82a, 2.8, 9, 1.4);
    scene.add(playerLight);

    const envLights: THREE.PointLight[] = Array.from({ length: 7 }, () => {
      const pl = new THREE.PointLight(0xfb923c, 0, 7, 1.6);
      scene.add(pl);
      return pl;
    });

    const terrainContainer = new THREE.Group();
    const overlayGroup = new THREE.Group();
    const entitiesGroup = new THREE.Group();
    const fxGroup = new THREE.Group();
    scene.add(terrainContainer, overlayGroup, entitiesGroup, fxGroup);

    const geos: IsoGeometries = createIsoGeometries();
    const mats = new IsoMaterialPool();
    const shadowTex = getContactShadowTexture();
    const exclaimTex = getTelegraphExclaimTexture();

    // Shared helper geometries for overlays
    const pathDotMat = new THREE.MeshBasicMaterial({ color: 0xfdf6e3 });
    const pathStartMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const teleFillMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    const teleExclaimMat = new THREE.MeshBasicMaterial({
      map: exclaimTex,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const hoverMat = new THREE.MeshBasicMaterial({
      color: 0xfdf6e3,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const aimMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // Reusable overlay object pools
    const MAX_TELE = 160;
    const teleMeshes: THREE.Mesh[] = [];
    const teleExclaims: THREE.Mesh[] = [];
    for (let i = 0; i < MAX_TELE; i++) {
      const m = new THREE.Mesh(geos.decal, teleFillMat);
      m.position.y = 0.028;
      m.visible = false;
      overlayGroup.add(m);
      teleMeshes.push(m);

      const ex = new THREE.Mesh(geos.billboard, teleExclaimMat);
      ex.scale.set(0.65, 0.65, 1);
      ex.visible = false;
      overlayGroup.add(ex);
      teleExclaims.push(ex);
    }

    const MAX_RANGE = 220;
    const rangeRingGeo = new THREE.RingGeometry(0.37, 0.45, 4);
    rangeRingGeo.rotateX(-Math.PI / 2);
    rangeRingGeo.rotateY(Math.PI / 4);
    const rangeMeshes: THREE.Mesh[] = [];
    for (let i = 0; i < MAX_RANGE; i++) {
      const m = new THREE.Mesh(
        rangeRingGeo,
        mats.getBasic('range:default', () =>
          new THREE.MeshBasicMaterial({
            color: 0x5b8def,
            transparent: true,
            opacity: 0.72,
            side: THREE.DoubleSide,
            depthWrite: false,
          })
        )
      );
      m.position.y = 0.032;
      m.visible = false;
      overlayGroup.add(m);
      rangeMeshes.push(m);
    }

    const squareFrameGeo = new THREE.RingGeometry(0.4, 0.48, 4);
    squareFrameGeo.rotateX(-Math.PI / 2);
    squareFrameGeo.rotateY(Math.PI / 4);
    const hoverMesh = new THREE.Mesh(squareFrameGeo, hoverMat);
    hoverMesh.position.y = 0.038;
    hoverMesh.visible = false;
    overlayGroup.add(hoverMesh);

    const aimMesh = new THREE.Mesh(squareFrameGeo, aimMat);
    aimMesh.position.y = 0.044;
    aimMesh.visible = false;
    overlayGroup.add(aimMesh);

    const MAX_PATH = 24;
    const pathDots: THREE.Mesh[] = [];
    for (let i = 0; i < MAX_PATH; i++) {
      const m = new THREE.Mesh(geos.pathDot, i === 0 ? pathStartMat : pathDotMat);
      m.visible = false;
      overlayGroup.add(m);
      pathDots.push(m);
    }

    // Dynamic pools for sprites & FX
    const spriteMeshesPool: THREE.Mesh[] = [];
    const shadowPool: THREE.Mesh[] = [];
    const ringPool: THREE.Mesh[] = [];
    const sparkPool: THREE.Mesh[] = [];
    const projPool: THREE.Group[] = [];

    const ensureMesh = (
      pool: THREE.Mesh[],
      idx: number,
      geo: THREE.BufferGeometry,
      parent: THREE.Group
    ): THREE.Mesh => {
      while (pool.length <= idx) {
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
        m.visible = false;
        parent.add(m);
        pool.push(m);
      }
      return pool[idx];
    };

    const ensureProj = (idx: number): THREE.Group => {
      while (projPool.length <= idx) {
        const g = new THREE.Group();
        const head = new THREE.Mesh(geos.projHead, new THREE.MeshBasicMaterial({ color: 0xffffff }));
        const tail = new THREE.Mesh(geos.projTail, new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
        tail.position.z = -0.24;
        g.add(head, tail);
        g.visible = false;
        fxGroup.add(g);
        projPool.push(g);
      }
      return projPool[idx];
    };

    let terrainBillboards: THREE.Mesh[] = [];
    let viewW = 800;
    let viewH = 600;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      viewW = Math.max(1, rect.width);
      viewH = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(viewW, viewH, false);
      hudCanvas.width = Math.max(1, Math.floor(viewW * dpr));
      hudCanvas.height = Math.max(1, Math.floor(viewH * dpr));
      hudCanvas.style.width = `${viewW}px`;
      hudCanvas.style.height = `${viewH}px`;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let animId = 0;
    let lastTime = performance.now();
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const tmpVec = new THREE.Vector3();

    const projectToScreen = (wx: number, wy: number, wz: number): { sx: number; sy: number } => {
      tmpVec.set(wx, wy, wz).project(camera);
      return {
        sx: (tmpVec.x * 0.5 + 0.5) * viewW,
        sy: (-tmpVec.y * 0.5 + 0.5) * viewH,
      };
    };

    const render = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      const dt = Math.min(rawDt, 0.05);
      lastTime = now;

      const s = stateRef.current;
      const biome = getZoneBiome(s.zone.id, s.zone.depth);
      const atmo = getBiomeAtmosphere(biome);

      // Rebuild 3D terrain if zone changed
      const zoneKey = `${s.zone.id}:${s.zone.depth}:${s.zone.width}x${s.zone.height}`;
      if (s.lastZoneKey !== zoneKey) {
        terrainContainer.clear();
        const built = buildZoneTerrain(s.zone, biome, geos, mats);
        terrainContainer.add(built.root);
        s.nodes = built.nodes;
        terrainBillboards = built.billboards;
        s.lastZoneKey = zoneKey;
        s.camX = s.player.x;
        s.camZ = s.player.y;
        s.heroVisX = s.player.x;
        s.heroVisZ = s.player.y;
        s.enemyVisPos.clear();
        s.compVisX = s.player.companion?.x ?? s.player.x;
        s.compVisZ = s.player.companion?.y ?? s.player.y;

        scene.background = new THREE.Color(atmo.bgHex);
        hemiLight.color.setHex(atmo.skyHex);
        hemiLight.groundColor.setHex(atmo.groundHex);
        hemiLight.intensity = atmo.hemiIntensity;
        dirLight.color.setHex(atmo.dirHex);
        dirLight.intensity = atmo.dirIntensity;
        playerLight.color.setHex(atmo.playerLightHex);
      }

      // Smooth camera tracking & rotation
      const camLerp = reduceMotion ? 1 : Math.min(1, dt * 11);
      s.camX += (s.player.x - s.camX) * camLerp;
      s.camZ += (s.player.y - s.camZ) * camLerp;
      s.heroVisX += (s.player.x - s.heroVisX) * (reduceMotion ? 1 : Math.min(1, dt * 18));
      s.heroVisZ += (s.player.y - s.heroVisZ) * (reduceMotion ? 1 : Math.min(1, dt * 18));

      const targetYaw = getCameraYawRadians(s.yawIndex);
      let yawDiff = targetYaw - s.yawRad;
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      s.yawRad += yawDiff * (reduceMotion ? 1 : Math.min(1, dt * 14));

      // Camera shake in screen space translated to world offset
      let shakeWorldX = 0;
      let shakeWorldZ = 0;
      if (!reduceMotion && now < s.shakeUntil) {
        const mag = ((s.shakeUntil - now) / 180) * 0.22;
        shakeWorldX = (Math.random() - 0.5) * mag;
        shakeWorldZ = (Math.random() - 0.5) * mag;
      }

      // Orthographic camera frustum from tileSize
      const halfH = tileSizeToOrthoHalfHeight(s.tileSize, viewH);
      const aspect = viewW / viewH;
      const halfW = halfH * aspect;
      camera.left = -halfW;
      camera.right = halfW;
      camera.top = halfH;
      camera.bottom = -halfH;
      camera.updateProjectionMatrix();

      const camDist = 28;
      const horizDist = camDist * Math.cos(ISO_ELEVATION_RAD);
      const vertDist = camDist * Math.sin(ISO_ELEVATION_RAD);
      const lookX = s.camX + shakeWorldX;
      const lookZ = s.camZ + shakeWorldZ;

      camera.position.set(
        lookX + Math.cos(s.yawRad) * horizDist,
        vertDist,
        lookZ + Math.sin(s.yawRad) * horizDist
      );
      camera.lookAt(lookX, 0.25, lookZ);
      camera.updateMatrixWorld();

      // Orient directional light slightly relative to camera for crisp 3D face contrast
      dirLight.position.set(
        lookX + Math.cos(s.yawRad - 0.55) * 18,
        24,
        lookZ + Math.sin(s.yawRad - 0.55) * 18
      );

      const animFrame = reduceMotion ? 0 : Math.floor(now / 280);
      const spriteFrame = reduceMotion ? 0 : Math.floor(now / 380) % 2;

      // Determine focus points for wall cutaway (player + visible nearby enemies)
      const focusPoints: Array<{ x: number; y: number }> = [{ x: s.player.x, y: s.player.y }];
      for (const en of s.zone.enemies) {
        if (s.zone.tiles[en.y]?.[en.x]?.visible && chebyshev(en.x, en.y, s.player.x, s.player.y) <= 7) {
          focusPoints.push({ x: en.x, y: en.y });
        }
      }

      const cullRadius = Math.ceil(Math.max(halfW, halfH) * 1.65) + 4;
      s.cutawaySet.clear();

      // Update terrain visibility, fog of war, cutaway, and gather lights/embers
      const candidateLights: Array<{
        x: number;
        z: number;
        color: number;
        distSq: number;
        phase: number;
        intensity: number;
      }> = [];
      const emberSources: Array<{ x: number; z: number; color: number }> = [];
      const isAbyss = s.zone.depth >= 5;

      for (let i = 0; i < s.nodes.length; i++) {
        const node = s.nodes[i];
        const tile = s.zone.tiles[node.y]?.[node.x];
        if (!tile) continue;

        const dx = node.x - s.camX;
        const dz = node.y - s.camZ;
        const inRange = Math.abs(dx) <= cullRadius && Math.abs(dz) <= cullRadius;

        let isCutaway = false;
        if (inRange && tile.explored && node.isTallObstacle) {
          for (let f = 0; f < focusPoints.length; f++) {
            const fp = focusPoints[f];
            if (isOccludingTile(node.x, node.y, fp.x, fp.y, s.yawRad)) {
              isCutaway = true;
              break;
            }
          }
          if (isCutaway) s.cutawaySet.add(`${node.x},${node.y}`);
        }

        syncTileNode(node, tile, inRange, isCutaway, animFrame, biome, s.zone.depth, mats);

        if (node.wallMesh) {
          node.wallMesh.renderOrder = isCutaway ? 5 : 0;
        }

        if (inRange && tile.visible) {
          const phase = (node.x * 17 + node.y * 31) * 0.23;
          const distSq = dx * dx + dz * dz;
          if (tile.kind === 'torch' || (tile.kind === 'brazier' && !tile.used)) {
            candidateLights.push({
              x: node.x,
              z: node.y,
              color: isAbyss ? 0xa855f7 : 0xfb923c,
              distSq,
              phase,
              intensity: 2.2,
            });
            emberSources.push({ x: node.x, z: node.y, color: isAbyss ? 0xc084fc : 0xfdba74 });
          } else if (tile.kind === 'forgotten_forge' && !tile.used) {
            candidateLights.push({
              x: node.x,
              z: node.y,
              color: 0xf97316,
              distSq,
              phase,
              intensity: 2.6,
            });
            emberSources.push({ x: node.x, z: node.y, color: 0xfb923c });
          } else if (tile.kind === 'waystone' && !tile.used) {
            candidateLights.push({
              x: node.x,
              z: node.y,
              color: 0x38bdf8,
              distSq,
              phase,
              intensity: 2.4,
            });
            emberSources.push({ x: node.x, z: node.y, color: 0x7dd3fc });
          } else if (tile.kind === 'cursed_altar' && !tile.used) {
            candidateLights.push({
              x: node.x,
              z: node.y,
              color: 0xc084fc,
              distSq,
              phase,
              intensity: 2.1,
            });
          } else if (tile.kind === 'shrine' || tile.kind === 'whispering_bell') {
            candidateLights.push({
              x: node.x,
              z: node.y,
              color: 0x60a5fa,
              distSq,
              phase,
              intensity: 2.1,
            });
          } else if (tile.kind === 'vault_door') {
            candidateLights.push({
              x: node.x,
              z: node.y,
              color: 0xf59e0b,
              distSq,
              phase,
              intensity: 1.9,
            });
          } else if (tile.kind === 'chasm') {
            candidateLights.push({
              x: node.x,
              z: node.y,
              color: 0xea580c,
              distSq,
              phase,
              intensity: 1.4,
            });
          }
        }
      }

      // Billboard all visible terrain props toward camera
      for (let i = 0; i < terrainBillboards.length; i++) {
        const bb = terrainBillboards[i];
        if (bb.parent?.visible) {
          bb.quaternion.copy(camera.quaternion);
        }
      }

      // Update dynamic point lights
      playerLight.position.set(s.heroVisX, 1.15, s.heroVisZ);
      const pFlicker = reduceMotion ? 1 : 0.92 + Math.sin(now * 0.005) * 0.08;
      playerLight.intensity = (s.zone.isTown ? 1.8 : 2.9) * pFlicker;

      candidateLights.sort((a, b) => a.distSq - b.distSq);
      for (let i = 0; i < envLights.length; i++) {
        const light = envLights[i];
        const src = candidateLights[i];
        if (!src) {
          light.intensity = 0;
          continue;
        }
        const flicker = reduceMotion
          ? 0.95
          : 0.85 + Math.sin(now * 0.0065 + src.phase) * 0.1 + Math.cos(now * 0.015 + src.phase) * 0.06;
        light.color.setHex(src.color);
        light.position.set(src.x, 0.85, src.z);
        light.intensity = src.intensity * flicker;
      }

      // === TACTICAL TILE OVERLAYS ===
      const telegraphedKeys = new Set<string>();
      for (const enemy of s.zone.enemies) {
        if (enemy.intent && s.zone.tiles[enemy.y]?.[enemy.x]?.visible) {
          for (const t of enemy.intent.targetTiles) {
            telegraphedKeys.add(`${t.x},${t.y}`);
          }
        }
      }

      let teleIdx = 0;
      const telePulse = 0.22 + (reduceMotion ? 0.08 : Math.sin(now * 0.01) * 0.1);
      teleFillMat.opacity = telePulse;
      const drawExclaim = shouldDrawTelegraphMarker(s.patternSignals, true);
      for (const key of telegraphedKeys) {
        if (teleIdx >= MAX_TELE) break;
        const [txStr, tyStr] = key.split(',');
        const tx = Number(txStr);
        const ty = Number(tyStr);
        if (!s.zone.tiles[ty]?.[tx]?.visible) continue;

        const m = teleMeshes[teleIdx];
        m.position.set(tx, 0.028, ty);
        m.visible = true;

        const ex = teleExclaims[teleIdx];
        if (drawExclaim) {
          ex.position.set(tx, 0.16, ty);
          ex.quaternion.copy(camera.quaternion);
          ex.visible = true;
        } else {
          ex.visible = false;
        }
        teleIdx++;
      }
      for (let i = teleIdx; i < MAX_TELE; i++) {
        teleMeshes[i].visible = false;
        teleExclaims[i].visible = false;
      }

      // Skill / Inscription Range Rings
      let rangeIdx = 0;
      const activeRange = s.armedSkill
        ? SKILLS[s.armedSkill].range
        : s.armedInscriptionRange ?? 0;
      if (activeRange > 0) {
        const rangeColor = s.armedSkill
          ? SKILLS[s.armedSkill].branch === 'runecaster'
            ? 0x5b8def
            : SKILLS[s.armedSkill].branch === 'shadowcraft'
              ? 0x4ea885
              : 0xd9534f
          : 0x38bdf8;
        const rMat = mats.getBasic(`range:${rangeColor}`, () =>
          new THREE.MeshBasicMaterial({
            color: rangeColor,
            transparent: true,
            opacity: 0.72,
            side: THREE.DoubleSide,
            depthWrite: false,
          })
        );
        const minRx = Math.max(0, s.player.x - activeRange);
        const maxRx = Math.min(s.zone.width - 1, s.player.x + activeRange);
        const minRy = Math.max(0, s.player.y - activeRange);
        const maxRy = Math.min(s.zone.height - 1, s.player.y + activeRange);
        for (let ry = minRy; ry <= maxRy && rangeIdx < MAX_RANGE; ry++) {
          for (let rx = minRx; rx <= maxRx && rangeIdx < MAX_RANGE; rx++) {
            const tile = s.zone.tiles[ry]?.[rx];
            if (!tile?.visible || !tile.walkable) continue;
            const d = chebyshev(s.player.x, s.player.y, rx, ry);
            if (d === 0 || d > activeRange) continue;
            const rm = rangeMeshes[rangeIdx++];
            rm.material = rMat;
            rm.position.set(rx, 0.032, ry);
            rm.visible = true;
          }
        }
      }
      for (let i = rangeIdx; i < MAX_RANGE; i++) {
        rangeMeshes[i].visible = false;
      }

      // Hover tile & Aimed target reticle
      if (s.hoverCoord) {
        hoverMesh.position.set(s.hoverCoord.x, 0.038, s.hoverCoord.y);
        hoverMesh.visible = true;
      } else {
        hoverMesh.visible = false;
      }

      if ((s.armedSkill || s.armedInscriptionRange) && s.aimedTarget) {
        aimMat.opacity = 0.65 + (reduceMotion ? 0.2 : Math.sin(now * 0.012) * 0.25);
        aimMesh.position.set(s.aimedTarget.x, 0.044, s.aimedTarget.y);
        aimMesh.visible = true;
      } else {
        aimMesh.visible = false;
      }

      // Path Preview Breadcrumbs
      let pathIdx = 0;
      if (!s.armedSkill && !s.armedInscriptionRange && s.hoverPath.length > 0) {
        for (let i = 0; i < s.hoverPath.length && pathIdx < MAX_PATH; i++) {
          const step = s.hoverPath[i];
          const dot = pathDots[pathIdx++];
          dot.position.set(step.x, 0.14, step.y);
          const isEnd = i === s.hoverPath.length - 1;
          const sc = isEnd ? 1.35 : 0.85;
          dot.scale.set(sc, sc, sc);
          dot.visible = true;
        }
      }
      for (let i = pathIdx; i < MAX_PATH; i++) {
        pathDots[i].visible = false;
      }

      // === DYNAMIC ENTITIES (Sprites, Shadows, Rings) ===
      let sprIdx = 0;
      let shdIdx = 0;
      let rngIdx = 0;

      const placeShadow = (wx: number, wz: number, scale: number) => {
        const sh = ensureMesh(shadowPool, shdIdx++, geos.shadowDisc, entitiesGroup);
        sh.material = mats.getBasic('shadow:contact', () =>
          new THREE.MeshBasicMaterial({
            map: shadowTex,
            transparent: true,
            opacity: 0.72,
            depthWrite: false,
          })
        );
        sh.position.set(wx, 0.022, wz);
        sh.scale.set(scale, scale, scale);
        sh.visible = true;
      };

      const placeRing = (wx: number, wz: number, colorHex: number, scale: number, opacity = 0.85) => {
        const rg = ensureMesh(ringPool, rngIdx++, geos.floorRing, entitiesGroup);
        rg.material = mats.getBasic(`ring:${colorHex}:${opacity.toFixed(2)}`, () =>
          new THREE.MeshBasicMaterial({
            color: colorHex,
            transparent: true,
            opacity,
            side: THREE.DoubleSide,
            depthWrite: false,
          })
        );
        rg.position.set(wx, 0.03, wz);
        rg.scale.set(scale, scale, scale);
        rg.visible = true;
      };

      const placeSprite = (
        wx: number,
        wy: number,
        wz: number,
        canvas: HTMLCanvasElement,
        cacheKey: string,
        size: number,
        flipX = false,
        opacity = 1,
        tint = 0xffffff
      ) => {
        const sp = ensureMesh(spriteMeshesPool, sprIdx++, geos.billboard, entitiesGroup);
        const tex = textureFromCanvas(cacheKey, canvas, flipX);
        sp.material = mats.getBasic(`sp:${cacheKey}:${flipX ? 1 : 0}:${opacity.toFixed(2)}:${tint}`, () =>
          new THREE.MeshBasicMaterial({
            map: tex,
            color: tint,
            transparent: true,
            opacity,
            alphaTest: 0.1,
            side: THREE.DoubleSide,
          })
        );
        sp.position.set(wx, wy, wz);
        sp.scale.set(size, size, 1);
        sp.quaternion.copy(camera.quaternion);
        sp.renderOrder = 2;
        sp.visible = true;
      };

      const getHitFlashTint = (tx: number, ty: number): number | null => {
        for (const hf of s.hitFlashes) {
          if (now <= hf.until && hf.x === tx && hf.y === ty) {
            return hf.color === 'white' ? 0xffffff : new THREE.Color(hf.color).getHex();
          }
        }
        return null;
      };

      // Screen-right projection for camera-aware horizontal sprite facing
      const camRightX = Math.sin(s.yawRad);
      const heroScreenDot = (s.player.lastDirX || 1) * camRightX;
      const heroFlipX = heroScreenDot < -0.05 ? true : heroScreenDot > 0.05 ? false : s.player.lastDirX === -1;

      // 1. Ground Loot
      for (const drop of s.zone.loot) {
        const tile = s.zone.tiles[drop.y]?.[drop.x];
        if (!tile?.visible) continue;
        const bob = reduceMotion ? 0 : Math.sin(now * 0.005 + drop.x) * 0.05;
        const rarity = drop.item?.rarity;
        if (rarity === 'Rare' || rarity === 'Epic' || rarity === 'Relic') {
          const gleamHex = rarity === 'Relic' ? '#f59e0b' : rarity === 'Epic' ? '#c084fc' : '#60a5fa';
          const sh = ensureMesh(shadowPool, shdIdx++, geos.shadowDisc, entitiesGroup);
          sh.material = mats.getBasic(`gleam:${gleamHex}`, () =>
            new THREE.MeshBasicMaterial({
              map: getGlowDiscTexture(gleamHex),
              transparent: true,
              opacity: 0.68,
              depthWrite: false,
            })
          );
          sh.position.set(drop.x, 0.024, drop.y);
          sh.scale.set(0.95, 0.95, 0.95);
          sh.visible = true;
        }
        const lootSprite = getLootSprite(drop.item);
        const lootKey = drop.item
          ? `loot:${drop.item.category}:${drop.item.consumableKind ?? ''}:${drop.item.inscriptionCategory ?? ''}:${drop.item.rarity}`
          : 'loot:gold';
        placeSprite(drop.x, 0.06 + bob, drop.y, lootSprite, lootKey, 0.68);
      }

      // 2. Critters
      for (const critter of s.zone.critters ?? []) {
        const ctile = s.zone.tiles[critter.y]?.[critter.x];
        if (!ctile?.visible && !(s.zone.id === 'overworld' && ctile?.explored)) continue;
        const cFrame = (spriteFrame + critter.x + critter.y) % 2;
        const cSprite = getCritterSprite(critter.kind, cFrame);
        placeShadow(critter.x, critter.y, 0.55);
        placeSprite(critter.x, 0.04, critter.y, cSprite, `critter:${critter.kind}:${cFrame}`, 0.64);
      }

      // 3. NPCs
      for (const npc of s.zone.npcs) {
        const ntile = s.zone.tiles[npc.y]?.[npc.x];
        if (!ntile?.explored) continue;
        placeShadow(npc.x, npc.y, 0.85);
        const npcSprite = getNpcSprite(npc.id, npc.color);
        const dim = ntile.visible ? 0xffffff : 0x64748b;
        placeSprite(npc.x, 0.03, npc.y, npcSprite, `npc:${npc.id}:${npc.color}`, 0.96, false, 1, dim);
      }

      // 4. Enemies & Bosses (tracked for 2D HUD bars/badges)
      const projectedEnemies: Array<{
        enemy: Enemy;
        wx: number;
        wz: number;
        height: number;
      }> = [];

      const activeEnemyIds = new Set<string>();
      for (const enemy of s.zone.enemies) {
        const tile = s.zone.tiles[enemy.y]?.[enemy.x];
        if (!tile?.visible) continue;
        activeEnemyIds.add(enemy.id);

        let vis = s.enemyVisPos.get(enemy.id);
        if (!vis) {
          vis = { x: enemy.x, z: enemy.y };
          s.enemyVisPos.set(enemy.id, vis);
        } else {
          const eLerp = reduceMotion ? 1 : Math.min(1, dt * 16);
          vis.x += (enemy.x - vis.x) * eLerp;
          vis.z += (enemy.y - vis.z) * eLerp;
        }

        const isMajor = enemy.isBoss || enemy.rank === 'randboss';
        placeShadow(vis.x, vis.z, isMajor ? 1.18 : 0.92);

        if (enemy.isBoss || enemy.isElite || enemy.rank === 'rare' || enemy.rank === 'randboss') {
          const ringColor =
            enemy.isBoss || enemy.rank === 'randboss'
              ? 0xf59e0b
              : enemy.rank === 'rare'
                ? 0x38bdf8
                : 0xc084fc;
          placeRing(vis.x, vis.z, ringColor, isMajor ? 1.15 : 0.95);
        }

        const isShielded = enemy.statuses.some((st) => st.kind === 'shielded') || enemy.runeCharge;
        if (isShielded) {
          placeRing(vis.x, vis.z, enemy.runeCharge ? 0x38bdf8 : 0x60a5fa, 1.05, 0.7);
        }

        const enemyAnim = (spriteFrame + (enemy.x + enemy.y)) % 2;
        const eSprite = getEnemySprite(enemy.archetype, enemyAnim);
        const stunned = enemy.statuses.some((st) => st.kind === 'stunned');
        const enemyBob =
          reduceMotion || stunned
            ? 0
            : enemy.archetype === 'cinder_wisp' || enemy.archetype === 'dread_wraith'
              ? 0.08 + Math.sin(now * 0.006 + enemy.x) * 0.07
              : 0;
        const size = isMajor ? 1.24 : 0.98;
        const flashTint = getHitFlashTint(enemy.x, enemy.y);
        placeSprite(
          vis.x,
          0.03 + enemyBob,
          vis.z,
          eSprite,
          `enemy:${enemy.archetype}:${enemyAnim}`,
          size,
          false,
          stunned ? 0.65 : 1,
          flashTint ?? 0xffffff
        );

        projectedEnemies.push({ enemy, wx: vis.x, wz: vis.z, height: size + enemyBob + 0.08 });
      }
      for (const id of s.enemyVisPos.keys()) {
        if (!activeEnemyIds.has(id)) s.enemyVisPos.delete(id);
      }

      // 5. Spirit Companion
      let projectedComp: { comp: CompanionState; wx: number; wz: number; height: number } | null = null;
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
          const cLerp = reduceMotion ? 1 : Math.min(1, dt * 16);
          s.compVisX += (comp.x - s.compVisX) * cLerp;
          s.compVisZ += (comp.y - s.compVisZ) * cLerp;

          placeShadow(s.compVisX, s.compVisZ, 0.78);
          const compSprite = getCompanionSprite(comp.kind, spriteFrame);
          const compBob = reduceMotion
            ? 0
            : comp.kind === 'starlight_owl'
              ? 0.09 + Math.sin(now * 0.007) * 0.06
              : Math.sin(now * 0.006) > 0.35
                ? 0.04
                : 0;
          placeSprite(
            s.compVisX,
            0.04 + compBob,
            s.compVisZ,
            compSprite,
            `comp:${comp.kind}:${spriteFrame}`,
            0.84
          );
          projectedComp = { comp, wx: s.compVisX, wz: s.compVisZ, height: 0.92 + compBob };
        }
      }

      // 6. Hero (Garth Elfstrom)
      {
        const hasWard = s.player.statuses.some(
          (st) => st.kind === 'shielded' || st.kind === 'spine_guard'
        );
        const aura = ensureMesh(shadowPool, shdIdx++, geos.shadowDisc, entitiesGroup);
        aura.material = mats.getBasic('hero:aura', () =>
          new THREE.MeshBasicMaterial({
            map: getGlowDiscTexture('#f59e0b'),
            transparent: true,
            opacity: 0.45,
            depthWrite: false,
          })
        );
        aura.position.set(s.heroVisX, 0.02, s.heroVisZ);
        aura.scale.set(1.45, 1.45, 1.45);
        aura.visible = true;

        placeShadow(s.heroVisX, s.heroVisZ, 0.96);
        if (hasWard) {
          placeRing(s.heroVisX, s.heroVisZ, 0x38bdf8, 1.05, 0.85);
        }

        const { body, weapon } = getPlayerSprite(s.player, spriteFrame);
        const bob = reduceMotion ? 0 : Math.sin(now * 0.005) > 0.3 ? 0.04 : 0;
        const heroTint = getHitFlashTint(s.player.x, s.player.y) ?? 0xffffff;
        const wItem = s.player.equipped.weapon;
        const armorItem = s.player.equipped.armor;
        const helmItem = s.player.equipped.helm;
        const heroKey = `hero:${s.player.starterClass}:${spriteFrame}:${armorItem?.rarity ?? 'base'}:${helmItem ? 'h' : 'n'}`;
        const wpnKey = `wpn:${s.player.starterClass}:${wItem?.rarity ?? 'base'}:${wItem?.name ?? 'sword'}`;

        placeSprite(s.heroVisX, 0.03 + bob, s.heroVisZ, body, heroKey, 1.02, heroFlipX, 1, heroTint);
        // Slightly offset weapon billboard forward toward camera so it renders cleanly over body
        const fwdOffsetX = Math.cos(s.yawRad) * 0.03;
        const fwdOffsetZ = Math.sin(s.yawRad) * 0.03;
        placeSprite(
          s.heroVisX + fwdOffsetX,
          0.03 + bob,
          s.heroVisZ + fwdOffsetZ,
          weapon,
          wpnKey,
          1.02,
          heroFlipX,
          1,
          heroTint
        );
      }

      for (let i = sprIdx; i < spriteMeshesPool.length; i++) spriteMeshesPool[i].visible = false;
      for (let i = shdIdx; i < shadowPool.length; i++) shadowPool[i].visible = false;
      for (let i = rngIdx; i < ringPool.length; i++) ringPool[i].visible = false;

      // === 3D PROJECTILES, PARTICLE BURSTS & RISING EMBERS ===
      let pIdx = 0;
      for (const proj of s.projectiles) {
        const age = now - proj.createdAt;
        if (age > proj.duration) continue;
        const t = age / proj.duration;
        const cx = proj.fromX + (proj.toX - proj.fromX) * t;
        const cz = proj.fromY + (proj.toY - proj.fromY) * t;
        const arcY = 0.48 + Math.sin(t * Math.PI) * 0.25;

        const grp = ensureProj(pIdx++);
        grp.position.set(cx, arcY, cz);
        grp.lookAt(proj.toX, 0.48, proj.toY);
        const tailMesh = grp.children[1] as THREE.Mesh;
        (tailMesh.material as THREE.MeshBasicMaterial).color.set(proj.color);
        grp.visible = true;
      }
      for (let i = pIdx; i < projPool.length; i++) projPool[i].visible = false;

      let spkIdx = 0;
      for (const p of s.particles) {
        const age = now - p.createdAt;
        if (age > p.duration) continue;
        const t = age / p.duration;
        const spk = ensureMesh(sparkPool, spkIdx++, geos.spark, fxGroup);
        spk.material = mats.getBasic(`spk:${p.color}`, () =>
          new THREE.MeshBasicMaterial({ color: p.color, transparent: true })
        );
        spk.position.set(
          p.x + p.vx * t * 1.4,
          0.35 + Math.sin(t * Math.PI) * 0.45,
          p.y + p.vy * t * 1.4
        );
        const sc = Math.max(0.2, 1 - t);
        spk.scale.set(sc, sc, sc);
        spk.visible = true;
      }

      if (!reduceMotion && emberSources.length > 0) {
        for (const src of emberSources) {
          for (let k = 0; k < 2; k++) {
            const t = (now * 0.0008 + src.x * 0.37 + src.z * 0.53 + k * 0.5) % 1;
            const spk = ensureMesh(sparkPool, spkIdx++, geos.spark, fxGroup);
            spk.material = mats.getBasic(`ember:${src.color}`, () =>
              new THREE.MeshBasicMaterial({ color: src.color, transparent: true, opacity: 0.75 })
            );
            spk.position.set(
              src.x + Math.sin(t * Math.PI * 2 + src.x + k) * 0.16,
              0.35 + t * 0.85,
              src.z + Math.cos(t * Math.PI * 2 + src.z + k) * 0.12
            );
            const sc = Math.sin(t * Math.PI) * 0.75;
            spk.scale.set(sc, sc, sc);
            spk.visible = true;
          }
        }
      }
      for (let i = spkIdx; i < sparkPool.length; i++) sparkPool[i].visible = false;

      // Render 3D scene
      renderer.render(scene, camera);

      // === 2D PROJECTED HUD OVERLAY (Crisp HP bars, Badges, Damage Numbers, Minimap) ===
      const hctx = hudCanvas.getContext('2d');
      if (hctx) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        hctx.save();
        hctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        hctx.clearRect(0, 0, viewW, viewH);

        // Enemy HP bars, rank badges, and ! intent markers
        for (const item of projectedEnemies) {
          const { enemy, wx, wz, height } = item;
          const top = projectToScreen(wx, height, wz);
          const barW = Math.max(24, Math.min(44, s.tileSize * 0.92));

          if (enemy.hp < enemy.maxHp) {
            const ratio = Math.max(0, enemy.hp / enemy.maxHp);
            const bx = Math.round(top.sx - barW / 2);
            const by = Math.round(top.sy - 6);
            hctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            hctx.fillRect(bx - 1, by - 1, barW + 2, 5);
            hctx.fillStyle = '#EF4444';
            hctx.fillRect(bx, by, barW * ratio, 3);
          }

          if (enemy.rank === 'randboss' || enemy.rank === 'rare') {
            const isRandboss = enemy.rank === 'randboss';
            const rx = Math.round(top.sx - barW / 2 - 12);
            const ry = Math.round(top.sy - 12);
            hctx.fillStyle = isRandboss ? '#F59E0B' : '#38BDF8';
            hctx.fillRect(rx, ry, 11, 11);
            hctx.font = '700 8px "JetBrains Mono", monospace';
            hctx.fillStyle = '#090B10';
            hctx.textAlign = 'center';
            hctx.textBaseline = 'middle';
            hctx.fillText(isRandboss ? '♛' : '◆', rx + 5.5, ry + 5.5);
          }

          if (enemy.intent) {
            const ix = Math.round(top.sx + barW / 2 + 2);
            const iy = Math.round(top.sy - 13);
            hctx.fillStyle = '#EF4444';
            hctx.fillRect(ix, iy, 9, 11);
            hctx.font = '700 10px "JetBrains Mono", monospace';
            hctx.fillStyle = '#FEF2F2';
            hctx.textAlign = 'center';
            hctx.textBaseline = 'middle';
            hctx.fillText('!', ix + 4.5, iy + 5.5);
          }
        }

        // Companion HP bar
        if (projectedComp && projectedComp.comp.hp < projectedComp.comp.maxHp) {
          const top = projectToScreen(projectedComp.wx, projectedComp.height, projectedComp.wz);
          const barW = Math.max(22, Math.min(36, s.tileSize * 0.8));
          const ratio = Math.max(0, projectedComp.comp.hp / projectedComp.comp.maxHp);
          const bx = Math.round(top.sx - barW / 2);
          const by = Math.round(top.sy - 5);
          hctx.fillStyle = 'rgba(0,0,0,0.85)';
          hctx.fillRect(bx - 1, by - 1, barW + 2, 4.5);
          hctx.fillStyle = '#38BDF8';
          hctx.fillRect(bx, by, barW * ratio, 2.5);
        }

        // Floating combat numbers projected from 3D world coords
        hctx.textAlign = 'center';
        hctx.textBaseline = 'middle';
        for (const fx of s.floatingEffects) {
          const age = now - fx.createdAt;
          if (age > fx.duration) continue;
          const t = age / fx.duration;
          const pt = projectToScreen(fx.x, 1.05 + t * 0.8, fx.y);
          hctx.globalAlpha = Math.min(1, (1 - t) * 1.45);
          hctx.font = '700 12px "JetBrains Mono", monospace';
          hctx.fillStyle = '#090B10';
          hctx.fillText(fx.text, pt.sx + 1, pt.sy + 1);
          hctx.fillStyle = fx.color;
          hctx.fillText(fx.text, pt.sx, pt.sy);
          hctx.globalAlpha = 1;
        }

        // Ambient biome motes
        if (!reduceMotion) {
          const sec = now * 0.001;
          hctx.fillStyle = atmo.moteCss;
          for (const m of AMBIENT_MOTES) {
            const mx = ((m.rx + sec * m.speedX + 10) % 1) * viewW;
            const my = ((m.ry + sec * m.speedY + 10) % 1) * viewH;
            const pulse = 0.5 + 0.5 * Math.sin(sec * 2 + m.phase);
            hctx.globalAlpha = pulse * 0.85;
            hctx.fillRect(Math.round(mx), Math.round(my), m.size, m.size);
          }
          hctx.globalAlpha = 1;
        }

        // Subtle atmospheric edge vignette
        const vig = hctx.createRadialGradient(
          viewW / 2,
          viewH / 2,
          Math.min(viewW, viewH) * 0.34,
          viewW / 2,
          viewH / 2,
          Math.max(viewW, viewH) * 0.74
        );
        vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vig.addColorStop(1, 'rgba(5, 7, 12, 0.48)');
        hctx.fillStyle = vig;
        hctx.fillRect(0, 0, viewW, viewH);

        // Corner Minimap (Desktop bottom-right or Mobile toggle top-right)
        const showDesktopMap = viewW >= 768 && viewH >= 320;
        const showCompactMobileMap = viewW < 768 && s.showMobileMap;
        if (showDesktopMap || showCompactMobileMap) {
          const cell = showDesktopMap ? 3 : 2.5;
          const mmW = s.zone.width * cell;
          const mmH = s.zone.height * cell;
          const mmX = viewW - mmW - (showDesktopMap ? 14 : 10);
          const mmY = showDesktopMap ? viewH - mmH - 14 : 48;

          hctx.fillStyle = 'rgba(9, 11, 16, 0.9)';
          hctx.fillRect(mmX - 4, mmY - 4, mmW + 8, mmH + 8);
          hctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
          hctx.lineWidth = 1;
          hctx.strokeRect(mmX - 4.5, mmY - 4.5, mmW + 9, mmH + 9);

          for (let my = 0; my < s.zone.height; my++) {
            for (let mx = 0; mx < s.zone.width; mx++) {
              const t = s.zone.tiles[my][mx];
              if (!t.explored) continue;
              if (t.kind === 'wall') {
                hctx.fillStyle = t.visible ? '#475569' : '#232936';
              } else if (t.kind === 'vault_door') {
                hctx.fillStyle = '#FB923C';
              } else if (t.kind === 'stairs_down' || t.kind === 'gate_city') {
                hctx.fillStyle = '#F59E0B';
              } else if (t.kind === 'stairs_up') {
                hctx.fillStyle = '#60A5FA';
              } else if (t.kind === 'shrine' || t.kind === 'whispering_bell') {
                hctx.fillStyle = '#A78BFA';
              } else {
                hctx.fillStyle = t.visible ? '#1D2433' : '#121620';
              }
              hctx.fillRect(mmX + mx * cell, mmY + my * cell, cell, cell);
            }
          }

          for (const npc of s.zone.npcs) {
            hctx.fillStyle = '#38BDF8';
            hctx.fillRect(mmX + npc.x * cell, mmY + npc.y * cell, cell, cell);
          }
          for (const enemy of s.zone.enemies) {
            if (!s.zone.tiles[enemy.y]?.[enemy.x]?.visible) continue;
            hctx.fillStyle = enemy.isBoss ? '#F43F5E' : '#EF4444';
            hctx.fillRect(mmX + enemy.x * cell, mmY + enemy.y * cell, cell, cell);
          }
          hctx.fillStyle = '#FDE047';
          hctx.fillRect(mmX + s.player.x * cell, mmY + s.player.y * cell, cell, cell);

          // Tiny compass badge showing camera view direction relative to map North
          const angleN = -(s.yawRad + Math.PI / 2);
          const compCx = mmX + mmW - 6;
          const compCy = mmY - 15;
          hctx.fillStyle = 'rgba(13, 18, 26, 0.92)';
          hctx.beginPath();
          hctx.arc(compCx, compCy, 9, 0, Math.PI * 2);
          hctx.fill();
          hctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
          hctx.lineWidth = 1;
          hctx.stroke();
          hctx.font = '700 8px "JetBrains Mono", monospace';
          hctx.fillStyle = '#FDE047';
          hctx.textAlign = 'center';
          hctx.textBaseline = 'middle';
          hctx.fillText('N', compCx, compCy + 0.5);
          hctx.strokeStyle = 'rgba(253, 224, 71, 0.78)';
          hctx.lineWidth = 1.4;
          hctx.beginPath();
          hctx.moveTo(compCx, compCy);
          hctx.lineTo(compCx + Math.cos(angleN) * 8, compCy + Math.sin(angleN) * 8);
          hctx.stroke();
        }

        hctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      terrainContainer.clear();
      overlayGroup.clear();
      entitiesGroup.clear();
      fxGroup.clear();
      disposeIsoGeometries(geos);
      rangeRingGeo.dispose();
      squareFrameGeo.dispose();
      pathDotMat.dispose();
      pathStartMat.dispose();
      teleFillMat.dispose();
      teleExclaimMat.dispose();
      hoverMat.dispose();
      aimMat.dispose();
      mats.dispose();
      renderer.dispose();
    };
  }, []);

  // Exact 3D raycast onto visible non-cutaway obstacles first, then ground plane y = 0
  const coordFromClient = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const glCanvas = glCanvasRef.current;
    const s = stateRef.current;
    if (!glCanvas || !s.camera) return null;
    const rect = glCanvas.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), s.camera);

    let bestDist = Infinity;
    let bestCoord: { x: number; y: number } | null = null;
    const box = new THREE.Box3();
    const hitPoint = new THREE.Vector3();

    for (let i = 0; i < s.nodes.length; i++) {
      const node = s.nodes[i];
      if (!node.isTallObstacle || node.lastState === 'hidden') continue;
      if (s.cutawaySet.has(`${node.x},${node.y}`)) continue;
      box.min.set(node.x - 0.5, 0, node.y - 0.5);
      box.max.set(node.x + 0.5, node.tallHeight, node.y + 0.5);
      const hit = raycaster.ray.intersectBox(box, hitPoint);
      if (hit) {
        const d = raycaster.ray.origin.distanceToSquared(hit);
        if (d < bestDist) {
          bestDist = d;
          bestCoord = { x: node.x, y: node.y };
        }
      }
    }

    if (bestCoord) return bestCoord;

    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const groundHit = raycaster.ray.intersectPlane(groundPlane, hitPoint);
    if (!groundHit) return null;

    const tx = Math.round(groundHit.x);
    const ty = Math.round(groundHit.z);
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

    if (!armedSkill && !armedInscriptionRange) {
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
      const [stepX, stepY] = worldDirFromScreenDrag(dx, dy, stateRef.current.yawRad);
      if (stepX !== 0 || stepY !== 0) {
        setHoverInfo(null);
        onStep(stepX, stepY);
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

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (Math.abs(e.deltaY) < 12) return;
    if (e.deltaY < 0 && zoomIndex < ZOOM_STEPS.length - 1) {
      setTileSize(ZOOM_STEPS[zoomIndex + 1]);
    } else if (e.deltaY > 0 && zoomIndex > 0) {
      setTileSize(ZOOM_STEPS[zoomIndex - 1]);
    }
  };

  if (webglError) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-[#090C11] text-slate-300 p-6 text-center">
        <div className="max-w-md space-y-2 rounded border border-rose-500/35 bg-[#0E1219] p-5">
          <div className="text-sm font-semibold text-amber-200">2.5D WebGL View Unavailable</div>
          <div className="text-xs text-slate-400">
            Could not initialize WebGL ({webglError}). Please enable hardware acceleration or use a WebGL-capable browser.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none">
      <canvas
        ref={glCanvasRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
        onWheel={handleWheel}
        className={`block w-full h-full touch-none ${
          inspectMode
            ? 'cursor-help'
            : armedSkill || armedInscriptionRange
              ? 'cursor-crosshair'
              : 'cursor-pointer'
        }`}
      />
      <canvas
        ref={hudCanvasRef}
        className="pointer-events-none absolute inset-0 block w-full h-full"
      />

      {/* Desktop Camera Orbit & Zoom Controls (Bottom-Left) */}
      <div className="hidden md:flex absolute bottom-3 left-3 z-20 items-center gap-1 rounded border border-white/12 bg-[#0D121A]/85 px-1.5 py-1 shadow-lg backdrop-blur-sm">
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            rotateCamera(-1);
          }}
          title="Rotate camera left ([)"
          aria-label="Rotate camera left"
          className="h-7 w-7 rounded hover:bg-white/10 text-slate-200 flex items-center justify-center cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            rotateCamera(1);
          }}
          title="Rotate camera right (])"
          aria-label="Rotate camera right"
          className="h-7 w-7 rounded hover:bg-white/10 text-slate-200 flex items-center justify-center cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-white/12 mx-0.5" />
        <button
          type="button"
          disabled={zoomIndex <= 0}
          onClick={(e) => {
            e.currentTarget.blur();
            if (zoomIndex > 0) setTileSize(ZOOM_STEPS[zoomIndex - 1]);
          }}
          title="Zoom out"
          aria-label="Zoom out"
          className="h-7 w-7 rounded hover:bg-white/10 text-slate-200 disabled:opacity-35 flex items-center justify-center cursor-pointer"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={zoomIndex >= ZOOM_STEPS.length - 1}
          onClick={(e) => {
            e.currentTarget.blur();
            if (zoomIndex < ZOOM_STEPS.length - 1) setTileSize(ZOOM_STEPS[zoomIndex + 1]);
          }}
          title="Zoom in"
          aria-label="Zoom in"
          className="h-7 w-7 rounded hover:bg-white/10 text-slate-200 disabled:opacity-35 flex items-center justify-center cursor-pointer"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Mobile Top-Right Rotate / Look / Map / Zoom Controls */}
      <div className="md:hidden absolute top-2 right-2 z-20 flex items-center gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            rotateCamera(1);
          }}
          aria-label="Rotate isometric camera"
          className="h-11 w-11 rounded border border-white/15 bg-[#0D121A]/88 text-slate-200 flex items-center justify-center shadow-md cursor-pointer"
        >
          <RotateCw className="w-4 h-4" />
        </button>

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
