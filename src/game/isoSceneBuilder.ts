import * as THREE from 'three';
import {
  getBiomeAtmosphere,
  getFloorTexture,
  getFluidTexture,
  getHazardTexture,
  getRoadTexture,
  getStructTexture,
  getWallSideTexture,
  getWallTopTexture,
  textureFromCanvas,
} from './isoMaterials';
import { getPropSprite } from './sprites';
import { BiomeId, getBiomePalette, pickTileVariant } from './tileset';
import { Tile, TileKind, ZoneMap } from './types';

export type TileVisState = 'hidden' | 'memory' | 'lit';

export interface IsoGeometries {
  floor: THREE.PlaneGeometry;
  wallBox: THREE.BoxGeometry;
  chasmPit: THREE.BoxGeometry;
  pillarBase: THREE.BoxGeometry;
  pillarShaft: THREE.CylinderGeometry;
  pillarCap: THREE.BoxGeometry;
  treeTrunk: THREE.CylinderGeometry;
  treeCrownLow: THREE.ConeGeometry;
  treeCrownHigh: THREE.ConeGeometry;
  stepTread: THREE.BoxGeometry;
  pedestal: THREE.BoxGeometry;
  chestBase: THREE.BoxGeometry;
  chestLid: THREE.BoxGeometry;
  stallCounter: THREE.BoxGeometry;
  stallPost: THREE.BoxGeometry;
  stallRoof: THREE.BoxGeometry;
  gatePost: THREE.BoxGeometry;
  gateLintel: THREE.BoxGeometry;
  gatePortal: THREE.PlaneGeometry;
  fountainRim: THREE.CylinderGeometry;
  fountainSpire: THREE.CylinderGeometry;
  billboard: THREE.PlaneGeometry;
  decal: THREE.PlaneGeometry;
  shadowDisc: THREE.PlaneGeometry;
  floorRing: THREE.RingGeometry;
  spark: THREE.BoxGeometry;
  projHead: THREE.BoxGeometry;
  projTail: THREE.BoxGeometry;
  pathDot: THREE.SphereGeometry;
}

export function createIsoGeometries(): IsoGeometries {
  const floor = new THREE.PlaneGeometry(1, 1);
  floor.rotateX(-Math.PI / 2);

  const decal = new THREE.PlaneGeometry(0.92, 0.92);
  decal.rotateX(-Math.PI / 2);

  const shadowDisc = new THREE.PlaneGeometry(0.92, 0.92);
  shadowDisc.rotateX(-Math.PI / 2);

  const floorRing = new THREE.RingGeometry(0.35, 0.46, 24);
  floorRing.rotateX(-Math.PI / 2);

  const billboard = new THREE.PlaneGeometry(1, 1);
  billboard.translate(0, 0.5, 0);

  return {
    floor,
    wallBox: new THREE.BoxGeometry(1, 1, 1),
    chasmPit: new THREE.BoxGeometry(0.98, 0.72, 0.98),
    pillarBase: new THREE.BoxGeometry(0.56, 0.14, 0.56),
    pillarShaft: new THREE.CylinderGeometry(0.18, 0.21, 0.92, 8),
    pillarCap: new THREE.BoxGeometry(0.52, 0.14, 0.52),
    treeTrunk: new THREE.CylinderGeometry(0.1, 0.14, 0.45, 7),
    treeCrownLow: new THREE.ConeGeometry(0.42, 0.65, 7),
    treeCrownHigh: new THREE.ConeGeometry(0.3, 0.52, 7),
    stepTread: new THREE.BoxGeometry(0.84, 0.16, 0.22),
    pedestal: new THREE.BoxGeometry(0.54, 0.24, 0.54),
    chestBase: new THREE.BoxGeometry(0.46, 0.22, 0.34),
    chestLid: new THREE.BoxGeometry(0.48, 0.12, 0.36),
    stallCounter: new THREE.BoxGeometry(0.76, 0.34, 0.46),
    stallPost: new THREE.BoxGeometry(0.08, 0.85, 0.08),
    stallRoof: new THREE.BoxGeometry(0.92, 0.14, 0.76),
    gatePost: new THREE.BoxGeometry(0.24, 1.15, 0.26),
    gateLintel: new THREE.BoxGeometry(0.98, 0.24, 0.3),
    gatePortal: new THREE.PlaneGeometry(0.54, 0.88),
    fountainRim: new THREE.CylinderGeometry(0.44, 0.48, 0.2, 12, 1, true),
    fountainSpire: new THREE.CylinderGeometry(0.07, 0.12, 0.46, 8),
    billboard,
    decal,
    shadowDisc,
    floorRing,
    spark: new THREE.BoxGeometry(0.06, 0.06, 0.06),
    projHead: new THREE.BoxGeometry(0.14, 0.14, 0.14),
    projTail: new THREE.BoxGeometry(0.06, 0.06, 0.45),
    pathDot: new THREE.SphereGeometry(0.09, 8, 6),
  };
}

export function disposeIsoGeometries(geos: IsoGeometries): void {
  Object.values(geos).forEach((g) => g.dispose());
}

export class IsoMaterialPool {
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
    const opacity = state === 'cutaway' ? 0.22 : 1;

    const makeSide = (tex: THREE.CanvasTexture) =>
      new THREE.MeshLambertMaterial({
        map: tex,
        color: tint,
        transparent,
        opacity,
        depthWrite: !transparent,
      });

    // BoxGeometry face order: +x, -x, +y (top), -y (bottom), +z, -z
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
  wallMesh?: THREE.Mesh;
  fluidMesh?: THREE.Mesh;
  hazardMesh?: THREE.Mesh;
  propBillboard?: THREE.Mesh;
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

const PROP_KINDS = new Set<TileKind>([
  'torch',
  'brazier',
  'shrine',
  'waystone',
  'forgotten_forge',
  'cursed_altar',
  'chest',
  'lore_tablet',
  'herb_node',
  'contraband_cache',
  'whispering_bell',
  'vault_door',
]);

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

export function buildZoneTerrain(
  zone: ZoneMap,
  biome: BiomeId,
  geos: IsoGeometries,
  mats: IsoMaterialPool
): { root: THREE.Group; nodes: TileNode[]; billboards: THREE.Mesh[] } {
  const root = new THREE.Group();
  const nodes: TileNode[] = [];
  const billboards: THREE.Mesh[] = [];
  const atmo = getBiomeAtmosphere(biome);
  const palette = getBiomePalette(biome);

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

      // Ground tile
      const isFluid = ANIMATED_FLUID_KINDS.has(tile.kind);
      const isRoad = tile.kind === 'road';
      const groundMat = isFluid
        ? mats.getLambert(`chasmPit:${biome}`, () =>
            new THREE.MeshLambertMaterial({ color: tile.kind === 'chasm' ? 0x1a090a : 0x0b2234 })
          )
        : isRoad
          ? mats.getLambert(`roadMat:${biome}:${biomeVariant % 8}:lit`, () =>
              new THREE.MeshLambertMaterial({ map: getRoadTexture(biome, biomeVariant) })
            )
          : mats.getLambert(
              `floorMat:${biome}:${biomeVariant}:${isVaultInterior ? 1 : 0}:${tintColor ?? 0}:lit`,
              () =>
                new THREE.MeshLambertMaterial({
                  map: getFloorTexture(biome, biomeVariant, isVaultInterior),
                  color: tintColor ?? 0xffffff,
                })
            );

      const groundMesh = new THREE.Mesh(geos.floor, groundMat);
      groundMesh.position.y = isFluid ? (tile.kind === 'chasm' ? -0.72 : -0.16) : isRoad ? 0.015 : 0;
      group.add(groundMesh);

      let wallMesh: THREE.Mesh | undefined;
      let fluidMesh: THREE.Mesh | undefined;
      let hazardMesh: THREE.Mesh | undefined;
      let propBillboard: THREE.Mesh | undefined;
      let isTallObstacle = false;
      let tallHeight = 0;

      if (tile.kind === 'wall') {
        const wallH = 1.12 + ((biomeVariant % 3) * 0.06);
        wallMesh = new THREE.Mesh(
          geos.wallBox,
          mats.getWallArray(biome, biomeVariant, 'lit')
        );
        wallMesh.scale.set(1, wallH, 1);
        wallMesh.position.y = wallH / 2;
        group.add(wallMesh);
        structureMeshes.push(wallMesh);
        isTallObstacle = true;
        tallHeight = wallH;
      } else if (tile.kind === 'pillar') {
        const stoneMat = mats.getLambert(`stone:${biome}:lit`, () =>
          new THREE.MeshLambertMaterial({ color: palette.wallTopAlt })
        );
        const capMat = mats.getLambert(`stoneCap:${biome}:lit`, () =>
          new THREE.MeshLambertMaterial({ color: palette.wallHighlight })
        );
        const base = new THREE.Mesh(geos.pillarBase, stoneMat);
        base.position.y = 0.07;
        const shaft = new THREE.Mesh(geos.pillarShaft, stoneMat);
        shaft.position.y = 0.6;
        const cap = new THREE.Mesh(geos.pillarCap, capMat);
        cap.position.y = 1.12;
        group.add(base, shaft, cap);
        structureMeshes.push(base, shaft, cap);
        isTallObstacle = true;
        tallHeight = 1.2;
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
        trunk.position.y = 0.22;
        const c1 = new THREE.Mesh(geos.treeCrownLow, leaf1Mat);
        c1.position.y = 0.66;
        c1.rotation.y = propVariant * 0.5;
        const c2 = new THREE.Mesh(geos.treeCrownHigh, leaf2Mat);
        c2.position.y = 1.02;
        c2.rotation.y = propVariant * 0.9;
        group.add(trunk, c1, c2);
        structureMeshes.push(trunk, c1, c2);
        isTallObstacle = true;
        tallHeight = 1.25;
      } else if (tile.kind === 'water' || tile.kind === 'fountain' || tile.kind === 'chasm') {
        const fluidMat = mats.getLambert(`fluid:${tile.kind}:0:lit`, () =>
          new THREE.MeshLambertMaterial({
            map: getFluidTexture(tile.kind as 'water' | 'fountain' | 'chasm', 0),
          })
        );
        fluidMesh = new THREE.Mesh(geos.floor, fluidMat);
        fluidMesh.position.y = tile.kind === 'chasm' ? -0.32 : -0.04;
        group.add(fluidMesh);

        if (tile.kind === 'chasm') {
          const cliffMat = mats.getLambert(`chasmWall:lit`, () =>
            new THREE.MeshLambertMaterial({ color: 0x261414 })
          );
          const pitRim = new THREE.Mesh(geos.chasmPit, cliffMat);
          pitRim.position.y = -0.37;
          group.add(pitRim);
        } else if (tile.kind === 'fountain') {
          const rimMat = mats.getLambert(`fountainRim:lit`, () =>
            new THREE.MeshLambertMaterial({ color: 0x94a3b8, side: THREE.DoubleSide })
          );
          const rim = new THREE.Mesh(geos.fountainRim, rimMat);
          rim.position.y = 0.1;
          const spire = new THREE.Mesh(geos.fountainSpire, rimMat);
          spire.position.y = 0.23;
          group.add(rim, spire);
          structureMeshes.push(rim, spire);
        }
      } else if (tile.kind === 'stairs_down') {
        const stairMat = mats.getLambert(`stairsDownMat:lit`, () =>
          new THREE.MeshLambertMaterial({ color: 0x334155 })
        );
        const rimMat = mats.getBasic(`stairsDownGlow`, () =>
          new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.35 })
        );
        for (let s = 0; s < 4; s++) {
          const step = new THREE.Mesh(geos.stepTread, stairMat);
          step.position.set(0, 0.06 - s * 0.07, -0.3 + s * 0.2);
          group.add(step);
          structureMeshes.push(step);
        }
        const glow = new THREE.Mesh(geos.decal, rimMat);
        glow.position.y = 0.015;
        group.add(glow);
      } else if (tile.kind === 'stairs_up') {
        const stairMat = mats.getLambert(`stairsUpMat:lit`, () =>
          new THREE.MeshLambertMaterial({ color: 0x64748b })
        );
        const rimMat = mats.getBasic(`stairsUpGlow`, () =>
          new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.35 })
        );
        for (let s = 0; s < 4; s++) {
          const step = new THREE.Mesh(geos.stepTread, stairMat);
          step.position.set(0, 0.08 + s * 0.1, 0.3 - s * 0.2);
          group.add(step);
          structureMeshes.push(step);
        }
        const glow = new THREE.Mesh(geos.decal, rimMat);
        glow.position.y = 0.015;
        group.add(glow);
      } else if (tile.kind === 'market_stall') {
        const woodMat = mats.getLambert(`woodStall:lit`, () =>
          new THREE.MeshLambertMaterial({ color: 0x78350f })
        );
        const roofMat = mats.getLambert(`roofStall:lit`, () =>
          new THREE.MeshLambertMaterial({ map: getStructTexture('market_stall', false) })
        );
        const counter = new THREE.Mesh(geos.stallCounter, woodMat);
        counter.position.y = 0.17;
        const p1 = new THREE.Mesh(geos.stallPost, woodMat);
        p1.position.set(-0.36, 0.42, -0.26);
        const p2 = new THREE.Mesh(geos.stallPost, woodMat);
        p2.position.set(0.36, 0.42, -0.26);
        const p3 = new THREE.Mesh(geos.stallPost, woodMat);
        p3.position.set(-0.36, 0.42, 0.26);
        const p4 = new THREE.Mesh(geos.stallPost, woodMat);
        p4.position.set(0.36, 0.42, 0.26);
        const roof = new THREE.Mesh(geos.stallRoof, roofMat);
        roof.position.y = 0.86;
        roof.rotation.x = 0.12;
        group.add(counter, p1, p2, p3, p4, roof);
        structureMeshes.push(counter, p1, p2, p3, p4, roof);
        tallHeight = 0.95;
      } else if (tile.kind === 'gate_city') {
        const gateMat = mats.getLambert(`gateStone:lit`, () =>
          new THREE.MeshLambertMaterial({ color: 0x475569 })
        );
        const portalMat = mats.getBasic(`gatePortal`, () =>
          new THREE.MeshBasicMaterial({
            color: 0xf59e0b,
            transparent: true,
            opacity: 0.45,
            side: THREE.DoubleSide,
          })
        );
        const left = new THREE.Mesh(geos.gatePost, gateMat);
        left.position.set(-0.36, 0.57, 0);
        const right = new THREE.Mesh(geos.gatePost, gateMat);
        right.position.set(0.36, 0.57, 0);
        const lintel = new THREE.Mesh(geos.gateLintel, gateMat);
        lintel.position.set(0, 1.18, 0);
        const portal = new THREE.Mesh(geos.gatePortal, portalMat);
        portal.position.set(0, 0.52, 0);
        group.add(left, right, lintel, portal);
        structureMeshes.push(left, right, lintel);
        isTallObstacle = true;
        tallHeight = 1.28;
      }

      if (
        tile.kind === 'shrine' ||
        tile.kind === 'waystone' ||
        tile.kind === 'forgotten_forge' ||
        tile.kind === 'cursed_altar'
      ) {
        const pedMat = mats.getLambert(`ped:${tile.kind}:lit`, () =>
          new THREE.MeshLambertMaterial({
            color:
              tile.kind === 'cursed_altar'
                ? 0x2e1b3b
                : tile.kind === 'forgotten_forge'
                  ? 0x3b2a26
                  : 0x475569,
          })
        );
        const ped = new THREE.Mesh(geos.pedestal, pedMat);
        ped.position.y = 0.12;
        group.add(ped);
        structureMeshes.push(ped);
      } else if (tile.kind === 'chest') {
        const cMat = mats.getLambert(`chestWood:lit`, () =>
          new THREE.MeshLambertMaterial({ color: 0x854d0e })
        );
        const lidMat = mats.getLambert(`chestGold:lit`, () =>
          new THREE.MeshLambertMaterial({ color: 0xd97706 })
        );
        const base = new THREE.Mesh(geos.chestBase, cMat);
        base.position.y = 0.11;
        const lid = new THREE.Mesh(geos.chestLid, lidMat);
        lid.position.y = 0.28;
        group.add(base, lid);
        structureMeshes.push(base, lid);
      } else if (tile.kind === 'vault_door') {
        const vMat = mats.getLambert(`vaultStone:lit`, () =>
          new THREE.MeshLambertMaterial({ color: 0x334155 })
        );
        const vault = new THREE.Mesh(geos.wallBox, vMat);
        vault.scale.set(0.92, 1.05, 0.92);
        vault.position.y = 0.52;
        group.add(vault);
        structureMeshes.push(vault);
        isTallObstacle = true;
        tallHeight = 1.05;
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

      if (PROP_KINDS.has(tile.kind)) {
        const isDeep = zone.depth >= 3;
        const propCanvas = getPropSprite(tile.kind, Boolean(tile.used), 0, isDeep, propVariant);
        if (propCanvas) {
          const propTex = textureFromCanvas(
            `prop:${tile.kind}:${tile.used ? 1 : 0}:0:${isDeep ? 1 : 0}:${propVariant}`,
            propCanvas
          );
          const propMat = mats.getBasic(
            `propMat:${tile.kind}:${tile.used ? 1 : 0}:0:${isDeep ? 1 : 0}:${propVariant}:lit`,
            () =>
              new THREE.MeshBasicMaterial({
                map: propTex,
                transparent: true,
                alphaTest: 0.1,
                side: THREE.DoubleSide,
              })
          );
          propBillboard = new THREE.Mesh(geos.billboard, propMat);
          const baseHeight =
            tile.kind === 'shrine' ||
            tile.kind === 'waystone' ||
            tile.kind === 'forgotten_forge' ||
            tile.kind === 'cursed_altar'
              ? 0.22
              : tile.kind === 'chest'
                ? 0.16
                : 0.03;
          propBillboard.position.y = baseHeight;
          const s = tile.kind === 'vault_door' ? 0.95 : 0.82;
          propBillboard.scale.set(s, s, 1);
          group.add(propBillboard);
          billboards.push(propBillboard);
        }
      }

      root.add(group);
      nodes.push({
        x,
        y,
        kind: tile.kind,
        group,
        groundMesh,
        wallMesh,
        fluidMesh,
        hazardMesh,
        propBillboard,
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
      });
    }
  }

  return { root, nodes, billboards };
}

export function syncTileNode(
  node: TileNode,
  tile: Tile,
  inRange: boolean,
  isCutaway: boolean,
  animFrame: number,
  biome: BiomeId,
  depth: number,
  mats: IsoMaterialPool
): void {
  const nextState: TileVisState = !tile.explored || !inRange ? 'hidden' : tile.visible ? 'lit' : 'memory';
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

  // Update ground / wall / structure tinting when switching between visible and memory fog
  if (stateChanged || cutawayChanged) {
    const isMem = nextState === 'memory';
    const memTint = 0x50607c;

    if (node.wallMesh) {
      const wState = isCutaway ? 'cutaway' : isMem ? 'memory' : 'lit';
      node.wallMesh.material = mats.getWallArray(biome, node.biomeVariant, wState);
    }

    if (!ANIMATED_FLUID_KINDS.has(node.kind)) {
      const isRoad = node.kind === 'road';
      if (isRoad) {
        node.groundMesh.material = mats.getLambert(
          `roadMat:${biome}:${node.biomeVariant % 8}:${nextState}`,
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
          `floorMat:${biome}:${node.biomeVariant}:${node.isVaultInterior ? 1 : 0}:${node.tintColor ?? 0}:${nextState}`,
          () =>
            new THREE.MeshLambertMaterial({
              map: getFloorTexture(biome, node.biomeVariant, node.isVaultInterior),
              color: combinedTint,
            })
        );
      }
    }

    // Also dim non-wall structure meshes in memory state
    if (!node.wallMesh && node.structureMeshes.length > 0 && stateChanged) {
      for (const sm of node.structureMeshes) {
        const baseMat = sm.material as THREE.MeshLambertMaterial;
        if (!baseMat || !baseMat.color) continue;
        // Clone keyed by original color + state
        const origHex = (sm.userData.origColor as number | undefined) ?? baseMat.color.getHex();
        sm.userData.origColor = origHex;
        const mapId = baseMat.map ? baseMat.map.uuid : 'nomap';
        sm.material = mats.getLambert(`structTint:${origHex}:${mapId}:${nextState}`, () => {
          const cloned = baseMat.clone();
          if (isMem) {
            cloned.color.setHex(origHex).multiplyScalar(0.42);
          } else {
            cloned.color.setHex(origHex);
          }
          return cloned;
        });
      }
    }
  }

  // Animated fluids
  if (node.fluidMesh && (stateChanged || node.lastAnimFrame !== animFrame)) {
    const f = (animFrame + ((node.x * 3 + node.y * 5) % 6)) % 6;
    const isMem = nextState === 'memory';
    node.fluidMesh.material = mats.getLambert(`fluid:${node.kind}:${f}:${nextState}`, () =>
      new THREE.MeshLambertMaterial({
        map: getFluidTexture(node.kind as 'water' | 'fountain' | 'chasm', f),
        color: isMem ? 0x50607c : 0xffffff,
      })
    );
  }

  // Traps / animated hazards
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

  // Props (torch, brazier, shrine, chest, etc.)
  if (node.propBillboard && (usedChanged || stateChanged || node.lastAnimFrame !== animFrame)) {
    const isDeep = depth >= 3;
    const f = Math.abs(animFrame) % 2;
    const propCanvas = getPropSprite(node.kind, used, f, isDeep, node.propVariant);
    if (propCanvas) {
      const isMem = nextState === 'memory';
      const propTex = textureFromCanvas(
        `prop:${node.kind}:${used ? 1 : 0}:${f}:${isDeep ? 1 : 0}:${node.propVariant}`,
        propCanvas
      );
      node.propBillboard.material = mats.getBasic(
        `propMat:${node.kind}:${used ? 1 : 0}:${f}:${isDeep ? 1 : 0}:${node.propVariant}:${nextState}`,
        () =>
          new THREE.MeshBasicMaterial({
            map: propTex,
            color: isMem ? 0x5c6b88 : 0xffffff,
            transparent: true,
            alphaTest: 0.1,
            side: THREE.DoubleSide,
          })
      );
    }
  }

  node.lastState = nextState;
  node.lastUsed = used;
  node.lastRevealed = revealed;
  node.lastCutaway = isCutaway;
  node.lastAnimFrame = animFrame;
}
