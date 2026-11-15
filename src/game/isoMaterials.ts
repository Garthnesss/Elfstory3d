import * as THREE from 'three';
import {
  BiomeId,
  getAnimatedFluidTile,
  getAnimatedHazardTile,
  getBiomePalette,
  getFloorTileCanvas,
  getRoadTileCanvas,
  getSpecialStructureCanvas,
  getWallTileCanvas,
} from './tileset';

export interface BiomeAtmosphere {
  bgHex: number;
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
    bgHex: 0x090c11,
    skyHex: 0xcbe8ff,
    groundHex: 0x26382f,
    hemiIntensity: 1.05,
    dirHex: 0xfff3d6,
    dirIntensity: 1.05,
    playerLightHex: 0xf5a82a,
    foliagePrimary: 0x2d6a4f,
    foliageSecondary: 0x40916c,
    trunkHex: 0x5c3a21,
    moteCss: 'rgba(110, 231, 183, 0.35)',
  },
  overworld: {
    bgHex: 0x060c09,
    skyHex: 0xc6f6d5,
    groundHex: 0x1d3428,
    hemiIntensity: 1.08,
    dirHex: 0xfef3c7,
    dirIntensity: 1.1,
    playerLightHex: 0xfbbf24,
    foliagePrimary: 0x1e6b45,
    foliageSecondary: 0x34a86e,
    trunkHex: 0x53351d,
    moteCss: 'rgba(110, 231, 183, 0.35)',
  },
  thornwick: {
    bgHex: 0x070d0d,
    skyHex: 0x99f6e4,
    groundHex: 0x172b28,
    hemiIntensity: 0.95,
    dirHex: 0xd1fae5,
    dirIntensity: 0.95,
    playerLightHex: 0x2dd4bf,
    foliagePrimary: 0x115e59,
    foliageSecondary: 0x0d9488,
    trunkHex: 0x3f2e24,
    moteCss: 'rgba(45, 212, 191, 0.34)',
  },
  cinderwatch: {
    bgHex: 0x0b090c,
    skyHex: 0xfed7aa,
    groundHex: 0x2a1c19,
    hemiIntensity: 0.95,
    dirHex: 0xffedd5,
    dirIntensity: 1.0,
    playerLightHex: 0xfb923c,
    foliagePrimary: 0x7c2d12,
    foliageSecondary: 0xc2410c,
    trunkHex: 0x292524,
    moteCss: 'rgba(251, 146, 60, 0.38)',
  },
  highspire: {
    bgHex: 0x0b0c12,
    skyHex: 0xfef08a,
    groundHex: 0x272a3a,
    hemiIntensity: 1.1,
    dirHex: 0xfef9c3,
    dirIntensity: 1.12,
    playerLightHex: 0xfde047,
    foliagePrimary: 0x854d0e,
    foliageSecondary: 0xca8a04,
    trunkHex: 0x57534e,
    moteCss: 'rgba(253, 224, 71, 0.30)',
  },
  reliquary: {
    bgHex: 0x080a0f,
    skyHex: 0x93c5fd,
    groundHex: 0x1a2030,
    hemiIntensity: 0.78,
    dirHex: 0xdbeafe,
    dirIntensity: 0.88,
    playerLightHex: 0xf5a82a,
    foliagePrimary: 0x334155,
    foliageSecondary: 0x475569,
    trunkHex: 0x3f3f46,
    moteCss: 'rgba(148, 163, 184, 0.28)',
  },
  ossuary: {
    bgHex: 0x080b0e,
    skyHex: 0x99f6e4,
    groundHex: 0x182226,
    hemiIntensity: 0.74,
    dirHex: 0xccfbf1,
    dirIntensity: 0.85,
    playerLightHex: 0xf5a82a,
    foliagePrimary: 0x1e3a3a,
    foliageSecondary: 0x2d5a5a,
    trunkHex: 0x334155,
    moteCss: 'rgba(94, 234, 212, 0.28)',
  },
  ember: {
    bgHex: 0x0c0707,
    skyHex: 0xfdba74,
    groundHex: 0x2c1410,
    hemiIntensity: 0.78,
    dirHex: 0xffedd5,
    dirIntensity: 0.9,
    playerLightHex: 0xf97316,
    foliagePrimary: 0x7c2d12,
    foliageSecondary: 0x9a3412,
    trunkHex: 0x292524,
    moteCss: 'rgba(251, 146, 60, 0.36)',
  },
  crucible: {
    bgHex: 0x09080c,
    skyHex: 0xfca5a5,
    groundHex: 0x261721,
    hemiIntensity: 0.76,
    dirHex: 0xfee2e2,
    dirIntensity: 0.88,
    playerLightHex: 0xfb923c,
    foliagePrimary: 0x4c1d95,
    foliageSecondary: 0x6d28d9,
    trunkHex: 0x1e1b4b,
    moteCss: 'rgba(251, 146, 60, 0.35)',
  },
  abyss: {
    bgHex: 0x07050c,
    skyHex: 0xd8b4fe,
    groundHex: 0x1e1233,
    hemiIntensity: 0.74,
    dirHex: 0xf3e8ff,
    dirIntensity: 0.86,
    playerLightHex: 0xc084fc,
    foliagePrimary: 0x581c87,
    foliageSecondary: 0x7e22ce,
    trunkHex: 0x1e1b4b,
    moteCss: 'rgba(192, 132, 252, 0.36)',
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

const TILE_TEX_RES = 36;

export function getFloorTexture(
  biome: BiomeId,
  variant: number,
  isVault = false
): THREE.CanvasTexture {
  const v = variant % 16;
  const c = getFloorTileCanvas(biome, TILE_TEX_RES, v, isVault);
  return textureFromCanvas(`floor:${biome}:${v}:${isVault ? 1 : 0}`, c);
}

export function getRoadTexture(biome: BiomeId, variant: number): THREE.CanvasTexture {
  const v = variant % 8;
  const c = getRoadTileCanvas(biome, TILE_TEX_RES, v);
  return textureFromCanvas(`road:${biome}:${v}`, c);
}

export function getWallTopTexture(biome: BiomeId, variant: number): THREE.CanvasTexture {
  const v = variant % 12;
  const c = getWallTileCanvas(biome, TILE_TEX_RES, true, false, true, true, false, false, v);
  return textureFromCanvas(`walltop:${biome}:${v}`, c);
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
  const key = `wallside:${biome}:${v}:${shade}`;
  const cached = canvasTextureCache.get(key);
  if (cached) return cached;

  const p = getBiomePalette(biome);
  const s = 36;
  const canvas = document.createElement('canvas');
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = p.wallMortar;
    ctx.fillRect(0, 0, s, s);

    const rows = 4;
    const rowH = Math.floor(s / rows);
    for (let r = 0; r < rows; r++) {
      const y = r * rowH;
      const offset = (r + v) % 2 === 0 ? 0 : 9;
      for (let bx = -offset; bx < s; bx += 18) {
        const x = Math.max(0, bx + 1);
        const w = Math.min(s - x, bx + 17 - x);
        if (w <= 1) continue;
        ctx.fillStyle = (r + bx + v) % 3 === 0 ? p.wallFaceAlt : p.wallFace;
        ctx.fillRect(x, y + 1, w, rowH - 2);
        // Top highlight lip on each stone course
        ctx.fillStyle = p.wallHighlight;
        ctx.globalAlpha = 0.25;
        ctx.fillRect(x, y + 1, w, 1);
        ctx.globalAlpha = 1;
      }
    }

    // Subtle biome accent moss / rune / ember vein on one brick
    if (v === 1) {
      ctx.fillStyle = p.wallAccentSoft;
      ctx.fillRect(6, 10, 8, 3);
      ctx.fillStyle = p.wallAccent;
      ctx.fillRect(8, 10, 4, 2);
    } else if (v === 3) {
      ctx.fillStyle = p.wallAccentSoft;
      ctx.fillRect(20, 20, 7, 3);
    }

    // Top cornice edge + bottom base shadow
    ctx.fillStyle = p.wallTop;
    ctx.fillRect(0, 0, s, 3);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.fillRect(0, s - 5, s, 5);

    if (shade === 'dark') {
      ctx.fillStyle = 'rgba(4, 7, 14, 0.28)';
      ctx.fillRect(0, 0, s, s);
    }
  }

  return textureFromCanvas(key, canvas);
}

export function getFluidTexture(
  kind: 'water' | 'fountain' | 'chasm',
  frame: number
): THREE.CanvasTexture {
  const f = frame % 6;
  const c = getAnimatedFluidTile(kind, TILE_TEX_RES, f);
  return textureFromCanvas(`fluid:${kind}:${f}`, c);
}

export function getHazardTexture(
  kind: 'spore_pool' | 'frost_vent' | 'ember_crust' | 'shock_rune',
  frame: number,
  used: boolean
): THREE.CanvasTexture {
  const f = frame % 4;
  const c = getAnimatedHazardTile(kind, TILE_TEX_RES, f, used);
  return textureFromCanvas(`hazard:${kind}:${f}:${used ? 1 : 0}`, c);
}

export function getStructTexture(
  kind: 'market_stall' | 'gate_city' | 'trap' | 'dart_trap',
  used: boolean
): THREE.CanvasTexture {
  const c = getSpecialStructureCanvas(kind, TILE_TEX_RES, used);
  return textureFromCanvas(`struct:${kind}:${used ? 1 : 0}`, c);
}

export function getContactShadowTexture(): THREE.CanvasTexture {
  const key = 'fx:contactShadow';
  const cached = canvasTextureCache.get(key);
  if (cached) return cached;

  const s = 64;
  const canvas = document.createElement('canvas');
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(s / 2, s / 2, 4, s / 2, s / 2, s / 2);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.62)');
    grad.addColorStop(0.65, 'rgba(0, 0, 0, 0.28)');
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
  const canvas = document.createElement('canvas');
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2);
    grad.addColorStop(0, hexColor);
    grad.addColorStop(0.55, hexColor + '55');
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

export function getTelegraphExclaimTexture(): THREE.CanvasTexture {
  const key = 'fx:telegraphExclaim';
  const cached = canvasTextureCache.get(key);
  if (cached) return cached;

  const s = 48;
  const canvas = document.createElement('canvas');
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(254, 242, 242, 0.95)';
    ctx.font = '700 28px "JetBrains Mono", monospace';
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
