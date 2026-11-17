// Garth's own voice (comedy tone, Nov 17, 2026). The town roasts Garth;
// these are Garth talking back — boastful, oblivious, occasionally right.
// App.tsx watches the run and logs one line per event, rate-limited so the
// log stays readable. Pure data + pure picking logic, so it is testable.

export type GarthEvent =
  | 'kill'
  | 'bossKill'
  | 'levelUp'
  | 'lowHp'
  | 'newFloor'
  | 'bigLoot'
  | 'town';

export const GARTH_LINES: Record<GarthEvent, string[]> = {
  kill: [
    'Another one for the ballad.',
    'Did everyone see that? Somebody tell me they saw that.',
    'That one was mostly technique.',
    'Hah! I’ll call that one a warm-up.',
    'Write it down, someone. Big letters.',
    'Flawless. Ignore the limp.',
    'He started it. Technically I started it. Details.',
  ],
  bossKill: [
    'And THAT is why they call me — well. They call me it for a lot of reasons.',
    'Tell the bards. Tell them all. Tell them twice.',
    'I want it noted I only screamed a little.',
    'Was that the boss? Felt like a mid-sized boss. A bossette.',
  ],
  levelUp: [
    'I can feel it. I am now at least eleven percent more legendary.',
    'Stronger. Wiser. Possibly taller.',
    'Level up! Somebody ring a bell. Not THAT bell.',
    'Every scar a lesson. Every lesson, frankly, a bit late.',
  ],
  lowHp: [
    'This is fine. This is all part of the plan.',
    'Tactical bleeding. Very advanced. You wouldn’t understand.',
    'If I die down here, tell Mira the wart cream was for a friend.',
    'I’m not losing. I’m building suspense.',
  ],
  newFloor: [
    'Deeper we go. Legends don’t take the stairs back up.',
    'Smells like danger. And mildew. Mostly mildew.',
    'Hello, darkness. It’s me. Garth. You’ve heard of me.',
    'Another floor, another chapter in the memoir.',
  ],
  bigLoot: [
    'Ooh. Shiny. And exactly my size, probably.',
    'The deep recognises talent.',
    'This changes everything. Until the next shiny thing.',
  ],
  town: [
    'Back by popular demand.',
    'Hold your applause. Actually, no, go on.',
    'Oakhaven! Did you miss me? You can say it.',
  ],
};

/** Minimum turns between two ordinary quips, so the log never fills with Garth. */
export const QUIP_COOLDOWN_TURNS = 8;
/** Share of ordinary kills that earn a quip (the rest pass in heroic silence). */
export const KILL_QUIP_CHANCE = 0.25;

/** Events that always speak, regardless of cooldown or chance. */
const ALWAYS: ReadonlySet<GarthEvent> = new Set(['bossKill', 'levelUp']);

export function shouldQuip(event: GarthEvent, turnsSinceLastQuip: number, roll: number): boolean {
  if (ALWAYS.has(event)) return true;
  if (turnsSinceLastQuip < QUIP_COOLDOWN_TURNS) return false;
  if (event === 'kill') return roll < KILL_QUIP_CHANCE;
  return true;
}

/** Pick a line, never repeating the previous one for the same event. */
export function pickGarthLine(event: GarthEvent, roll: number, previous?: string): string {
  const pool = GARTH_LINES[event];
  let idx = Math.min(pool.length - 1, Math.floor(roll * pool.length));
  if (pool.length > 1 && pool[idx] === previous) idx = (idx + 1) % pool.length;
  return pool[idx];
}

export function formatGarthLine(line: string): string {
  return `Garth: “${line}”`;
}
