import { TileKind, ZoneId } from './types';

export type BiomeId =
  | 'oakhaven'
  | 'overworld'
  | 'highspire'
  | 'thornwick'
  | 'cinderwatch'
  | 'reliquary'
  | 'ossuary'
  | 'ember'
  | 'crucible'
  | 'abyss';

interface BiomePalette {
  voidBg: string;
  wallBase: string;
  wallTop: string;
  wallTopAlt: string;
  wallTopDark: string;
  wallHighlight: string;
  wallMortar: string;
  wallFace: string;
  wallFaceAlt: string;
  wallAccent: string;
  wallAccentSoft: string;
  floorBase: string;
  floorSlabA: string;
  floorSlabB: string;
  floorSlabC: string;
  floorMortar: string;
  floorHighlight: string;
  floorDetailA: string;
  floorDetailB: string;
  floorDetailC: string;
  roadBase: string;
  roadStoneA: string;
  roadStoneB: string;
  roadStoneC: string;
  roadHighlight: string;
}

const BIOMES: Record<BiomeId, BiomePalette> = {
  oakhaven: {
    voidBg: '#1E3325',
    wallBase: '#5C4632',
    wallTop: '#B26A41',
    wallTopAlt: '#BE784C',
    wallTopDark: '#96552F',
    wallHighlight: '#D9A066',
    wallMortar: '#4A3826',
    wallFace: '#8A6B4A',
    wallFaceAlt: '#96754F',
    wallAccent: '#4EA885',
    wallAccentSoft: '#35795C',
    floorBase: '#57743F',
    floorSlabA: '#5F7F45',
    floorSlabB: '#52703B',
    floorSlabC: '#688A4C',
    floorMortar: '#435F31',
    floorHighlight: 'rgba(255, 246, 190, 0.07)',
    floorDetailA: '#7FB069',
    floorDetailB: '#E9C46A',
    floorDetailC: '#D99B26',
    roadBase: '#9A8A68',
    roadStoneA: '#AC9C76',
    roadStoneB: '#8F7F5C',
    roadStoneC: '#B3A37E',
    roadHighlight: 'rgba(255, 240, 190, 0.12)',
  },
  overworld: {
    voidBg: '#060C09',
    wallBase: '#131D18',
    wallTop: '#24362C',
    wallTopAlt: '#2C4236',
    wallTopDark: '#1C2B23',
    wallHighlight: '#476956',
    wallMortar: '#0C1410',
    wallFace: '#1A2921',
    wallFaceAlt: '#22362B',
    wallAccent: '#34D399',
    wallAccentSoft: '#166534',
    floorBase: '#0C1712',
    floorSlabA: '#112119',
    floorSlabB: '#0E1C15',
    floorSlabC: '#15281F',
    floorMortar: '#09120D',
    floorHighlight: 'rgba(110, 231, 183, 0.06)',
    floorDetailA: '#228B5D',
    floorDetailB: '#2A4035',
    floorDetailC: '#FBBF24',
    roadBase: '#1C1610',
    roadStoneA: '#382D22',
    roadStoneB: '#44372A',
    roadStoneC: '#2E251C',
    roadHighlight: 'rgba(253, 224, 71, 0.1)',
  },
  thornwick: {
    voidBg: '#070D0D',
    wallBase: '#141F1E',
    wallTop: '#263A38',
    wallTopAlt: '#2E4744',
    wallTopDark: '#1D2E2C',
    wallHighlight: '#4B6E6A',
    wallMortar: '#0D1514',
    wallFace: '#1A2B29',
    wallFaceAlt: '#233836',
    wallAccent: '#2DD4BF',
    wallAccentSoft: '#115E59',
    floorBase: '#0E1816',
    floorSlabA: '#14221F',
    floorSlabB: '#101C1A',
    floorSlabC: '#182824',
    floorMortar: '#0A1210',
    floorHighlight: 'rgba(94, 234, 212, 0.06)',
    floorDetailA: '#14B8A6',
    floorDetailB: '#293D3A',
    floorDetailC: '#A3E635',
    roadBase: '#1B1813',
    roadStoneA: '#362F24',
    roadStoneB: '#42392B',
    roadStoneC: '#2C261D',
    roadHighlight: 'rgba(167, 243, 208, 0.1)',
  },
  cinderwatch: {
    voidBg: '#0B090C',
    wallBase: '#1D1821',
    wallTop: '#332B3A',
    wallTopAlt: '#3E3547',
    wallTopDark: '#27212C',
    wallHighlight: '#665773',
    wallMortar: '#120E15',
    wallFace: '#251F2B',
    wallFaceAlt: '#2F2736',
    wallAccent: '#FB923C',
    wallAccentSoft: '#9A3412',
    floorBase: '#121016',
    floorSlabA: '#19161F',
    floorSlabB: '#15121A',
    floorSlabC: '#1F1B26',
    floorMortar: '#0C0A0F',
    floorHighlight: 'rgba(251, 146, 60, 0.06)',
    floorDetailA: '#EA580C',
    floorDetailB: '#3B3447',
    floorDetailC: '#38BDF8',
    roadBase: '#1C1514',
    roadStoneA: '#342725',
    roadStoneB: '#40302E',
    roadStoneC: '#2A1F1E',
    roadHighlight: 'rgba(251, 146, 60, 0.11)',
  },
  highspire: {
    voidBg: '#0A0D14',
    wallBase: '#1E2534',
    wallTop: '#3C4963',
    wallTopAlt: '#465573',
    wallTopDark: '#313C52',
    wallHighlight: '#6E81A8',
    wallMortar: '#151A26',
    wallFace: '#273145',
    wallFaceAlt: '#313E57',
    wallAccent: '#E5A93B',
    wallAccentSoft: '#9C6D1E',
    floorBase: '#111622',
    floorSlabA: '#171D2C',
    floorSlabB: '#141927',
    floorSlabC: '#1B2233',
    floorMortar: '#0B0F18',
    floorHighlight: 'rgba(248, 250, 252, 0.07)',
    floorDetailA: 'rgba(229, 169, 59, 0.28)',
    floorDetailB: '#38445E',
    floorDetailC: '#60A5FA',
    roadBase: '#191E2B',
    roadStoneA: '#2E364A',
    roadStoneB: '#374057',
    roadStoneC: '#252C3D',
    roadHighlight: 'rgba(191, 219, 254, 0.12)',
  },
  reliquary: {
    voidBg: '#080A0F',
    wallBase: '#161C27',
    wallTop: '#2A3548',
    wallTopAlt: '#323F54',
    wallTopDark: '#212A39',
    wallHighlight: '#4C5D7D',
    wallMortar: '#0E121A',
    wallFace: '#1B2332',
    wallFaceAlt: '#232D40',
    wallAccent: '#38BDF8',
    wallAccentSoft: '#2E6F65',
    floorBase: '#0D1219',
    floorSlabA: '#121822',
    floorSlabB: '#0F141D',
    floorSlabC: '#151C28',
    floorMortar: '#080B11',
    floorHighlight: 'rgba(148, 163, 184, 0.055)',
    floorDetailA: '#2D6A5B',
    floorDetailB: '#2A364A',
    floorDetailC: '#64748B',
    roadBase: '#141821',
    roadStoneA: '#242B39',
    roadStoneB: '#2D3546',
    roadStoneC: '#1E2430',
    roadHighlight: 'rgba(148, 163, 184, 0.09)',
  },
  ossuary: {
    voidBg: '#070B11',
    wallBase: '#192230',
    wallTop: '#314159',
    wallTopAlt: '#3B4E6B',
    wallTopDark: '#263447',
    wallHighlight: '#647C9E',
    wallMortar: '#0E141E',
    wallFace: '#222E40',
    wallFaceAlt: '#2B3A52',
    wallAccent: '#7DD3FC',
    wallAccentSoft: '#0284C7',
    floorBase: '#0E1520',
    floorSlabA: '#141D2B',
    floorSlabB: '#111926',
    floorSlabC: '#172233',
    floorMortar: '#090E16',
    floorHighlight: 'rgba(186, 230, 253, 0.065)',
    floorDetailA: '#0EA5E9',
    floorDetailB: '#334155',
    floorDetailC: '#94A3B8',
    roadBase: '#131A26',
    roadStoneA: '#253145',
    roadStoneB: '#2E3C54',
    roadStoneC: '#1D2738',
    roadHighlight: 'rgba(125, 211, 252, 0.1)',
  },
  ember: {
    voidBg: '#0C0809',
    wallBase: '#1D1214',
    wallTop: '#3C2527',
    wallTopAlt: '#472C2F',
    wallTopDark: '#2E1C1E',
    wallHighlight: '#6B4245',
    wallMortar: '#110A0B',
    wallFace: '#261719',
    wallFaceAlt: '#321D20',
    wallAccent: '#FB923C',
    wallAccentSoft: '#9A3412',
    floorBase: '#120C0D',
    floorSlabA: '#181113',
    floorSlabB: '#140E10',
    floorSlabC: '#1D1416',
    floorMortar: '#0A0707',
    floorHighlight: 'rgba(251, 146, 60, 0.06)',
    floorDetailA: '#C2410C',
    floorDetailB: '#3D2A2C',
    floorDetailC: '#FBBF24',
    roadBase: '#1A1211',
    roadStoneA: '#30201E',
    roadStoneB: '#3B2825',
    roadStoneC: '#241816',
    roadHighlight: 'rgba(251, 146, 60, 0.1)',
  },
  crucible: {
    voidBg: '#0B0907',
    wallBase: '#1F1812',
    wallTop: '#423223',
    wallTopAlt: '#4F3C29',
    wallTopDark: '#33261A',
    wallHighlight: '#7D6042',
    wallMortar: '#120E0A',
    wallFace: '#2B2016',
    wallFaceAlt: '#382A1D',
    wallAccent: '#F59E0B',
    wallAccentSoft: '#B45309',
    floorBase: '#14100C',
    floorSlabA: '#1C1611',
    floorSlabB: '#17120E',
    floorSlabC: '#211A14',
    floorMortar: '#0B0907',
    floorHighlight: 'rgba(245, 158, 11, 0.065)',
    floorDetailA: '#D97706',
    floorDetailB: '#443526',
    floorDetailC: '#F43F5E',
    roadBase: '#19140E',
    roadStoneA: '#30251A',
    roadStoneB: '#3B2E20',
    roadStoneC: '#241C14',
    roadHighlight: 'rgba(251, 191, 36, 0.1)',
  },
  abyss: {
    voidBg: '#080510',
    wallBase: '#160F24',
    wallTop: '#2E1F4C',
    wallTopAlt: '#38265C',
    wallTopDark: '#23173B',
    wallHighlight: '#5D4394',
    wallMortar: '#0D0817',
    wallFace: '#1C1330',
    wallFaceAlt: '#261A40',
    wallAccent: '#C084FC',
    wallAccentSoft: '#6D28D9',
    floorBase: '#0F0A1B',
    floorSlabA: '#150E24',
    floorSlabB: '#120C1F',
    floorSlabC: '#19112C',
    floorMortar: '#080510',
    floorHighlight: 'rgba(192, 132, 252, 0.075)',
    floorDetailA: '#9333EA',
    floorDetailB: '#362657',
    floorDetailC: '#38BDF8',
    roadBase: '#150F24',
    roadStoneA: '#271C3D',
    roadStoneB: '#32254D',
    roadStoneC: '#1E1630',
    roadHighlight: 'rgba(192, 132, 252, 0.11)',
  },
};

export function getZoneBiome(zoneId: ZoneId, depth: number): BiomeId {
  if (zoneId === 'oakhaven') return 'oakhaven';
  if (zoneId === 'overworld') return 'overworld';
  if (zoneId === 'highspire') return 'highspire';
  if (zoneId === 'thornwick') return 'thornwick';
  if (zoneId === 'cinderwatch') return 'cinderwatch';
  if (zoneId.startsWith('mire_')) return 'thornwick';
  if (zoneId.startsWith('barrow_')) return zoneId === 'barrow_2' ? 'ossuary' : 'reliquary';
  if (zoneId.startsWith('frost_')) return zoneId === 'frost_3' ? 'ember' : 'ossuary';
  if (depth >= 5) return 'abyss';
  if (depth === 4) return 'crucible';
  if (depth === 3) return 'ember';
  if (depth === 2) return 'ossuary';
  return 'reliquary';
}

export function getBiomePalette(biome: BiomeId): BiomePalette {
  return BIOMES[biome];
}

const tileCache = new Map<string, HTMLCanvasElement>();

function hash2d(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function createCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return [canvas, canvas.getContext('2d')];
}

export function getWallTileCanvas(
  biome: BiomeId,
  size: number,
  northWall: boolean,
  southOpen: boolean,
  westWall: boolean,
  eastWall: boolean,
  nwOpenCorner: boolean,
  neOpenCorner: boolean,
  variantSeed: number
): HTMLCanvasElement {
  const v = variantSeed % 12;
  const key = `wall2:${biome}:${size}:${+northWall}:${+southOpen}:${+westWall}:${+eastWall}:${+nwOpenCorner}:${+neOpenCorner}:${v}`;
  const cached = tileCache.get(key);
  if (cached) return cached;

  const p = BIOMES[biome];
  const [canvas, ctx] = createCanvas(size);
  if (!ctx) return canvas;

  const faceH = southOpen ? Math.round(size * 0.3) : 0;
  const topH = size - faceH;

  ctx.fillStyle = p.wallBase;
  ctx.fillRect(0, 0, size, size);

  const leftPad = westWall ? 0 : 2;
  const rightPad = eastWall ? 0 : 2;
  const topPad = northWall ? 0 : 2;
  const topW = size - leftPad - rightPad;
  const blockTopH = Math.max(4, topH - topPad - (southOpen ? 1 : 0));

  ctx.fillStyle = p.wallTop;
  ctx.fillRect(leftPad, topPad, topW, blockTopH);

  // Varied ashlar stone courses on wall roof
  const midY = Math.floor(topH * (v % 3 === 0 ? 0.44 : v % 3 === 1 ? 0.56 : 0.5));
  ctx.fillStyle = v % 4 === 0 ? p.wallTopDark : p.wallTopAlt;

  if (v % 3 === 0) {
    ctx.fillRect(leftPad + 1, topPad + 1, Math.max(2, Math.floor(topW * 0.54)), Math.max(2, midY - topPad - 2));
    ctx.fillRect(leftPad + Math.floor(topW * 0.34), midY + 1, Math.max(2, Math.floor(topW * 0.58)), Math.max(2, blockTopH - (midY - topPad) - 2));
  } else if (v % 3 === 1) {
    ctx.fillRect(leftPad + Math.floor(topW * 0.42), topPad + 1, Math.max(2, Math.floor(topW * 0.52)), Math.max(2, midY - topPad - 2));
    ctx.fillRect(leftPad + 1, midY + 1, Math.max(2, Math.floor(topW * 0.44)), Math.max(2, blockTopH - (midY - topPad) - 2));
  } else {
    ctx.fillRect(leftPad + 2, topPad + 2, Math.max(2, topW - 4), Math.max(2, blockTopH - 4));
  }

  // Mortar lines
  ctx.fillStyle = p.wallMortar;
  if (midY > topPad + 3 && midY < topH - 3) {
    ctx.fillRect(leftPad, midY, topW, 1);
  }
  if (v % 2 === 0) {
    ctx.fillRect(Math.floor(size * 0.56), topPad, 1, Math.max(2, midY - topPad));
    ctx.fillRect(Math.floor(size * 0.31), midY, 1, Math.max(2, topH - midY - (southOpen ? 1 : 0)));
  } else {
    ctx.fillRect(Math.floor(size * 0.36), topPad, 1, Math.max(2, midY - topPad));
    ctx.fillRect(Math.floor(size * 0.67), midY, 1, Math.max(2, topH - midY - (southOpen ? 1 : 0)));
  }

  // Oakhaven timber framing accents on cottage/palisade walls
  if (biome === 'oakhaven' && (v === 2 || v === 7)) {
    ctx.fillStyle = '#4E3422';
    ctx.fillRect(leftPad, topPad, topW, 3);
    ctx.fillStyle = '#7C5338';
    ctx.fillRect(leftPad + 1, topPad + 1, Math.max(1, topW - 2), 1);
  }

  // Bevels & inner corners
  ctx.fillStyle = p.wallHighlight;
  if (!northWall) ctx.fillRect(leftPad, topPad, topW, 2);
  if (!westWall) ctx.fillRect(leftPad, topPad, 2, blockTopH);
  if (southOpen) ctx.fillRect(leftPad, topH - 2, topW, 1);
  if (nwOpenCorner) ctx.fillRect(0, 0, 2, 2);
  if (neOpenCorner) ctx.fillRect(size - 2, 0, 2, 2);

  ctx.fillStyle = p.wallMortar;
  if (!eastWall) ctx.fillRect(size - rightPad - 1, topPad, 1, blockTopH);

  // Roof weathering details
  if (v === 5 || v === 10) {
    if (biome === 'oakhaven' || biome === 'overworld' || biome === 'reliquary' || biome === 'thornwick') {
      ctx.fillStyle = p.wallAccentSoft;
      ctx.fillRect(leftPad + 4, topPad + 4, 6, 2);
      ctx.fillRect(leftPad + 6, topPad + 6, 4, 2);
      ctx.fillStyle = p.wallAccent;
      ctx.fillRect(leftPad + 5, topPad + 5, 2, 1);
    } else if (biome === 'ember' || biome === 'abyss') {
      ctx.fillStyle = p.wallAccent;
      ctx.globalAlpha = 0.72;
      ctx.fillRect(Math.floor(size * 0.4), topPad + 5, 7, 2);
      ctx.fillRect(Math.floor(size * 0.47), topPad + 3, 2, 7);
      ctx.globalAlpha = 1;
    } else if (biome === 'highspire' || biome === 'cinderwatch') {
      ctx.fillStyle = p.wallAccent;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(Math.floor(size * 0.44), topPad + 5, 5, 3);
      ctx.globalAlpha = 1;
    } else if (biome === 'ossuary') {
      ctx.fillStyle = p.wallAccentSoft;
      ctx.fillRect(leftPad + 5, topPad + 5, 6, 2);
      ctx.fillStyle = p.wallAccent;
      ctx.fillRect(leftPad + 7, topPad + 4, 2, 4);
    } else if (biome === 'crucible') {
      ctx.fillStyle = p.wallAccent;
      ctx.globalAlpha = 0.75;
      ctx.fillRect(leftPad + 4, topPad + 5, 7, 1);
      ctx.fillRect(leftPad + 9, topPad + 6, 4, 2);
      ctx.globalAlpha = 1;
    }
  } else if (v === 9 && (biome === 'reliquary' || biome === 'ember')) {
    // Diagonal roof fracture
    ctx.fillStyle = p.wallMortar;
    ctx.fillRect(leftPad + 6, topPad + 6, 4, 1);
    ctx.fillRect(leftPad + 9, topPad + 7, 4, 1);
    ctx.fillRect(leftPad + 12, topPad + 8, 3, 1);
  }

  // South vertical wall face
  if (southOpen) {
    const fy = topH;
    ctx.fillStyle = p.wallFace;
    ctx.fillRect(0, fy, size, faceH);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
    ctx.fillRect(0, fy, size, 2);

    ctx.fillStyle = p.wallFaceAlt;
    const brickY = fy + 2;
    const brickH = Math.max(2, faceH - 4);
    ctx.fillRect(2, brickY, Math.floor(size * 0.42), Math.floor(brickH * 0.5));
    ctx.fillRect(Math.floor(size * 0.5), brickY, Math.floor(size * 0.42), Math.floor(brickH * 0.5));
    ctx.fillRect(
      Math.floor(size * 0.22),
      brickY + Math.floor(brickH * 0.5) + 1,
      Math.floor(size * 0.5),
      Math.max(2, Math.floor(brickH * 0.45))
    );

    ctx.fillStyle = p.wallMortar;
    ctx.fillRect(0, fy + Math.floor(faceH * 0.55), size, 1);
    ctx.fillRect(Math.floor(size * 0.47), fy + 2, 1, Math.floor(faceH * 0.55) - 2);
    ctx.fillRect(Math.floor(size * 0.2), fy + Math.floor(faceH * 0.55), 1, Math.floor(faceH * 0.45));

    // Biome-distinctive south-face storytelling
    if (v === 3 || v === 8) {
      if (biome === 'oakhaven') {
        // Hanging ivy & wood beam
        ctx.fillStyle = '#5C3A21';
        ctx.fillRect(0, fy + 1, size, 2);
        ctx.fillStyle = p.wallAccentSoft;
        ctx.fillRect(6, fy + 2, 4, 5);
        ctx.fillStyle = p.wallAccent;
        ctx.fillRect(7, fy + 3, 2, 3);
      } else if (biome === 'highspire') {
        // Gilded trim & recessed arch niche
        ctx.fillStyle = p.wallAccent;
        ctx.globalAlpha = 0.78;
        ctx.fillRect(0, fy + 2, size, 1);
        ctx.fillRect(Math.floor(size * 0.44), fy + 4, 4, 4);
        ctx.globalAlpha = 1;
      } else if (biome === 'reliquary') {
        // Mossy drips & glowing sapphire rune
        ctx.fillStyle = p.wallAccentSoft;
        ctx.fillRect(8, fy + 1, 3, 5);
        ctx.fillRect(22, fy + 1, 2, 4);
        if (v === 8) {
          ctx.fillStyle = p.wallAccent;
          ctx.fillRect(Math.floor(size * 0.46), fy + 3, 3, 2);
          ctx.fillRect(Math.floor(size * 0.47), fy + 2, 1, 6);
        }
      } else if (biome === 'ember') {
        // Riveted iron band & magma fissure weep
        ctx.fillStyle = '#475569';
        ctx.fillRect(3, fy + 3, 2, 2);
        ctx.fillRect(size - 5, fy + 3, 2, 2);
        if (v === 8) {
          ctx.fillStyle = p.wallAccent;
          ctx.fillRect(Math.floor(size * 0.45), fy + 2, 2, 6);
          ctx.fillStyle = '#FDE047';
          ctx.fillRect(Math.floor(size * 0.45), fy + 4, 1, 3);
        }
      } else if (biome === 'ossuary') {
        // Frost rime icicles & bone-blue crypt glyph
        ctx.fillStyle = p.wallAccentSoft;
        ctx.fillRect(5, fy + 1, 3, 5);
        ctx.fillRect(14, fy + 1, 2, 4);
        ctx.fillRect(size - 9, fy + 1, 3, 5);
        if (v === 8) {
          ctx.fillStyle = p.wallAccent;
          ctx.fillRect(Math.floor(size * 0.46), fy + 3, 4, 2);
        }
      } else if (biome === 'crucible') {
        // Obsidian iron rivets & pulsing magma vent
        ctx.fillStyle = '#334155';
        ctx.fillRect(4, fy + 3, 2, 2);
        ctx.fillRect(size - 6, fy + 3, 2, 2);
        ctx.fillStyle = p.wallAccent;
        ctx.fillRect(Math.floor(size * 0.44), fy + 2, 4, 5);
        ctx.fillStyle = '#FDE047';
        ctx.fillRect(Math.floor(size * 0.45), fy + 4, 2, 2);
      } else if (biome === 'overworld' || biome === 'thornwick') {
        // Hanging moss vines & timber lintel
        ctx.fillStyle = '#4A3423';
        ctx.fillRect(0, fy + 1, size, 2);
        ctx.fillStyle = p.wallAccentSoft;
        ctx.fillRect(7, fy + 2, 3, 5);
        ctx.fillRect(size - 11, fy + 2, 3, 4);
      } else if (biome === 'cinderwatch') {
        // Forged iron parapet rivets & ember sconce glow
        ctx.fillStyle = '#475569';
        ctx.fillRect(5, fy + 3, 2, 2);
        ctx.fillRect(size - 7, fy + 3, 2, 2);
        if (v === 8) {
          ctx.fillStyle = p.wallAccent;
          ctx.fillRect(Math.floor(size * 0.45), fy + 3, 4, 3);
        }
      } else if (biome === 'abyss') {
        // Pulsing eldritch void sigil
        ctx.fillStyle = p.wallAccent;
        ctx.fillRect(Math.floor(size * 0.42), fy + 4, 6, 1);
        ctx.fillRect(Math.floor(size * 0.46), fy + 2, 2, 6);
        ctx.fillStyle = '#E9D5FF';
        ctx.fillRect(Math.floor(size * 0.46), fy + 4, 1, 1);
      }
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.76)';
    ctx.fillRect(0, size - 2, size, 2);
  }

  tileCache.set(key, canvas);
  return canvas;
}

export function getFloorTileCanvas(
  biome: BiomeId,
  size: number,
  variantSeed: number,
  isVaultInterior = false
): HTMLCanvasElement {
  const v = variantSeed % 16;
  const key = `floor2:${biome}:${size}:${v}:${+isVaultInterior}`;
  const cached = tileCache.get(key);
  if (cached) return cached;

  const p = BIOMES[biome];
  const [canvas, ctx] = createCanvas(size);
  if (!ctx) return canvas;

  if (isVaultInterior) {
    ctx.fillStyle = '#17110B';
    ctx.fillRect(0, 0, size, size);
    const half = Math.floor(size / 2);
    ctx.fillStyle = v % 2 === 0 ? '#241A10' : '#1F160E';
    ctx.fillRect(1, 1, half - 2, half - 2);
    ctx.fillRect(half + 1, half + 1, size - half - 2, size - half - 2);
    ctx.fillStyle = '#2B2014';
    ctx.fillRect(half + 1, 1, size - half - 2, half - 2);
    ctx.fillRect(1, half + 1, half - 2, size - half - 2);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
    ctx.fillRect(1, 1, size - 2, 1);
    ctx.fillRect(1, 1, 1, size - 2);
    if (v % 4 === 0) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.34)';
      ctx.fillRect(half - 2, half - 2, 4, 4);
    }
    tileCache.set(key, canvas);
    return canvas;
  }

  ctx.fillStyle = p.floorBase;
  ctx.fillRect(0, 0, size, size);

  const half = Math.floor(size / 2);
  const third = Math.floor(size / 3);
  const layout = v % 4;

  if (layout === 0) {
    // Classic quad flagstones
    ctx.fillStyle = p.floorSlabA;
    ctx.fillRect(1, 1, half - 2, half - 2);
    ctx.fillRect(half + 1, half + 1, size - half - 2, size - half - 2);
    ctx.fillStyle = p.floorSlabB;
    ctx.fillRect(half + 1, 1, size - half - 2, half - 2);
    ctx.fillRect(1, half + 1, half - 2, size - half - 2);

    ctx.fillStyle = p.floorMortar;
    ctx.fillRect(0, half, size, 1);
    ctx.fillRect(half, 0, 1, size);

    ctx.fillStyle = p.floorHighlight;
    ctx.fillRect(1, 1, half - 3, 1);
    ctx.fillRect(half + 1, 1, size - half - 3, 1);
    ctx.fillRect(1, half + 1, half - 3, 1);
    ctx.fillRect(half + 1, half + 1, size - half - 3, 1);
  } else if (layout === 1) {
    // Wide dominant slab + twin side stones
    const splitX = Math.floor(size * 0.62);
    ctx.fillStyle = p.floorSlabC;
    ctx.fillRect(1, 1, splitX - 2, size - 2);
    ctx.fillStyle = p.floorSlabB;
    ctx.fillRect(splitX + 1, 1, size - splitX - 2, half - 2);
    ctx.fillStyle = p.floorSlabA;
    ctx.fillRect(splitX + 1, half + 1, size - splitX - 2, size - half - 2);

    ctx.fillStyle = p.floorMortar;
    ctx.fillRect(splitX, 0, 1, size);
    ctx.fillRect(splitX, half, size - splitX, 1);

    ctx.fillStyle = p.floorHighlight;
    ctx.fillRect(1, 1, splitX - 3, 1);
    ctx.fillRect(splitX + 1, 1, size - splitX - 3, 1);
    ctx.fillRect(splitX + 1, half + 1, size - splitX - 3, 1);
  } else if (layout === 2) {
    // Staggered running-bond stone courses
    ctx.fillStyle = p.floorSlabA;
    ctx.fillRect(1, 1, third * 2 - 2, half - 2);
    ctx.fillStyle = p.floorSlabB;
    ctx.fillRect(third * 2 + 1, 1, size - third * 2 - 2, half - 2);
    ctx.fillRect(1, half + 1, third - 2, size - half - 2);
    ctx.fillStyle = p.floorSlabC;
    ctx.fillRect(third + 1, half + 1, size - third - 2, size - half - 2);

    ctx.fillStyle = p.floorMortar;
    ctx.fillRect(0, half, size, 1);
    ctx.fillRect(third * 2, 0, 1, half);
    ctx.fillRect(third, half, 1, size - half);

    ctx.fillStyle = p.floorHighlight;
    ctx.fillRect(1, 1, third * 2 - 3, 1);
    ctx.fillRect(third + 1, half + 1, size - third - 3, 1);
  } else {
    // Framed central dais slab
    ctx.fillStyle = p.floorSlabB;
    ctx.fillRect(1, 1, size - 2, size - 2);
    ctx.fillStyle = p.floorSlabC;
    ctx.fillRect(5, 5, size - 10, size - 10);
    ctx.fillStyle = p.floorMortar;
    ctx.strokeStyle = p.floorMortar;
    ctx.strokeRect(4.5, 4.5, size - 9, size - 9);
    ctx.fillStyle = p.floorHighlight;
    ctx.fillRect(5, 5, size - 10, 1);
    ctx.fillRect(5, 5, 1, size - 10);
  }

  // Rich micro-variations across the 16 seeds
  if (v === 2 || v === 11) {
    // Diagonal stone fracture
    ctx.fillStyle = p.floorMortar;
    ctx.fillRect(9, 11, 5, 1);
    ctx.fillRect(13, 12, 4, 1);
    ctx.fillRect(16, 13, 2, 2);
  }
  if (v === 3 || v === 14) {
    // Scattered rubble chips
    ctx.fillStyle = p.floorDetailB;
    ctx.fillRect(7, 24, 3, 2);
    ctx.fillRect(25, 8, 2, 2);
    ctx.fillRect(21, 26, 2, 1);
  }
  if (v === 5 || v === 9 || v === 13) {
    if (biome === 'oakhaven' || biome === 'overworld' || biome === 'thornwick') {
      // Grass blades + tiny wildflower / spore speck
      ctx.fillStyle = p.floorDetailA;
      ctx.fillRect(8, 19, 2, 4);
      ctx.fillRect(11, 17, 2, 6);
      ctx.fillRect(14, 20, 2, 3);
      if (v === 9) {
        ctx.fillStyle = p.floorDetailC;
        ctx.fillRect(11, 16, 2, 2);
      }
    } else if (biome === 'cinderwatch') {
      // Iron rivets & faint forge soot seam
      ctx.fillStyle = p.floorDetailB;
      ctx.fillRect(6, 6, 2, 2);
      ctx.fillRect(size - 8, size - 8, 2, 2);
      if (v === 13) {
        ctx.fillStyle = p.floorDetailA;
        ctx.globalAlpha = 0.45;
        ctx.fillRect(12, 22, 5, 1);
        ctx.globalAlpha = 1;
      }
    } else if (biome === 'highspire') {
      // Subtle gilded rosette or blue inlay
      ctx.fillStyle = p.floorDetailA;
      ctx.fillRect(half - 4, half - 1, 8, 2);
      ctx.fillRect(half - 1, half - 4, 2, 8);
      if (v === 13) {
        ctx.fillStyle = p.floorDetailC;
        ctx.globalAlpha = 0.25;
        ctx.fillRect(half - 1, half - 1, 2, 2);
        ctx.globalAlpha = 1;
      }
    } else if (biome === 'reliquary') {
      // Creeping moss or damp stone gleam
      ctx.fillStyle = p.floorDetailA;
      ctx.fillRect(6, 24, 5, 2);
      ctx.fillRect(8, 22, 4, 2);
      if (v === 13) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
        ctx.fillRect(18, 11, 6, 4);
      }
    } else if (biome === 'ember') {
      // Faint ember crack or soot drift
      ctx.fillStyle = p.floorDetailA;
      ctx.fillRect(9, 24, 6, 1);
      ctx.fillRect(14, 25, 4, 1);
      if (v === 13) {
        ctx.fillStyle = p.floorDetailC;
        ctx.globalAlpha = 0.55;
        ctx.fillRect(11, 24, 2, 1);
        ctx.globalAlpha = 1;
      }
    } else if (biome === 'ossuary') {
      // Hoarfrost rime veins & skeletal dust specks
      ctx.fillStyle = p.floorDetailA;
      ctx.fillRect(7, 21, 5, 2);
      ctx.fillRect(10, 19, 3, 2);
      if (v === 13) {
        ctx.fillStyle = p.floorDetailC;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(18, 12, 5, 2);
        ctx.globalAlpha = 1;
      }
    } else if (biome === 'crucible') {
      // Basalt slag & glowing ember seam
      ctx.fillStyle = p.floorDetailB;
      ctx.fillRect(8, 22, 4, 2);
      ctx.fillRect(22, 9, 3, 2);
      if (v === 13) {
        ctx.fillStyle = p.floorDetailA;
        ctx.fillRect(11, 20, 6, 1);
        ctx.fillStyle = p.floorDetailC;
        ctx.fillRect(13, 20, 2, 1);
      }
    } else if (biome === 'abyss') {
      // Void crystal splinter or faint arcane rune dot
      ctx.fillStyle = p.floorDetailA;
      ctx.fillRect(22, 20, 2, 4);
      ctx.fillRect(24, 21, 2, 3);
      if (v === 13) {
        ctx.fillStyle = p.floorDetailC;
        ctx.globalAlpha = 0.45;
        ctx.fillRect(10, 10, 3, 1);
        ctx.fillRect(11, 9, 1, 3);
        ctx.globalAlpha = 1;
      }
    }
  }

  tileCache.set(key, canvas);
  return canvas;
}

export function getRoadTileCanvas(biome: BiomeId, size: number, variantSeed: number): HTMLCanvasElement {
  const v = variantSeed % 8;
  const key = `road2:${biome}:${size}:${v}`;
  const cached = tileCache.get(key);
  if (cached) return cached;

  const p = BIOMES[biome];
  const [canvas, ctx] = createCanvas(size);
  if (!ctx) return canvas;

  ctx.fillStyle = p.roadBase;
  ctx.fillRect(0, 0, size, size);

  const stones =
    v % 2 === 0
      ? [
          { x: 2, y: 2, w: 14, h: 10, c: p.roadStoneA },
          { x: 18, y: 2, w: 16, h: 10, c: p.roadStoneB },
          { x: 2, y: 14, w: 9, h: 9, c: p.roadStoneC },
          { x: 13, y: 14, w: 13, h: 9, c: p.roadStoneA },
          { x: 28, y: 14, w: 6, h: 9, c: p.roadStoneB },
          { x: 2, y: 25, w: 16, h: 9, c: p.roadStoneB },
          { x: 20, y: 25, w: 14, h: 9, c: p.roadStoneC },
        ]
      : [
          { x: 2, y: 2, w: 10, h: 11, c: p.roadStoneC },
          { x: 14, y: 2, w: 13, h: 11, c: p.roadStoneA },
          { x: 29, y: 2, w: 5, h: 11, c: p.roadStoneB },
          { x: 2, y: 15, w: 16, h: 9, c: p.roadStoneB },
          { x: 20, y: 15, w: 14, h: 9, c: p.roadStoneA },
          { x: 2, y: 26, w: 12, h: 8, c: p.roadStoneA },
          { x: 16, y: 26, w: 18, h: 8, c: p.roadStoneC },
        ];

  const scale = size / 36;
  for (let i = 0; i < stones.length; i++) {
    const st = stones[(i + v) % stones.length];
    const sx = Math.round(st.x * scale);
    const sy = Math.round(st.y * scale);
    const sw = Math.max(3, Math.round(st.w * scale));
    const sh = Math.max(3, Math.round(st.h * scale));
    ctx.fillStyle = st.c;
    ctx.fillRect(sx, sy, sw, sh);
    ctx.fillStyle = p.roadHighlight;
    ctx.fillRect(sx + 1, sy, Math.max(1, sw - 2), 1);
  }

  if (v === 6 && biome === 'oakhaven') {
    ctx.fillStyle = 'rgba(78, 168, 133, 0.45)';
    ctx.fillRect(14, 12, 3, 2);
    ctx.fillRect(24, 24, 2, 2);
  }

  tileCache.set(key, canvas);
  return canvas;
}

export function getAnimatedFluidTile(
  kind: 'water' | 'fountain' | 'chasm',
  size: number,
  frame: number
): HTMLCanvasElement {
  const f = frame % 6;
  const key = `fluid2:${kind}:${size}:${f}`;
  const cached = tileCache.get(key);
  if (cached) return cached;

  const [canvas, ctx] = createCanvas(size);
  if (!ctx) return canvas;

  const s = size;
  if (kind === 'chasm') {
    ctx.fillStyle = '#0D0506';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#1E0B0B';
    ctx.fillRect(2, 2, s - 4, s - 4);

    // Jagged rock shelf
    ctx.fillStyle = '#2B181A';
    ctx.fillRect(0, 0, s, 4);
    ctx.fillRect(4, 4, 8, 2);
    ctx.fillRect(s - 14, 4, 10, 2);

    const pulse = f < 3 ? f : 5 - f;
    ctx.fillStyle = '#9A3412';
    ctx.fillRect(5, 11, s - 10, 5);
    ctx.fillRect(8, 21, s - 15, 5);

    ctx.fillStyle = pulse === 0 ? '#EA580C' : pulse === 1 ? '#F97316' : '#FB923C';
    ctx.fillRect(7 + f, 12, s - 16, 2);
    ctx.fillRect(12 - pulse * 2, 22, s - 22, 2);

    ctx.fillStyle = '#FDE047';
    ctx.fillRect(10 + f * 2, 12, 4, 1);
    ctx.fillRect(15 - pulse, 22, 4, 1);

    // Rising magma ember spark
    ctx.fillStyle = '#FEF08A';
    ctx.fillRect(9 + ((f * 5) % 16), 19 - f * 2, 2, 2);
  } else {
    ctx.fillStyle = '#0D273B';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#123650';
    ctx.fillRect(2, 2, s - 4, s - 4);

    const drift = f * 2;
    ctx.fillStyle = '#2563EB';
    ctx.globalAlpha = 0.28;
    ctx.fillRect(4, 9, s - 10, 3);
    ctx.fillRect(6, 22, s - 12, 3);
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(5 + (drift % 10), 9, 9, 2);
    ctx.fillRect(15 - (drift % 8), 22, 10, 2);

    ctx.fillStyle = '#BAE6FD';
    ctx.fillRect(7 + (drift % 11), 9, 3, 1);
    ctx.fillRect(18 - (drift % 6), 22, 3, 1);

    if (kind === 'fountain') {
      ctx.fillStyle = '#64748B';
      ctx.fillRect(2, 2, s - 4, 4);
      ctx.fillRect(2, s - 6, s - 4, 4);
      ctx.fillRect(2, 2, 4, s - 4);
      ctx.fillRect(s - 6, 2, 4, s - 4);

      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(3, 2, s - 6, 1);
      ctx.fillRect(2, 3, 1, s - 6);

      const mid = Math.floor(s / 2);
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(mid - 3, mid - 3, 6, 6);
      ctx.fillStyle = f % 2 === 0 ? '#E0F2FE' : '#7DD3FC';
      ctx.fillRect(mid - 2, mid - 5 - (f % 2), 4, 3);
      ctx.fillRect(mid - 5, mid - 1, 2, 2);
      ctx.fillRect(mid + 3, mid - 1, 2, 2);
    }
  }

  tileCache.set(key, canvas);
  return canvas;
}

export function getSpecialStructureCanvas(
  kind: Extract<TileKind, 'market_stall' | 'gate_city' | 'trap' | 'dart_trap'>,
  size: number,
  used = false
): HTMLCanvasElement {
  const key = `struct2:${kind}:${size}:${+used}`;
  const cached = tileCache.get(key);
  if (cached) return cached;

  const [canvas, ctx] = createCanvas(size);
  if (!ctx) return canvas;

  const s = size;

  if (kind === 'market_stall') {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(3, s - 6, s - 6, 4);

    ctx.fillStyle = '#5C2809';
    ctx.fillRect(3, 5, s - 6, s - 9);
    ctx.fillStyle = '#78350F';
    ctx.fillRect(4, s - 13, s - 8, 6);

    const stripeW = Math.max(4, Math.floor((s - 6) / 4));
    for (let i = 0; i < 4; i++) {
      const sx = 3 + i * stripeW;
      ctx.fillStyle = i % 2 === 0 ? '#B45309' : '#FDE68A';
      ctx.fillRect(sx, 5, stripeW, 13);
      ctx.fillStyle = i % 2 === 0 ? '#78350F' : '#D97706';
      ctx.fillRect(sx, 16, stripeW, 2);
    }

    ctx.fillStyle = '#FEF3C7';
    ctx.fillRect(3, 4, s - 6, 2);

    ctx.fillStyle = '#4EA885';
    ctx.fillRect(7, s - 12, 3, 3);
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(12, s - 12, 3, 3);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(s - 12, s - 12, 5, 4);
  } else if (kind === 'gate_city') {
    ctx.fillStyle = '#334155';
    ctx.fillRect(1, 2, 8, s - 3);
    ctx.fillRect(s - 9, 2, 8, s - 3);
    ctx.fillStyle = '#64748B';
    ctx.fillRect(2, 2, 6, s - 6);
    ctx.fillRect(s - 8, 2, 6, s - 6);

    ctx.fillStyle = '#475569';
    ctx.fillRect(2, 2, s - 4, 8);
    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(2, 2, s - 4, 2);

    ctx.fillStyle = '#1E293B';
    for (let bx = 11; bx <= s - 11; bx += 4) {
      ctx.fillRect(bx, 10, 2, s - 16);
    }
    ctx.fillStyle = '#475569';
    ctx.fillRect(9, 14, s - 18, 2);

    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(Math.floor(s / 2) - 4, 3, 8, 5);
    ctx.fillStyle = '#FEF08A';
    ctx.fillRect(Math.floor(s / 2) - 2, 4, 4, 3);
    ctx.fillRect(4, 12, 2, 3);
    ctx.fillRect(s - 6, 12, 2, 3);
  } else if (kind === 'trap') {
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(5, 6, s - 10, s - 12);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(5.5, 6.5, s - 11, s - 13);

    const baseCol = used ? '#475569' : '#94A3B8';
    const tipCol = used ? '#334155' : '#EF4444';
    const xs = [9, Math.floor(s / 2) - 1, s - 11];
    for (const sx of xs) {
      ctx.fillStyle = baseCol;
      ctx.fillRect(sx, 11, 3, s - 20);
      ctx.fillStyle = tipCol;
      ctx.fillRect(sx + 1, 9, 1, 4);
    }
  } else if (kind === 'dart_trap') {
    // Wall-mounted dart slit plate: dark housing, three venom-green dart tips.
    ctx.fillStyle = '#1C1917';
    ctx.fillRect(4, Math.floor(s / 2) - 5, s - 8, 10);
    ctx.strokeStyle = '#44403C';
    ctx.lineWidth = 1;
    ctx.strokeRect(4.5, Math.floor(s / 2) - 4.5, s - 9, 9);

    const tipCol = used ? '#57534E' : '#A3E635';
    const shaftCol = used ? '#44403C' : '#D6D3D1';
    const ys = [Math.floor(s / 2) - 3, Math.floor(s / 2) - 1, Math.floor(s / 2) + 1];
    for (const sy of ys) {
      ctx.fillStyle = shaftCol;
      ctx.fillRect(6, sy, s - 14, 1);
      ctx.fillStyle = tipCol;
      ctx.fillRect(s - 9, sy, 3, 1);
    }
  }

  tileCache.set(key, canvas);
  return canvas;
}

export function getAnimatedHazardTile(
  kind: 'spore_pool' | 'frost_vent' | 'ember_crust' | 'shock_rune',
  size: number,
  frame: number,
  used = false
): HTMLCanvasElement {
  const f = frame % 4;
  const key = `hazard:${kind}:${size}:${f}:${+used}`;
  const cached = tileCache.get(key);
  if (cached) return cached;

  const [canvas, ctx] = createCanvas(size);
  if (!ctx) return canvas;

  const s = size;
  const alpha = used ? 0.28 : 0.9;
  ctx.globalAlpha = alpha;

  if (kind === 'spore_pool') {
    ctx.fillStyle = '#064E3B';
    ctx.fillRect(4, 6, s - 8, s - 12);
    ctx.fillStyle = '#10B981';
    ctx.fillRect(7, 9, s - 14, s - 18);
    if (!used) {
      ctx.fillStyle = '#A7F3D0';
      ctx.fillRect(9 + f * 3, 12 + (f % 2) * 4, 3, 3);
      ctx.fillRect(s - 15 - f * 2, s - 15, 2, 2);
    }
  } else if (kind === 'frost_vent') {
    ctx.fillStyle = '#0C4A6E';
    ctx.fillRect(5, 5, s - 10, s - 10);
    ctx.fillStyle = used ? '#475569' : f % 2 === 0 ? '#38BDF8' : '#7DD3FC';
    ctx.fillRect(Math.floor(s / 2) - 1, 6, 2, s - 12);
    ctx.fillRect(6, Math.floor(s / 2) - 1, s - 12, 2);
    ctx.fillStyle = '#E0F2FE';
    ctx.fillRect(Math.floor(s / 2) - 2, Math.floor(s / 2) - 2, 4, 4);
  } else if (kind === 'ember_crust') {
    ctx.fillStyle = '#451A03';
    ctx.fillRect(4, 5, s - 8, s - 10);
    ctx.fillStyle = used ? '#57534E' : f % 2 === 0 ? '#EA580C' : '#F97316';
    ctx.fillRect(6, 11, s - 12, 3);
    ctx.fillRect(10, 18, s - 18, 3);
    if (!used) {
      ctx.fillStyle = '#FDE047';
      ctx.fillRect(9 + f * 2, 11, 4, 2);
      ctx.fillRect(s - 14 - f, 18, 3, 2);
    }
  } else {
    ctx.strokeStyle = used ? '#475569' : f % 2 === 0 ? '#A855F7' : '#C084FC';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(7, 7, s - 14, s - 14);
    ctx.fillStyle = used ? '#64748B' : '#E879F9';
    ctx.fillRect(Math.floor(s / 2) - 2, Math.floor(s / 2) - 2, 4, 4);
    if (!used) {
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(9 + f * 3, 9, 2, 2);
      ctx.fillRect(s - 11 - f * 3, s - 11, 2, 2);
    }
  }

  ctx.globalAlpha = 1;
  tileCache.set(key, canvas);
  return canvas;
}

export function pickTileVariant(x: number, y: number, mod: number): number {
  return Math.floor(hash2d(x, y) * mod) % mod;
}
