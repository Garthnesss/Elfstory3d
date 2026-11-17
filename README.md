# ElfStory 3D

A **True Perspective 3D** remake of **ElfStory** — turn-based tactical dungeon-crawler RPG in the browser starring elven outrider Garth "Big Dick" Elfstrom, playable in **Overhead Tactical 3D** (the default) or **3rd-Person Chase 3D**. Built with React 19 · TypeScript · Three.js · Vite · Tailwind CSS v4 · procedural Web Audio SFX & music · local browser saves.

## What’s New in Perspective 3D
- **Intuitive Cardinal 3D Movement & Camera (`W/A/S/D` & Mouse Orbit)**: Walk straight ahead with `W`/`↑`, strafe cleanly left/right down corridors, drag with the mouse or press `C / E` / `[ / ]` to turn 90° without spending turns, and press `V` to switch between **Overhead Tactical** and **3rd Person Chase**.
- **Articulated 3D Hero (`src/game/heroModel3d.ts`)**: Real-time 3D model of Garth with gear-reactive armor, helm, cape, shield/offhand, sword/runestaff, and stride/slash animations.
- **3D Corridors, Vaulted Dungeon Ceilings & Sky Domes**: Full perspective corridors with twilight sky domes outdoors and overhead vaulted dungeon ceilings in underground zones, plus soft shadows, dynamic torchlight, and fog.
- **Full 3D Entities & Dynamic Lighting** (`src/components/PerspectiveCanvas.tsx`, `src/game/entityModels3d.ts`): Modeled 3D companions, NPCs, critters, loot, and dungeon enemies with contact shadows, rarity/boss floor rings, flickering torch/brazier/waystone/forge point lights, 3D projectile streaks, and rising embers.
- **Tactical Readability**: Automatic foreground wall cutaway when occluding the player or nearby enemies, 90° camera orbit rotation (`[` / `]` or drag) with camera-aligned directional movement (`src/game/cameraYaw.ts`), six zoom steps (mouse wheel or pinch), and exact 3D raycast tile picking.

**Original ElfStory docs:** [PROJECT_TRUTH.md](PROJECT_TRUTH.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [ROADMAP.md](ROADMAP.md) · [STATUS.md](STATUS.md) · [HANDOFF.md](HANDOFF.md)

## Quick start

```bash
npm install                       # plain install works since Firebase was removed (Nov 17, 2026)
npm run dev                       # Vite dev server on http://0.0.0.0:3000
npm run lint                      # tsc --noEmit
npm test                          # node test runner over tests/*.test.ts
npm run build                     # production build into dist/
```
