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
  // Comedy pass (Nov 17, 2026, Garth's pick): the town has met Garth. The
  // town is not impressed. Each NPC keeps their old job and voice; the
  // joke is always on Garth's legend, never on the NPC.
  torin: [
    'Back again? That sword isn’t dull, lad. You’re just hitting walls with it.',
    'I forged a blade for a real hero once. He also talked less.',
    '“Big Dick” Elfstrom. I asked once. I will not be asking again.',
  ],
  mira: [
    'Drink the red one, dear. Not the green one. The green one is for warts.',
    'You’ve the complexion of a man who licked a spore pool. Did you lick a spore pool?',
    'I sell potions, not dignity. You’ll have to find that downstairs.',
  ],
  vance: [
    'The Reliquary eats the unprepared. You’ll be a snack, then.',
    'I’ve sent eleven heroes below this season. You’re the loudest.',
    'Smile less at the crypt, Elfstrom. It encourages it.',
  ],
  vex: [
    'You didn’t see me. Mostly because you walked into the fountain.',
    'Everything has a price. Your autograph? Negative, it turns out.',
    'Psst. Hero. Your cape is tucked into your belt. Has been all week.',
  ],
  lyra: [
    'The steles say a great hero will come. They do not say this one.',
    'Please stop touching the Bell. Bronze remembers. So do I.',
    'You transcribe like a man who learned letters from a menu.',
  ],
  corvus: [
    'Your heroic deeds require Form 7-B. In triplicate. Signed, not drawn.',
    'The Citadel endures because someone files the paperwork. That someone is not you.',
    'Self-appointed “Champion of the Realm.” That title requires a fee.',
  ],
  kaelen: [
    'Train. Temper. Then descend. You did those in the wrong order again.',
    'The Guild wall of heroes has room for your portrait. Small room. Hallway, really.',
    'Every delver who returns makes the next one braver. You make them confused.',
  ],
  orin: [
    'Bring me anything that hums. Not you. You hum. Stop humming.',
    'Four relic sets in the deep, and you’re wearing half of three. Bold.',
  ],
  sylva: [
    'The fen speaks. Today it said “who is that loud elf.”',
    'Frogs first, then silence, then teeth. Then you, apologising to the teeth.',
  ],
  bram: [
    'If it glows, pocket it. If it ticks, run. If it’s you, I’ve learned to hide.',
    'Found a gear older than the Citadel. Still works better than your plan.',
  ],
  halda: [
    'Volcanic steel forgives. I do not. You owe me for the anvil.',
    'Hold the hammer by the handle, Elfstrom. The other handle.',
  ],
  darek: [
    'Barrow, Hollow, Caldera — three ways to die and you’ve got a favourite.',
    'Report anything that glows below. Not your armour. We know about the armour.',
  ],
  rowan: [
    'Roads are just rivers that learned manners. You, friend, are still a flood.',
    'Six steles make a survey. Six. Not five and a drawing of a horse.',
  ],
  pell: [
    'I haul ore up and stories down. Yours keep getting longer and the ore doesn’t.',
    'Need a lift to the vale? Cart’s full. Of your fan mail. Joking. It’s turnips.',
  ],
  wren: [
    'Blessings are free. Candles cost a copper. Ego is extra.',
    'I prayed for a hero. The gods have a sense of humour.',
    'The shrine heals wounds, Elfstrom. Not that kind.',
  ],
  tomas: [
    'Page Tomas! I’m writing your biography! It’s mostly falling down stairs.',
    'Are you THE Garth? My mum says you’re why the fountain has a fence.',
  ],
  fenwick: [
    'Fenwick fishes what the fen gives. Today: boots. Yesterday: your boots.',
    'Heard you fought a frog. Heard the frog won on points.',
  ],
  sella: [
    'If it isn’t on my list, it isn’t in the Bastion. You are not on my list.',
    'Rations, rope, rime-wool, and one jar of “hero confidence” — that’s yours, it was empty.',
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
