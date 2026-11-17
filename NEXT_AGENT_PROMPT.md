# Handoff prompt — ElfStory 3D (paste everything below into the next AI)

---

You're taking over **ElfStory 3D**, a turn-based 3D dungeon-crawler RPG that runs in the browser (React 19 + TypeScript + Three.js + Vite, no backend). Repo: `/Users/gerth/Projects/elfstory3d` (GitHub `Garthnesss/elfstory3d`, branch `main`). Live build: https://garthnesss.github.io/Elfstory3d/ (served from `docs/`, last rebuilt at commit `6df2594`).

The owner is **Garth**. Work directly on `main` (his choice). Commit only when he asks; push and Pages rebuilds only when he asks.

## Read first (in this order)
1. `PROJECT_TRUTH.md` — what the game is, non-negotiables, and decisions Garth has made (comedy tone; lean-core cut).
2. `ROADMAP.md` → **Phase 8 → "▶ Next up — agreed order"**. That list is your work queue.
3. `STATUS.md` — top entries (Nov 16–17) have the evidence behind every open item: playtest numbers, loot odds, draw-call counts.
4. `ARCHITECTURE.md` — module map, "Renderer & performance", and the structural debt section.
`HANDOFF.md` is the original handoff and partly historical; trust the four docs above over it.

## How Garth likes to work
- **Give options, not finished surprises.** For any creative, design or balance decision: a short diagnosis, then 2–4 named pitches with trade-offs, mark your recommendation, and wait for his pick. Clear bugs don't need this — just fix them.
- **Be economical.** He watches token use. Prefer targeted `grep` + small line-range reads over whole files (App.tsx is ~6,800 lines). Batch edits. Keep browser screenshots few and small; read game state with JS instead (see the driver below).
- **Fewer features is fine.** He has said "we might have feature overload, we can always remove stuff." Don't add systems unless asked.
- Plain, short status updates. Say what was verified and what wasn't.

## The queue (from ROADMAP "Next up")
1. **Balance check.** Last scripted run (bump-only, never cast skills or shopped) died to Vaelen, the Floor 2 boss, at Lv 3 after 25 rounds. Loot was made stingier the same day, and the lean-core cut removed feat gold and stronger potions. Play a fresh Vanguard on Standard through Floors 1–5 **using skills, shopping for potions, and the Might dialogue option on Vaelen**. Then pitch: keep / trim story-boss HP ~20% / loosen loot (`RARITY_DEPTH_STEP` 5 → 6–7 in `src/game/loot.ts`). Target band: boss fights of 8–12 rounds. Record numbers in STATUS.
2. **Performance: batch the terrain.** `src/game/sceneBuilder.ts` builds one Group + several meshes per tile; Oakhaven draws ~1,500 calls/frame. Move to `InstancedMesh` or merged chunks per material/visibility state (`syncTileNode` swaps materials between hidden/memory/lit — design around that). Target Oakhaven < 150 draw calls. Measure before/after (patch `WebGL2RenderingContext.prototype.drawElements` to count calls). Static tile meshes have `matrixAutoUpdate = false`; anything you move must call `updateMatrix()`.
3. **Comedy, part 2.** Quest summaries (`QUEST_DEFS` in `src/game/npcs.ts`), journal hints (`src/game/quests.ts`), and the 17 lore steles (`LORE_ENTRIES`). Rule: the realm needed a hero and got Garth; the joke is always on Garth's legend, NPCs keep their jobs and voices, plot and quest logic unchanged. Look at `NPC_BARKS` in `src/game/ambient.ts` and `src/game/garthVoice.ts` for the voice. Pitch a sample of 3–4 lines first.
4. **Quality-of-life fixes.** Attack-nearest key; a full zone map on desktop (`M` currently opens fast travel); narrow-screen overlaps (Look/Map buttons over the quest tracker, tutorial card over the hero and D-pad); and a console error seen once on the built Pages page: "An unknown error occurred when fetching the script" (game still ran — probably service-worker related, unconfirmed).
5. **Split up `App.tsx`.** Move rules into pure `src/game/` modules with behaviour tests, like `src/game/runRules.ts` already does. No player-visible change. Retire the Phase 7 source-string tests as their logic moves out.

## Verification (every change)
```bash
npm test            # node:test over tests/*.test.ts — currently 110/110
npx tsc --noEmit    # must be clean
npm run build       # must be clean
```
Then check visible changes in the running game. Dev server: `npx vite --port=5183 --host=127.0.0.1` (port 3000 is taken on Garth's Mac). Changing App.tsx hooks makes Vite's hot reload remount the app to the title screen — reload and load the save.

**Playtest driver:** `tools/playtest-driver.js`. In the dev page's console:
`eval(await (await fetch('/@fs/Users/gerth/Projects/elfstory3d/tools/playtest-driver.js')).text())`
Then `__st()` (compact state), `__logs(10)`, `__goto(t => t.kind === 'stairs_down', 150, true)`, `__clearFloor(20)`, or `await __run(38000)` (auto-explore, fight, auto-equip, spend points; results in `__R`). Keep each call under ~40 s or the browser tool times out. It bump-attacks only — for item 1, cast skills yourself (number keys arm a skill, then Enter/click to confirm).

**Pages rebuild (only when Garth asks):** `rm -rf dist-standalone && python3 tools/build-pages.py`, smoke-test `docs/` with `python3 -m http.server`, commit `docs/`, push. The site updates ~1 minute later.

## Gotchas
- Story bosses seal the stairs down while alive (`bossBlockingDescent`). Auto-Explore stops beside stairs and never descends by itself.
- Saves are local-only (`localStorage`, packed by `src/game/zonePacking.ts`); stored Abyss floors are pruned at the save funnel. Old saves still load.
- Commit messages end with a `Co-Authored-By:` line for the AI model that wrote them.
- Keep the four canonical docs true: any change that makes a claim false updates the doc in the same change.
