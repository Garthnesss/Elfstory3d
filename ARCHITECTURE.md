# ElfStory — Architecture

## Big picture
A single-page React app. All game logic lives in pure-ish TypeScript modules under `src/game/`; `src/App.tsx` is the game loop and state owner (~6,800 lines, one component holding 152 hooks); `src/components/` are presentational modals/HUD/canvas driven entirely by App state. There is no server and no network dependency — persistence is localStorage only (Firebase cloud saves were removed Nov 17, 2026).

```
TitleScreen ──► App.tsx (turn loop, state, saves) ──► PerspectiveCanvas (full 3D render)
                     │  ├─ src/game/world.ts    — zone & floor generation
                     │  ├─ src/game/combat.ts   — visibility, pathfinding, hit math
                     │  ├─ src/game/skills.ts   — attributes, trees, derived stats
                     │  ├─ src/game/loot.ts     — gear generation, relics, runeforge
                     │  ├─ src/game/npcs.ts     — dialogue trees, quest defs
                     │  ├─ src/game/audio.ts    — Web Audio SFX + generative music
                     │  ├─ src/game/ambient.ts  — zone life: townsfolk, barks, critters
                     │  ├─ src/game/quests.ts   — quest "Next:" guidance derivation
                     │  ├─ src/game/difficulty.ts— difficulty tiers + NG+ cycle scalers
                     │  ├─ src/game/saveSlots.ts— SAVE_VERSION, slots, death-stamp policy
                     │  ├─ src/game/settings.ts — per-device settings blob + keymap
                     │  ├─ src/game/tutorial.ts — first-run tutorial steps
                     │  ├─ src/game/coachMarks.ts— one-time contextual hints
                     │  ├─ src/game/gamepad.ts  — gamepad polling/mapping
                     │  ├─ src/game/runRules.ts — pure run rules (save pruning, ending gate)
                     │  ├─ src/game/garthVoice.ts — Garth's log quips (comedy tone)
                     │  └─ src/game/zonePacking.ts — RLE zone packing for local saves
                     └─ src/components/*.tsx    — modals, HUD, dock, canvas
```

## Components
- **`src/App.tsx`** — owns all state (player, zones, flags, quests, merchants, logs), the turn loop, enemy/companion AI execution, hazard/DoT resolution, save/load, and every handler. Anything that happens in the game passes through here.
- **`src/game/world.ts`** — zone constructors for the 5 hand-authored maps (4 towns + overworld) and `generateDungeonFloor(depth, {skipStoryBoss})` for main, side (via `generateSideDungeonFloor`), and Abyss floors; `createEnemy` / `promoteEnemyRank` hold all enemy base stats and depth scaling.
- **`src/game/combat.ts`** — shadowcasting visibility, corner-safe pathfinding (`findPathNextStep`, `findPathPoints`, `findAutoExploreTarget`), enemy intent selection (telegraphs), `calculatePlayerHit`.
- **`src/game/skills.ts`** — attribute model, 3 skill trees, Prodigies, `computeDerivedStats` (the single source of derived player stats), `computeRespecPoints`.
- **`src/game/loot.ts`** — procedural item generation, starter/quest/named items, relic sets, rune enchants (`enchantEquipmentItem`), tempering (`upgradeEquipmentItem`), reroll, salvage.
- **`src/game/npcs.ts`** — all branching dialogue trees and `QUEST_DEFS`. Dialogue choices carry `condition` (flag/quest/item checks) and `action`/`extraActions` executed by App.
- **`src/game/zonePacking.ts`** — `SAVE_SLOTS` and the RLE + bitmask tile-row packing (`packZones` / `unpackZones`, backward-compatible with legacy rows) used by local saves.
- **`src/game/garthVoice.ts`** — Garth's quip pools and rate limiting (`shouldQuip`, `pickGarthLine`); one watcher effect in App logs a line on kills, bosses, level-ups, low HP, new depths, big loot and homecomings.
- **`src/game/audio.ts`** — `SoundEngine`: synthesized one-shot SFX plus a fully procedural generative music engine (pad chords + pentatonic melody; town/dungeon/boss themes chosen by `resolveMusicTheme`, crossfaded, gesture-gated).
- **`src/game/ambient.ts`** — zone life: roaming townsfolk, NPC bark lines, critter definitions, points of interest, per-biome dungeon ambience lines.
- **`src/game/quests.ts`** — stage-aware quest guidance ("Next:") derived once and shared by the Journal and the HUD `QuestTracker`.
- **`src/game/difficulty.ts`** — difficulty tiers (Story/Standard/Hardened) and NG+ cycle scalers; the single funnel is `scaleEnemyForDifficulty` inside `createEnemy` (plus `scaleXpForDifficulty` in the XP grant).
- **`src/game/saveSlots.ts`** — `SAVE_VERSION` (= 1), per-slot localStorage reads/writes with corruption isolation, legacy hydration, future-version refusal, and the hardcore death-stamp load policy (`canLoadBundle`).
- **`src/game/settings.ts`** — the per-device settings blob (volumes, mute, shake, zoom, keymap with swap-on-conflict, text size, pattern signals), merged over defaults so older blobs hydrate.
- **`src/game/tutorial.ts`** — the six-step first-run tutorial sequence (data + step gating).
- **`src/game/coachMarks.ts`** — one-time-per-device contextual hints, claimed at the real event point. Only the first-telegraph mark remains; the inscription and Prodigy marks went with those systems on Nov 15, 2026.
- **`src/game/gamepad.ts`** — pure gamepad polling/mapping (standard layout, deadzone, hold-repeat), unit-tested; App feeds it into the same dispatch as the keyboard.
- **`src/game/runRules.ts`** — pure, behaviour-tested run rules that App applies but does not own: `pruneAbyssZones` (called in the one save funnel, `saveBundleToStorage`) and `canOfferReturnToEnding` (the pause-menu gate). New rules of this kind belong here, not inline in App.
- **`src/components/`** — `PerspectiveCanvas` (Three.js full-3D renderer: overhead tactical / chase views + touch), `ActionDock`, `TopHud`, and modals/screens (Inventory, Merchant, Dialogue, QuestJournal, CharacterSkills, TownUpgrades, Travel, Legend, HallOfFame, EndPause, SpecialEncounter, TitleScreen, SettingsModal, EndingScreen, CreditsScreen, QuestTracker, TutorialOverlay).

## Data flow / protocols
- **Turn loop:** player action in App → player resolution (combat.ts math) → companion turn → enemy turns (intent selection in combat.ts, execution in App) → DoT/status ticks → autosave checks.
- **Saves:** `SavedBundle` (player, zones, currentZoneId, worldFlags, quests, merchantStocks, logs) → local: JSON with zones packed via `packZones`, under per-slot localStorage keys; stored Abyss floors are pruned at the save funnel (`pruneAbyssZones`). Every bundle is stamped with `SAVE_VERSION` (= 1, `src/game/saveSlots.ts`): a missing version hydrates as legacy, a newer version is refused gracefully, and reads are per-slot isolated so one corrupt slot never breaks the others.
- **Dialogue:** component renders the node for `activeDialogue`; choice visibility is evaluated from `condition` against player + worldFlags + quests; App executes `action` + `extraActions` atomically on selection.

## Renderer & performance
- **How a zone is drawn** (`sceneBuilder.ts` → `PerspectiveCanvas.tsx`): `buildZoneTerrain` creates one `THREE.Group` per tile holding separate meshes (floor, wall, wall cap, ceiling, props). Geometry and materials are shared through `SceneGeometries` / `SceneMaterialPool`, but nothing is instanced or merged, so **every visible tile part is its own draw call**. `syncTileNode` runs for every tile every frame and swaps materials between three visibility states: `hidden`, `memory` (explored, unseen — tinted, plus a faint self-glow so it stays readable in the dark), `lit`.
- **Measured (Nov 16, 2026, dev build, 1280×800, DPR 2, before that day's trims):** Oakhaven (28×17 tiles) drew 1,437–1,535 draw calls per frame; the first scene build took one 1,150 ms frame. The test Mac held 120 fps regardless, so this cost is invisible on the development machine.
- **Trims in place:** static terrain has `matrixAutoUpdate = false` (anything that moves a tile mesh must call `updateMatrix()` — today only cutaway walls and chest lids do; animated props and tree crowns keep auto-update); ceilings are hidden in Top view; wall caps receive but do not cast shadows.
- **Known limits, not addressed:** per-tile draw calls (needs `InstancedMesh` or merged chunks per visibility state); walls re-rendered into a 2048 px `PCFSoftShadowMap` pass; the `requestAnimationFrame` loop never idles; canvas textures and shaders are built on first use, causing the zone-entry hitch.
- **HUD overlay:** a 2D canvas over the WebGL canvas draws HP bars, rank / intent badges, NPC nameplates and the red threat chevron for every foe in line of sight.

## Dependencies
- React 19, Vite 8 (rolldown), Tailwind CSS v4, TypeScript 7, three.js — plain `npm install` works (the peer conflict left with Firebase's eslint plugin).
- Portraits/backdrop are local JPEGs in `src/assets/images/` (~672 KB total) — no external assets at runtime beyond Google Fonts.

## What's missing
- **No `package-lock.json` in the original handoff** — one was generated during the P0 fix pass (Nov 14, 2026, `npm install --legacy-peer-deps`) and ships with the fixed tree; commit it so installs stay reproducible.
- **Music/ambience shipped** — generative music in `audio.ts` (Phase 2) and zone life in `src/game/ambient.ts` (Phase 3); no longer a gap.
- **ErrorBoundary shipped** — `src/main.tsx` defines an `ErrorBoundary` wrapping `<App/>` since the P0 pass; a render crash shows a recoverable screen instead of a white page.
- **App.tsx is the structural debt.** ~6,800 lines and 152 hooks in one component: turn loop, AI execution, save/load and every handler. Logic inside it cannot be unit-tested, which is why the Phase 7 tests assert on source strings. The way out is incremental: move decisions into pure `src/game/` modules (as `runRules.ts`, `quests.ts`, `difficulty.ts` already do) and test them there.
- **No seeded randomness.** Generation and loot call `Math.random` directly (36 calls in `world.ts`, 7 in `loot.ts`, 23 in `App.tsx`), so a floor cannot be reproduced from a seed; tests swap `Math.random` globally to get determinism.
- **One 1.26 MB JS chunk (353 kB gzip)**, mostly three.js (was 1.85 MB with Firebase, before the Nov 17 cut).
- **No README** in the handoff (this doc set adds one linking the canonical docs).
