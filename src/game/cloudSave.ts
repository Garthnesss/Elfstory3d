import { initializeApp } from 'firebase/app';
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { DifficultyTier } from './difficulty';
import {
  ChronicleEntry,
  Item,
  LogEntry,
  PlayerState,
  QuestProgress,
  SaveSlotId,
  WorldFlags,
  ZoneId,
  ZoneMap,
} from './types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

export const SAVE_SLOTS: SaveSlotId[] = ['slot_1', 'slot_2', 'slot_3'];

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerIds?: Array<string | null>;
  };
}

function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerIds:
        auth.currentUser?.providerData?.map((provider) => provider.providerId) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface CloudSavePayload {
  player: PlayerState;
  zones: Record<ZoneId, ZoneMap>;
  currentZoneId: ZoneId;
  worldFlags: WorldFlags;
  quests: Record<string, QuestProgress>;
  merchantStocks: Record<string, Item[]>;
  logs: LogEntry[];
  /** Phase 4: save format version (see saveSlots.ts SAVE_VERSION). */
  version?: number;
  /** Phase 4: per-run difficulty tier ('story' | 'standard' | 'hardened'). */
  difficulty?: DifficultyTier;
  /** Phase 4: epoch ms of first ending completion, once stamped. */
  completedAtMs?: number;
  /** Phase 5: NG+ ascension cycle (absent => 0). */
  ngPlusCycle?: number;
  /** Phase 5: hardcore (permadeath) run flag (absent => false). */
  hardcore?: boolean;
  /** Phase 5: epoch ms of a hardcore run's final death (absent => alive). */
  deadAtMs?: number;
  /** Phase 5: short death note recorded with deadAtMs. */
  deathNote?: string;
}

export interface CloudSaveSummary {
  slotId: SaveSlotId;
  starterClass: PlayerState['starterClass'];
  level: number;
  zoneId: ZoneId;
  zoneName: string;
  buildTitle: string;
  kills: number;
  gold: number;
  updatedAtMs?: number;
  /** Phase 4: set when the run has reached the ending (completion stamp). */
  completedAtMs?: number;
  /** Phase 5: NG+ ascension cycle (absent => 0). */
  ngPlusCycle?: number;
  /** Phase 5: hardcore (permadeath) run flag (absent => false). */
  hardcore?: boolean;
  /** Phase 5: epoch ms of a hardcore run's final death (absent => alive). */
  deadAtMs?: number;
  /** Phase 5: short death note recorded with deadAtMs. */
  deathNote?: string;
}

export interface CloudSlotRecord {
  summary: CloudSaveSummary;
  payload: CloudSavePayload;
}

// Recursively remove undefined fields because Firestore rejects undefined values inside maps
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

// Clamp strings & integers to guarantee adherence to firebase-blueprint.json limits
function sanitizeForBlueprint(
  uid: string,
  payload: CloudSavePayload,
  buildTitle: string
) {
  const safeZoneName = (payload.zones[payload.currentZoneId]?.name ?? 'Oakhaven Outpost').slice(0, 80);
  const safeBuild = (buildTitle || payload.player.starterClass).slice(0, 64);
  const safeLevel = Math.max(1, Math.min(999, Math.floor(payload.player.level)));
  const safeKills = Math.max(0, Math.floor(payload.player.kills));
  const safeGold = Math.max(0, Math.floor(payload.player.gold));

  return {
    ownerId: uid.slice(0, 128),
    starterClass: payload.player.starterClass,
    level: safeLevel,
    zoneId: payload.currentZoneId.slice(0, 32),
    zoneName: safeZoneName,
    buildTitle: safeBuild,
    kills: safeKills,
    gold: safeGold,
    savePayload: stripUndefined({
      player: payload.player,
      zones: packZones(payload.zones),
      currentZoneId: payload.currentZoneId,
      worldFlags: payload.worldFlags,
      quests: payload.quests,
      merchantStocks: payload.merchantStocks,
      logs: payload.logs.slice(0, 25),
      // Phase 4 fields ride along (stripUndefined drops them for legacy
      // payloads that don't carry them yet).
      version: payload.version,
      difficulty: payload.difficulty,
      completedAtMs: payload.completedAtMs,
      // Phase 5 fields ride along the same way.
      ngPlusCycle: payload.ngPlusCycle,
      hardcore: payload.hardcore,
      deadAtMs: payload.deadAtMs,
      deathNote: payload.deathNote,
    }),
  };
}

export function subscribeAuth(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}

export async function checkAuthRedirectResult(): Promise<User | null> {
  try {
    const res = await getRedirectResult(auth);
    return res?.user ?? null;
  } catch {
    return null;
  }
}

export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err) {
    const code = (err as { code?: string })?.code ?? '';
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment'
    ) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw err;
  }
}

export async function signOutGoogle(): Promise<void> {
  await signOut(auth);
}

const MAX_CLOUD_SAVE_BYTES = 940_000;

export async function saveSlotToCloud(
  uid: string,
  slotId: SaveSlotId,
  payload: CloudSavePayload,
  buildTitle: string
): Promise<void> {
  const path = `users/${uid}/saves/${slotId}`;
  const saveRef = doc(db, 'users', uid, 'saves', slotId);
  const cleanDoc = sanitizeForBlueprint(uid, payload, buildTitle);
  const serializedBytes = new TextEncoder().encode(JSON.stringify(cleanDoc)).length;
  if (serializedBytes > MAX_CLOUD_SAVE_BYTES) {
    throw new Error(
      `Cloud save size (${Math.round(serializedBytes / 1024)} KB) exceeds the 940 KB safety ceiling.`
    );
  }

  try {
    const existingSnap = await getDoc(saveRef);
    if (existingSnap.exists()) {
      await updateDoc(saveRef, {
        starterClass: cleanDoc.starterClass,
        level: cleanDoc.level,
        zoneId: cleanDoc.zoneId,
        zoneName: cleanDoc.zoneName,
        buildTitle: cleanDoc.buildTitle,
        kills: cleanDoc.kills,
        gold: cleanDoc.gold,
        savePayload: cleanDoc.savePayload,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(saveRef, {
        ...cleanDoc,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

async function readSingleSlot(
  uid: string,
  docId: string,
  targetSlotId: SaveSlotId
): Promise<CloudSlotRecord | null> {
  const path = `users/${uid}/saves/${docId}`;
  const saveRef = doc(db, 'users', uid, 'saves', docId);
  try {
    const snap = await getDoc(saveRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    const updatedAt = data.updatedAt as { toMillis?: () => number } | undefined;
    const rawPayload = data.savePayload as Record<string, unknown>;
    const unpackedZones = unpackZones(
      (rawPayload.zones ?? {}) as Record<string, Record<string, unknown>>
    );
    return {
      summary: {
        slotId: targetSlotId,
        starterClass: data.starterClass,
        level: data.level,
        zoneId: data.zoneId,
        zoneName: data.zoneName,
        buildTitle: data.buildTitle,
        kills: data.kills,
        gold: data.gold,
        updatedAtMs: updatedAt?.toMillis ? updatedAt.toMillis() : undefined,
        completedAtMs:
          typeof rawPayload.completedAtMs === 'number' ? rawPayload.completedAtMs : undefined,
        ngPlusCycle:
          typeof rawPayload.ngPlusCycle === 'number' ? rawPayload.ngPlusCycle : undefined,
        hardcore: rawPayload.hardcore === true ? true : undefined,
        deadAtMs: typeof rawPayload.deadAtMs === 'number' ? rawPayload.deadAtMs : undefined,
        deathNote: typeof rawPayload.deathNote === 'string' ? rawPayload.deathNote : undefined,
      },
      payload: {
        ...(rawPayload as unknown as Omit<CloudSavePayload, 'zones'>),
        zones: unpackedZones,
      },
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function loadAllCloudSlots(
  uid: string
): Promise<Partial<Record<SaveSlotId, CloudSlotRecord>>> {
  const results = await Promise.all([
    readSingleSlot(uid, 'slot_1', 'slot_1'),
    readSingleSlot(uid, 'slot_2', 'slot_2'),
    readSingleSlot(uid, 'slot_3', 'slot_3'),
    readSingleSlot(uid, 'active', 'slot_1'),
  ]);

  const out: Partial<Record<SaveSlotId, CloudSlotRecord>> = {};
  if (results[0]) out.slot_1 = results[0];
  else if (results[3]) out.slot_1 = results[3];
  if (results[1]) out.slot_2 = results[1];
  if (results[2]) out.slot_3 = results[2];
  return out;
}

export async function deleteCloudSlot(uid: string, slotId: SaveSlotId): Promise<void> {
  const path = `users/${uid}/saves/${slotId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'saves', slotId));
    if (slotId === 'slot_1') {
      await deleteDoc(doc(db, 'users', uid, 'saves', 'active'));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function recordChronicleToCloud(
  uid: string,
  entry: ChronicleEntry
): Promise<void> {
  const safeId = entry.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  const path = `users/${uid}/chronicles/${safeId}`;
  const ref = doc(db, 'users', uid, 'chronicles', safeId);

  const safeDecisions = entry.keyDecisions
    .slice(0, 8)
    .map((d) => String(d).slice(0, 120));

  try {
    await setDoc(ref, {
      ownerId: uid.slice(0, 128),
      outcome: entry.outcome,
      starterClass: entry.starterClass,
      buildTitle: (entry.buildTitle || entry.starterClass).slice(0, 64),
      level: Math.max(1, Math.min(999, Math.floor(entry.level))),
      deepestDepth: Math.max(0, Math.min(999, Math.floor(entry.deepestDepth))),
      kills: Math.max(0, Math.floor(entry.kills)),
      turnsElapsed: Math.max(0, Math.floor(entry.turnsElapsed)),
      gold: Math.max(0, Math.floor(entry.gold)),
      keyDecisions: safeDecisions,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function loadChroniclesFromCloud(uid: string): Promise<ChronicleEntry[]> {
  const path = `users/${uid}/chronicles`;
  try {
    const q = query(
      collection(db, 'users', uid, 'chronicles'),
      where('ownerId', '==', uid),
      limit(30)
    );
    const snap = await getDocs(q);
    const items: ChronicleEntry[] = [];
    snap.forEach((d) => {
      const data = d.data();
      const createdAt = data.createdAt as { toMillis?: () => number } | undefined;
      items.push({
        id: d.id,
        outcome: data.outcome === 'victory' ? 'victory' : 'fallen',
        starterClass: data.starterClass,
        buildTitle: data.buildTitle,
        level: Number(data.level ?? 1),
        deepestDepth: Number(data.deepestDepth ?? 1),
        kills: Number(data.kills ?? 0),
        turnsElapsed: Number(data.turnsElapsed ?? 0),
        gold: Number(data.gold ?? 0),
        keyDecisions: Array.isArray(data.keyDecisions) ? data.keyDecisions : [],
        createdAtMs: createdAt?.toMillis ? createdAt.toMillis() : Date.now(),
      });
    });
    return items.sort((a, b) => b.createdAtMs - a.createdAtMs);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
