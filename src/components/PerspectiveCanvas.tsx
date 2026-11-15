import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Eye,
  Map as MapIcon,
  RotateCcw,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import * as THREE from 'three';
import { chebyshev, findPathPoints } from '../game/combat';
import { createEntity3DPool, Entity3DPool } from '../game/entityModels3d';
import { createHeroModel3D, HeroModel3D } from '../game/heroModel3d';
import {
  CameraYawIndex,
  normalizeYawIndex,
} from '../game/cameraYaw';
import {
  getBiomeAtmosphere,
  getContactShadowTexture,
  getGlowDiscTexture,
  getLootBeamTexture,
  getTelegraphExclaimTexture,
} from '../game/sceneMaterials';
import {
  buildZoneTerrain,
  createSceneGeometries,
  disposeSceneGeometries,
  SceneGeometries,
  SceneMaterialPool,
  syncTileNode,
  TileNode,
} from '../game/sceneBuilder';
import {
  CameraViewMode,
  getCardinalYawRadians,
  getPerspectivePose,
  isCardinalOccluder,
  yawRadToCompassDeg,
} from '../game/perspectiveCamera';
import { shouldDrawTelegraphMarker } from '../game/settings';
import { SKILLS } from '../game/skills';
import { BiomeId, getZoneBiome } from '../game/tileset';
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

export interface PerspectiveCanvasProps {
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
  viewMode?: CameraViewMode;
  onCameraYawChange?: (yaw: CameraYawIndex) => void;
  onViewModeChange?: (mode: CameraViewMode) => void;
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

interface HitEntity {
  x: number;
  y: number;
  wx: number;
  wz: number;
  height: number;
  radius: number;
}

function getTileContextHint(tile: Tile): string | null {
  if (tile.used) return 'Already exhausted or collected.';
  switch (tile.kind) {
    case 'shrine':
      return 'Step onto & press ACT (Space) to respec attributes, skills, or receive blessing.';
    case 'brazier':
      return 'Step onto & press ACT (Space) to restore HP & Mana once.';
    case 'chest':
      return 'Step onto & press ACT (Space) to pry open for gear, gold, or potions.';
    case 'vault_door':
      return 'Sealed Treasure Vault — press ACT adjacent to unseal high-tier loot & Rare guards.';
    case 'waystone':
      return 'Step onto & press ACT (Space) to attune an Elven Waystone blessing or recharge runes.';
    case 'forgotten_forge':
      return 'Step onto & press ACT (Space) to temper equipped gear or smelt Relic cache.';
    case 'cursed_altar':
      return 'Step onto & press ACT (Space) to risk vitality for a Relic pact or purify the stone.';
    case 'lore_tablet':
      return 'Step onto & press ACT (Space) to transcribe this carved stele into your Codex.';
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
      return 'Press ACT (Space) or click Descend to venture deeper.';
    case 'stairs_up':
      return 'Press ACT (Space) or click Ascend to return toward safety.';
    case 'gate_city':
      return 'Press ACT (Space) to travel along the safe Citadel Road.';
    case 'herb_node':
      return 'Quest flora — step onto & press ACT (Space) to harvest for Mira.';
    case 'contraband_cache':
      return 'Quest stash — step onto & press ACT (Space) to recover for Vex.';
    case 'whispering_bell':
      return 'Quest relic — step onto & press ACT (Space) to chime for Lyra (weakens Malakor).';
    case 'chasm':
      return 'Impassable ember fissure (can be crossed with Shadowstep or Phase Door).';
    case 'water':
      return 'Deep water — blocks walking, lets arrows and bolts pass.';
    default:
      return null;
  }
}

const ZOOM_STEPS = [28, 36, 44] as const;
const VIEW_MODES: Array<{ id: CameraViewMode; label: string; title: string }> = [
  { id: 'chase', label: '3rd', title: '3rd Person Chase 3D (V)' },
  { id: 'first', label: '1st', title: '1st Person Dungeon Crawl (V)' },
  { id: 'tactical', label: 'Top', title: 'Overhead Cardinal 3D (V)' },
];

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

function createSkyDomeGeometry(horizonHex: number, zenithHex: number): THREE.SphereGeometry {
  const geo = new THREE.SphereGeometry(85, 20, 12);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const cHorizon = new THREE.Color(horizonHex);
  const cZenith = new THREE.Color(zenithHex);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = Math.max(0, Math.min(1, (y + 10) / 75));
    tmp.copy(cHorizon).lerp(cZenith, Math.pow(t, 0.75));
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

function getSkyPalette(biome: BiomeId): { horizon: number; zenith: number } {
  switch (biome) {
    case 'cinderwatch':
      return { horizon: 0x3b1710, zenith: 0x0f0708 };
    case 'thornwick':
      return { horizon: 0x133330, zenith: 0x051010 };
    case 'highspire':
      return { horizon: 0x242a40, zenith: 0x0a0d16 };
    case 'overworld':
      return { horizon: 0x153024, zenith: 0x06100b };
    default:
      return { horizon: 0x192838, zenith: 0x080d14 };
  }
}

export const PerspectiveCanvas: React.FC<PerspectiveCanvasProps> = ({
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
  viewMode: controlledViewMode,
  onCameraYawChange,
  onViewModeChange,
  onTileSizeChange,
  onTileClick,
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
      // ignore
    }
    return 36;
  });

  const tileSize = controlledTileSize ?? internalTileSize;
  const setTileSize = (next: number) => {
    if (onTileSizeChange) onTileSizeChange(next);
    else setInternalTileSize(next);
  };

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

  const [internalViewMode, setInternalViewMode] = useState<CameraViewMode>(() => {
    try {
      const v = localStorage.getItem('elfstory3d-view-mode');
      if (v === 'chase' || v === 'first' || v === 'tactical') return v;
    } catch {
      // ignore
    }
    return 'chase';
  });

  const viewMode = controlledViewMode ?? internalViewMode;
  const setViewMode = (next: CameraViewMode) => {
    if (onViewModeChange) onViewModeChange(next);
    else setInternalViewMode(next);
    try {
      localStorage.setItem('elfstory3d-view-mode', next);
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

  const dragRef = useRef<{
    active: boolean;
    pointerId: number;
    startX: number;
    startY: number;
    lastX: number;
    movedPx: number;
    longPressTimer: number | null;
    longPressUsed: boolean;
  }>({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    lastX: 0,
    movedPx: 0,
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
    viewMode: 'chase' as CameraViewMode,
    yawRad: getCardinalYawRadians(0),
    freeYawOffset: 0,
    isDraggingLook: false,
    heroFacingYaw: getCardinalYawRadians(0),
    prevPlayerX: player.x,
    prevPlayerY: player.y,
    attackPulse: 0,
    hoverCoord: null as { x: number; y: number } | null,
    hoverPath: [] as Array<{ x: number; y: number }>,
    camX: player.x,
    camZ: player.y,
    camEye: new THREE.Vector3(player.x, 2.3, player.y + 3.2),
    camLook: new THREE.Vector3(player.x, 0.72, player.y - 2.1),
    camFov: 56,
    heroVisX: player.x,
    heroVisZ: player.y,
    enemyVisPos: new Map<string, EnemyRenderCache>(),
    compVisX: player.companion?.x ?? player.x,
    compVisZ: player.companion?.y ?? player.y,
    camera: null as THREE.PerspectiveCamera | null,
    nodes: [] as TileNode[],
    cutawaySet: new Set<string>(),
    hitEntities: [] as HitEntity[],
    lastZoneKey: '',
    onCameraYawChange,
  });

  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

  useEffect(() => {
    const s = stateRef.current;
    if (zone.id === s.zone.id && (player.x !== s.prevPlayerX || player.y !== s.prevPlayerY)) {
      const dx = player.x - s.prevPlayerX;
      const dy = player.y - s.prevPlayerY;
      if (Math.abs(dx) + Math.abs(dy) > 0 && Math.abs(dx) + Math.abs(dy) <= 2) {
        s.heroFacingYaw = Math.atan2(dx, -dy);
      }
      s.prevPlayerX = player.x;
      s.prevPlayerY = player.y;
    } else if (zone.id !== s.zone.id) {
      s.prevPlayerX = player.x;
      s.prevPlayerY = player.y;
    }

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
    s.viewMode = viewMode;
    s.onCameraYawChange = onCameraYawChange;

    if (hitFlashes.some((hf) => hf.until > performance.now() - 80 && chebyshev(hf.x, hf.y, player.x, player.y) === 1)) {
      s.attackPulse = 1;
    }

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
    viewMode,
    onCameraYawChange,
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
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(56, 1.4, 0.12, 150);
    stateRef.current.camera = camera;

    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x2d4a3e, 1.3);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfff1d0, 1.45);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.near = 2;
    dirLight.shadow.camera.far = 65;
    dirLight.shadow.camera.left = -16;
    dirLight.shadow.camera.right = 16;
    dirLight.shadow.camera.top = 16;
    dirLight.shadow.camera.bottom = -16;
    dirLight.shadow.bias = -0.0007;
    dirLight.shadow.normalBias = 0.025;
    scene.add(dirLight);
    scene.add(dirLight.target);

    const playerLight = new THREE.PointLight(0xffb347, 4.2, 12.0, 1.3);
    scene.add(playerLight);

    const envLights: THREE.PointLight[] = Array.from({ length: 7 }, () => {
      const pl = new THREE.PointLight(0xfb923c, 0, 8.5, 1.45);
      scene.add(pl);
      return pl;
    });

    const terrainContainer = new THREE.Group();
    const skyGroup = new THREE.Group();
    const overlayGroup = new THREE.Group();
    const entitiesGroup = new THREE.Group();
    const fxGroup = new THREE.Group();
    scene.add(skyGroup, terrainContainer, overlayGroup, entitiesGroup, fxGroup);

    let skyGeo: THREE.SphereGeometry | null = null;
    let skyMat: THREE.MeshBasicMaterial | null = null;

    const geos: SceneGeometries = createSceneGeometries();
    const mats = new SceneMaterialPool();
    const shadowTex = getContactShadowTexture();
    const exclaimTex = getTelegraphExclaimTexture();
    const heroModel: HeroModel3D = createHeroModel3D();
    entitiesGroup.add(heroModel.root);
    const entityPool: Entity3DPool = createEntity3DPool(entitiesGroup);

    const beamGeo = new THREE.PlaneGeometry(0.48, 1.8);
    beamGeo.translate(0, 0.9, 0);

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
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const aimMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

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
            opacity: 0.76,
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

    const squareFrameGeo = new THREE.RingGeometry(0.41, 0.48, 4);
    squareFrameGeo.rotateX(-Math.PI / 2);
    squareFrameGeo.rotateY(Math.PI / 4);
    const hoverMesh = new THREE.Mesh(squareFrameGeo, hoverMat);
    hoverMesh.position.y = 0.04;
    hoverMesh.visible = false;
    overlayGroup.add(hoverMesh);

    const aimMesh = new THREE.Mesh(squareFrameGeo, aimMat);
    aimMesh.position.y = 0.046;
    aimMesh.visible = false;
    overlayGroup.add(aimMesh);

    const MAX_PATH = 24;
    const pathLineGeo = new THREE.BufferGeometry();
    const pathPositions = new Float32Array((MAX_PATH + 1) * 3);
    pathLineGeo.setAttribute('position', new THREE.BufferAttribute(pathPositions, 3));
    const pathLineMat = new THREE.LineBasicMaterial({
      color: 0xfde68a,
      transparent: true,
      opacity: 0.88,
    });
    const pathLine = new THREE.Line(pathLineGeo, pathLineMat);
    pathLine.visible = false;
    overlayGroup.add(pathLine);

    const pathDestMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const pathDestRing = new THREE.Mesh(squareFrameGeo, pathDestMat);
    pathDestRing.position.y = 0.042;
    pathDestRing.scale.set(0.65, 0.65, 0.65);
    pathDestRing.visible = false;
    overlayGroup.add(pathDestRing);

    const shadowPool: THREE.Mesh[] = [];
    const ringPool: THREE.Mesh[] = [];
    const beamPool: THREE.Mesh[] = [];
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
    let animatedNodes: TileNode[] = [];
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
      camera.aspect = viewW / viewH;
      camera.updateProjectionMatrix();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let animId = 0;
    let lastTime = performance.now();
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const tmpVec = new THREE.Vector3();
    const tmpTargetVec = new THREE.Vector3();

    const projectToScreen = (
      wx: number,
      wy: number,
      wz: number
    ): { sx: number; sy: number; visible: boolean } => {
      tmpVec.set(wx, wy, wz).project(camera);
      const visible = tmpVec.z >= -1 && tmpVec.z <= 1;
      return {
        sx: (tmpVec.x * 0.5 + 0.5) * viewW,
        sy: (-tmpVec.y * 0.5 + 0.5) * viewH,
        visible,
      };
    };

    const orientBillY = (mesh: THREE.Object3D, mx: number, mz: number) => {
      mesh.rotation.set(0, Math.atan2(camera.position.x - mx, camera.position.z - mz), 0);
    };

    const render = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      const dt = Math.min(rawDt, 0.05);
      lastTime = now;

      const s = stateRef.current;
      const biome = getZoneBiome(s.zone.id, s.zone.depth);
      const atmo = getBiomeAtmosphere(biome);

      const zoneKey = `${s.zone.id}:${s.zone.depth}:${s.zone.width}x${s.zone.height}`;
      if (s.lastZoneKey !== zoneKey) {
        terrainContainer.clear();
        skyGroup.clear();
        if (skyGeo) skyGeo.dispose();
        if (skyMat) skyMat.dispose();
        skyGeo = null;
        skyMat = null;

        const built = buildZoneTerrain(s.zone, biome, geos, mats);
        terrainContainer.add(built.root);
        s.nodes = built.nodes;
        terrainBillboards = built.billboards;
        animatedNodes = built.animatedNodes;
        s.lastZoneKey = zoneKey;
        s.camX = s.player.x;
        s.camZ = s.player.y;
        s.heroVisX = s.player.x;
        s.heroVisZ = s.player.y;
        s.enemyVisPos.clear();
        s.compVisX = s.player.companion?.x ?? s.player.x;
        s.compVisZ = s.player.companion?.y ?? s.player.y;

        const isOutdoors = s.zone.isTown || s.zone.depth === 0;
        if (isOutdoors) {
          const sp = getSkyPalette(biome);
          skyGeo = createSkyDomeGeometry(sp.horizon, sp.zenith);
          skyMat = new THREE.MeshBasicMaterial({
            vertexColors: true,
            side: THREE.BackSide,
            fog: false,
            depthWrite: false,
          });
          const dome = new THREE.Mesh(skyGeo, skyMat);
          skyGroup.add(dome);
        }

        scene.background = new THREE.Color(atmo.bgHex);
        const fogMul = s.zone.depth >= 1 && !s.zone.isTown ? 1.45 : 0.72;
        scene.fog = new THREE.FogExp2(atmo.fogHex, atmo.fogDensity * fogMul);
        hemiLight.color.setHex(atmo.skyHex);
        hemiLight.groundColor.setHex(atmo.groundHex);
        hemiLight.intensity = atmo.hemiIntensity;
        dirLight.color.setHex(atmo.dirHex);
        dirLight.intensity = atmo.dirIntensity;
        playerLight.color.setHex(atmo.playerLightHex);

        const initPose = getPerspectivePose(
          s.viewMode,
          s.player.x,
          s.player.y,
          getCardinalYawRadians(s.yawIndex),
          s.tileSize
        );
        s.camEye.set(...initPose.eye);
        s.camLook.set(...initPose.target);
        s.camFov = initPose.fov;
      }

      const camLerp = reduceMotion ? 1 : Math.min(1, dt * 12);
      s.camX += (s.player.x - s.camX) * camLerp;
      s.camZ += (s.player.y - s.camZ) * camLerp;
      s.heroVisX += (s.player.x - s.heroVisX) * (reduceMotion ? 1 : Math.min(1, dt * 18));
      s.heroVisZ += (s.player.y - s.heroVisZ) * (reduceMotion ? 1 : Math.min(1, dt * 18));

      if (!s.isDraggingLook) {
        s.freeYawOffset *= Math.max(0, 1 - dt * 12);
        if (Math.abs(s.freeYawOffset) < 0.002) s.freeYawOffset = 0;
      }

      const targetYaw = getCardinalYawRadians(s.yawIndex) + s.freeYawOffset;
      let yawDiff = targetYaw - s.yawRad;
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      s.yawRad += yawDiff * (reduceMotion ? 1 : Math.min(1, dt * (s.isDraggingLook ? 24 : 15)));

      let shakeWorldX = 0;
      let shakeWorldZ = 0;
      if (!reduceMotion && now < s.shakeUntil) {
        const mag = ((s.shakeUntil - now) / 180) * 0.2;
        shakeWorldX = (Math.random() - 0.5) * mag;
        shakeWorldZ = (Math.random() - 0.5) * mag;
      }

      const targetPose = getPerspectivePose(
        s.viewMode,
        s.camX + shakeWorldX,
        s.camZ + shakeWorldZ,
        s.yawRad,
        s.tileSize
      );
      const poseLerp = reduceMotion ? 1 : Math.min(1, dt * 14);
      s.camEye.lerp(tmpVec.set(...targetPose.eye), poseLerp);
      s.camLook.lerp(tmpTargetVec.set(...targetPose.target), poseLerp);
      s.camFov += (targetPose.fov - s.camFov) * poseLerp;

      if (Math.abs(camera.fov - s.camFov) > 0.05) {
        camera.fov = s.camFov;
        camera.updateProjectionMatrix();
      }

      camera.position.copy(s.camEye);
      camera.lookAt(s.camLook);
      camera.updateMatrixWorld();
      skyGroup.position.set(s.camEye.x, 0, s.camEye.z);

      // Keep directional key light centered cleanly near player for soft shadows
      const shadowSnapX = Math.round(s.camX * 4) / 4;
      const shadowSnapZ = Math.round(s.camZ * 4) / 4;
      dirLight.position.set(
        shadowSnapX + Math.sin(s.yawRad - 0.65) * 15,
        22,
        shadowSnapZ - Math.cos(s.yawRad - 0.65) * 15
      );
      dirLight.target.position.set(shadowSnapX, 0, shadowSnapZ);
      dirLight.target.updateMatrixWorld();

      const animFrame = reduceMotion ? 0 : Math.floor(now / 280);
      const spriteFrame = reduceMotion ? 0 : Math.floor(now / 380) % 2;

      const cullRadius = s.viewMode === 'tactical' ? 20 : 24;
      s.cutawaySet.clear();

      const candidateLights: Array<{
        x: number;
        z: number;
        color: number;
        distSq: number;
        phase: number;
        intensity: number;
      }> = [];
      const emberSources: Array<{ x: number; z: number; color: number; isWater?: boolean }> = [];
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
          isCutaway = isCardinalOccluder(
            node.x,
            node.y,
            s.player.x,
            s.player.y,
            s.yawRad,
            s.viewMode
          );
          if (isCutaway) s.cutawaySet.add(`${node.x},${node.y}`);
        }

        syncTileNode(node, tile, inRange, isCutaway, animFrame, biome, s.zone.depth, mats);

        if (inRange && tile.visible) {
          const phase = (node.x * 17 + node.y * 31) * 0.23;
          const distSq = dx * dx + dz * dz;
          if (tile.kind === 'torch' || (tile.kind === 'brazier' && !tile.used)) {
            candidateLights.push({
              x: node.x,
              z: node.y,
              color: isAbyss ? 0xa855f7 : 0xff9b3d,
              distSq,
              phase,
              intensity: 3.3,
            });
            emberSources.push({ x: node.x, z: node.y, color: isAbyss ? 0xc084fc : 0xfdba74 });
          } else if (tile.kind === 'forgotten_forge' && !tile.used) {
            candidateLights.push({
              x: node.x,
              z: node.y,
              color: 0xf97316,
              distSq,
              phase,
              intensity: 3.6,
            });
            emberSources.push({ x: node.x, z: node.y, color: 0xfb923c });
          } else if (tile.kind === 'waystone' && !tile.used) {
            candidateLights.push({
              x: node.x,
              z: node.y,
              color: 0x38bdf8,
              distSq,
              phase,
              intensity: 3.1,
            });
            emberSources.push({ x: node.x, z: node.y, color: 0x7dd3fc });
          } else if (tile.kind === 'cursed_altar' && !tile.used) {
            candidateLights.push({
              x: node.x,
              z: node.y,
              color: 0xe879f9,
              distSq,
              phase,
              intensity: 3.0,
            });
          } else if (tile.kind === 'shrine' || tile.kind === 'whispering_bell') {
            candidateLights.push({
              x: node.x,
              z: node.y,
              color: 0x60a5fa,
              distSq,
              phase,
              intensity: 2.9,
            });
          } else if (tile.kind === 'fountain') {
            candidateLights.push({
              x: node.x,
              z: node.y,
              color: 0x38bdf8,
              distSq,
              phase,
              intensity: 2.1,
            });
            emberSources.push({ x: node.x, z: node.y, color: 0xbae6fd, isWater: true });
          } else if (tile.kind === 'vault_door') {
            candidateLights.push({
              x: node.x,
              z: node.y,
              color: 0xf59e0b,
              distSq,
              phase,
              intensity: 2.5,
            });
          } else if (tile.kind === 'chasm') {
            candidateLights.push({
              x: node.x,
              z: node.y,
              color: 0xea580c,
              distSq,
              phase,
              intensity: 2.0,
            });
          }
        }
      }

      if (!reduceMotion) {
        const sec = now * 0.001;
        for (let i = 0; i < animatedNodes.length; i++) {
          const n = animatedNodes[i];
          if (!n.group.visible) continue;
          const phase = n.x * 0.7 + n.y * 1.1;
          if (n.treeCrownGroup) {
            n.treeCrownGroup.rotation.z = Math.sin(sec * 1.3 + phase) * 0.032;
            n.treeCrownGroup.rotation.x = Math.cos(sec * 1.05 + phase) * 0.022;
          }
          if (n.animatedMesh && n.animatedMesh.visible) {
            if (n.kind === 'shrine' || n.kind === 'waystone' || n.kind === 'cursed_altar') {
              n.animatedMesh.rotation.y = sec * 1.5 + phase;
              n.animatedMesh.position.y = 0.56 + Math.sin(sec * 2.4 + phase) * 0.06;
            } else {
              const fScale = 0.88 + Math.sin(sec * 11 + phase * 3) * 0.16;
              n.animatedMesh.scale.set(
                0.92 + Math.cos(sec * 9 + phase) * 0.08,
                fScale,
                0.92 + Math.sin(sec * 8 + phase) * 0.08
              );
            }
          }
        }
      }

      for (let i = 0; i < terrainBillboards.length; i++) {
        const bb = terrainBillboards[i];
        if (bb.parent?.visible) {
          orientBillY(bb, bb.parent.position.x, bb.parent.position.z);
        }
      }

      playerLight.position.set(s.heroVisX, 1.35, s.heroVisZ);
      const pFlicker = reduceMotion ? 1 : 0.92 + Math.sin(now * 0.005) * 0.08;
      playerLight.intensity = (s.zone.isTown ? 2.6 : 4.5) * pFlicker;

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
        light.position.set(src.x, 0.95, src.z);
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
      const telePulse = 0.24 + (reduceMotion ? 0.08 : Math.sin(now * 0.01) * 0.1);
      teleFillMat.opacity = telePulse;
      const drawExclaim = shouldDrawTelegraphMarker(s.patternSignals, true);
      for (const key of telegraphedKeys) {
        if (teleIdx >= MAX_TELE) break;
        const [txStr, tyStr] = key.split(',');
        const tx = Number(txStr);
        const ty = Number(tyStr);
        if (!s.zone.tiles[ty]?.[tx]?.visible) continue;

        const m = teleMeshes[teleIdx];
        m.position.set(tx, 0.03, ty);
        m.visible = true;

        const ex = teleExclaims[teleIdx];
        if (drawExclaim) {
          ex.position.set(tx, 0.18, ty);
          orientBillY(ex, tx, ty);
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
            opacity: 0.78,
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
            rm.position.set(rx, 0.034, ry);
            rm.visible = true;
          }
        }
      }
      for (let i = rangeIdx; i < MAX_RANGE; i++) {
        rangeMeshes[i].visible = false;
      }

      if (s.hoverCoord) {
        hoverMesh.position.set(s.hoverCoord.x, 0.04, s.hoverCoord.y);
        hoverMesh.visible = true;
      } else {
        hoverMesh.visible = false;
      }

      if ((s.armedSkill || s.armedInscriptionRange) && s.aimedTarget) {
        aimMat.opacity = 0.65 + (reduceMotion ? 0.2 : Math.sin(now * 0.012) * 0.25);
        aimMesh.position.set(s.aimedTarget.x, 0.048, s.aimedTarget.y);
        aimMesh.visible = true;
      } else {
        aimMesh.visible = false;
      }

      if (!s.armedSkill && !s.armedInscriptionRange && s.hoverPath.length > 0) {
        const count = Math.min(MAX_PATH, s.hoverPath.length);
        const attr = pathLineGeo.getAttribute('position') as THREE.BufferAttribute;
        attr.setXYZ(0, s.heroVisX, 0.08, s.heroVisZ);
        for (let i = 0; i < count; i++) {
          attr.setXYZ(i + 1, s.hoverPath[i].x, 0.08, s.hoverPath[i].y);
        }
        attr.needsUpdate = true;
        pathLineGeo.setDrawRange(0, count + 1);
        pathLine.visible = true;

        const dest = s.hoverPath[count - 1];
        pathDestRing.position.set(dest.x, 0.044, dest.y);
        const pulse = reduceMotion ? 0.65 : 0.6 + Math.sin(now * 0.008) * 0.1;
        pathDestRing.scale.set(pulse, pulse, pulse);
        pathDestRing.visible = true;
      } else {
        pathLine.visible = false;
        pathDestRing.visible = false;
      }

      // === DYNAMIC ENTITIES (Full 3D Articulated Models) ===
      const timeSec = reduceMotion ? 0 : now * 0.001;
      entityPool.beginFrame();
      let shdIdx = 0;
      let rngIdx = 0;
      let bmIdx = 0;
      const hitEntities: HitEntity[] = [];

      const placeShadow = (wx: number, wz: number, scale: number) => {
        const sh = ensureMesh(shadowPool, shdIdx++, geos.shadowDisc, entitiesGroup);
        sh.material = mats.getBasic('shadow:contact', () =>
          new THREE.MeshBasicMaterial({
            map: shadowTex,
            transparent: true,
            opacity: 0.78,
            depthWrite: false,
          })
        );
        sh.position.set(wx, 0.023, wz);
        sh.scale.set(scale, scale, scale);
        sh.visible = true;
      };

      const placeRing = (wx: number, wz: number, colorHex: number, scale: number, opacity = 0.88) => {
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
        rg.position.set(wx, 0.032, wz);
        rg.scale.set(scale, scale, scale);
        rg.visible = true;
      };

      const getHitFlashTint = (tx: number, ty: number): number | null => {
        for (const hf of s.hitFlashes) {
          if (now <= hf.until && hf.x === tx && hf.y === ty) {
            return hf.color === 'white' ? 0xffffff : new THREE.Color(hf.color).getHex();
          }
        }
        return null;
      };

      // 1. Ground Loot + Rarity Light Beams
      for (const drop of s.zone.loot) {
        const tile = s.zone.tiles[drop.y]?.[drop.x];
        if (!tile?.visible) continue;
        const rarity = drop.item?.rarity;
        if (rarity === 'Rare' || rarity === 'Epic' || rarity === 'Relic') {
          const gleamHex =
            rarity === 'Relic' ? '#f59e0b' : rarity === 'Epic' ? '#c084fc' : '#60a5fa';
          const sh = ensureMesh(shadowPool, shdIdx++, geos.shadowDisc, entitiesGroup);
          sh.material = mats.getBasic(`gleam:${gleamHex}`, () =>
            new THREE.MeshBasicMaterial({
              map: getGlowDiscTexture(gleamHex),
              transparent: true,
              opacity: 0.72,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
            })
          );
          sh.position.set(drop.x, 0.025, drop.y);
          sh.scale.set(1.05, 1.05, 1.05);
          sh.visible = true;

          const beam = ensureMesh(beamPool, bmIdx++, beamGeo, entitiesGroup);
          beam.material = mats.getBasic(`beamMat:${gleamHex}`, () =>
            new THREE.MeshBasicMaterial({
              map: getLootBeamTexture(gleamHex),
              transparent: true,
              opacity: 0.7,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
              side: THREE.DoubleSide,
            })
          );
          beam.position.set(drop.x, 0.02, drop.y);
          orientBillY(beam, drop.x, drop.y);
          beam.renderOrder = 2;
          beam.visible = true;
        } else {
          placeShadow(drop.x, drop.y, 0.48);
        }
        entityPool.placeLoot(drop, timeSec);
        hitEntities.push({ x: drop.x, y: drop.y, wx: drop.x, wz: drop.y, height: 0.75, radius: 0.34 });
      }

      // 2. Critters
      for (const critter of s.zone.critters ?? []) {
        const ctile = s.zone.tiles[critter.y]?.[critter.x];
        if (!ctile?.visible && !(s.zone.id === 'overworld' && ctile?.explored)) continue;
        placeShadow(critter.x, critter.y, 0.56);
        entityPool.placeCritter(critter, timeSec);
      }

      // 3. NPCs
      for (const npc of s.zone.npcs) {
        const ntile = s.zone.tiles[npc.y]?.[npc.x];
        if (!ntile?.explored) continue;
        placeShadow(npc.x, npc.y, 0.92);
        entityPool.placeNpc(npc, ntile.visible, s.heroVisX, s.heroVisZ, timeSec);
        hitEntities.push({ x: npc.x, y: npc.y, wx: npc.x, wz: npc.y, height: 1.05, radius: 0.38 });
      }

      // 4. Enemies & Bosses
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

        const stepDist = Math.hypot(enemy.x - vis.x, enemy.y - vis.z);
        const hopLift = reduceMotion ? 0 : Math.sin(Math.min(1, stepDist) * Math.PI) * 0.2;

        const isMajor = enemy.isBoss || enemy.rank === 'randboss';
        placeShadow(vis.x, vis.z, isMajor ? 1.24 : 0.95);

        if (enemy.isBoss || enemy.isElite || enemy.rank === 'rare' || enemy.rank === 'randboss') {
          const ringColor =
            enemy.isBoss || enemy.rank === 'randboss'
              ? 0xf59e0b
              : enemy.rank === 'rare'
                ? 0x38bdf8
                : 0xc084fc;
          placeRing(vis.x, vis.z, ringColor, isMajor ? 1.2 : 1.0);
        }

        const isShielded = enemy.statuses.some((st) => st.kind === 'shielded') || enemy.runeCharge;
        if (isShielded) {
          placeRing(vis.x, vis.z, enemy.runeCharge ? 0x38bdf8 : 0x60a5fa, 1.08, 0.72);
        }

        const size = isMajor ? 1.32 : 1.04;
        const flashTint = getHitFlashTint(enemy.x, enemy.y);
        entityPool.placeEnemy(enemy, vis.x, vis.z, hopLift, s.heroVisX, s.heroVisZ, timeSec, flashTint);

        hitEntities.push({
          x: enemy.x,
          y: enemy.y,
          wx: vis.x,
          wz: vis.z,
          height: size + hopLift,
          radius: isMajor ? 0.48 : 0.4,
        });
        projectedEnemies.push({ enemy, wx: vis.x, wz: vis.z, height: size + hopLift + 0.14 });
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
          const compDist = Math.hypot(comp.x - s.compVisX, comp.y - s.compVisZ);
          const compHop = reduceMotion ? 0 : Math.sin(Math.min(1, compDist) * Math.PI) * 0.16;

          placeShadow(s.compVisX, s.compVisZ, 0.82);
          entityPool.placeCompanion(comp, s.compVisX, s.compVisZ, compHop, s.heroVisX, s.heroVisZ, timeSec);
          projectedComp = { comp, wx: s.compVisX, wz: s.compVisZ, height: 0.98 + compHop };
          hitEntities.push({
            x: comp.x,
            y: comp.y,
            wx: s.compVisX,
            wz: s.compVisZ,
            height: 0.95,
            radius: 0.35,
          });
        }
      }

      // 6. Articulated 3D Hero (Garth "Big Dick" Elfstrom)
      {
        const hideHero = s.viewMode === 'first';
        heroModel.root.visible = !hideHero;
        if (!hideHero) {
          const hasWard = s.player.statuses.some(
            (st) => st.kind === 'shielded' || st.kind === 'spine_guard'
          );
          const aura = ensureMesh(shadowPool, shdIdx++, geos.shadowDisc, entitiesGroup);
          aura.material = mats.getBasic('hero:aura', () =>
            new THREE.MeshBasicMaterial({
              map: getGlowDiscTexture('#f59e0b'),
              transparent: true,
              opacity: 0.45,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
            })
          );
          aura.position.set(s.heroVisX, 0.022, s.heroVisZ);
          aura.scale.set(1.5, 1.5, 1.5);
          aura.visible = true;

          placeShadow(s.heroVisX, s.heroVisZ, 0.96);
          if (hasWard) {
            placeRing(s.heroVisX, s.heroVisZ, 0x38bdf8, 1.06, 0.88);
          }

          heroModel.updateAppearance(s.player);
          const heroDist = Math.hypot(s.player.x - s.heroVisX, s.player.y - s.heroVisZ);
          const isMoving = heroDist > 0.035;
          const stepProg = isMoving ? 1 - Math.min(1, heroDist) : 0;
          s.attackPulse = Math.max(0, s.attackPulse - dt * 5.5);

          // Rotate hero subtly toward camera look when stationary in Chase mode so back stays aligned
          if (s.viewMode === 'chase' && !isMoving) {
            const lookTarget = getCardinalYawRadians(s.yawIndex);
            let fDiff = lookTarget - s.heroFacingYaw;
            while (fDiff > Math.PI) fDiff -= Math.PI * 2;
            while (fDiff < -Math.PI) fDiff += Math.PI * 2;
            s.heroFacingYaw += fDiff * Math.min(1, dt * 10);
          }

          heroModel.root.position.set(s.heroVisX, 0.02, s.heroVisZ);
          heroModel.root.rotation.y = -s.heroFacingYaw;
          heroModel.animate(now * 0.001, isMoving, stepProg, s.attackPulse);
        }
      }

      entityPool.endFrame();
      s.hitEntities = hitEntities;

      for (let i = shdIdx; i < shadowPool.length; i++) shadowPool[i].visible = false;
      for (let i = rngIdx; i < ringPool.length; i++) ringPool[i].visible = false;
      for (let i = bmIdx; i < beamPool.length; i++) beamPool[i].visible = false;

      // === 3D PROJECTILES, PARTICLE BURSTS & RISING EMBERS ===
      let pIdx = 0;
      for (const proj of s.projectiles) {
        const age = now - proj.createdAt;
        if (age > proj.duration) continue;
        const t = age / proj.duration;
        const cx = proj.fromX + (proj.toX - proj.fromX) * t;
        const cz = proj.fromY + (proj.toY - proj.fromY) * t;
        const arcY = 0.52 + Math.sin(t * Math.PI) * 0.28;

        const grp = ensureProj(pIdx++);
        grp.position.set(cx, arcY, cz);
        grp.lookAt(proj.toX, 0.52, proj.toY);
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
          0.42 + Math.sin(t * Math.PI) * 0.48,
          p.y + p.vy * t * 1.4
        );
        const sc = Math.max(0.2, 1 - t);
        spk.scale.set(sc, sc, sc);
        spk.visible = true;
      }

      if (!reduceMotion && emberSources.length > 0) {
        for (const src of emberSources) {
          for (let k = 0; k < 2; k++) {
            const t =
              (now * (src.isWater ? 0.0012 : 0.0008) + src.x * 0.37 + src.z * 0.53 + k * 0.5) % 1;
            const spk = ensureMesh(sparkPool, spkIdx++, geos.spark, fxGroup);
            spk.material = mats.getBasic(`ember:${src.color}`, () =>
              new THREE.MeshBasicMaterial({ color: src.color, transparent: true, opacity: 0.82 })
            );
            if (src.isWater) {
              const ang = src.x + k * 3.1 + now * 0.001;
              spk.position.set(
                src.x + Math.cos(ang) * t * 0.28,
                0.44 + Math.sin(t * Math.PI) * 0.25,
                src.z + Math.sin(ang) * t * 0.28
              );
            } else {
              spk.position.set(
                src.x + Math.sin(t * Math.PI * 2 + src.x + k) * 0.16,
                0.42 + t * 0.9,
                src.z + Math.cos(t * Math.PI * 2 + src.z + k) * 0.12
              );
            }
            const sc = Math.sin(t * Math.PI) * 0.78;
            spk.scale.set(sc, sc, sc);
            spk.visible = true;
          }
        }
      }
      for (let i = spkIdx; i < sparkPool.length; i++) sparkPool[i].visible = false;

      renderer.render(scene, camera);

      // === 2D PROJECTED HUD OVERLAY ===
      const hctx = hudCanvas.getContext('2d');
      if (hctx) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        hctx.save();
        hctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        hctx.clearRect(0, 0, viewW, viewH);

        for (const item of projectedEnemies) {
          const { enemy, wx, wz, height } = item;
          const top = projectToScreen(wx, height, wz);
          if (!top.visible) continue;
          const distScale = Math.max(0.65, Math.min(1.4, 3.2 / Math.max(1.2, Math.hypot(wx - s.camEye.x, wz - s.camEye.z))));
          const barW = Math.round(32 * distScale);

          if (enemy.hp < enemy.maxHp) {
            const ratio = Math.max(0, enemy.hp / enemy.maxHp);
            const bx = Math.round(top.sx - barW / 2);
            const by = Math.round(top.sy - 6);
            hctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
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

        if (projectedComp && projectedComp.comp.hp < projectedComp.comp.maxHp) {
          const top = projectToScreen(projectedComp.wx, projectedComp.height, projectedComp.wz);
          if (top.visible) {
            const barW = 28;
            const ratio = Math.max(0, projectedComp.comp.hp / projectedComp.comp.maxHp);
            const bx = Math.round(top.sx - barW / 2);
            const by = Math.round(top.sy - 5);
            hctx.fillStyle = 'rgba(0,0,0,0.85)';
            hctx.fillRect(bx - 1, by - 1, barW + 2, 4.5);
            hctx.fillStyle = '#38BDF8';
            hctx.fillRect(bx, by, barW * ratio, 2.5);
          }
        }

        hctx.textAlign = 'center';
        hctx.textBaseline = 'middle';
        for (const fx of s.floatingEffects) {
          const age = now - fx.createdAt;
          if (age > fx.duration) continue;
          const t = age / fx.duration;
          const pt = projectToScreen(fx.x, 1.05 + t * 0.85, fx.y);
          if (!pt.visible) continue;
          hctx.globalAlpha = Math.min(1, (1 - t) * 1.45);
          hctx.font = '700 13px "JetBrains Mono", monospace';
          hctx.fillStyle = '#090B10';
          hctx.fillText(fx.text, pt.sx + 1.5, pt.sy + 1.5);
          hctx.fillStyle = fx.color;
          hctx.fillText(fx.text, pt.sx, pt.sy);
          hctx.globalAlpha = 1;
        }

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

        const vig = hctx.createRadialGradient(
          viewW / 2,
          viewH / 2,
          Math.min(viewW, viewH) * 0.36,
          viewW / 2,
          viewH / 2,
          Math.max(viewW, viewH) * 0.78
        );
        vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vig.addColorStop(1, 'rgba(5, 7, 12, 0.38)');
        hctx.fillStyle = vig;
        hctx.fillRect(0, 0, viewW, viewH);

        // Minimap + Cardinal View Cone + Compass
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

          // Camera look direction cone on minimap
          const pxCenter = mmX + (s.player.x + 0.5) * cell;
          const pyCenter = mmY + (s.player.y + 0.5) * cell;
          const lookX = Math.sin(s.yawRad);
          const lookY = -Math.cos(s.yawRad);
          hctx.strokeStyle = 'rgba(253, 224, 71, 0.72)';
          hctx.lineWidth = 1.3;
          hctx.beginPath();
          hctx.moveTo(pxCenter, pyCenter);
          hctx.lineTo(pxCenter + lookX * (cell * 2.5), pyCenter + lookY * (cell * 2.5));
          hctx.stroke();

          hctx.fillStyle = '#FDE047';
          hctx.fillRect(mmX + s.player.x * cell, mmY + s.player.y * cell, cell, cell);

          const compDeg = yawRadToCompassDeg(s.yawRad);
          const angleN = ((compDeg - 90) * Math.PI) / 180;
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
      skyGroup.clear();
      if (skyGeo) skyGeo.dispose();
      if (skyMat) skyMat.dispose();
      terrainContainer.clear();
      overlayGroup.clear();
      entitiesGroup.clear();
      fxGroup.clear();
      heroModel.dispose();
      entityPool.dispose();
      disposeSceneGeometries(geos);
      beamGeo.dispose();
      rangeRingGeo.dispose();
      squareFrameGeo.dispose();
      pathLineGeo.dispose();
      pathLineMat.dispose();
      pathDestMat.dispose();
      teleFillMat.dispose();
      teleExclaimMat.dispose();
      hoverMat.dispose();
      aimMat.dispose();
      mats.dispose();
      renderer.dispose();
    };
  }, []);

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

    // 1. Check dynamic entities (enemies, NPCs, loot) first so tall standees don't click through
    for (let i = 0; i < s.hitEntities.length; i++) {
      const ent = s.hitEntities[i];
      box.min.set(ent.wx - ent.radius, 0, ent.wz - ent.radius);
      box.max.set(ent.wx + ent.radius, ent.height, ent.wz + ent.radius);
      const hit = raycaster.ray.intersectBox(box, hitPoint);
      if (hit) {
        const d = raycaster.ray.origin.distanceToSquared(hit);
        if (d < bestDist) {
          bestDist = d;
          bestCoord = { x: ent.x, y: ent.y };
        }
      }
    }

    // 2. Check non-cutaway tall obstacles (walls, trees, gates)
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

    // 3. Fallback to floor plane y=0 if closer than obstacle or nothing else hit
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const groundHit = raycaster.ray.intersectPlane(groundPlane, hitPoint);
    if (groundHit) {
      const gd = raycaster.ray.origin.distanceToSquared(groundHit);
      const tx = Math.round(groundHit.x);
      const ty = Math.round(groundHit.z);
      if (
        tx >= 0 &&
        ty >= 0 &&
        tx < zone.width &&
        ty < zone.height &&
        (!bestCoord || gd < bestDist)
      ) {
        bestCoord = { x: tx, y: ty };
      }
    }

    return bestCoord;
  };

  const inspectTileAt = (coord: { x: number; y: number }, pinned = false) => {
    const tile = zone.tiles[coord.y][coord.x];
    if (!tile.explored) {
      setHoverInfo(null);
      return;
    }
    const enemy = tile.visible
      ? zone.enemies.find((en) => en.x === coord.x && en.y === coord.y)
      : undefined;
    const npc = zone.npcs.find((n) => n.x === coord.x && n.y === coord.y);
    const companion =
      player.companion &&
      player.companion.hp > 0 &&
      player.companion.respawnCooldown === 0 &&
      player.companion.x === coord.x &&
      player.companion.y === coord.y
        ? player.companion
        : undefined;
    const drop = tile.visible
      ? zone.loot.find((l) => l.x === coord.x && l.y === coord.y)
      : undefined;
    const lootLabel = drop ? (drop.item ? drop.item.name : `${drop.gold} Gold`) : undefined;
    setHoverInfo({ x: coord.x, y: coord.y, tile, enemy, npc, companion, lootLabel, pinned });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    d.active = true;
    d.pointerId = e.pointerId;
    d.startX = e.clientX;
    d.startY = e.clientY;
    d.lastX = e.clientX;
    d.movedPx = 0;
    d.longPressUsed = false;

    if (e.pointerType === 'touch') {
      if (d.longPressTimer) window.clearTimeout(d.longPressTimer);
      d.longPressTimer = window.setTimeout(() => {
        const coord = coordFromClient(d.startX, d.startY);
        if (coord) {
          d.longPressUsed = true;
          inspectTileAt(coord, true);
        }
      }, 420);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    const s = stateRef.current;

    if (d.active && d.pointerId === e.pointerId) {
      const dxTotal = Math.hypot(e.clientX - d.startX, e.clientY - d.startY);
      d.movedPx = Math.max(d.movedPx, dxTotal);
      if (dxTotal > 10 && d.longPressTimer) {
        window.clearTimeout(d.longPressTimer);
        d.longPressTimer = null;
      }

      if (dxTotal >= 8) {
        s.isDraggingLook = true;
        const deltaX = e.clientX - d.lastX;
        d.lastX = e.clientX;
        s.freeYawOffset += deltaX * 0.007;

        while (s.freeYawOffset > Math.PI / 4) {
          const nextYaw = normalizeYawIndex(s.yawIndex + 1);
          s.yawIndex = nextYaw;
          s.freeYawOffset -= Math.PI / 2;
          setYawIndex(nextYaw);
        }
        while (s.freeYawOffset < -Math.PI / 4) {
          const nextYaw = normalizeYawIndex(s.yawIndex - 1);
          s.yawIndex = nextYaw;
          s.freeYawOffset += Math.PI / 2;
          setYawIndex(nextYaw);
        }
        return;
      }
    }

    if (e.pointerType === 'touch') return;
    const coord = coordFromClient(e.clientX, e.clientY);
    s.hoverCoord = coord;
    if (!coord) {
      s.hoverPath = [];
      setHoverInfo(null);
      return;
    }
    const tile = zone.tiles[coord.y][coord.x];
    if (!tile.explored) {
      s.hoverPath = [];
      setHoverInfo(null);
      return;
    }

    if (!armedSkill && !armedInscriptionRange) {
      s.hoverPath = findPathPoints(zone, player.x, player.y, coord.x, coord.y, true, 16);
    } else {
      s.hoverPath = [];
    }

    inspectTileAt(coord, false);
  };

  const endPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    if (d.longPressTimer) {
      window.clearTimeout(d.longPressTimer);
      d.longPressTimer = null;
    }
    if (d.active && d.pointerId === e.pointerId) {
      d.active = false;
      stateRef.current.isDraggingLook = false;
    }
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLCanvasElement>) => {
    endPointer(e);
    stateRef.current.hoverCoord = null;
    stateRef.current.hoverPath = [];
    setHoverInfo((cur) => (cur?.pinned ? cur : null));
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    if (d.movedPx >= 8 || d.longPressUsed) {
      d.movedPx = 0;
      d.longPressUsed = false;
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
    if (e.deltaY < 0) {
      if (viewMode === 'chase' && zoomIndex >= ZOOM_STEPS.length - 1) {
        setViewMode('first');
      } else if (zoomIndex < ZOOM_STEPS.length - 1) {
        setTileSize(ZOOM_STEPS[zoomIndex + 1]);
      }
    } else if (e.deltaY > 0) {
      if (viewMode === 'first') {
        setViewMode('chase');
        setTileSize(ZOOM_STEPS[ZOOM_STEPS.length - 1]);
      } else if (zoomIndex > 0) {
        setTileSize(ZOOM_STEPS[zoomIndex - 1]);
      }
    }
  };

  const facingLabel = ['North', 'East', 'South', 'West'][yawIndex];

  if (webglError) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-[#090C11] text-slate-300 p-6 text-center">
        <div className="max-w-md space-y-2 rounded border border-rose-500/35 bg-[#0E1219] p-5">
          <div className="text-sm font-semibold text-amber-200">3D WebGL View Unavailable</div>
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
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
        onWheel={handleWheel}
        className={`block w-full h-full touch-none ${
          inspectMode
            ? 'cursor-help'
            : armedSkill || armedInscriptionRange
              ? 'cursor-crosshair'
              : 'cursor-grab active:cursor-grabbing'
        }`}
      />
      <canvas
        ref={hudCanvasRef}
        className="pointer-events-none absolute inset-0 block w-full h-full"
      />

      {/* Desktop 3D Camera View Mode + Turn + Zoom Controls (Bottom-Left) */}
      <div className="hidden md:flex absolute bottom-3 left-3 z-20 items-center gap-1 rounded border border-white/12 bg-[#0D121A]/88 px-2 py-1 shadow-lg backdrop-blur-sm">
        <Camera className="w-3.5 h-3.5 text-amber-300 mr-0.5" />
        {VIEW_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            title={m.title}
            onClick={(e) => {
              e.currentTarget.blur();
              setViewMode(m.id);
            }}
            className={`px-2 py-0.5 rounded text-[11px] font-mono-glyph font-semibold transition-colors cursor-pointer ${
              viewMode === m.id
                ? 'bg-amber-500 text-[#0B0D12]'
                : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            {m.label}
          </button>
        ))}

        <div className="w-px h-4 bg-white/12 mx-1" />

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            rotateCamera(-1);
          }}
          title="Turn Left 90° ([ / C)"
          aria-label="Turn camera left"
          className="h-7 w-7 rounded hover:bg-white/10 text-slate-200 flex items-center justify-center cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] font-mono-glyph text-slate-300 px-1 min-w-[38px] text-center">
          {facingLabel}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            rotateCamera(1);
          }}
          title="Turn Right 90° (] / E)"
          aria-label="Turn camera right"
          className="h-7 w-7 rounded hover:bg-white/10 text-slate-200 flex items-center justify-center cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        {viewMode !== 'first' && (
          <>
            <div className="w-px h-4 bg-white/12 mx-1" />
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
          </>
        )}
      </div>

      {/* Mobile Top-Right Turn / View / Look / Map Controls */}
      <div className="md:hidden absolute top-2 right-2 z-20 flex items-center gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            const order: CameraViewMode[] = ['chase', 'first', 'tactical'];
            const next = order[(order.indexOf(viewMode) + 1) % order.length];
            setViewMode(next);
          }}
          aria-label="Cycle 3D camera view"
          className="h-11 px-2.5 rounded border border-white/15 bg-[#0D121A]/88 text-amber-200 text-[11px] font-mono-glyph font-semibold flex items-center justify-center shadow-md cursor-pointer"
        >
          {VIEW_MODES.find((m) => m.id === viewMode)?.label ?? '3rd'}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            rotateCamera(-1);
          }}
          aria-label="Turn camera left"
          className="h-11 w-11 rounded border border-white/15 bg-[#0D121A]/88 text-slate-200 flex items-center justify-center shadow-md cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            rotateCamera(1);
          }}
          aria-label="Turn camera right"
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
