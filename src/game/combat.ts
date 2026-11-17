import { computeDerivedStats, SKILLS } from './skills';
import { Enemy, EnemyIntent, PlayerState, StatusKind, Tile, WorldFlags, ZoneMap } from './types';

export function computeVisibility(zone: ZoneMap, px: number, py: number, radius = 8): void {
  if (zone.isTown) {
    for (let y = 0; y < zone.height; y++) {
      for (let x = 0; x < zone.width; x++) {
        zone.tiles[y][x].visible = true;
        zone.tiles[y][x].explored = true;
      }
    }
    return;
  }

  for (let y = 0; y < zone.height; y++) {
    for (let x = 0; x < zone.width; x++) {
      zone.tiles[y][x].visible = false;
    }
  }

  const steps = 72;
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let rx = px + 0.5;
    let ry = py + 0.5;

    for (let d = 0; d <= radius; d += 0.5) {
      const tx = Math.floor(rx);
      const ty = Math.floor(ry);
      if (tx < 0 || ty < 0 || tx >= zone.width || ty >= zone.height) break;
      const tile: Tile = zone.tiles[ty][tx];
      tile.visible = true;
      tile.explored = true;
      if (tile.blocksSight && !(tx === px && ty === py)) {
        break;
      }
      rx += dx * 0.5;
      ry += dy * 0.5;
    }
  }
}

export function manhattan(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

export function chebyshev(ax: number, ay: number, bx: number, by: number): number {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

export function hasLineOfSight(zone: ZoneMap, x0: number, y0: number, x1: number, y1: number): boolean {
  const dist = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  if (dist === 0) return true;
  for (let i = 1; i < dist; i++) {
    const t = i / dist;
    const cx = Math.round(x0 + (x1 - x0) * t);
    const cy = Math.round(y0 + (y1 - y0) * t);
    if (zone.tiles[cy]?.[cx]?.blocksSight) return false;
  }
  return true;
}

export function applyStatus(
  statuses: Array<{ kind: StatusKind; turns: number; potency: number }>,
  kind: StatusKind,
  turns: number,
  potency: number
): void {
  const existing = statuses.find((s) => s.kind === kind);
  if (existing) {
    existing.turns = Math.max(existing.turns, turns);
    existing.potency = Math.max(existing.potency, potency);
  } else {
    statuses.push({ kind, turns, potency });
  }
}

export function hasAffix(player: PlayerState, affix: string): boolean {
  return Object.values(player.equipped).some((item) => item?.affix === affix);
}

export function chooseEnemyIntent(enemy: Enemy, player: PlayerState, zone: ZoneMap): EnemyIntent | undefined {
  if (enemy.statuses.some((s) => s.kind === 'stunned')) {
    return undefined;
  }
  const dist = chebyshev(enemy.x, enemy.y, player.x, player.y);
  const chilled = enemy.statuses.some((s) => s.kind === 'chilled');
  const dmgScale = chilled ? 0.65 : 1;

  // Rare / Randboss enemies roll real player skills off cooldown
  if (enemy.skillLoadout && enemy.skillLoadout.length > 0 && Math.random() < 0.65) {
    const readySkills = enemy.skillLoadout.filter((id) => (enemy.skillCooldowns?.[id] ?? 0) === 0);
    for (const skillId of readySkills) {
      if (skillId === 'ember_lance' && dist >= 2 && dist <= 5 && hasLineOfSight(zone, enemy.x, enemy.y, player.x, player.y)) {
        return {
          type: 'enemy_skill',
          skillId,
          label: `Charging ${SKILLS[skillId].name}`,
          damage: Math.round(enemy.atk * 1.45 * dmgScale),
          targetTiles: [{ x: player.x, y: player.y }],
        };
      }
      if (skillId === 'venom_tip' && dist >= 2 && dist <= 4 && hasLineOfSight(zone, enemy.x, enemy.y, player.x, player.y)) {
        return {
          type: 'enemy_skill',
          skillId,
          label: `Aiming ${SKILLS[skillId].name}`,
          damage: Math.round(enemy.atk * 1.25 * dmgScale),
          targetTiles: [{ x: player.x, y: player.y }],
        };
      }
      if (skillId === 'frost_nova' && dist <= 2) {
        const area: Array<{ x: number; y: number }> = [];
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (dx === 0 && dy === 0) continue;
            const tx = enemy.x + dx;
            const ty = enemy.y + dy;
            if (zone.tiles[ty]?.[tx]?.walkable) area.push({ x: tx, y: ty });
          }
        }
        return {
          type: 'enemy_skill',
          skillId,
          label: `Gathering ${SKILLS[skillId].name}`,
          damage: Math.round(enemy.atk * 1.35 * dmgScale),
          targetTiles: area,
        };
      }
      if ((skillId === 'shield_bash' || skillId === 'cleave') && dist === 1) {
        return {
          type: 'enemy_skill',
          skillId,
          label: `Telegraphing ${SKILLS[skillId].name}`,
          damage: Math.round(enemy.atk * (skillId === 'cleave' ? 1.55 : 1.3) * dmgScale),
          targetTiles: [{ x: player.x, y: player.y }],
        };
      }
      if (skillId === 'shadowstep' && dist >= 2 && dist <= 4 && hasLineOfSight(zone, enemy.x, enemy.y, player.x, player.y)) {
        return {
          type: 'enemy_skill',
          skillId,
          label: `Priming ${SKILLS[skillId].name} Ambush`,
          damage: Math.round(enemy.atk * 1.4 * dmgScale),
          targetTiles: [{ x: player.x, y: player.y }],
        };
      }
    }
  }

  // Boss / heavy archetypes telegraph impactful windups
  if (
    (enemy.archetype === 'iron_golem' ||
      enemy.archetype === 'obsidian_warden' ||
      enemy.archetype === 'spore_hulk' ||
      enemy.archetype === 'boss_ashen_inquisitor' ||
      enemy.archetype === 'boss_malakor') &&
    dist <= 2 &&
    Math.random() < 0.45
  ) {
    const targets: Array<{ x: number; y: number }> = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const tx = enemy.x + dx;
        const ty = enemy.y + dy;
        if (zone.tiles[ty]?.[tx]?.walkable) {
          targets.push({ x: tx, y: ty });
        }
      }
    }
    return {
      type: 'ground_slam',
      label:
        enemy.archetype === 'obsidian_warden'
          ? 'Winding up Obsidian Cleave'
          : enemy.archetype === 'spore_hulk'
            ? 'Swelling Spore Slam'
            : 'Winding up Ground Slam',
      damage: Math.round(enemy.atk * 1.55 * dmgScale),
      targetTiles: targets,
    };
  }

  if (
    (enemy.archetype === 'bone_acolyte' ||
      enemy.archetype === 'ash_cultist' ||
      enemy.archetype === 'blight_weaver' ||
      enemy.archetype === 'rime_revenant' ||
      enemy.archetype === 'boss_bone_cantor' ||
      enemy.archetype === 'boss_malakor') &&
    dist >= 2 &&
    dist <= 5 &&
    hasLineOfSight(zone, enemy.x, enemy.y, player.x, player.y) &&
    Math.random() < 0.65
  ) {
    return {
      type: 'hex_bolt',
      label:
        enemy.archetype === 'blight_weaver'
          ? 'Weaving Venom Hex'
          : enemy.archetype === 'rime_revenant'
            ? 'Charging Rime Bolt'
            : 'Charging Hex Bolt',
      damage: Math.round(enemy.atk * 1.25 * dmgScale),
      targetTiles: [{ x: player.x, y: player.y }],
    };
  }

  if (
    (enemy.archetype === 'goblin_skirmisher' ||
      enemy.archetype === 'crypt_skeleton' ||
      enemy.archetype === 'shadow_stalker' ||
      enemy.archetype === 'grave_husk' ||
      enemy.archetype === 'dread_wraith') &&
    dist === 1 &&
    Math.random() < 0.38
  ) {
    return {
      type: 'heavy_windup',
      label:
        enemy.archetype === 'dread_wraith'
          ? 'Channeling Soul Chill'
          : enemy.archetype === 'grave_husk'
            ? 'Raising a Tomb-Cleaver Blow'
            : 'Telegraphing Heavy Strike',
      damage: Math.round(enemy.atk * 1.45 * dmgScale),
      targetTiles: [{ x: player.x, y: player.y }],
    };
  }

  return undefined;
}

export function calculatePlayerHit(
  player: PlayerState,
  target: Enemy,
  multiplier = 1,
  isSpell = false,
  forceCrit = false,
  ignoreDefRatio = 0,
  worldFlags?: WorldFlags
): { damage: number; isCrit: boolean; lifestealHeal: number } {
  const stats = computeDerivedStats(player, worldFlags);
  const rawPower = isSpell ? stats.spellPower : stats.atk;
  let critChance = stats.critChance;
  if ((player.skills.bloodlust ?? 0) > 0 && target.hp < target.maxHp * 0.5) {
    const rank = player.skills.bloodlust ?? 0;
    critChance += rank === 1 ? 10 : rank === 2 ? 18 : 25;
  }

  const isCrit = forceCrit || Math.random() * 100 < critChance;
  let dmg = rawPower * multiplier;


  if (player.firstStrikeReady && hasAffix(player, 'first_strike')) {
    dmg *= 1.35;
  }

  if (target.hp < target.maxHp * 0.4 && hasAffix(player, 'execute_bonus')) {
    dmg *= 1.25;
  }

  const marked = target.statuses.find((s) => s.kind === 'marked');
  if (marked) {
    dmg *= 1 + marked.potency / 100;
  }

  if (isCrit) {
    dmg *= 1.65;
  }

  const effectiveDef = Math.round(target.def * (1 - ignoreDefRatio));
  const finalDamage = Math.max(2, Math.round(dmg - effectiveDef * 0.6));

  let lifestealHeal = 0;
  if (!isSpell && stats.lifesteal > 0) {
    lifestealHeal += Math.max(1, Math.round((finalDamage * stats.lifesteal) / 100));
  }
  if (isCrit && hasAffix(player, 'vampiric_touch')) {
    lifestealHeal += 3;
  }

  return { damage: finalDamage, isCrit, lifestealHeal };
}

export function findPathNextStep(
  zone: ZoneMap,
  sx: number,
  sy: number,
  tx: number,
  ty: number
): { x: number; y: number } | null {
  if (sx === tx && sy === ty) return null;
  const visited = new Set<string>();
  const queue: Array<{ x: number; y: number; firstStep: { x: number; y: number } | null }> = [
    { x: sx, y: sy, firstStep: null },
  ];
  visited.add(`${sx},${sy}`);

  const dirs = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: -1 },
    { dx: 1, dy: 1 },
    { dx: -1, dy: 1 },
    { dx: -1, dy: -1 },
  ];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.x === tx && cur.y === ty) {
      return cur.firstStep;
    }

    for (const d of dirs) {
      const nx = cur.x + d.dx;
      const ny = cur.y + d.dy;
      const key = `${nx},${ny}`;
      if (visited.has(key)) continue;
      if (nx < 0 || ny < 0 || nx >= zone.width || ny >= zone.height) continue;
      const tile = zone.tiles[ny][nx];
      if (!tile.walkable) continue;
      if (d.dx !== 0 && d.dy !== 0) {
        if (!zone.tiles[cur.y]?.[nx]?.walkable || !zone.tiles[ny]?.[cur.x]?.walkable) continue;
      }
      const blockedByEnemy = zone.enemies.some((e) => e.x === nx && e.y === ny && !(nx === tx && ny === ty));
      const blockedByNpc = zone.npcs.some((n) => n.x === nx && n.y === ny && !(nx === tx && ny === ty));
      if (blockedByEnemy || blockedByNpc) continue;

      visited.add(key);
      queue.push({
        x: nx,
        y: ny,
        firstStep: cur.firstStep ?? { x: nx, y: ny },
      });
    }
  }
  return null;
}

export function findPathPoints(
  zone: ZoneMap,
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  exploredOnly = true,
  maxSteps = 16
): Array<{ x: number; y: number }> {
  if (sx === tx && sy === ty) return [];
  if (tx < 0 || ty < 0 || tx >= zone.width || ty >= zone.height) return [];
  const destTile = zone.tiles[ty]?.[tx];
  if (!destTile?.walkable || (exploredOnly && !destTile.explored)) return [];

  const visited = new Set<string>();
  const parent = new Map<string, string>();
  const queue: Array<{ x: number; y: number; dist: number }> = [{ x: sx, y: sy, dist: 0 }];
  visited.add(`${sx},${sy}`);

  const dirs = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: -1 },
    { dx: 1, dy: 1 },
    { dx: -1, dy: 1 },
    { dx: -1, dy: -1 },
  ];

  let found = false;
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.x === tx && cur.y === ty) {
      found = true;
      break;
    }
    if (cur.dist >= maxSteps) continue;

    for (const d of dirs) {
      const nx = cur.x + d.dx;
      const ny = cur.y + d.dy;
      const key = `${nx},${ny}`;
      if (visited.has(key)) continue;
      if (nx < 0 || ny < 0 || nx >= zone.width || ny >= zone.height) continue;
      const tile = zone.tiles[ny][nx];
      if (!tile.walkable || (exploredOnly && !tile.explored)) continue;
      if (d.dx !== 0 && d.dy !== 0) {
        const c1 = zone.tiles[cur.y]?.[nx];
        const c2 = zone.tiles[ny]?.[cur.x];
        if (!c1?.walkable || !c2?.walkable) continue;
        if (exploredOnly && (!c1.explored || !c2.explored)) continue;
      }
      const blockedByEnemy =
        tile.visible && zone.enemies.some((e) => e.x === nx && e.y === ny && !(nx === tx && ny === ty));
      const blockedByNpc = zone.npcs.some((n) => n.x === nx && n.y === ny && !(nx === tx && ny === ty));
      if (blockedByEnemy || blockedByNpc) continue;
      // Stairs auto-trigger a zone change when stepped on: never route
      // *through* them. They are only valid as the final destination.
      if ((tile.kind === 'stairs_up' || tile.kind === 'stairs_down') && !(nx === tx && ny === ty)) continue;

      visited.add(key);
      parent.set(key, `${cur.x},${cur.y}`);
      queue.push({ x: nx, y: ny, dist: cur.dist + 1 });
    }
  }

  if (!found) return [];
  const path: Array<{ x: number; y: number }> = [];
  let curKey = `${tx},${ty}`;
  const startKey = `${sx},${sy}`;
  while (curKey && curKey !== startKey) {
    const [cx, cy] = curKey.split(',').map(Number);
    path.push({ x: cx, y: cy });
    curKey = parent.get(curKey) ?? '';
  }
  return path.reverse();
}

export function findAutoExploreTarget(
  zone: ZoneMap,
  px: number,
  py: number
): { nextStep: { x: number; y: number } | null; reason: 'loot' | 'chest' | 'frontier' | 'stairs' | 'done' } {
  const dirs = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: -1 },
    { dx: 1, dy: 1 },
    { dx: -1, dy: 1 },
    { dx: -1, dy: -1 },
  ];

  const isTargetFrontier = (x: number, y: number): boolean => {
    for (const d of dirs) {
      const nx = x + d.dx;
      const ny = y + d.dy;
      const nt = zone.tiles[ny]?.[nx];
      if (nt && !nt.explored) return true;
    }
    return false;
  };

  const bfsSearch = (predicate: (x: number, y: number) => boolean): { x: number; y: number } | null => {
    const visited = new Set<string>();
    const queue: Array<{ x: number; y: number; firstStep: { x: number; y: number } | null }> = [
      { x: px, y: py, firstStep: null },
    ];
    visited.add(`${px},${py}`);

    while (queue.length > 0) {
      const cur = queue.shift()!;
      if ((cur.x !== px || cur.y !== py) && predicate(cur.x, cur.y)) {
        return cur.firstStep;
      }

      for (const d of dirs) {
        const nx = cur.x + d.dx;
        const ny = cur.y + d.dy;
        const key = `${nx},${ny}`;
        if (visited.has(key)) continue;
        if (nx < 0 || ny < 0 || nx >= zone.width || ny >= zone.height) continue;
        const tile = zone.tiles[ny][nx];
        if (!tile.explored || !tile.walkable) continue;
        if (d.dx !== 0 && d.dy !== 0) {
          const c1 = zone.tiles[cur.y]?.[nx];
          const c2 = zone.tiles[ny]?.[cur.x];
          if (!c1?.explored || !c1.walkable || !c2?.explored || !c2.walkable) continue;
        }
        if ((tile.kind === 'trap' || tile.kind === 'dart_trap') && tile.revealed && !tile.used) continue;
        if (
          (tile.kind === 'spore_pool' ||
            tile.kind === 'frost_vent' ||
            tile.kind === 'ember_crust' ||
            tile.kind === 'shock_rune') &&
          !tile.used
        ) {
          continue;
        }
        if (zone.npcs.some((n) => n.x === nx && n.y === ny)) continue;
        // Stairs auto-trigger a zone change when stepped on: never use them
        // as a waypoint. stairs_down may be entered only when it is the BFS
        // target itself (stage 4's deliberate descent); stairs_up never.
        if (tile.kind === 'stairs_up') continue;
        if (tile.kind === 'stairs_down' && !predicate(nx, ny)) continue;

        visited.add(key);
        queue.push({
          x: nx,
          y: ny,
          firstStep: cur.firstStep ?? { x: nx, y: ny },
        });
      }
    }
    return null;
  };

  // 1. Collect visible/known ground loot
  const lootStep = bfsSearch((x, y) => zone.loot.some((l) => l.x === x && l.y === y));
  if (lootStep) return { nextStep: lootStep, reason: 'loot' };

  // 2. Open known unopened standard chests (avoid auto-walking into unrevealed vault chests)
  const chestStep = bfsSearch((x, y) => {
    const t = zone.tiles[y][x];
    return t.kind === 'chest' && !t.used;
  });
  if (chestStep) return { nextStep: chestStep, reason: 'chest' };

  // 3. Explore nearest frontier adjacent to unexplored tiles
  const frontierStep = bfsSearch((x, y) => isTargetFrontier(x, y));
  if (frontierStep) return { nextStep: frontierStep, reason: 'frontier' };

  // 4. Otherwise walk to the discovered descent stairs — but stop beside
  // them. Stepping on stairs changes zone, so the descent stays the
  // player's call (the Nov 16 playtest saw Auto-Explore carry the hero past
  // an uncollected quest cache straight down to Floor 2).
  if (!zone.isTown && zone.tiles[py]?.[px]?.kind !== 'stairs_down') {
    const stairStep = bfsSearch((x, y) => zone.tiles[y][x].kind === 'stairs_down');
    if (stairStep) {
      if (zone.tiles[stairStep.y]?.[stairStep.x]?.kind === 'stairs_down') {
        return { nextStep: null, reason: 'stairs' };
      }
      return { nextStep: stairStep, reason: 'stairs' };
    }
  }

  return { nextStep: null, reason: 'done' };
}
