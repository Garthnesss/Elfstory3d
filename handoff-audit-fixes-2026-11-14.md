# Hand-off: fix the findings from the Nov 14 adversarial audit

You're working in the ElfStory repo (React 19 + TypeScript + Vite turn-based dungeon crawler, optional Firebase cloud saves, live on GitHub Pages from `docs/`). `main` is at `b06237d` (v1.0.0, Phase 7 fix pack + tidy-up pass). Tests run with `npm test` (node:test, 103 passing); typecheck with `npx tsc --noEmit`.

An adversarial audit and live playtest of the Phase 7 build found the problems below. Work on a branch (e.g. `fix/audit-nov14`), not `main`. Fix them in priority order, add a **behaviour** test for each (see item 5), and keep `npm test`, `tsc` and `npm run build` clean. Don't rebuild `docs/` or deploy unless asked.

## 1. MEDIUM — Hardcore players can escape death via "Return to the Ending" (confirmed live)

- `src/App.tsx:6814` passes `canReturnToEnding={Boolean(worldFlags.malakorDefeated)}` to `EndPauseModal`; the button (`src/components/EndPauseModal.tsx:170`) shows in the PAUSED menu anywhere, any time, once Malakor is dead — including mid-fight in the Endless Abyss.
- From the Ending Screen, Ascend (`handleAscendNgPlus`, `src/App.tsx:1466`) resets HP/mana to max, keeps gear, clears `deathStampRef`, and saves immediately.
- Repro: Hardcore run, Malakor defeated, go to Floor 6+, get to 1 HP next to an enemy → Esc → Return to the Ending → Ascend. Result: 61/61 HP, `hardcore: true`, never stamped dead. Breaks "death is final".
- Fix direction (pick one, justify it): only offer the button in safe zones (town/sanctuary) and/or when no enemy is alerted; or drop the pause button and instead restore the VICTORY screen on load for a completed run that hasn't ascended. At minimum it must be unavailable in Hardcore outside a safe zone.

## 2. LOW–MED — A non-Hardcore save from the death turn now locks its slot (confirmed live)

- `applySavedBundle` ends with `setGameState(normalizedPlayer.hp <= 0 ? 'GAME_OVER' : 'PLAYING')` (`src/App.tsx:1455`). For non-Hardcore runs every load of that slot goes straight to "Fallen in the Vaults"; the only exits are Play Again (wipes the slot) or Title. Before Phase 7 the player could drink a potion and continue.
- Also: the title screen shows the slot as a normal run, and the death is never counted (lifetime `deaths` stays 0, no Hall of Fame chronicle entry).
- Fix direction: keep the GAME_OVER route (and death stamp) for Hardcore only. For non-Hardcore, load with HP clamped to 1 (or route through the normal death flow so the death is recorded once — your call, but don't lock the slot).

## 3. LOW — Saves grow without limit in the Endless Abyss

- Each Abyss floor is stored as zone `dungeon_N` (created at `src/App.tsx:3156`) and never pruned; about 12 KB packed per floor. Measured: ~164 KB through Floor 5, 463 KB at floor 30, 962 KB at floor 70, 1,088 KB at floor 80.
- `MAX_CLOUD_SAVE_BYTES = 940_000` (`src/game/cloudSave.ts:383`) means cloud sync fails from about floor 65–70. It fails gracefully ("Saved locally; cloud save sync failed") but the cloud copy goes stale, and in Hardcore the death stamp can never reach the cloud.
- Fix direction: when descending/saving, drop `dungeon_N` zones with N > 5 that aren't the current floor or the one just left (they regenerate via `generateDungeonFloor`, `src/App.tsx:1767`). Check that "deepest floor" stats (`src/App.tsx:920`, `deepestDepthForZones`) read from `discoveredZones`, not `zones`, so pruning doesn't shrink them. Test that a floor-80 bundle stays well under the cloud limit.

## 4. Cosmetic — "✦ Completed" badge sticks after New Game+

- `handleAscendNgPlus` carries `completedAtMs` into the fresh cycle's save, so a brand-new Cycle 1 run shows "✦ Completed" on the title screen. The completion-stamp effect bails when `completedAtMsRef.current !== null` (`src/App.tsx:1176`), so an NG+ victory never refreshes it.
- Fix direction: clear the per-run completion stamp on ascend (lifetime stats already remember past victories), so the badge reflects the current cycle.

## 5. Test quality — Phase 7 tests don't test behaviour

- `tests/phase7.test.ts` only does `readFileSync(...).includes('...')` on source files. Broken logic passes; harmless reformatting fails.
- For items 1–4, extract the decision logic into small pure functions (e.g. `canOfferReturnToEnding(state)`, `resolveLoadedState(bundle)`, `pruneAbyssZones(zones, currentZoneId)`, `ascendBundle(...)`) in `src/game/` and test those directly. Where practical, convert the existing Phase 7 string checks the same way.

## Smaller leftovers (check, fix if cheap)

- **Serath bypass:** Inquisitor Serath (Floor 4) can still be walked past to reach the Floor 5 stairs. Not changed by Phase 7 or the tidy-up; confirm and gate the stairs on Serath's defeat if so.
- **"Floor 0" in the Hardcore death note:** `src/App.tsx:1215` builds `Fell on Floor ${deepest}`; a Hardcore character who dies before entering any dungeon gets "Fell on Floor 0 · Oakhaven Outpost". Use the zone name alone (or "on the surface") when depth is 0.
- **Service worker (`public/sw.js`):** same-origin assets are cached at runtime and never pruned until `CACHE_NAME` is bumped. Irrelevant to the Pages build (single self-contained `index.html`), but it grows across deploys for a plain `vite build` deploy. Low priority.

## Already fixed — don't redo

Stacked-sell, quest double-payout guard, HP-0 loads into GAME_OVER (Hardcore stamping works), "Return to the Ending" after reload, Ascend not double-counting victories, Expedition Time persisting (`playTimeMs`), cloud future-version guard, waystone "Floor 0" log, `mergeKeymap` duplicate bindings. Firestore rules were reviewed and are solid (owner-scoped, strict schemas, chronicles immutable) — no change needed.

## Done looks like

Items 1–4 fixed with behaviour tests, item 5 applied to the new code, `npm test` / `tsc` / `npm run build` clean, a short note in `STATUS.md`, and a summary of what changed and what you chose for items 1 and 2. Commit on the branch; don't push or touch `docs/` without asking.
