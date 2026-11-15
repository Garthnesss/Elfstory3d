import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { COACH_MARK_KEYS, claimCoachMark, coachMarkSeen } from '../src/game/coachMarks';
import {
  GAMEPAD_DEADZONE,
  GAMEPAD_REPEAT_MS,
  GamepadSnapshot,
  GamepadPoller,
  gamepadButtonAction,
  snapshotDirection,
  stickDirection,
} from '../src/game/gamepad';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  loadSettings,
  saveSettings,
  shouldDrawTelegraphMarker,
  textSizeRootPx,
} from '../src/game/settings';

// ---------------------------------------------------------------- fixtures

function makeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    _map: map,
  };
}

/** Fabricate a gamepad snapshot: `pressed` = held button indices. */
function pad(pressed: number[] = [], axes: number[] = [0, 0]): GamepadSnapshot {
  return {
    buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i) })),
    axes,
  };
}

// ---------------------------------------------------------------- gamepad

test('Phase 6 gamepad: standard-layout button mapping', () => {
  assert.equal(gamepadButtonAction(0), 'interact'); // A
  assert.equal(gamepadButtonAction(1), 'cancel'); // B
  assert.equal(gamepadButtonAction(2), 'map'); // X
  assert.equal(gamepadButtonAction(3), 'journal'); // Y
  assert.equal(gamepadButtonAction(4), 'cycleTarget'); // LB
  assert.equal(gamepadButtonAction(5), 'cycleTarget'); // RB
  assert.equal(gamepadButtonAction(8), 'explore'); // Back / Select
  assert.equal(gamepadButtonAction(9), 'pause'); // Start
  assert.equal(gamepadButtonAction(12), 'moveUp'); // DPad
  assert.equal(gamepadButtonAction(13), 'moveDown');
  assert.equal(gamepadButtonAction(14), 'moveLeft');
  assert.equal(gamepadButtonAction(15), 'moveRight');
  // Unbound: triggers and stick clicks.
  assert.equal(gamepadButtonAction(6), null);
  assert.equal(gamepadButtonAction(7), null);
  assert.equal(gamepadButtonAction(10), null);
  assert.equal(gamepadButtonAction(16), null);
});

test('Phase 6 gamepad: stick deadzone and dominant-axis direction', () => {
  assert.equal(stickDirection(0, 0), null);
  assert.equal(stickDirection(GAMEPAD_DEADZONE - 0.15, 0), null);
  assert.equal(stickDirection(0, -(GAMEPAD_DEADZONE - 0.15)), null);
  assert.equal(stickDirection(0.8, 0), 'moveRight');
  assert.equal(stickDirection(-0.8, 0), 'moveLeft');
  assert.equal(stickDirection(0, 0.9), 'moveDown');
  assert.equal(stickDirection(0, -0.9), 'moveUp');
  // Dominant axis wins on diagonals.
  assert.equal(stickDirection(0.8, 0.5), 'moveRight');
  assert.equal(stickDirection(0.5, 0.8), 'moveDown');
  // DPad beats the stick when both are active.
  assert.equal(snapshotDirection(pad([14], [0.9, 0])), 'moveLeft');
  assert.equal(snapshotDirection(pad([], [0.9, 0])), 'moveRight');
});

test('Phase 6 gamepad: buttons fire on press edges only', () => {
  const poller = new GamepadPoller();
  assert.deepEqual(poller.poll(pad([0]), 0), ['interact']);
  assert.deepEqual(poller.poll(pad([0]), 50), []); // held — no re-fire
  assert.deepEqual(poller.poll(pad([0]), 5000), []); // still held, long past repeat window
  assert.deepEqual(poller.poll(pad([]), 5100), []); // released
  assert.deepEqual(poller.poll(pad([0]), 5200), ['interact']); // fresh press
  assert.deepEqual(poller.poll(pad([0, 9]), 5300), ['pause']); // second button edges independently
});

test('Phase 6 gamepad: movement repeats while held, switches instantly', () => {
  const poller = new GamepadPoller();
  assert.deepEqual(poller.poll(pad([13]), 0), ['moveDown']); // engage fires now
  assert.deepEqual(poller.poll(pad([13]), GAMEPAD_REPEAT_MS - 1), []);
  assert.deepEqual(poller.poll(pad([13]), GAMEPAD_REPEAT_MS), ['moveDown']); // first repeat
  assert.deepEqual(poller.poll(pad([13]), GAMEPAD_REPEAT_MS + 20), []);
  // Direction switch re-fires immediately, no repeat wait.
  assert.deepEqual(poller.poll(pad([15]), GAMEPAD_REPEAT_MS + 30), ['moveRight']);
  // Release stops everything; re-engaging fires at once.
  assert.deepEqual(poller.poll(pad([]), GAMEPAD_REPEAT_MS + 40), []);
  assert.deepEqual(poller.poll(pad([12]), GAMEPAD_REPEAT_MS + 50), ['moveUp']);
  // The stick drives the same repeat behaviour.
  const stickPoller = new GamepadPoller();
  assert.deepEqual(stickPoller.poll(pad([], [0, 0.9]), 0), ['moveDown']);
  assert.deepEqual(stickPoller.poll(pad([], [0, 0.9]), GAMEPAD_REPEAT_MS - 10), []);
  assert.deepEqual(stickPoller.poll(pad([], [0, 0.2]), GAMEPAD_REPEAT_MS), []); // back inside deadzone
});

// --------------------------------------------------------------------- PWA

test('Phase 6 PWA: manifest is valid and carries the required fields', () => {
  const raw = readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8');
  const manifest = JSON.parse(raw) as Record<string, unknown>;
  assert.equal(manifest.name, 'ElfStory — The Sunken Citadel');
  assert.equal(manifest.short_name, 'ElfStory');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.background_color, '#0B0D12');
  assert.equal(manifest.theme_color, '#0B0D12');
  const icons = manifest.icons as Array<{ src: string; type?: string }>;
  assert.ok(Array.isArray(icons) && icons.length >= 1, 'manifest declares at least one icon');
  assert.equal(icons[0].type, 'image/svg+xml');
  assert.ok(
    existsSync(new URL(`../public/${icons[0].src}`, import.meta.url)),
    `icon ${icons[0].src} exists on disk`
  );
});

test('Phase 6 PWA: service worker has the versioned cache + navigation fallback', () => {
  const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
  // Phase 7: bumped to v2 to retire the v1 shell, whose cache never held
  // the app bundle (offline boot served HTML with no game in it).
  assert.ok(sw.includes("const CACHE_NAME = 'elfstory-shell-v2'"), 'versioned shell cache name');
  assert.ok(sw.includes("request.mode === 'navigate'"), 'navigation requests are handled');
  assert.ok(sw.includes('index.html'), 'navigation fallback serves the cached index');
  assert.ok(sw.includes('caches.delete'), 'activation cleans up older caches');
  // The shell list covers the manifest + icon the manifest points at.
  assert.ok(sw.includes('manifest.webmanifest'));
  assert.ok(sw.includes('icons/emblem.svg'));
});

test('Phase 7 PWA: service worker runtime-caches same-origin assets for offline boot', () => {
  const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
  assert.ok(sw.includes('cache.put(request, copy)'), 'fetched assets are stored at runtime');
  assert.ok(
    sw.includes('new URL(request.url).origin === self.location.origin'),
    'only same-origin responses are runtime-cached'
  );
  assert.ok(sw.includes('response.ok'), 'only successful responses are cached');
});

// ------------------------------------------------------- accessibility

test('Phase 6 settings: text size + pattern signals round-trip', () => {
  const storage = makeStorage();
  const next = { ...DEFAULT_SETTINGS, textSize: 'large' as const, patternSignals: false };
  saveSettings(next, storage);
  const loaded = loadSettings(storage);
  assert.equal(loaded.textSize, 'large');
  assert.equal(loaded.patternSignals, false);
  assert.equal(loaded.sfxVolume, DEFAULT_SETTINGS.sfxVolume);
});

test('Phase 6 settings: pre-Phase-6 blobs hydrate the accessibility defaults', () => {
  // A Phase 4-era blob: no textSize / patternSignals fields at all.
  const legacy = {
    sfxVolume: 0.4,
    musicVolume: 0.3,
    muted: true,
    screenShake: false,
    keymap: DEFAULT_SETTINGS.keymap,
  };
  const s = loadSettings(makeStorage({ [SETTINGS_KEY]: JSON.stringify(legacy) }));
  assert.equal(s.textSize, 'standard');
  assert.equal(s.patternSignals, true);
  // …and the legacy fields survive untouched.
  assert.equal(s.sfxVolume, 0.4);
  assert.equal(s.muted, true);
  assert.equal(s.screenShake, false);
});

test('Phase 6 settings: hostile accessibility values fall back to defaults', () => {
  const s = loadSettings(
    makeStorage({
      [SETTINGS_KEY]: JSON.stringify({ textSize: 'enormous', patternSignals: 'yes' }),
    })
  );
  assert.equal(s.textSize, 'standard');
  assert.equal(s.patternSignals, true);
});

test('Phase 6 accessibility: root text scale + telegraph marker decision', () => {
  assert.equal(textSizeRootPx('compact'), 14);
  assert.equal(textSizeRootPx('standard'), 16);
  assert.equal(textSizeRootPx('large'), 18);
  assert.equal(shouldDrawTelegraphMarker(true, true), true);
  assert.equal(shouldDrawTelegraphMarker(false, true), false);
  assert.equal(shouldDrawTelegraphMarker(true, false), false);
  assert.equal(shouldDrawTelegraphMarker(false, false), false);
});

// ------------------------------------------------------------- coach-marks

test('Phase 6 coach-marks: each mark fires exactly once per device', () => {
  const storage = makeStorage();
  assert.equal(coachMarkSeen('telegraph', storage), false);
  assert.equal(claimCoachMark('telegraph', storage), true); // first claim shows it
  assert.equal(coachMarkSeen('telegraph', storage), true);
  assert.equal(claimCoachMark('telegraph', storage), false); // never again
  assert.equal(claimCoachMark('telegraph', storage), false);
  assert.equal(storage._map.get(COACH_MARK_KEYS.telegraph), '1');
  // Flags are independent per mark.
  assert.equal(coachMarkSeen('prodigy', storage), false);
  assert.equal(claimCoachMark('prodigy', storage), true);
  assert.equal(claimCoachMark('inscription', storage), true);
  assert.equal(claimCoachMark('prodigy', storage), false);
  // No storage (private mode etc.) = never claim, never nag.
  assert.equal(claimCoachMark('telegraph', null), false);
  assert.equal(coachMarkSeen('telegraph', null), true);
});
