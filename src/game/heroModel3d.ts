import * as THREE from 'three';
import type { Item, PlayerState } from './types';

export interface HeroModel3D {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  capePivot: THREE.Group;
  updateAppearance: (player: PlayerState) => void;
  animate: (
    timeSec: number,
    isMoving: boolean,
    stepProgress: number,
    attackPulse: number
  ) => void;
  dispose: () => void;
}

function getItemTintHex(item: Item | null | undefined, fallback: number): number {
  if (!item) return fallback;
  if (item.setId === 'cinderforged') return 0xea580c;
  if (item.setId === 'thornbound') return 0x16a34a;
  if (item.setId === 'rimebound') return 0x38bdf8;
  if (item.setId === 'starlight_outrider') return 0xfbbf24;
  switch (item.rarity) {
    case 'Relic':
      return 0xf59e0b;
    case 'Epic':
      return 0xc084fc;
    case 'Rare':
      return 0x60a5fa;
    case 'Uncommon':
      return 0x34d399;
    default:
      return fallback;
  }
}

export function createHeroModel3D(): HeroModel3D {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    mats.push(m);
    return m;
  };

  // Materials (recolored dynamically via updateAppearance)
  const skinMat = trackMat(new THREE.MeshLambertMaterial({ color: 0xf1c29b }));
  const hairMat = trackMat(new THREE.MeshLambertMaterial({ color: 0xf5d061 }));
  const bootMat = trackMat(new THREE.MeshLambertMaterial({ color: 0x3b261a }));
  const armorMat = trackMat(new THREE.MeshLambertMaterial({ color: 0xb91c1c }));
  const trimMat = trackMat(new THREE.MeshLambertMaterial({ color: 0xd97706 }));
  const capeMat = trackMat(new THREE.MeshLambertMaterial({ color: 0x7f1d1d, side: THREE.DoubleSide }));
  const helmMat = trackMat(new THREE.MeshLambertMaterial({ color: 0x94a3b8 }));
  const weaponBladeMat = trackMat(new THREE.MeshLambertMaterial({ color: 0xe2e8f0, emissive: 0x1e293b }));
  const shieldMat = trackMat(new THREE.MeshLambertMaterial({ color: 0x1e3a8a }));
  const orbMat = trackMat(new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));

  const makeShadowMesh = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  // Legs (hip pivot at y = 0.34)
  const legGeo = trackGeo(new THREE.BoxGeometry(0.11, 0.24, 0.12));
  const bootGeo = trackGeo(new THREE.BoxGeometry(0.12, 0.11, 0.15));

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.08, 0.34, 0);
  const lLegMesh = makeShadowMesh(legGeo, bootMat);
  lLegMesh.position.y = -0.12;
  const lBoot = makeShadowMesh(bootGeo, bootMat);
  lBoot.position.set(0, -0.28, -0.02);
  leftLeg.add(lLegMesh, lBoot);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.08, 0.34, 0);
  const rLegMesh = makeShadowMesh(legGeo, bootMat);
  rLegMesh.position.y = -0.12;
  const rBoot = makeShadowMesh(bootGeo, bootMat);
  rBoot.position.set(0, -0.28, -0.02);
  rightLeg.add(rLegMesh, rBoot);

  bodyGroup.add(leftLeg, rightLeg);

  // Torso & Pauldrons
  const torso = makeShadowMesh(trackGeo(new THREE.BoxGeometry(0.3, 0.34, 0.2)), armorMat);
  torso.position.y = 0.51;
  const belt = makeShadowMesh(trackGeo(new THREE.BoxGeometry(0.32, 0.06, 0.22)), trimMat);
  belt.position.y = 0.36;
  const buckle = makeShadowMesh(trackGeo(new THREE.BoxGeometry(0.08, 0.06, 0.04)), trimMat);
  buckle.position.set(0, 0.36, -0.11);

  const lPauldron = makeShadowMesh(trackGeo(new THREE.BoxGeometry(0.13, 0.1, 0.22)), trimMat);
  lPauldron.position.set(-0.2, 0.64, 0);
  const rPauldron = makeShadowMesh(trackGeo(new THREE.BoxGeometry(0.13, 0.1, 0.22)), trimMat);
  rPauldron.position.set(0.2, 0.64, 0);

  bodyGroup.add(torso, belt, buckle, lPauldron, rPauldron);

  // Flowing Cape (pivot behind upper back at z = +0.11)
  const capePivot = new THREE.Group();
  capePivot.position.set(0, 0.66, 0.11);
  const capeMesh = makeShadowMesh(trackGeo(new THREE.BoxGeometry(0.3, 0.52, 0.03)), capeMat);
  capeMesh.position.set(0, -0.26, 0.03);
  capePivot.add(capeMesh);
  bodyGroup.add(capePivot);

  // Head + Elven Ears + Helm
  const headGroup = new THREE.Group();
  headGroup.position.y = 0.79;
  const headMesh = makeShadowMesh(trackGeo(new THREE.BoxGeometry(0.22, 0.22, 0.22)), skinMat);
  const hairBack = makeShadowMesh(trackGeo(new THREE.BoxGeometry(0.24, 0.18, 0.1)), hairMat);
  hairBack.position.set(0, 0.02, 0.08);
  const hairTop = makeShadowMesh(trackGeo(new THREE.BoxGeometry(0.24, 0.07, 0.24)), hairMat);
  hairTop.position.set(0, 0.1, 0.01);

  const earGeo = trackGeo(new THREE.ConeGeometry(0.035, 0.12, 4));
  const lEar = makeShadowMesh(earGeo, skinMat);
  lEar.position.set(-0.14, 0.01, 0);
  lEar.rotation.z = 1.15;
  const rEar = makeShadowMesh(earGeo, skinMat);
  rEar.position.set(0.14, 0.01, 0);
  rEar.rotation.z = -1.15;

  const helmCap = makeShadowMesh(trackGeo(new THREE.BoxGeometry(0.26, 0.1, 0.26)), helmMat);
  helmCap.position.y = 0.11;
  const helmCrest = makeShadowMesh(trackGeo(new THREE.BoxGeometry(0.06, 0.09, 0.24)), trimMat);
  helmCrest.position.set(0, 0.18, 0.02);

  headGroup.add(headMesh, hairBack, hairTop, lEar, rEar, helmCap, helmCrest);

  // Eyes (front is -Z, same convention as NPCs/enemies)
  const eyeMat = trackMat(new THREE.MeshBasicMaterial({ color: 0x0f172a }));
  const eyeGeo = trackGeo(new THREE.BoxGeometry(0.035, 0.045, 0.02));
  const lEye = new THREE.Mesh(eyeGeo, eyeMat);
  lEye.position.set(-0.05, 0.01, -0.115);
  const rEye = new THREE.Mesh(eyeGeo, eyeMat);
  rEye.position.set(0.05, 0.01, -0.115);
  headGroup.add(lEye, rEye);
  bodyGroup.add(headGroup);

  // Arms
  const armGeo = trackGeo(new THREE.BoxGeometry(0.095, 0.26, 0.1));

  // Left Arm + Shield / Focus
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.21, 0.62, 0);
  const lArmMesh = makeShadowMesh(armGeo, armorMat);
  lArmMesh.position.y = -0.11;
  leftArm.add(lArmMesh);
  const handGeo = trackGeo(new THREE.BoxGeometry(0.08, 0.08, 0.09));
  const lHand = makeShadowMesh(handGeo, skinMat);
  lHand.position.y = -0.27;
  leftArm.add(lHand);

  const shieldGroup = new THREE.Group();
  shieldGroup.position.set(-0.07, -0.14, -0.06);
  shieldGroup.rotation.y = Math.PI / 6;
  const shieldFace = makeShadowMesh(trackGeo(new THREE.BoxGeometry(0.05, 0.28, 0.24)), shieldMat);
  const shieldRim = makeShadowMesh(trackGeo(new THREE.BoxGeometry(0.06, 0.1, 0.1)), trimMat);
  shieldGroup.add(shieldFace, shieldRim);
  leftArm.add(shieldGroup);

  const offhandDagger = makeShadowMesh(trackGeo(new THREE.BoxGeometry(0.04, 0.04, 0.28)), weaponBladeMat);
  offhandDagger.position.set(0, -0.22, -0.15);
  offhandDagger.visible = false;
  leftArm.add(offhandDagger);

  // Right Arm + Main Weapon
  const rightArm = new THREE.Group();
  rightArm.position.set(0.21, 0.62, 0);
  const rArmMesh = makeShadowMesh(armGeo, armorMat);
  rArmMesh.position.y = -0.11;
  rightArm.add(rArmMesh);
  const rHand = makeShadowMesh(handGeo, skinMat);
  rHand.position.y = -0.27;
  rightArm.add(rHand);

  // Sword mesh
  const swordGroup = new THREE.Group();
  swordGroup.position.set(0, -0.22, -0.08);
  swordGroup.rotation.x = -0.35;
  const hilt = makeShadowMesh(trackGeo(new THREE.BoxGeometry(0.16, 0.04, 0.04)), trimMat);
  const blade = makeShadowMesh(trackGeo(new THREE.BoxGeometry(0.05, 0.48, 0.03)), weaponBladeMat);
  blade.position.y = 0.25;
  swordGroup.add(hilt, blade);
  rightArm.add(swordGroup);

  // Staff mesh
  const staffGroup = new THREE.Group();
  staffGroup.position.set(0, -0.22, -0.08);
  staffGroup.rotation.x = -0.15;
  const shaft = makeShadowMesh(trackGeo(new THREE.CylinderGeometry(0.025, 0.03, 0.72, 6)), bootMat);
  shaft.position.y = 0.14;
  const staffOrb = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.075, 0)), orbMat);
  staffOrb.position.y = 0.54;
  staffGroup.add(shaft, staffOrb);
  staffGroup.visible = false;
  rightArm.add(staffGroup);

  bodyGroup.add(leftArm, rightArm);

  let lastSig = '';

  const updateAppearance = (player: PlayerState) => {
    const cls = player.starterClass;
    const wpn = player.equipped.weapon;
    const arm = player.equipped.armor;
    const hlm = player.equipped.helm;
    const sig = `${cls}|${wpn?.id ?? ''}|${arm?.id ?? ''}|${hlm?.id ?? ''}|${wpn?.rarity ?? ''}|${arm?.rarity ?? ''}`;
    if (sig === lastSig) return;
    lastSig = sig;

    const defaultArmor =
      cls === 'Runecaster'
        ? 0x2563eb
        : cls === 'Shadowcraft'
          ? 0x1e293b
          : cls === 'Wanderer'
            ? 0x15803d
            : 0xb91c1c;
    const defaultCape =
      cls === 'Runecaster'
        ? 0x1e3a8a
        : cls === 'Shadowcraft'
          ? 0x14532d
          : cls === 'Wanderer'
            ? 0x166534
            : 0x7f1d1d;
    const defaultTrim =
      cls === 'Runecaster'
        ? 0x93c5fd
        : cls === 'Shadowcraft' || cls === 'Wanderer'
          ? 0x34d399
          : 0xf59e0b;

    armorMat.color.setHex(getItemTintHex(arm, defaultArmor));
    capeMat.color.setHex(defaultCape);
    trimMat.color.setHex(defaultTrim);
    helmMat.color.setHex(getItemTintHex(hlm, defaultArmor));
    helmCap.visible = Boolean(hlm) || cls !== 'Runecaster';
    helmCrest.visible = Boolean(hlm) || cls === 'Vanguard';

    const wName = (wpn?.name ?? '').toLowerCase();
    const isStaff = cls === 'Runecaster' || wName.includes('staff') || wName.includes('wand');
    const isDagger = cls === 'Shadowcraft' || wName.includes('dagger') || wName.includes('dirk');

    swordGroup.visible = !isStaff;
    staffGroup.visible = isStaff;
    shieldGroup.visible = cls === 'Vanguard' || cls === 'Wanderer' || (!isStaff && !isDagger);
    offhandDagger.visible = isDagger;

    weaponBladeMat.color.setHex(getItemTintHex(wpn, 0xe2e8f0));
    orbMat.color.setHex(getItemTintHex(wpn, 0x38bdf8));
    shieldMat.color.setHex(defaultArmor);
  };

  const animate = (
    timeSec: number,
    isMoving: boolean,
    stepProgress: number,
    attackPulse: number
  ) => {
    if (isMoving) {
      const stride = Math.sin(stepProgress * Math.PI * 2);
      leftLeg.rotation.x = stride * 0.65;
      rightLeg.rotation.x = -stride * 0.65;
      leftArm.rotation.x = -stride * 0.45;
      rightArm.rotation.x = stride * 0.45 - attackPulse * 1.4;
      bodyGroup.position.y = Math.abs(Math.sin(stepProgress * Math.PI)) * 0.14;
      capePivot.rotation.x = 0.25 + Math.sin(stepProgress * Math.PI) * 0.3;
    } else {
      const idle = Math.sin(timeSec * 2.4);
      leftLeg.rotation.x = 0;
      rightLeg.rotation.x = 0;
      leftArm.rotation.x = idle * 0.04;
      rightArm.rotation.x = -idle * 0.04 - attackPulse * 1.5;
      bodyGroup.position.y = (idle + 1) * 0.015;
      capePivot.rotation.x = 0.1 + idle * 0.05;
    }
    staffOrb.rotation.y = timeSec * 2.2;
  };

  const dispose = () => {
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => m.dispose());
  };

  return {
    root,
    bodyGroup,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    capePivot,
    updateAppearance,
    animate,
    dispose,
  };
}
