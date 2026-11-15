# ElfStory — Final Audit (Phase 5+6 shipped build)

**Date:** Sat Nov 14, 2026 · **Build audited:** remote `main` @ `605cc11` (source `994e50b`), live at https://garthnesss.github.io/ElfStory/
**Method:** full test/typecheck/build suite, difficulty sim re-run, three parallel code-audit passes (exploits, Phase 4–6 surfaces, content recount), plus **Playtest Round 2** — a live headless-Chromium run through the shipped standalone hunting every previously untested system.
**Bottom line:** No HIGH findings. The three original P0 exploits are fixed structurally, difficulty pins hold exactly, and every Phase 3–6 feature was verified working live. One MEDIUM (PWA offline boot), one moderate usability gap (NG+ ascend is one-shot per slot), a handful of lows/cosmetics, and project docs that lag the code.

---

## 1. Mechanical verification

- **Tests: 97/97 pass.** `tsc --noEmit` clean. Production build clean (only the known >500 kB chunk warning; code-splitting was explicitly deferred in the roadmap).
- **Difficulty sim (`tools/difficulty_sim.py`) re-run:** all P1 pins intact — Malakor 1000/36/9 on Standard, 750 Story / 1250 Hardened; NG+ factors HP +0.35 / ATK +0.25 / XP +0.20 per cycle (NG+1 Malakor 1350 HP).
- **Pages serves this exact build:** fetched the live page with cache bypass — 2,288,718 bytes, byte-size identical to the local P5+6 standalone, with `Begin New Game`, `New Game+`, and `gamepad` markers present.

## 2. Playtest Round 2 — live verification (new since the first audit)

Character: the round-2 test profile (buffed stats — this round hunted *content*, round 1 + sim remain the honest difficulty signal).

| Target | Result |
|---|---|
| Venom Dart Snare (F3) | ✅ 10 dmg = formula 4 + depth×2 exactly; Poison (3t) applied and ticked |
| Sealed Brazier Hall (F2) | ✅ 3 braziers lit in sequence, rune-seal door opened, reliquary cache looted |
| Grave Husk — Deathless | ✅ Revived at 25 HP = exactly 30% of 84, then killed for real |
| Spore Hulk — death burst | ✅ Both branches: at range, "you kept your distance"; point-blank kill → **BURSTS for 12 dmg and Poison (3t)**, ticks verified |
| Rime Revenant — Rime Bolt + Chill | ✅ Bolts land for 18; **Chilled (2t, potency 1)** applied, ticked down, re-applied; statuses stack with Burn |
| Survey quest turn-in | ✅ 6/6 steles → Rowan: **+60g, Surveyor's Star-Compass**, quest status `completed` |
| Malakor (personal fight) | ✅ 1000 HP; basics hit 27 through defence; two telegraphs sidestepped; killed with 31 HP left; feat "Ashen Sovereign's End", quest completed, Lv 15 |
| Ending Screen | ✅ Renders with run-reflective prose + stats (Lv 15, 60 foes, 872 turns) |
| NG+ ascend | ✅ Cycle 1: world regenerated, level/gold/companion kept; lifetime stats recorded (Victories 1, Highest Cycle 1) |
| NG+ scaling (live) | ✅ F1 Cycle 1: sentinel **78 HP** (58×1.35), rat 43, goblin 62; ATK ×1.25 likewise exact |

Also incidentally verified: companion death/reform cycle, fast-travel network gating, Citadel Seal via the Resolve dialogue path, frost/mire set-piece rooms exist as designed, Pyromancer variant's Ember Lance + Burn.

**Not killed live:** Inquisitor Serath (F4) — engaged (his Ground Slam telegraph landed for 35; spawn HP 690 matches pin) but the approach keys slipped past him onto the stairs. See finding F5.

## 3. Exploit re-probe — all clear

- **Vex tip** — FIXED: the press-for-shortcuts choice is gated on `notFlag: vexTipClaimed` and the claim sets the flag atomically with the gold (`npcs.ts:571, 632`). It is also the only `give_gold` in all dialogue data.
- **Runeforge compounding** — FIXED: reforge/enchant transforms deliberately never touch `value` (`loot.ts:979-1018`, with a comment naming the original exploit). Upgrade value growth (×1.3/lvl) is level-capped with escalating costs — bounded, not a loop.
- **Duplicate Bells** — FIXED with defence-in-depth: single tile, `!tile.used`, zone check, `bellChoice` unset, not already carrying (`App.tsx:3597-3613`); both fates consume the item and are mutually exclusive.
- **Quest re-claim** — none found: all 13 `complete_quest` sites sit behind `questStatus: 'active'` gates that re-evaluate against live state every render. *Hardening note:* the handler itself (`App.tsx:5389`) pays unconditionally; safety rests on dialogue gating. A one-line status guard inside the handler would close it by construction.
- **Merchants** — no loop: sell = 55% of buy, sold stock never restocks; upgrade-then-sell is dust-negative. **Minor player-hostile bug:** selling a *stacked* consumable removes the whole stack but pays one item's price (`App.tsx:6109-6120`; the merchant UI even shows "x12" beside the single price).
- **NG+ ascend** — not exploitable: single entry point, only in VICTORY state; a double-click can skip the counter but cannot duplicate assets.
- **Hardcore evasion** — protected in normal play: the death stamp overwrites the active slot immediately and rides every later save (local + cloud); stamped loads are refused on the single load funnel. Residual edges are inherent to client-side saves (an externally backed-up bundle loads cleanly) plus the hp≤0 race in F2.
- **Inventory duplication** — none: no drop/split feature; ground loot is removed from the zone before granting; every tile interactable is `!tile.used`-guarded.

## 4. Phase 4–6 surface audit

- **Difficulty funnel — SOLID.** `createEnemy` is the only constructor and wraps the scaler (`world.ts:254`); every spawn site — regular, bosses, set pieces, vault guards, overworld, Abyss — routes through it. XP likewise funnels through one grant function. Abyss depth scaling composes underneath tier × cycle. *Nit:* the `summon` intent type is dead code (never emitted). *Design note:* the companion is not tier/cycle-scaled (level-based only), so its relative power dips in high NG+ cycles.
- **Save versioning — SOLID locally.** Legacy bundles hydrate, future versions are refused gracefully per-slot, one corrupt slot doesn't break the others. *Low:* the **cloud read path performs no version check** (`cloudSave.ts:428`) — a cloud save from a newer build would reach the loader unguarded.
- **Key rebinding — UI path airtight.** Swap-on-conflict is atomic; digits/named keys/Escape can never be captured, so no action can be stranded. *Low:* `mergeKeymap`'s fallback can manufacture a duplicate binding from a partial/corrupt stored blob (`settings.ts:130`) — one action becomes letter-unreachable (arrows still work). Not reachable through the game's own UI.
- **Hardcore — SOLID.** Stamp persists in local and cloud bundles; Title hides Load for fallen slots; there is no pause-menu load path to bypass with. *Theoretical low:* the stamp effect bails if the autosave ref is unpopulated; one dead branch in the loader. Neither confirmed reachable.
- **Gamepad — SOLID.** One rAF loop, clean cleanup, edge-triggered buttons, 0.45 deadzone, dispatches through the same handlers as the keyboard. *Nits:* the loop is torn down/recreated when Settings toggles; the pad can't start a run from the title screen (by design).
- **PWA — MEDIUM.** Scope and subpath handling are correct, navigations are network-first (online clients always get the fresh deploy). **But the JS/CSS bundle is never cached** — the service worker precaches only `index.html`, the manifest, and the icon, and its fetch handler never stores anything (`public/sw.js:11, 44`). An installed PWA offline gets the shell HTML with no application to run. The header comment's "keeps working offline" claim doesn't hold for the app itself. Fix: precache the hashed assets at build time or add runtime caching for same-origin `.js`/`.css`.
- **Accessibility + coach-marks — SOLID.** Text sizes apply via root font-size; the telegraph "!" defaults on and renders through a pure predicate; coach-marks claim-once per device, written before display. *Nits:* marks are per-device (a second player on the same browser never sees them); a crash between claim and display loses a mark.

## 5. Live-play findings

- **F1 (moderate, usability) — NG+ ascend is one-shot per slot.** VICTORY is never stored in the save bundle; `applySavedBundle` restores PLAYING unconditionally (`App.tsx:1422`). A player who closes the tab at the ending (the game autosaves on close), saves over it, or picks "Continue into the Endless Abyss" and later reconsiders can never return to the Ending Screen — Malakor is dead and the Ascend button exists only in that one live moment, even though the save retains `completedAtMs` and the cycle counter. *Fix options:* restore VICTORY on load when `completedAtMs` is set and the run hasn't ascended, or add an Ascend action to the title slot / pause menu for completed runs.
- **F2 (minor) — death-turn saves reload as a frozen "zombie".** If a save lands on the exact death turn, the bundle holds hp ≤ 0; on load there's no `hp > 0` validation and no GAME_OVER — the scene renders, the turn loop is frozen, but potion buttons still work and can revive the character. Observed twice in the harness. *Fix:* clamp/validate hp on load and route to the death flow.
- **F3 (cosmetic) — Ending Screen "Expedition Time" shows ~1s** for any run that was saved and reloaded: play time is measured from session start and never persisted.
- **F4 (cosmetic) — overworld waystone attunement logs as "Floor 0".**
- **F5 (design note) — stair-guard placement is inconsistent.** Malakor stands *on* the F5 stairs tile and must be fought; Serath stands *beside* the F4 stairs and can be bypassed entirely (the playtest did so accidentally). If story bosses are meant to gate descent, F4's placement leaks.

## 6. Content recount — numbers all verify

17 enemy archetypes · 3 story bosses (420/690/1000 HP) + 3 side bosses · 2 fixed mini-bosses + procedural randboss/Abyss classes · **10 quests** · 17 fixed zones (4 towns, overworld, 5 main floors, 7 side floors) + Endless Abyss · 4 set-piece rooms · 2 trap types · 4 relic sets / 8 pieces · 18 NPCs with dialogue (36 bark lines) · 6 critter kinds · 27 ambience lines · 12 skills, 6 prodigies, 8 inscriptions, 5 rune enchants, 10 feats, 17 lore entries, 6 tutorial steps.

## 7. Docs discrepancies (the code is ahead of the paper)

- **PROJECT_TRUTH.md** claims "no settings menu, no music, and no real ending sequence" (all shipped in P2), says **9 quests** (actually 10 — the survey quest), and lists P1 as "queued" (long done).
- **ARCHITECTURE.md** is frozen at the pre-P0 handoff state: "no music," "saves have no version field," "no ErrorBoundary," and its inventory omits 9 game modules and 5 components that ship today.
- **STATUS.md** cites pre-merge test counts (86/86, 80/80) instead of the merged **97/97**, and its repo section still frames the P0 push as latest with P2+P3 listed as awaiting push.
- **ROADMAP.md** says set pieces appear across "13 dungeon floors" — there are 12 fixed dungeon floors (plus endless Abyss floors).

## Verdict

The game that shipped is the game that was designed: every phase's headline feature is present, wired, and — after round 2 — observed working live. The remaining issues are one medium PWA gap, one moderate one-shot-ascend trap, and polish-grade items. Nothing found argues against calling ElfStory **complete**; the fix list below is a tidy optional Phase 7, not a rescue.

**Suggested fix pack (all small):** ① persist/restore VICTORY so Ascend survives reloads · ② cache the app bundle in the service worker · ③ `hp > 0` validation on load · ④ status guard inside the `complete_quest` handler · ⑤ stacked-consumable sell pays per item (or sells one at a time) · ⑥ docs refresh (PROJECT_TRUTH / ARCHITECTURE / STATUS / ROADMAP counts).
