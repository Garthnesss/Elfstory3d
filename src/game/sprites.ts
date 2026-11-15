import { CompanionKind, CritterKind, EnemyArchetype, Item, PlayerState, TileKind } from './types';

// 16x16 pixel sprite matrices using single-character palette keys ('.' = transparent)
type PaletteMap = Record<string, string>;

const spriteCache = new Map<string, HTMLCanvasElement>();

function bakeMatrix(key: string, rows: string[], palette: PaletteMap): HTMLCanvasElement {
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const h = rows.length;
  const w = rows[0]?.length ?? 16;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    for (let y = 0; y < h; y++) {
      const line = rows[y];
      for (let x = 0; x < w; x++) {
        const ch = line[x];
        if (ch === '.' || !ch) continue;
        const color = palette[ch];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  spriteCache.set(key, canvas);
  return canvas;
}

// === CREATURE & HERO 16x16 PIXEL MATRICES ===
const HERO_MATRIX = [
  '.....oooooo.....',
  '....ohhhhhho....',
  '...ohhhhhhhho...',
  '.ooohsssssshooo.',
  '.oSSosesssesSSo.',
  '..o.osssssso.o..',
  '....occcccco....',
  '...occcccccco...',
  '..oacccbbcccao..',
  '..oaccccccccao..',
  '...oaccccccao...',
  '...obbccccbbo...',
  '....obboobbo....',
  '....obboobbo....',
  '...oobboobboo...',
  '...ooo....ooo...',
];

const HERO_MATRIX_F1 = [
  '................',
  '.....oooooo.....',
  '....ohhhhhho....',
  '...ohhhhhhhho...',
  '.ooohsssssshooo.',
  '.oSSosesssesSSo.',
  '..o.osssssso.o..',
  '...ooccccccoo...',
  '..oacccbbcccao..',
  '..oaccccccccao..',
  '...oaccccccao...',
  '...obbccccbbo...',
  '....obboobbo....',
  '....obboobbo....',
  '...oobboobboo...',
  '...ooo....ooo...',
];

const WEAPON_SWORD = [
  '.............oo.',
  '............oMMo',
  '...........oMMo.',
  '..........oMMo..',
  '.........oMMo...',
  '........oMMo....',
  '.......oMMo.....',
  '......oGGo......',
  '.....oGoo.......',
  '....oHo.........',
  '....oo..........',
  '................',
  '................',
  '................',
  '................',
  '................',
];

const WEAPON_STAFF = [
  '............oRRo',
  '...........oRrrR',
  '...........oRrrR',
  '............oGGo',
  '...........oWo..',
  '..........oWo...',
  '.........oWo....',
  '........oWo.....',
  '.......oWo......',
  '......oWo.......',
  '.....oWo........',
  '....oWo.........',
  '................',
  '................',
  '................',
  '................',
];

const WEAPON_DAGGER = [
  '................',
  '................',
  '................',
  '.............oo.',
  '............oMMo',
  '...........oMMo.',
  '..........oMMo..',
  '.........oGGo...',
  '........oHo.....',
  '..oo............',
  '.oMMo...........',
  '.oGo............',
  '................',
  '................',
  '................',
  '................',
];

const ENEMY_MATRICES: Record<EnemyArchetype, { rows: string[]; palette: PaletteMap }> = {
  plague_rat: {
    rows: [
      '................',
      '................',
      '................',
      '......oo...oo...',
      '.....oBBo.oBBo..',
      '....oBBBBBBBo...',
      '...oBBrBBBBbBo..',
      '..oBBBBBBBBbbBo.',
      '.oBbbBBBBBBbbBo.',
      '.oBBBBBBBBbbBBo.',
      '..oBBBBbbbbbBo..',
      '...oBBo..oBBo...',
      '..oBBo....oBBo..',
      '..ooo......ooo..',
      '................',
      '................',
    ],
    palette: { o: '#090B10', B: '#8C8275', b: '#5C544B', r: '#EF4444' },
  },
  goblin_skirmisher: {
    rows: [
      '....oooooooo....',
      '...oGGGGGGGGo...',
      '..oGggggggggGo..',
      '.ooGgGGggGGggoo.',
      '..oGgeGggGeGGo..',
      '...oGGggggGGo...',
      '....oLLLLLLo....',
      '...oLLBBBBLLo...',
      '..oLLBGGGGbLLo..',
      '..oGoLBBBBbLoMo.',
      '..oo.oLLLLLoMMo.',
      '.....oLooLoMMo..',
      '....oBBo.oBBo...',
      '....oBBo.oBBo...',
      '...oBBoo.ooBBo..',
      '...ooo.....ooo..',
    ],
    palette: { o: '#090B10', G: '#4EA885', g: '#2D6A54', e: '#FBBF24', L: '#7C5338', B: '#523624', b: '#3B2618', M: '#CBD5E1' },
  },
  crypt_skeleton: {
    rows: [
      '.....oooooo.....',
      '....oWWWWWWo....',
      '...oWWWWWWWWo...',
      '...oWoWWWWoWo...',
      '...oWWWWWWWWo...',
      '....oWooooWo....',
      '....oWWWWWWo....',
      '..ooOWWbbWWoOO..',
      '.oSSoWbbbbWoMMo.',
      '.oSSoWWWWWWoMMo.',
      '.oSSooWbbWooMMo.',
      '..oo..oWWo..oo..',
      '.....oWoOWo.....',
      '.....oWo.oWo....',
      '....oWWo.oWWo...',
      '....ooo...ooo...',
    ],
    palette: { o: '#090B10', W: '#E5DEC9', b: '#948B79', S: '#64748B', M: '#CBD5E1', O: '#475569' },
  },
  bone_acolyte: {
    rows: [
      '.....oooooo.....',
      '....oPPPPPPo....',
      '...oPPWWWWPPo...',
      '...oPWpWWpWPo...',
      '...oPPWWWWPPo...',
      '....oPPooPPo....',
      '...oPPPPPPPPo...',
      '..oPPpPPPPpPPo..',
      '..oPoPPPPPPoPo..',
      '..oWoPPPPPPoRo..',
      '..oWoPPPPPPoRo..',
      '..oWoPPPPPPooo..',
      '..oWoPppppPo....',
      '..oWoPPPPPPo....',
      '..oooPPPPPPo....',
      '.....oooooo.....',
    ],
    palette: { o: '#090B10', P: '#6D28D9', p: '#4C1D95', W: '#E5DEC9', R: '#A78BFA' },
  },
  ash_cultist: {
    rows: [
      '......oooo......',
      '.....oRRRRo.....',
      '....oRRRRRRo....',
      '...oRRooooRRo...',
      '...oRoFOoFoRo...',
      '...oRooooooRo...',
      '....oRRRRRRo....',
      '...oRRFFFFRRo...',
      '..oRRrRRRRrRRo..',
      '..oRoRRRRRRoFo..',
      '...o.oRRRRoFFo..',
      '....oRrrrrRo....',
      '....oRRRRRRo....',
      '...oRRrrrrRRo...',
      '...oRRRRRRRRo...',
      '...oooooooooo...',
    ],
    palette: { o: '#090B10', R: '#9A3412', r: '#7C2D12', F: '#FB923C', O: '#FBBF24' },
  },
  shadow_stalker: {
    rows: [
      '.....oooooo.....',
      '....oVVVVVVo....',
      '...oVVvvvvVVo...',
      '...oVoVvvVoVo...',
      '...oVVvvvvVVo...',
      '....oVVVVVVo....',
      '..ooVVvvvvVVoo..',
      '.oMMoVVVVVVoMMo.',
      '..oMoVvvvvVoMo..',
      '...ooVVVVVVoo...',
      '....oVvvvvVo....',
      '....oVVooVVo....',
      '...oVVo..oVVo...',
      '...oVVo..oVVo...',
      '..oVVoo..ooVVo..',
      '..ooo......ooo..',
    ],
    palette: { o: '#090B10', V: '#4C1D95', v: '#2E1065', M: '#E879F9' },
  },
  iron_golem: {
    rows: [
      '....oooooooo....',
      '...oSSSSSSSSo...',
      '..oSSssssssSSo..',
      '..oSSoAAAAoSSo..',
      '..oSSSSSSSSSSo..',
      '.ooSSssssssSSoo.',
      'oSSSsSSAAASsSSSo',
      'oSSSsSAOOASsSSSo',
      'oSSSsSSAAASsSSSo',
      'oSSSoSSSSSSoSSSo',
      '.ooo.oSSsso.ooo.',
      '....oSSSSSSo....',
      '...oSSSooSSSo...',
      '...oSSSo.oSSSo..',
      '..oSSSSo.oSSSSo.',
      '..oooooo.oooooo.',
    ],
    palette: { o: '#090B10', S: '#94A3B8', s: '#475569', A: '#F59E0B', O: '#FEF08A' },
  },
  cinder_wisp: {
    rows: [
      '.......oo.......',
      '......oYYo......',
      '.....oYOOYo.....',
      '....oYOOOOYo....',
      '...oYOOYYOOYo...',
      '..oYOOYWWYOOYo..',
      '..oYOOYWWYOOYo..',
      '...oYOOYYOOYo...',
      '...oROOOOOORo...',
      '....oROOOORo....',
      '....oRRooRRo....',
      '...oRo....oRo...',
      '....o..oo..o....',
      '......oYYo......',
      '.......oo.......',
      '................',
    ],
    palette: { o: '#090B10', Y: '#FBBF24', O: '#FB923C', R: '#EA580C', W: '#FEF3C7' },
  },
  dread_wraith: {
    rows: [
      '.....oooooo.....',
      '....oCCCCCCo....',
      '...oCCWWWWCCo...',
      '...oCWcCCcWCo...',
      '...oCCWWWWCCo...',
      '....oCCooCCo....',
      '..ooCCCCCCCCoo..',
      '.oCCcCCCCCCcCCo.',
      '.oCoCCCCCCCCoCo.',
      '..o.oCccccCo.o..',
      '....oCCCCCCo....',
      '...oCCccccCCo...',
      '...oCCo..oCCo...',
      '..oCCo....oCCo..',
      '..ooo......ooo..',
      '................',
    ],
    palette: { o: '#090B10', C: '#38BDF8', c: '#0284C7', W: '#E0F2FE' },
  },
  blight_weaver: {
    rows: [
      '.....oooooo.....',
      '....oGGGGGGoo...',
      '...oGGggggGGo...',
      '...oGgYggYgGo...',
      '...oGGggggGGo...',
      '....oGGGGGGoo...',
      '...oPPPPPPPPo...',
      '..oPPpPPPPpPPo..',
      '..oGoPPPPPPoGo..',
      '..oYoPPPPPPoYo..',
      '..oooPppppPooo..',
      '....oPPPPPPo....',
      '...oPPppppPPo...',
      '...oPPPPPPPPo...',
      '..ooPPPPPPPPoo..',
      '..oooooooooooo..',
    ],
    palette: { o: '#090B10', G: '#10B981', g: '#065F46', Y: '#FDE047', P: '#334155', p: '#1E293B' },
  },
  obsidian_warden: {
    rows: [
      '...oooooooooo...',
      '..oBBBBBBBBBBoo.',
      '..oBBsBBBBsBBBo.',
      '..oBBoROORoBBBo.',
      '..oBBBBBBBBBBBo.',
      '.ooBBssssssBBoo.',
      'oBBBsBBRRRBssBBo',
      'oBBBsBROOORssBBo',
      'oBBBsBBRRRBssBBo',
      'oBBBoBBBBBBooMMo',
      '.ooo.oBBbbo.MMMo',
      '....oBBBBBBoMMo.',
      '...oBBBooBBBo...',
      '...oBBBo.oBBBo..',
      '..oBBBBo.oBBBBo.',
      '..oooooo.oooooo.',
    ],
    palette: { o: '#090B10', B: '#334155', b: '#1E293B', s: '#475569', R: '#F43F5E', O: '#FEF08A', M: '#FB7185' },
  },
  grave_husk: {
    rows: [
      '.....oooooo.....',
      '....oTTTTTTo....',
      '...oTTTTTTTTo...',
      '...oToTTTToTo...',
      '...oTTTTTTTTo...',
      '....oTooooTo....',
      '..ooTTTTTTTToo..',
      '.oTTtTTTTTTtTTo.',
      '.oToTTTTTTTToTo.',
      '..o.oTttttTo.o..',
      '....oTTTTTTo....',
      '...oTTttttTTo...',
      '...oTTo..oTTo...',
      '..oTTo....oTTo..',
      '..ooo......ooo..',
      '................',
    ],
    palette: { o: '#090B10', T: '#D97706', t: '#92400E' },
  },
  spore_hulk: {
    rows: [
      '..oooooooooooo..',
      '.oGGGGGGGGGGGGo.',
      'oGGGgGGGGgGGGGGo',
      'oGGGGGGGGGGGGGGo',
      'oGgGGYYYYYYgGGGo',
      '.oGGGgGGGGgGGGo.',
      '..oooooooooooo..',
      '.oBBBBBBBBBBBBo.',
      'oBBoBBBBBBBBoBBo',
      'oBBoBBbbbBBBoBBo',
      '.ooBBBBBBBBBBoo.',
      '...oBBBooBBBo...',
      '...oBBBo.oBBBo..',
      '..oBBBBo.oBBBBo.',
      '..oooooo.oooooo.',
      '................',
    ],
    palette: { o: '#090B10', G: '#84CC16', g: '#4D7C0F', Y: '#FDE047', B: '#65A30D', b: '#3F6212' },
  },
  rime_revenant: {
    rows: [
      '.....oooooo.....',
      '....oCCCCCCo....',
      '...oCCWWWWCCo...',
      '...oCWcCCcWCo...',
      '...oCCWWWWCCo...',
      '....oCCooCCo....',
      '..ooCCCCCCCCoo..',
      '.oCCWCCCCCCWCCo.',
      '.oCoCCWCCCWCoCo.',
      '..o.oCccccCo.o..',
      '....oCCWWCCo....',
      '...oCCccccCCo...',
      '...oCCo..oCCo...',
      '..oCCo....oCCo..',
      '..ooo......ooo..',
      '................',
    ],
    palette: { o: '#090B10', C: '#7DD3FC', c: '#0369A1', W: '#F0F9FF' },
  },
  boss_bone_cantor: {
    rows: [
      '....oAo..oAo....',
      '...oAAoAAoAAo...',
      '....oWWWWWWo....',
      '...oWoWWWWoWo...',
      '...oWWWWWWWWo...',
      '....oWooooWo....',
      '..ooPPPPPPPPoo..',
      '.oPPWWWWWWWWPPo.',
      'oPPoPAAAAAAAPoRo',
      'oPo.oPPPPPPPoRRo',
      '.o..oPppppPPoRo.',
      '....oPPPPPPPoRo.',
      '...oPPppppPPoRo.',
      '...oPPPPPPPPooo.',
      '..oPPPPppppPPo..',
      '..oooooooooooo..',
    ],
    palette: { o: '#090B10', A: '#F59E0B', W: '#F5F0E1', P: '#9D174D', p: '#500724', R: '#F472B6' },
  },
  boss_ashen_inquisitor: {
    rows: [
      '..oo........oo..',
      '.oAAo.oooo.oAAo.',
      '..oAAoSSSSoAAo..',
      '...oSSooooSSo...',
      '...oSoFOoFoSo...',
      '...oSSSSSSSSo...',
      '.ooSSFFFFFFSSoo.',
      'oSSsSFSSSSFSsSSo',
      'oSSsSSSSSSSSsMMo',
      'oSSoSSFFFFSSoMMo',
      '.oo.oSssssSoMMo.',
      '....oSSSSSSoMMo.',
      '...oSSSooSSSooo.',
      '...oSSSo.oSSSo..',
      '..oSSSSo.oSSSSo.',
      '..oooooo.oooooo.',
    ],
    palette: { o: '#090B10', A: '#F59E0B', S: '#64748B', s: '#334155', F: '#FB923C', O: '#FEF08A', M: '#F97316' },
  },
  boss_malakor: {
    rows: [
      '.oAo..oooo..oAo.',
      '..oAoOAAAAOoAo..',
      '...oAAAAAAAAo...',
      '..oAAooooooAAo..',
      '..oAoROooORoAo..',
      '...oAooooooAo...',
      '.ooRRRRRRRRRRoo.',
      'oRRrRAAAAAAARrRo',
      'oRRrRAOOOOOARrRo',
      'oRRoRAAAAAAARoRo',
      '.oo.oRrrrrRRoRo.',
      '....oRRRRRRRRo..',
      '...oRRRrrrrRRRo.',
      '...oRRRo..oRRRo.',
      '..oRRRRo..oRRRRo',
      '..oooooo..oooooo',
    ],
    palette: { o: '#090B10', A: '#F59E0B', O: '#FEF08A', R: '#B91C1C', r: '#7F1D1D' },
  },
};

const NPC_MATRIX = [
  '.....oooooo.....',
  '....oHHHHHHo....',
  '...oHHHHHHHHo...',
  '...oHssssssHo...',
  '...osesssesHo...',
  '....osssssso....',
  '...oCCCCCCCCo...',
  '..oCCccccccCCo..',
  '..oCcCCGGCCcCo..',
  '..oCoCCCCCCoCo..',
  '...o.oCCCCo.o...',
  '....oCCCCCCo....',
  '....oCCooCCo....',
  '....oBBo.oBBo...',
  '...oBBoo.ooBBo..',
  '...ooo.....ooo..',
];

const CHEST_CLOSED = [
  '................',
  '................',
  '...oooooooooo...',
  '..oBBBBBBBBBBoo.',
  '.oBGGGGGGGGGGGBo',
  '.oBBBBBBBBBBBBBo',
  '.oGGGGGGGGGGGGGo',
  '.oBBBBooYYooBBBo',
  '.oBBBBooYYooBBBo',
  '.oBBBBBBBBBBBBBo',
  '.oBbbbbbbbbbbBBo',
  '..ooooooooooooo.',
  '................',
  '................',
  '................',
  '................',
];

const CHEST_OPEN = [
  '................',
  '...oooooooooo...',
  '..oBbbbbbbbbBo..',
  '..oBGGGGGGGGBo..',
  '..oooooooooooo..',
  '..oBBBBBBBBBBBo.',
  '.oBooooooooooBBo',
  '.oBo........oBBo',
  '.oBGGGGGGGGGGGBo',
  '.oBBBBBBBBBBBBBo',
  '.oBbbbbbbbbbbBBo',
  '..ooooooooooooo.',
  '................',
  '................',
  '................',
  '................',
];

const SHRINE_MATRIX = [
  '......oooo......',
  '.....oSSSSo.....',
  '....oSSCCSSo....',
  '...oSSCCCCSSo...',
  '...oSSCCCCSSo...',
  '....oSSCCSSo....',
  '....oSSSSSSo....',
  '...oSSssssSSo...',
  '...oSSsCCsSSo...',
  '...oSSssssSSo...',
  '...oSSSSSSSSo...',
  '..oSSssssssSSo..',
  '..oSSSSSSSSSSo..',
  '.oSSSSSSSSSSSSo.',
  '.oooooooooooooo.',
  '................',
];

const BRAZIER_MATRIX = [
  '.......oo.......',
  '......oYYo......',
  '.....oYOOYo.....',
  '....oROOOORo....',
  '...ooRRRRRRoo...',
  '..oGGGGGGGGGGoo.',
  '..oGGGGggggGGGo.',
  '...ooGGGGGGoo...',
  '.....oGGGGGo....',
  '....oGo...oGo...',
  '...oGo.....oGo..',
  '..oGo.......oGo.',
  '..ooo.......ooo.',
  '................',
  '................',
  '................',
];

const TREE_MATRIX = [
  '......oooo......',
  '.....oGGGGoo....',
  '....oGLLgGGGo...',
  '...oGGgLLgGGGo..',
  '....oGGggGGGo...',
  '...oGLLGggGGGo..',
  '..oGGGgggGGGGBo.',
  '.oGLLGggggGGGGo.',
  '..oGGGggggGGGo..',
  '.oGGGGgggggggGo.',
  '..ooGGGGggggoo..',
  '......oBbo......',
  '......oBbo......',
  '.....oBBBbo.....',
  '.....oooooo.....',
  '................',
];

const OAK_TREE_MATRIX = [
  '....oooooooo....',
  '..ooGLLGGGGGoo..',
  '.oGLLGGGGggGGGo.',
  '.oGGGGGgGGggGGo.',
  'oGGGGLLGGgggGGGo',
  'oGLLGGGGggggGGGo',
  'oGGGGgggGGGGgGGo',
  '.oGGGGgggggGGGo.',
  '..ooGGGgBggggoo.',
  '....ooBGBBgoo...',
  '......oBBbo.....',
  '......oBBbo.....',
  '.....oBBBBbo....',
  '....ooBBBBboo...',
  '....ooooooooo...',
  '................',
];

const GNARLED_PINE_MATRIX = [
  '.......oo.......',
  '......oLLo......',
  '.....oGGGGoo....',
  '....oGLLgGGoo...',
  '.....ooGggoo....',
  '...ooGGLLgGGo...',
  '..oGGGggggGGoo..',
  '....oGLLgGGGo...',
  '..ooGGGGggGGGo..',
  '.oGGggGggGGGgGo.',
  '...ooGGGggGooo..',
  '......oBbo......',
  '.....oBBbo......',
  '....ooBBboo.....',
  '....ooooooo.....',
  '................',
];

const PILLAR_MATRIX = [
  '..oooooooooooo..',
  '..oSSSSSSSSSSo..',
  '...oSSssssSSo...',
  '....oSSssSSo....',
  '....oSSssSSo....',
  '....oSSssSSo....',
  '....oSSssSSo....',
  '....oSSssSSo....',
  '....oSSssSSo....',
  '....oSSssSSo....',
  '....oSSssSSo....',
  '....oSSssSSo....',
  '...oSSssssSSo...',
  '..oSSSSSSSSSSo..',
  '..oooooooooooo..',
  '................',
];

const PILLAR_CRACKED_MATRIX = [
  '..oooooooooooo..',
  '..oSSSSSSSSSSo..',
  '...oSSssssSSo...',
  '....oSSooSSo....',
  '....oSoRssSo....',
  '....oSSoRsSo....',
  '....oSssRRSo....',
  '....oSSsoSSo....',
  '....oSSssSSo....',
  '....oSsooSSo....',
  '....oSSsRssSo...',
  '....oSSssSSo....',
  '...oSSssssSSo...',
  '..oSSSSSSSSSSo..',
  '..oooooooooooo..',
  '................',
];

const DOOR_MATRIX = [
  '..oooooooooooo..',
  '.oSSBBBBBBBBSSo.',
  '.oSBbbbbbbbbBSo.',
  '.oSBbGGGGGGbBSo.',
  '.oSBBBBBBBBBBSo.',
  '.oSBbbbbbbbbBSo.',
  '.oSBBBBBBBBBBSo.',
  '.oSBbBGGGGbBBSo.',
  '.oSBbBGoGGbBBSo.',
  '.oSBBBBBBBBBBSo.',
  '.oSBbbbbbbbbBSo.',
  '.oSBBBBBBBBBBSo.',
  '.oSBbbbbbbbbBSo.',
  '.oSSBBBBBBBBSSo.',
  '..oooooooooooo..',
  '................',
];

const VAULT_DOOR_MATRIX = [
  '..oooooooooooo..',
  '.oSSRRRRRRRRSSo.',
  '.oSRsGGGGGGsRSo.',
  '.oSRGGGGGGGGRSo.',
  '.oSRsGoAAoGsRSo.',
  '.oSSsAOOOOAsSSo.',
  '.oSRsAOYYOAsRSo.',
  '.oSRsAOOOOAsRSo.',
  '.oSSsGoAAoAsSSo.',
  '.oSRsGGGGGGsRSo.',
  '.oSRGGGGGGGGRSo.',
  '.oSRsGGGGGGsRSo.',
  '.oSRsbbbbbbssSo.',
  '.oSSRRRRRRRRSSo.',
  '..oooooooooooo..',
  '................',
];

const STAIRS_DOWN_MATRIX = [
  '..oooooooooooo..',
  '.oSSSSSSSSSSSSo.',
  '.oSssssssssssSo.',
  '.oSsGGGGGGGGsSo.',
  '.oSsGooooooGsSo.',
  '.oSssSSSSSSssSo.',
  '.oSssGooooGssSo.',
  '.oSsssSSSSsssSo.',
  '.oSsssGooGsssSo.',
  '.oSssssSSssssSo.',
  '.oSssssGoooooSo.',
  '.oSssssssSSssSo.',
  '.oSssssssssssSo.',
  '.oSSSSSSSSSSSSo.',
  '..oooooooooooo..',
  '................',
];

const STAIRS_UP_MATRIX = [
  '..oooooooooooo..',
  '.oSSSSSSSSSSSSo.',
  '.oSssssssssssSo.',
  '.oSsBBBBBBBBsSo.',
  '.oSssSSSSSSssSo.',
  '.oSssBBBBBBssSo.',
  '.oSsssSSSSsssSo.',
  '.oSsssBBBBsssSo.',
  '.oSssssSSssssSo.',
  '.oSssssBBssssSo.',
  '.oSssssssssssSo.',
  '.oSssssssssssSo.',
  '.oSssssssssssSo.',
  '.oSSSSSSSSSSSSo.',
  '..oooooooooooo..',
  '................',
];

const TORCH_FRAME_0 = [
  '.......oo.......',
  '......oYYo......',
  '.....oYOOYo.....',
  '....oROOOORo....',
  '.....oRRRRo.....',
  '......oGGo......',
  '.....oGGGGoo....',
  '......oBBo......',
  '......oBBo......',
  '......oBBo......',
  '......oBBo......',
  '.......oo.......',
  '................',
  '................',
  '................',
  '................',
];

const TORCH_FRAME_1 = [
  '......oo........',
  '.....oYYo.......',
  '.....oYOOYo.....',
  '....oROOOORo....',
  '.....oRRRRo.....',
  '......oGGo......',
  '.....oGGGGoo....',
  '......oBBo......',
  '......oBBo......',
  '......oBBo......',
  '......oBBo......',
  '.......oo.......',
  '................',
  '................',
  '................',
  '................',
];

const STELE_MATRIX = [
  '.....oooooo.....',
  '....oSSSSSSo....',
  '...oSSssssSSo...',
  '...oSsPPPPssSo..',
  '...oSsssssssSo..',
  '...oSsPPPPssSo..',
  '...oSsPssPssSo..',
  '...oSsssssssSo..',
  '...oSsPPPPssSo..',
  '...oSsssssssSo..',
  '...oSSssssSSo...',
  '..oSSssssssSSo..',
  '..oSSSSSSSSSSo..',
  '..oooooooooooo..',
  '................',
  '................',
];

const BELL_MATRIX = [
  '......oooo......',
  '.....oGGGGoo....',
  '......oBBo......',
  '.....oBBBBoo....',
  '....oBYYYYBBo...',
  '...oBYYYYYYBBo..',
  '...oBYCCCCYBBo..',
  '...oBYYYYYYBBo..',
  '..oBYYYYYYYYBBo.',
  '..oBBBBBBBBBBBo.',
  '...ooooYYoooo...',
  '.......oo.......',
  '................',
  '................',
  '................',
  '................',
];

const HERB_MATRIX = [
  '................',
  '......oo..oo....',
  '.....oWWooWWo...',
  '....oWCCWWCCWo..',
  '.....oWWYYWWo...',
  '....oWCCWWCCWo..',
  '.....ooGGGGoo...',
  '......oGggGo....',
  '....ooGGggGGoo..',
  '...oGGGgGGgGGGo.',
  '....oooGGGGooo..',
  '.......oBBo.....',
  '.......oooo.....',
  '................',
  '................',
  '................',
];

const WAYSTONE_MATRIX = [
  '.......oo.......',
  '......oCCo......',
  '.....oCWWCo.....',
  '....oSSCCSSo....',
  '....oSCCCCSo....',
  '...oSScWWcSSo...',
  '...oSSCCCCSSo...',
  '...oSScWWcSSo...',
  '...oSSssssSSo...',
  '...oSScCCcSSo...',
  '..ooSSssssSSoo..',
  '..oSSSSSSSSSSo..',
  '.oSSssssssssSSo.',
  '.oSSSSSSSSSSSSo.',
  '.oooooooooooooo.',
  '................',
];

const FORGE_MATRIX = [
  '......oooo......',
  '.....oYYYYo.....',
  '....oYOOOYYo....',
  '...oRRRRRRRRo...',
  '..ooMMMMMMMMoo..',
  '.oMMMMMMMMMMMMo.',
  '..ooMMMMMMMMoo..',
  '....oMMMMMMo....',
  '...ooMMmmMMoo...',
  '..oSSMMMMMMSSo..',
  '..oSSROOOORSSo..',
  '..oSSSSSSSSSSo..',
  '.oSSssssssssSSo.',
  '.oSSSSSSSSSSSSo.',
  '.oooooooooooooo.',
  '................',
];

const ALTAR_MATRIX = [
  '..oo........oo..',
  '.oPPo......oPPo.',
  '..oPPooooooPPo..',
  '...oSSPPPPSSo...',
  '...oSsRRRRssSo..',
  '..oSSsROORsSSo..',
  '..oSSsRRRRsSSo..',
  '...oSSssssSSo...',
  '...oSSsPPsSSo...',
  '..ooSSssssSSoo..',
  '..oSSSSSSSSSSo..',
  '.oSSsPssssPsSSo.',
  '.oSSSSSSSSSSSSo.',
  '.oooooooooooooo.',
  '................',
  '................',
];

export function getPlayerSprite(
  player: PlayerState,
  frame = 0
): {
  body: HTMLCanvasElement;
  weapon: HTMLCanvasElement;
} {
  const armorColor = player.equipped.armor
    ? player.equipped.armor.rarity === 'Relic'
      ? '#F59E0B'
      : player.equipped.armor.rarity === 'Epic'
        ? '#A855F7'
        : player.equipped.armor.rarity === 'Rare'
          ? '#3B82F6'
          : '#4EA885'
    : player.starterClass === 'Vanguard'
      ? '#B91C1C'
      : player.starterClass === 'Shadowcraft'
        ? '#15803D'
        : player.starterClass === 'Runecaster'
          ? '#1D4ED8'
          : '#92400E';

  const helmColor = player.equipped.helm
    ? '#CBD5E1'
    : player.starterClass === 'Shadowcraft'
      ? '#D8B4FE'
      : player.starterClass === 'Runecaster'
        ? '#E2E8F0'
        : '#FDE68A';

  const f = Math.abs(frame) % 2;
  const bodyKey = `elf_hero_${armorColor}_${helmColor}_f${f}`;
  const body = bakeMatrix(bodyKey, f === 1 ? HERO_MATRIX_F1 : HERO_MATRIX, {
    o: '#090B10',
    h: helmColor,
    s: '#F3D5B5',
    S: '#E7C098',
    e: '#047857',
    c: armorColor,
    a: '#D99B26',
    b: '#452A1B',
  });

  const weapGlyph = player.equipped.weapon?.glyph ?? '/';
  const weapMatrix =
    weapGlyph === '⚚' ? WEAPON_STAFF : weapGlyph === '†' ? WEAPON_DAGGER : WEAPON_SWORD;
  const weapMetal =
    player.equipped.weapon?.rarity === 'Relic'
      ? '#FDE047'
      : player.equipped.weapon?.rarity === 'Epic'
        ? '#D8B4FE'
        : player.equipped.weapon?.rarity === 'Rare'
          ? '#93C5FD'
          : '#E2E8F0';
  const weapKey = `weap_${weapGlyph}_${weapMetal}_f${f}`;
  const weapon = bakeMatrix(weapKey, weapMatrix, {
    o: '#090B10',
    M: weapMetal,
    G: '#F59E0B',
    H: '#78350F',
    W: '#78350F',
    R: f === 1 ? '#93C5FD' : '#60A5FA',
    r: '#DBEAFE',
  });

  return { body, weapon };
}

export function getEnemySprite(archetype: EnemyArchetype, frame = 0): HTMLCanvasElement {
  const def = ENEMY_MATRICES[archetype];
  const f = Math.abs(frame) % 2;
  if (f === 0) {
    return bakeMatrix(`enemy_${archetype}_f0`, def.rows, def.palette);
  }
  const shiftedRows = [def.rows[def.rows.length - 1], ...def.rows.slice(0, def.rows.length - 1)];
  const animPalette = { ...def.palette };
  if (animPalette.O) animPalette.O = '#FDE047';
  if (animPalette.C) animPalette.C = '#7DD3FC';
  if (animPalette.R) animPalette.R = '#F97316';
  return bakeMatrix(`enemy_${archetype}_f1`, shiftedRows, animPalette);
}

export function getNpcSprite(npcId: string, color: string): HTMLCanvasElement {
  const hairByNpc: Record<string, string> = {
    torin: '#94A3B8',
    mira: '#34D399',
    vance: '#60A5FA',
    vex: '#7E22CE',
    lyra: '#3B82F6',
    corvus: '#D97706',
    kaelen: '#DC2626',
    orin: '#A855F7',
    rowan: '#10B981',
    sylva: '#A3E635',
    bram: '#FBBF24',
    halda: '#F97316',
    darek: '#CBD5E1',
  };
  return bakeMatrix(`npc_${npcId}`, NPC_MATRIX, {
    o: '#090B10',
    H: hairByNpc[npcId] ?? color,
    s: '#E7C5A3',
    e: '#0F172A',
    C: color,
    c: '#1E293B',
    G: '#FBBF24',
    B: '#452A1B',
  });
}

const LYNX_F0 = [
  '................',
  '..oo........oo..',
  '.oCCo......oCCo.',
  '.oCWCo....oCWCo.',
  '..oCCooooooCCo..',
  '..oCCCCCCCCCCo..',
  '..oCeCCCCCCeCo..',
  '...oCCWWWWCCo...',
  '...ooCCCCCCoo...',
  '..oCCcCCCCcCCo..',
  '..oCCcCCCCcCCo..',
  '...oCCCCCCCCo...',
  '...oCCo..oCCo...',
  '..oCCo....oCCo..',
  '..ooo......ooo..',
  '................',
];

const LYNX_F1 = [
  '................',
  '................',
  '..oo........oo..',
  '.oCCo......oCCo.',
  '.oCWCo....oCWCo.',
  '..oCCooooooCCo..',
  '..oCCCCCCCCCCo..',
  '..oCeCCCCCCeCo..',
  '...oCCWWWWCCo...',
  '..ooCCCCCCCCoo..',
  '..oCCcCCCCcCCo..',
  '...oCCCCCCCCo...',
  '...oCCo..oCCo...',
  '..oCCo....oCCo..',
  '..ooo......ooo..',
  '................',
];

const OWL_F0 = [
  '....oo....oo....',
  '...oAAo..oAAo...',
  '...oSSooooSSo...',
  '..oSSWWWWWWSSo..',
  '..oSWYSSSSYWSO..',
  '...oSSWWWWSSo...',
  '.ooSSccccccSSoo.',
  'oSSScCCCCCCcSSSo',
  'oSSocCCCCCCcoSSo',
  '.oo.oCCCCCCo.oo.',
  '....oSSccSSo....',
  '.....oSSSSo.....',
  '....oAAooAAo....',
  '....ooo..ooo....',
  '................',
  '................',
];

const OWL_F1 = [
  '................',
  '....oo....oo....',
  '...oAAo..oAAo...',
  '...oSSooooSSo...',
  '..oSSWWWWWWSSo..',
  '..oSWYSSSSYWSO..',
  '..oSSccccccSSo..',
  '..oSScCCCCcSSo..',
  '...oSSSSSSSSo...',
  '...oSSccccSSo...',
  '....oSSccSSo....',
  '.....oSSSSo.....',
  '....oAAooAAo....',
  '....ooo..ooo....',
  '................',
  '................',
];

export function getCompanionSprite(kind: CompanionKind, frame = 0): HTMLCanvasElement {
  const f = Math.abs(frame) % 2;
  if (kind === 'starlight_owl') {
    return bakeMatrix(`comp_owl_${f}`, f === 1 ? OWL_F1 : OWL_F0, {
      o: '#090B10',
      O: '#090B10',
      A: '#FBBF24',
      Y: '#FDE047',
      S: '#60A5FA',
      W: '#E0F2FE',
      C: '#38BDF8',
      c: '#1D4ED8',
    });
  }
  return bakeMatrix(`comp_lynx_${f}`, f === 1 ? LYNX_F1 : LYNX_F0, {
    o: '#090B10',
    C: '#6EE7B7',
    c: '#059669',
    W: '#ECFDF5',
    e: '#FDE047',
  });
}

// === PHASE 3 AMBIENT CRITTERS (non-combat wildlife) ===
const CRITTER_MATRICES: Record<CritterKind, { rows: string[]; palette: PaletteMap }> = {
  vale_rabbit: {
    rows: [
      '................',
      '.....oo..oo.....',
      '....oWWo.oWWo...',
      '....oWWo.oWWo...',
      '....oWWo.oWWo...',
      '.....oWWWWo.....',
      '....oWeWWeWo....',
      '....oWWWWWWo....',
      '...oWWWWWWWWo...',
      '..oWWWWWWWWWWo..',
      '..oWWoWWWWoWWo..',
      '...ooWWWWWWoo...',
      '.....oWWWWo.....',
      '....oo....oo....',
      '................',
      '................',
    ],
    palette: { o: '#090B10', W: '#E7E5E4', e: '#1C1917' },
  },
  ash_fox: {
    rows: [
      '................',
      '...oo......oo...',
      '..oOOo....oOOo..',
      '..oOOOooooOOOo..',
      '...oOOOOOOOOo...',
      '....oOeOOeOo....',
      '....oOOOOOOo....',
      '.....oOOOOo.....',
      '..ooOOOOOOOOo...',
      '.oWWoOOOOOOOo...',
      '..oWWOOOOOOo....',
      '...ooooooooo....',
      '....oOO..OOo....',
      '....oOO..OOo....',
      '...ooo....ooo...',
      '................',
    ],
    palette: { o: '#090B10', O: '#EA580C', W: '#FED7AA', e: '#1C1917' },
  },
  cinder_crow: {
    rows: [
      '................',
      '................',
      '......oooo......',
      '.....oBBBBo.....',
      '....oBeBBBBoo...',
      '....oBBBBBBBYo..',
      '...ooBBBBBBo....',
      '.ooBBBBBBBBBoo..',
      'oBBBoBBBBBoBBBo.',
      '.oooBBBBBBooo...',
      '....oBBBBBo.....',
      '.....oBBBo......',
      '.....oBBo.......',
      '....oo.oo.......',
      '................',
      '................',
    ],
    palette: { o: '#090B10', B: '#292524', e: '#FBBF24', Y: '#F59E0B' },
  },
  cave_bat: {
    rows: [
      '................',
      '................',
      '..oo........oo..',
      '.oBBo..oo..oBBo.',
      'oBBBBooBBooBBBo.',
      'oBBBBBoBBBoBBBBo',
      '.oBBBooBBBBo....',
      '..ooo.oBBeBo....',
      '......oBBBBo....',
      '.......oBo......',
      '......oo.oo.....',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    palette: { o: '#090B10', B: '#57534E', e: '#EF4444' },
  },
  town_cat: {
    rows: [
      '................',
      '................',
      '...oo......oo...',
      '..oOOo....oOOo..',
      '..oOOOOOOOOOOo..',
      '...oOeOOOOeOo...',
      '...oOOOOOOOOo...',
      '....oOOOOOOo....',
      '....oOOOOOOo....',
      '...oOOOOOOOOo...',
      '..oOOOOOOOOOOo..',
      '..oOOoOOOOoOOo..',
      '...oo.OOOO.oo...',
      '......OOOO......',
      '.....oooooo.....',
      '................',
    ],
    palette: { o: '#090B10', O: '#A8A29E', e: '#1C1917' },
  },
  fen_frog: {
    rows: [
      '................',
      '................',
      '................',
      '...oo......oo...',
      '..oYYo....oYYo..',
      '...oGGGGGGGGo...',
      '..oGGGGGGGGGGGo.',
      '..oGgGGGGGGgGo..',
      '..oGGGGGGGGGGGo.',
      '...oooooooooo...',
      '..oo........oo..',
      '.oGGOo....oOGGo.',
      '..ooo......ooo..',
      '................',
      '................',
      '................',
    ],
    palette: { o: '#090B10', G: '#4ADE80', g: '#166534', Y: '#FDE047' },
  },
};

export function getCritterSprite(kind: CritterKind, frame = 0): HTMLCanvasElement {
  const def = CRITTER_MATRICES[kind];
  const f = Math.abs(frame) % 2;
  if (f === 0) {
    return bakeMatrix(`critter_${kind}_f0`, def.rows, def.palette);
  }
  // Frame 1: one-row hop/flutter offset, same trick as enemy sprites.
  const shifted = ['................', ...def.rows.slice(0, 15)];
  return bakeMatrix(`critter_${kind}_f1`, shifted, def.palette);
}

export function getPropSprite(
  kind: TileKind,
  used = false,
  frame = 0,
  isDeep = false,
  variant = 0
): HTMLCanvasElement | null {
  switch (kind) {
    case 'chest':
      return bakeMatrix(
        used ? 'chest_open' : 'chest_closed',
        used ? CHEST_OPEN : CHEST_CLOSED,
        { o: '#090B10', B: '#92400E', b: '#5C2809', G: '#D99B26', Y: '#FDE047' }
      );
    case 'shrine':
      return bakeMatrix('shrine_glyph', SHRINE_MATRIX, {
        o: '#090B10',
        S: '#94A3B8',
        s: '#475569',
        C: '#60A5FA',
      });
    case 'brazier':
      return bakeMatrix(used ? 'brazier_used' : `brazier_lit_${frame % 2}`, BRAZIER_MATRIX, {
        o: '#090B10',
        Y: used ? '#475569' : frame % 2 === 0 ? '#FEF08A' : '#FDE047',
        O: used ? '#334155' : frame % 2 === 0 ? '#FB923C' : '#FBBF24',
        R: used ? '#1E293B' : '#EA580C',
        G: '#D97706',
        g: '#78350F',
      });
    case 'tree': {
      const treeVar = Math.abs(variant) % 3;
      if (treeVar === 1) {
        return bakeMatrix('oak_tree_v2', OAK_TREE_MATRIX, {
          o: '#090B10',
          L: '#A7F3D0',
          G: '#3E9E6E',
          g: '#205941',
          B: '#854D27',
          b: '#4A2C16',
        });
      }
      if (treeVar === 2) {
        return bakeMatrix('gnarled_pine_v2', GNARLED_PINE_MATRIX, {
          o: '#090B10',
          L: '#86EFAC',
          G: '#2D8A68',
          g: '#164234',
          B: '#6B4226',
          b: '#3F2312',
        });
      }
      return bakeMatrix('pine_tree_v2', TREE_MATRIX, {
        o: '#090B10',
        L: '#6EE7B7',
        G: '#349873',
        g: '#1B4D3E',
        B: '#7C4D2B',
        b: '#4A2C16',
      });
    }
    case 'pillar': {
      const cracked = Math.abs(variant) % 2 === 1;
      return bakeMatrix(
        `${isDeep ? 'pillar_deep' : 'pillar_stone'}_${cracked ? 'cracked' : 'fluted'}`,
        cracked ? PILLAR_CRACKED_MATRIX : PILLAR_MATRIX,
        {
          o: '#090B10',
          S: isDeep ? '#78716C' : '#94A3B8',
          s: isDeep ? '#44403C' : '#475569',
          R: isDeep ? '#FB923C' : '#60A5FA',
        }
      );
    }
    case 'door':
      return bakeMatrix('timber_door', DOOR_MATRIX, {
        o: '#090B10',
        S: '#64748B',
        B: '#92400E',
        b: '#5C2809',
        G: '#F59E0B',
      });
    case 'stairs_down':
      return bakeMatrix('stairs_down', STAIRS_DOWN_MATRIX, {
        o: '#090B10',
        S: '#64748B',
        s: '#334155',
        G: '#F59E0B',
      });
    case 'stairs_up':
      return bakeMatrix('stairs_up', STAIRS_UP_MATRIX, {
        o: '#090B10',
        S: '#94A3B8',
        s: '#475569',
        B: '#60A5FA',
      });
    case 'torch':
      return bakeMatrix(`torch_${frame % 2}`, frame % 2 === 0 ? TORCH_FRAME_0 : TORCH_FRAME_1, {
        o: '#090B10',
        Y: '#FEF08A',
        O: '#FB923C',
        R: '#EA580C',
        G: '#94A3B8',
        B: '#78350F',
      });
    case 'lore_tablet': {
      const amber = Math.abs(variant) % 2 === 1;
      return bakeMatrix(amber ? 'lore_stele_amber' : 'lore_stele', STELE_MATRIX, {
        o: '#090B10',
        S: '#64748B',
        s: '#334155',
        P: amber ? '#FBBF24' : '#A78BFA',
      });
    }
    case 'whispering_bell':
      return bakeMatrix(used ? 'bell_used' : 'bell_lit', BELL_MATRIX, {
        o: '#090B10',
        G: '#94A3B8',
        B: used ? '#475569' : '#B45309',
        Y: used ? '#64748B' : '#FBBF24',
        C: used ? '#475569' : '#60A5FA',
      });
    case 'herb_node':
      return used
        ? null
        : bakeMatrix('herb_nightbloom', HERB_MATRIX, {
            o: '#090B10',
            W: '#D1FAE5',
            C: '#6EE7B7',
            Y: '#FDE047',
            G: '#10B981',
            g: '#047857',
            B: '#5C4033',
          });
    case 'contraband_cache':
      return bakeMatrix(used ? 'cache_used' : 'cache_full', CHEST_CLOSED, {
        o: '#090B10',
        B: used ? '#334155' : '#6D28D9',
        b: used ? '#1E293B' : '#4C1D95',
        G: used ? '#475569' : '#C084FC',
        Y: '#F472B6',
      });
    case 'vault_door':
      return bakeMatrix('vault_door', VAULT_DOOR_MATRIX, {
        o: '#090B10',
        S: '#64748B',
        s: '#334155',
        R: '#7C2D12',
        b: '#1E293B',
        G: '#D97706',
        A: '#F59E0B',
        O: '#FB923C',
        Y: '#FEF08A',
      });
    case 'waystone': {
      const f = Math.abs(frame) % 2;
      return bakeMatrix(used ? 'waystone_used' : `waystone_lit_${f}`, WAYSTONE_MATRIX, {
        o: '#090B10',
        S: '#64748B',
        s: '#334155',
        C: used ? '#475569' : f === 0 ? '#38BDF8' : '#7DD3FC',
        c: used ? '#334155' : '#0284C7',
        W: used ? '#64748B' : '#E0F2FE',
      });
    }
    case 'forgotten_forge': {
      const f = Math.abs(frame) % 2;
      return bakeMatrix(used ? 'forge_used' : `forge_lit_${f}`, FORGE_MATRIX, {
        o: '#090B10',
        Y: used ? '#475569' : f === 0 ? '#FEF08A' : '#FDE047',
        O: used ? '#334155' : '#FB923C',
        R: used ? '#1E293B' : '#EA580C',
        M: '#94A3B8',
        m: '#475569',
        S: '#64748B',
        s: '#334155',
      });
    }
    case 'cursed_altar': {
      const f = Math.abs(frame) % 2;
      return bakeMatrix(used ? 'altar_used' : `altar_lit_${f}`, ALTAR_MATRIX, {
        o: '#090B10',
        S: '#64748B',
        s: '#334155',
        P: used ? '#475569' : '#A855F7',
        R: used ? '#334155' : f === 0 ? '#E11D48' : '#F43F5E',
        O: used ? '#475569' : '#FDE047',
      });
    }
    default:
      return null;
  }
}

export function getLootSprite(item?: Item): HTMLCanvasElement {
  if (!item) {
    return bakeMatrix('loot_gold', [
      '................',
      '................',
      '......oooo......',
      '.....oYYYYo.....',
      '....oYWWYYYo....',
      '....oYYYYYYo....',
      '....oYGGGGYo....',
      '.....oGGGGoo....',
      '....oYYYYYYo....',
      '....oYGGGGYo....',
      '.....oooooo.....',
      '................',
      '................',
      '................',
      '................',
      '................',
    ], { o: '#090B10', Y: '#FDE047', W: '#FEF9C3', G: '#D97706' });
  }
  if (item.category === 'consumable') {
    const color =
      item.consumableKind === 'heal_potion'
        ? '#EF4444'
        : item.consumableKind === 'mana_potion'
          ? '#3B82F6'
          : '#A78BFA';
    return bakeMatrix(`loot_pot_${color}`, [
      '................',
      '......oooo......',
      '.....oBBBBo.....',
      '......oGGo......',
      '.....oWWWWo.....',
      '....oWCCCCWo....',
      '...oWCCCCCCWo...',
      '...oCCCCCCCCo...',
      '...oCCCCCCCCo...',
      '...oCCCCCCCCo...',
      '....oCCCCCCo....',
      '.....oooooo.....',
      '................',
      '................',
      '................',
      '................',
    ], { o: '#090B10', B: '#92400E', G: '#CBD5E1', W: '#E2E8F0', C: color });
  }
  if (item.category === 'inscription') {
    const isRune = item.inscriptionCategory === 'rune';
    const core = isRune ? '#38BDF8' : '#34D399';
    const glow = isRune ? '#E0F2FE' : '#D1FAE5';
    return bakeMatrix(`loot_inscr_${item.inscriptionCategory ?? 'rune'}`, [
      '................',
      '.....oooooo.....',
      '....oSSSSSSo....',
      '...oSSCCCCSSo...',
      '...oSCGGGGCSO...',
      '...oSCGWWGCSO...',
      '...oSCGWWGCSO...',
      '...oSCGGGGCSO...',
      '...oSSCCCCSSo...',
      '...oSSssssSSo...',
      '....oSSSSSSo....',
      '.....oooooo.....',
      '................',
      '................',
      '................',
      '................',
    ], { o: '#090B10', S: '#475569', s: '#334155', O: '#090B10', C: core, G: glow, W: '#FFFFFF' });
  }
  const rarColor =
    item.rarity === 'Relic'
      ? '#F59E0B'
      : item.rarity === 'Epic'
        ? '#C084FC'
        : item.rarity === 'Rare'
          ? '#60A5FA'
          : item.rarity === 'Uncommon'
            ? '#4EA885'
            : '#CBD5E1';
  return bakeMatrix(`loot_gear_${rarColor}`, WEAPON_SWORD, {
    o: '#090B10',
    M: rarColor,
    G: '#FBBF24',
    H: '#78350F',
    W: '#78350F',
    R: rarColor,
    r: '#FFFFFF',
  });
}
