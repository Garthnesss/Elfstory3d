import { CritterKind, CritterState, NpcPlacement, ZoneMap } from './types';

// ---------------------------------------------------------------------------
// Phase 3 — ambient life: critters, wandering townsfolk, NPC barks, and
// per-biome dungeon flavour lines. Everything here is pure presentation:
// critters never block movement, pathing, combat, or quests, and NPC wander
// only shuffles ambient townsfolk a few tiles around their post.
// ---------------------------------------------------------------------------

function chebyshev(ax: number, ay: number, bx: number, by: number): number {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

let critterSeq = 1;

export const CRITTER_DEFS: Record<CritterKind, { name: string; glyph: string; color: string }> = {
  vale_rabbit: { name: 'Vale Rabbit', glyph: 'r', color: '#E7E5E4' },
  ash_fox: { name: 'Ash Fox', glyph: 'f', color: '#F97316' },
  cinder_crow: { name: 'Cinder Crow', glyph: 'k', color: '#A8A29E' },
  cave_bat: { name: 'Cave Bat', glyph: 'b', color: '#A8A29E' },
  town_cat: { name: 'Town Cat', glyph: 'c', color: '#F59E0B' },
  fen_frog: { name: 'Fen Frog', glyph: 'g', color: '#4ADE80' },
};

export function makeCritter(kind: CritterKind, x: number, y: number): CritterState {
  const def = CRITTER_DEFS[kind];
  critterSeq += 1;
  return {
    id: `crit_${kind}_${critterSeq}`,
    kind,
    name: def.name,
    glyph: def.glyph,
    color: def.color,
    x,
    y,
    homeX: x,
    homeY: y,
  };
}

const DIRS = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
];

/** Tiles a critter may stand on: plain ground only — never interactables,
 *  hazards, stairs, or water, so ambience can never mask gameplay. */
function critterTileOk(zone: ZoneMap, x: number, y: number): boolean {
  const t = zone.tiles[y]?.[x];
  if (!t || !t.walkable) return false;
  return t.kind === 'floor' || t.kind === 'road';
}

export function stepCritters(
  critters: CritterState[],
  zone: ZoneMap,
  playerPos: { x: number; y: number }
): CritterState[] {
  if (critters.length === 0) return critters;
  const occupied = new Set<string>();
  for (const e of zone.enemies) occupied.add(`${e.x},${e.y}`);
  for (const n of zone.npcs) occupied.add(`${n.x},${n.y}`);
  occupied.add(`${playerPos.x},${playerPos.y}`);
  for (const c of critters) occupied.add(`${c.x},${c.y}`);

  return critters.map((c) => {
    const distToPlayer = chebyshev(c.x, c.y, playerPos.x, playerPos.y);
    const candidates: Array<{ x: number; y: number }> = [];
    for (const { dx, dy } of DIRS) {
      const nx = c.x + dx;
      const ny = c.y + dy;
      if (nx === c.x && ny === c.y) continue;
      if (!critterTileOk(zone, nx, ny)) continue;
      if (occupied.has(`${nx},${ny}`)) continue;
      if (chebyshev(nx, ny, c.homeX, c.homeY) > 5) continue;
      candidates.push({ x: nx, y: ny });
    }
    if (candidates.length === 0) return c;

    if (distToPlayer <= 2) {
      // Flee: take the step that maximises distance from the player.
      let best = candidates[0];
      let bestDist = chebyshev(best.x, best.y, playerPos.x, playerPos.y);
      for (const cand of candidates.slice(1)) {
        const d = chebyshev(cand.x, cand.y, playerPos.x, playerPos.y);
        if (d > bestDist) {
          best = cand;
          bestDist = d;
        }
      }
      if (bestDist <= distToPlayer) return c;
      occupied.delete(`${c.x},${c.y}`);
      occupied.add(`${best.x},${best.y}`);
      return { ...c, x: best.x, y: best.y };
    }

    if (Math.random() < 0.4) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      occupied.delete(`${c.x},${c.y}`);
      occupied.add(`${pick.x},${pick.y}`);
      return { ...c, x: pick.x, y: pick.y };
    }
    return c;
  });
}

/** Ambient townsfolk (NpcPlacement.roams) shuffle a few tiles around their
 *  post. Named quest NPCs never roam — they hold their posts. */
export function stepNpcWander(
  npcs: NpcPlacement[],
  zone: ZoneMap,
  playerPos: { x: number; y: number }
): NpcPlacement[] {
  if (!npcs.some((n) => n.roams)) return npcs;
  const occupied = new Set<string>();
  for (const e of zone.enemies) occupied.add(`${e.x},${e.y}`);
  for (const n of npcs) occupied.add(`${n.x},${n.y}`);
  for (const c of zone.critters ?? []) occupied.add(`${c.x},${c.y}`);
  occupied.add(`${playerPos.x},${playerPos.y}`);

  return npcs.map((n) => {
    if (!n.roams) return n;
    if (Math.random() >= 0.3) return n;
    const homeX = n.homeX ?? n.x;
    const homeY = n.homeY ?? n.y;
    const options: Array<{ x: number; y: number }> = [];
    for (const { dx, dy } of DIRS) {
      const nx = n.x + dx;
      const ny = n.y + dy;
      const t = zone.tiles[ny]?.[nx];
      if (!t || !t.walkable) continue;
      if (t.kind !== 'floor' && t.kind !== 'road') continue;
      if (occupied.has(`${nx},${ny}`)) continue;
      if (chebyshev(nx, ny, homeX, homeY) > 3) continue;
      options.push({ x: nx, y: ny });
    }
    if (options.length === 0) return n;
    const pick = options[Math.floor(Math.random() * options.length)];
    occupied.delete(`${n.x},${n.y}`);
    occupied.add(`${pick.x},${pick.y}`);
    return { ...n, x: pick.x, y: pick.y, homeX, homeY };
  });
}

// ---------------------------------------------------------------------------
// NPC bark lines — short ambient dialogue surfaced in the log when the player
// lingers near townsfolk.
// ---------------------------------------------------------------------------

export const NPC_BARKS: Record<string, string[]> = {
  torin: [
    'Mind the sparks, traveler — good steel complains before it breaks.',
    'Another blade for the deep? The vaults provide, one way or another.',
  ],
  mira: [
    'Nightbloom’s up early this year. The blight is restless.',
    'Dry your boots by my brazier, dear. The fen takes toes.',
  ],
  vance: [
    'Watch reports quiet. Too quiet, if you ask me.',
    'Keep your lantern trimmed. The Reliquary eats the unprepared.',
  ],
  vex: [
    'You didn’t see me. That’s the arrangement.',
    'Everything in the deep has a price. Even silence.',
  ],
  lyra: [
    'The steles are waking, one by one. Someone is reading the deep roads again.',
    'Mind the Bell’s temper. Bronze remembers.',
  ],
  corvus: [
    'Petitions before noon. Grievances after. Order, always.',
    'The Citadel endures because someone files the paperwork.',
  ],
  kaelen: [
    'Every delver who returns makes the next descent cheaper in blood.',
    'Train. Temper. Then descend. In that order.',
  ],
  orin: [
    'Four sets walk the deep now. Four! My ledger sings.',
    'Bring me anything that hums. I pay in coin and gossip.',
  ],
  sylva: [
    'The Hollow breathes slower when the heart-bloom is left in peace.',
    'Frogs first, then silence, then teeth. That is the fen’s grammar.',
  ],
  bram: [
    'Found a gear down there older than the Citadel. Still ticking!',
    'If it glows, pocket it. If it ticks, run. Words to live by.',
  ],
  halda: [
    'Volcanic steel forgives; rime steel remembers. Choose your temper.',
    'Kaelthar’s temper is in every Caldera ingot, I swear it.',
  ],
  darek: [
    'Barrow, Hollow, Caldera — the Vale keeps its teeth in three pockets.',
    'Report anything that glows below. Anything.',
  ],
  rowan: [
    'Roads are just rivers that learned manners.',
    'Six steles make a survey. The deep roads reward the literate.',
  ],
  pell: [
    'Cart’s axle’s older than the Outpost and twice as stubborn.',
    'I haul ore up and stories down. Stories pay worse, weigh less.',
  ],
  wren: [
    'Sister Wren keeps the shrine candles and the Outpost’s secrets. Both lit.',
    'Blessings are free. Candles cost a copper. Priorities.',
  ],
  tomas: [
    'Page Tomas, at your service! Messages, maps, and misplaced magistrates.',
    'I know every stair in Highspire. I have fallen down most of them.',
  ],
  fenwick: [
    'Fenwick fishes what the fen gives. Today: boots. Yesterday: boots.',
    'The frogs sing when the Hollow is calm. Listen before you wade.',
  ],
  sella: [
    'Quartermaster Sella. If it isn’t on my list, it isn’t in the Bastion.',
    'Rations, rope, rime-wool. The mountain provides the rest — rudely.',
  ],
};

export function pickAmbientBark(
  zone: ZoneMap,
  playerPos: { x: number; y: number }
): { npc: NpcPlacement; line: string } | null {
  const nearby = zone.npcs.filter(
    (n) => NPC_BARKS[n.id]?.length && chebyshev(n.x, n.y, playerPos.x, playerPos.y) <= 8
  );
  if (nearby.length === 0) return null;
  const npc = nearby[Math.floor(Math.random() * nearby.length)];
  const lines = NPC_BARKS[npc.id];
  return { npc, line: lines[Math.floor(Math.random() * lines.length)] };
}

// ---------------------------------------------------------------------------
// Dungeon ambient flavour — low-frequency log lines keyed by biome.
// ---------------------------------------------------------------------------

export const DUNGEON_AMBIENCE: Record<string, string[]> = {
  reliquary: [
    'Water drips somewhere in the dark, patient as a metronome.',
    'Moss muffles your steps. Something else’s, too.',
    'A draft carries the smell of old rain and older bone.',
  ],
  ossuary: [
    'Somewhere, a bone settles in its niche with a soft click.',
    'Frost feathers across the flagstones behind you.',
    'A choir-shaped silence hangs over the galleries.',
  ],
  ember: [
    'The basalt ticks as it cools, like a cooling forge-heart.',
    'Ember-light pulses through a crack, then fades.',
    'Heat shimmers off the vault seams ahead.',
  ],
  crucible: [
    'Brass gears turn inside the walls, counting something.',
    'A distant bell tolls once, for nobody.',
    'The air tastes of copper and candle-smoke.',
  ],
  sanctum: [
    'Black glass hums at the edge of hearing.',
    'Your lantern flame leans toward the throne-dark, as if bowing.',
    'Cinder motes drift upward, against all reason.',
  ],
  abyss: [
    'The dark here has a texture, like wet velvet.',
    'Somewhere below, something enormous turns in its sleep.',
    'The stair behind you sounds farther away than it should.',
  ],
  barrow: [
    'Whispers braid through the barrow dark — names, mostly.',
    'Funeral dust sifts from the ceiling in a slow hourglass.',
    'A cold spot crosses the corridor, deliberate as a patrol.',
  ],
  mire: [
    'Spores drift like green snow in your lantern light.',
    'Something plops, far off, in the flooded dark.',
    'The mycelium underfoot pulses faintly, keeping a slow time.',
  ],
  frost: [
    'Rime crystals chime as your warmth passes.',
    'Your breath hangs in the air a moment too long.',
    'Far below the ice, the caldera grumbles like a forge.',
  ],
};

export function pickDungeonAmbience(zone: ZoneMap): string | null {
  let key: string;
  if (zone.id.startsWith('barrow_')) key = 'barrow';
  else if (zone.id.startsWith('mire_')) key = 'mire';
  else if (zone.id.startsWith('frost_')) key = 'frost';
  else if (zone.depth === 1) key = 'reliquary';
  else if (zone.depth === 2) key = 'ossuary';
  else if (zone.depth === 3) key = 'ember';
  else if (zone.depth === 4) key = 'crucible';
  else if (zone.depth === 5) key = 'sanctum';
  else key = 'abyss';
  const lines = DUNGEON_AMBIENCE[key];
  if (!lines?.length) return null;
  return lines[Math.floor(Math.random() * lines.length)];
}
