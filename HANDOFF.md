# ElfStory — Architecture & Handoff Guide

> **Read this first (Nov 16, 2026).** This is the original handoff document and parts of it are now historical. Since Nov 15, 2026 the game renders with Three.js (`PerspectiveCanvas`), not HTML5 Canvas sprites; `sprites.ts` is gone; and the simplification pass removed Runeforge / `RUNE_ENCHANTS`, `rerollEquipmentAffix`, inscriptions, bestiary stat perks, companion stances and Prodigies (now skill-tree Capstones). On Nov 17, 2026 the lean-core cut also removed Firebase cloud saves and Google sign-in (`cloudSave.ts`, `firestore.rules`, `security_spec.md`, `npm run lint:rules`), town upgrades, feats, the bestiary (`codex.ts`) and lifetime stats. The test count is 110, not 11. For the current state trust PROJECT_TRUTH.md, ARCHITECTURE.md and STATUS.md over the sections below.

## Overview
**ElfStory** is a turn-based tactical dungeon-crawler RPG starring elven outrider **Garth Elfstrom**, built with React 19, TypeScript, Vite 8, Tailwind CSS v4, HTML5 Canvas tile/sprite rendering, procedural Web Audio SFX, and optional Firebase Auth + Firestore cloud saves.

### World Scope
- **4 Sanctuary Towns**: **Oakhaven Outpost** (Torin, Mira, Vance, Vex), **Thornwick Fen** (Elder Sylva, Tinker Bram), **Cinderwatch Bastion** (Captain Darek, Forgemistress Halda), and **Highspire Citadel** (Archivist Lyra, Magistrate Corvus, Guildmaster Kaelen, Relic Appraiser Orin).
- **Silverwood Vale Overworld**: Full overland map connecting all four towns, Silverbridge Camp (Wayfarer Rowan), Waystones, and trailheads to all dungeons.
- **Main Citadel Descent + Endless Abyss**: Sunken Reliquary (Floors 1–2), Ember Vaults (Floors 3–4), Obsidian Sanctum (Floor 5 · Sovereign Malakor), and procedural Endless Abyss (Floor 6+).
- **3 Multi-Floor Side Dungeons**: **Whispering Barrow** (2 floors · Arch-Wight Morvath), **Fungal Hollow** (2 floors · Spore-Matron Vexis), and **Frostpeak & Ashen Caldera** (3 floors · Ignis-Warden Kaelthar), each isolated from main-story boss spawns.

## Quick Start
```bash
npm install         # Install dependencies (see note below if peer resolution fails with strict npm)
npm run dev         # Starts Vite dev server on http://0.0.0.0:3000
npm run lint        # Runs tsc --noEmit
npm run test        # Runs automated unit tests (tests/*.test.ts)
npm run lint:rules  # Validates firestore.rules via @firebase/eslint-plugin-security-rules
npm run build       # Production build into dist/
```

> **Setup Note**: `@firebase/eslint-plugin-security-rules@0.0.2` transitively pulls `@typescript-eslint/parser@^8` whose peer range is `typescript <6.1.0`, while `package.json` uses `typescript@^7.0.2`. If a clean `npm install` hits `ERESOLVE`, pass `--legacy-peer-deps` (or generate/commit a `package-lock.json` under Node 22/24). Note also that Firebase v13 declares `engines.node >= 24.12.0` (`npm` warns on Node 22).

## Implemented Systems & Files

### Core Engine (`src/game/`)
- `src/game/types.ts`: Domain models (`PlayerState`, `CompanionState`, `WorldFlags`, `ZoneMap`, `Item`, `SkillId`, `RuneEnchantId`, `ActivePanel`). Includes `bonusHp`, `cipherInscribed`, `cantorPacified`, `bestiaryKills`, `unlockedFeats`, `townUpgrades`, and side-dungeon flags.
- `src/game/codex.ts`: `BESTIARY_DEFS` (`blight_weaver` `'v'`, `cinder_wisp` `'w'`, etc.), `ALL_BESTIARY_LIST`, `computeBestiaryPerks`, `FEAT_DEFS` (10 expedition milestones), and `TOWN_UPGRADE_DEFS` (`apothecary`, `smithy`, `watchtower`).
- `src/game/loot.ts`: Procedural gear, Starter items, Relics, 2-piece Relic Sets, `RUNE_ENCHANTS` (`keen_edge`, `ward_plate`, `aether_core`, `vital_heart`, `swift_wind`), `enchantEquipmentItem`, and `rerollEquipmentAffix`.
- `src/game/skills.ts`: Attribute scaling, 3 hybrid skill trees, Milestone Prodigies, `computeDerivedStats(player, worldFlags?)`, and `computeRespecPoints(level, worldFlags, quests)` (accurately refunds initial starter point + level ups + Lyra bell + Vaelen pacification + Mira Cantor reward + Bog Spores reward).
- `src/game/combat.ts`: Shadowcasting visibility, `calculatePlayerHit(..., worldFlags?)`, enemy intents, and corner-safe pathfinding (`findPathNextStep`, `findPathPoints`, `findAutoExploreTarget`).
- `src/game/world.ts`: Procedural floor generator (`generateDungeonFloor(depth, { skipStoryBoss })`), `createOverworldMap()`, all 4 towns, and `generateSideDungeonFloor()` (guarantees non-overlapping walkable placement for terminal side bosses and clean story-boss isolation).
- `src/game/tileset.ts` & `src/game/sprites.ts`: Complete biome wall/roof/floor palettes across all town, overworld, and dungeon biomes (`oakhaven`, `highspire`, `overworld`, `thornwick`, `cinderwatch`, `reliquary`, `ossuary`, `ember`, `crucible`, `abyss`), animated hazards (`getAnimatedHazardTile`), flickering torchlight, distinct NPC hair/garb palettes (`rowan`, `sylva`, `bram`, `halda`, `darek`, etc.), and 2-frame sprites.
- `src/game/audio.ts`: Synthesized Web Audio SFX (`playHit`, `playSpell`, `playHazard`, `playCompanion`, `playRuneforge`, `playCodexUnlock`, etc.).
- `src/game/npcs.ts`: Branching NPC dialogue trees across all 4 towns + Silverbridge, quests, Lyra's one-time cipher (`cipherInscribed`), and Vance/Kaelen hooks for Town Upgrades and companion swapping (`silverwind_lynx` <-> `starlight_owl`).
- `src/game/cloudSave.ts`: Firebase Auth (popup with redirect fallback) and RLE + bitmask tile row packing (`packZones` / `unpackZones`, backward-compatible with legacy 11-field rows and raw tiles). Compresses all 17 starting/discoverable zones to ~169 KB (vs. ~713 KB unpacked rows and ~2.8 MB raw JSON), keeping Firestore saves well below `MAX_CLOUD_SAVE_BYTES = 940_000`. `handleFirestoreError` throws structured `JSON.stringify(errInfo)` parsed cleanly for UI logs via `formatCloudError` in `src/App.tsx`.

### UI & Game Loop (`src/components/`, `src/App.tsx`)
- `src/App.tsx`: Full turn loop wiring DoT damage on Garth (`bleed`/`burn`/`poison`), corner-safe orthogonal/diagonal pathing, companion AI/swapping/stances, biome hazard disarm & trigger resolution, Bestiary & Feat progression, stair transition state preservation, Cauterize 25-turn cooldown persistence across Safe Rest, RLE-packed localStorage + Firestore slot persistence, and Hall of Fame chronicle tracking (including side dungeons & Silverbridge).
- `src/components/PerspectiveCanvas.tsx`: Three.js full-3D perspective renderer (overhead tactical / chase views) with animated hazards, 3D entity models & inspection cards, `aimedTarget` crosshair, biome ambiance, and `>=44px` mobile Map / Look / Zoom controls. (The legacy 2D `AsciiCanvas` renderer and its `src/game/sprites.ts` library were removed Nov 15, 2026.)
- `src/components/ActionDock.tsx`: Responsive dock with `>=44px` mobile Skills/Runes switcher, `Cycle Target` / `Confirm Cast` bar, Spirit Companion stance cycling, and expandable chronicle ticker.
- `src/components/QuestJournalModal.tsx`: 3-tab Chronicle & Codex (`Quests & Lore`, `Bestiary`, `Feats`) with Realm Standing across Citadel, Overworld, and Side Dungeons.
- `src/components/MerchantModal.tsx` & `src/components/TownUpgradesModal.tsx`: Shop (`Buy`, `Sell`, `Temper` up to +4 with Smithy Lv 2, and `Runeforge`) + infrastructure upgrades across all four sanctuaries.
- `src/components/InventoryModal.tsx`, `CharacterSkillsModal.tsx`, `LegendModal.tsx`, `TopHud.tsx`, `DialogueModal.tsx`, `TravelModal.tsx`, `TitleScreen.tsx`, `EndPauseModal.tsx`, `HallOfFameModal.tsx`, `SpecialEncounterModal.tsx`: Responsive modals with `>=44px` mobile touch targets.

### Optimized Media (`src/assets/images/`)
- All 13 NPC portraits resized to `512x512` and title backdrop resized to `1280px` width (~672 KB total across all 14 JPEGs, down from 12 MB).

## Verification, Security & Rules (`firestore.rules`, `security_spec.md`)
- `npm run lint` (`tsc --noEmit`): passes cleanly.
- `npm run lint:rules` (`eslint firestore.rules`): passes cleanly.
- `npm run test` (`tests/engine.test.ts`): 11/11 unit tests pass cleanly.
- `npm run build`: clean Vite production bundle.
- **Firebase Rules Emulator Note**: `java` is not installed in the container where this handoff was prepared, so live `@firebase/rules-unit-testing` emulator assertions against `firestore.rules` were not executed here. Before deploying rules updates, run `firebase emulators:start --only firestore` with unit tests in a Java-enabled environment and review `firestore.rules` directly.
