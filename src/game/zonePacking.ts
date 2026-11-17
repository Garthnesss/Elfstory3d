// Local save packing (RLE + bitmask tile rows), split out of the removed
// cloudSave.ts when Firebase cloud saves were cut (Lean core, Nov 17, 2026).
import { SaveSlotId, ZoneId, ZoneMap } from './types';

export const SAVE_SLOTS: SaveSlotId[] = ['slot_1', 'slot_2', 'slot_3'];

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefined(v);
      }
    }
    return out as T;
  }
  return value;
}

// Pack 2D Tile[][] into Firestore-safe, RLE-compressed row strings (avoids nested array limit & slashes save size)
function serializeTileCell(t: ZoneMap['tiles'][number][number]): string {
  const flags =
    (t.walkable ? 1 : 0) |
    (t.blocksSight ? 2 : 0) |
    (t.explored ? 4 : 0) |
    (t.visible ? 8 : 0) |
    (t.used ? 16 : 0) |
    (t.revealed ? 32 : 0);
  const interactId = (t.interactId ?? '').replace(/[|;=]/g, '');
  const label = (t.label ?? '').replace(/[|;=]/g, '');
  const safeGlyph = (t.glyph || '·').replace(/[|;=]/g, '');
  const base = `${t.kind}|${safeGlyph}|${t.color}|${flags}`;
  if (interactId || label) {
    return `${base}|${interactId}|${label}`;
  }
  return base;
}

function packTileRow(row: ZoneMap['tiles'][number]): string {
  const runs: string[] = [];
  let prevCell: string | null = null;
  let runLen = 0;

  const flush = () => {
    if (prevCell === null) return;
    runs.push(runLen > 1 ? `${prevCell}=${runLen}` : prevCell);
  };

  for (const t of row) {
    const cell = serializeTileCell(t);
    if (cell === prevCell) {
      runLen += 1;
    } else {
      flush();
      prevCell = cell;
      runLen = 1;
    }
  }
  flush();
  return runs.join(';');
}

function decodeTileParts(parts: string[], x: number, y: number): ZoneMap['tiles'][number][number] {
  // Legacy 11-field format: kind|glyph|color|w|bs|ex|vis|used|rev|interactId|label
  if (parts.length >= 11) {
    return {
      x,
      y,
      kind: (parts[0] || 'floor') as ZoneMap['tiles'][number][number]['kind'],
      glyph: parts[1] || '·',
      color: parts[2] || '#39414E',
      walkable: parts[3] === '1',
      blocksSight: parts[4] === '1',
      explored: parts[5] === '1',
      visible: parts[6] === '1',
      used: parts[7] === '1' ? true : undefined,
      revealed: parts[8] === '1' ? true : undefined,
      interactId: parts[9] || undefined,
      label: parts[10] || undefined,
    };
  }
  // Compact 4-field or 6-field bitmask format: kind|glyph|color|flags(|interactId|label)
  const flags = Number(parts[3] ?? 0);
  return {
    x,
    y,
    kind: (parts[0] || 'floor') as ZoneMap['tiles'][number][number]['kind'],
    glyph: parts[1] || '·',
    color: parts[2] || '#39414E',
    walkable: Boolean(flags & 1),
    blocksSight: Boolean(flags & 2),
    explored: Boolean(flags & 4),
    visible: Boolean(flags & 8),
    used: flags & 16 ? true : undefined,
    revealed: flags & 32 ? true : undefined,
    interactId: parts[4] || undefined,
    label: parts[5] || undefined,
  };
}

function unpackTileRows(rows: string[], width: number, height: number): ZoneMap['tiles'] {
  const tiles: ZoneMap['tiles'] = [];
  for (let y = 0; y < height; y++) {
    const tokens = (rows[y] ?? '').split(';');
    const row: ZoneMap['tiles'][number] = [];
    for (const token of tokens) {
      if (!token) continue;
      if (row.length >= width) break;
      const rleMatch = token.match(/^(.*)=(\d+)$/);
      let cellStr = token;
      let count = 1;
      if (rleMatch) {
        const candidateParts = rleMatch[1].split('|');
        if (
          (candidateParts.length === 4 || candidateParts.length === 6) &&
          /^\d+$/.test(candidateParts[3] ?? '')
        ) {
          cellStr = rleMatch[1];
          count = Math.max(1, Number(rleMatch[2]));
        }
      }
      const parts = cellStr.split('|');
      for (let k = 0; k < count && row.length < width; k++) {
        row.push(decodeTileParts(parts, row.length, y));
      }
    }
    while (row.length < width) {
      row.push(decodeTileParts([], row.length, y));
    }
    tiles.push(row);
  }
  return tiles;
}

export function packZones(zones: Record<ZoneId, ZoneMap>): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const [id, z] of Object.entries(zones)) {
    const { tiles, ...rest } = z;
    out[id] = {
      ...rest,
      packedTileRows: tiles.map(packTileRow),
    };
  }
  return out;
}

export function unpackZones(rawZones: Record<string, Record<string, unknown>>): Record<ZoneId, ZoneMap> {
  const out: Record<string, ZoneMap> = {};
  for (const [id, raw] of Object.entries(rawZones)) {
    if (Array.isArray(raw.tiles)) {
      out[id] = raw as unknown as ZoneMap;
      continue;
    }
    const width = Number(raw.width ?? 0);
    const height = Number(raw.height ?? 0);
    const rows = Array.isArray(raw.packedTileRows) ? (raw.packedTileRows as string[]) : [];
    const { packedTileRows: _ignored, ...rest } = raw;
    out[id] = {
      ...(rest as unknown as Omit<ZoneMap, 'tiles'>),
      tiles: unpackTileRows(rows, width, height),
    };
  }
  return out as Record<ZoneId, ZoneMap>;
}
