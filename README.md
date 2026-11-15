# ElfStory 3D

A 2.5D isometric remake of **ElfStory** — the turn-based tactical dungeon-crawler RPG in the browser starring elven outrider Garth "Big Dick" Elfstrom. Built with React 19 · TypeScript · Three.js (2.5D orthographic isometric WebGL renderer + crisp 2D projected HUD) · Vite · Tailwind CSS v4 · procedural Web Audio SFX & music · optional Firebase cloud saves.

## What’s New in 2.5D Isometric
- **3D Extruded Terrain & Architecture** (`src/game/isoSceneBuilder.ts`, `src/game/isoMaterials.ts`): Biome-matched 3D stone masonry walls, 3D pine/elven trees, stone pillars, descending/ascending staircases, market stalls, city gates, vault monoliths, recessed animated water/fountains, and deep glowing chasms.
- **2.5D Upright Sprites & Dynamic Lighting** (`src/components/IsometricCanvas.tsx`): Custom pixel-art sprites for Garth, companions, NPCs, critters, loot, and all dungeon enemies standing on the isometric plane with contact shadows, rarity/boss floor rings, flickering torch/brazier/waystone/forge point lights, 3D projectile streaks, and rising embers.
- **Tactical Readability**: Automatic foreground wall cutaway when occluding the player or nearby enemies, 90° camera orbit rotation (`[` / `]` or HUD buttons) with camera-aligned directional movement (`src/game/isoCamera.ts`), zoom steps (`28 / 36 / 44` or mouse wheel), and exact 3D raycast tile picking.

**Original ElfStory docs:** [PROJECT_TRUTH.md](PROJECT_TRUTH.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [ROADMAP.md](ROADMAP.md) · [STATUS.md](STATUS.md) · [HANDOFF.md](HANDOFF.md)

## Quick start

```bash
npm install --legacy-peer-deps   # plain install hits a peer-resolution conflict (see HANDOFF.md)
npm run dev                       # Vite dev server on http://0.0.0.0:3000
npm run lint                      # tsc --noEmit
npm test                          # node test runner over tests/*.test.ts
npm run build                     # production build into dist/
```
