# ElfStory — Architecture

## Big picture
A single-page React app. All game logic lives in pure-ish TypeScript modules under `src/game/`; `src/App.tsx` is the game loop and state owner (5,500+ lines); `src/components/` are presentational modals/HUD/canvas driven entirely by App state. There is no server of ours — persistence is localStorage plus optional Firebase (Auth + Firestore) cloud saves.

```
TitleScreen ──► App.tsx (turn loop, state, saves) ──► PerspectiveCanvas (full 3D render)
                     │  ├─ src/game/world.ts    — zone & floor generation
                     │  ├─ src/game/combat.ts   — visibility, pathfinding, hit math
                     │  ├─ src/game/skills.ts   — attributes, trees, derived stats
                     │  ├─ src/game/loot.ts     — gear generation, relics, runeforge
                     │  ├─ src/game/npcs.ts     — dialogue trees, quest defs
                     │  ├─ src/game/codex.ts    — bestiary, feats, town upgrades
                     │  ├─ src/game/audio.ts    — Web Audio SFX + generative music
                     │  ├─ src/game/ambient.ts  — zone life: townsfolk, barks, critters
                     │  ├─ src/game/quests.ts   — quest "Next:" guidance derivation
                     │  ├─ src/game/difficulty.ts— difficulty tiers + NG+ cycle scalers
                     │  ├─ src/game/saveSlots.ts— SAVE_VERSION, slots, death-stamp policy
                     │  ├─ src/game/settings.ts — per-device settings blob + keymap
                     │  ├─ src/game/tutorial.ts — first-run tutorial steps
                     │  ├─ src/game/coachMarks.ts— one-time contextual hints
                     │  ├─ src/game/gamepad.ts  — gamepad polling/mapping
                     │  ├─ src/game/lifetime.ts — per-device lifetime stats
                     │  └─ src/game/cloudSave.ts— RLE zone packing, Firestore I/O
                     └─ src/components/*.tsx    — modals, HUD, dock, canvas
```

## Components
- **`src/App.tsx`** — owns all state (player, zones, flags, quests, merchants, logs), the turn loop, enemy/companion AI execution, hazard/DoT resolution, save/load, and every handler. Anything that happens in the game passes through here.
- **`src/game/world.ts`** — zone constructors for the 5 hand-authored maps (4 towns + overworld) and `generateDungeonFloor(depth, {skipStoryBoss})` for main, side (via `generateSideDungeonFloor`), and Abyss floors; `createEnemy` / `promoteEnemyRank` hold all enemy base stats and depth scaling.
- **`src/game/combat.ts`** — shadowcasting visibility, corner-safe pathfinding (`findPathNextStep`, `findPathPoints`, `findAutoExploreTarget`), enemy intent selection (telegraphs), `calculatePlayerHit`.
- **`src/game/skills.ts`** — attribute model, 3 skill trees, Prodigies, `computeDerivedStats` (the single source of derived player stats), `computeRespecPoints`.
- **`src/game/loot.ts`** — procedural item generation, starter/quest/named items, relic sets, rune enchants (`enchantEquipmentItem`), tempering (`upgradeEquipmentItem`), reroll, salvage.
- **`src/game/npcs.ts`** — all branching dialogue trees and `QUEST_DEFS`. Dialogue choices carry `condition` (flag/quest/item checks) and `action`/`extraActions` executed by App.
- **`src/game/codex.ts`** — bestiary definitions + Hunter/Slayer perks, 10 feat definitions, town upgrade definitions.
- **`src/game/cloudSave.ts`** — Firebase Auth (popup + redirect fallback), save packing: RLE + bitmask tile rows (`packZones`/`unpackZones`, backward-compatible with legacy rows), 940,000-byte cloud cap (`MAX_CLOUD_SAVE_BYTES`), structured error formatting.
- **`src/game/audio.ts`** — `SoundEngine`: synthesized one-shot SFX plus a fully procedural generative music engine (pad chords + pentatonic melody; town/dungeon/boss themes chosen by `resolveMusicTheme`, crossfaded, gesture-gated).
- **`src/game/ambient.ts`** — zone life: roaming townsfolk, NPC bark lines, critter definitions, points of interest, per-biome dungeon ambience lines.
- **`src/game/quests.ts`** — stage-aware quest guidance ("Next:") derived once and shared by the Journal and the HUD `QuestTracker`.
- **`src/game/difficulty.ts`** — difficulty tiers (Story/Standard/Hardened) and NG+ cycle scalers; the single funnel is `scaleEnemyForDifficulty` inside `createEnemy` (plus `scaleXpForDifficulty` in the XP grant).
- **`src/game/saveSlots.ts`** — `SAVE_VERSION` (= 1), per-slot localStorage reads/writes with corruption isolation, legacy hydration, future-version refusal, and the hardcore death-stamp load policy (`canLoadBundle`).
- **`src/game/settings.ts`** — the per-device settings blob (volumes, mute, shake, zoom, keymap with swap-on-conflict, text size, pattern signals), merged over defaults so older blobs hydrate.
- **`src/game/tutorial.ts`** — the six-step first-run tutorial sequence (data + step gating).
- **`src/game/coachMarks.ts`** — one-time-per-device contextual hints, claimed at the real event points (first telegraph, first inscription, first Prodigy point).
- **`src/game/gamepad.ts`** — pure gamepad polling/mapping (standard layout, deadzone, hold-repeat), unit-tested; App feeds it into the same dispatch as the keyboard.
- **`src/game/lifetime.ts`** — per-device lifetime stats record (`elfstory-lifetime`, outside save bundles): expeditions, victories, deaths, kills, deepest floor, highest cycle.
- **`src/components/`** — `PerspectiveCanvas` (Three.js full-3D renderer: chase / first-person / overhead tactical views + touch), `ActionDock`, `TopHud`, and modals/screens (Inventory, Merchant, Dialogue, QuestJournal, CharacterSkills, TownUpgrades, Travel, Legend, HallOfFame, EndPause, SpecialEncounter, TitleScreen, SettingsModal, EndingScreen, CreditsScreen, QuestTracker, TutorialOverlay).

## Data flow / protocols
- **Turn loop:** player action in App → player resolution (combat.ts math) → companion turn → enemy turns (intent selection in combat.ts, execution in App) → DoT/status ticks → autosave checks.
- **Saves:** `SavedBundle` (player, zones, currentZoneId, worldFlags, quests, merchantStocks, logs) → local: JSON with zones packed via `packZones`, under per-slot localStorage keys; cloud: Firestore doc via cloudSave, same packing, hard size cap. Every bundle is stamped with `SAVE_VERSION` (= 1, `src/game/saveSlots.ts`): a missing version hydrates as legacy, a newer version is refused gracefully, and reads are per-slot isolated so one corrupt slot never breaks the others.
- **Dialogue:** component renders the node for `activeDialogue`; choice visibility is evaluated from `condition` against player + worldFlags + quests; App executes `action` + `extraActions` atomically on selection.

## Dependencies
- React 19, Vite 8 (rolldown), Tailwind CSS v4, TypeScript 7 — install needs `--legacy-peer-deps` on clean npm (peer conflict via `@firebase/eslint-plugin-security-rules` → `@typescript-eslint/parser` vs typescript ^7; see HANDOFF.md).
- Firebase 13 (Auth + Firestore) — optional at runtime; `firebase-applet-config.json` configures it. Firestore rules in `firestore.rules`, spec in `security_spec.md`.
- Node ≥24 recommended (Firebase declares `engines.node >= 24.12.0`).
- Portraits/backdrop are local JPEGs in `src/assets/images/` (~672 KB total) — no external assets at runtime beyond Google Fonts/Firebase.

## What's missing
- **No `package-lock.json` in the original handoff** — one was generated during the P0 fix pass (Nov 14, 2026, `npm install --legacy-peer-deps`) and ships with the fixed tree; commit it so installs stay reproducible.
- **Music/ambience shipped** — generative music in `audio.ts` (Phase 2) and zone life in `src/game/ambient.ts` (Phase 3); no longer a gap.
- **ErrorBoundary shipped** — `src/main.tsx` defines an `ErrorBoundary` wrapping `<App/>` since the P0 pass; a render crash shows a recoverable screen instead of a white page.
- **No README** in the handoff (this doc set adds one linking the canonical docs).
- **Firestore rules are unproven live** — emulator assertions need a Java-enabled environment, which the handoff environment lacked (disclosed in HANDOFF.md).
