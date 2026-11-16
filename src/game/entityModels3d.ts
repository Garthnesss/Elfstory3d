import * as THREE from 'three';
import type {
  CompanionState,
  CritterState,
  Enemy,
  EnemyArchetype,
  GroundLoot,
  NpcPlacement,
} from './types';

function parseHex(hex: string | undefined, fallback: number): number {
  if (!hex) return fallback;
  const parsed = Number.parseInt(hex.replace('#', ''), 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

interface AnimatedEntityInstance {
  group: THREE.Group;
  body: THREE.Group;
  leftLimb?: THREE.Object3D;
  rightLimb?: THREE.Object3D;
  leftWing?: THREE.Object3D;
  rightWing?: THREE.Object3D;
  orbitRing?: THREE.Object3D;
  spinProp?: THREE.Object3D;
  kind: 'biped' | 'quadruped' | 'flyer' | 'spider' | 'wisp' | 'loot';
  baseScale: number;
  baseY: number;
  seen: boolean;
  flashMats: THREE.MeshLambertMaterial[];
  origColors: number[];
}

export interface Entity3DPool {
  beginFrame: () => void;
  placeNpc: (
    npc: NpcPlacement,
    lit: boolean,
    faceX: number,
    faceZ: number,
    timeSec: number
  ) => void;
  placeEnemy: (
    enemy: Enemy,
    wx: number,
    wz: number,
    hopLift: number,
    faceX: number,
    faceZ: number,
    timeSec: number,
    flashHex: number | null
  ) => void;
  placeCompanion: (
    comp: CompanionState,
    wx: number,
    wz: number,
    hopLift: number,
    faceX: number,
    faceZ: number,
    timeSec: number
  ) => void;
  placeCritter: (critter: CritterState, timeSec: number) => void;
  placeLoot: (drop: GroundLoot, timeSec: number) => void;
  endFrame: () => void;
  dispose: () => void;
}

export function createEntity3DPool(parentGroup: THREE.Group): Entity3DPool {
  const sharedGeos: THREE.BufferGeometry[] = [];
  const sharedMats = new Map<string, THREE.Material>();

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    sharedGeos.push(g);
    return g;
  };

  const geo = {
    box: trackGeo(new THREE.BoxGeometry(1, 1, 1)),
    cyl: trackGeo(new THREE.CylinderGeometry(0.5, 0.5, 1, 8)),
    cone: trackGeo(new THREE.ConeGeometry(0.5, 1, 7)),
    sphere: trackGeo(new THREE.SphereGeometry(0.5, 10, 8)),
    oct: trackGeo(new THREE.OctahedronGeometry(0.5, 0)),
    torus: trackGeo(new THREE.TorusGeometry(0.5, 0.08, 6, 14)),
  };
  geo.torus.rotateX(Math.PI / 2);

  const getBasic = (colorHex: number): THREE.MeshBasicMaterial => {
    const key = `b:${colorHex}`;
    let m = sharedMats.get(key) as THREE.MeshBasicMaterial | undefined;
    if (!m) {
      m = new THREE.MeshBasicMaterial({ color: colorHex });
      sharedMats.set(key, m);
    }
    return m;
  };

  const makeLambert = (
    colorHex: number,
    flashMats: THREE.MeshLambertMaterial[],
    origColors: number[]
  ): THREE.MeshLambertMaterial => {
    const m = new THREE.MeshLambertMaterial({ color: colorHex });
    flashMats.push(m);
    origColors.push(colorHex);
    return m;
  };

  const makePart = (
    g: THREE.BufferGeometry,
    m: THREE.Material,
    sx: number,
    sy: number,
    sz: number,
    px: number,
    py: number,
    pz: number,
    castShadow = true
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(g, m);
    mesh.scale.set(sx, sy, sz);
    mesh.position.set(px, py, pz);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    return mesh;
  };

  const cache = new Map<string, AnimatedEntityInstance>();

  const buildBipedEnemy = (
    enemy: Enemy,
    skinHex: number,
    armorHex: number,
    accentHex: number,
    eyeHex: number,
    style: 'goblin' | 'skeleton' | 'cultist' | 'warrior' | 'brute'
  ): AnimatedEntityInstance => {
    const group = new THREE.Group();
    const body = new THREE.Group();
    group.add(body);
    const flashMats: THREE.MeshLambertMaterial[] = [];
    const origColors: number[] = [];

    const mSkin = makeLambert(skinHex, flashMats, origColors);
    const mArm = makeLambert(armorHex, flashMats, origColors);
    const mAcc = makeLambert(accentHex, flashMats, origColors);
    const mEye = getBasic(eyeHex);

    const isBrute = style === 'brute';
    const isSkel = style === 'skeleton';
    const torsoW = isBrute ? 0.42 : isSkel ? 0.24 : 0.3;
    const torsoH = isBrute ? 0.44 : 0.34;
    const legH = isBrute ? 0.34 : 0.28;

    // Legs
    const leftLimb = new THREE.Group();
    leftLimb.position.set(-torsoW * 0.28, legH, 0);
    leftLimb.add(makePart(geo.box, mArm, isSkel ? 0.06 : 0.11, legH, 0.11, 0, -legH / 2, 0));

    const rightLimb = new THREE.Group();
    rightLimb.position.set(torsoW * 0.28, legH, 0);
    rightLimb.add(makePart(geo.box, mArm, isSkel ? 0.06 : 0.11, legH, 0.11, 0, -legH / 2, 0));
    body.add(leftLimb, rightLimb);

    // Torso
    const torsoY = legH + torsoH / 2;
    if (style === 'cultist') {
      body.add(makePart(geo.cone, mArm, 0.42, 0.62, 0.42, 0, 0.34, 0));
    } else {
      body.add(makePart(geo.box, mArm, torsoW, torsoH, 0.22, 0, torsoY, 0));
    }

    // Shoulders for brute/warrior
    if (isBrute || style === 'warrior') {
      body.add(
        makePart(geo.box, mAcc, 0.16, 0.14, 0.24, -torsoW * 0.55, torsoY + torsoH * 0.32, 0),
        makePart(geo.box, mAcc, 0.16, 0.14, 0.24, torsoW * 0.55, torsoY + torsoH * 0.32, 0)
      );
    }

    // Head + Glowing Eyes (-Z is forward!)
    const headY = legH + torsoH + 0.14;
    const headS = isBrute ? 0.25 : 0.22;
    body.add(makePart(geo.box, mSkin, headS, headS, headS, 0, headY, 0));
    body.add(
      makePart(geo.box, mEye, 0.05, 0.04, 0.04, -headS * 0.22, headY + 0.02, -headS * 0.5, false),
      makePart(geo.box, mEye, 0.05, 0.04, 0.04, headS * 0.22, headY + 0.02, -headS * 0.5, false)
    );

    if (style === 'goblin') {
      const lEar = makePart(geo.cone, mSkin, 0.08, 0.18, 0.08, -0.17, headY + 0.03, 0);
      lEar.rotation.z = 1.2;
      const rEar = makePart(geo.cone, mSkin, 0.08, 0.18, 0.08, 0.17, headY + 0.03, 0);
      rEar.rotation.z = -1.2;
      body.add(lEar, rEar);
    } else if (style === 'cultist') {
      const hood = makePart(geo.cone, mArm, 0.32, 0.28, 0.32, 0, headY + 0.12, 0.02);
      hood.rotation.x = 0.22;
      body.add(hood);
    }

    if (enemy.archetype === 'spore_hulk') {
      body.add(
        makePart(geo.cone, mAcc, 0.42, 0.2, 0.42, 0, headY + 0.18, 0),
        makePart(geo.cone, mAcc, 0.22, 0.16, 0.22, -0.22, torsoY + 0.25, 0)
      );
    } else if (enemy.archetype === 'rime_revenant') {
      const shard1 = makePart(geo.oct, mAcc, 0.16, 0.34, 0.16, -0.22, headY + 0.12, 0.04);
      shard1.rotation.z = 0.35;
      const shard2 = makePart(geo.oct, mAcc, 0.16, 0.34, 0.16, 0.22, headY + 0.12, 0.04);
      shard2.rotation.z = -0.35;
      body.add(shard1, shard2);
    }

    // Weapon / Arm
    const spinProp = new THREE.Group();
    if (style === 'cultist') {
      spinProp.position.set(0.24, torsoY, -0.16);
      spinProp.add(makePart(geo.cyl, mSkin, 0.04, 0.65, 0.04, 0, 0.1, 0));
      spinProp.add(makePart(geo.oct, mEye, 0.12, 0.12, 0.12, 0, 0.46, 0, false));
    } else {
      spinProp.position.set(torsoW * 0.65, torsoY + 0.05, -0.12);
      spinProp.add(makePart(geo.box, mAcc, 0.06, 0.44, 0.05, 0, 0.16, -0.06));
    }
    body.add(spinProp);

    // Horns + Halo Crown for Bosses / Randbosses
    let orbitRing: THREE.Object3D | undefined;
    if (enemy.isBoss || enemy.rank === 'randboss') {
      const lHorn = makePart(geo.cone, mAcc, 0.08, 0.26, 0.08, -0.13, headY + 0.18, 0);
      lHorn.rotation.z = 0.4;
      const rHorn = makePart(geo.cone, mAcc, 0.08, 0.26, 0.08, 0.13, headY + 0.18, 0);
      rHorn.rotation.z = -0.4;
      body.add(lHorn, rHorn);

      orbitRing = new THREE.Mesh(geo.torus, mEye);
      orbitRing.scale.set(0.55, 0.55, 0.55);
      orbitRing.position.y = headY + 0.28;
      body.add(orbitRing);
    }

    const baseScale = enemy.isBoss
      ? 1.38
      : enemy.rank === 'randboss'
        ? 1.25
        : isBrute
          ? 1.15
          : enemy.isElite || enemy.rank === 'rare'
            ? 1.12
            : 1;

    group.scale.setScalar(baseScale);
    parentGroup.add(group);
    return {
      group,
      body,
      leftLimb,
      rightLimb,
      spinProp,
      orbitRing,
      kind: 'biped',
      baseScale,
      baseY: 0,
      seen: true,
      flashMats,
      origColors,
    };
  };

  const buildEnemyInstance = (enemy: Enemy): AnimatedEntityInstance => {
    const a: EnemyArchetype = enemy.archetype;
    switch (a) {
      case 'goblin_skirmisher':
        return buildBipedEnemy(enemy, 0x4ade80, 0x78350f, 0x94a3b8, 0xfef08a, 'goblin');
      case 'crypt_skeleton':
        return buildBipedEnemy(enemy, 0xe2e8f0, 0xcbd5e1, 0x64748b, 0x38bdf8, 'skeleton');
      case 'grave_husk':
        return buildBipedEnemy(enemy, 0x6b7280, 0x374151, 0x84cc16, 0xa3e635, 'skeleton');
      case 'bone_acolyte':
        return buildBipedEnemy(enemy, 0xe2e8f0, 0x4c1d95, 0xc084fc, 0xa855f7, 'cultist');
      case 'ash_cultist':
        return buildBipedEnemy(enemy, 0xd6d3d1, 0x7f1d1d, 0xf97316, 0xfb923c, 'cultist');
      case 'shadow_stalker':
        return buildBipedEnemy(enemy, 0x1e293b, 0x0f172a, 0x38bdf8, 0xc084fc, 'warrior');
      case 'iron_golem':
        return buildBipedEnemy(enemy, 0x64748b, 0x475569, 0x94a3b8, 0xf59e0b, 'brute');
      case 'obsidian_warden':
        return buildBipedEnemy(enemy, 0x1e1b4b, 0x312e81, 0xf97316, 0xef4444, 'brute');
      case 'spore_hulk':
        return buildBipedEnemy(enemy, 0x3f6212, 0x365314, 0xa3e635, 0xfde047, 'brute');
      case 'rime_revenant':
        return buildBipedEnemy(enemy, 0xbae6fd, 0x1e3a8a, 0x38bdf8, 0x7dd3fc, 'warrior');
      case 'boss_bone_cantor':
        return buildBipedEnemy(enemy, 0xf1f5f9, 0x312e81, 0xfbbf24, 0x38bdf8, 'cultist');
      case 'boss_ashen_inquisitor':
        return buildBipedEnemy(enemy, 0xfecaca, 0x7f1d1d, 0xf59e0b, 0xfbbf24, 'warrior');
      case 'boss_malakor':
        return buildBipedEnemy(enemy, 0x292524, 0x450a0a, 0xf97316, 0xf43f5e, 'brute');
      case 'plague_rat': {
        const group = new THREE.Group();
        const body = new THREE.Group();
        group.add(body);
        const flashMats: THREE.MeshLambertMaterial[] = [];
        const origColors: number[] = [];
        const mFur = makeLambert(0x6b5b4e, flashMats, origColors);
        const mEye = getBasic(0xef4444);
        body.add(makePart(geo.sphere, mFur, 0.34, 0.24, 0.52, 0, 0.16, 0.04));
        body.add(makePart(geo.cone, mFur, 0.2, 0.24, 0.2, 0, 0.18, -0.28));
        const head = body.children[1] as THREE.Mesh;
        head.rotation.x = -Math.PI / 2;
        body.add(
          makePart(geo.sphere, mFur, 0.1, 0.12, 0.04, -0.09, 0.28, -0.14),
          makePart(geo.sphere, mFur, 0.1, 0.12, 0.04, 0.09, 0.28, -0.14),
          makePart(geo.box, mEye, 0.04, 0.04, 0.04, -0.06, 0.2, -0.28, false),
          makePart(geo.box, mEye, 0.04, 0.04, 0.04, 0.06, 0.2, -0.28, false)
        );
        const tail = makePart(geo.cyl, mFur, 0.04, 0.38, 0.04, 0, 0.14, 0.42);
        tail.rotation.x = 1.25;
        body.add(tail);
        const baseScale = enemy.isElite || enemy.rank === 'rare' ? 1.15 : 1;
        group.scale.setScalar(baseScale);
        parentGroup.add(group);
        return {
          group,
          body,
          kind: 'quadruped',
          baseScale,
          baseY: 0,
          seen: true,
          flashMats,
          origColors,
        };
      }
      case 'blight_weaver': {
        const group = new THREE.Group();
        const body = new THREE.Group();
        group.add(body);
        const flashMats: THREE.MeshLambertMaterial[] = [];
        const origColors: number[] = [];
        const mBody = makeLambert(0x3b0764, flashMats, origColors);
        const mLeg = makeLambert(0x1e1b4b, flashMats, origColors);
        const mEye = getBasic(0x84cc16);
        body.add(makePart(geo.sphere, mBody, 0.42, 0.34, 0.46, 0, 0.28, 0.14));
        body.add(makePart(geo.sphere, mBody, 0.26, 0.22, 0.26, 0, 0.24, -0.14));
        body.add(
          makePart(geo.box, mEye, 0.05, 0.05, 0.04, -0.07, 0.27, -0.27, false),
          makePart(geo.box, mEye, 0.05, 0.05, 0.04, 0.07, 0.27, -0.27, false)
        );
        for (let s = -1; s <= 1; s += 2) {
          for (let l = 0; l < 3; l++) {
            const leg = makePart(geo.box, mLeg, 0.36, 0.05, 0.05, s * 0.28, 0.22, -0.14 + l * 0.16);
            leg.rotation.z = s * -0.45;
            body.add(leg);
          }
        }
        const baseScale = enemy.isElite || enemy.rank === 'rare' ? 1.15 : 1;
        group.scale.setScalar(baseScale);
        parentGroup.add(group);
        return {
          group,
          body,
          kind: 'spider',
          baseScale,
          baseY: 0,
          seen: true,
          flashMats,
          origColors,
        };
      }
      case 'cinder_wisp':
      case 'dread_wraith': {
        const isCinder = a === 'cinder_wisp';
        const group = new THREE.Group();
        const body = new THREE.Group();
        group.add(body);
        const flashMats: THREE.MeshLambertMaterial[] = [];
        const origColors: number[] = [];
        const mCloak = makeLambert(isCinder ? 0x9a3412 : 0x312e81, flashMats, origColors);
        const mGlow = getBasic(isCinder ? 0xfbbf24 : 0x38bdf8);

        body.add(makePart(geo.oct, mGlow, 0.32, 0.42, 0.32, 0, 0.58, 0, false));
        body.add(makePart(geo.cone, mCloak, 0.38, 0.46, 0.38, 0, 0.32, 0));

        const orbitRing = new THREE.Group();
        orbitRing.position.y = 0.56;
        for (let k = 0; k < 3; k++) {
          const ang = (k * Math.PI * 2) / 3;
          orbitRing.add(
            makePart(
              geo.oct,
              mGlow,
              0.12,
              0.2,
              0.12,
              Math.cos(ang) * 0.28,
              0,
              Math.sin(ang) * 0.28,
              false
            )
          );
        }
        body.add(orbitRing);

        const baseScale = enemy.isElite || enemy.rank === 'rare' ? 1.15 : 1;
        group.scale.setScalar(baseScale);
        parentGroup.add(group);
        return {
          group,
          body,
          orbitRing,
          kind: 'wisp',
          baseScale,
          baseY: 0.14,
          seen: true,
          flashMats,
          origColors,
        };
      }
    }
  };

  const buildNpcInstance = (npc: NpcPlacement): AnimatedEntityInstance => {
    const group = new THREE.Group();
    const body = new THREE.Group();
    group.add(body);
    const flashMats: THREE.MeshLambertMaterial[] = [];
    const origColors: number[] = [];

    const tunicColor = parseHex(npc.color, 0x60a5fa);
    const mSkin = makeLambert(0xf1c29b, flashMats, origColors);
    const mTunic = makeLambert(tunicColor, flashMats, origColors);
    const mDark = makeLambert(0x1e293b, flashMats, origColors);
    const mGold = makeLambert(0xfbbf24, flashMats, origColors);
    const mEye = getBasic(0x0f172a);

    // Boots & Tunic
    const leftLimb = new THREE.Group();
    leftLimb.position.set(-0.08, 0.26, 0);
    leftLimb.add(makePart(geo.box, mDark, 0.1, 0.26, 0.11, 0, -0.13, 0));
    const rightLimb = new THREE.Group();
    rightLimb.position.set(0.08, 0.26, 0);
    rightLimb.add(makePart(geo.box, mDark, 0.1, 0.26, 0.11, 0, -0.13, 0));
    body.add(leftLimb, rightLimb);

    body.add(makePart(geo.box, mTunic, 0.3, 0.36, 0.2, 0, 0.44, 0));
    body.add(makePart(geo.box, mGold, 0.32, 0.05, 0.22, 0, 0.32, 0));

    // Head + Eyes
    body.add(makePart(geo.box, mSkin, 0.22, 0.22, 0.22, 0, 0.74, 0));
    body.add(
      makePart(geo.box, mEye, 0.04, 0.04, 0.03, -0.05, 0.75, -0.11, false),
      makePart(geo.box, mEye, 0.04, 0.04, 0.03, 0.05, 0.75, -0.11, false)
    );

    // Role distinction
    if (npc.id === 'torin') {
      // Blacksmith hood & hammer
      body.add(makePart(geo.box, mDark, 0.24, 0.08, 0.24, 0, 0.87, 0));
      body.add(makePart(geo.box, mDark, 0.05, 0.32, 0.05, 0.22, 0.5, -0.12));
      body.add(makePart(geo.box, mGold, 0.16, 0.1, 0.1, 0.22, 0.66, -0.12));
    } else if (npc.id === 'lyra' || npc.id === 'orin') {
      // Wizard/Archivist pointed hat + orb staff
      body.add(makePart(geo.cone, mTunic, 0.34, 0.26, 0.34, 0, 0.96, 0));
      body.add(makePart(geo.cyl, mDark, 0.04, 0.72, 0.04, 0.22, 0.44, -0.1));
      body.add(makePart(geo.oct, getBasic(0x38bdf8), 0.1, 0.1, 0.1, 0.22, 0.84, -0.1, false));
    } else if (npc.id === 'vex') {
      // Shadow cloak hood
      const hood = makePart(geo.cone, mDark, 0.3, 0.24, 0.3, 0, 0.88, 0.02);
      hood.rotation.x = 0.2;
      body.add(hood);
    } else {
      // Hair / cap
      body.add(makePart(geo.box, mDark, 0.24, 0.09, 0.24, 0, 0.86, 0.01));
    }

    parentGroup.add(group);
    return {
      group,
      body,
      leftLimb,
      rightLimb,
      kind: 'biped',
      baseScale: 1,
      baseY: 0,
      seen: true,
      flashMats,
      origColors,
    };
  };

  const buildCompanionInstance = (comp: CompanionState): AnimatedEntityInstance => {
    const group = new THREE.Group();
    const body = new THREE.Group();
    group.add(body);
    const flashMats: THREE.MeshLambertMaterial[] = [];
    const origColors: number[] = [];

    if (comp.kind === 'starlight_owl') {
      const mFeather = makeLambert(0xe0f2fe, flashMats, origColors);
      const mWing = makeLambert(0x38bdf8, flashMats, origColors);
      const mEye = getBasic(0xfbbf24);
      body.add(makePart(geo.sphere, mFeather, 0.24, 0.32, 0.22, 0, 0.62, 0));
      body.add(
        makePart(geo.box, mEye, 0.04, 0.04, 0.03, -0.05, 0.68, -0.11, false),
        makePart(geo.box, mEye, 0.04, 0.04, 0.03, 0.05, 0.68, -0.11, false)
      );
      const leftWing = new THREE.Group();
      leftWing.position.set(-0.11, 0.64, 0);
      leftWing.add(makePart(geo.box, mWing, 0.32, 0.04, 0.16, -0.16, 0, 0));
      const rightWing = new THREE.Group();
      rightWing.position.set(0.11, 0.64, 0);
      rightWing.add(makePart(geo.box, mWing, 0.32, 0.04, 0.16, 0.16, 0, 0));
      body.add(leftWing, rightWing);
      parentGroup.add(group);
      return {
        group,
        body,
        leftWing,
        rightWing,
        kind: 'flyer',
        baseScale: 1,
        baseY: 0.12,
        seen: true,
        flashMats,
        origColors,
      };
    }

    // Silverwind Lynx
    const mFur = makeLambert(0xcbd5e1, flashMats, origColors);
    const mMane = makeLambert(0x38bdf8, flashMats, origColors);
    const mEye = getBasic(0x38bdf8);
    body.add(makePart(geo.box, mFur, 0.22, 0.2, 0.44, 0, 0.24, 0));
    body.add(makePart(geo.box, mFur, 0.18, 0.18, 0.2, 0, 0.34, -0.22));
    body.add(
      makePart(geo.cone, mMane, 0.06, 0.12, 0.06, -0.07, 0.47, -0.2),
      makePart(geo.cone, mMane, 0.06, 0.12, 0.06, 0.07, 0.47, -0.2),
      makePart(geo.box, mEye, 0.04, 0.04, 0.03, -0.05, 0.36, -0.32, false),
      makePart(geo.box, mEye, 0.04, 0.04, 0.03, 0.05, 0.36, -0.32, false)
    );
    const tail = makePart(geo.cyl, mMane, 0.05, 0.24, 0.05, 0, 0.3, 0.26);
    tail.rotation.x = 0.7;
    body.add(tail);
    const leftLimb = makePart(geo.box, mFur, 0.07, 0.18, 0.07, -0.08, 0.09, -0.14);
    const rightLimb = makePart(geo.box, mFur, 0.07, 0.18, 0.07, 0.08, 0.09, -0.14);
    body.add(
      leftLimb,
      rightLimb,
      makePart(geo.box, mFur, 0.07, 0.18, 0.07, -0.08, 0.09, 0.14),
      makePart(geo.box, mFur, 0.07, 0.18, 0.07, 0.08, 0.09, 0.14)
    );
    parentGroup.add(group);
    return {
      group,
      body,
      leftLimb,
      rightLimb,
      kind: 'quadruped',
      baseScale: 1,
      baseY: 0,
      seen: true,
      flashMats,
      origColors,
    };
  };

  const buildCritterInstance = (critter: CritterState): AnimatedEntityInstance => {
    const group = new THREE.Group();
    const body = new THREE.Group();
    group.add(body);
    const flashMats: THREE.MeshLambertMaterial[] = [];
    const origColors: number[] = [];

    const col = parseHex(critter.color, 0xe2e8f0);
    const mFur = makeLambert(col, flashMats, origColors);

    if (critter.kind === 'cinder_crow' || critter.kind === 'cave_bat') {
      body.add(makePart(geo.sphere, mFur, 0.18, 0.16, 0.22, 0, 0.45, 0));
      const leftWing = makePart(geo.box, mFur, 0.26, 0.03, 0.12, -0.16, 0.46, 0);
      const rightWing = makePart(geo.box, mFur, 0.26, 0.03, 0.12, 0.16, 0.46, 0);
      body.add(leftWing, rightWing);
      parentGroup.add(group);
      return {
        group,
        body,
        leftWing,
        rightWing,
        kind: 'flyer',
        baseScale: 0.9,
        baseY: 0.1,
        seen: true,
        flashMats,
        origColors,
      };
    }

    body.add(makePart(geo.sphere, mFur, 0.2, 0.16, 0.3, 0, 0.1, 0));
    body.add(makePart(geo.sphere, mFur, 0.14, 0.14, 0.14, 0, 0.18, -0.14));
    if (critter.kind === 'vale_rabbit' || critter.kind === 'town_cat') {
      const earH = critter.kind === 'vale_rabbit' ? 0.16 : 0.09;
      body.add(
        makePart(geo.cone, mFur, 0.05, earH, 0.05, -0.05, 0.26, -0.12),
        makePart(geo.cone, mFur, 0.05, earH, 0.05, 0.05, 0.26, -0.12)
      );
    }
    const tail = makePart(geo.cyl, mFur, 0.05, 0.18, 0.05, 0, 0.14, 0.18);
    tail.rotation.x = 0.8;
    body.add(tail);
    parentGroup.add(group);
    return {
      group,
      body,
      kind: 'quadruped',
      baseScale: 0.95,
      baseY: 0,
      seen: true,
      flashMats,
      origColors,
    };
  };

  const buildLootInstance = (drop: GroundLoot): AnimatedEntityInstance => {
    const group = new THREE.Group();
    const body = new THREE.Group();
    group.add(body);
    const flashMats: THREE.MeshLambertMaterial[] = [];
    const origColors: number[] = [];

    if (!drop.item) {
      const mGold = makeLambert(0xfbbf24, flashMats, origColors);
      body.add(
        makePart(geo.cyl, mGold, 0.18, 0.08, 0.18, -0.08, 0.05, 0.04),
        makePart(geo.cyl, mGold, 0.18, 0.12, 0.18, 0.08, 0.07, -0.04)
      );
    } else if (drop.item.category === 'consumable') {
      const isMana = drop.item.consumableKind === 'mana_potion';
      const isBlink = drop.item.consumableKind === 'scroll_blink';
      const hex = isMana ? 0x38bdf8 : isBlink ? 0xc084fc : 0xf43f5e;
      const mPotion = makeLambert(hex, flashMats, origColors);
      const mCork = makeLambert(0xb45309, flashMats, origColors);
      body.add(makePart(geo.oct, mPotion, 0.22, 0.26, 0.22, 0, 0.18, 0));
      body.add(makePart(geo.cyl, mCork, 0.08, 0.1, 0.08, 0, 0.34, 0));
    } else {
      const rarityHex =
        drop.item.rarity === 'Relic'
          ? 0xf59e0b
          : drop.item.rarity === 'Epic'
            ? 0xc084fc
            : drop.item.rarity === 'Rare'
              ? 0x60a5fa
              : 0x34d399;
      const mBlade = makeLambert(rarityHex, flashMats, origColors);
      const mHilt = makeLambert(0xfde68a, flashMats, origColors);
      const blade = makePart(geo.box, mBlade, 0.08, 0.42, 0.04, 0, 0.28, 0);
      blade.rotation.z = 0.25;
      body.add(blade, makePart(geo.box, mHilt, 0.2, 0.05, 0.06, 0, 0.12, 0));
    }

    parentGroup.add(group);
    return {
      group,
      body,
      kind: 'loot',
      baseScale: 1,
      baseY: 0.04,
      seen: true,
      flashMats,
      origColors,
    };
  };

  const turnToward = (inst: AnimatedEntityInstance, wx: number, wz: number, fx: number, fz: number) => {
    const dx = fx - wx;
    const dz = fz - wz;
    if (dx * dx + dz * dz > 0.001) {
      // Model forward is -Z -> yaw angle from -Z toward (dx, dz) = atan2(dx, -dz); rotY = -yaw
      const yaw = Math.atan2(dx, -dz);
      inst.group.rotation.y = -yaw;
    }
  };

  const beginFrame = () => {
    for (const inst of cache.values()) {
      inst.seen = false;
    }
  };

  const placeNpc: Entity3DPool['placeNpc'] = (npc, lit, faceX, faceZ, timeSec) => {
    const key = `npc:${npc.id}`;
    let inst = cache.get(key);
    if (!inst) {
      inst = buildNpcInstance(npc);
      cache.set(key, inst);
    }
    inst.seen = true;
    inst.group.visible = true;
    inst.group.position.set(npc.x, 0.02, npc.y);
    turnToward(inst, npc.x, npc.y, faceX, faceZ);

    const idle = Math.sin(timeSec * 2.1 + npc.x) * 0.025;
    inst.body.position.y = idle + 0.025;

    for (let i = 0; i < inst.flashMats.length; i++) {
      const m = inst.flashMats[i];
      m.color.setHex(inst.origColors[i]);
      if (!lit) m.color.multiplyScalar(0.45);
    }
  };

  const placeEnemy: Entity3DPool['placeEnemy'] = (
    enemy,
    wx,
    wz,
    hopLift,
    faceX,
    faceZ,
    timeSec,
    flashHex
  ) => {
    const key = `en:${enemy.id}`;
    let inst = cache.get(key);
    if (!inst) {
      inst = buildEnemyInstance(enemy);
      cache.set(key, inst);
    }
    inst.seen = true;
    inst.group.visible = true;
    inst.group.position.set(wx, inst.baseY + hopLift + 0.02, wz);
    turnToward(inst, wx, wz, faceX, faceZ);

    const stunned = enemy.statuses.some((st) => st.kind === 'stunned');
    const phase = enemy.x * 0.7 + enemy.y * 1.1;
    const isHopping = hopLift > 0.02;

    if (!stunned) {
      if (inst.kind === 'wisp') {
        inst.body.position.y = Math.sin(timeSec * 3.4 + phase) * 0.08;
        if (inst.orbitRing) inst.orbitRing.rotation.y = timeSec * 2.5 + phase;
      } else if (inst.kind === 'biped') {
        const walkAmp = isHopping ? 0.55 : 0.08;
        const w = Math.sin(timeSec * (isHopping ? 12 : 2.6) + phase) * walkAmp;
        if (inst.leftLimb) inst.leftLimb.rotation.x = w;
        if (inst.rightLimb) inst.rightLimb.rotation.x = -w;
        if (inst.orbitRing) inst.orbitRing.rotation.y = timeSec * 2.2;
      } else {
        inst.body.position.y = Math.abs(Math.sin(timeSec * 3 + phase)) * 0.03;
      }
    }

    for (let i = 0; i < inst.flashMats.length; i++) {
      const m = inst.flashMats[i];
      if (flashHex !== null) {
        m.color.setHex(flashHex);
      } else {
        m.color.setHex(inst.origColors[i]);
        if (stunned) m.color.multiplyScalar(0.65);
      }
    }
  };

  const placeCompanion: Entity3DPool['placeCompanion'] = (
    comp,
    wx,
    wz,
    hopLift,
    faceX,
    faceZ,
    timeSec
  ) => {
    const key = `comp:${comp.kind}`;
    let inst = cache.get(key);
    if (!inst) {
      inst = buildCompanionInstance(comp);
      cache.set(key, inst);
    }
    inst.seen = true;
    inst.group.visible = true;
    inst.group.position.set(wx, inst.baseY + hopLift + 0.02, wz);
    turnToward(inst, wx, wz, faceX, faceZ);

    if (inst.kind === 'flyer') {
      inst.body.position.y = Math.sin(timeSec * 4) * 0.07;
      const flap = Math.sin(timeSec * 9) * 0.45;
      if (inst.leftWing) inst.leftWing.rotation.z = flap;
      if (inst.rightWing) inst.rightWing.rotation.z = -flap;
    } else {
      const step = hopLift > 0.02 ? Math.sin(timeSec * 14) * 0.4 : 0;
      if (inst.leftLimb) inst.leftLimb.rotation.x = step;
      if (inst.rightLimb) inst.rightLimb.rotation.x = -step;
    }
  };

  const placeCritter: Entity3DPool['placeCritter'] = (critter, timeSec) => {
    const key = `cr:${critter.id}`;
    let inst = cache.get(key);
    if (!inst) {
      inst = buildCritterInstance(critter);
      cache.set(key, inst);
    }
    inst.seen = true;
    inst.group.visible = true;
    inst.group.position.set(critter.x, inst.baseY + 0.02, critter.y);
    inst.group.rotation.y = Math.sin(timeSec * 0.6 + critter.x) * 0.9;
    if (inst.kind === 'flyer') {
      const flap = Math.sin(timeSec * 11 + critter.y) * 0.5;
      if (inst.leftWing) inst.leftWing.rotation.z = flap;
      if (inst.rightWing) inst.rightWing.rotation.z = -flap;
    } else {
      inst.body.position.y = Math.abs(Math.sin(timeSec * 3.5 + critter.x)) * 0.03;
    }
  };

  const placeLoot: Entity3DPool['placeLoot'] = (drop, timeSec) => {
    const key = `loot:${drop.id}`;
    let inst = cache.get(key);
    if (!inst) {
      inst = buildLootInstance(drop);
      cache.set(key, inst);
    }
    inst.seen = true;
    inst.group.visible = true;
    inst.group.position.set(drop.x, inst.baseY, drop.y);
    inst.body.rotation.y = timeSec * 1.8 + drop.x;
    inst.body.position.y = Math.sin(timeSec * 3 + drop.y) * 0.04 + 0.04;
  };

  const endFrame = () => {
    for (const [key, inst] of cache.entries()) {
      if (!inst.seen) {
        inst.group.visible = false;
        if (cache.size > 120) {
          parentGroup.remove(inst.group);
          inst.flashMats.forEach((m) => m.dispose());
          cache.delete(key);
        }
      }
    }
  };

  const dispose = () => {
    for (const inst of cache.values()) {
      parentGroup.remove(inst.group);
      inst.flashMats.forEach((m) => m.dispose());
    }
    cache.clear();
    sharedGeos.forEach((g) => g.dispose());
    sharedMats.forEach((m) => m.dispose());
    sharedMats.clear();
  };

  return {
    beginFrame,
    placeNpc,
    placeEnemy,
    placeCompanion,
    placeCritter,
    placeLoot,
    endFrame,
    dispose,
  };
}
