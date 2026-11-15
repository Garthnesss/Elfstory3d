// Persisted player-facing settings (Phase 2 "top-end shell").
//
// Settings live outside the save-slot bundles on purpose: they are a
// per-device preference, not part of a run, so they survive New Adventure,
// Play Again, and slot deletes. Storage access is injectable so the
// load/save/validation logic can be unit-tested without a DOM.

// ---------------------------------------------------------------- keymap
// Remappable keyboard bindings (Phase 4). The actions below are exactly the
// single-key actions the App.tsx keyboard handler implements — no invented
// actions. Fixed (never remappable): arrow keys always move (hardcoded
// fallback), Enter always interacts/confirms, Escape, Tab (cycle target),
// and the number row 1–8 for skills/runes/inscriptions.

export type KeyAction =
  | 'moveUp'
  | 'moveDown'
  | 'moveLeft'
  | 'moveRight'
  | 'wait'
  | 'interact'
  | 'explore'
  | 'rest'
  | 'quickHeal'
  | 'skills'
  | 'inventory'
  | 'journal'
  | 'map'
  | 'guide';

export type Keymap = Record<KeyAction, string>;

/** Actions in display/resolution order (resolution is first-match). */
export const KEY_ACTIONS: KeyAction[] = [
  'moveUp',
  'moveDown',
  'moveLeft',
  'moveRight',
  'wait',
  'interact',
  'explore',
  'rest',
  'quickHeal',
  'skills',
  'inventory',
  'journal',
  'map',
  'guide',
];

export const KEY_ACTION_LABELS: Record<KeyAction, string> = {
  moveUp: 'Move Up',
  moveDown: 'Move Down',
  moveLeft: 'Move Left',
  moveRight: 'Move Right',
  wait: 'Wait a Turn',
  interact: 'Interact / Confirm',
  explore: 'Auto-Explore',
  rest: 'Rest',
  quickHeal: 'Quick Heal (Potion)',
  skills: 'Skills Panel',
  inventory: 'Inventory Panel',
  journal: 'Journal Panel',
  map: 'Map / Travel Panel',
  guide: 'Guide / Legend',
};

export const DEFAULT_KEYMAP: Keymap = {
  moveUp: 'w',
  moveDown: 's',
  moveLeft: 'a',
  moveRight: 'd',
  wait: '.',
  interact: ' ',
  explore: 'z',
  rest: 'r',
  quickHeal: 'q',
  skills: 'k',
  inventory: 'i',
  journal: 'j',
  map: 'm',
  guide: '?',
};

const ARROW_ACTIONS: Record<string, KeyAction> = {
  ArrowUp: 'moveUp',
  ArrowDown: 'moveDown',
  ArrowLeft: 'moveLeft',
  ArrowRight: 'moveRight',
};

/**
 * Normalize a KeyboardEvent.key into a bindable key token, or null when the
 * key cannot be bound: named keys (Escape, Enter, Tab, arrows, modifiers,
 * function keys…) and digits (the number row stays fixed for skills/runes).
 * Letters are stored lowercase so Shift doesn't create a second binding.
 */
export function normalizeKeyInput(key: string): string | null {
  if (key === ' ') return ' ';
  if (typeof key !== 'string' || key.length !== 1) return null;
  if (key >= '0' && key <= '9') return null;
  return key.toLowerCase();
}

/**
 * Merge a stored (possibly partial / legacy / hostile) keymap over the
 * defaults. First claim wins on duplicates so resolution stays
 * deterministic; invalid entries fall back to that action's default.
 * The result NEVER contains a duplicate binding: an action whose stored
 * key and default are both already claimed is deferred and takes the
 * first still-free key (defaults first, then letters) instead of
 * silently shadowing the earlier action.
 */
export function mergeKeymap(raw: unknown): Keymap {
  const source =
    raw && typeof raw === 'object' ? (raw as Partial<Record<KeyAction, unknown>>) : {};
  const out = {} as Keymap;
  const used = new Set<string>();
  const deferred: KeyAction[] = [];
  for (const action of KEY_ACTIONS) {
    const candidate =
      typeof source[action] === 'string' ? normalizeKeyInput(source[action] as string) : null;
    if (candidate !== null && !used.has(candidate)) {
      out[action] = candidate;
      used.add(candidate);
    } else if (!used.has(DEFAULT_KEYMAP[action])) {
      out[action] = DEFAULT_KEYMAP[action];
      used.add(DEFAULT_KEYMAP[action]);
    } else {
      deferred.push(action);
    }
  }
  if (deferred.length > 0) {
    const fallbackPool = [
      ...KEY_ACTIONS.map((a) => DEFAULT_KEYMAP[a]),
      ...'abcdefghijklmnopqrstuvwxyz'.split(''),
    ];
    for (const action of deferred) {
      const key = fallbackPool.find((k) => !used.has(k));
      if (key === undefined) break; // unreachable: pool exceeds action count
      out[action] = key;
      used.add(key);
    }
  }
  return out;
}

/**
 * Rebind one action. If the pressed key already belongs to another
 * remappable action, the two bindings SWAP (the other action takes the
 * rebound action's old key). Unbindable keys leave the keymap unchanged.
 */
export function rebindKeymap(keymap: Keymap, action: KeyAction, rawKey: string): Keymap {
  const key = normalizeKeyInput(rawKey);
  if (key === null) return keymap;
  if (keymap[action] === key) return keymap;
  const next: Keymap = { ...keymap };
  const other = KEY_ACTIONS.find((a) => a !== action && keymap[a] === key);
  if (other) next[other] = keymap[action];
  next[action] = key;
  return next;
}

/**
 * The single resolver the App keyboard handler routes through: which
 * remappable action (if any) a keypress means. Arrow keys always resolve
 * to movement and Enter always resolves to interact, regardless of the
 * keymap; everything else consults the keymap.
 */
export function resolveKeyAction(keymap: Keymap, rawKey: string): KeyAction | null {
  const arrow = ARROW_ACTIONS[rawKey];
  if (arrow) return arrow;
  if (rawKey === 'Enter') return 'interact';
  const key = normalizeKeyInput(rawKey);
  if (key === null) return null;
  for (const action of KEY_ACTIONS) {
    if (keymap[action] === key) return action;
  }
  return null;
}

/** Human-readable label for a bound key token. */
export function formatKeyLabel(key: string): string {
  if (key === ' ') return 'Space';
  if (key.length === 1) return key.toUpperCase();
  return key;
}

// ------------------------------------------------------- accessibility
// Phase 6 "reach & refinement": UI text size and pattern signals.

export type TextSize = 'compact' | 'standard' | 'large';

export const TEXT_SIZE_OPTIONS: readonly TextSize[] = ['compact', 'standard', 'large'];

export const TEXT_SIZE_LABELS: Record<TextSize, string> = {
  compact: 'Compact',
  standard: 'Standard',
  large: 'Large',
};

export function isTextSize(value: unknown): value is TextSize {
  return value === 'compact' || value === 'standard' || value === 'large';
}

/**
 * Root font size (px) for a text-size choice. App applies this to
 * <html>, which scales every rem-based UI text size in one move; the
 * canvas map renders in fixed pixels and is deliberately unaffected.
 */
export function textSizeRootPx(size: TextSize): number {
  return size === 'compact' ? 14 : size === 'large' ? 18 : 16;
}

/**
 * The canvas pattern-signal decision, factored pure so it is testable:
 * the "!" marker is drawn on a telegraph tile exactly when the player
 * has pattern signals on and the tile is telegraphed. When the setting
 * is off, telegraph rendering is byte-for-byte the pre-Phase-6 wash.
 */
export function shouldDrawTelegraphMarker(patternSignals: boolean, isTelegraphTile: boolean): boolean {
  return patternSignals && isTelegraphTile;
}

export interface GameSettings {
  /** SFX volume, 0..1. */
  sfxVolume: number;
  /** Music volume, 0..1. */
  musicVolume: number;
  /** Master mute (covers SFX and music). */
  muted: boolean;
  /** Whether combat hit screen-shake is allowed. */
  screenShake: boolean;
  /** Remappable keyboard bindings (Phase 4), merged over defaults on load. */
  keymap: Keymap;
  /** UI text size (Phase 6 accessibility), applied as a root font scale. */
  textSize: TextSize;
  /** Phase 6 accessibility: draw a "!" marker on telegraphed danger
   *  tiles so incoming attacks are never signalled by colour alone. */
  patternSignals: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  sfxVolume: 0.9,
  musicVolume: 0.65,
  muted: false,
  screenShake: true,
  keymap: DEFAULT_KEYMAP,
  textSize: 'standard',
  patternSignals: true,
};

export const SETTINGS_KEY = 'elfstory-settings';
/** P0-era standalone mute key. Still read as a fallback and still written,
 *  so older builds / tooling that know this key keep working. */
export const LEGACY_MUTED_KEY = 'elfstory-muted';
export const TILE_SIZE_KEY = 'elfstory-tile-size';
export const TUTORIAL_DONE_KEY = 'elfstory-tutorial-done';

/** Tile zoom steps, mirrored from AsciiCanvas (kept in sync deliberately:
 *  the settings menu offers exactly these three sizes). */
export const TILE_SIZE_STEPS: readonly number[] = [28, 36, 44];
export const DEFAULT_TILE_SIZE = 36;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStorage(): StorageLike | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    // storage access can throw in hardened/private contexts
  }
  return null;
}

export function clampVolume(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/**
 * Load settings, tolerating: no storage, a missing blob, corrupt JSON,
 * partial blobs from older/newer builds, and the P0 legacy mute key.
 * Unknown fields are ignored; missing/invalid fields fall back to defaults.
 */
export function loadSettings(storage: StorageLike | null = defaultStorage()): GameSettings {
  const out: GameSettings = { ...DEFAULT_SETTINGS };
  if (!storage) return out;

  // Legacy P0 mute preference applies first so a blob without `muted`
  // still honours the player's older choice.
  try {
    const legacy = storage.getItem(LEGACY_MUTED_KEY);
    if (legacy !== null) out.muted = legacy === '1';
  } catch {
    // ignore — defaults stand
  }

  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (!raw) return out;
    const parsed = JSON.parse(raw) as Partial<GameSettings> | null;
    if (!parsed || typeof parsed !== 'object') return out;
    out.sfxVolume = clampVolume(parsed.sfxVolume, out.sfxVolume);
    out.musicVolume = clampVolume(parsed.musicVolume, out.musicVolume);
    out.muted = asBoolean(parsed.muted, out.muted);
    out.screenShake = asBoolean(parsed.screenShake, out.screenShake);
    // Phase 6 accessibility fields: blobs written before Phase 6 simply
    // lack them and hydrate to the defaults (Standard text, signals on).
    out.textSize = isTextSize(parsed.textSize) ? parsed.textSize : out.textSize;
    out.patternSignals = asBoolean(parsed.patternSignals, out.patternSignals);
    // Keymap merges over defaults, so blobs written before Phase 4 (or
    // with a partial/hostile keymap) hydrate to a complete binding set.
    out.keymap = mergeKeymap(parsed.keymap);
    return out;
  } catch {
    return out;
  }
}

export function saveSettings(settings: GameSettings, storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    storage.setItem(LEGACY_MUTED_KEY, settings.muted ? '1' : '0');
  } catch {
    // preference just won't persist — never fatal
  }
}

export function loadTileSize(storage: StorageLike | null = defaultStorage()): number {
  if (!storage) return DEFAULT_TILE_SIZE;
  try {
    const v = Number(storage.getItem(TILE_SIZE_KEY));
    if (TILE_SIZE_STEPS.includes(v)) return v;
  } catch {
    // fall through to default
  }
  return DEFAULT_TILE_SIZE;
}

export function saveTileSize(tileSize: number, storage: StorageLike | null = defaultStorage()): void {
  if (!storage || !TILE_SIZE_STEPS.includes(tileSize)) return;
  try {
    storage.setItem(TILE_SIZE_KEY, String(tileSize));
  } catch {
    // ignore — preference just won't persist
  }
}

export function isTutorialDone(storage: StorageLike | null = defaultStorage()): boolean {
  if (!storage) return true; // no storage => never nag, treat as done
  try {
    return storage.getItem(TUTORIAL_DONE_KEY) === '1';
  } catch {
    return true;
  }
}

export function markTutorialDone(storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(TUTORIAL_DONE_KEY, '1');
  } catch {
    // ignore
  }
}
