import * as THREE from 'three';
import {
  BiomeId,
  getAnimatedFluidTile,
  getAnimatedHazardTile,
  getBiomePalette,
  getSpecialStructureCanvas,
} from './tileset';

export interface BiomeAtmosphere {
  bgHex: number;
  fogHex: number;
  fogDensity: number;
  skyHex: number;
  groundHex: number;
  hemiIntensity: number;
  dirHex: number;
  dirIntensity: number;
  playerLightHex: number;
  foliagePrimary: number;
  foliageSecondary: number;
  trunkHex: number;
  moteCss: string;
}

const BIOME_ATMOSPHERE: Record<BiomeId, BiomeAtmosphere> = {
  oakhaven: {
    bgHex: 0x0b1017,
    fogHex: 0x0b1017,
    fogDensity: 0.022,
    skyHex: 0xdbeafe,
    groundHex: 0x2d4a3e,
    hemiIntensity: 1.25,
    dirHex: 0xfff1d0,
    dirIntensity: 1.45,
    playerLightHex: 0xffb347,
    foliagePrimary: 0x2d6a4f,
    foliageSecondary: 0x52b788,
    trunkHex: 0x6b4423,
    moteCss: 'rgba(110, 231, 183, 0.42)',
  },
  overworld: {
    bgHex: 0x08110d,
    fogHex: 0x08110d,
    fogDensity: 0.02,
    skyHex: 0xd1fae5,
    groundHex: 0x224231,
    hemiIntensity: 1.3,
    dirHex: 0xfef3c7,
    dirIntensity: 1.5,
    playerLightHex: 0xfbbf24,
    foliagePrimary: 0x1b6b43,
    foliageSecondary: 0x40b878,
    trunkHex: 0x5e3b1e,
    moteCss: 'rgba(134, 239, 172, 0.42)',
  },
  thornwick: {
    bgHex: 0x081212,
    fogHex: 0x081212,
    fogDensity: 0.026,
    skyHex: 0x99f6e4,
    groundHex: 0x1b3632,
    hemiIntensity: 1.15,
    dirHex: 0xccfbf1,
    dirIntensity: 1.25,
    playerLightHex: 0x2dd4bf,
    foliagePrimary: 0x0f766e,
    foliageSecondary: 0x14b8a6,
    trunkHex: 0x4b382a,
    moteCss: 'rgba(45, 212, 191, 0.40)',
  },
  cinderwatch: {
    bgHex: 0x120c0e,
    fogHex: 0x120c0e,
    fogDensity: 0.024,
    skyHex: 0xfed7aa,
    groundHex: 0x3a241e,
    hemiIntensity: 1.15,
    dirHex: 0xffedd5,
    dirIntensity: 1.35,
    playerLightHex: 0xfb923c,
    foliagePrimary: 0x9a3412,
    foliageSecondary: 0xea580c,
    trunkHex: 0x3b2f2f,
    moteCss: 'rgba(251, 146, 60, 0.45)',
  },
  highspire: {
    bgHex: 0x0e1019,
    fogHex: 0x0e1019,
    fogDensity: 0.02,
    skyHex: 0xfef08a,
    groundHex: 0x31364d,
    hemiIntensity: 1.32,
    dirHex: 0xfef9c3,
    dirIntensity: 1.5,
    playerLightHex: 0xfde047,
    foliagePrimary: 0xa16207,
    foliageSecondary: 0xeab308,
    trunkHex: 0x645e58,
    moteCss: 'rgba(253, 224, 71, 0.36)',
  },
  reliquary: {
    bgHex: 0x090c13,
    fogHex: 0x090c13,
    fogDensity: 0.032,
    skyHex: 0x93c5fd,
    groundHex: 0x1f283d,
    hemiIntensity: 0.95,
    dirHex: 0xdbeafe,
    dirIntensity: 1.15,
    playerLightHex: 0xffb347,
    foliagePrimary: 0x334155,
    foliageSecondary: 0x475569,
    trunkHex: 0x3f3f46,
    moteCss: 'rgba(148, 163, 184, 0.32)',
  },
  ossuary: {
    bgHex: 0x090e12,
    fogHex: 0x090e12,
    fogDensity: 0.034,
    skyHex: 0x99f6e4,
    groundHex: 0x1d2d33,
    hemiIntensity: 0.9,
    dirHex: 0xccfbf1,
    dirIntensity: 1.1,
    playerLightHex: 0xffb347,
    foliagePrimary: 0x1e3a3a,
    foliageSecondary: 0x2d5a5a,
    trunkHex: 0x334155,
    moteCss: 'rgba(94, 234, 212, 0.32)',
  },
  ember: {
    bgHex: 0x130908,
    fogHex: 0x130908,
    fogDensity: 0.032,
    skyHex: 0xfdba74,
    groundHex: 0x381913,
    hemiIntensity: 0.95,
    dirHex: 0xffedd5,
    dirIntensity: 1.15,
    playerLightHex: 0xf97316,
    foliagePrimary: 0x7c2d12,
    foliageSecondary: 0x9a3412,
    trunkHex: 0x292524,
    moteCss: 'rgba(251, 146, 60, 0.42)',
  },
  crucible: {
    bgHex: 0x0d0912,
    fogHex: 0x0d0912,
    fogDensity: 0.032,
    skyHex: 0xfca5a5,
    groundHex: 0x2e1b29,
    hemiIntensity: 0.92,
    dirHex: 0xfee2e2,
    dirIntensity: 1.15,
    playerLightHex: 0xfb923c,
    foliagePrimary: 0x4c1d95,
    foliageSecondary: 0x6d28d9,
    trunkHex: 0x1e1b4b,
    moteCss: 'rgba(251, 146, 60, 0.40)',
  },
  abyss: {
    bgHex: 0x080510,
    fogHex: 0x080510,
    fogDensity: 0.034,
    skyHex: 0xd8b4fe,
    groundHex: 0x261542,
    hemiIntensity: 0.92,
    dirHex: 0xf3e8ff,
    dirIntensity: 1.12,
    playerLightHex: 0xc084fc,
    foliagePrimary: 0x581c87,
    foliageSecondary: 0x7e22ce,
    trunkHex: 0x1e1b4b,
    moteCss: 'rgba(192, 132, 252, 0.42)',
  },
};

export function getBiomeAtmosphere(biome: BiomeId): BiomeAtmosphere {
  return BIOME_ATMOSPHERE[biome];
}

const canvasTextureCache = new Map<string, THREE.CanvasTexture>();

export function textureFromCanvas(
  key: string,
  canvas: HTMLCanvasElement,
  flipX = false
): THREE.CanvasTexture {
  const fullKey = flipX ? `${key}:flipX` : key;
  const existing = canvasTextureCache.get(fullKey);
  if (existing) return existing;

  let source = canvas;
  if (flipX) {
    const flipped = document.createElement('canvas');
    flipped.width = canvas.width;
    flipped.height = canvas.height;
    const fctx = flipped.getContext('2d');
    if (fctx) {
      fctx.translate(canvas.width, 0);
      fctx.scale(-1, 1);
      fctx.drawImage(canvas, 0, 0);
    }
    source = flipped;
  }

  const tex = new THREE.CanvasTexture(source);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  canvasTextureCache.set(fullKey, tex);
  return tex;
}

function brightenHex(hex: string, factor: number): string {
  const c = new THREE.Color(hex);
  c.multiplyScalar(factor);
  return `#${c.getHexString()}`;
}

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return [c, c.getContext('2d')];
}

/**
 * Rich, lit-calibrated 64x64 procedural 3D floor tile textures with crisp
 * stone bevels, mortar joints, grass tufts, and subtle rune/pebble accents.
 */
export function getFloorTexture(
  biome: BiomeId,
  variant: number,
  isVault = false
): THREE.CanvasTexture {
  const v = variant % 8;
  const key = `isoFloor:${biome}:${v}:${isVault ? 1 : 0}`;
  const cached = canvasTextureCache.get(key);
  if (cached) return cached;

  const p = getBiomePalette(biome);
  const s = 64;
  const [canvas, ctx] = makeCanvas(s);
  if (ctx) {
    // Lift brightness ~2.1x over 2D flat palette so 3D Lambert shading reads richly
    const base = isVault ? '#3b2d22' : brightenHex(p.floorBase, 2.2);
    const slabA = isVault ? '#4f3c2d' : brightenHex(p.floorSlabA, 2.25);
    const slabB = isVault ? '#463527' : brightenHex(p.floorSlabB, 2.2);
    const slabC = isVault ? '#594433' : brightenHex(p.floorSlabC, 2.3);
    const mortar = isVault ? '#261b14' : brightenHex(p.floorMortar, 1.8);

    ctx.fillStyle = mortar;
    ctx.fillRect(0, 0, s, s);

    // 2x2 flagstone grid with bevel highlights
    const slabs = [
      { x: 2, y: 2, w: 29, h: 29, c: v % 2 === 0 ? slabA : slabB },
      { x: 33, y: 2, w: 29, h: 29, c: v % 3 === 0 ? slabC : slabA },
      { x: 2, y: 33, w: 29, h: 29, c: v % 3 === 1 ? slabC : slabB },
      { x: 33, y: 33, w: 29, h: 29, c: v % 2 === 1 ? slabA : slabC },
    ];

    for (let i = 0; i < slabs.length; i++) {
      const sl = slabs[i];
      ctx.fillStyle = sl.c;
      ctx.fillRect(sl.x, sl.y, sl.w, sl.h);
      // Top & left crisp bevel highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.11)';
      ctx.fillRect(sl.x, sl.y, sl.w, 2);
      ctx.fillRect(sl.x, sl.y, 2, sl.h);
      // Bottom & right shadow edge
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fillRect(sl.x, sl.y + sl.h - 2, sl.w, 2);
      ctx.fillRect(sl.x + sl.w - 2, sl.y, 2, sl.h);
    }

    // Surface micro-grain speckles
    ctx.fillStyle = base;
    for (let i = 0; i < 10; i++) {
      const gx = ((v * 19 + i * 23) % 52) + 6;
      const gy = ((v * 31 + i * 17) % 52) + 6;
      ctx.fillRect(gx, gy, 2, 2);
    }

    // Biome moss / leaf / gold fleck details
    if (v === 1 || v === 5) {
      ctx.fillStyle = p.floorDetailA;
      ctx.fillRect(28, 28, 6, 4);
      ctx.fillRect(30, 26, 3, 2);
    } else if (v === 2 || v === 6) {
      ctx.fillStyle = p.floorDetailB;
      ctx.fillRect(10, 44, 5, 3);
      ctx.fillRect(46, 14, 4, 3);
    } else if (v === 3 || isVault) {
      ctx.fillStyle = isVault ? '#f59e0b' : p.floorDetailC;
      ctx.globalAlpha = isVault ? 0.65 : 0.45;
      ctx.fillRect(18, 18, 3, 3);
      ctx.fillRect(44, 42, 3, 2);
      ctx.globalAlpha = 1;
    }
  }

  return textureFromCanvas(key, canvas);
}

/**
 * Rich, warm cobblestone road texture calibrated for 3D lighting.
 */
export function getRoadTexture(biome: BiomeId, variant: number): THREE.CanvasTexture {
  const v = variant % 6;
  const key = `isoRoad:${biome}:${v}`;
  const cached = canvasTextureCache.get(key);
  if (cached) return cached;

  const p = getBiomePalette(biome);
  const s = 64;
  const [canvas, ctx] = makeCanvas(s);
  if (ctx) {
    ctx.fillStyle = brightenHex(p.roadBase, 1.95);
    ctx.fillRect(0, 0, s, s);

    const stones = [
      { x: 3, y: 3, w: 24, h: 16, c: brightenHex(p.roadStoneA, 1.85) },
      { x: 30, y: 3, w: 31, h: 16, c: brightenHex(p.roadStoneB, 1.85) },
      { x: 3, y: 22, w: 17, h: 17, c: brightenHex(p.roadStoneC, 1.85) },
      { x: 23, y: 22, w: 22, h: 17, c: brightenHex(p.roadStoneA, 1.9) },
      { x: 48, y: 22, w: 13, h: 17, c: brightenHex(p.roadStoneB, 1.8) },
      { x: 3, y: 42, w: 29, h: 19, c: brightenHex(p.roadStoneB, 1.85) },
      { x: 35, y: 42, w: 26, h: 19, c: brightenHex(p.roadStoneC, 1.85) },
    ];

    for (let i = 0; i < stones.length; i++) {
      const st = stones[(i + v) % stones.length];
      const sx = stones[i].x;
      const sy = stones[i].y;
      const sw = stones[i].w;
      const sh = stones[i].h;
      ctx.fillStyle = st.c;
      ctx.fillRect(sx, sy, sw, sh);
      ctx.fillStyle = 'rgba(255, 240, 200, 0.16)';
      ctx.fillRect(sx + 1, sy, sw - 2, 2);
      ctx.fillRect(sx, sy + 1, 2, sh - 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(sx, sy + sh - 2, sw, 2);
    }

    if (v === 2 || v === 4) {
      ctx.fillStyle = p.floorDetailA;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(26, 18, 4, 4);
      ctx.fillRect(42, 39, 5, 3);
      ctx.globalAlpha = 1;
    }
  }

  return textureFromCanvas(key, canvas);
}

/**
 * Crisp 3D top cap stone texture for extruded walls.
 */
export function getWallTopTexture(biome: BiomeId, variant: number): THREE.CanvasTexture {
  const v = variant % 6;
  const key = `isoWallTop:${biome}:${v}`;
  const cached = canvasTextureCache.get(key);
  if (cached) return cached;

  const p = getBiomePalette(biome);
  const s = 64;
  const [canvas, ctx] = makeCanvas(s);
  if (ctx) {
    ctx.fillStyle = brightenHex(p.wallTop, 1.45);
    ctx.fillRect(0, 0, s, s);

    // Outer bevel frame
    ctx.fillStyle = brightenHex(p.wallHighlight, 1.35);
    ctx.fillRect(0, 0, s, 4);
    ctx.fillRect(0, 0, 4, s);
    ctx.fillStyle = brightenHex(p.wallTopDark, 1.3);
    ctx.fillRect(0, s - 4, s, 4);
    ctx.fillRect(s - 4, 0, 4, s);

    // Inner stone block seams
    ctx.fillStyle = p.wallMortar;
    ctx.fillRect(4, 31, s - 8, 2);
    ctx.fillRect(v % 2 === 0 ? 28 : 36, 4, 2, 27);
    ctx.fillRect(v % 2 === 0 ? 38 : 24, 33, 2, 27);

    // Slight tonal variation
    ctx.fillStyle = brightenHex(p.wallTopAlt, 1.4);
    ctx.fillRect(6, 6, 20, 22);
    if (v === 1 || v === 4) {
      ctx.fillStyle = p.wallAccentSoft;
      ctx.fillRect(10, 40, 12, 6);
    }
  }

  return textureFromCanvas(key, canvas);
}

/**
 * Procedural 3D masonry/timber vertical wall face texture tuned to the biome palette.
 */
export function getWallSideTexture(
  biome: BiomeId,
  variant: number,
  shade: 'light' | 'dark'
): THREE.CanvasTexture {
  const v = variant % 4;
  const key = `isoWallSide:${biome}:${v}:${shade}`;
  const cached = canvasTextureCache.get(key);
  if (cached) return cached;

  const p = getBiomePalette(biome);
  const s = 64;
  const [canvas, ctx] = makeCanvas(s);
  if (ctx) {
    ctx.fillStyle = p.wallMortar;
    ctx.fillRect(0, 0, s, s);

    const rows = 4;
    const rowH = Math.floor(s / rows);
    const brickA = brightenHex(p.wallFace, 1.5);
    const brickB = brightenHex(p.wallFaceAlt, 1.55);
    const brickHi = brightenHex(p.wallHighlight, 1.45);

    for (let r = 0; r < rows; r++) {
      const y = r * rowH;
      const offset = (r + v) % 2 === 0 ? 0 : 16;
      for (let bx = -offset; bx < s; bx += 32) {
        const x = Math.max(0, bx + 2);
        const w = Math.min(s - x, bx + 30 - x);
        if (w <= 2) continue;
        ctx.fillStyle = (r + bx + v) % 3 === 0 ? brickB : brickA;
        ctx.fillRect(x, y + 2, w, rowH - 3);
        ctx.fillStyle = brickHi;
        ctx.globalAlpha = 0.32;
        ctx.fillRect(x, y + 2, w, 2);
        ctx.globalAlpha = 1;
      }
    }

    // Moss / rune / ember vein accents
    if (v === 1) {
      ctx.fillStyle = p.wallAccentSoft;
      ctx.fillRect(10, 18, 14, 5);
      ctx.fillStyle = p.wallAccent;
      ctx.fillRect(13, 18, 7, 3);
    } else if (v === 3) {
      ctx.fillStyle = p.wallAccentSoft;
      ctx.fillRect(36, 36, 12, 5);
    }

    // Top cornice highlight + bottom ambient occlusion shadow
    ctx.fillStyle = brightenHex(p.wallTop, 1.35);
    ctx.fillRect(0, 0, s, 5);
    const grad = ctx.createLinearGradient(0, s - 16, 0, s);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.58)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, s - 16, s, 16);

    if (shade === 'dark') {
      ctx.fillStyle = 'rgba(6, 10, 18, 0.24)';
      ctx.fillRect(0, 0, s, s);
    }
  }

  return textureFromCanvas(key, canvas);
}

/**
 * 2x upscaled pixel sprite texture with crisp 1px dark rim outline for HD-2D pop.
 */
export function getOutlinedSpriteTexture(
  key: string,
  srcCanvas: HTMLCanvasElement,
  flipX = false
): THREE.CanvasTexture {
  const fullKey = `hd2d:${key}:${flipX ? 'f' : 'n'}`;
  const existing = canvasTextureCache.get(fullKey);
  if (existing) return existing;

  const w = srcCanvas.width;
  const h = srcCanvas.height;
  const pad = 2;
  const out = document.createElement('canvas');
  out.width = w * 2 + pad * 2;
  out.height = h * 2 + pad * 2;
  const ctx = out.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    if (flipX) {
      ctx.translate(out.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(srcCanvas, pad, pad, w * 2, h * 2);
    ctx.restore();
  }

  return textureFromCanvas(fullKey, out, false);
}

export function getFluidTexture(
  kind: 'water' | 'fountain' | 'chasm',
  frame: number
): THREE.CanvasTexture {
  const f = frame % 6;
  const c = getAnimatedFluidTile(kind, 36, f);
  return textureFromCanvas(`fluid:${kind}:${f}`, c);
}

export function getHazardTexture(
  kind: 'spore_pool' | 'frost_vent' | 'ember_crust' | 'shock_rune',
  frame: number,
  used: boolean
): THREE.CanvasTexture {
  const f = frame % 4;
  const c = getAnimatedHazardTile(kind, 36, f, used);
  return textureFromCanvas(`hazard:${kind}:${f}:${used ? 1 : 0}`, c);
}

export function getStructTexture(
  kind: 'market_stall' | 'gate_city' | 'trap' | 'dart_trap',
  used: boolean
): THREE.CanvasTexture {
  const c = getSpecialStructureCanvas(kind, 36, used);
  return textureFromCanvas(`struct:${kind}:${used ? 1 : 0}`, c);
}

export function getContactShadowTexture(): THREE.CanvasTexture {
  const key = 'fx:contactShadow';
  const cached = canvasTextureCache.get(key);
  if (cached) return cached;

  const s = 64;
  const [canvas, ctx] = makeCanvas(s);
  if (ctx) {
    const grad = ctx.createRadialGradient(s / 2, s / 2, 4, s / 2, s / 2, s / 2);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
    grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.34)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  canvasTextureCache.set(key, tex);
  return tex;
}

export function getGlowDiscTexture(hexColor: string): THREE.CanvasTexture {
  const key = `fx:glow:${hexColor}`;
  const cached = canvasTextureCache.get(key);
  if (cached) return cached;

  const s = 64;
  const [canvas, ctx] = makeCanvas(s);
  if (ctx) {
    const grad = ctx.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2);
    grad.addColorStop(0, hexColor);
    grad.addColorStop(0.45, hexColor + '77');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  canvasTextureCache.set(key, tex);
  return tex;
}

export function getLootBeamTexture(hexColor: string): THREE.CanvasTexture {
  const key = `fx:beam:${hexColor}`;
  const cached = canvasTextureCache.get(key);
  if (cached) return cached;

  const w = 32;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const hGrad = ctx.createLinearGradient(0, 0, w, 0);
    hGrad.addColorStop(0, 'rgba(0,0,0,0)');
    hGrad.addColorStop(0.5, hexColor);
    hGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'destination-in';
    const vGrad = ctx.createLinearGradient(0, h, 0, 0);
    vGrad.addColorStop(0, 'rgba(255,255,255,0.85)');
    vGrad.addColorStop(0.65, 'rgba(255,255,255,0.28)');
    vGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, w, h);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  canvasTextureCache.set(key, tex);
  return tex;
}

export function getTelegraphExclaimTexture(): THREE.CanvasTexture {
  const key = 'fx:telegraphExclaim';
  const cached = canvasTextureCache.get(key);
  if (cached) return cached;

  const s = 48;
  const [canvas, ctx] = makeCanvas(s);
  if (ctx) {
    ctx.fillStyle = 'rgba(254, 242, 242, 0.98)';
    ctx.font = '700 30px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', s / 2, s / 2 + 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  canvasTextureCache.set(key, tex);
  return tex;
}
