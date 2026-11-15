import * as THREE from 'three';
import {
  getBiomeAtmosphere,
  getFloorTexture,
  getFluidTexture,
  getGlowDiscTexture,
  getHazardTexture,
  getRoadTexture,
  getStructTexture,
  getWallSideTexture,
  getWallTopTexture,
} from './sceneMaterials';
import { BiomeId, getBiomePalette, pickTileVariant } from './tileset';
import { Tile, TileKind, ZoneMap } from './types';

export type TileVisState = 'hidden' | 'memory' | 'lit';

export interface SceneGeometries {
  floor: THREE.PlaneGeometry;
  ceiling: THREE.PlaneGeometry;
  wallBox: THREE.BoxGeometry;
  wallCap: THREE.BoxGeometry;
  chasmPit: THREE.BoxGeometry;
  pillarBase: THREE.BoxGeometry;
  pillarShaft: THREE.CylinderGeometry;
  pillarCap: THREE.BoxGeometry;
  treeTrunk: THREE.CylinderGeometry;
  treeFoliageA: THREE.DodecahedronGeometry;
  treeFoliageB: THREE.DodecahedronGeometry;
  stepTread: THREE.BoxGeometry;
  stepWall: THREE.BoxGeometry;
  pedestal: THREE.BoxGeometry;
  pedestalTop: THREE.BoxGeometry;
  crystal: THREE.OctahedronGeometry;
  flameOuter: THREE.ConeGeometry;
  flameInner: THREE.ConeGeometry;
  torchPole: THREE.CylinderGeometry;
  brazierBowl: THREE.CylinderGeometry;
  chestBase: THREE.BoxGeometry;
  chestLid: THREE.BoxGeometry;
  chestTrim: THREE.BoxGeometry;
  stallCounter: THREE.BoxGeometry;
  stallPost: THREE.BoxGeometry;
  stallRoof: THREE.BoxGeometry;
  stallGood: THREE.BoxGeometry;
  gatePost: THREE.BoxGeometry;
  gateLintel: THREE.BoxGeometry;
  gatePortal: THREE.PlaneGeometry;
  fountainBasin: THREE.TorusGeometry;
  fountainWater: THREE.CircleGeometry;
  fountainSpire: THREE.CylinderGeometry;
  fountainCap: THREE.CylinderGeometry;
  anvil: THREE.BoxGeometry;
  tabletSlab: THREE.BoxGeometry;
  billboard: THREE.PlaneGeometry;
  decal: THREE.PlaneGeometry;
  shadowDisc: THREE.PlaneGeometry;
  floorRing: THREE.RingGeometry;
  spark: THREE.BoxGeometry;
  projHead: THREE.BoxGeometry;
  projTail: THREE.BoxGeometry;
  pathDot: THREE.SphereGeometry;
}

export function createSceneGeometries(): SceneGeometries {
  const floor = new THREE.PlaneGeometry(1, 1);
  floor.rotateX(-Math.PI / 2);

  const ceiling = new THREE.PlaneGeometry(1, 1);
  ceiling.rotateX(Math.PI / 2);

  const decal = new THREE.PlaneGeometry(0.92, 0.92);
  decal.rotateX(-Math.PI / 2);

  const shadowDisc = new THREE.PlaneGeometry(0.96, 0.96);
  shadowDisc.rotateX(-Math.PI / 2);

  const floorRing = new THREE.RingGeometry(0.35, 0.46, 28);
  floorRing.rotateX(-Math.PI / 2);

  const billboard = new THREE.PlaneGeometry(1, 1);
  billboard.translate(0, 0.5, 0);

  const fountainBasin = new THREE.TorusGeometry(0.38, 0.085, 8, 12);
  fountainBasin.rotateX(Math.PI / 2);

  const fountainWater = new THREE.CircleGeometry(0.34, 12);
  fountainWater.rotateX(-Math.PI / 2);

  return {
    floor,
    ceiling,
    wallBox: new THREE.BoxGeometry(1, 1, 1),
    wallCap: new THREE.BoxGeometry(1.04, 0.1, 1.04),
    chasmPit: new THREE.BoxGeometry(0.98, 0.72, 0.98),
    pillarBase: new THREE.BoxGeometry(0.6, 0.14, 0.6),
    pillarShaft: new THREE.CylinderGeometry(0.2, 0.24, 1.48, 8),
    pillarCap: new THREE.BoxGeometry(0.58, 0.16, 0.58),
    treeTrunk: new THREE.CylinderGeometry(0.11, 0.17, 0.74, 7),
    treeFoliageA: new THREE.DodecahedronGeometry(0.42, 0),
    treeFoliageB: new THREE.DodecahedronGeometry(0.32, 0),
    stepTread: new THREE.BoxGeometry(0.76, 0.12, 0.2),
    stepWall: new THREE.BoxGeometry(0.12, 0.34, 0.9),
    pedestal: new THREE.BoxGeometry(0.62, 0.18, 0.62),
    pedestalTop: new THREE.BoxGeometry(0.46, 0.16, 0.46),
    crystal: new THREE.OctahedronGeometry(0.17, 0),
    flameOuter: new THREE.ConeGeometry(0.11, 0.28, 6),
    flameInner: new THREE.ConeGeometry(0.06, 0.18, 6),
    torchPole: new THREE.CylinderGeometry(0.045, 0.06, 0.56, 6),
    brazierBowl: new THREE.CylinderGeometry(0.26, 0.14, 0.2, 8),
    chestBase: new THREE.BoxGeometry(0.5, 0.24, 0.36),
    chestLid: new THREE.BoxGeometry(0.52, 0.12, 0.38),
    chestTrim: new THREE.BoxGeometry(0.1, 0.26, 0.39),
    stallCounter: new THREE.BoxGeometry(0.78, 0.34, 0.44),
    stallPost: new THREE.BoxGeometry(0.07, 0.88, 0.07),
    stallRoof: new THREE.BoxGeometry(0.94, 0.12, 0.78),
    stallGood: new THREE.BoxGeometry(0.13, 0.13, 0.13),
    gatePost: new THREE.BoxGeometry(0.26, 1.56, 0.28),
    gateLintel: new THREE.BoxGeometry(1.02, 0.26, 0.32),
    gatePortal: new THREE.PlaneGeometry(0.58, 1.32),
    fountainBasin,
    fountainWater,
    fountainSpire: new THREE.CylinderGeometry(0.08, 0.14, 0.44, 8),
    fountainCap: new THREE.CylinderGeometry(0.16, 0.06, 0.08, 8),
    anvil: new THREE.BoxGeometry(0.36, 0.2, 0.22),
    tabletSlab: new THREE.BoxGeometry(0.48, 0.68, 0.14),
    billboard,
    decal,
    shadowDisc,
    floorRing,
    spark: new THREE.BoxGeometry(0.06, 0.06, 0.06),
    projHead: new THREE.BoxGeometry(0.15, 0.15, 0.15),
    projTail: new THREE.BoxGeometry(0.065, 0.065, 0.5),
    pathDot: new THREE.SphereGeometry(0.075, 8, 6),
  };
}

export function disposeSceneGeometries(geos: SceneGeometries): void {
  Object.values(geos).forEach((g) => g.dispose());
}

export class SceneMaterialPool {
  private map = new Map<string, THREE.Material | THREE.Material[]>();

  getLambert(
    key: string,
    factory: () => THREE.MeshLambertMaterial
  ): THREE.MeshLambertMaterial {
    const existing = this.map.get(key);
    if (existing && !Array.isArray(existing)) return existing as THREE.MeshLambertMaterial;
    const mat = factory();
    this.map.set(key, mat);
    return mat;
  }

  getBasic(key: string, factory: () => THREE.MeshBasicMaterial): THREE.MeshBasicMaterial {
    const existing = this.map.get(key);
    if (existing && !Array.isArray(existing)) return existing as THREE.MeshBasicMaterial;
    const mat = factory();
    this.map.set(key, mat);
    return mat;
  }

  getWallArray(
    biome: BiomeId,
    variant: number,
    state: 'lit' | 'memory' | 'cutaway'
  ): THREE.MeshLambertMaterial[] {
    const v = variant % 4;
    const key = `wallArr:${biome}:${v}:${state}`;
    const existing = this.map.get(key);
    if (Array.isArray(existing)) return existing as THREE.MeshLambertMaterial[];

    const topTex = getWallTopTexture(biome, variant);
    const sideLightTex = getWallSideTexture(biome, v, 'light');
    const sideDarkTex = getWallSideTexture(biome, v, 'dark');

    const tint = state === 'memory' ? 0x566482 : 0xffffff;
    const transparent = state === 'cutaway';
    const opacity = state === 'cutaway' ? 0.2 : 1;

    const makeSide = (tex: THREE.CanvasTexture) =>
      new THREE.MeshLambertMaterial({
        map: tex,
        color: tint,
        transparent,
        opacity,
        depthWrite: !transparent,
      });

    const arr = [
      makeSide(sideLightTex),
      makeSide(sideDarkTex),
      makeSide(topTex),
      makeSide(sideDarkTex),
      makeSide(sideLightTex),
      makeSide(sideDarkTex),
    ];
    this.map.set(key, arr);
    return arr;
  }

  dispose(): void {
    for (const val of this.map.values()) {
      if (Array.isArray(val)) {
        val.forEach((m) => m.dispose());
      } else {
        val.dispose();
      }
    }
    this.map.clear();
  }
}

export interface TileNode {
  x: number;
  y: number;
  kind: TileKind;
  group: THREE.Group;
  groundMesh: THREE.Mesh;
  ceilingMesh?: THREE.Mesh;
  wallMesh?: THREE.Mesh;
  wallCapMesh?: THREE.Mesh;
  wallBaseHeight: number;
  fluidMesh?: THREE.Mesh;
  hazardMesh?: THREE.Mesh;
  propBillboard?: THREE.Mesh;
  animatedMesh?: THREE.Object3D;
  haloMesh?: THREE.Mesh;
  chestLidMesh?: THREE.Mesh;
  treeCrownGroup?: THREE.Group;
  structureMeshes: THREE.Mesh[];
  isTallObstacle: boolean;
  tallHeight: number;
  biomeVariant: number;
  propVariant: number;
  isVaultInterior: boolean;
  tintColor?: number;
  lastState: TileVisState;
  lastUsed: boolean;
  lastRevealed: boolean;
  lastCutaway: boolean;
  lastAnimFrame: number;
}

const ANIMATED_FLUID_KINDS = new Set<TileKind>(['water', 'fountain', 'chasm']);
const ANIMATED_HAZARD_KINDS = new Set<TileKind>([
  'spore_pool',
  'frost_vent',
  'ember_crust',
  'shock_rune',
]);

function getSpecialTintHex(tile: Tile): number | undefined {
  if (tile.color === '#284552') return 0x8ad8f8;
  if (tile.color === '#452A21') return 0xfdb48a;
  if (tile.color === '#342347') return 0xd9b3ff;
  return undefined;
}

function addShadowFlag(mesh: THREE.Mesh, cast: boolean, receive: boolean): void {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
}

export function buildZoneTerrain(
  zone: ZoneMap,
  biome: BiomeId,
  geos: SceneGeometries,
  mats: SceneMaterialPool
): {
  root: THREE.Group;
  nodes: TileNode[];
  billboards: THREE.Mesh[];
  animatedNodes: TileNode[];
} {
  const root = new THREE.Group();
  const nodes: TileNode[] = [];
  const billboards: THREE.Mesh[] = [];
  const animatedNodes: TileNode[] = [];
  const atmo = getBiomeAtmosphere(biome);
  const palette = getBiomePalette(biome);
  const isEnclosedDungeon = zone.depth >= 1 && !zone.isTown;

  for (let y = 0; y < zone.height; y++) {
    for (let x = 0; x < zone.width; x++) {
      const tile = zone.tiles[y][x];
      const group = new THREE.Group();
      group.position.set(x, 0, y);
      group.visible = false;

      const biomeVariant = pickTileVariant(x, y, 16);
      const propVariant = pickTileVariant(x, y, 6);
      const isVaultInterior = tile.color === '#4D3D2C';
      const tintColor = getSpecialTintHex(tile);
      const structureMeshes: THREE.Mesh[] = [];

      const isFluid = tile.kind === 'water' || tile.kind === 'chasm';
      const isRoad = tile.kind === 'road';
      const groundMat = isFluid
        ? mats.getLambert(`chasmPit:${biome}:${tile.kind}`, () =>
            new THREE.MeshLambertMaterial({ color: tile.kind === 'chasm' ? 0x1a090a : 0x0b2234 })
          )
        : isRoad
          ? mats.getLambert(`roadMat:${biome}:${biomeVariant % 6}:lit`, () =>
              new THREE.MeshLambertMaterial({ map: getRoadTexture(biome, biomeVariant) })
            )
          : mats.getLambert(
              `floorMat:${biome}:${biomeVariant % 8}:${isVaultInterior ? 1 : 0}:${tintColor ?? 0}:lit`,
              () =>
                new THREE.MeshLambertMaterial({
                  map: getFloorTexture(biome, biomeVariant, isVaultInterior),
                  color: tintColor ?? 0xffffff,
                })
            );

      const groundMesh = new THREE.Mesh(geos.floor, groundMat);
      groundMesh.position.y = isFluid ? (tile.kind === 'chasm' ? -0.72 : -0.16) : isRoad ? 0.015 : 0;
      groundMesh.receiveShadow = true;
      group.add(groundMesh);

      let ceilingMesh: THREE.Mesh | undefined;
      if (isEnclosedDungeon && tile.kind !== 'wall' && tile.kind !== 'chasm') {
        const ceilMat = mats.getLambert(`ceilMat:${biome}:${biomeVariant % 4}`, () =>
          new THREE.MeshLambertMaterial({
            map: getWallTopTexture(biome, biomeVariant),
            color: 0x6b7280,
          })
        );
        ceilingMesh = new THREE.Mesh(geos.ceiling, ceilMat);
        ceilingMesh.position.y = 2.04;
        group.add(ceilingMesh);
      }

      let wallMesh: THREE.Mesh | undefined;
      let wallCapMesh: THREE.Mesh | undefined;
      let wallBaseHeight = 1.92;
      let fluidMesh: THREE.Mesh | undefined;
      let hazardMesh: THREE.Mesh | undefined;
      let propBillboard: THREE.Mesh | undefined;
      let animatedMesh: THREE.Object3D | undefined;
      let haloMesh: THREE.Mesh | undefined;
      let chestLidMesh: THREE.Mesh | undefined;
      let treeCrownGroup: THREE.Group | undefined;
      let isTallObstacle = false;
      let tallHeight = 0;

      if (tile.kind === 'wall') {
        const wallH = biome === 'oakhaven' ? 1.22 + (biomeVariant % 3) * 0.05 : 1.84 + (biomeVariant % 3) * 0.09;
        wallBaseHeight = wallH;
        wallMesh = new THREE.Mesh(geos.wallBox, mats.getWallArray(biome, biomeVariant, 'lit'));
        wallMesh.scale.set(1, wallH, 1);
        wallMesh.position.y = wallH / 2;
        addShadowFlag(wallMesh, true, true);
        group.add(wallMesh);
        structureMeshes.push(wallMesh);

        // Architectural cornice cap lip
        const capMat = mats.getLambert(`wallCapMat:${biome}:${biomeVariant % 6}:lit`, () =>
          new THREE.MeshLambertMaterial({ map: getWallTopTexture(biome, biomeVariant) })
        );
        wallCapMesh = new THREE.Mesh(geos.wallCap, capMat);
        wallCapMesh.position.y = wallH - 0.03;
        addShadowFlag(wallCapMesh, true, true);
        group.add(wallCapMesh);

        isTallObstacle = true;
        tallHeight = wallH + 0.05;
      } else if (tile.kind === 'pillar') {
        const stoneMat = mats.getLambert(`stone:${biome}:lit`, () =>
          new THREE.MeshLambertMaterial({ color: palette.wallFaceAlt })
        );
        const capMat = mats.getLambert(`stoneCap:${biome}:lit`, () =>
          new THREE.MeshLambertMaterial({ color: palette.wallHighlight })
        );
        const base = new THREE.Mesh(geos.pillarBase, stoneMat);
        base.position.y = 0.07;
        const shaft = new THREE.Mesh(geos.pillarShaft, stoneMat);
        shaft.position.y = 0.88;
        const cap = new THREE.Mesh(geos.pillarCap, capMat);
        cap.position.y = 1.7;
        addShadowFlag(base, true, true);
        addShadowFlag(shaft, true, true);
        addShadowFlag(cap, true, true);
        group.add(base, shaft, cap);
        structureMeshes.push(base, shaft, cap);
        isTallObstacle = true;
        tallHeight = 1.82;
      } else if (tile.kind === 'tree') {
        const trunkMat = mats.getLambert(`trunk:${biome}:lit`, () =>
          new THREE.MeshLambertMaterial({ color: atmo.trunkHex })
        );
        const leaf1Mat = mats.getLambert(`leaf1:${biome}:lit`, () =>
          new THREE.MeshLambertMaterial({ color: atmo.foliagePrimary })
        );
        const leaf2Mat = mats.getLambert(`leaf2:${biome}:lit`, () =>
          new THREE.MeshLambertMaterial({ color: atmo.foliageSecondary })
        );
        const trunk = new THREE.Mesh(geos.treeTrunk, trunkMat);
        trunk.position.y = 0.37;
        addShadowFlag(trunk, true, true);
        group.add(trunk);

        treeCrownGroup = new THREE.Group();
        treeCrownGroup.position.y = 0.92;
        const c1 = new THREE.Mesh(geos.treeFoliageA, leaf1Mat);
        c1.position.set(-0.08, 0, 0.06);
        c1.scale.set(1.08, 0.95, 1.08);
        c1.rotation.y = propVariant * 0.6;
        const c2 = new THREE.Mesh(geos.treeFoliageA, leaf2Mat);
        c2.position.set(0.12, 0.28, -0.06);
        c2.scale.set(0.88, 0.9, 0.88);
        c2.rotation.y = propVariant * 1.1;
        const c3 = new THREE.Mesh(geos.treeFoliageB, leaf2Mat);
        c3.position.set(-0.02, 0.56, 0.02);
        addShadowFlag(c1, true, true);
        addShadowFlag(c2, true, true);
        addShadowFlag(c3, true, false);
        treeCrownGroup.add(c1, c2, c3);
        group.add(treeCrownGroup);
        structureMeshes.push(trunk, c1, c2, c3);
        isTallObstacle = true;
        tallHeight = 1.7;
      } else if (tile.kind === 'fountain') {
        const basinMat = mats.getLambert(`fountainRim:lit`, () =>
          new THREE.MeshLambertMaterial({ color: 0x94a3b8 })
        );
        const capMat = mats.getLambert(`fountainCap:lit`, () =>
          new THREE.MeshLambertMaterial({ color: 0xcbd5e1 })
        );
        const basin = new THREE.Mesh(geos.fountainBasin, basinMat);
        basin.position.y = 0.1;
        addShadowFlag(basin, true, true);

        const waterMat = mats.getLambert(`fluid:fountain:0:lit`, () =>
          new THREE.MeshLambertMaterial({ map: getFluidTexture('water', 0) })
        );
        fluidMesh = new THREE.Mesh(geos.fountainWater, waterMat);
        fluidMesh.position.y = 0.13;
        fluidMesh.receiveShadow = true;

        const spire = new THREE.Mesh(geos.fountainSpire, basinMat);
        spire.position.y = 0.24;
        addShadowFlag(spire, true, true);

        const topCap = new THREE.Mesh(geos.fountainCap, capMat);
        topCap.position.y = 0.46;
        addShadowFlag(topCap, true, true);

        const glowMat = mats.getBasic('halo:fountain', () =>
          new THREE.MeshBasicMaterial({
            map: getGlowDiscTexture('#38bdf8'),
            transparent: true,
            opacity: 0.48,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        haloMesh = new THREE.Mesh(geos.shadowDisc, glowMat);
        haloMesh.position.y = 0.025;
        haloMesh.scale.set(1.3, 1.3, 1.3);

        group.add(basin, fluidMesh, spire, topCap, haloMesh);
        structureMeshes.push(basin, spire, topCap);
      } else if (tile.kind === 'water' || tile.kind === 'chasm') {
        const fluidMat = mats.getLambert(`fluid:${tile.kind}:0:lit`, () =>
          new THREE.MeshLambertMaterial({
            map: getFluidTexture(tile.kind as 'water' | 'chasm', 0),
          })
        );
        fluidMesh = new THREE.Mesh(geos.floor, fluidMat);
        fluidMesh.position.y = tile.kind === 'chasm' ? -0.32 : -0.04;
        fluidMesh.receiveShadow = true;
        group.add(fluidMesh);

        if (tile.kind === 'chasm') {
          const cliffMat = mats.getLambert(`chasmWall:lit`, () =>
            new THREE.MeshLambertMaterial({ color: 0x261414 })
          );
          const pitRim = new THREE.Mesh(geos.chasmPit, cliffMat);
          pitRim.position.y = -0.37;
          group.add(pitRim);
        }
      } else if (tile.kind === 'stairs_down') {
        const stairMat = mats.getLambert(`stairsDownMat:lit`, () =>
          new THREE.MeshLambertMaterial({ color: 0x475569 })
        );
        const sideMat = mats.getLambert(`stairsWallMat:lit`, () =>
          new THREE.MeshLambertMaterial({ color: 0x1e293b })
        );
        const leftW = new THREE.Mesh(geos.stepWall, sideMat);
        leftW.position.set(-0.42, 0.14, 0);
        const rightW = new THREE.Mesh(geos.stepWall, sideMat);
        rightW.position.set(0.42, 0.14, 0);
        addShadowFlag(leftW, true, true);
        addShadowFlag(rightW, true, true);
        group.add(leftW, rightW);
        structureMeshes.push(leftW, rightW);

        for (let s = 0; s < 4; s++) {
          const step = new THREE.Mesh(geos.stepTread, stairMat);
          step.position.set(0, 0.08 - s * 0.07, -0.28 + s * 0.19);
          addShadowFlag(step, true, true);
          group.add(step);
          structureMeshes.push(step);
        }
        const glowMat = mats.getBasic(`stairsDownGlow`, () =>
          new THREE.MeshBasicMaterial({
            map: getGlowDiscTexture('#f59e0b'),
            transparent: true,
            opacity: 0.65,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        haloMesh = new THREE.Mesh(geos.shadowDisc, glowMat);
        haloMesh.position.y = 0.025;
        haloMesh.scale.set(1.15, 1.15, 1.15);
        group.add(haloMesh);
      } else if (tile.kind === 'stairs_up') {
        const stairMat = mats.getLambert(`stairsUpMat:lit`, () =>
          new THREE.MeshLambertMaterial({ color: 0x94a3b8 })
        );
        const sideMat = mats.getLambert(`stairsUpWallMat:lit`, () =>
          new THREE.MeshLambertMaterial({ color: 0x475569 })
        );
        const leftW = new THREE.Mesh(geos.stepWall, sideMat);
        leftW.position.set(-0.42, 0.18, 0);
        const rightW = new THREE.Mesh(geos.stepWall, sideMat);
        rightW.position.set(0.42, 0.18, 0);
        addShadowFlag(leftW, true, true);
        addShadowFlag(rightW, true, true);
        group.add(leftW, rightW);
        structureMeshes.push(leftW, rightW);

        for (let s = 0; s < 4; s++) {
          const step = new THREE.Mesh(geos.stepTread, stairMat);
          step.position.set(0, 0.06 + s * 0.09, 0.28 - s * 0.19);
          addShadowFlag(step, true, true);
          group.add(step);
          structureMeshes.push(step);
        }
        const glowMat = mats.getBasic(`stairsUpGlow`, () =>
          new THREE.MeshBasicMaterial({
            map: getGlowDiscTexture('#60a5fa'),
            transparent: true,
            opacity: 0.65,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        haloMesh = new THREE.Mesh(geos.shadowDisc, glowMat);
        haloMesh.position.y = 0.025;
        haloMesh.scale.set(1.15, 1.15, 1.15);
        group.add(haloMesh);
      } else if (tile.kind === 'market_stall') {
        const woodMat = mats.getLambert(`woodStall:lit`, () =>
          new THREE.MeshLambertMaterial({ color: 0x854d0e })
        );
        const roofMat = mats.getLambert(`roofStall:lit`, () =>
          new THREE.MeshLambertMaterial({ map: getStructTexture('market_stall', false) })
        );
        const counter = new THREE.Mesh(geos.stallCounter, woodMat);
        counter.position.y = 0.17;
        addShadowFlag(counter, true, true);

        const postPositions: Array<[number, number]> = [
          [-0.36, -0.26],
          [0.36, -0.26],
          [-0.36, 0.26],
          [0.36, 0.26],
        ];
        for (const [px, pz] of postPositions) {
          const p = new THREE.Mesh(geos.stallPost, woodMat);
          p.position.set(px, 0.44, pz);
          addShadowFlag(p, true, true);
          group.add(p);
          structureMeshes.push(p);
        }

        const roof = new THREE.Mesh(geos.stallRoof, roofMat);
        roof.position.y = 0.89;
        roof.rotation.x = 0.14;
        addShadowFlag(roof, true, true);

        // Colorful goods on counter
        const goodCols = [0xef4444, 0x38bdf8, 0xfbbf24];
        for (let g = 0; g < 3; g++) {
          const gMat = mats.getLambert(`stallGood:${g}:lit`, () =>
            new THREE.MeshLambertMaterial({ color: goodCols[g] })
          );
          const good = new THREE.Mesh(geos.stallGood, gMat);
          good.position.set(-0.2 + g * 0.2, 0.4, 0.02);
          addShadowFlag(good, true, true);
          group.add(good);
          structureMeshes.push(good);
        }

        group.add(counter, roof);
        structureMeshes.push(counter, roof);
        tallHeight = 0.96;
      } else if (tile.kind === 'gate_city') {
        const gateMat = mats.getLambert(`gateStone:lit`, () =>
          new THREE.MeshLambertMaterial({ color: 0x64748b })
        );
        const portalMat = mats.getBasic(`gatePortal`, () =>
          new THREE.MeshBasicMaterial({
            color: 0xf59e0b,
            transparent: true,
            opacity: 0.48,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
          })
        );
        const gateGroup = new THREE.Group();
        const left = new THREE.Mesh(geos.gatePost, gateMat);
        left.position.set(-0.36, 0.78, 0);
        const right = new THREE.Mesh(geos.gatePost, gateMat);
        right.position.set(0.36, 0.78, 0);
        const lintel = new THREE.Mesh(geos.gateLintel, gateMat);
        lintel.position.set(0, 1.58, 0);
        addShadowFlag(left, true, true);
        addShadowFlag(right, true, true);
        addShadowFlag(lintel, true, true);

        const portal = new THREE.Mesh(geos.gatePortal, portalMat);
        portal.position.set(0, 0.72, 0);
        gateGroup.add(left, right, lintel, portal);
        if (x === 0 || x === zone.width - 1) {
          gateGroup.rotation.y = Math.PI / 2;
        }
        group.add(gateGroup);
        structureMeshes.push(left, right, lintel);
        isTallObstacle = true;
        tallHeight = 1.72;
      } else if (tile.kind === 'torch' || tile.kind === 'brazier') {
        const ironMat = mats.getLambert(`iron:lit`, () =>
          new THREE.MeshLambertMaterial({ color: 0x334155 })
        );
        if (tile.kind === 'torch') {
          const pole = new THREE.Mesh(geos.torchPole, ironMat);
          pole.position.y = 0.28;
          addShadowFlag(pole, true, true);
          group.add(pole);
          structureMeshes.push(pole);
        } else {
          const bowl = new THREE.Mesh(geos.brazierBowl, ironMat);
          bowl.position.y = 0.14;
          addShadowFlag(bowl, true, true);
          group.add(bowl);
          structureMeshes.push(bowl);
        }

        const isAbyss = zone.depth >= 5;
        const outerHex = isAbyss ? 0xa855f7 : 0xf97316;
        const innerHex = isAbyss ? 0xf3e8ff : 0xfef08a;
        const flameGroup = new THREE.Group();
        flameGroup.position.y = tile.kind === 'torch' ? 0.58 : 0.26;
        const fOut = new THREE.Mesh(
          geos.flameOuter,
          mats.getBasic(`flameOut:${outerHex}`, () =>
            new THREE.MeshBasicMaterial({ color: outerHex })
          )
        );
        fOut.position.y = 0.12;
        const fIn = new THREE.Mesh(
          geos.flameInner,
          mats.getBasic(`flameIn:${innerHex}`, () =>
            new THREE.MeshBasicMaterial({ color: innerHex })
          )
        );
        fIn.position.y = 0.1;
        flameGroup.add(fOut, fIn);
        flameGroup.visible = !tile.used;
        group.add(flameGroup);
        animatedMesh = flameGroup;

        const haloMat = mats.getBasic(`halo:fire:${outerHex}`, () =>
          new THREE.MeshBasicMaterial({
            map: getGlowDiscTexture(isAbyss ? '#c084fc' : '#fb923c'),
            transparent: true,
            opacity: 0.62,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        haloMesh = new THREE.Mesh(geos.shadowDisc, haloMat);
        haloMesh.position.y = 0.024;
        haloMesh.scale.set(1.5, 1.5, 1.5);
        haloMesh.visible = !tile.used;
        group.add(haloMesh);
      } else if (
        tile.kind === 'shrine' ||
        tile.kind === 'waystone' ||
        tile.kind === 'cursed_altar'
      ) {
        const stoneCol = tile.kind === 'cursed_altar' ? 0x3b1e4a : 0x64748b;
        const stoneMat = mats.getLambert(`dais:${tile.kind}:lit`, () =>
          new THREE.MeshLambertMaterial({ color: stoneCol })
        );
        const dais = new THREE.Mesh(geos.pedestal, stoneMat);
        dais.position.y = 0.09;
        const plinth = new THREE.Mesh(geos.pedestalTop, stoneMat);
        plinth.position.y = 0.24;
        addShadowFlag(dais, true, true);
        addShadowFlag(plinth, true, true);
        group.add(dais, plinth);
        structureMeshes.push(dais, plinth);

        const cryHex =
          tile.kind === 'cursed_altar'
            ? 0xe879f9
            : tile.kind === 'waystone'
              ? 0x38bdf8
              : 0x60a5fa;
        const cryCss =
          tile.kind === 'cursed_altar'
            ? '#e879f9'
            : tile.kind === 'waystone'
              ? '#38bdf8'
              : '#60a5fa';
        const cryMat = mats.getBasic(`cry:${cryHex}`, () =>
          new THREE.MeshBasicMaterial({ color: cryHex })
        );
        const crystal = new THREE.Mesh(geos.crystal, cryMat);
        crystal.position.y = 0.56;
        crystal.visible = !tile.used;
        group.add(crystal);
        animatedMesh = crystal;

        const haloMat = mats.getBasic(`halo:${cryCss}`, () =>
          new THREE.MeshBasicMaterial({
            map: getGlowDiscTexture(cryCss),
            transparent: true,
            opacity: 0.55,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        haloMesh = new THREE.Mesh(geos.shadowDisc, haloMat);
        haloMesh.position.y = 0.025;
        haloMesh.scale.set(1.45, 1.45, 1.45);
        haloMesh.visible = !tile.used;
        group.add(haloMesh);
      } else if (tile.kind === 'forgotten_forge') {
        const hearthMat = mats.getLambert(`forgeStone:lit`, () =>
          new THREE.MeshLambertMaterial({ color: 0x44403c })
        );
        const anvilMat = mats.getLambert(`forgeAnvil:lit`, () =>
          new THREE.MeshLambertMaterial({ color: 0x94a3b8 })
        );
        const hearth = new THREE.Mesh(geos.pedestal, hearthMat);
        hearth.position.y = 0.09;
        const anvil = new THREE.Mesh(geos.anvil, anvilMat);
        anvil.position.set(0.06, 0.28, 0.05);
        addShadowFlag(hearth, true, true);
        addShadowFlag(anvil, true, true);
        group.add(hearth, anvil);
        structureMeshes.push(hearth, anvil);

        const ember = new THREE.Mesh(
          geos.flameOuter,
          mats.getBasic(`forgeEmber`, () => new THREE.MeshBasicMaterial({ color: 0xf97316 }))
        );
        ember.position.set(-0.16, 0.3, -0.1);
        ember.visible = !tile.used;
        group.add(ember);
        animatedMesh = ember;

        const haloMat = mats.getBasic(`halo:forge`, () =>
          new THREE.MeshBasicMaterial({
            map: getGlowDiscTexture('#f97316'),
            transparent: true,
            opacity: 0.55,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        haloMesh = new THREE.Mesh(geos.shadowDisc, haloMat);
        haloMesh.position.y = 0.025;
        haloMesh.scale.set(1.4, 1.4, 1.4);
        haloMesh.visible = !tile.used;
        group.add(haloMesh);
      } else if (tile.kind === 'chest') {
        const cMat = mats.getLambert(`chestWood:lit`, () =>
          new THREE.MeshLambertMaterial({ color: 0x92400e })
        );
        const goldMat = mats.getLambert(`chestGold:lit`, () =>
          new THREE.MeshLambertMaterial({ color: 0xf59e0b })
        );
        const base = new THREE.Mesh(geos.chestBase, cMat);
        base.position.y = 0.12;
        const trim = new THREE.Mesh(geos.chestTrim, goldMat);
        trim.position.y = 0.13;
        chestLidMesh = new THREE.Mesh(geos.chestLid, goldMat);
        chestLidMesh.position.y = 0.3;
        addShadowFlag(base, true, true);
        addShadowFlag(trim, true, true);
        addShadowFlag(chestLidMesh, true, true);
        group.add(base, trim, chestLidMesh);
        structureMeshes.push(base, trim, chestLidMesh);

        const haloMat = mats.getBasic(`halo:chest`, () =>
          new THREE.MeshBasicMaterial({
            map: getGlowDiscTexture('#fbbf24'),
            transparent: true,
            opacity: 0.45,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        haloMesh = new THREE.Mesh(geos.shadowDisc, haloMat);
        haloMesh.position.y = 0.025;
        haloMesh.scale.set(1.1, 1.1, 1.1);
        haloMesh.visible = !tile.used;
        group.add(haloMesh);
      } else if (tile.kind === 'lore_tablet') {
        const baseMat = mats.getLambert(`tabBase:lit`, () =>
          new THREE.MeshLambertMaterial({ color: 0x475569 })
        );
        const steleMat = mats.getLambert(`tabStele:lit`, () =>
          new THREE.MeshLambertMaterial({ color: 0x64748b })
        );
        const base = new THREE.Mesh(geos.pedestalTop, baseMat);
        base.position.y = 0.08;
        const slab = new THREE.Mesh(geos.tabletSlab, steleMat);
        slab.position.y = 0.42;
        slab.rotation.x = -0.14;
        addShadowFlag(base, true, true);
        addShadowFlag(slab, true, true);
        group.add(base, slab);
        structureMeshes.push(base, slab);

        const haloMat = mats.getBasic(`halo:lore`, () =>
          new THREE.MeshBasicMaterial({
            map: getGlowDiscTexture('#a78bfa'),
            transparent: true,
            opacity: 0.42,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        haloMesh = new THREE.Mesh(geos.shadowDisc, haloMat);
        haloMesh.position.y = 0.025;
        haloMesh.visible = !tile.used;
        group.add(haloMesh);
      } else if (tile.kind === 'vault_door') {
        const vMat = mats.getLambert(`vaultStone:lit`, () =>
          new THREE.MeshLambertMaterial({ color: 0x334155 })
        );
        const ironMat = mats.getLambert(`vaultIron:lit`, () =>
          new THREE.MeshLambertMaterial({ color: 0x1e293b })
        );
        const sealMat = mats.getBasic(`vaultSeal`, () =>
          new THREE.MeshBasicMaterial({ color: 0xf59e0b })
        );
        const vault = new THREE.Mesh(geos.wallBox, vMat);
        vault.scale.set(0.96, 1.86, 0.96);
        vault.position.y = 0.93;
        const band = new THREE.Mesh(geos.wallCap, ironMat);
        band.position.y = 0.96;
        const seal = new THREE.Mesh(geos.crystal, sealMat);
        seal.position.set(0, 1.0, 0);
        seal.scale.set(1.3, 1.3, 1.3);
        addShadowFlag(vault, true, true);
        addShadowFlag(band, true, true);
        group.add(vault, band, seal);
        structureMeshes.push(vault, band);
        animatedMesh = seal;
        isTallObstacle = true;
        tallHeight = 1.86;
      } else if (tile.kind === 'herb_node') {
        const leafMat = mats.getLambert(`herbLeaf:lit`, () =>
          new THREE.MeshLambertMaterial({ color: 0x10b981 })
        );
        const bloomMat = mats.getBasic(`herbBloom`, () =>
          new THREE.MeshBasicMaterial({ color: 0xa7f3d0 })
        );
        const rootClump = new THREE.Group();
        for (let k = 0; k < 4; k++) {
          const leaf = new THREE.Mesh(geos.treeFoliageB, leafMat);
          const ang = (k * Math.PI) / 2;
          leaf.position.set(Math.cos(ang) * 0.12, 0.14, Math.sin(ang) * 0.12);
          leaf.scale.set(0.55, 0.35, 0.55);
          addShadowFlag(leaf, true, true);
          rootClump.add(leaf);
          structureMeshes.push(leaf);
        }
        const blossom = new THREE.Mesh(geos.crystal, bloomMat);
        blossom.position.y = 0.32;
        blossom.scale.set(0.6, 0.6, 0.6);
        rootClump.add(blossom);
        group.add(rootClump);
        animatedMesh = blossom;
      } else if (tile.kind === 'contraband_cache') {
        const crateMat = mats.getLambert(`cacheCrate:lit`, () =>
          new THREE.MeshLambertMaterial({ color: 0x78350f })
        );
        const bandMat = mats.getLambert(`cacheBand:lit`, () =>
          new THREE.MeshLambertMaterial({ color: 0x334155 })
        );
        const crate = new THREE.Mesh(geos.chestBase, crateMat);
        crate.scale.set(1.05, 1.35, 1.25);
        crate.position.y = 0.17;
        const strap = new THREE.Mesh(geos.chestTrim, bandMat);
        strap.scale.set(1.15, 1.35, 1.28);
        strap.position.y = 0.17;
        addShadowFlag(crate, true, true);
        addShadowFlag(strap, true, true);
        group.add(crate, strap);
        structureMeshes.push(crate, strap);
      } else if (tile.kind === 'whispering_bell') {
        const pillarMat = mats.getLambert(`bellStone:lit`, () =>
          new THREE.MeshLambertMaterial({ color: 0x64748b })
        );
        const bellMat = mats.getLambert(`bellGold:lit`, () =>
          new THREE.MeshLambertMaterial({ color: 0xfbbf24 })
        );
        const lPillar = new THREE.Mesh(geos.stallPost, pillarMat);
        lPillar.position.set(-0.26, 0.44, 0);
        const rPillar = new THREE.Mesh(geos.stallPost, pillarMat);
        rPillar.position.set(0.26, 0.44, 0);
        const beam = new THREE.Mesh(geos.gateLintel, pillarMat);
        beam.scale.set(0.75, 0.65, 0.75);
        beam.position.y = 0.88;
        const bell = new THREE.Mesh(geos.flameOuter, bellMat);
        bell.scale.set(1.6, 1.4, 1.6);
        bell.position.y = 0.66;
        addShadowFlag(lPillar, true, true);
        addShadowFlag(rPillar, true, true);
        addShadowFlag(beam, true, true);
        addShadowFlag(bell, true, true);
        group.add(lPillar, rPillar, beam, bell);
        structureMeshes.push(lPillar, rPillar, beam, bell);
        animatedMesh = bell;
      }

      if (tile.kind === 'trap' || tile.kind === 'dart_trap') {
        const trapMat = mats.getBasic(`trapDecal:${tile.kind}:${tile.used ? 1 : 0}`, () =>
          new THREE.MeshBasicMaterial({
            map: getStructTexture(tile.kind as 'trap' | 'dart_trap', Boolean(tile.used)),
            transparent: true,
            depthWrite: false,
          })
        );
        hazardMesh = new THREE.Mesh(geos.decal, trapMat);
        hazardMesh.position.y = 0.02;
        hazardMesh.visible = Boolean(tile.revealed);
        group.add(hazardMesh);
      } else if (ANIMATED_HAZARD_KINDS.has(tile.kind)) {
        const hazMat = mats.getBasic(`hazDecal:${tile.kind}:0:${tile.used ? 1 : 0}`, () =>
          new THREE.MeshBasicMaterial({
            map: getHazardTexture(
              tile.kind as 'spore_pool' | 'frost_vent' | 'ember_crust' | 'shock_rune',
              0,
              Boolean(tile.used)
            ),
            transparent: true,
            depthWrite: false,
          })
        );
        hazardMesh = new THREE.Mesh(geos.decal, hazMat);
        hazardMesh.position.y = 0.02;
        hazardMesh.visible = !tile.used;
        group.add(hazardMesh);
      }

      root.add(group);
      const node: TileNode = {
        x,
        y,
        kind: tile.kind,
        group,
        groundMesh,
        ceilingMesh,
        wallMesh,
        wallCapMesh,
        wallBaseHeight,
        fluidMesh,
        hazardMesh,
        propBillboard,
        animatedMesh,
        haloMesh,
        chestLidMesh,
        treeCrownGroup,
        structureMeshes,
        isTallObstacle,
        tallHeight,
        biomeVariant,
        propVariant,
        isVaultInterior,
        tintColor,
        lastState: 'hidden',
        lastUsed: Boolean(tile.used),
        lastRevealed: Boolean(tile.revealed),
        lastCutaway: false,
        lastAnimFrame: -1,
      };
      nodes.push(node);
      if (animatedMesh || treeCrownGroup) {
        animatedNodes.push(node);
      }
    }
  }

  return { root, nodes, billboards, animatedNodes };
}

export function syncTileNode(
  node: TileNode,
  tile: Tile,
  inRange: boolean,
  isCutaway: boolean,
  animFrame: number,
  biome: BiomeId,
  depth: number,
  mats: SceneMaterialPool
): void {
  const nextState: TileVisState =
    !tile.explored || !inRange ? 'hidden' : tile.visible ? 'lit' : 'memory';
  if (nextState === 'hidden') {
    if (node.lastState !== 'hidden') {
      node.group.visible = false;
      node.lastState = 'hidden';
    }
    return;
  }

  if (node.lastState === 'hidden') {
    node.group.visible = true;
  }

  const stateChanged = node.lastState !== nextState;
  const used = Boolean(tile.used);
  const revealed = Boolean(tile.revealed);
  const usedChanged = node.lastUsed !== used;
  const revChanged = node.lastRevealed !== revealed;
  const cutawayChanged = node.lastCutaway !== isCutaway;

  if (stateChanged || cutawayChanged) {
    const isMem = nextState === 'memory';
    const memTint = 0x526280;

    if (node.wallMesh) {
      const wState = isMem ? 'memory' : 'lit';
      node.wallMesh.material = mats.getWallArray(biome, node.biomeVariant, wState);
      const cutHeight = isCutaway ? 0.24 : node.wallBaseHeight;
      node.wallMesh.scale.set(1, cutHeight, 1);
      node.wallMesh.position.y = cutHeight / 2;
      node.wallMesh.renderOrder = 0;
      node.wallMesh.castShadow = !isCutaway;
    }
    if (node.wallCapMesh) {
      node.wallCapMesh.visible = !isCutaway;
      if (!isCutaway) {
        node.wallCapMesh.material = mats.getLambert(
          `wallCapMat:${biome}:${node.biomeVariant % 6}:${nextState}`,
          () =>
            new THREE.MeshLambertMaterial({
              map: getWallTopTexture(biome, node.biomeVariant),
              color: isMem ? memTint : 0xffffff,
            })
        );
      }
    }
    if (node.treeCrownGroup) {
      node.treeCrownGroup.visible = !isCutaway;
    }
    if (node.ceilingMesh) {
      node.ceilingMesh.material = mats.getLambert(
        `ceilMat:${biome}:${node.biomeVariant % 4}:${nextState}`,
        () =>
          new THREE.MeshLambertMaterial({
            map: getWallTopTexture(biome, node.biomeVariant),
            color: isMem ? 0x3f4a5c : 0x6b7280,
          })
      );
    }

    if (node.kind !== 'water' && node.kind !== 'chasm') {
      const isRoad = node.kind === 'road';
      if (isRoad) {
        node.groundMesh.material = mats.getLambert(
          `roadMat:${biome}:${node.biomeVariant % 6}:${nextState}`,
          () =>
            new THREE.MeshLambertMaterial({
              map: getRoadTexture(biome, node.biomeVariant),
              color: isMem ? memTint : 0xffffff,
            })
        );
      } else {
        const baseTint = node.tintColor ?? 0xffffff;
        const combinedTint = isMem ? memTint : baseTint;
        node.groundMesh.material = mats.getLambert(
          `floorMat:${biome}:${node.biomeVariant % 8}:${node.isVaultInterior ? 1 : 0}:${node.tintColor ?? 0}:${nextState}`,
          () =>
            new THREE.MeshLambertMaterial({
              map: getFloorTexture(biome, node.biomeVariant, node.isVaultInterior),
              color: combinedTint,
            })
        );
      }
    }

    if (!node.wallMesh && node.structureMeshes.length > 0 && stateChanged) {
      for (const sm of node.structureMeshes) {
        const baseMat = sm.material as THREE.MeshLambertMaterial;
        if (!baseMat || !baseMat.color) continue;
        const origHex = (sm.userData.origColor as number | undefined) ?? baseMat.color.getHex();
        sm.userData.origColor = origHex;
        const mapId = baseMat.map ? baseMat.map.uuid : 'nomap';
        sm.material = mats.getLambert(`structTint:${origHex}:${mapId}:${nextState}`, () => {
          const cloned = baseMat.clone();
          if (isMem) {
            cloned.color.setHex(origHex).multiplyScalar(0.45);
          } else {
            cloned.color.setHex(origHex);
          }
          return cloned;
        });
      }
    }
  }

  if (usedChanged || stateChanged) {
    if (node.animatedMesh) {
      node.animatedMesh.visible = !used && nextState === 'lit';
    }
    if (node.haloMesh) {
      node.haloMesh.visible = !used && nextState === 'lit';
    }
    if (node.chestLidMesh) {
      if (used) {
        node.chestLidMesh.rotation.x = -0.75;
        node.chestLidMesh.position.set(0, 0.34, -0.14);
      } else {
        node.chestLidMesh.rotation.x = 0;
        node.chestLidMesh.position.set(0, 0.3, 0);
      }
    }
  }

  // Animated fluids
  if (node.fluidMesh && (stateChanged || node.lastAnimFrame !== animFrame)) {
    const f = (animFrame + ((node.x * 3 + node.y * 5) % 6)) % 6;
    const isMem = nextState === 'memory';
    const fKind = node.kind === 'fountain' ? 'water' : (node.kind as 'water' | 'chasm');
    node.fluidMesh.material = mats.getLambert(`fluid:${fKind}:${f}:${nextState}`, () =>
      new THREE.MeshLambertMaterial({
        map: getFluidTexture(fKind, f),
        color: isMem ? 0x526280 : 0xffffff,
      })
    );
  }

  if (node.hazardMesh) {
    if (node.kind === 'trap' || node.kind === 'dart_trap') {
      if (revChanged || usedChanged || stateChanged) {
        node.hazardMesh.visible = revealed;
        if (revealed) {
          const isMem = nextState === 'memory';
          node.hazardMesh.material = mats.getBasic(
            `trapDecal:${node.kind}:${used ? 1 : 0}:${nextState}`,
            () =>
              new THREE.MeshBasicMaterial({
                map: getStructTexture(node.kind as 'trap' | 'dart_trap', used),
                color: isMem ? 0x60708c : 0xffffff,
                transparent: true,
                depthWrite: false,
              })
          );
        }
      }
    } else if (ANIMATED_HAZARD_KINDS.has(node.kind)) {
      if (usedChanged || stateChanged || (!used && node.lastAnimFrame !== animFrame)) {
        node.hazardMesh.visible = !used;
        if (!used) {
          const f = (animFrame + ((node.x + node.y) % 4)) % 4;
          const isMem = nextState === 'memory';
          node.hazardMesh.material = mats.getBasic(
            `hazDecal:${node.kind}:${f}:0:${nextState}`,
            () =>
              new THREE.MeshBasicMaterial({
                map: getHazardTexture(
                  node.kind as 'spore_pool' | 'frost_vent' | 'ember_crust' | 'shock_rune',
                  f,
                  false
                ),
                color: isMem ? 0x60708c : 0xffffff,
                transparent: true,
                depthWrite: false,
              })
          );
        }
      }
    }
  }

  node.lastState = nextState;
  node.lastUsed = used;
  node.lastRevealed = revealed;
  node.lastCutaway = isCutaway;
  node.lastAnimFrame = animFrame;
}
