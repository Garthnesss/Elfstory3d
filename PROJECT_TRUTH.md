# ElfStory — Project Truth

## One line
ElfStory is a turn-based tactical dungeon-crawler RPG in the browser, starring elven outrider Garth Elfstrom descending beneath Oakhaven and Highspire to confront Sovereign Malakor.

## What it is
- A single-player, turn-based roguelite RPG: bump combat, telegraphed enemy windups, DoT/status play, procedural dungeon floors and loot.
- Built with React 19, TypeScript, Vite, Tailwind CSS v4, a Three.js full-3D renderer (Overhead Tactical and Chase views; the 2D and isometric renderers and the first-person view were removed Nov 15, 2026), procedural Web Audio SFX and music. No network features — everything runs and saves in the browser (Firebase cloud saves were cut Nov 17, 2026).
- World scope (verified in code, Nov 14, 2026): 4 sanctuary towns (Oakhaven, Thornwick Fen, Cinderwatch Bastion, Highspire Citadel), the Silverwood Vale overworld, a 5-floor main descent, 3 side dungeons (7 floors), and a procedural Endless Abyss from floor 6.
- Systems (after the Nov 15, 2026 simplification pass): 3 intermixable skill trees with Capstones, procedural gear with rarity/affixes, named relics and four 2-piece relic sets, tempering, a spirit companion, branching NPC dialogue and 10 quests. Cut on Nov 15: Runeforge enchants, inscriptions, affix reroll, bestiary stat perks, companion stances, Glyph Dust (merged into gold), Prodigies (now Capstones).
- Saves: 3 slots, local only (localStorage, RLE-packed), plus a per-browser Hall of Fame chronicle.

## What it is not
- Not a real-time / action RPG — every action is a turn.
- Not multiplayer, and not online — no accounts, no cloud saves.
- Not a commercial release — `package.json` version is `1.0.0`, public on GitHub Pages, no distribution or monetization. (The settings menu, generative music, and real ending sequence that were missing at handoff all shipped in Phase 2 — see STATUS.md.)

## Non-negotiables
1. **HANDOFF.md claims must stay true.** That document has proven unusually honest — no invented systems. Any change that makes a HANDOFF claim false must update HANDOFF.md in the same change.
2. **Difficulty and content claims must be evidence-backed.** Numbers come from the engine code and simulation, not from design intent. (The Nov 14, 2026 audit found the *intended* difficulty and the *actual* difficulty badly diverged — see STATUS.md.)
3. **No silent destructive actions.** Deleting, overwriting, or restarting over a save requires explicit confirmation (established in the P0 fix pass, Nov 14, 2026).
4. **Offline first.** The game is fully playable with no network; nothing may require an account.

## Confirmed by Garth
- Nov 14, 2026: Commissioned an adversarial audit — difficulty scaling, multi-hour content, and top-end completeness were the three questions.
- Nov 14, 2026: Chose "Fix the P0 exploits + save/confirm issues" as the first fix pass (over P1 difficulty rebalance, which shipped later the same day — boss HP pins 420/690/1000, see STATUS.md).
- Nov 14, 2026: Garth creates the GitHub repo himself; the four canonical docs are part of the project's first real state.
- Nov 15, 2026: Full 3D is the game; Overhead Tactical is the default view; first-person removed; the simplification pass (cuts listed above) is intended.
- Nov 17, 2026: **Lean core (cut plan A).** Removed: Firebase cloud saves + Google sign-in, town upgrades, feats, the bestiary, lifetime stats. Reason: feature overload — fewer systems, smaller download, fewer bugs. "We can always remove stuff."
- Nov 17, 2026: **Tone is comedy.** The realm needed a hero and got Garth; the world is unimpressed and Garth's legend is the joke. NPCs keep their jobs, the plot and quests are unchanged. Jokes stay on Garth, not on the NPCs.
- Nov 16, 2026: Commissioned a second audit with a live playtest and a comparison against similar games; work stays on `main`; findings go into these four docs and fixes are implemented where found.

## Known truths from the Nov 16, 2026 audit
- **Performance is unproven off the development Mac.** The renderer issued ~1,500 draw calls per frame in the smallest town and has never been profiled on a phone. Any "runs on mobile" claim needs a measurement first.
- **Playtesting by an agent has been shallow.** The Nov 16 round covered ~45 turns of Floor 1. Difficulty claims still rest on `tools/difficulty_sim.py` and Garth's own play.
- **Old saves:** saves written before the Nov 15 simplification pass are incompatible by design (testing phase).

## Scope boundaries
- In scope: balance passes, the product shell (settings, music, tutorial, ending), content depth (set-piece rooms, new archetypes, new quest types) — sequenced in ROADMAP.md.
- Out of scope unless Garth says otherwise: multiplayer, monetization, native app packaging, any backend or cloud saves.
