import { User } from 'firebase/auth';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CornerDownLeft, Gamepad2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActionDock } from './components/ActionDock';
import { IsometricCanvas } from './components/IsometricCanvas';
import { CharacterSkillsModal } from './components/CharacterSkillsModal';
import { CreditsScreen } from './components/CreditsScreen';
import { DialogueModal } from './components/DialogueModal';
import { EndPauseModal } from './components/EndPauseModal';
import { EndingScreen } from './components/EndingScreen';
import { HallOfFameModal } from './components/HallOfFameModal';
import { InventoryModal } from './components/InventoryModal';
import { LegendModal } from './components/LegendModal';
import { MerchantModal } from './components/MerchantModal';
import { QuestJournalModal } from './components/QuestJournalModal';
import { QuestTracker } from './components/QuestTracker';
import { SettingsModal } from './components/SettingsModal';
import { SpecialEncounterModal, SpecialPrompt } from './components/SpecialEncounterModal';
import { TutorialOverlay } from './components/TutorialOverlay';
import { LocalSlotSummary, TitleScreen } from './components/TitleScreen';
import { TopHud } from './components/TopHud';
import { TownUpgradesModal } from './components/TownUpgradesModal';
import { TravelModal } from './components/TravelModal';
import { resolveMusicTheme, soundEngine } from './game/audio';
import { CameraYawIndex, normalizeYawIndex, rotateStepByYaw } from './game/isoCamera';
import {
  DIFFICULTY_INFO,
  DifficultyTier,
  normalizeDifficulty,
  scaleXpForDifficulty,
  setCurrentCycle,
  setCurrentDifficulty,
} from './game/difficulty';
import {
  LEGACY_SAVE_KEY,
  SAVE_VERSION,
  SavedBundle,
  SlotIssue,
  bundleCycle,
  bundleDifficulty,
  bundleHardcore,
  canLoadBundle,
  corruptSlotMessage,
  fallenBundleMessage,
  futureVersionMessage,
  getLocalSlotKey,
  isBundleDead,
  parseStoredBundle,
  readAllSlotStates,
  stampBundle,
} from './game/saveSlots';
import {
  LifetimeEvent,
  LifetimeStats,
  applyLifetimeEvent,
  deepestDepthForZones,
  loadLifetime,
  saveLifetime,
} from './game/lifetime';
import {
  GameSettings,
  isTutorialDone,
  loadSettings,
  loadTileSize,
  markTutorialDone,
  resolveKeyAction,
  saveSettings,
  saveTileSize,
  textSizeRootPx,
} from './game/settings';
import { GamepadAction, GamepadPoller } from './game/gamepad';
import { COACH_MARKS, CoachMarkId, claimCoachMark } from './game/coachMarks';
import {
  countConsumables,
  isTutorialStepComplete,
  TUTORIAL_STEPS,
  TutorialBaseline,
} from './game/tutorial';
import {
  checkAuthRedirectResult,
  CloudSavePayload,
  CloudSaveSummary,
  deleteCloudSlot,
  loadAllCloudSlots,
  loadChroniclesFromCloud,
  packZones,
  recordChronicleToCloud,
  SAVE_SLOTS,
  saveSlotToCloud,
  signInWithGoogle,
  signOutGoogle,
  subscribeAuth,
  unpackZones,
} from './game/cloudSave';
import {
  BESTIARY_DEFS,
  computeBestiaryPerks,
  FEAT_DEFS,
  TOWN_UPGRADE_DEFS,
} from './game/codex';
import {
  applyStatus,
  calculatePlayerHit,
  chebyshev,
  chooseEnemyIntent,
  computeVisibility,
  findAutoExploreTarget,
  findPathNextStep,
  hasAffix,
  hasLineOfSight,
  manhattan,
} from './game/combat';
import {
  createConsumable,
  createNamedRelic,
  createQuestItem,
  createRandomSetRelic,
  createStarterItem,
  enchantEquipmentItem,
  generateInscription,
  generateProceduralItem,
  getSalvageDustYield,
  getStarterInscriptions,
  INSCRIPTION_META,
  rerollEquipmentAffix,
  RUNE_ENCHANTS,
  upgradeEquipmentItem,
} from './game/loot';
import { createMerchantStock, LORE_ENTRIES, NPCS, QUEST_DEFS } from './game/npcs';
import {
  canLearnProdigy,
  canLearnSkill,
  computeDerivedStats,
  computeRespecPoints,
  getStarterPreset,
  hasProdigy,
  PRODIGIES,
  SKILLS,
} from './game/skills';
import {
  ActivePanel,
  AttributeKey,
  ChronicleEntry,
  CompanionKind,
  CompanionState,
  DialogueChoice,
  Enemy,
  FloatingEffect,
  GameState,
  HitFlash,
  Item,
  ItemSlot,
  LogEntry,
  ParticleBurst,
  PlayerState,
  ProdigyId,
  ProjectileEffect,
  QuestProgress,
  RuneEnchantId,
  SaveSlotId,
  SkillId,
  StatusKind,
  WorldFlags,
  ZoneId,
  ZoneMap,
} from './game/types';
import { pickAmbientBark, pickDungeonAmbience, stepCritters, stepNpcWander } from './game/ambient';
import { createInitialZones, generateDungeonFloor, generateZoneById, getZoneContext } from './game/world';

const CHRONICLES_KEY = 'ashen_glyph_chronicles_v1';

// SavedBundle, slot keys, SAVE_VERSION stamping and the per-slot read
// results live in game/saveSlots.ts (Phase 4) so the versioning and
// corruption-isolation logic is unit-testable without a DOM.

function formatCloudError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? 'network error');
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as { error?: string };
      if (parsed?.error) return parsed.error;
    } catch {
      // fall through
    }
  }
  return raw;
}

function hydrateSavedBundle(rawBundle: SavedBundle): SavedBundle {
  return {
    ...rawBundle,
    zones: unpackZones((rawBundle.zones ?? {}) as unknown as Record<string, Record<string, unknown>>),
  };
}

function makeLocalSummary(slotId: SaveSlotId, bundle: SavedBundle): LocalSlotSummary {
  return {
    slotId,
    starterClass: bundle.player.starterClass,
    level: bundle.player.level,
    zoneName: bundle.zones[bundle.currentZoneId]?.name ?? 'Oakhaven Outpost',
    buildTitle: computeDerivedStats(bundle.player, bundle.worldFlags).buildTitle,
    kills: bundle.player.kills,
    updatedAtMs: bundle.updatedAtMs,
    completedAtMs: bundle.completedAtMs,
    difficulty: bundleDifficulty(bundle),
    ngPlusCycle: bundleCycle(bundle),
    hardcore: bundleHardcore(bundle),
    deadAtMs: bundle.deadAtMs,
    deathNote: bundle.deathNote,
  };
}

/**
 * Phase 4 slot scan: every slot is read and hydrated INDEPENDENTLY (via
 * saveSlots' per-slot read results), so a corrupt or future-version bundle
 * in one slot surfaces as a SlotIssue for that slot only — the Title
 * Screen list and the other slots keep working, and the bad slot can
 * still be deleted.
 */
function scanLocalSlots(): {
  map: Partial<Record<SaveSlotId, { summary: LocalSlotSummary; bundle: SavedBundle }>>;
  issues: Partial<Record<SaveSlotId, SlotIssue>>;
} {
  const map: Partial<Record<SaveSlotId, { summary: LocalSlotSummary; bundle: SavedBundle }>> = {};
  const issues: Partial<Record<SaveSlotId, SlotIssue>> = {};
  const states = readAllSlotStates();
  for (const slotId of SAVE_SLOTS) {
    const state = states[slotId];
    if (state.status === 'ok') {
      try {
        const bundle = hydrateSavedBundle(state.bundle);
        map[slotId] = { summary: makeLocalSummary(slotId, bundle), bundle };
      } catch {
        issues[slotId] = { kind: 'corrupt', message: corruptSlotMessage() };
      }
    } else if (state.status === 'corrupt' || state.status === 'future-version') {
      issues[slotId] = { kind: state.status, message: state.message };
    }
  }
  if (!map.slot_1 && !issues.slot_1) {
    try {
      const legacy = parseStoredBundle(localStorage.getItem(LEGACY_SAVE_KEY));
      if (legacy.status === 'ok') {
        const bundle = hydrateSavedBundle(legacy.bundle);
        map.slot_1 = { summary: makeLocalSummary('slot_1', bundle), bundle };
      }
    } catch {
      // Ignore malformed legacy storage
    }
  }
  return { map, issues };
}

function readLocalChronicles(): ChronicleEntry[] {
  try {
    const raw = localStorage.getItem(CHRONICLES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChronicleEntry[]) : [];
  } catch {
    return [];
  }
}

// P1: companion durability scales with player level. Flat 24/20 HP meant the
// companion died permanently from about F5 no matter how strong the player got.
function companionMaxHpFor(kind: CompanionKind, level: number): number {
  return kind === 'starlight_owl' ? 20 + (level - 1) * 5 : 24 + (level - 1) * 7;
}

function makeCompanion(kind: CompanionKind, x: number, y: number, level = 1): CompanionState {
  const maxHp = companionMaxHpFor(kind, level);
  if (kind === 'starlight_owl') {
    return {
      kind,
      name: 'Starlight Owl',
      x,
      y,
      hp: maxHp,
      maxHp,
      stance: 'aggressive',
      respawnCooldown: 0,
    };
  }
  return {
    kind: 'silverwind_lynx',
    name: 'Silverwind Lynx',
    x,
    y,
    hp: maxHp,
    maxHp,
    stance: 'aggressive',
    respawnCooldown: 0,
  };
}

function getSightRadius(p: PlayerState, flags?: WorldFlags): number {
  const owlBonus = p.companion?.kind === 'starlight_owl' && p.companion.hp > 0 ? 1 : 0;
  const watchtowerBonus = (flags?.townUpgrades?.watchtower ?? 0) >= 2 ? 1 : 0;
  return 8 + owlBonus + watchtowerBonus;
}

function placeCompanionNear(zone: ZoneMap, px: number, py: number): { x: number; y: number } {
  const offsets = [
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
    { dx: -1, dy: 1 },
    { dx: 1, dy: 1 },
    { dx: -1, dy: -1 },
    { dx: 1, dy: -1 },
  ];
  for (const off of offsets) {
    const nx = px + off.dx;
    const ny = py + off.dy;
    const tile = zone.tiles[ny]?.[nx];
    if (
      tile?.walkable &&
      !zone.enemies.some((e) => e.x === nx && e.y === ny) &&
      !zone.npcs.some((n) => n.x === nx && n.y === ny)
    ) {
      return { x: nx, y: ny };
    }
  }
  return { x: px, y: py };
}

function createInitialPlayer(starterClass: PlayerState['starterClass']): PlayerState {
  const preset = getStarterPreset(starterClass);
  const starterWeapon = createStarterItem(preset.weaponTag);
  const companionKind: CompanionKind = starterClass === 'Runecaster' ? 'starlight_owl' : 'silverwind_lynx';
  const basePlayer: PlayerState = {
    name: 'Garth "Big Dick" Elfstrom',
    starterClass,
    x: 12,
    y: 9,
    lastDirX: 1,
    hp: 48,
    maxHp: 48,
    mana: 18,
    maxMana: 18,
    level: 1,
    xp: 0,
    xpToNext: 65,
    gold: 35,
    glyphDust: 6,
    attributePoints: 0,
    skillPoints: 1,
    attributes: { ...preset.attributes },
    skills: { [preset.initialSkill]: 1 },
    hotbar: [preset.initialSkill, null, null, null, null],
    cooldowns: {},
    inscriptions: getStarterInscriptions(starterClass),
    inscriptionCooldowns: [0, 0, 0],
    prodigies: [],
    prodigyPoints: 0,
    prodigyCooldowns: {},
    hasteSteps: 0,
    bonusHp: 0,
    statuses: [],
    equipped: { weapon: starterWeapon },
    inventory: [createConsumable('heal_potion', 2), createConsumable('mana_potion', 1)],
    kills: 0,
    turnsElapsed: 0,
    firstStrikeReady: true,
    companion: makeCompanion(companionKind, 11, 9),
  };
  const derived = computeDerivedStats(basePlayer);
  basePlayer.maxHp = derived.maxHp;
  basePlayer.hp = derived.maxHp;
  basePlayer.maxMana = derived.maxMana;
  basePlayer.mana = derived.maxMana;
  return basePlayer;
}

function createInitialFlags(): WorldFlags {
  return {
    discoveredZones: ['oakhaven'],
    miraPotionTier: 1,
    citadelAccess: false,
    floor3Shortcut: false,
    npcMet: {},
    npcDisposition: {},
    readLoreIds: [],
    confrontedBosses: [],
    waystonesAttuned: 0,
    bestiaryKills: {},
    unlockedFeats: [],
    townUpgrades: { apothecary: 0, smithy: 0, watchtower: 0 },
  };
}

function createInitialMerchants(): Record<string, Item[]> {
  return {
    torin: createMerchantStock('torin'),
    mira: createMerchantStock('mira'),
    vex: createMerchantStock('vex'),
    orin: createMerchantStock('orin'),
    bram: createMerchantStock('bram'),
    halda: createMerchantStock('halda'),
  };
}

let uidSeq = 1;
function uid(prefix: string): string {
  uidSeq += 1;
  return `${prefix}_${Date.now().toString(36)}_${uidSeq}`;
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [activePanel, setActivePanel] = useState<ActivePanel>('NONE');
  // Phase 2 settings: one persisted snapshot (volumes, mute, screen shake —
  // loadSettings also honours the P0-era 'elfstory-muted' key) applied live
  // to the sound engine and persisted on every change.
  const [settings, setSettings] = useState<GameSettings>(() => {
    const loaded = loadSettings();
    soundEngine.applyAudioSettings(loaded);
    return loaded;
  });
  const muted = settings.muted;
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  // Phase 6 accessibility: the text-size setting scales the root font
  // size, which scales all rem-based UI text in one move. The canvas map
  // renders in fixed pixels and is deliberately unaffected.
  useEffect(() => {
    document.documentElement.style.fontSize = `${textSizeRootPx(settings.textSize)}px`;
  }, [settings.textSize]);
  const updateSettings = useCallback((patch: Partial<GameSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      soundEngine.applyAudioSettings(next);
      return next;
    });
  }, []);

  const [tileSize, setTileSize] = useState<number>(() => loadTileSize());
  const handleTileSizeChange = useCallback((next: number) => {
    setTileSize(next);
    saveTileSize(next);
  }, []);

  const [cameraYawIndex, setCameraYawIndex] = useState<CameraYawIndex>(() => {
    try {
      const v = Number(localStorage.getItem('elfstory3d-camera-yaw'));
      if (!Number.isNaN(v)) return normalizeYawIndex(v);
    } catch {
      // ignore
    }
    return 0;
  });
  const handleCameraYawChange = useCallback((next: CameraYawIndex) => {
    setCameraYawIndex(next);
    try {
      localStorage.setItem('elfstory3d-camera-yaw', String(next));
    } catch {
      // ignore
    }
  }, []);

  const [showSettings, setShowSettings] = useState(false);
  const [showCredits, setShowCredits] = useState(false);

  // First-run tutorial (Phase 2): current step index, or null when inactive.
  const [tutorialStepIdx, setTutorialStepIdx] = useState<number | null>(null);
  const tutorialBaselineRef = useRef<TutorialBaseline | null>(null);
  const tutorialRestedRef = useRef(false);

  // Wall-clock start of the current expedition (ending-screen stat).
  const runStartedAtRef = useRef<number>(Date.now());
  // Tidy-up: expedition time banked by previous sessions of this run
  // (restored from the bundle's playTimeMs). The Ending Screen shows
  // base + the live session's span, so the total survives save/load.
  const playTimeBaseRef = useRef(0);

  const [player, setPlayer] = useState<PlayerState>(() => createInitialPlayer('Vanguard'));
  const [zones, setZones] = useState<Record<ZoneId, ZoneMap>>(() => createInitialZones());
  const [currentZoneId, setCurrentZoneId] = useState<ZoneId>('oakhaven');
  const [worldFlags, setWorldFlags] = useState<WorldFlags>(() => createInitialFlags());
  const [quests, setQuests] = useState<Record<string, QuestProgress>>({});
  const [merchantStocks, setMerchantStocks] = useState<Record<string, Item[]>>(() =>
    createInitialMerchants()
  );

  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'init_1',
      turn: 0,
      text: 'Garth "Big Dick" Elfstrom arrives at Oakhaven Outpost. Speak with Warden Vance or descend the southern stairs.',
      tone: 'quest',
    },
  ]);

  const [armedSkill, setArmedSkill] = useState<SkillId | null>(null);
  const [armedInscriptionSlot, setArmedInscriptionSlot] = useState<number | null>(null);
  const [aimedTarget, setAimedTarget] = useState<{ x: number; y: number } | null>(null);
  const [autoExploring, setAutoExploring] = useState(false);
  const [activeDialogue, setActiveDialogue] = useState<{ npcId: string; nodeId: string } | null>(
    null
  );
  const [activeMerchantId, setActiveMerchantId] = useState<string | null>(null);
  const [specialPrompt, setSpecialPrompt] = useState<SpecialPrompt | null>(null);

  const [floatingEffects, setFloatingEffects] = useState<FloatingEffect[]>([]);
  const [particles, setParticles] = useState<ParticleBurst[]>([]);
  const [projectiles, setProjectiles] = useState<ProjectileEffect[]>([]);
  const [hitFlashes, setHitFlashes] = useState<HitFlash[]>([]);
  const [shakeUntil, setShakeUntil] = useState(0);

  const [activeSlot, setActiveSlot] = useState<SaveSlotId>('slot_1');
  const [initialSlotScan] = useState(scanLocalSlots);
  const [localSlotMap, setLocalSlotMap] = useState(initialSlotScan.map);
  const [slotIssues, setSlotIssues] = useState<Partial<Record<SaveSlotId, SlotIssue>>>(
    initialSlotScan.issues
  );

  // Phase 4 difficulty: per-run tier (persisted in the save bundle, NOT in
  // the settings blob). The ref + difficulty module mirror exists because
  // grantXpAndCheckLevel and world.ts zone generation read it outside
  // React state. applyDifficulty is the single write path.
  const [difficulty, setDifficulty] = useState<DifficultyTier>('standard');
  const difficultyRef = useRef<DifficultyTier>('standard');
  const applyDifficulty = useCallback((tier: DifficultyTier) => {
    difficultyRef.current = tier;
    setCurrentDifficulty(tier);
    setDifficulty(tier);
  }, []);

  // Phase 4 completion stamp: epoch ms of this run's first ending, or null.
  const [completedAtMs, setCompletedAtMs] = useState<number | null>(null);
  const completedAtMsRef = useRef<number | null>(null);
  const updateCompletedAtMs = useCallback((value: number | null) => {
    completedAtMsRef.current = value;
    setCompletedAtMs(value);
  }, []);

  // Phase 5 ascension: the run's NG+ cycle and hardcore flag live in the
  // save bundle (per-run, like difficulty). The cycle also mirrors into
  // the difficulty module, where world generation reads it. applyCycle /
  // applyHardcore are the single write paths, mirroring applyDifficulty.
  const [ngPlusCycle, setNgPlusCycle] = useState(0);
  const ngPlusCycleRef = useRef(0);
  const applyCycle = useCallback((cycle: number) => {
    const clean = Math.max(0, Math.floor(cycle) || 0);
    ngPlusCycleRef.current = clean;
    setCurrentCycle(clean);
    setNgPlusCycle(clean);
  }, []);
  const [hardcore, setHardcore] = useState(false);
  const hardcoreRef = useRef(false);
  const applyHardcore = useCallback((value: boolean) => {
    hardcoreRef.current = value;
    setHardcore(value);
  }, []);
  // A hardcore run's final death stamp (null while the run lives). Set
  // once by the GAME_OVER effect below; saveBundleToStorage defaults it
  // into every later save so the fallen state can never be overwritten.
  const deathStampRef = useRef<{ deadAtMs: number; deathNote?: string } | null>(null);

  // Phase 5 lifetime stats: per-device record kept OUTSIDE save bundles
  // (game/lifetime.ts). Mirrored in a ref so event funnels inside stable
  // callbacks always read the freshest totals.
  const [lifetime, setLifetime] = useState<LifetimeStats>(() => loadLifetime());
  const lifetimeRef = useRef(lifetime);
  const bumpLifetime = useCallback((event: LifetimeEvent) => {
    const next = applyLifetimeEvent(lifetimeRef.current, event);
    if (next === lifetimeRef.current) return;
    lifetimeRef.current = next;
    setLifetime(next);
    saveLifetime(next);
  }, []);
  const [cloudSlotMap, setCloudSlotMap] = useState<
    Partial<Record<SaveSlotId, { summary: CloudSaveSummary; payload: CloudSavePayload }>>
  >({});

  const [localChronicles, setLocalChronicles] = useState<ChronicleEntry[]>(() => readLocalChronicles());
  const [cloudChronicles, setCloudChronicles] = useState<ChronicleEntry[]>([]);
  const [showHallOfFame, setShowHallOfFame] = useState(false);
  const [showMobilePad, setShowMobilePad] = useState(true);
  const [zoneBanner, setZoneBanner] = useState<{
    name: string;
    subtitle: string;
    lore: string;
    tactical: string;
    recommended: string;
  } | null>(null);
  // Phase 6 coach-mark toast: same non-blocking banner idiom as the zone
  // banner, fed by the pendingCoachMarksRef queue.
  const [coachToast, setCoachToast] = useState<{ title: string; body: string } | null>(null);
  const dpadHoldTimerRef = useRef<number | null>(null);
  const dpadHoldIntervalRef = useRef<number | null>(null);

  const stopDpadHold = useCallback(() => {
    if (dpadHoldTimerRef.current !== null) {
      window.clearTimeout(dpadHoldTimerRef.current);
      dpadHoldTimerRef.current = null;
    }
    if (dpadHoldIntervalRef.current !== null) {
      window.clearInterval(dpadHoldIntervalRef.current);
      dpadHoldIntervalRef.current = null;
    }
  }, []);

  const startDpadHold = useCallback(
    (dx: number, dy: number) => {
      stopDpadHold();
      setAutoExploring(false);
      const stepRotated = () => {
        const sk = stateKeysRef.current;
        const [rx, ry] = rotateStepByYaw(dx, dy, sk.cameraYawIndex);
        sk.attemptStep(rx, ry);
      };
      stepRotated();
      dpadHoldTimerRef.current = window.setTimeout(() => {
        dpadHoldIntervalRef.current = window.setInterval(() => {
          const sk = stateKeysRef.current;
          if (sk.gameState !== 'PLAYING' || sk.activePanel !== 'NONE' || sk.specialPrompt || sk.showHallOfFame) {
            stopDpadHold();
            return;
          }
          const [rx, ry] = rotateStepByYaw(dx, dy, sk.cameraYawIndex);
          sk.attemptStep(rx, ry);
        }, 175);
      }, 280);
    },
    [stopDpadHold]
  );

  useEffect(() => {
    if (gameState !== 'PLAYING' || activePanel !== 'NONE' || specialPrompt || showHallOfFame) {
      stopDpadHold();
    }
  }, [gameState, activePanel, specialPrompt, showHallOfFame, stopDpadHold]);

  useEffect(() => {
    if (gameState !== 'PLAYING' || activePanel !== 'NONE' || specialPrompt) {
      setZoneBanner(null);
    }
  }, [gameState, activePanel, specialPrompt]);

  useEffect(() => {
    if (!zoneBanner) return;
    const t = window.setTimeout(() => setZoneBanner(null), 4600);
    return () => window.clearTimeout(t);
  }, [zoneBanner]);

  // Phase 6: flush queued coach-marks, one per render pass — each becomes
  // a log line plus the toast card. The pushLog re-render drains any
  // further queued marks immediately after.
  useEffect(() => {
    if (pendingCoachMarksRef.current.length === 0) return;
    const [id] = pendingCoachMarksRef.current.splice(0, 1);
    const mark = COACH_MARKS[id];
    pushLog(`Lantern hint — ${mark.body}`, 'arcane');
    setCoachToast({ title: mark.title, body: mark.body });
  });

  useEffect(() => {
    if (!coachToast) return;
    const t = window.setTimeout(() => setCoachToast(null), 5600);
    return () => window.clearTimeout(t);
  }, [coachToast]);

  useEffect(() => stopDpadHold, [stopDpadHold]);

  const recordedVictoryRef = useRef(false);
  const recordedFallenRef = useRef(false);
  // Phase 7: quest ids whose completion rewards have been paid in this
  // run. The complete_quest handler checks and records synchronously, so
  // a completion can never pay twice — not even via a same-frame double
  // submit that re-runs the handler on a stale state closure. Seeded
  // from the bundle on load; cleared when a fresh run begins (new game
  // or NG+ ascension), where every quest may complete once more.
  const questRewardGuardRef = useRef<Set<string>>(new Set());

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [cloudSaving, setCloudSaving] = useState(false);

  const currentZone = zones[currentZoneId];
  const derived = useMemo(() => computeDerivedStats(player, worldFlags), [player, worldFlags]);

  // ---- Phase 2: procedural music ---------------------------------------
  // Audio may only start after a user gesture; the engine's scheduler idles
  // until its context exists and is running, so this unlock listener plus
  // the theme effect below are all the wiring the music layer needs.
  useEffect(() => {
    const unlock = () => soundEngine.noteUserGesture();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const bossAlerted = currentZone.enemies.some((e) => e.isBoss && e.alerted);
  const musicTheme = resolveMusicTheme({
    isTown: currentZone.isTown,
    zoneId: currentZoneId,
    bossAlerted,
  });
  useEffect(() => {
    soundEngine.startMusic(musicTheme);
  }, [musicTheme]);

  // ---- Phase 2: first-run tutorial --------------------------------------
  const finishTutorial = useCallback(() => {
    markTutorialDone();
    setTutorialStepIdx(null);
  }, []);

  const advanceTutorial = useCallback(() => {
    setTutorialStepIdx((idx) => {
      if (idx === null) return null;
      if (idx >= TUTORIAL_STEPS.length - 1) {
        markTutorialDone();
        return null;
      }
      return idx + 1;
    });
  }, []);

  // Snapshot the watched signals whenever a step becomes current.
  useEffect(() => {
    if (tutorialStepIdx === null) {
      tutorialBaselineRef.current = null;
      return;
    }
    tutorialBaselineRef.current = {
      x: player.x,
      y: player.y,
      kills: player.kills,
      consumableCount: countConsumables(player.inventory),
    };
    // Baseline is intentionally captured once per step, not per player change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorialStepIdx]);

  // Opening the pause menu also satisfies the rest/save step (it is where
  // saving lives); Safe Rest sets the same ref directly in its handler.
  useEffect(() => {
    if (gameState === 'PAUSED') tutorialRestedRef.current = true;
  }, [gameState]);

  // Auto-advance when the coached action is performed.
  useEffect(() => {
    if (tutorialStepIdx === null || gameState !== 'PLAYING') return;
    const baseline = tutorialBaselineRef.current;
    if (!baseline) return;
    const step = TUTORIAL_STEPS[tutorialStepIdx];
    if (!step) return;
    const complete = isTutorialStepComplete(step.id, baseline, {
      x: player.x,
      y: player.y,
      kills: player.kills,
      consumableCount: countConsumables(player.inventory),
      dialogueOpen: activeDialogue !== null,
      anySkillOnCooldown:
        Object.values(player.cooldowns).some((v) => (v ?? 0) > 0) ||
        (player.inscriptionCooldowns ?? []).some((v) => (v ?? 0) > 0),
      restedOrSaved: tutorialRestedRef.current,
    });
    if (complete) advanceTutorial();
  }, [tutorialStepIdx, gameState, player, activeDialogue, advanceTutorial]);

  const replayTutorial = useCallback(() => {
    setActivePanel('NONE');
    tutorialRestedRef.current = false;
    setTutorialStepIdx(0);
  }, []);

  const mergedChronicles = useMemo(() => {
    const byId = new Map<string, ChronicleEntry>();
    for (const c of localChronicles) byId.set(c.id, c);
    for (const c of cloudChronicles) byId.set(c.id, c);
    return Array.from(byId.values()).sort((a, b) => b.createdAtMs - a.createdAtMs);
  }, [cloudChronicles, localChronicles]);

  useEffect(() => {
    void checkAuthRedirectResult().catch((err) => {
      setAuthError(err instanceof Error ? err.message : 'Google Sign-In redirect failed.');
    });
    const unsub = subscribeAuth(async (user) => {
      setAuthUser(user);
      if (user) {
        try {
          const [slots, chrons] = await Promise.all([
            loadAllCloudSlots(user.uid),
            loadChroniclesFromCloud(user.uid),
          ]);
          setCloudSlotMap(slots);
          setCloudChronicles(chrons);
        } catch {
          // Non-fatal if offline or no save yet
        }
      } else {
        setCloudSlotMap({});
        setCloudChronicles([]);
      }
    });
    return () => unsub();
  }, []);

  const pushLog = useCallback((text: string, tone: LogEntry['tone'] = 'neutral', turnOverride?: number) => {
    setLogs((prev) => [
      { id: uid('log'), turn: turnOverride ?? player.turnsElapsed, text, tone },
      ...prev.slice(0, 40),
    ]);
  }, [player.turnsElapsed]);

  // Phase 6 contextual coach-marks: event points claim a one-time hint
  // (game/coachMarks.ts) and queue it here; the flush effect below turns
  // the queue into a log line + toast. Claiming only touches localStorage
  // and this ref, so it is safe to call from state-computing callbacks
  // (addItemToPlayer runs inside a setPlayer updater at the merchant).
  const pendingCoachMarksRef = useRef<CoachMarkId[]>([]);
  const queueCoachMark = useCallback((id: CoachMarkId) => {
    if (claimCoachMark(id)) pendingCoachMarksRef.current.push(id);
  }, []);

  // Phase 4: mid-run difficulty change from the Settings modal. Only
  // enemies spawned after the change use the new tier — zones already
  // generated keep their enemies' stats (called out in the modal copy).
  const handleDifficultyChange = useCallback(
    (tier: DifficultyTier) => {
      if (tier === difficultyRef.current) return;
      applyDifficulty(tier);
      pushLog(
        `Difficulty set to ${DIFFICULTY_INFO[tier].label}. Foes you meet from here on use the new tuning; foes already spawned keep their stats.`,
        'quest'
      );
    },
    [applyDifficulty, pushLog]
  );

  const spawnFloating = useCallback((x: number, y: number, text: string, color: string) => {
    const now = performance.now();
    setFloatingEffects((prev) => [
      ...prev.filter((f) => now - f.createdAt < f.duration),
      { id: uid('fx'), x, y, text, color, createdAt: now, duration: 850 },
    ]);
  }, []);

  const spawnBurst = useCallback((x: number, y: number, color: string, char = '*', count = 5) => {
    const now = performance.now();
    const created: ParticleBurst[] = [];
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.6;
      const spd = 0.6 + Math.random() * 0.9;
      created.push({
        id: uid('pt'),
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        color,
        char,
        createdAt: now,
        duration: 380,
      });
    }
    setParticles((prev) => [...prev.filter((p) => now - p.createdAt < p.duration), ...created]);
  }, []);

  const triggerShake = useCallback((ms = 160) => {
    // Screen-shake is a settings toggle (Phase 2) — read through the ref so
    // this callback's identity stays stable for the many dep arrays below.
    if (!settingsRef.current.screenShake) return;
    setShakeUntil(performance.now() + ms);
  }, []);

  const spawnProjectile = useCallback(
    (fromX: number, fromY: number, toX: number, toY: number, color: string, glyph = '*', duration = 200) => {
      const now = performance.now();
      setProjectiles((prev) => [
        ...prev.filter((p) => now - p.createdAt < p.duration),
        { id: uid('prj'), fromX, fromY, toX, toY, color, glyph, createdAt: now, duration },
      ]);
    },
    []
  );

  const spawnHitFlash = useCallback((x: number, y: number, color = 'white', ms = 135) => {
    const now = performance.now();
    setHitFlashes((prev) => [
      ...prev.filter((h) => now < h.until),
      { id: uid('hf'), x, y, color, until: now + ms },
    ]);
  }, []);

  const recordRunChronicle = useCallback(
    (outcome: 'victory' | 'fallen', finalPlayer: PlayerState, finalFlags: WorldFlags) => {
      const decisions: string[] = [];
      if (finalFlags.caravanChoice === 'arrested_vex') {
        decisions.push('Delivered Contraband Ledger to Warden Vance');
      } else if (finalFlags.caravanChoice === 'smuggler_pact') {
        decisions.push('Forged Shadow Pact with Vex the Quiet');
      }
      if (finalFlags.blightChoice === 'cantor_appeased') {
        decisions.push('Pacified Bone Cantor Vaelen through ancient Resolve');
      } else if (finalFlags.blightChoice === 'herbs_gathered') {
        decisions.push('Restored Oakhaven apothecary with Pale Nightbloom');
      }
      if (finalFlags.bellChoice === 'attuned_lyra') {
        decisions.push('Attuned the Whispering Bell with Archivist Lyra');
      } else if (finalFlags.bellChoice === 'sold_corvus') {
        decisions.push('Sold the Whispering Bell to Magistrate Corvus');
      } else if (finalFlags.bellChoice === 'shattered_self') {
        decisions.push('Shattered the Whispering Bell to absorb its Cinder Surge');
      }
      if (finalFlags.malakorDefeated) {
        decisions.push('Vanquished Malakor, Sovereign of Cinder');
      }
      if (finalFlags.silverbridgeCleared) {
        decisions.push('Cleared Silverbridge Crossing for Wayfarer Rowan');
      }
      if (finalFlags.barrowBossDefeated) {
        decisions.push('Banished Arch-Wight Morvath in Whispering Barrow');
      }
      if (finalFlags.mireBossDefeated) {
        decisions.push('Slain Spore-Matron Vexis in Fungal Hollow');
      }
      if (finalFlags.frostBossDefeated) {
        decisions.push('Defeated Ignis-Warden Kaelthar in Ashen Caldera');
      }

      const sideZoneDepths: Record<string, number> = {
        barrow_1: 2,
        barrow_2: 3,
        mire_1: 3,
        mire_2: 4,
        frost_1: 4,
        frost_2: 5,
        frost_3: 6,
      };
      const deepestDepth = finalFlags.discoveredZones.reduce((max, z) => {
        if (z in sideZoneDepths) return Math.max(max, sideZoneDepths[z]);
        if (!z.startsWith('dungeon_')) return max;
        const d = Number(z.replace('dungeon_', ''));
        return Number.isFinite(d) ? Math.max(max, d) : max;
      }, currentZone.depth || 1);

      const entry: ChronicleEntry = {
        id: uid('chr'),
        outcome,
        starterClass: finalPlayer.starterClass,
        buildTitle: computeDerivedStats(finalPlayer, finalFlags).buildTitle,
        level: finalPlayer.level,
        deepestDepth,
        kills: finalPlayer.kills,
        turnsElapsed: finalPlayer.turnsElapsed,
        gold: finalPlayer.gold,
        keyDecisions: decisions.slice(0, 8),
        createdAtMs: Date.now(),
      };

      // Phase 5: a chronicle entry is written exactly once per run ending,
      // so this is the single funnel for lifetime victory/death counting —
      // plus the deepest floor and NG+ cycle the run reached.
      if (outcome === 'victory') {
        bumpLifetime({ kind: 'victory' });
      } else {
        bumpLifetime({ kind: 'death' });
      }
      bumpLifetime({ kind: 'floorReached', depth: deepestDepth });
      bumpLifetime({ kind: 'cycleReached', cycle: ngPlusCycleRef.current });

      setLocalChronicles((prev) => {
        const next = [entry, ...prev].slice(0, 30);
        try {
          localStorage.setItem(CHRONICLES_KEY, JSON.stringify(next));
        } catch {
          // Non-fatal local storage quota warning handled in save
        }
        return next;
      });

      if (authUser) {
        recordChronicleToCloud(authUser.uid, entry)
          .then(() => {
            setCloudChronicles((prev) => [entry, ...prev]);
          })
          .catch((err) => {
            pushLog(
              `Cloud chronicle sync failed: ${formatCloudError(err)}.`,
              'danger',
              finalPlayer.turnsElapsed
            );
          });
      }
    },
    [authUser, bumpLifetime, currentZone.depth, pushLog]
  );

  const saveBundleToStorage = useCallback(
    (
      bundle: SavedBundle,
      buildTitleOverride?: string,
      slotOverride?: SaveSlotId,
      skipCloud = false
    ) => {
      const targetSlot = slotOverride ?? activeSlot;
      // Phase 4: every persisted bundle carries the format version, the
      // run's difficulty tier, and its completion stamp (fields already on
      // the bundle win; otherwise the live run's values fill in).
      const stamped: SavedBundle = {
        ...stampBundle(bundle),
        difficulty: bundle.difficulty ?? difficultyRef.current,
        completedAtMs: bundle.completedAtMs ?? completedAtMsRef.current ?? undefined,
        // Phase 5: cycle / hardcore / death stamp default from the live
        // run's refs, exactly like the completion stamp — a bundle field
        // already set always wins.
        ngPlusCycle: bundle.ngPlusCycle ?? ngPlusCycleRef.current,
        hardcore: bundle.hardcore ?? hardcoreRef.current,
        // Tidy-up: bank the run's expedition time so far (prior sessions'
        // base + this session's span) unless the bundle already sets it.
        playTimeMs:
          bundle.playTimeMs ??
          playTimeBaseRef.current + (Date.now() - runStartedAtRef.current),
        deadAtMs: bundle.deadAtMs ?? deathStampRef.current?.deadAtMs ?? undefined,
        deathNote: bundle.deathNote ?? deathStampRef.current?.deathNote ?? undefined,
        updatedAtMs: Date.now(),
      };
      const compactForLocal = {
        ...stamped,
        zones: packZones(stamped.zones),
        logs: stamped.logs.slice(0, 60),
      };
      const bTitle = buildTitleOverride ?? computeDerivedStats(bundle.player, bundle.worldFlags).buildTitle;

      let localSaved = true;
      try {
        localStorage.setItem(getLocalSlotKey(targetSlot), JSON.stringify(compactForLocal));
        setLocalSlotMap((prev) => ({
          ...prev,
          [targetSlot]: {
            summary: {
              slotId: targetSlot,
              starterClass: bundle.player.starterClass,
              level: bundle.player.level,
              zoneName: bundle.zones[bundle.currentZoneId]?.name ?? 'Oakhaven Outpost',
              buildTitle: bTitle,
              kills: bundle.player.kills,
              updatedAtMs: stamped.updatedAtMs,
              completedAtMs: stamped.completedAtMs,
              difficulty: stamped.difficulty,
              ngPlusCycle: stamped.ngPlusCycle,
              hardcore: stamped.hardcore,
              deadAtMs: stamped.deadAtMs,
              deathNote: stamped.deathNote,
            },
            bundle: stamped,
          },
        }));
        // A successful write heals any corruption/future-version issue
        // recorded for this slot.
        setSlotIssues((prev) => {
          if (!prev[targetSlot]) return prev;
          const next = { ...prev };
          delete next[targetSlot];
          return next;
        });
      } catch {
        localSaved = false;
        pushLog(
          'Warning: Local save failed (browser storage quota exceeded). Sign in for cloud saves or clear an unused slot.',
          'danger',
          bundle.player.turnsElapsed
        );
      }
      if (authUser && !skipCloud) {
        saveSlotToCloud(authUser.uid, targetSlot, stamped, bTitle)
          .then(() => {
            setCloudSlotMap((prev) => ({
              ...prev,
              [targetSlot]: {
                summary: {
                  slotId: targetSlot,
                  starterClass: bundle.player.starterClass,
                  level: bundle.player.level,
                  zoneId: bundle.currentZoneId,
                  zoneName: bundle.zones[bundle.currentZoneId]?.name ?? 'Oakhaven Outpost',
                  buildTitle: bTitle,
                  kills: bundle.player.kills,
                  gold: bundle.player.gold,
                  updatedAtMs: Date.now(),
                  completedAtMs: stamped.completedAtMs,
                  ngPlusCycle: stamped.ngPlusCycle,
                  hardcore: stamped.hardcore,
                  deadAtMs: stamped.deadAtMs,
                  deathNote: stamped.deathNote,
                },
                payload: stamped,
              },
            }));
          })
          .catch((err) => {
            const msg = formatCloudError(err);
            pushLog(
              localSaved
                ? `Saved locally; cloud save sync failed: ${msg}`
                : `Cloud save sync also failed: ${msg}`,
              'danger',
              bundle.player.turnsElapsed
            );
          });
      }
      return localSaved;
    },
    [activeSlot, authUser, pushLog]
  );

  // --- Autosave (P0) -------------------------------------------------------
  // Previously a run was only persisted on zone transition or by manually
  // saving from the pause menu, so an hour of play on one floor was lost to
  // a tab close / crash. Now: local autosave every 25 turns while playing,
  // plus a final local save on tab hide / close. Local-only (skipCloud) to
  // avoid Firestore write spam; zone transitions and manual saves still sync.
  const autosaveStateRef = useRef<{
    player: PlayerState;
    zones: Record<ZoneId, ZoneMap>;
    currentZoneId: ZoneId;
    worldFlags: WorldFlags;
    quests: Record<string, QuestProgress>;
    merchantStocks: Record<string, Item[]>;
    logs: LogEntry[];
    gameState: GameState;
  } | null>(null);
  autosaveStateRef.current = {
    player,
    zones,
    currentZoneId,
    worldFlags,
    quests,
    merchantStocks,
    logs,
    gameState,
  };
  const lastAutosaveTurnRef = useRef(0);

  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    if (player.turnsElapsed - lastAutosaveTurnRef.current < 25) return;
    lastAutosaveTurnRef.current = player.turnsElapsed;
    saveBundleToStorage(
      { player, zones, currentZoneId, worldFlags, quests, merchantStocks, logs },
      undefined,
      activeSlot,
      true
    );
  }, [player, zones, currentZoneId, worldFlags, quests, merchantStocks, logs, gameState, activeSlot, saveBundleToStorage]);

  useEffect(() => {
    const saveOnExit = () => {
      const s = autosaveStateRef.current;
      if (!s || s.gameState !== 'PLAYING') return;
      saveBundleToStorage(
        {
          player: s.player,
          zones: s.zones,
          currentZoneId: s.currentZoneId,
          worldFlags: s.worldFlags,
          quests: s.quests,
          merchantStocks: s.merchantStocks,
          logs: s.logs,
        },
        undefined,
        activeSlot,
        true
      );
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') saveOnExit();
    };
    window.addEventListener('beforeunload', saveOnExit);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('beforeunload', saveOnExit);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [activeSlot, saveBundleToStorage]);
  // --- End autosave --------------------------------------------------------

  // --- Completion stamp (P4) ----------------------------------------------
  // The first time a run reaches the ending (gameState VICTORY), stamp
  // completedAtMs onto the active save and persist immediately, so the
  // Title Screen can mark the slot ✦ Completed. The stamp then rides every
  // later save via saveBundleToStorage's ref defaulting — continuing into
  // the Endless Abyss keeps it, and updateCompletedAtMs here only ever
  // fires once per run (guarded by the ref).
  useEffect(() => {
    if (gameState !== 'VICTORY') return;
    if (completedAtMsRef.current !== null) return;
    updateCompletedAtMs(Date.now());
    saveBundleToStorage(
      { player, zones, currentZoneId, worldFlags, quests, merchantStocks, logs },
      undefined,
      activeSlot
    );
  }, [
    gameState,
    player,
    zones,
    currentZoneId,
    worldFlags,
    quests,
    merchantStocks,
    logs,
    activeSlot,
    saveBundleToStorage,
    updateCompletedAtMs,
  ]);
  // --- End completion stamp -------------------------------------------------

  // --- Hardcore death stamp (P5) -------------------------------------------
  // In a hardcore run, reaching GAME_OVER is final: stamp the run's death
  // onto its save slot and persist immediately, so the Title Screen shows
  // the slot as fallen and the run can never be loaded again. Non-hardcore
  // runs skip this entirely — their game-over flow is untouched. The stamp
  // is set once (ref-guarded) and then rides every later save via
  // saveBundleToStorage's ref defaulting.
  useEffect(() => {
    if (gameState !== 'GAME_OVER') return;
    if (!hardcoreRef.current) return;
    if (deathStampRef.current) return;
    const s = autosaveStateRef.current;
    if (!s) return;
    const zone = s.zones[s.currentZoneId];
    const deepest = deepestDepthForZones(s.worldFlags.discoveredZones, zone?.depth ?? 0);
    deathStampRef.current = {
      deadAtMs: Date.now(),
      deathNote: `Fell on Floor ${deepest} · ${zone?.name ?? 'the deep'}`,
    };
    saveBundleToStorage(
      {
        player: s.player,
        zones: s.zones,
        currentZoneId: s.currentZoneId,
        worldFlags: s.worldFlags,
        quests: s.quests,
        merchantStocks: s.merchantStocks,
        logs: s.logs,
      },
      undefined,
      activeSlot
    );
  }, [gameState, activeSlot, saveBundleToStorage]);
  // --- End hardcore death stamp --------------------------------------------

  // --- Lifetime deepest floor (P5) -----------------------------------------
  // Track the deepest floor as it is reached, not just at a run's end, so
  // an in-progress (or quietly abandoned) delve still counts.
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const deepest = deepestDepthForZones(worldFlags.discoveredZones, currentZone.depth);
    if (deepest > lifetimeRef.current.deepestFloor) {
      bumpLifetime({ kind: 'floorReached', depth: deepest });
    }
  }, [gameState, currentZoneId, currentZone.depth, worldFlags.discoveredZones, bumpLifetime]);
  // --- End lifetime deepest floor ------------------------------------------

  const handleSignInGoogle = useCallback(async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
      soundEngine.playClick();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Google Sign-In could not complete.');
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const handleSignOutGoogle = useCallback(async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await signOutGoogle();
      soundEngine.playClick();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign out failed.');
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const handleStartNew = useCallback(
    (
      starterClass: PlayerState['starterClass'],
      slotOverride?: SaveSlotId,
      difficultyChoice?: DifficultyTier,
      hardcoreChoice?: boolean
    ) => {
      // Destructive-action guard: starting fresh over an occupied slot
      // (from the Title Screen's New Adventure, or Play Again on the
      // game-over / victory screens, which routes through here) discards
      // that slot's saved run. Always confirm first.
      const targetSlot = slotOverride ?? activeSlot;
      if (localSlotMap[targetSlot] || cloudSlotMap[targetSlot]) {
        const ok = window.confirm(
          `${targetSlot === 'slot_1' ? 'Slot 1' : targetSlot === 'slot_2' ? 'Slot 2' : 'Slot 3'} already holds a saved expedition. Starting a new adventure will overwrite it. Continue?`
        );
        if (!ok) return;
      }
      soundEngine.playClick();
      if (slotOverride) setActiveSlot(slotOverride);
      recordedVictoryRef.current = false;
      recordedFallenRef.current = false;
      // Phase 4: the New Adventure difficulty choice becomes the run's
      // tier BEFORE any zone is generated; Play Again (no choice passed)
      // keeps the current run's tier. A fresh run has no completion stamp.
      applyDifficulty(difficultyChoice ?? difficultyRef.current);
      updateCompletedAtMs(null);
      // Phase 5: a fresh expedition always starts at NG+ cycle 0 with no
      // death stamp. Hardcore is chosen at run creation only (the Title
      // Screen toggle); Play Again passes no choice and keeps the mode of
      // the run it replaces, mirroring the difficulty rule above.
      applyCycle(0);
      applyHardcore(hardcoreChoice ?? hardcoreRef.current);
      deathStampRef.current = null;
      bumpLifetime({ kind: 'expeditionStarted' });
      const freshZones = createInitialZones();
      const freshPlayer = createInitialPlayer(starterClass);
      const initialFlags = createInitialFlags();
      freshPlayer.x = freshZones.oakhaven.spawnPoint.x;
      freshPlayer.y = freshZones.oakhaven.spawnPoint.y;
      const compPos = placeCompanionNear(freshZones.oakhaven, freshPlayer.x, freshPlayer.y);
      if (freshPlayer.companion) {
        freshPlayer.companion = { ...freshPlayer.companion, x: compPos.x, y: compPos.y };
      }
      computeVisibility(freshZones.oakhaven, freshPlayer.x, freshPlayer.y, getSightRadius(freshPlayer, initialFlags));

      setZones(freshZones);
      setPlayer(freshPlayer);
      setCurrentZoneId('oakhaven');
      setWorldFlags(initialFlags);
      setQuests({});
      questRewardGuardRef.current = new Set();
      setMerchantStocks(createInitialMerchants());
      setArmedSkill(null);
      setArmedInscriptionSlot(null);
      setAimedTarget(null);
      setAutoExploring(false);
      setActivePanel('NONE');
      setActiveDialogue(null);
      setActiveMerchantId(null);
      setSpecialPrompt(null);
      const oakhavenCtx = getZoneContext('oakhaven', 0);
      setZoneBanner({
        name: freshZones.oakhaven.name,
        subtitle: freshZones.oakhaven.subtitle,
        ...oakhavenCtx,
      });
      setLogs([
        {
          id: uid('log'),
          turn: 0,
          text: `Garth "Big Dick" Elfstrom arrives in Oakhaven under the ${starterClass} oath, tasked with reclaiming the Ashen Glyph before the Ember Blight spreads.`,
          tone: 'quest',
        },
        {
          id: uid('log'),
          turn: 0,
          text: oakhavenCtx.tactical,
          tone: 'neutral',
        },
      ]);
      runStartedAtRef.current = Date.now();
      playTimeBaseRef.current = 0;
      tutorialRestedRef.current = false;
      // First-run tutorial: once per device, only on a fresh expedition.
      setTutorialStepIdx(isTutorialDone() ? null : 0);
      setGameState('PLAYING');
    },
    [
      activeSlot,
      applyCycle,
      applyDifficulty,
      applyHardcore,
      bumpLifetime,
      cloudSlotMap,
      localSlotMap,
      updateCompletedAtMs,
    ]
  );

  const applySavedBundle = useCallback((data: SavedBundle, slotId: SaveSlotId) => {
    // Phase 5: a fallen hardcore run is never resumed — death is final.
    // (The Title Screen also disables its Load buttons; this is the
    // defence-in-depth guard for every other entry point.)
    if (!canLoadBundle(data)) {
      window.alert(fallenBundleMessage(data));
      return;
    }
    setActiveSlot(slotId);
    recordedVictoryRef.current = Boolean(data.worldFlags?.malakorDefeated);
    recordedFallenRef.current = false;
    // Phase 4: restore the run's difficulty tier (legacy bundles default
    // to Standard) and its completion stamp, if it has one.
    applyDifficulty(normalizeDifficulty(data.difficulty));
    updateCompletedAtMs(data.completedAtMs ?? null);
    // Phase 5: restore the run's NG+ cycle (pre-P5 bundles => 0) and its
    // hardcore flag (pre-P5 bundles => false).
    applyCycle(bundleCycle(data));
    applyHardcore(bundleHardcore(data));
    deathStampRef.current = isBundleDead(data)
      ? { deadAtMs: data.deadAtMs!, deathNote: data.deathNote }
      : null;
    bumpLifetime({ kind: 'cycleReached', cycle: bundleCycle(data) });
    const defaultCompanionKind: CompanionKind =
      data.player.starterClass === 'Runecaster' ? 'starlight_owl' : 'silverwind_lynx';
    const normalizedPlayer: PlayerState = {
      ...data.player,
      inscriptions: data.player.inscriptions ?? [null, null, null],
      inscriptionCooldowns: data.player.inscriptionCooldowns ?? [0, 0, 0],
      prodigies: data.player.prodigies ?? [],
      prodigyPoints: data.player.prodigyPoints ?? 0,
      prodigyCooldowns: data.player.prodigyCooldowns ?? {},
      hasteSteps: data.player.hasteSteps ?? 0,
      bonusHp: data.player.bonusHp ?? 0,
      companion:
        data.player.companion ??
        makeCompanion(defaultCompanionKind, data.player.x, data.player.y, data.player.level),
    };
    const normalizedFlags: WorldFlags = {
      ...createInitialFlags(),
      ...data.worldFlags,
      bestiaryKills: data.worldFlags?.bestiaryKills ?? {},
      unlockedFeats: data.worldFlags?.unlockedFeats ?? [],
      townUpgrades: data.worldFlags?.townUpgrades ?? { apothecary: 0, smithy: 0, watchtower: 0 },
    };
    const baselineZones = createInitialZones();
    const mergedSavedZones: Record<ZoneId, ZoneMap> = {
      ...data.zones,
      overworld: data.zones.overworld ?? baselineZones.overworld,
      thornwick: data.zones.thornwick ?? baselineZones.thornwick,
      cinderwatch: data.zones.cinderwatch ?? baselineZones.cinderwatch,
    };
    setPlayer(normalizedPlayer);
    setZones(mergedSavedZones);
    setCurrentZoneId(data.currentZoneId);
    setWorldFlags(normalizedFlags);
    setQuests(data.quests);
    // Phase 7: completions already paid in the loaded run stay paid.
    questRewardGuardRef.current = new Set(
      Object.values(data.quests ?? {})
        .filter((q) => q.status === 'completed')
        .map((q) => q.id)
    );
    setMerchantStocks({
      ...createInitialMerchants(),
      ...data.merchantStocks,
    });
    setLogs(data.logs);
    setActivePanel('NONE');
    setArmedSkill(null);
    setArmedInscriptionSlot(null);
    setAimedTarget(null);
    setAutoExploring(false);
    setZoneBanner(null);
    runStartedAtRef.current = Date.now();
    // Tidy-up: restore the run's banked expedition time (0 for bundles
    // written before the field existed).
    playTimeBaseRef.current = data.playTimeMs ?? 0;
    setTutorialStepIdx(null);
    // Phase 7: a bundle saved on the death turn itself (hp <= 0, before
    // the death flow could stamp or resolve it) loads into the proper
    // GAME_OVER screen — never into a frozen scene where the turn loop
    // no longer runs. In a hardcore run the GAME_OVER effect then
    // applies the death stamp, closing the tab-close race as well.
    setGameState(normalizedPlayer.hp <= 0 ? 'GAME_OVER' : 'PLAYING');
    soundEngine.playClick();
  }, [applyCycle, applyDifficulty, applyHardcore, bumpLifetime, updateCompletedAtMs]);

  // Phase 5: New Game+ ascension. The world is rebuilt completely fresh
  // (the same construction a new expedition uses) while the character
  // carries over: level, attributes, skill points/skills, equipment,
  // inventory, gold, glyph dust, and companion. Per-cycle run state
  // (kills, turns, quests, flags, merchants) resets; difficulty, hardcore,
  // and the completion stamp carry over. The new cycle is applied BEFORE
  // the fresh world is generated, so every foe in it is cycle-scaled.
  const handleAscendNgPlus = useCallback(() => {
    const nextCycle = ngPlusCycleRef.current + 1;
    soundEngine.playLevelUp();
    applyCycle(nextCycle);
    const freshZones = createInitialZones();
    const freshFlags = createInitialFlags();
    const freshMerchants = createInitialMerchants();

    const kept = player;
    const spawn = freshZones.oakhaven.spawnPoint;
    const compPos = placeCompanionNear(freshZones.oakhaven, spawn.x, spawn.y);
    const companion = kept.companion
      ? {
          ...kept.companion,
          x: compPos.x,
          y: compPos.y,
          maxHp: companionMaxHpFor(kept.companion.kind, kept.level),
          hp: companionMaxHpFor(kept.companion.kind, kept.level),
          respawnCooldown: 0,
        }
      : kept.companion;
    const carried: PlayerState = {
      ...kept,
      x: spawn.x,
      y: spawn.y,
      statuses: [],
      cooldowns: {},
      inscriptionCooldowns: [0, 0, 0],
      prodigyCooldowns: {},
      hasteSteps: 0,
      kills: 0,
      turnsElapsed: 0,
      firstStrikeReady: true,
      companion,
    };
    const derivedNow = computeDerivedStats(carried, freshFlags);
    carried.maxHp = derivedNow.maxHp;
    carried.hp = derivedNow.maxHp;
    carried.maxMana = derivedNow.maxMana;
    carried.mana = derivedNow.maxMana;
    computeVisibility(freshZones.oakhaven, carried.x, carried.y, getSightRadius(carried, freshFlags));

    recordedVictoryRef.current = false;
    recordedFallenRef.current = false;
    deathStampRef.current = null;
    setZones(freshZones);
    setPlayer(carried);
    setCurrentZoneId('oakhaven');
    setWorldFlags(freshFlags);
    setQuests({});
    questRewardGuardRef.current = new Set();
    setMerchantStocks(freshMerchants);
    setArmedSkill(null);
    setArmedInscriptionSlot(null);
    setAimedTarget(null);
    setAutoExploring(false);
    setActivePanel('NONE');
    setActiveDialogue(null);
    setActiveMerchantId(null);
    setSpecialPrompt(null);
    const oakhavenCtx = getZoneContext('oakhaven', 0);
    setZoneBanner({
      name: freshZones.oakhaven.name,
      subtitle: freshZones.oakhaven.subtitle,
      ...oakhavenCtx,
    });
    const ascendLogs: LogEntry[] = [
      {
        id: uid('log'),
        turn: 0,
        text: `The Ashen Glyph turns once more. Garth "Big Dick" Elfstrom ascends to Cycle ${nextCycle} — the Vale is remade, its foes hardened, and everything earned is carried into the new descent.`,
        tone: 'quest',
      },
      {
        id: uid('log'),
        turn: 0,
        text: oakhavenCtx.tactical,
        tone: 'neutral',
      },
    ];
    setLogs(ascendLogs);
    runStartedAtRef.current = Date.now();
    // Tidy-up: the ascended cycle is a fresh expedition — its clock
    // starts over (the finished run's time stays in the lifetime stats).
    playTimeBaseRef.current = 0;
    setTutorialStepIdx(null);
    bumpLifetime({ kind: 'expeditionStarted' });
    bumpLifetime({ kind: 'cycleReached', cycle: nextCycle });
    setGameState('PLAYING');
    // Persist immediately, so the ascended run is the slot's state even if
    // the tab closes before the next autosave.
    saveBundleToStorage(
      {
        player: carried,
        zones: freshZones,
        currentZoneId: 'oakhaven',
        worldFlags: freshFlags,
        quests: {},
        merchantStocks: freshMerchants,
        logs: ascendLogs,
        ngPlusCycle: nextCycle,
        hardcore: hardcoreRef.current,
        difficulty: difficultyRef.current,
        completedAtMs: completedAtMsRef.current ?? undefined,
      },
      undefined,
      activeSlot
    );
  }, [activeSlot, applyCycle, bumpLifetime, player, saveBundleToStorage]);

  const handleContinueSaved = useCallback(
    (slotId: SaveSlotId) => {
      const entry = localSlotMap[slotId];
      if (!entry) {
        // Phase 4: a slot that exists but cannot be loaded (corrupt or
        // future-version) fails gracefully with the reason, never a crash.
        const issue = slotIssues[slotId];
        if (issue) window.alert(issue.message);
        return;
      }
      applySavedBundle(entry.bundle, slotId);
    },
    [applySavedBundle, localSlotMap, slotIssues]
  );

  const handleContinueCloud = useCallback(
    (slotId: SaveSlotId) => {
      const entry = cloudSlotMap[slotId];
      if (!entry) return;
      // Tidy-up: cloud bundles get the same future-version refusal as
      // local ones — the local read path checks inside parseStoredBundle,
      // but the cloud read path previously handed newer-build saves
      // straight to the loader.
      const cloudVersion = entry.payload.version ?? 0;
      if (cloudVersion > SAVE_VERSION) {
        window.alert(futureVersionMessage(cloudVersion));
        return;
      }
      applySavedBundle(entry.payload, slotId);
    },
    [applySavedBundle, cloudSlotMap]
  );

  const handleDeleteSlot = useCallback(
    async (slotId: SaveSlotId) => {
      // Deleting a save is irreversible (local + cloud) — confirm first.
      if (localSlotMap[slotId] || cloudSlotMap[slotId]) {
        const ok = window.confirm(
          `Delete the saved expedition in ${slotId === 'slot_1' ? 'Slot 1' : slotId === 'slot_2' ? 'Slot 2' : 'Slot 3'}? This removes both the local and cloud save and cannot be undone.`
        );
        if (!ok) return;
      }
      soundEngine.playClick();
      try {
        localStorage.removeItem(getLocalSlotKey(slotId));
        if (slotId === 'slot_1') {
          localStorage.removeItem(LEGACY_SAVE_KEY);
        }
      } catch {
        // ignore
      }
      setLocalSlotMap((prev) => {
        const next = { ...prev };
        delete next[slotId];
        return next;
      });
      // Deleting also clears any corruption/future-version issue, so the
      // slot returns to a clean Empty state.
      setSlotIssues((prev) => {
        if (!prev[slotId]) return prev;
        const next = { ...prev };
        delete next[slotId];
        return next;
      });
      if (authUser) {
        try {
          await deleteCloudSlot(authUser.uid, slotId);
          setCloudSlotMap((prev) => {
            const next = { ...prev };
            delete next[slotId];
            return next;
          });
        } catch {
          // ignore
        }
      }
    },
    [authUser, cloudSlotMap, localSlotMap]
  );

  const evaluateFeatsAndApply = useCallback(
    (
      p: PlayerState,
      flags: WorldFlags,
      turnOverride?: number
    ): { nextPlayer: PlayerState; nextFlags: WorldFlags } => {
      let nextP = { ...p };
      const unlocked = [...(flags.unlockedFeats ?? [])];
      let unlockedAny = false;
      for (const feat of FEAT_DEFS) {
        if (unlocked.includes(feat.id)) continue;
        if (feat.check(nextP, flags)) {
          unlocked.push(feat.id);
          unlockedAny = true;
          if (feat.rewardGold) nextP.gold += feat.rewardGold;
          if (feat.rewardDust) nextP.glyphDust += feat.rewardDust;
          pushLog(
            `Feat Unlocked — ${feat.title}! (${feat.rewardLabel})`,
            'quest',
            turnOverride ?? nextP.turnsElapsed
          );
        }
      }
      if (!unlockedAny) return { nextPlayer: p, nextFlags: flags };
      soundEngine.playCodexUnlock();
      return {
        nextPlayer: nextP,
        nextFlags: { ...flags, unlockedFeats: unlocked },
      };
    },
    [pushLog]
  );

  const grantXpAndCheckLevel = useCallback(
    (
      p: PlayerState,
      gainedXp: number,
      flagsOverride?: WorldFlags
    ): { nextPlayer: PlayerState; leveledUp: boolean } => {
      // Phase 4: the run's difficulty tier scales all granted XP here, in
      // the single grant function (Story ×1.15, Standard ×1.0, Hardened
      // ×1.10). The ×1.30 level curve below is P1 tuning and untouched.
      let next = { ...p, xp: p.xp + scaleXpForDifficulty(gainedXp, difficultyRef.current) };
      let leveledUp = false;
      while (next.xp >= next.xpToNext) {
        next.xp -= next.xpToNext;
        next.level += 1;
        next.xpToNext = Math.round(next.xpToNext * 1.3);
        next.attributePoints += 2;
        next.skillPoints += 1;
        if (next.level === 6 || next.level === 10) {
          next.prodigyPoints = (next.prodigyPoints ?? 0) + 1;
        }
        const d = computeDerivedStats(next, flagsOverride ?? worldFlags);
        next.maxHp = d.maxHp;
        next.maxMana = d.maxMana;
        next.hp = d.maxHp;
        next.mana = d.maxMana;
        if (next.companion) {
          const compMax = companionMaxHpFor(next.companion.kind, next.level);
          const compDelta = compMax - next.companion.maxHp;
          next.companion = {
            ...next.companion,
            maxHp: compMax,
            hp: next.companion.hp > 0 ? next.companion.hp + compDelta : 0,
          };
        }
        leveledUp = true;
      }
      // Phase 6 coach-mark: the first Prodigy point ever earned opens a
      // choice (Skills → Milestone Prodigies) — hint once, here in the
      // single XP funnel so every grant path is covered.
      if ((p.prodigyPoints ?? 0) <= 0 && (next.prodigyPoints ?? 0) > 0) {
        queueCoachMark('prodigy');
      }
      return { nextPlayer: next, leveledUp };
    },
    [worldFlags, queueCoachMark]
  );

  const addItemToPlayer = useCallback((p: PlayerState, item: Item): PlayerState => {
    // Phase 6 coach-mark: the first inscription ever gained is a choice
    // moment (inscribe it, or swap it for a carried rune) — hint once.
    if (item.category === 'inscription') queueCoachMark('inscription');
    if (item.category === 'consumable') {
      const existingIdx = p.inventory.findIndex((i) => i.consumableKind === item.consumableKind);
      if (existingIdx >= 0) {
        const nextInv = [...p.inventory];
        nextInv[existingIdx] = {
          ...nextInv[existingIdx],
          quantity: (nextInv[existingIdx].quantity ?? 1) + (item.quantity ?? 1),
        };
        return { ...p, inventory: nextInv };
      }
    }
    return { ...p, inventory: [...p.inventory, item] };
  }, [queueCoachMark]);

  const transitionToZone = useCallback(
    (
      targetZoneId: ZoneId,
      spawnMode: 'spawn' | 'return' | { x: number; y: number },
      curPlayer: PlayerState,
      curZones: Record<ZoneId, ZoneMap>,
      flagsOverride?: WorldFlags
    ) => {
      const activeFlags = flagsOverride ?? worldFlags;
      let rawTarget: ZoneMap | undefined = curZones[targetZoneId];
      if (!rawTarget) {
        rawTarget = generateZoneById(targetZoneId) ?? (
          targetZoneId.startsWith('dungeon_')
            ? generateDungeonFloor(Math.max(1, Number(targetZoneId.replace('dungeon_', '')) || 1))
            : undefined
        );
      }
      if (!rawTarget) return;

      const target: ZoneMap = {
        ...rawTarget,
        tiles: rawTarget.tiles.map((row) => row.map((t) => ({ ...t }))),
      };
      const pt =
        typeof spawnMode === 'object'
          ? spawnMode
          : spawnMode === 'return'
            ? target.returnPoint
            : target.spawnPoint;
      let movedPlayer: PlayerState = {
        ...curPlayer,
        x: pt.x,
        y: pt.y,
        firstStrikeReady: true,
        statuses: [...curPlayer.statuses],
      };

      const apothecaryLv = activeFlags.townUpgrades?.apothecary ?? 0;
      const watchtowerLv = activeFlags.townUpgrades?.watchtower ?? 0;

      if (!target.isTown) {
        if (hasAffix(movedPlayer, 'arcane_ward') || watchtowerLv >= 2) {
          applyStatus(movedPlayer.statuses, 'shielded', 4, 4);
        }
        if (watchtowerLv >= 1) {
          for (let y = 0; y < target.height; y++) {
            for (let x = 0; x < target.width; x++) {
              const t = target.tiles[y][x];
              if (t.kind === 'stairs_down' || t.kind === 'waystone') {
                t.explored = true;
              }
            }
          }
        }
        if (apothecaryLv >= 2) {
          const healPot = movedPlayer.inventory.find((i) => i.consumableKind === 'heal_potion');
          const qty = healPot?.quantity ?? 0;
          if (qty < 2) {
            movedPlayer = addItemToPlayer(movedPlayer, createConsumable('heal_potion', 1));
            pushLog('Mira’s Stillhouse satchel supplies a fresh Crimson Draught (+1).', 'loot', movedPlayer.turnsElapsed);
          }
        }
      }

      if (targetZoneId === 'dungeon_5' && activeFlags.malakorWeakened) {
        target.enemies = target.enemies.map((e) =>
          e.archetype === 'boss_malakor' && e.hp === e.maxHp
            ? { ...e, hp: Math.max(400, e.hp - 180), maxHp: Math.max(400, e.maxHp - 180), def: Math.max(4, e.def - 3) }
            : e
        );
      }

      let nextFlags: WorldFlags = {
        ...activeFlags,
        discoveredZones: activeFlags.discoveredZones.includes(targetZoneId)
          ? activeFlags.discoveredZones
          : [...activeFlags.discoveredZones, targetZoneId],
      };

      if (target.isTown) {
        const d = computeDerivedStats(movedPlayer, nextFlags);
        movedPlayer.maxHp = d.maxHp;
        movedPlayer.maxMana = d.maxMana;
        movedPlayer.hp = d.maxHp;
        movedPlayer.mana = d.maxMana;
        movedPlayer.statuses = [];
        if (movedPlayer.companion) {
          movedPlayer.companion = {
            ...movedPlayer.companion,
            hp: movedPlayer.companion.maxHp,
            respawnCooldown: 0,
          };
        }
      }

      if (movedPlayer.companion) {
        const cPos = placeCompanionNear(target, movedPlayer.x, movedPlayer.y);
        movedPlayer.companion = {
          ...movedPlayer.companion,
          x: cPos.x,
          y: cPos.y,
        };
      }

      const featRes = evaluateFeatsAndApply(movedPlayer, nextFlags, movedPlayer.turnsElapsed);
      movedPlayer = featRes.nextPlayer;
      nextFlags = featRes.nextFlags;

      computeVisibility(target, movedPlayer.x, movedPlayer.y, getSightRadius(movedPlayer, nextFlags));
      const nextZones = { ...curZones, [targetZoneId]: target };
      setZones(nextZones);
      setCurrentZoneId(targetZoneId);
      setPlayer(movedPlayer);
      setArmedSkill(null);
      setAimedTarget(null);
      setWorldFlags(nextFlags);
      const ctxBrief = getZoneContext(targetZoneId, target.depth);
      setZoneBanner({
        name: target.name,
        subtitle: target.subtitle,
        ...ctxBrief,
      });
      soundEngine.playDoor();
      pushLog(`Entered ${target.name} (${target.subtitle}).`, 'quest', movedPlayer.turnsElapsed);
      pushLog(ctxBrief.tactical, 'neutral', movedPlayer.turnsElapsed);
      saveBundleToStorage({
        player: movedPlayer,
        zones: nextZones,
        currentZoneId: targetZoneId,
        worldFlags: nextFlags,
        quests,
        merchantStocks,
        logs,
      });
    },
    [addItemToPlayer, evaluateFeatsAndApply, logs, merchantStocks, pushLog, quests, saveBundleToStorage, worldFlags]
  );

  // Resolve killing an enemy (loot drops, XP, quest hooks, bestiary, feats, boss victory)
  const handleEnemyDeath = useCallback(
    (
      enemy: Enemy,
      p: PlayerState,
      zone: ZoneMap,
      flagsOverride?: WorldFlags
    ): { nextPlayer: PlayerState; nextZone: ZoneMap; nextFlags: WorldFlags; victoryTriggered: boolean } => {
      const baseFlags = flagsOverride ?? worldFlags;

      // Phase 3: Grave Husk "Deathless" — the first killing blow does not
      // take it. Every death in the game funnels through this handler, so
      // the cheat lives here: revive at 30% HP with no kill credit, no
      // bestiary tick, and no loot. (runEnemyTurns call sites restore the
      // revived husk to their survivor set via restoreCheatedDeath.)
      if (enemy.archetype === 'grave_husk' && !enemy.undyingUsed) {
        const revived: Enemy = {
          ...enemy,
          hp: Math.max(1, Math.round(enemy.maxHp * 0.3)),
          undyingUsed: true,
          alerted: true,
          intent: undefined,
        };
        const nextZone: ZoneMap = {
          ...zone,
          enemies: zone.enemies.map((e) => (e.id === enemy.id ? revived : e)),
          loot: [...zone.loot],
        };
        soundEngine.playSpell();
        spawnBurst(enemy.x, enemy.y, '#D97706', '✦', 9);
        spawnFloating(enemy.x, enemy.y, 'DEATHLESS!', '#D97706');
        pushLog(
          `The Grave Husk refuses death — burial oaths knit it back together (${revived.hp} HP)!`,
          'danger',
          p.turnsElapsed
        );
        return { nextPlayer: { ...p }, nextZone, nextFlags: baseFlags, victoryTriggered: false };
      }

      const prevKills = baseFlags.bestiaryKills?.[enemy.archetype] ?? 0;
      const newSpeciesKills = prevKills + 1;
      let nextFlags: WorldFlags = {
        ...baseFlags,
        bestiaryKills: {
          ...(baseFlags.bestiaryKills ?? {}),
          [enemy.archetype]: newSpeciesKills,
        },
      };

      const bestiaryDef = BESTIARY_DEFS[enemy.archetype];
      if (bestiaryDef) {
        if (newSpeciesKills === bestiaryDef.hunterKills) {
          soundEngine.playCodexUnlock();
          pushLog(
            `Bestiary Hunter unlocked (${bestiaryDef.name}): ${bestiaryDef.hunterBonusLabel}!`,
            'quest',
            p.turnsElapsed
          );
        }
        if (newSpeciesKills === bestiaryDef.slayerKills) {
          soundEngine.playCodexUnlock();
          pushLog(
            `Bestiary Slayer mastered (${bestiaryDef.name}): ${bestiaryDef.slayerBonusLabel}!`,
            'arcane',
            p.turnsElapsed
          );
        }
      }

      if (enemy.archetype === 'boss_bone_cantor' && !enemy.name.startsWith('Abyssal Echo')) {
        nextFlags = { ...nextFlags, cantorDefeated: true };
      }
      if (enemy.archetype === 'boss_ashen_inquisitor' && !enemy.name.startsWith('Abyssal Echo')) {
        nextFlags = { ...nextFlags, inquisitorDefeated: true };
      }
      let victoryTriggered = false;
      if (enemy.archetype === 'boss_malakor' && !enemy.name.startsWith('Abyssal Echo')) {
        nextFlags = { ...nextFlags, malakorDefeated: true };
      }

      let nextP = { ...p, kills: p.kills + 1, gold: p.gold + enemy.goldReward };
      // Phase 5: every kill in the game funnels through this handler (the
      // Grave Husk Deathless cheat returns above, correctly earning no
      // credit), so lifetime kills are counted here.
      bumpLifetime({ kind: 'kills', count: 1 });
      const nextZ = {
        ...zone,
        enemies: zone.enemies.filter((e) => e.id !== enemy.id),
        loot: [...zone.loot],
      };

      const derivedNow = computeDerivedStats(nextP, nextFlags);
      nextP.maxHp = derivedNow.maxHp;
      nextP.maxMana = derivedNow.maxMana;

      // Passive sustain hooks
      if ((nextP.skills.bloodlust ?? 0) >= 3) {
        nextP.hp = Math.min(derivedNow.maxHp, nextP.hp + 5);
      }
      const siphonRank = nextP.skills.siphon_soul ?? 0;
      if (siphonRank > 0) {
        nextP.mana = Math.min(derivedNow.maxMana, nextP.mana + (siphonRank === 1 ? 3 : siphonRank === 2 ? 5 : 7));
        if (siphonRank >= 2) {
          nextP.hp = Math.min(derivedNow.maxHp, nextP.hp + (siphonRank === 2 ? 4 : 7));
        }
      }
      if (hasAffix(nextP, 'mana_on_kill')) {
        nextP.mana = Math.min(derivedNow.maxMana, nextP.mana + 4);
      }

      // Phase 3: Spore Hulk death-burst — its pressurized spore cap
      // ruptures on death, punishing point-blank kills.
      if (enemy.archetype === 'spore_hulk') {
        spawnBurst(enemy.x, enemy.y, '#84CC16', '*', 12);
        if (chebyshev(nextP.x, nextP.y, enemy.x, enemy.y) <= 1) {
          const burstDmg = 6 + zone.depth * 2;
          nextP = { ...nextP, statuses: [...nextP.statuses] };
          nextP.hp -= burstDmg;
          applyStatus(nextP.statuses, 'poison', 3, 3);
          triggerShake(150);
          spawnFloating(nextP.x, nextP.y, `-${burstDmg} BURST`, '#84CC16');
          pushLog(
            `The Spore Hulk BURSTS for ${burstDmg} dmg and Poison (3t)!`,
            'danger',
            nextP.turnsElapsed
          );
        } else {
          pushLog('The Spore Hulk bursts in a green cloud — you kept your distance.', 'combat', nextP.turnsElapsed);
        }
      }

      // Drop loot
      const dropRoll = Math.random();
      if (enemy.rank === 'randboss') {
        const randbossItem =
          Math.random() < 0.4
            ? createRandomSetRelic(zone.depth)
            : generateProceduralItem(zone.depth + 1, { minRarity: 'Epic' });
        nextZ.loot.push({
          id: uid('drop'),
          x: enemy.x,
          y: enemy.y,
          item: randbossItem,
        });
        nextZ.loot.push({
          id: uid('drop'),
          x: enemy.x,
          y: enemy.y,
          item: generateInscription(zone.depth, { minRarity: 'Rare' }),
        });
      } else if (enemy.rank === 'rare') {
        const rareDrop =
          Math.random() < 0.45
            ? generateInscription(zone.depth, { minRarity: 'Rare' })
            : generateProceduralItem(zone.depth + 1, { minRarity: 'Rare' });
        nextZ.loot.push({
          id: uid('drop'),
          x: enemy.x,
          y: enemy.y,
          item: rareDrop,
        });
      } else if (enemy.isBoss || enemy.isElite || dropRoll < 0.42) {
        const minRar = enemy.isBoss ? 'Epic' : enemy.isElite ? 'Rare' : undefined;
        const dropped = enemy.isBoss
          ? Math.random() < 0.35
            ? createRandomSetRelic(zone.depth)
            : generateProceduralItem(zone.depth, { minRarity: 'Epic' })
          : Math.random() < 0.28
          ? createConsumable(Math.random() < 0.6 ? 'heal_potion' : 'mana_potion', 1)
          : zone.depth >= 2 && Math.random() < 0.16
          ? generateInscription(zone.depth, { minRarity: minRar })
          : generateProceduralItem(zone.depth, { minRarity: minRar });
        nextZ.loot.push({
          id: uid('drop'),
          x: enemy.x,
          y: enemy.y,
          item: dropped,
        });
      }

      const xpRes = grantXpAndCheckLevel(nextP, enemy.xpReward, nextFlags);
      nextP = xpRes.nextPlayer;

      spawnBurst(enemy.x, enemy.y, enemy.color, '✦', 8);
      pushLog(
        `Slain ${enemy.name}! (+${enemy.xpReward} XP, +${enemy.goldReward}g)`,
        'loot',
        nextP.turnsElapsed
      );
      if (xpRes.leveledUp) {
        soundEngine.playLevelUp();
        spawnFloating(nextP.x, nextP.y, `LEVEL ${nextP.level}!`, '#FBBF24');
        pushLog(
          `Level ${nextP.level} reached! +2 Attribute Pts & +1 Skill Pt (Press K).`,
          'quest',
          nextP.turnsElapsed
        );
        if (nextP.level === 6 || nextP.level === 10) {
          pushLog(
            `Milestone Level ${nextP.level}! +1 Prodigy Point earned—open Skills [K] -> Milestone Prodigies!`,
            'arcane',
            nextP.turnsElapsed
          );
        }
      }

      const featRes = evaluateFeatsAndApply(nextP, nextFlags, nextP.turnsElapsed);
      nextP = featRes.nextPlayer;
      nextFlags = featRes.nextFlags;
      setWorldFlags(nextFlags);

      if (enemy.id === 'boss_morvath') {
        nextP = addItemToPlayer(nextP, createQuestItem('morvath_seal'));
        nextFlags = { ...nextFlags, barrowBossDefeated: true };
        setWorldFlags(nextFlags);
        setQuests((prev) => {
          const cur = prev.barrow_purge;
          if (!cur) return prev;
          return {
            ...prev,
            barrow_purge: {
              ...cur,
              stage: 2,
              history: [...cur.history, 'Slew Arch-Wight Morvath and claimed Morvath’s Barrow Seal.'],
            },
          };
        });
        pushLog('Obtained Morvath’s Barrow Seal! Return to Captain Darek in Cinderwatch Bastion.', 'quest', nextP.turnsElapsed);
      } else if (enemy.id === 'boss_vexis') {
        nextP = addItemToPlayer(nextP, createQuestItem('fungal_heart'));
        nextFlags = { ...nextFlags, mireBossDefeated: true };
        setWorldFlags(nextFlags);
        setQuests((prev) => {
          const cur = prev.spores_of_bog;
          if (!cur) return prev;
          return {
            ...prev,
            spores_of_bog: {
              ...cur,
              stage: 2,
              history: [...cur.history, 'Slew Spore-Matron Vexis and harvested the Bioluminescent Fungal Heart.'],
            },
          };
        });
        pushLog('Harvested Bioluminescent Fungal Heart! Deliver it to Elder Sylva in Thornwick Fen.', 'quest', nextP.turnsElapsed);
      } else if (enemy.id === 'boss_kaelthar') {
        nextP = addItemToPlayer(nextP, createQuestItem('ashen_ore_heart'));
        nextFlags = { ...nextFlags, frostBossDefeated: true };
        setWorldFlags(nextFlags);
        setQuests((prev) => {
          const cur = prev.cinder_and_frost;
          if (!cur) return prev;
          return {
            ...prev,
            cinder_and_frost: {
              ...cur,
              stage: 2,
              history: [...cur.history, 'Slew Ignis-Warden Kaelthar and tore free the Ashen Ore Heart.'],
            },
          };
        });
        pushLog('Recovered Ashen Ore Heart! Bring it to Forgemistress Halda in Cinderwatch Bastion.', 'quest', nextP.turnsElapsed);
      }

      if (enemy.archetype === 'boss_malakor' && !enemy.name.startsWith('Abyssal Echo')) {
        setQuests((prev) => {
          const existing = prev.sovereign_cinder;
          return {
            ...prev,
            sovereign_cinder: {
              id: 'sovereign_cinder',
              status: 'completed',
              stage: 2,
              outcomeLabel: 'Malakor Vanquished',
              history: [
                ...(existing?.history ?? []),
                'Shattered Malakor, Sovereign of Cinder, on Floor 5.',
              ],
            },
          };
        });
        if (!recordedVictoryRef.current) {
          recordedVictoryRef.current = true;
          recordRunChronicle('victory', nextP, nextFlags);
        }
        victoryTriggered = true;
      }

      return { nextPlayer: nextP, nextZone: nextZ, nextFlags, victoryTriggered };
    },
    [addItemToPlayer, bumpLifetime, evaluateFeatsAndApply, grantXpAndCheckLevel, pushLog, recordRunChronicle, spawnBurst, spawnFloating, worldFlags]
  );

  // Full Enemy Turn Simulation
  const runEnemyTurns = useCallback(
    (startPlayer: PlayerState, startZone: ZoneMap, flagsOverride?: WorldFlags) => {
      let activeFlags = flagsOverride ?? worldFlags;
      const prevRegen = startPlayer.statuses.find((s) => s.kind === 'regen');
      const incomingDots = startPlayer.statuses.filter(
        (s) => s.kind === 'bleed' || s.kind === 'burn' || s.kind === 'poison'
      );
      const nextProdCds: Partial<Record<ProdigyId, number>> = {};
      for (const [k, v] of Object.entries(startPlayer.prodigyCooldowns ?? {})) {
        if ((v ?? 0) > 1) {
          nextProdCds[k as ProdigyId] = (v ?? 0) - 1;
        }
      }

      let curP: PlayerState = {
        ...startPlayer,
        turnsElapsed: startPlayer.turnsElapsed + 1,
        hasteSteps: 0,
        companion: startPlayer.companion ? { ...startPlayer.companion } : undefined,
        statuses: startPlayer.statuses
          .map((s) => ({ ...s, turns: s.turns - 1 }))
          .filter((s) => s.turns > 0),
        cooldowns: Object.fromEntries(
          Object.entries(startPlayer.cooldowns)
            .map(([k, v]) => [k, Math.max(0, (v ?? 0) - 1)])
            .filter(([, v]) => (v as number) > 0)
        ),
        inscriptionCooldowns: (startPlayer.inscriptionCooldowns ?? [0, 0, 0]).map((cd) =>
          Math.max(0, cd - 1)
        ),
        prodigyCooldowns: nextProdCds,
      };

      const curZ: ZoneMap = {
        ...startZone,
        enemies: startZone.enemies.map((e) => ({
          ...e,
          statuses: e.statuses.map((s) => ({ ...s })),
          skillCooldowns: e.skillCooldowns ? { ...e.skillCooldowns } : undefined,
        })),
        npcs: startZone.npcs.map((n) => ({ ...n })),
        critters: (startZone.critters ?? []).map((c) => ({ ...c })),
        loot: [...startZone.loot],
      };

      // Phase 3 ambient life: critters drift/flee every turn (cheap, bounded
      // by the handful of critters per zone); dungeon flavour lines are rare.
      if (curZ.critters && curZ.critters.length > 0) {
        curZ.critters = stepCritters(curZ.critters, curZ, curP);
      }
      if (curZ.id === 'overworld' && curP.turnsElapsed % 11 === 0) {
        const bark = pickAmbientBark(curZ, curP);
        if (bark) pushLog(`${bark.npc.name}: “${bark.line}”`, 'neutral', curP.turnsElapsed);
      } else if (!curZ.isTown && curZ.depth >= 1 && Math.random() < 0.03) {
        const amb = pickDungeonAmbience(curZ);
        if (amb) pushLog(amb, 'neutral', curP.turnsElapsed);
      }

      if (curZ.isTown) {
        // Phase 3 ambient life: townsfolk wander a few tiles from their
        // posts, and nearby townsfolk trade bark lines now and then.
        curZ.npcs = stepNpcWander(curZ.npcs, curZ, curP);
        if (curP.turnsElapsed % 11 === 0) {
          const bark = pickAmbientBark(curZ, curP);
          if (bark) pushLog(`${bark.npc.name}: “${bark.line}”`, 'neutral', curP.turnsElapsed);
        }
        const d = computeDerivedStats(curP, activeFlags);
        curP.mana = Math.min(d.maxMana, curP.mana + 2);
        if (curP.companion) {
          if (curP.companion.respawnCooldown > 0 || curP.companion.hp < curP.companion.maxHp) {
            curP.companion.hp = curP.companion.maxHp;
            curP.companion.respawnCooldown = 0;
          }
          if (chebyshev(curP.companion.x, curP.companion.y, curP.x, curP.y) > 2) {
            const cPos = placeCompanionNear(curZ, curP.x, curP.y);
            curP.companion.x = cPos.x;
            curP.companion.y = cPos.y;
          }
        }
        computeVisibility(curZ, curP.x, curP.y, getSightRadius(curP, activeFlags));
        setPlayer(curP);
        setZones((prev) => ({ ...prev, [curZ.id]: curZ }));
        return;
      }

      if (prevRegen) {
        const dRegen = computeDerivedStats(curP, activeFlags);
        curP.hp = Math.min(dRegen.maxHp, curP.hp + prevRegen.potency);
        spawnFloating(curP.x, curP.y, `+${prevRegen.potency} REGEN`, '#4EA885');
      }

      // Draconic Will periodic debuff cleanse
      if (hasProdigy(curP, 'draconic_will') && curP.turnsElapsed % 4 === 0) {
        const badIdx = curP.statuses.findIndex(
          (s) =>
            s.kind === 'bleed' ||
            s.kind === 'burn' ||
            s.kind === 'poison' ||
            s.kind === 'chilled' ||
            s.kind === 'stunned'
        );
        if (badIdx >= 0) {
          const cleared = curP.statuses[badIdx];
          curP.statuses.splice(badIdx, 1);
          spawnFloating(curP.x, curP.y, 'CLEANSED', '#60A5FA');
          pushLog(`Draconic Will purges ${cleared.kind.toUpperCase()}!`, 'arcane', curP.turnsElapsed);
        }
      }

      // Passive 1 MP regen every 2 turns
      if (curP.turnsElapsed % 2 === 0) {
        const d = computeDerivedStats(curP, activeFlags);
        curP.mana = Math.min(d.maxMana, curP.mana + 1);
      }

      const derivedStats = computeDerivedStats(curP, activeFlags);
      let playerDied = false;
      let victoryTriggered = false;

      const tryApplyPlayerAilment = (kind: StatusKind, turns: number, potency: number) => {
        if (hasProdigy(curP, 'draconic_will') && Math.random() < 0.6) {
          spawnFloating(curP.x, curP.y, 'RESIST', '#60A5FA');
          return;
        }
        applyStatus(curP.statuses, kind, turns, potency);
      };

      const checkPlayerFatal = (): boolean => {
        if (curP.hp > 0) return false;
        if (hasProdigy(curP, 'cauterize') && (curP.prodigyCooldowns?.cauterize ?? 0) <= 0) {
          curP.hp = Math.max(1, Math.round(derivedStats.maxHp * 0.25));
          applyStatus(curP.statuses, 'cauterized', 3, 1);
          applyStatus(curP.statuses, 'shielded', 3, 10);
          curP.prodigyCooldowns = { ...(curP.prodigyCooldowns ?? {}), cauterize: 25 };
          soundEngine.playSpell();
          triggerShake(220);
          spawnBurst(curP.x, curP.y, '#FB923C', '🜂', 10);
          spawnFloating(curP.x, curP.y, 'CAUTERIZED!', '#FBBF24');
          pushLog(
            'Cauterize ignites! Death denied (+25% HP & +10 DEF Ward for 3t).',
            'arcane',
            curP.turnsElapsed
          );
          return false;
        }
        return true;
      };

      // Tick Bleed / Burn / Poison DoT statuses on Garth
      if (incomingDots.length > 0) {
        const playerDotDmg = incomingDots.reduce((sum, s) => sum + Math.max(1, s.potency), 0);
        const dotLabels = incomingDots.map((s) => s.kind.toUpperCase()).join(' / ');
        curP.hp -= playerDotDmg;
        soundEngine.playPlayerHurt();
        spawnHitFlash(curP.x, curP.y, '#FB923C', 110);
        spawnFloating(curP.x, curP.y, `-${playerDotDmg} ${dotLabels}`, '#FB923C');
        pushLog(`${dotLabels} sears you for ${playerDotDmg} dmg!`, 'danger', curP.turnsElapsed);
        if (checkPlayerFatal()) {
          playerDied = true;
        }
      }

      const survivingIds = new Set(curZ.enemies.map((e) => e.id));

      // Phase 3: handleEnemyDeath can refuse a Grave Husk's first death
      // (Deathless). When the "corpse" is still on the returned board, it
      // never died — restore it to the board and the survivor set.
      const restoreCheatedDeath = (res: { nextZone: ZoneMap }, fallen: Enemy) => {
        const revived = res.nextZone.enemies.find((e) => e.id === fallen.id);
        if (!revived) return;
        survivingIds.add(fallen.id);
        const idx = curZ.enemies.findIndex((e) => e.id === fallen.id);
        if (idx >= 0) curZ.enemies[idx] = revived;
      };

      // Companion Turn Simulation
      if (!playerDied && curP.companion) {
        const comp = curP.companion;
        if (comp.respawnCooldown > 0) {
          comp.respawnCooldown -= 1;
          if (comp.respawnCooldown === 0) {
            comp.hp = comp.maxHp;
            const cPos = placeCompanionNear(curZ, curP.x, curP.y);
            comp.x = cPos.x;
            comp.y = cPos.y;
            soundEngine.playCompanion();
            spawnBurst(comp.x, comp.y, '#38BDF8', '✧', 6);
            spawnFloating(comp.x, comp.y, 'REFORMED', '#38BDF8');
            pushLog(`${comp.name} reforms beside you!`, 'arcane', curP.turnsElapsed);
          }
        } else if (comp.hp > 0) {
          const liveEnemies = curZ.enemies.filter((e) => survivingIds.has(e.id));
          if (comp.stance === 'recall') {
            if (chebyshev(comp.x, comp.y, curP.x, curP.y) > 1) {
              const step = findPathNextStep(curZ, comp.x, comp.y, curP.x, curP.y);
              if (
                step &&
                !(step.x === curP.x && step.y === curP.y) &&
                !liveEnemies.some((e) => e.x === step.x && e.y === step.y)
              ) {
                comp.x = step.x;
                comp.y = step.y;
              }
            }
            if (comp.kind === 'silverwind_lynx' && curP.turnsElapsed % 3 === 0 && curP.hp < derivedStats.maxHp) {
              curP.hp = Math.min(derivedStats.maxHp, curP.hp + 2);
              spawnFloating(curP.x, curP.y, '+2 MEND', '#4EA885');
            } else if (comp.kind === 'starlight_owl' && curP.turnsElapsed % 2 === 0 && curP.mana < derivedStats.maxMana) {
              curP.mana = Math.min(derivedStats.maxMana, curP.mana + 1);
              spawnFloating(curP.x, curP.y, '+1 MP', '#60A5FA');
            }
          } else {
            const maxLeash = comp.stance === 'guard' ? 2 : 6;
            const adjTarget = liveEnemies
              .filter(
                (e) =>
                  chebyshev(comp.x, comp.y, e.x, e.y) === 1 &&
                  (comp.stance === 'aggressive' || chebyshev(curP.x, curP.y, e.x, e.y) <= 2)
              )
              .sort((a, b) => a.hp - b.hp)[0];

            if (adjTarget) {
              const baseCompDmg =
                comp.kind === 'silverwind_lynx'
                  ? 6 + Math.floor(curP.level * 2.4) + Math.floor(curP.attributes.agility * 0.6)
                  : 5 + Math.floor(curP.level * 2.0) + Math.floor(curP.attributes.arcana * 0.7);
              const isCompCrit = comp.kind === 'silverwind_lynx' && Math.random() < 0.2;
              const bestiaryMult = computeBestiaryPerks(activeFlags).damageMultiplierVs(adjTarget.archetype);
              const finalCompDmg = Math.max(
                2,
                Math.round(baseCompDmg * (isCompCrit ? 1.6 : 1) * bestiaryMult - adjTarget.def * 0.45)
              );
              adjTarget.hp -= finalCompDmg;
              soundEngine.playCompanion();
              spawnHitFlash(adjTarget.x, adjTarget.y, comp.kind === 'starlight_owl' ? '#60A5FA' : '#34D399', 110);
              spawnFloating(
                adjTarget.x,
                adjTarget.y,
                `-${finalCompDmg}${isCompCrit ? '!' : ''}`,
                comp.kind === 'starlight_owl' ? '#60A5FA' : '#34D399'
              );
              pushLog(
                `${comp.name} strikes ${adjTarget.name} for ${finalCompDmg} dmg!`,
                'combat',
                curP.turnsElapsed
              );
              if (comp.kind === 'starlight_owl') {
                curP.mana = Math.min(derivedStats.maxMana, curP.mana + 1);
              }
              if (adjTarget.hp <= 0) {
                survivingIds.delete(adjTarget.id);
                const res = handleEnemyDeath(adjTarget, curP, curZ, activeFlags);
                curP = res.nextPlayer;
                curZ.loot = res.nextZone.loot;
                activeFlags = res.nextFlags;
                if (res.victoryTriggered) victoryTriggered = true;
                restoreCheatedDeath(res, adjTarget);
              }
            } else {
              const pursueTarget = liveEnemies
                .filter(
                  (e) =>
                    chebyshev(curP.x, curP.y, e.x, e.y) <= maxLeash &&
                    (curZ.tiles[e.y]?.[e.x]?.visible || e.alerted)
                )
                .sort(
                  (a, b) =>
                    chebyshev(comp.x, comp.y, a.x, a.y) - chebyshev(comp.x, comp.y, b.x, b.y)
                )[0];

              if (pursueTarget) {
                const step = findPathNextStep(curZ, comp.x, comp.y, pursueTarget.x, pursueTarget.y);
                if (
                  step &&
                  !(step.x === curP.x && step.y === curP.y) &&
                  !liveEnemies.some((e) => survivingIds.has(e.id) && e.x === step.x && e.y === step.y)
                ) {
                  comp.x = step.x;
                  comp.y = step.y;
                }
              } else if (chebyshev(comp.x, comp.y, curP.x, curP.y) > 2) {
                const step = findPathNextStep(curZ, comp.x, comp.y, curP.x, curP.y);
                if (
                  step &&
                  !(step.x === curP.x && step.y === curP.y) &&
                  !liveEnemies.some((e) => survivingIds.has(e.id) && e.x === step.x && e.y === step.y)
                ) {
                  comp.x = step.x;
                  comp.y = step.y;
                }
              }
            }
          }
        }
      }

      // Process each enemy sequentially
      for (let idx = 0; idx < curZ.enemies.length; idx++) {
        if (playerDied) break;
        const enemy = curZ.enemies[idx];
        if (!survivingIds.has(enemy.id)) continue;

        if (enemy.skillCooldowns) {
          for (const skKey of Object.keys(enemy.skillCooldowns) as SkillId[]) {
            const rem = enemy.skillCooldowns[skKey] ?? 0;
            if (rem <= 1) delete enemy.skillCooldowns[skKey];
            else enemy.skillCooldowns[skKey] = rem - 1;
          }
        }

        // Tick DoT statuses on enemy
        let dotDamage = 0;
        for (const st of enemy.statuses) {
          if (st.kind === 'bleed' || st.kind === 'burn' || st.kind === 'poison') {
            dotDamage += st.potency;
          }
        }
        enemy.statuses = enemy.statuses
          .map((s) => ({ ...s, turns: s.turns - 1 }))
          .filter((s) => s.turns > 0);

        if (dotDamage > 0) {
          enemy.hp -= dotDamage;
          spawnFloating(enemy.x, enemy.y, `-${dotDamage}`, '#FB923C');
          if (enemy.hp <= 0) {
            survivingIds.delete(enemy.id);
            const res = handleEnemyDeath(enemy, curP, curZ, activeFlags);
            curP = res.nextPlayer;
            curZ.loot = res.nextZone.loot;
            activeFlags = res.nextFlags;
            if (res.victoryTriggered) victoryTriggered = true;
            restoreCheatedDeath(res, enemy);
            continue;
          }
        }

        // Check Stunned
        if (enemy.statuses.some((s) => s.kind === 'stunned')) {
          enemy.intent = undefined;
          spawnFloating(enemy.x, enemy.y, 'STUNNED', '#94A3B8');
          continue;
        }

        const tileVis = curZ.tiles[enemy.y]?.[enemy.x]?.visible;
        if (tileVis && chebyshev(enemy.x, enemy.y, curP.x, curP.y) <= 8) {
          enemy.alerted = true;
        }
        if (!enemy.alerted) continue;

        // Rare/Randboss Shielding Rune defense below 55% HP
        if (!enemy.intent && enemy.runeCharge && enemy.hp < enemy.maxHp * 0.55) {
          enemy.runeCharge = false;
          applyStatus(enemy.statuses, 'shielded', 3, 6);
          soundEngine.playSpell();
          spawnBurst(enemy.x, enemy.y, '#60A5FA', '◊', 6);
          spawnFloating(enemy.x, enemy.y, 'SHIELD RUNE!', '#60A5FA');
          pushLog(
            `${enemy.name} activates a Shielding Rune (+6 DEF for 3t)!`,
            'danger',
            curP.turnsElapsed
          );
          continue;
        }

        // 1. Execute telegraphed intent if primed!
        if (enemy.intent) {
          const hitsPlayer = enemy.intent.targetTiles.some(
            (t) => t.x === curP.x && t.y === curP.y
          );
          const intentLabel = enemy.intent.label;
          const intentDmg = enemy.intent.damage;
          const intentType = enemy.intent.type;
          const intentSkill = enemy.intent.skillId;
          enemy.intent = undefined;

          if (intentSkill) {
            enemy.skillCooldowns = { ...(enemy.skillCooldowns ?? {}), [intentSkill]: 4 };
          }

          if (intentSkill === 'shadowstep') {
            const adjOffsets = [
              { dx: 1, dy: 0 },
              { dx: -1, dy: 0 },
              { dx: 0, dy: 1 },
              { dx: 0, dy: -1 },
              { dx: 1, dy: 1 },
              { dx: -1, dy: -1 },
            ];
            for (const off of adjOffsets) {
              const bx = curP.x + off.dx;
              const by = curP.y + off.dy;
              if (
                curZ.tiles[by]?.[bx]?.walkable &&
                !curZ.enemies.some((o) => survivingIds.has(o.id) && o.x === bx && o.y === by)
              ) {
                enemy.x = bx;
                enemy.y = by;
                spawnBurst(bx, by, '#A855F7', '◈', 6);
                break;
              }
            }
          }

          if (hitsPlayer) {
            if (
              intentType === 'hex_bolt' ||
              intentSkill === 'ember_lance' ||
              intentSkill === 'venom_tip'
            ) {
              spawnProjectile(
                enemy.x,
                enemy.y,
                curP.x,
                curP.y,
                intentSkill === 'ember_lance'
                  ? '#FB923C'
                  : intentSkill === 'venom_tip'
                  ? '#4EA885'
                  : '#A78BFA',
                '*',
                190
              );
            } else if (intentSkill === 'frost_nova') {
              spawnBurst(enemy.x, enemy.y, '#60A5FA', '❄', 9);
            }
            const dodged = Math.random() * 100 < derivedStats.dodgeChance;
            if (dodged) {
              spawnFloating(curP.x, curP.y, 'DODGE', '#4EA885');
              pushLog(`You evaded ${enemy.name}'s ${intentLabel}!`, 'combat', curP.turnsElapsed);
              const evRank = curP.skills.evasive_instinct ?? 0;
              if (evRank >= 2) {
                curP.mana = Math.min(derivedStats.maxMana, curP.mana + 2);
              }
            } else {
              const mitigated = Math.max(2, intentDmg - Math.round(derivedStats.def * 0.7));
              curP.hp -= mitigated;
              soundEngine.playPlayerHurt();
              triggerShake(180);
              spawnHitFlash(curP.x, curP.y, '#EF4444', 150);
              spawnBurst(curP.x, curP.y, '#EF4444', '!', 6);
              spawnFloating(curP.x, curP.y, `-${mitigated}`, '#EF4444');
              pushLog(
                `${enemy.name} lands ${intentLabel} for ${mitigated} dmg!`,
                'danger',
                curP.turnsElapsed
              );
              if (hasProdigy(curP, 'spine_of_world')) {
                applyStatus(curP.statuses, 'spine_guard', 3, 1);
              }
              if (intentSkill === 'ember_lance') tryApplyPlayerAilment('burn', 2, 3);
              else if (intentSkill === 'venom_tip') tryApplyPlayerAilment('poison', 3, 3);
              else if (intentSkill === 'frost_nova') tryApplyPlayerAilment('chilled', 2, 1);
              else if (intentSkill === 'cleave') tryApplyPlayerAilment('bleed', 2, 3);
              else if (intentSkill === 'shield_bash') tryApplyPlayerAilment('chilled', 1, 1);
              else if (intentType === 'hex_bolt' && enemy.archetype === 'rime_revenant') {
                // Phase 3: Rime Revenant bolts carry Frostpeak's chill.
                tryApplyPlayerAilment('chilled', 2, 1);
              }

              if (checkPlayerFatal()) {
                playerDied = true;
                break;
              }
            }
          } else {
            spawnFloating(enemy.x, enemy.y, 'WHIFF', '#94A3B8');
            pushLog(`You sidestepped ${enemy.name}'s telegraphed attack.`, 'neutral', curP.turnsElapsed);
          }
          continue;
        }

        // 2. Otherwise check if adjacent to strike or wind up
        const dist = chebyshev(enemy.x, enemy.y, curP.x, curP.y);
        const newIntent = chooseEnemyIntent(enemy, curP, curZ);
        if (newIntent) {
          enemy.intent = newIntent;
          // Phase 6 coach-mark: the first telegraphed Heavy Strike is
          // the game's hardest early lesson — hint once, as it primes.
          if (newIntent.type === 'heavy_windup') queueCoachMark('telegraph');
          spawnFloating(
            enemy.x,
            enemy.y,
            newIntent.type === 'enemy_skill' ? newIntent.label.toUpperCase() : 'WINDUP!',
            newIntent.type === 'enemy_skill' ? '#C084FC' : '#FBBF24'
          );
          continue;
        }

        if (dist === 1) {
          const dodged = Math.random() * 100 < derivedStats.dodgeChance;
          if (dodged) {
            spawnFloating(curP.x, curP.y, 'DODGE', '#4EA885');
            pushLog(`Dodged ${enemy.name}'s strike.`, 'combat', curP.turnsElapsed);
            const evRank = curP.skills.evasive_instinct ?? 0;
            if (evRank >= 2) {
              curP.mana = Math.min(derivedStats.maxMana, curP.mana + 2);
            }
            if (evRank >= 3) {
              const counter = calculatePlayerHit(curP, enemy, 0.85, false, false, 0, activeFlags);
              enemy.hp -= counter.damage;
              spawnFloating(enemy.x, enemy.y, `-${counter.damage} COUNTER`, '#4EA885');
              if (enemy.hp <= 0) {
                survivingIds.delete(enemy.id);
                const res = handleEnemyDeath(enemy, curP, curZ, activeFlags);
                curP = res.nextPlayer;
                curZ.loot = res.nextZone.loot;
                activeFlags = res.nextFlags;
                if (res.victoryTriggered) victoryTriggered = true;
                restoreCheatedDeath(res, enemy);
              }
            }
          } else {
            const chilled = enemy.statuses.some((s) => s.kind === 'chilled');
            const rawAtk = chilled ? Math.round(enemy.atk * 0.65) : enemy.atk;
            const dmg = Math.max(1, rawAtk - Math.round(derivedStats.def * 0.65));
            curP.hp -= dmg;
            soundEngine.playPlayerHurt();
            triggerShake(110);
            spawnHitFlash(curP.x, curP.y, '#EF4444', 130);
            spawnFloating(curP.x, curP.y, `-${dmg}`, '#EF4444');
            pushLog(`${enemy.name} hits you for ${dmg} dmg.`, 'danger', curP.turnsElapsed);

            if (hasProdigy(curP, 'spine_of_world')) {
              applyStatus(curP.statuses, 'spine_guard', 3, 1);
            }

            // Thorns reflection
            const thornsTotal =
              derivedStats.thorns + (hasAffix(curP, 'thorns_burst') ? 4 : 0);
            if (thornsTotal > 0) {
              enemy.hp -= thornsTotal;
              spawnFloating(enemy.x, enemy.y, `-${thornsTotal} THORNS`, '#F59E0B');
              if (enemy.hp <= 0) {
                survivingIds.delete(enemy.id);
                const res = handleEnemyDeath(enemy, curP, curZ, activeFlags);
                curP = res.nextPlayer;
                curZ.loot = res.nextZone.loot;
                activeFlags = res.nextFlags;
                if (res.victoryTriggered) victoryTriggered = true;
                restoreCheatedDeath(res, enemy);
              }
            }

            if (checkPlayerFatal()) {
              playerDied = true;
              break;
            }
          }
        } else if (
          curP.companion &&
          curP.companion.hp > 0 &&
          curP.companion.respawnCooldown === 0 &&
          chebyshev(enemy.x, enemy.y, curP.companion.x, curP.companion.y) === 1
        ) {
          const comp = curP.companion;
          const chilled = enemy.statuses.some((s) => s.kind === 'chilled');
          const rawAtk = chilled ? Math.round(enemy.atk * 0.65) : enemy.atk;
          const compDmg = Math.max(
            1,
            rawAtk - ((comp.kind === 'silverwind_lynx' ? 2 : 1) + Math.floor(curP.level / 3))
          );
          comp.hp = Math.max(0, comp.hp - compDmg);
          spawnFloating(comp.x, comp.y, `-${compDmg}`, '#F87171');
          pushLog(`${enemy.name} strikes ${comp.name} for ${compDmg} dmg.`, 'danger', curP.turnsElapsed);
          if (comp.hp <= 0) {
            comp.respawnCooldown = 8;
            spawnBurst(comp.x, comp.y, '#94A3B8', '✕', 5);
            pushLog(`${comp.name} collapses! Will reform in 8 turns or upon returning to town.`, 'danger', curP.turnsElapsed);
          }
        } else {
          // Move 1 step toward player
          const step = findPathNextStep(curZ, enemy.x, enemy.y, curP.x, curP.y);
          const occupiedByComp =
            curP.companion &&
            curP.companion.hp > 0 &&
            curP.companion.respawnCooldown === 0 &&
            step &&
            step.x === curP.companion.x &&
            step.y === curP.companion.y;
          if (
            step &&
            !(step.x === curP.x && step.y === curP.y) &&
            !occupiedByComp &&
            !curZ.enemies.some((other) => survivingIds.has(other.id) && other.x === step.x && other.y === step.y)
          ) {
            enemy.x = step.x;
            enemy.y = step.y;
          }
        }
      }

      curZ.enemies = curZ.enemies.filter((e) => survivingIds.has(e.id));
      curP.firstStrikeReady = curZ.enemies.every((e) => !e.alerted);
      computeVisibility(curZ, curP.x, curP.y, getSightRadius(curP, activeFlags));

      setPlayer(curP);
      setZones((prev) => ({ ...prev, [curZ.id]: curZ }));

      if (playerDied) {
        if (!recordedFallenRef.current) {
          recordedFallenRef.current = true;
          recordRunChronicle('fallen', curP, activeFlags);
        }
        setGameState('GAME_OVER');
      } else if (victoryTriggered) {
        setGameState('VICTORY');
      } else {
        // Check Pre-Fight Boss Confrontations & Mini-Boss sightings on newly visible threats
        const seenBosses = activeFlags.confrontedBosses ?? [];
        const miniBoss = curZ.enemies.find(
          (e) =>
            !e.isBoss &&
            e.rank === 'randboss' &&
            curZ.tiles[e.y]?.[e.x]?.visible &&
            !seenBosses.includes(e.id)
        );
        if (miniBoss) {
          soundEngine.playBossRoar();
          triggerShake(130);
          setWorldFlags((prev) => ({
            ...prev,
            confrontedBosses: [...(prev.confrontedBosses ?? []), miniBoss.id],
          }));
          pushLog(`Mini-Boss Warden spotted: ${miniBoss.name}!`, 'danger', curP.turnsElapsed);
        }
        const boss = curZ.enemies.find(
          (e) =>
            e.isBoss &&
            !e.name.startsWith('Abyssal Echo') &&
            curZ.tiles[e.y]?.[e.x]?.visible &&
            !seenBosses.includes(e.archetype)
        );
        if (boss) {
          soundEngine.playBossRoar();
          setWorldFlags((prev) => ({
            ...prev,
            confrontedBosses: [...(prev.confrontedBosses ?? []), boss.archetype],
          }));
          if (boss.archetype === 'boss_bone_cantor') {
            setSpecialPrompt({
              title: 'Vaelen, Bone Cantor',
              subtitle: 'Floor 2 Ossuary Confrontation',
              body: 'A skeletal choir-master lowers his carved femur baton as your lantern touches the ossuary arch. "Another mortal chasing bronze bells and silver graves... Speak before my dirge begins."',
              options: [
                {
                  id: 'pacify_vaelen',
                  label: `[Resolve ${curP.attributes.resolve}/3 or Arcana ${curP.attributes.arcana}/3] Chant the Oath of Release and lay Vaelen to peaceful rest (+1 Skill Pt)`,
                  disabled: curP.attributes.resolve < 3 && curP.attributes.arcana < 3,
                  tone: 'primary',
                  onSelect: () => {
                    soundEngine.playLevelUp();
                    const xpRes = grantXpAndCheckLevel(curP, boss.xpReward);
                    const rewarded: PlayerState = {
                      ...xpRes.nextPlayer,
                      skillPoints: xpRes.nextPlayer.skillPoints + 1,
                      gold: xpRes.nextPlayer.gold + boss.goldReward,
                    };
                    setPlayer(rewarded);
                    setZones((prev) => {
                      const z = prev[curZ.id];
                      if (!z) return prev;
                      return {
                        ...prev,
                        [curZ.id]: {
                          ...z,
                          enemies: z.enemies.filter((e) => e.id !== boss.id),
                          loot: [
                            ...z.loot,
                            {
                              id: uid('drop'),
                              x: boss.x,
                              y: boss.y,
                              item: generateProceduralItem(2, { minRarity: 'Epic' }),
                            },
                          ],
                        },
                      };
                    });
                    setWorldFlags((prev) => ({
                      ...prev,
                      cantorDefeated: true,
                      cantorPacified: true,
                      blightChoice: 'cantor_appeased',
                    }));
                    pushLog('You spoke the Oath of Release. Vaelen bows and dissolves into calm dust (+1 Skill Pt)!', 'quest');
                    setSpecialPrompt(null);
                  },
                },
                {
                  id: 'sunder_vaelen',
                  label: `[Might ${curP.attributes.might}/3] Hurl a stone to shatter his resonance staff (-24 Boss HP, -2 DEF)`,
                  disabled: curP.attributes.might < 3,
                  tone: 'secondary',
                  onSelect: () => {
                    soundEngine.playHit();
                    triggerShake(140);
                    setZones((prev) => {
                      const z = prev[curZ.id];
                      if (!z) return prev;
                      return {
                        ...prev,
                        [curZ.id]: {
                          ...z,
                          enemies: z.enemies.map((e) =>
                            e.id === boss.id ? { ...e, hp: Math.max(10, e.hp - 24), def: Math.max(1, e.def - 2) } : e
                          ),
                        },
                      };
                    });
                    pushLog('Your thrown stone cracks Vaelen’s bone baton before battle begins!', 'combat');
                    setSpecialPrompt(null);
                  },
                },
                {
                  id: 'fight_vaelen',
                  label: 'Draw steel and silence the Bone Cantor',
                  tone: 'danger',
                  onSelect: () => setSpecialPrompt(null),
                },
              ],
            });
          } else if (boss.archetype === 'boss_ashen_inquisitor') {
            setSpecialPrompt({
              title: 'Inquisitor Serath',
              subtitle: 'Floor 4 Crucible Confrontation',
              body: 'Cinder-wreathed iron plates clang as Inquisitor Serath raises his great-flail. "None pass into the Sovereign’s sanctum unpurged by flame!"',
              options: [
                {
                  id: 'stagger_serath',
                  label: `[Might ${curP.attributes.might}/4] Bull-rush his shield stance (Stuns Serath 1t & deals 26 dmg)`,
                  disabled: curP.attributes.might < 4,
                  tone: 'primary',
                  onSelect: () => {
                    soundEngine.playCrit();
                    triggerShake(150);
                    setZones((prev) => {
                      const z = prev[curZ.id];
                      if (!z) return prev;
                      return {
                        ...prev,
                        [curZ.id]: {
                          ...z,
                          enemies: z.enemies.map((e) => {
                            if (e.id !== boss.id) return e;
                            const nextStatuses = [...e.statuses];
                            applyStatus(nextStatuses, 'stunned', 1, 1);
                            return { ...e, hp: Math.max(15, e.hp - 26), statuses: nextStatuses };
                          }),
                        },
                      };
                    });
                    pushLog('You bull-rush Serath’s guard, staggering him before the clash!', 'combat');
                    setSpecialPrompt(null);
                  },
                },
                {
                  id: 'flank_serath',
                  label: `[Agility ${curP.attributes.agility}/4] Slip into flanking poise (Marks Serath +35% dmg & grants +6 DEF Ward)`,
                  disabled: curP.attributes.agility < 4,
                  tone: 'secondary',
                  onSelect: () => {
                    soundEngine.playSpell();
                    setPlayer((p) => {
                      const nextSt = [...p.statuses];
                      applyStatus(nextSt, 'shielded', 3, 6);
                      return { ...p, statuses: nextSt };
                    });
                    setZones((prev) => {
                      const z = prev[curZ.id];
                      if (!z) return prev;
                      return {
                        ...prev,
                        [curZ.id]: {
                          ...z,
                          enemies: z.enemies.map((e) => {
                            if (e.id !== boss.id) return e;
                            const nextSt = [...e.statuses];
                            applyStatus(nextSt, 'marked', 3, 35);
                            return { ...e, statuses: nextSt };
                          }),
                        },
                      };
                    });
                    pushLog('You read Serath’s blind spot—he is Marked and your ward is raised!', 'arcane');
                    setSpecialPrompt(null);
                  },
                },
                {
                  id: 'fight_serath',
                  label: 'Engage Inquisitor Serath',
                  tone: 'danger',
                  onSelect: () => setSpecialPrompt(null),
                },
              ],
            });
          } else if (boss.archetype === 'boss_malakor') {
            setSpecialPrompt({
              title: 'Malakor, Sovereign of Cinder',
              subtitle: 'Floor 5 Throne Confrontation',
              body: 'Beside an ember-lit dais, an armored monarch rises, crown glowing white-hot. "Have you come to claim my crown, delver—or merely test whether your name endures?"',
              options: [
                {
                  id: 'unravel_malakor',
                  label: `[Arcana ${curP.attributes.arcana}/5] Unravel his cinder ward (-45 Boss HP, -3 DEF)`,
                  disabled: curP.attributes.arcana < 5,
                  tone: 'primary',
                  onSelect: () => {
                    soundEngine.playSpell();
                    triggerShake(180);
                    setZones((prev) => {
                      const z = prev[curZ.id];
                      if (!z) return prev;
                      return {
                        ...prev,
                        [curZ.id]: {
                          ...z,
                          enemies: z.enemies.map((e) =>
                            e.id === boss.id
                              ? { ...e, hp: Math.max(95, e.hp - 45), def: Math.max(3, e.def - 3) }
                              : e
                          ),
                        },
                      };
                    });
                    pushLog('Your arcane counter-glyph fractures Malakor’s cinder armor!', 'arcane');
                    setSpecialPrompt(null);
                  },
                },
                {
                  id: 'defy_malakor',
                  label: `[Resolve ${curP.attributes.resolve}/5] Defy the Sovereign (Refill full Mana & gain +8 DEF Ward 4t)`,
                  disabled: curP.attributes.resolve < 5,
                  tone: 'secondary',
                  onSelect: () => {
                    soundEngine.playHeal();
                    setPlayer((p) => {
                      const d = computeDerivedStats(p, activeFlags);
                      const nextSt = [...p.statuses];
                      applyStatus(nextSt, 'shielded', 4, 8);
                      return { ...p, mana: d.maxMana, statuses: nextSt };
                    });
                    pushLog('Unbroken resolve fills your spirit (+Full Mana & +8 DEF Ward)!', 'quest');
                    setSpecialPrompt(null);
                  },
                },
                {
                  id: 'fight_malakor',
                  label: 'Cross blades with Malakor',
                  tone: 'danger',
                  onSelect: () => setSpecialPrompt(null),
                },
              ],
            });
          }
        }
      }
    },
    [
      grantXpAndCheckLevel,
      handleEnemyDeath,
      pushLog,
      recordRunChronicle,
      spawnBurst,
      spawnFloating,
      spawnHitFlash,
      spawnProjectile,
      triggerShake,
      worldFlags,
    ]
  );

  // Open NPC Dialogue
  const openNpcDialogue = useCallback(
    (npcId: string) => {
      const npc = NPCS[npcId];
      if (!npc) return;
      soundEngine.playQuill();
      setActiveDialogue({ npcId, nodeId: npc.rootNodeId });
      setActivePanel('DIALOGUE');
    },
    []
  );

  // Interact with tile under or adjacent to player
  const interactWithTile = useCallback(
    (tx: number, ty: number, p: PlayerState, z: ZoneMap): boolean => {
      const tile = z.tiles[ty]?.[tx];
      if (!tile) return false;
      const mergedZones: Record<ZoneId, ZoneMap> = { ...zones, [z.id]: z };

      // Phase 3 POIs: quiet landmarks — a line of flavor and a tiny one-time
      // discovery. They never gate progress.
      if (tile.interactId === 'poi_standing_stones' || tile.interactId === 'poi_old_oak') {
        const isStones = tile.interactId === 'poi_standing_stones';
        if (tile.used) {
          pushLog(
            isStones
              ? 'The Standing Stones hum faintly under your palm. Whatever listened has heard you.'
              : 'The Old Oak creaks in the wind off the Vale. It has heard everything twice.',
            'neutral'
          );
          return true;
        }
        tile.used = true;
        soundEngine.playQuill();
        const dust = isStones ? 3 : 2;
        setPlayer({ ...p, glyphDust: p.glyphDust + dust });
        setZones((prev) => ({ ...prev, [z.id]: { ...z } }));
        spawnFloating(tx, ty, `+${dust} DUST`, '#FBBF24');
        pushLog(
          isStones
            ? `Discovery: Standing Stones of the Vale (+${dust} Glyph Dust).`
            : `Discovery: The Old Outpost Oak (+${dust} Glyph Dust).`,
          'loot'
        );
        setSpecialPrompt({
          title: isStones ? 'Standing Stones of the Vale' : 'The Old Outpost Oak',
          subtitle: isStones ? 'Silverwood Vale · Pre-Citadel Landmark' : 'Oakhaven Outpost · Living Landmark',
          body: isStones
            ? 'Four wind-scoured stones lean together over a hollow worn smooth by offerings. The carvings are older than the Citadel and face, all of them, slightly downhill — toward the Sunken Reliquary. A surveyor’s notch at the base reads: "The roads were deep before they were dark."'
            : 'The Old Oak was old when Oakhaven was young. Delvers nail their first copper to its trunk for luck; the bark has long since grown over a fortune in small hopes. Sister Wren swears it leans a little more toward the Reliquary stair every year.',
          options: [{ id: 'ok', label: 'Step back', tone: 'primary', onSelect: () => setSpecialPrompt(null) }],
        });
        return true;
      }

      if (tile.kind === 'stairs_down') {
        if (z.id === 'oakhaven') {
          transitionToZone('dungeon_1', 'spawn', p, mergedZones);
          return true;
        }
        if (z.id === 'highspire') {
          transitionToZone('dungeon_3', 'spawn', p, mergedZones);
          return true;
        }
        if (z.id === 'overworld') {
          if (tile.interactId === 'to_barrow_1') {
            transitionToZone('barrow_1', 'spawn', p, mergedZones);
          } else if (tile.interactId === 'to_mire_1') {
            transitionToZone('mire_1', 'spawn', p, mergedZones);
          } else if (tile.interactId === 'to_frost_1') {
            transitionToZone('frost_1', 'spawn', p, mergedZones);
          } else {
            transitionToZone('dungeon_1', 'spawn', p, mergedZones);
          }
          return true;
        }
        if (z.id === 'barrow_1') {
          transitionToZone('barrow_2', 'spawn', p, mergedZones);
          return true;
        }
        if (z.id === 'mire_1') {
          transitionToZone('mire_2', 'spawn', p, mergedZones);
          return true;
        }
        if (z.id === 'frost_1') {
          transitionToZone('frost_2', 'spawn', p, mergedZones);
          return true;
        }
        if (z.id === 'frost_2') {
          transitionToZone('frost_3', 'spawn', p, mergedZones);
          return true;
        }
        const nextDepth = z.depth + 1;
        if (z.depth === 5 && !worldFlags.malakorDefeated) {
          setPlayer(p);
          setZones(mergedZones);
          pushLog("Malakor's cinder ward seals the Abyssal Descent. Defeat the Sovereign first!", 'quest');
          return true;
        }
        transitionToZone(`dungeon_${nextDepth}` as ZoneId, 'spawn', p, mergedZones);
        return true;
      }

      if (tile.kind === 'stairs_up') {
        if (z.id === 'barrow_1') {
          transitionToZone('overworld', { x: 10, y: 5 }, p, mergedZones);
          return true;
        }
        if (z.id === 'barrow_2') {
          transitionToZone('barrow_1', 'return', p, mergedZones);
          return true;
        }
        if (z.id === 'mire_1') {
          transitionToZone('overworld', { x: 42, y: 23 }, p, mergedZones);
          return true;
        }
        if (z.id === 'mire_2') {
          transitionToZone('mire_1', 'return', p, mergedZones);
          return true;
        }
        if (z.id === 'frost_1') {
          transitionToZone('overworld', { x: 44, y: 4 }, p, mergedZones);
          return true;
        }
        if (z.id === 'frost_2') {
          transitionToZone('frost_1', 'return', p, mergedZones);
          return true;
        }
        if (z.id === 'frost_3') {
          transitionToZone('frost_2', 'return', p, mergedZones);
          return true;
        }
        if (z.id === 'dungeon_1') {
          if (worldFlags.discoveredZones.includes('overworld')) {
            setPlayer(p);
            setZones(mergedZones);
            setSpecialPrompt({
              title: 'Reliquary Upper Exit',
              subtitle: 'Sunken Reliquary · Floor 1 Stairwell',
              body: 'This landing connects both to Oakhaven’s town watchwell and the outer valley trail on Silverwood Vale.',
              options: [
                {
                  id: 'to_oakhaven',
                  label: 'Ascend into Oakhaven Outpost (Town)',
                  tone: 'primary',
                  onSelect: () => {
                    setSpecialPrompt(null);
                    transitionToZone('oakhaven', 'return', p, mergedZones);
                  },
                },
                {
                  id: 'to_overworld',
                  label: 'Exit onto Silverwood Vale Overworld',
                  tone: 'secondary',
                  onSelect: () => {
                    setSpecialPrompt(null);
                    transitionToZone('overworld', { x: 20, y: 22 }, p, mergedZones);
                  },
                },
              ],
            });
            return true;
          }
          transitionToZone('oakhaven', 'return', p, mergedZones);
          return true;
        }
        if (z.depth === 3 && worldFlags.citadelAccess) {
          setPlayer(p);
          setZones(mergedZones);
          setSpecialPrompt({
            title: 'Citadel Ascent Split',
            subtitle: 'Floor 3 · Ember Vaults Stairwell',
            body: 'From this landing, you may climb the sealed service stair back to Highspire Citadel or take the main vault steps to Floor 2.',
            options: [
              {
                id: 'to_highspire',
                label: 'Ascend to Highspire Citadel (Safe Bastion)',
                tone: 'primary',
                onSelect: () => {
                  setSpecialPrompt(null);
                  transitionToZone('highspire', 'return', p, mergedZones);
                },
              },
              {
                id: 'to_floor2',
                label: 'Ascend to Floor 2 · Frost-Bound Ossuary',
                tone: 'secondary',
                onSelect: () => {
                  setSpecialPrompt(null);
                  transitionToZone('dungeon_2', 'return', p, mergedZones);
                },
              },
              {
                id: 'stay_floor3',
                label: 'Remain on Floor 3',
                onSelect: () => setSpecialPrompt(null),
              },
            ],
          });
          return true;
        }
        const prevDepth = z.depth - 1;
        if (prevDepth >= 1) {
          transitionToZone(`dungeon_${prevDepth}` as ZoneId, 'return', p, mergedZones);
          return true;
        }
      }

      if (tile.kind === 'gate_city') {
        if (z.id === 'oakhaven') {
          transitionToZone('overworld', { x: 2, y: 12 }, p, mergedZones);
          return true;
        }
        if (z.id === 'highspire') {
          transitionToZone('overworld', { x: 45, y: 12 }, p, mergedZones);
          return true;
        }
        if (z.id === 'thornwick') {
          transitionToZone('overworld', { x: 32, y: 24 }, p, mergedZones);
          return true;
        }
        if (z.id === 'cinderwatch') {
          transitionToZone('overworld', { x: 31, y: 2 }, p, mergedZones);
          return true;
        }
        if (z.id === 'overworld') {
          if (tile.interactId === 'gate_to_oakhaven') {
            transitionToZone('oakhaven', { x: 1, y: 7 }, p, mergedZones);
          } else if (tile.interactId === 'gate_to_thornwick') {
            transitionToZone('thornwick', 'spawn', p, mergedZones);
          } else if (tile.interactId === 'gate_to_cinderwatch') {
            transitionToZone('cinderwatch', 'spawn', p, mergedZones);
          } else if (tile.interactId === 'gate_to_highspire') {
            if (worldFlags.citadelAccess) {
              transitionToZone('highspire', { x: 1, y: 9 }, p, mergedZones);
            } else {
              setPlayer(p);
              setZones(mergedZones);
              pushLog('The Highspire Causeway Gate is sealed. Earn a Citadel Pass from Vance or Vex in Oakhaven.', 'quest');
            }
          } else {
            transitionToZone('oakhaven', { x: 1, y: 7 }, p, mergedZones);
          }
          return true;
        }
      }

      if (tile.kind === 'vault_door' && tile.interactId === 'seal_door') {
        // Phase 3 set piece: this door is bound to the room's Seal Braziers.
        // Lighting the last brazier opens it automatically (brazier branch
        // below), so reaching this prompt means the seal still holds.
        const sealBraziers = z.tiles.flat().filter((t) => t.interactId === 'seal_brazier');
        const litCount = sealBraziers.filter((t) => t.used).length;
        soundEngine.playDoor();
        setSpecialPrompt({
          title: 'Brazier-Sealed Door',
          subtitle: `Depth ${z.depth} · Seal Brazier Hall`,
          body: `Rune-chains bind this door to the hall's Seal Braziers (☼). ${litCount}/${sealBraziers.length} burn so far — light every Seal Brazier in this hall and the seal will grind open on its own.`,
          options: [
            {
              id: 'leave_seal_door',
              label: 'Step away',
              tone: 'secondary',
              onSelect: () => setSpecialPrompt(null),
            },
          ],
        });
        return true;
      }

      if (tile.kind === 'vault_door') {
        soundEngine.playDoor();
        setSpecialPrompt({
          title: 'Sealed Treasure Vault',
          subtitle: `Depth ${z.depth} · High-Risk Chamber`,
          body: 'Heavy obsidian wards bind this vault door. Rare or Randboss guardians watch over reliquary chests inside. Unseal the chamber and prepare for battle?',
          options: [
            {
              id: 'open_vault',
              label: 'Break the Seal & Open the Vault Door',
              tone: 'danger',
              onSelect: () => {
                soundEngine.playDoor();
                const updatedTiles = z.tiles.map((row) => row.map((t) => ({ ...t })));
                const targetTile = updatedTiles[ty]?.[tx];
                if (targetTile) {
                  targetTile.kind = 'door';
                  targetTile.glyph = '+';
                  targetTile.walkable = true;
                  targetTile.blocksSight = false;
                  targetTile.used = true;
                }
                const updatedZone: ZoneMap = {
                  ...z,
                  tiles: updatedTiles,
                  enemies: z.enemies.map((e) =>
                    chebyshev(e.x, e.y, tx, ty) <= 8 ? { ...e, alerted: true } : e
                  ),
                };
                  computeVisibility(updatedZone, p.x, p.y, getSightRadius(p, worldFlags));
                setZones((prev) => ({ ...prev, [z.id]: updatedZone }));
                triggerShake(130);
                pushLog('Vault unsealed! Ancient guardians stir within the chamber.', 'danger');
                setSpecialPrompt(null);
              },
            },
            {
              id: 'leave_vault',
              label: 'Leave the Vault sealed for now',
              tone: 'secondary',
              onSelect: () => setSpecialPrompt(null),
            },
          ],
        });
        return true;
      }

      if (tile.kind === 'chest' && !tile.used) {
        tile.used = true;
        soundEngine.playLoot();
        if (tile.interactId === 'overworld_satchel_chest') {
          const foundGold = 45;
          const foundItem = generateProceduralItem(2, { minRarity: 'Rare' });
          let nextP = addItemToPlayer({ ...p, gold: p.gold + foundGold }, createQuestItem('wayfarer_satchel'));
          nextP = addItemToPlayer(nextP, foundItem);
          setPlayer(nextP);
          setZones((prev) => ({ ...prev, [z.id]: { ...z } }));
          setQuests((prev) => {
            const cur = prev.silverwood_road;
            if (!cur) return prev;
            return {
              ...prev,
              silverwood_road: {
                ...cur,
                stage: 2,
                history: [...cur.history, 'Reclaimed Rowan’s Stolen Satchel from the Silverbridge Tollhouse chest.'],
              },
            };
          });
          spawnBurst(tx, ty, '#FBBF24', '✦', 8);
          pushLog(
            `Recovered Rowan’s Stolen Satchel (+${foundGold}g & ${foundItem.name})! Return to Rowan at Silverbridge.`,
            'quest'
          );
          return true;
        }
        if (tile.interactId?.endsWith('_boss_chest')) {
          const foundGold = 90 + z.depth * 22;
          const foundItem = createRandomSetRelic(z.depth);
          const nextP = addItemToPlayer({ ...p, gold: p.gold + foundGold, glyphDust: p.glyphDust + 6 }, foundItem);
          setPlayer(nextP);
          setZones((prev) => ({ ...prev, [z.id]: { ...z } }));
          spawnBurst(tx, ty, '#FBBF24', '✦', 12);
          pushLog(
            `Side-Dungeon Hoard claimed: +${foundGold}g, +6 Glyph Dust, and ${foundItem.name}!`,
            'loot'
          );
          return true;
        }
        if (tile.interactId === 'vault_chest') {
          const foundGold = 60 + z.depth * 24 + Math.floor(Math.random() * 25);
          const foundItem = generateProceduralItem(z.depth + 2, { minRarity: 'Epic' });
          const foundInsc = generateInscription(z.depth + 1, { minRarity: 'Rare' });
          let nextP = addItemToPlayer({ ...p, gold: p.gold + foundGold }, foundItem);
          nextP = addItemToPlayer(nextP, foundInsc);
          setPlayer(nextP);
          setZones((prev) => ({ ...prev, [z.id]: { ...z } }));
          spawnBurst(tx, ty, '#FBBF24', '✦', 10);
          pushLog(
            `Vault Reliquary looted: +${foundGold}g, ${foundItem.name}, and ${foundInsc.name}!`,
            'loot'
          );
          return true;
        }
        const foundGold = 18 + z.depth * 14 + Math.floor(Math.random() * 14);
        const foundItem = generateProceduralItem(z.depth + 1, { minRarity: 'Uncommon' });
        let nextP = addItemToPlayer({ ...p, gold: p.gold + foundGold }, foundItem);
        if (Math.random() < 0.5) {
          nextP = addItemToPlayer(nextP, createConsumable('heal_potion', 1));
        } else if (Math.random() < 0.35) {
          nextP = addItemToPlayer(nextP, generateInscription(z.depth, { minRarity: 'Uncommon' }));
        }
        setPlayer(nextP);
        setZones((prev) => ({ ...prev, [z.id]: { ...z } }));
        spawnBurst(tx, ty, '#FBBF24', '$', 7);
        pushLog(`Opened chest: +${foundGold}g and ${foundItem.name}!`, 'loot');
        return true;
      }

      if (tile.kind === 'brazier' && !tile.used) {
        tile.used = true;
        soundEngine.playHeal();
        const d = computeDerivedStats(p, worldFlags);
        const nextP = { ...p, hp: d.maxHp, mana: d.maxMana, statuses: [] };
        setPlayer(nextP);
        setZones((prev) => ({ ...prev, [z.id]: { ...z } }));
        spawnFloating(tx, ty, 'RESTORED', '#4EA885');
        if (tile.interactId === 'seal_brazier') {
          // Phase 3 set piece: track the hall's Seal Braziers; lighting the
          // last one grinds the Brazier-Sealed Door open.
          const sealBraziers = z.tiles.flat().filter((t) => t.interactId === 'seal_brazier');
          const litCount = sealBraziers.filter((t) => t.used).length;
          if (litCount >= sealBraziers.length && sealBraziers.length > 0) {
            const updatedTiles = z.tiles.map((row) => row.map((t) => ({ ...t })));
            let opened = false;
            for (const row of updatedTiles) {
              for (const t of row) {
                if (t.interactId === 'seal_door' && t.kind === 'vault_door') {
                  t.kind = 'door';
                  t.glyph = '+';
                  t.walkable = true;
                  t.blocksSight = false;
                  t.used = true;
                  t.label = 'Unsealed Reliquary Door';
                  opened = true;
                }
              }
            }
            if (opened) {
              setZones((prev) => ({ ...prev, [z.id]: { ...z, tiles: updatedTiles } }));
              triggerShake(130);
              pushLog('The last Seal Brazier catches — somewhere in the hall, a rune-seal grinds open!', 'quest');
            }
          } else {
            pushLog(`Seal Brazier lit (${litCount}/${sealBraziers.length}). Its warmth restores you as the seal weakens.`, 'arcane');
          }
        } else if (tile.interactId === 'poi_hunter_camp') {
          pushLog("A hunter's cold camp, recently left: cold ash, a skinned rabbit, and a note — 'Fox took the good snare. Vale provides.' The banked embers still mend you.", 'neutral');
        } else {
          pushLog('Warm brazier embers mend your wounds and refill your mana.', 'arcane');
        }
        return true;
      }

      if (tile.kind === 'shrine') {
        soundEngine.playSpell();
        setSpecialPrompt({
          title: 'Glyph Shrine of Renewal',
          subtitle: 'Restorative & Build Respec Altar',
          body: 'Ancient runes hum around this stone altar. You may restore your vigor or clear your learned attributes and skills to test an entirely new build.',
          options: [
            {
              id: 'heal',
              label: 'Commune for Full HP & Mana Restoration (Free)',
              tone: 'primary',
              onSelect: () => {
                const d = computeDerivedStats(player, worldFlags);
                setPlayer((cur) => ({ ...cur, hp: d.maxHp, mana: d.maxMana, statuses: [] }));
                soundEngine.playHeal();
                setSpecialPrompt(null);
              },
            },
            {
              id: 'respec',
              label: 'Reset All Attributes & Skills for Fresh Build (Free at Shrine)',
              tone: 'secondary',
              onSelect: () => {
                setPlayer((cur) => {
                  const preset = getStarterPreset(cur.starterClass);
                  const refunded = computeRespecPoints(cur.level, worldFlags, quests);
                  const nextP: PlayerState = {
                    ...cur,
                    attributes: { ...preset.attributes },
                    skills: {},
                    hotbar: [null, null, null, null, null],
                    attributePoints: refunded.attributePoints,
                    skillPoints: refunded.skillPoints,
                  };
                  const d = computeDerivedStats(nextP, worldFlags);
                  nextP.maxHp = d.maxHp;
                  nextP.hp = d.maxHp;
                  nextP.maxMana = d.maxMana;
                  nextP.mana = d.maxMana;
                  return nextP;
                });
                soundEngine.playLevelUp();
                pushLog('Attributes and Skills refunded! Open Skills [K] to build anew.', 'quest');
                setSpecialPrompt(null);
              },
            },
            {
              id: 'close',
              label: 'Step away',
              onSelect: () => setSpecialPrompt(null),
            },
          ],
        });
        return true;
      }

      if (tile.kind === 'lore_tablet' && tile.interactId) {
        const entry = LORE_ENTRIES[tile.interactId];
        if (entry) {
          soundEngine.playQuill();
          const loreId = tile.interactId;
          const updatedFlags: WorldFlags = {
            ...worldFlags,
            readLoreIds: worldFlags.readLoreIds.includes(loreId)
              ? worldFlags.readLoreIds
              : [...worldFlags.readLoreIds, loreId],
          };
          const featRes = evaluateFeatsAndApply(p, updatedFlags);
          setPlayer(featRes.nextPlayer);
          setZones(mergedZones);
          setWorldFlags(featRes.nextFlags);
          // Phase 3 survey quest: progress is the count of unique steles
          // transcribed (WorldFlags.readLoreIds); stage mirrors it (cap 6).
          setQuests((prev) => {
            const cur = prev.deep_survey;
            if (!cur || cur.status !== 'active') return prev;
            const readCount = Math.min(6, updatedFlags.readLoreIds.length);
            const nextStage = Math.max(cur.stage, readCount);
            if (nextStage === cur.stage) return prev;
            return {
              ...prev,
              deep_survey: {
                ...cur,
                stage: nextStage,
                history: [
                  ...cur.history,
                  nextStage >= 6
                    ? 'Survey complete: 6 steles transcribed. Return to Rowan at Silverbridge Camp.'
                    : `Transcribed a carved stele (${readCount}/6 for Rowan’s survey).`,
                ],
              },
            };
          });
          setSpecialPrompt({
            title: entry.title,
            subtitle: 'Carved Stele Inscription',
            body: entry.text,
            options: [{ id: 'ok', label: 'Close', tone: 'primary', onSelect: () => setSpecialPrompt(null) }],
          });
          return true;
        }
      }

      if (tile.kind === 'contraband_cache' && !tile.used) {
        tile.used = true;
        soundEngine.playLoot();
        const ledger = createQuestItem('smuggler_ledger');
        const nextP = addItemToPlayer({ ...p, gold: p.gold + 20 }, ledger);
        setPlayer(nextP);
        setZones((prev) => ({ ...prev, [z.id]: { ...z } }));
        setQuests((prev) => {
          const cur = prev.shadows_beneath;
          return {
            ...prev,
            shadows_beneath: {
              id: 'shadows_beneath',
              status: 'active',
              stage: 2,
              history: [
                ...(cur?.history ?? []),
                'Recovered the Sealed Contraband Ledger on Floor 1. Choose whether to bring it to Vance or Vex.',
              ],
            },
          };
        });
        pushLog('Found Sealed Contraband Ledger! Return to Warden Vance or Vex in Oakhaven.', 'quest');
        return true;
      }

      if (tile.kind === 'herb_node' && !tile.used) {
        tile.used = true;
        soundEngine.playLoot();
        const herb = createQuestItem('pale_nightbloom');
        const nextP = addItemToPlayer(p, herb);
        setPlayer(nextP);
        setZones((prev) => ({ ...prev, [z.id]: { ...z } }));
        setQuests((prev) => {
          const cur = prev.herbalist_blight;
          if (!cur) return prev;
          return {
            ...prev,
            herbalist_blight: {
              ...cur,
              stage: 2,
              history: [...cur.history, 'Gathered luminous Pale Nightbloom for Herbalist Mira.'],
            },
          };
        });
        pushLog('Harvested Pale Nightbloom! Bring it to Herbalist Mira in Oakhaven.', 'quest');
        return true;
      }

      if (tile.kind === 'whispering_bell' && !tile.used) {
        // Defense in depth: the Bell is a one-time Floor 3 story relic.
        // Any bell tile outside dungeon_3, after a bell fate was already
        // chosen, or while the player already carries the Bell is inert —
        // it must never grant a second item or a second +2 Attribute shatter.
        if (
          z.id !== 'dungeon_3' ||
          worldFlags.bellChoice ||
          p.inventory.some((i) => i.questTag === 'whispering_bell')
        ) {
          tile.used = true;
          setZones((prev) => ({ ...prev, [z.id]: { ...z } }));
          pushLog('A faint bell echo hums here — its power is already spent.', 'neutral');
          return true;
        }
        soundEngine.playSpell();
        setSpecialPrompt({
          title: 'The Whispering Bell',
          subtitle: 'Ember Vaults · Floor 3 Relic',
          body: 'A suspended bronze bell hums in deep resonance. You can carry it back to Highspire for Archivist Lyra or Magistrate Corvus—or use your Arcana to shatter it on the spot and absorb its cinder pulse.',
          options: [
            {
              id: 'take_bell',
              label: 'Unchain and take the Whispering Bell intact',
              tone: 'primary',
              onSelect: () => {
                tile.used = true;
                const bell = createQuestItem('whispering_bell');
                setPlayer((cur) => addItemToPlayer(cur, bell));
                setZones((prev) => ({ ...prev, [z.id]: { ...z } }));
                setQuests((prev) => ({
                  ...prev,
                  whispering_bell: {
                    id: 'whispering_bell',
                    status: 'active',
                    stage: 2,
                    history: [
                      ...(prev.whispering_bell?.history ?? []),
                      'Claimed the Whispering Bell intact on Floor 3.',
                    ],
                  },
                }));
                soundEngine.playLoot();
                pushLog('Claimed the Whispering Bell! Bring it to Lyra or Corvus in Highspire.', 'quest');
                setSpecialPrompt(null);
              },
            },
            {
              id: 'shatter_bell',
              label: `[Arcana ${p.attributes.arcana}/3] Shatter the Bell and absorb its Cinder Surge (+2 Attribute Pts)`,
              disabled: p.attributes.arcana < 3,
              tone: 'danger',
              onSelect: () => {
                tile.used = true;
                setPlayer((cur) => ({ ...cur, attributePoints: cur.attributePoints + 2 }));
                setZones((prev) => ({ ...prev, [z.id]: { ...z } }));
                setWorldFlags((prev) => ({ ...prev, bellChoice: 'shattered_self' }));
                setQuests((prev) => ({
                  ...prev,
                  whispering_bell: {
                    id: 'whispering_bell',
                    status: 'completed',
                    stage: 3,
                    outcomeLabel: 'Shattered the Bell',
                    history: [
                      ...(prev.whispering_bell?.history ?? []),
                      'Shattered the Whispering Bell on Floor 3 and absorbed +2 Attribute Points.',
                    ],
                  },
                }));
                soundEngine.playLevelUp();
                triggerShake(220);
                pushLog('The Bell shatters! +2 Attribute Points surge into your veins.', 'arcane');
                setSpecialPrompt(null);
              },
            },
            { id: 'leave', label: 'Leave it for now', onSelect: () => setSpecialPrompt(null) },
          ],
        });
        return true;
      }

      if (tile.kind === 'waystone' && !tile.used) {
        soundEngine.playWaystone();
        computeVisibility(z, p.x, p.y, getSightRadius(p, worldFlags));
        setPlayer(p);
        setZones((prev) => ({ ...prev, [z.id]: { ...z } }));
        const recordWaystone = (attuneBonusP: PlayerState, logMsg: string) => {
          tile.used = true;
          const nextAttuned = (worldFlags.waystonesAttuned ?? 0) + 1;
          const updatedFlags: WorldFlags = {
            ...worldFlags,
            waystonesAttuned: nextAttuned,
            readLoreIds: worldFlags.readLoreIds.includes('lore_waystone')
              ? worldFlags.readLoreIds
              : [...worldFlags.readLoreIds, 'lore_waystone'],
          };
          const featRes = evaluateFeatsAndApply(attuneBonusP, updatedFlags);
          setPlayer(featRes.nextPlayer);
          setZones((prev) => ({ ...prev, [z.id]: { ...z } }));
          setWorldFlags(featRes.nextFlags);
          setQuests((prev) => {
            const cur = prev.outrider_oath;
            const targetStage = nextAttuned >= 2 ? 3 : 2;
            if (!cur) {
              return {
                ...prev,
                outrider_oath: {
                  id: 'outrider_oath',
                  status: 'active',
                  stage: targetStage,
                  history: [
                    `Attuned an Elven Waystone ${z.depth > 0 ? `on Floor ${z.depth}` : `in ${z.name}`} (${Math.min(2, nextAttuned)}/2).`,
                  ],
                },
              };
            }
            if (cur.status === 'completed') return prev;
            return {
              ...prev,
              outrider_oath: {
                ...cur,
                stage: Math.max(cur.stage, targetStage),
                history: [
                  ...cur.history,
                  `Attuned Elven Waystone ${z.depth > 0 ? `on Floor ${z.depth}` : `in ${z.name}`} (${Math.min(2, nextAttuned)}/2).`,
                ],
              },
            };
          });
          spawnBurst(tx, ty, '#38BDF8', '◈', 10);
          spawnFloating(tx, ty, 'ATTUNED', '#38BDF8');
          pushLog(logMsg, 'arcane');
          setSpecialPrompt(null);
        };

        setSpecialPrompt({
          title: 'Elven Starlight Waystone',
          subtitle: `Depth ${z.depth} · Ancient Outrider Cairn`,
          body: 'Silver-inlaid obelisks pulse softly with starlight left by earlier elven outriders. As Garth approaches, the runes respond to his tread.',
          options: [
            {
              id: 'attune_waystone',
              label: 'Attune the Waystone (Restore 35% HP & MP, +4 DEF Ward 4t)',
              tone: 'primary',
              onSelect: () => {
                soundEngine.playWaystone();
                const d = computeDerivedStats(p, worldFlags);
                const nextSt = [...p.statuses];
                applyStatus(nextSt, 'shielded', 4, 4);
                const nextP: PlayerState = {
                  ...p,
                  hp: Math.min(d.maxHp, p.hp + Math.max(8, Math.round(d.maxHp * 0.35))),
                  mana: Math.min(d.maxMana, p.mana + Math.max(5, Math.round(d.maxMana * 0.35))),
                  statuses: nextSt,
                };
                recordWaystone(
                  nextP,
                  'Starlight mends your vigor (+35% HP/MP & +4 DEF Ward) and attunes the Waystone!'
                );
              },
            },
            {
              id: 'surge_waystone',
              label: `[Arcana ${p.attributes.arcana}/3 or Resolve ${p.attributes.resolve}/3] Draw Starlight Surge (Reset Cooldowns, Full MP, +8 Dust)`,
              disabled: p.attributes.arcana < 3 && p.attributes.resolve < 3,
              tone: 'secondary',
              onSelect: () => {
                soundEngine.playWaystone();
                const d = computeDerivedStats(p, worldFlags);
                const nextP: PlayerState = {
                  ...p,
                  mana: d.maxMana,
                  cooldowns: {},
                  inscriptionCooldowns: [0, 0, 0],
                  glyphDust: p.glyphDust + 8,
                };
                recordWaystone(
                  nextP,
                  'Starlight Surge resets all cooldowns, refills Mana, and yields +8 Glyph Dust!'
                );
              },
            },
            { id: 'leave_waystone', label: 'Leave the Waystone untouched', onSelect: () => setSpecialPrompt(null) },
          ],
        });
        return true;
      }

      if (tile.kind === 'forgotten_forge' && !tile.used) {
        soundEngine.playForge();
        computeVisibility(z, p.x, p.y, getSightRadius(p, worldFlags));
        setPlayer(p);
        setZones((prev) => ({ ...prev, [z.id]: { ...z } }));
        const maxUpgradeLevel = (worldFlags.townUpgrades?.smithy ?? 0) >= 2 ? 4 : 3;
        const equipTarget = p.equipped.weapon ?? p.equipped.armor ?? p.equipped.ring ?? p.equipped.amulet;
        const canTemper = Boolean(equipTarget && equipTarget.upgradeLevel < maxUpgradeLevel);
        const freeTemper = p.attributes.might >= 3;
        const markForgeUsed = (updatedPlayer: PlayerState) => {
          tile.used = true;
          const updatedFlags: WorldFlags = {
            ...worldFlags,
            readLoreIds: worldFlags.readLoreIds.includes('lore_forge')
              ? worldFlags.readLoreIds
              : [...worldFlags.readLoreIds, 'lore_forge'],
          };
          const featRes = evaluateFeatsAndApply(updatedPlayer, updatedFlags);
          setZones((prev) => ({ ...prev, [z.id]: { ...z } }));
          setWorldFlags(featRes.nextFlags);
          return featRes.nextPlayer;
        };

        const options: SpecialPrompt['options'] = [];
        if (canTemper && equipTarget) {
          options.push({
            id: 'temper_forge',
            label: `${freeTemper ? `[Might ${p.attributes.might}/3 · Free]` : '8 Glyph Dust:'} Temper ${equipTarget.name} (+1 Upgrade)`,
            disabled: !freeTemper && p.glyphDust < 8,
            tone: 'primary',
            onSelect: () => {
              soundEngine.playForge();
              const upgraded = upgradeEquipmentItem(equipTarget);
              const nextP: PlayerState = {
                ...p,
                glyphDust: freeTemper ? p.glyphDust : p.glyphDust - 8,
                equipped: { ...p.equipped, [equipTarget.slot!]: upgraded },
              };
              const d = computeDerivedStats(nextP, worldFlags);
              nextP.maxHp = d.maxHp;
              nextP.maxMana = d.maxMana;
              const finalP = markForgeUsed(nextP);
              setPlayer(finalP);
              spawnBurst(tx, ty, '#FB923C', '⚒', 10);
              spawnFloating(tx, ty, 'TEMPERED!', '#FBBF24');
              pushLog(`Forged in ancient coals: ${upgraded.name}!`, 'arcane');
              setSpecialPrompt(null);
            },
          });
        }
        options.push({
          id: 'smelt_relic',
          label: 'Smelt a Relic from Glowing Slag (35g -> Random Set Relic or Epic Gear)',
          disabled: p.gold < 35,
          tone: 'secondary',
          onSelect: () => {
            soundEngine.playForge();
            const crafted =
              Math.random() < 0.65
                ? createRandomSetRelic(z.depth)
                : generateProceduralItem(z.depth + 1, { minRarity: 'Epic' });
            const nextP = addItemToPlayer({ ...p, gold: p.gold - 35 }, crafted);
            const finalP = markForgeUsed(nextP);
            setPlayer(finalP);
            spawnBurst(tx, ty, '#FBBF24', '✦', 9);
            pushLog(`Smelted ${crafted.name} (${crafted.rarity}) at the Forgotten Forge!`, 'loot');
            setSpecialPrompt(null);
          },
        });
        options.push({
          id: 'harvest_embers',
          label: 'Rake Cold Hearth for Glyph Dust (+10 Glyph Dust)',
          tone: 'secondary',
          onSelect: () => {
            soundEngine.playLoot();
            const finalP = markForgeUsed({ ...p, glyphDust: p.glyphDust + 10 });
            setPlayer(finalP);
            spawnFloating(tx, ty, '+10 DUST', '#60A5FA');
            pushLog('Harvested +10 Glyph Dust from the Forgotten Forge.', 'loot');
            setSpecialPrompt(null);
          },
        });
        options.push({ id: 'leave_forge', label: 'Step away from the Anvil', onSelect: () => setSpecialPrompt(null) });

        setSpecialPrompt({
          title: 'Forgotten Mithril Forge',
          subtitle: `Depth ${z.depth} · Dwarven-Elven Foundry`,
          body: 'Warm coals still smolder beneath a soot-blackened anvil. Enough ember-heat remains for one masterwork tempering or relic smelt before the hearth cools.',
          options,
        });
        return true;
      }

      if (tile.kind === 'cursed_altar' && !tile.used) {
        soundEngine.playSpell();
        computeVisibility(z, p.x, p.y, getSightRadius(p, worldFlags));
        setPlayer(p);
        setZones((prev) => ({ ...prev, [z.id]: { ...z } }));
        const markAltarUsed = (updatedPlayer: PlayerState) => {
          tile.used = true;
          const updatedFlags: WorldFlags = {
            ...worldFlags,
            readLoreIds: worldFlags.readLoreIds.includes('lore_altar')
              ? worldFlags.readLoreIds
              : [...worldFlags.readLoreIds, 'lore_altar'],
          };
          const featRes = evaluateFeatsAndApply(updatedPlayer, updatedFlags);
          setZones((prev) => ({ ...prev, [z.id]: { ...z } }));
          setWorldFlags(featRes.nextFlags);
          return featRes.nextPlayer;
        };
        const d = computeDerivedStats(p, worldFlags);
        const bloodCost = Math.max(1, Math.min(p.hp - 1, Math.round(d.maxHp * 0.25)));

        setSpecialPrompt({
          title: 'Occult Blood Altar',
          subtitle: `Depth ${z.depth} · Forbidden Pact`,
          body: 'Dark obsidian bowls drink stray lantern light. A relic lies suspended in a crimson sigil—offering blood buys power, while steady resolve can purify the stone.',
          options: [
            {
              id: 'blood_pact',
              label: `Offer ${bloodCost} HP (25% Max) for a Set Relic/Epic Gear & +14 Glyph Dust`,
              disabled: p.hp <= 2,
              tone: 'danger',
              onSelect: () => {
                soundEngine.playTrap();
                triggerShake(170);
                const reward =
                  Math.random() < 0.7
                    ? createRandomSetRelic(z.depth)
                    : generateProceduralItem(z.depth + 1, { minRarity: 'Epic' });
                const nextP = addItemToPlayer(
                  { ...p, hp: Math.max(1, p.hp - bloodCost), glyphDust: p.glyphDust + 14 },
                  reward
                );
                const finalP = markAltarUsed(nextP);
                setPlayer(finalP);
                spawnBurst(tx, ty, '#C084FC', 'Ψ', 10);
                spawnFloating(tx, ty, `-${bloodCost} HP`, '#EF4444');
                pushLog(`Blood pact sealed: gained ${reward.name} & +14 Glyph Dust!`, 'loot');
                setSpecialPrompt(null);
              },
            },
            {
              id: 'purify_altar',
              label: `[Resolve ${p.attributes.resolve}/3] Purify the Altar (Full Heal, +45 XP, +10 Dust)`,
              disabled: p.attributes.resolve < 3,
              tone: 'primary',
              onSelect: () => {
                soundEngine.playWaystone();
                const healed: PlayerState = {
                  ...p,
                  hp: d.maxHp,
                  mana: d.maxMana,
                  statuses: [],
                  glyphDust: p.glyphDust + 10,
                };
                const xpRes = grantXpAndCheckLevel(healed, 45, worldFlags);
                const finalP = markAltarUsed(xpRes.nextPlayer);
                setPlayer(finalP);
                spawnBurst(tx, ty, '#60A5FA', '✦', 10);
                spawnFloating(tx, ty, 'PURIFIED!', '#60A5FA');
                pushLog('You purified the Occult Altar! Full recovery, +45 XP, and +10 Glyph Dust.', 'quest');
                setSpecialPrompt(null);
              },
            },
            { id: 'leave_altar', label: 'Back away from the Altar', onSelect: () => setSpecialPrompt(null) },
          ],
        });
        return true;
      }

      return false;
    },
    [addItemToPlayer, evaluateFeatsAndApply, grantXpAndCheckLevel, player, pushLog, spawnBurst, spawnFloating, transitionToZone, triggerShake, worldFlags, zones]
  );

  // Execute Active Skill
  const executeSkill = useCallback(
    (skillId: SkillId, targetX: number, targetY: number) => {
      const def = SKILLS[skillId];
      const rank = player.skills[skillId] ?? 0;
      if (!def || rank === 0) return;
      if (player.mana < def.manaCost) {
        pushLog(`Not enough Mana for ${def.name} (${def.manaCost} MP needed).`, 'danger');
        setArmedSkill(null);
        setAimedTarget(null);
        return;
      }

      let activeFlags: WorldFlags = worldFlags;
      let victoryTriggered = false;
      let nextP: PlayerState = {
        ...player,
        mana: player.mana - def.manaCost,
        cooldowns: { ...player.cooldowns, [skillId]: def.cooldown },
      };
      if (def.branch === 'runecaster' && hasProdigy(nextP, 'arcane_conduit')) {
        const shavedCds: Partial<Record<SkillId, number>> = { ...nextP.cooldowns };
        for (const k of Object.keys(shavedCds) as SkillId[]) {
          if (k !== skillId && (shavedCds[k] ?? 0) > 0) {
            shavedCds[k] = Math.max(0, (shavedCds[k] ?? 0) - 1);
          }
        }
        nextP.cooldowns = shavedCds;
        nextP.inscriptionCooldowns = (nextP.inscriptionCooldowns ?? [0, 0, 0]).map((cd) =>
          Math.max(0, cd - 1)
        );
      }

      const nextZ: ZoneMap = {
        ...currentZone,
        enemies: currentZone.enemies.map((e) => ({ ...e, statuses: e.statuses.map((s) => ({ ...s })) })),
        loot: [...currentZone.loot],
      };

      const echoRank = nextP.skills.arcane_echo ?? 0;
      const echoChance = echoRank === 1 ? 0.25 : echoRank === 2 ? 0.4 : echoRank === 3 ? 0.55 : 0;

      const applyEchoIfTriggered = (enemy: Enemy) => {
        if (echoChance > 0 && enemy.hp > 0 && Math.random() < echoChance) {
          const mult = echoRank === 1 ? 0.5 : echoRank === 2 ? 0.65 : 0.85;
          const echoHit = calculatePlayerHit(nextP, enemy, mult, true, false, 0, activeFlags);
          enemy.hp -= echoHit.damage;
          spawnFloating(enemy.x, enemy.y, `-${echoHit.damage} ECHO`, '#60A5FA');
          spawnBurst(enemy.x, enemy.y, '#60A5FA', '❖', 5);
          if (echoRank >= 2) {
            nextP.cooldowns[skillId] = Math.max(0, (nextP.cooldowns[skillId] ?? 1) - 1);
          }
          pushLog(`Arcane Echo blasts ${enemy.name} for ${echoHit.damage}!`, 'arcane');
        }
      };

      const applyFlexibleFollowUp = (enemy: Enemy) => {
        if (
          hasProdigy(nextP, 'flexible_combat') &&
          enemy.hp > 0 &&
          Math.random() < 0.45
        ) {
          const combo = calculatePlayerHit(nextP, enemy, 0.65, false, false, 0, activeFlags);
          enemy.hp -= combo.damage;
          spawnFloating(enemy.x, enemy.y, `-${combo.damage} COMBO`, '#FBBF24');
          pushLog(`Flexible Combat strikes ${enemy.name} for +${combo.damage}!`, 'crit');
        }
      };

      if (skillId === 'iron_fortress') {
        const defBonus = rank === 1 ? 8 : rank === 2 ? 11 : 14;
        const turns = rank === 3 ? 4 : 3;
        applyStatus(nextP.statuses, 'shielded', turns, defBonus);
        if (rank >= 2) {
          nextP.statuses = nextP.statuses.filter((s) => s.kind !== 'bleed' && s.kind !== 'poison');
        }
        if (rank === 3) {
          nextP.hp = Math.min(computeDerivedStats(nextP, activeFlags).maxHp, nextP.hp + 12);
        }
        soundEngine.playSpell();
        spawnBurst(nextP.x, nextP.y, '#F59E0B', '♜', 6);
        spawnFloating(nextP.x, nextP.y, `+${defBonus} WARD`, '#F59E0B');
        pushLog(`Iron Fortress raised (+${defBonus} DEF for ${turns} turns).`, 'combat');
        setArmedSkill(null);
        setAimedTarget(null);
        runEnemyTurns(nextP, nextZ, activeFlags);
        return;
      }

      if (skillId === 'frost_nova') {
        const radius = rank === 3 ? 3 : 2;
        const mult = rank === 1 ? 1.1 : rank === 2 ? 1.4 : 1.7;
        const base = rank === 1 ? 10 : rank === 2 ? 14 : 18;
        soundEngine.playFrost();
        spawnBurst(nextP.x, nextP.y, '#60A5FA', '❄', 10);
        let hits = 0;
        const deadList: Enemy[] = [];
        for (const enemy of nextZ.enemies) {
          const dist = chebyshev(nextP.x, nextP.y, enemy.x, enemy.y);
          if (dist <= radius) {
            hits += 1;
            const res = calculatePlayerHit(nextP, enemy, mult, true, false, 0, activeFlags);
            const total = base + res.damage;
            enemy.hp -= total;
            applyStatus(enemy.statuses, 'chilled', rank === 3 ? 3 : 2, 1);
            if (rank >= 2 && dist === 1) {
              applyStatus(enemy.statuses, 'stunned', 1, 1);
            }
            spawnFloating(enemy.x, enemy.y, `-${total} FROST`, '#93C5FD');
            spawnHitFlash(enemy.x, enemy.y, '#93C5FD', 140);
            applyEchoIfTriggered(enemy);
            if (enemy.hp <= 0) deadList.push(enemy);
          }
        }
        for (const d of deadList) {
          const res = handleEnemyDeath(d, nextP, nextZ, activeFlags);
          nextP = res.nextPlayer;
          nextZ.enemies = res.nextZone.enemies;
          nextZ.loot = res.nextZone.loot;
          activeFlags = res.nextFlags;
          if (res.victoryTriggered) victoryTriggered = true;
        }
        pushLog(
          hits > 0 ? `Rime Nova freezes ${hits} foe(s)!` : 'Rime Nova chills the empty stone.',
          'arcane'
        );
        setArmedSkill(null);
        setAimedTarget(null);
        if (victoryTriggered) {
          setPlayer(nextP);
          setZones((prev) => ({ ...prev, [nextZ.id]: nextZ }));
          setGameState('VICTORY');
          return;
        }
        runEnemyTurns(nextP, nextZ, activeFlags);
        return;
      }

      if (skillId === 'shadowstep') {
        const maxRange = rank === 1 ? 4 : 5;
        const dist = chebyshev(nextP.x, nextP.y, targetX, targetY);
        const tile = nextZ.tiles[targetY]?.[targetX];
        const occupied = nextZ.enemies.some((e) => e.x === targetX && e.y === targetY);
        if (!tile?.walkable || !tile.visible || occupied || dist === 0 || dist > maxRange) {
          pushLog('Choose an unoccupied visible floor tile within Shadowstep range.', 'neutral');
          return;
        }
        nextP.x = targetX;
        nextP.y = targetY;
        soundEngine.playSpell();
        spawnBurst(targetX, targetY, '#4EA885', '◈', 7);
        const adjEnemy = nextZ.enemies.find((e) => chebyshev(e.x, e.y, targetX, targetY) === 1);
        if (adjEnemy) {
          const mult = rank === 1 ? 1.25 : rank === 2 ? 1.5 : 1.75;
          const hit = calculatePlayerHit(nextP, adjEnemy, mult, false, rank >= 2, 0, activeFlags);
          adjEnemy.hp -= hit.damage;
          spawnHitFlash(adjEnemy.x, adjEnemy.y, 'white', 135);
          if (hit.lifestealHeal > 0) {
            nextP.hp = Math.min(computeDerivedStats(nextP, activeFlags).maxHp, nextP.hp + hit.lifestealHeal);
          }
          spawnFloating(
            adjEnemy.x,
            adjEnemy.y,
            `-${hit.damage}${hit.isCrit ? ' CRIT!' : ''}`,
            hit.isCrit ? '#FBBF24' : '#4EA885'
          );
          applyEchoIfTriggered(adjEnemy);
          applyFlexibleFollowUp(adjEnemy);
          pushLog(`Shadowstep ambush hits ${adjEnemy.name} for ${hit.damage}!`, hit.isCrit ? 'crit' : 'combat');
          if (adjEnemy.hp <= 0) {
            const res = handleEnemyDeath(adjEnemy, nextP, nextZ, activeFlags);
            nextP = res.nextPlayer;
            nextZ.enemies = res.nextZone.enemies;
            nextZ.loot = res.nextZone.loot;
            activeFlags = res.nextFlags;
            if (res.victoryTriggered) victoryTriggered = true;
          }
        } else {
          pushLog('Blinked through shadow.', 'arcane');
        }
        setArmedSkill(null);
        setAimedTarget(null);
        if (victoryTriggered) {
          setPlayer(nextP);
          setZones((prev) => ({ ...prev, [nextZ.id]: nextZ }));
          setGameState('VICTORY');
          return;
        }
        runEnemyTurns(nextP, nextZ, activeFlags);
        return;
      }

      // Targeted Enemy Skills (cleave, shield_bash, venom_tip, executioners_mark, ember_lance)
      const targetEnemy = nextZ.enemies.find((e) => e.x === targetX && e.y === targetY);
      const dist = chebyshev(nextP.x, nextP.y, targetX, targetY);
      const effectiveRange =
        (skillId === 'ember_lance' || skillId === 'venom_tip') && rank >= 2 ? def.range + 1 : def.range;

      if (!targetEnemy || dist > effectiveRange || !hasLineOfSight(nextZ, nextP.x, nextP.y, targetX, targetY)) {
        pushLog(`Select a visible enemy within range ${effectiveRange}.`, 'neutral');
        return;
      }

      if (skillId === 'cleave') {
        const prodigyMult = hasProdigy(nextP, 'carry_the_world') ? 1.25 : 1;
        const mainMult = (rank === 1 ? 1.35 : rank === 2 ? 1.55 : 1.8) * prodigyMult;
        const splashMult = (rank === 1 ? 0.75 : rank === 2 ? 0.95 : 1.2) * prodigyMult;
        const hit = calculatePlayerHit(nextP, targetEnemy, mainMult, false, false, 0, activeFlags);
        targetEnemy.hp -= hit.damage;
        if (rank >= 2) applyStatus(targetEnemy.statuses, 'bleed', rank, 4);
        soundEngine.playCrit();
        triggerShake(120);
        spawnHitFlash(targetEnemy.x, targetEnemy.y, 'white', 135);
        spawnBurst(targetEnemy.x, targetEnemy.y, '#EF4444', '⚔', 7);
        spawnFloating(targetEnemy.x, targetEnemy.y, `-${hit.damage}${hit.isCrit ? '!' : ''}`, '#F87171');
        applyEchoIfTriggered(targetEnemy);
        applyFlexibleFollowUp(targetEnemy);

        const deadList: Enemy[] = [];
        if (targetEnemy.hp <= 0) deadList.push(targetEnemy);

        for (const adj of nextZ.enemies) {
          if (adj.id === targetEnemy.id) continue;
          if (chebyshev(nextP.x, nextP.y, adj.x, adj.y) === 1) {
            const sp = calculatePlayerHit(nextP, adj, splashMult, false, false, 0, activeFlags);
            adj.hp -= sp.damage;
            spawnHitFlash(adj.x, adj.y, 'white', 120);
            spawnFloating(adj.x, adj.y, `-${sp.damage}`, '#FCA5A5');
            if (adj.hp <= 0) deadList.push(adj);
          }
        }
        for (const d of deadList) {
          const res = handleEnemyDeath(d, nextP, nextZ, activeFlags);
          nextP = res.nextPlayer;
          nextZ.enemies = res.nextZone.enemies;
          nextZ.loot = res.nextZone.loot;
          activeFlags = res.nextFlags;
          if (res.victoryTriggered) victoryTriggered = true;
        }
        pushLog(`Sundering Cleave strikes ${targetEnemy.name} for ${hit.damage}!`, 'combat');
      } else if (skillId === 'shield_bash') {
        const dStats = computeDerivedStats(nextP, activeFlags);
        const prodigyMult = hasProdigy(nextP, 'carry_the_world') ? 1.25 : 1;
        const atkMult = (rank === 1 ? 0.9 : rank === 2 ? 1.1 : 1.3) * prodigyMult;
        const defMult = (rank === 1 ? 1.0 : rank === 2 ? 1.3 : 1.6) * prodigyMult;
        const baseHit = calculatePlayerHit(nextP, targetEnemy, atkMult, false, false, 0, activeFlags);
        const bonus = Math.round(dStats.def * defMult);
        const total = baseHit.damage + bonus;
        targetEnemy.hp -= total;
        applyStatus(targetEnemy.statuses, 'stunned', rank === 3 ? 2 : 1, 1);
        targetEnemy.intent = undefined;
        if (rank >= 2) {
          applyStatus(nextP.statuses, 'shielded', rank === 3 ? 3 : 2, rank === 3 ? 6 : 4);
        }
        soundEngine.playHit();
        triggerShake(130);
        spawnHitFlash(targetEnemy.x, targetEnemy.y, 'white', 140);
        spawnFloating(targetEnemy.x, targetEnemy.y, `-${total} STUN`, '#FBBF24');
        applyEchoIfTriggered(targetEnemy);
        applyFlexibleFollowUp(targetEnemy);
        pushLog(`Bastion Bash stuns ${targetEnemy.name} for ${total} dmg!`, 'combat');
        if (targetEnemy.hp <= 0) {
          const res = handleEnemyDeath(targetEnemy, nextP, nextZ, activeFlags);
          nextP = res.nextPlayer;
          nextZ.enemies = res.nextZone.enemies;
          nextZ.loot = res.nextZone.loot;
          activeFlags = res.nextFlags;
          if (res.victoryTriggered) victoryTriggered = true;
        }
      } else if (skillId === 'venom_tip') {
        const mult = rank === 1 ? 0.95 : rank === 2 ? 1.15 : 1.35;
        const ignore = rank === 3 ? 0.5 : 0;
        const hit = calculatePlayerHit(nextP, targetEnemy, mult, false, false, ignore, activeFlags);
        const total = hit.damage + nextP.attributes.agility;
        targetEnemy.hp -= total;
        applyStatus(targetEnemy.statuses, 'poison', rank === 3 ? 4 : 3, rank === 1 ? 3 : rank === 2 ? 5 : 7);
        if (rank >= 2) applyStatus(targetEnemy.statuses, 'bleed', rank, 4);
        soundEngine.playHit();
        spawnProjectile(nextP.x, nextP.y, targetEnemy.x, targetEnemy.y, '#4EA885', '-', 190);
        spawnHitFlash(targetEnemy.x, targetEnemy.y, '#4EA885', 135);
        spawnBurst(targetEnemy.x, targetEnemy.y, '#4EA885', '➶', 5);
        spawnFloating(targetEnemy.x, targetEnemy.y, `-${total} POISON`, '#4EA885');
        applyEchoIfTriggered(targetEnemy);
        applyFlexibleFollowUp(targetEnemy);
        pushLog(`Viper Edge pierces ${targetEnemy.name} for ${total} dmg.`, 'combat');
        if (targetEnemy.hp <= 0) {
          const res = handleEnemyDeath(targetEnemy, nextP, nextZ, activeFlags);
          nextP = res.nextPlayer;
          nextZ.enemies = res.nextZone.enemies;
          nextZ.loot = res.nextZone.loot;
          activeFlags = res.nextFlags;
          if (res.victoryTriggered) victoryTriggered = true;
        }
      } else if (skillId === 'executioners_mark') {
        const markPct = rank === 1 ? 35 : rank === 2 ? 45 : 60;
        const mult = rank === 1 ? 1.1 : rank === 2 ? 1.4 : 1.7;
        applyStatus(targetEnemy.statuses, 'marked', rank === 3 ? 5 : 4, markPct);
        const hit = calculatePlayerHit(nextP, targetEnemy, mult, false, false, 0, activeFlags);
        targetEnemy.hp -= hit.damage;
        soundEngine.playCrit();
        spawnProjectile(nextP.x, nextP.y, targetEnemy.x, targetEnemy.y, '#C084FC', '⌖', 180);
        spawnHitFlash(targetEnemy.x, targetEnemy.y, 'white', 135);
        spawnBurst(targetEnemy.x, targetEnemy.y, '#C084FC', '⌖', 6);
        spawnFloating(targetEnemy.x, targetEnemy.y, `-${hit.damage} MARKED`, '#C084FC');
        applyEchoIfTriggered(targetEnemy);
        applyFlexibleFollowUp(targetEnemy);
        pushLog(`Marked ${targetEnemy.name} (+${markPct}% dmg taken) for ${hit.damage}!`, 'crit');
        if (targetEnemy.hp <= 0) {
          if (rank === 3) nextP.cooldowns.executioners_mark = 0;
          const res = handleEnemyDeath(targetEnemy, nextP, nextZ, activeFlags);
          nextP = res.nextPlayer;
          nextZ.enemies = res.nextZone.enemies;
          nextZ.loot = res.nextZone.loot;
          activeFlags = res.nextFlags;
          if (res.victoryTriggered) victoryTriggered = true;
        }
      } else if (skillId === 'ember_lance') {
        const mult = rank === 1 ? 1.3 : rank === 2 ? 1.6 : 1.95;
        const base = rank === 1 ? 14 : rank === 2 ? 18 : 22;
        const hit = calculatePlayerHit(nextP, targetEnemy, mult, true, false, 0, activeFlags);
        const total = base + hit.damage;
        targetEnemy.hp -= total;
        applyStatus(targetEnemy.statuses, 'burn', rank === 1 ? 2 : 3, rank === 1 ? 3 : rank === 2 ? 5 : 7);
        soundEngine.playEmber();
        spawnProjectile(nextP.x, nextP.y, targetEnemy.x, targetEnemy.y, '#FB923C', '*', 200);
        spawnHitFlash(targetEnemy.x, targetEnemy.y, '#FB923C', 150);
        spawnBurst(targetEnemy.x, targetEnemy.y, '#FB923C', '🜂', 8);
        spawnFloating(targetEnemy.x, targetEnemy.y, `-${total} EMBER`, '#FB923C');
        applyEchoIfTriggered(targetEnemy);

        const deadList: Enemy[] = [];
        if (targetEnemy.hp <= 0) deadList.push(targetEnemy);

        if (rank === 3) {
          for (const adj of nextZ.enemies) {
            if (adj.id === targetEnemy.id) continue;
            if (chebyshev(adj.x, adj.y, targetEnemy.x, targetEnemy.y) === 1) {
              const splash = Math.round(total * 0.6);
              adj.hp -= splash;
              applyStatus(adj.statuses, 'burn', 2, 5);
              spawnHitFlash(adj.x, adj.y, '#FB923C', 130);
              spawnFloating(adj.x, adj.y, `-${splash}`, '#FB923C');
              if (adj.hp <= 0) deadList.push(adj);
            }
          }
        }
        for (const d of deadList) {
          const res = handleEnemyDeath(d, nextP, nextZ, activeFlags);
          nextP = res.nextPlayer;
          nextZ.enemies = res.nextZone.enemies;
          nextZ.loot = res.nextZone.loot;
          activeFlags = res.nextFlags;
          if (res.victoryTriggered) victoryTriggered = true;
        }
        pushLog(`Ember Lance sears ${targetEnemy.name} for ${total} fire dmg!`, 'arcane');
      }

      setArmedSkill(null);
      setAimedTarget(null);
      if (victoryTriggered) {
        setPlayer(nextP);
        setZones((prev) => ({ ...prev, [nextZ.id]: nextZ }));
        setGameState('VICTORY');
        return;
      }
      runEnemyTurns(nextP, nextZ, activeFlags);
    },
    [
      currentZone,
      handleEnemyDeath,
      player,
      pushLog,
      runEnemyTurns,
      spawnBurst,
      spawnFloating,
      spawnHitFlash,
      spawnProjectile,
      triggerShake,
      worldFlags,
    ]
  );

  // Move / Bump-Attack / Interact Step
  const attemptStep = useCallback(
    (dx: number, dy: number) => {
      if (gameState !== 'PLAYING' || activePanel !== 'NONE' || specialPrompt) return;
      if (dx === 0 && dy === 0) {
        runEnemyTurns(player, currentZone, worldFlags);
        return;
      }

      const tx = player.x + dx;
      const ty = player.y + dy;
      if (tx < 0 || ty < 0 || tx >= currentZone.width || ty >= currentZone.height) return;

      // 1. NPC Bump -> Talk
      const npc = currentZone.npcs.find((n) => n.x === tx && n.y === ty);
      if (npc) {
        openNpcDialogue(npc.id);
        return;
      }

      // 2. Enemy Bump -> Basic Melee Strike
      const enemyIdx = currentZone.enemies.findIndex((e) => e.x === tx && e.y === ty);
      if (enemyIdx >= 0) {
        setAimedTarget(null);
        let activeFlags: WorldFlags = worldFlags;
        const nextZ: ZoneMap = {
          ...currentZone,
          enemies: currentZone.enemies.map((e) => ({ ...e, statuses: e.statuses.map((s) => ({ ...s })) })),
          loot: [...currentZone.loot],
        };
        const target = nextZ.enemies[enemyIdx];
        let nextP: PlayerState = {
          ...player,
          lastDirX: dx < 0 ? -1 : dx > 0 ? 1 : player.lastDirX,
        };
        const hit = calculatePlayerHit(nextP, target, 1, false, false, 0, activeFlags);
        target.hp -= hit.damage;
        nextP.firstStrikeReady = false;

        if (hit.lifestealHeal > 0) {
          nextP.hp = Math.min(computeDerivedStats(nextP, activeFlags).maxHp, nextP.hp + hit.lifestealHeal);
        }
        if (hit.isCrit && hasAffix(nextP, 'bleed_on_crit')) {
          applyStatus(target.statuses, 'bleed', 2, 4);
        }
        if (hasAffix(nextP, 'chill_on_hit') && Math.random() < 0.3) {
          applyStatus(target.statuses, 'chilled', 2, 1);
        }
        if (hit.isCrit && (nextP.skills.siphon_soul ?? 0) >= 3) {
          nextP.mana = Math.min(computeDerivedStats(nextP, activeFlags).maxMana, nextP.mana + 2);
        }

        spawnHitFlash(target.x, target.y, 'white', 130);
        if (hit.isCrit) {
          soundEngine.playCrit();
          triggerShake(110);
          spawnBurst(target.x, target.y, '#FBBF24', '*', 6);
          spawnFloating(target.x, target.y, `-${hit.damage} CRIT!`, '#FBBF24');
          pushLog(`Critical strike on ${target.name} for ${hit.damage} dmg!`, 'crit');
        } else {
          soundEngine.playHit();
          spawnBurst(target.x, target.y, '#ECE4D4', '·', 4);
          spawnFloating(target.x, target.y, `-${hit.damage}`, '#ECE4D4');
          pushLog(`You strike ${target.name} for ${hit.damage} dmg.`, 'combat');
        }

        if (hasProdigy(nextP, 'flexible_combat') && target.hp > 0 && Math.random() < 0.45) {
          const combo = calculatePlayerHit(nextP, target, 0.65, false, false, 0, activeFlags);
          target.hp -= combo.damage;
          spawnFloating(target.x, target.y, `-${combo.damage} COMBO`, '#FBBF24');
          pushLog(`Flexible Combat lands a follow-up strike for ${combo.damage}!`, 'crit');
        }

        if (target.hp <= 0) {
          const res = handleEnemyDeath(target, nextP, nextZ, activeFlags);
          nextP = res.nextPlayer;
          nextZ.enemies = res.nextZone.enemies;
          nextZ.loot = res.nextZone.loot;
          activeFlags = res.nextFlags;
          if (res.victoryTriggered) {
            setPlayer(nextP);
            setZones((prev) => ({ ...prev, [nextZ.id]: nextZ }));
            setGameState('VICTORY');
            return;
          }
        }

        runEnemyTurns(nextP, nextZ, activeFlags);
        return;
      }

      // Guard against diagonal corner-cutting past blocking walls
      if (dx !== 0 && dy !== 0) {
        if (!currentZone.tiles[player.y]?.[tx]?.walkable || !currentZone.tiles[ty]?.[player.x]?.walkable) {
          return;
        }
      }

      // 2b. Spirit Companion Swap if stepping onto active companion tile
      if (
        !currentZone.isTown &&
        player.companion &&
        player.companion.hp > 0 &&
        player.companion.respawnCooldown === 0 &&
        player.companion.x === tx &&
        player.companion.y === ty
      ) {
        soundEngine.playCompanion();
        let nextP: PlayerState = {
          ...player,
          x: tx,
          y: ty,
          lastDirX: dx < 0 ? -1 : dx > 0 ? 1 : player.lastDirX,
          companion: { ...player.companion, x: player.x, y: player.y },
        };
        const nextZ: ZoneMap = {
          ...currentZone,
          loot: [...currentZone.loot],
        };
        const swapLootIdx = nextZ.loot.findIndex((l) => l.x === tx && l.y === ty);
        if (swapLootIdx >= 0) {
          const drop = nextZ.loot[swapLootIdx];
          nextZ.loot.splice(swapLootIdx, 1);
          soundEngine.playLoot();
          if (drop.gold) {
            nextP.gold += drop.gold;
            spawnFloating(tx, ty, `+${drop.gold}g`, '#FBBF24');
            pushLog(`Picked up ${drop.gold} Gold.`, 'loot');
          }
          if (drop.item) {
            nextP = addItemToPlayer(nextP, drop.item);
            spawnFloating(tx, ty, drop.item.name, '#4EA885');
            pushLog(`Collected ${drop.item.name} (${drop.item.rarity}).`, 'loot');
          }
        }
        spawnFloating(tx, ty, 'SWAP', '#38BDF8');
        pushLog(`Swapped places with ${player.companion.name}.`, 'neutral');
        runEnemyTurns(nextP, nextZ, worldFlags);
        return;
      }

      // 3. Walkability Check (prompt Vault Doors before unsealing)
      const rawTile = currentZone.tiles[ty][tx];
      if (rawTile.kind === 'vault_door') {
        interactWithTile(tx, ty, player, currentZone);
        return;
      }
      if (!rawTile.walkable) return;

      soundEngine.playStep();
      let nextP: PlayerState = {
        ...player,
        x: tx,
        y: ty,
        lastDirX: dx < 0 ? -1 : dx > 0 ? 1 : player.lastDirX,
        statuses: player.statuses.map((s) => ({ ...s })),
      };
      const tile = { ...rawTile };
      const nextTiles = [...currentZone.tiles];
      nextTiles[ty] = [...currentZone.tiles[ty]];
      nextTiles[ty][tx] = tile;

      const nextZ: ZoneMap = {
        ...currentZone,
        tiles: nextTiles,
        loot: [...currentZone.loot],
      };

      // Pick up ground loot automatically
      const lootIdx = nextZ.loot.findIndex((l) => l.x === tx && l.y === ty);
      if (lootIdx >= 0) {
        const drop = nextZ.loot[lootIdx];
        nextZ.loot.splice(lootIdx, 1);
        soundEngine.playLoot();
        if (drop.gold) {
          nextP.gold += drop.gold;
          spawnFloating(tx, ty, `+${drop.gold}g`, '#FBBF24');
          pushLog(`Picked up ${drop.gold} Gold.`, 'loot');
        }
        if (drop.item) {
          nextP = addItemToPlayer(nextP, drop.item);
          spawnFloating(tx, ty, drop.item.name, '#4EA885');
          pushLog(`Collected ${drop.item.name} (${drop.item.rarity}).`, 'loot');
        }
      }

      // Check trap trigger vs Agility spot
      if (tile.kind === 'trap' && !tile.used) {
        if (nextP.attributes.agility >= 3 && !tile.revealed) {
          tile.revealed = true;
          tile.used = true;
          spawnFloating(tx, ty, 'DISARMED', '#4EA885');
          pushLog('Your agility spotted and disarmed a spike snare!', 'combat');
        } else {
          tile.revealed = true;
          tile.used = true;
          const trapDmg = 5 + nextZ.depth * 2;
          nextP.hp -= trapDmg;
          soundEngine.playTrap();
          triggerShake(130);
          spawnFloating(tx, ty, `-${trapDmg} TRAP`, '#EF4444');
          pushLog(`Stepped on a hidden snare for ${trapDmg} dmg!`, 'danger');
        }
      }

      // Phase 3: Venom Dart Snare — wall-mounted, harder to spot than a
      // floor snare (Agility 4+), and its darts carry venom.
      if (tile.kind === 'dart_trap' && !tile.used) {
        if (nextP.attributes.agility >= 4 && !tile.revealed) {
          tile.revealed = true;
          tile.used = true;
          spawnFloating(tx, ty, 'DISARMED', '#4EA885');
          pushLog('Your agility spotted the dart slits and jammed the Venom Dart Snare!', 'combat');
        } else {
          tile.revealed = true;
          tile.used = true;
          const dartDmg = 4 + nextZ.depth * 2;
          nextP.hp -= dartDmg;
          applyStatus(nextP.statuses, 'poison', 3, 3);
          soundEngine.playTrap();
          triggerShake(130);
          spawnFloating(tx, ty, `-${dartDmg} DART`, '#A3E635');
          pushLog(`Venom darts hiss from the wall for ${dartDmg} dmg and Poison (3t)!`, 'danger');
        }
      }

      // Check Biome Hazards (spore_pool, frost_vent, ember_crust, shock_rune)
      if (
        !tile.used &&
        (tile.kind === 'spore_pool' ||
          tile.kind === 'frost_vent' ||
          tile.kind === 'ember_crust' ||
          tile.kind === 'shock_rune')
      ) {
        tile.used = true;
        if (tile.kind === 'spore_pool') {
          if (nextP.attributes.agility >= 3) {
            nextP.glyphDust += 3;
            soundEngine.playLoot();
            spawnFloating(tx, ty, '+3 DUST', '#34D399');
            pushLog('Deftly skirted the spore pool and harvested +3 Glyph Dust.', 'loot');
          } else {
            const dmg = 3 + nextZ.depth;
            nextP.hp -= dmg;
            applyStatus(nextP.statuses, 'poison', 3, 3);
            soundEngine.playHazard();
            triggerShake(110);
            spawnBurst(tx, ty, '#34D399', '*', 5);
            spawnFloating(tx, ty, `-${dmg} SPORES`, '#34D399');
            pushLog(`Miasma spores burst for ${dmg} dmg and Poison (3t)!`, 'danger');
          }
        } else if (tile.kind === 'frost_vent') {
          if (nextP.attributes.agility >= 3 || nextP.attributes.resolve >= 3) {
            nextP.glyphDust += 3;
            soundEngine.playLoot();
            spawnFloating(tx, ty, '+3 DUST', '#60A5FA');
            pushLog('Navigated the rime vent cleanly and recovered +3 Glyph Dust.', 'loot');
          } else {
            const dmg = 3 + nextZ.depth;
            nextP.hp -= dmg;
            applyStatus(nextP.statuses, 'chilled', 2, 1);
            soundEngine.playHazard();
            triggerShake(110);
            spawnBurst(tx, ty, '#60A5FA', '❄', 5);
            spawnFloating(tx, ty, `-${dmg} RIME`, '#60A5FA');
            pushLog(`A frost vent erupts for ${dmg} dmg and Chilled (2t)!`, 'danger');
          }
        } else if (tile.kind === 'ember_crust') {
          if (nextP.attributes.resolve >= 3) {
            nextP.glyphDust += 4;
            soundEngine.playLoot();
            spawnFloating(tx, ty, '+4 DUST', '#FB923C');
            pushLog('Endured the ember crust and quenched +4 Glyph Dust.', 'loot');
          } else {
            const dmg = 4 + nextZ.depth;
            nextP.hp -= dmg;
            applyStatus(nextP.statuses, 'burn', 2, 3);
            soundEngine.playHazard();
            triggerShake(120);
            spawnBurst(tx, ty, '#FB923C', '🜂', 6);
            spawnFloating(tx, ty, `-${dmg} EMBER`, '#FB923C');
            pushLog(`Scorching ember crust deals ${dmg} dmg and Burn (2t)!`, 'danger');
          }
        } else if (tile.kind === 'shock_rune') {
          if (nextP.attributes.arcana >= 3) {
            const dStats = computeDerivedStats(nextP, worldFlags);
            nextP.mana = Math.min(dStats.maxMana, nextP.mana + 6);
            nextP.glyphDust += 4;
            soundEngine.playSpell();
            spawnFloating(tx, ty, '+6 MP +4 DUST', '#C084FC');
            pushLog('Your Arcana siphoned the shock rune (+6 Mana, +4 Glyph Dust)!', 'arcane');
          } else {
            const dmg = 4 + nextZ.depth;
            const drain = Math.min(nextP.mana, 4);
            nextP.hp -= dmg;
            nextP.mana -= drain;
            soundEngine.playHazard();
            triggerShake(125);
            spawnBurst(tx, ty, '#C084FC', '⚡', 6);
            spawnFloating(tx, ty, `-${dmg} SHOCK`, '#C084FC');
            pushLog(
              `Arcane shock rune discharges for ${dmg} dmg${drain > 0 ? ` and drains ${drain} Mana` : ''}!`,
              'danger'
            );
          }
        }
      }

      if (nextP.hp <= 0) {
        if (hasProdigy(nextP, 'cauterize') && (nextP.prodigyCooldowns?.cauterize ?? 0) <= 0) {
          const rescueStats = computeDerivedStats(nextP, worldFlags);
          nextP.hp = Math.max(8, Math.round(rescueStats.maxHp * 0.25));
          nextP.prodigyCooldowns = { ...(nextP.prodigyCooldowns ?? {}), cauterize: 25 };
          applyStatus(nextP.statuses, 'cauterized', 3, 1);
          applyStatus(nextP.statuses, 'shielded', 3, 10);
          soundEngine.playEmber();
          triggerShake(200);
          spawnBurst(nextP.x, nextP.y, '#FB923C', '🜂', 10);
          spawnFloating(nextP.x, nextP.y, 'CAUTERIZED!', '#FB923C');
          pushLog('CAUTERIZE PRODIGY: Sovereign flames seal your lethal wounds (25% HP restored)!', 'crit');
        } else {
          setPlayer(nextP);
          setZones((prev) => ({ ...prev, [nextZ.id]: nextZ }));
          if (!recordedFallenRef.current) {
            recordedFallenRef.current = true;
            recordRunChronicle('fallen', nextP, worldFlags);
          }
          setGameState('GAME_OVER');
          return;
        }
      }

      // Auto-trigger special interactables when stepped onto
      if (
        tile.kind === 'stairs_down' ||
        tile.kind === 'stairs_up' ||
        tile.kind === 'gate_city' ||
        tile.kind === 'chest' ||
        tile.kind === 'brazier' ||
        tile.kind === 'shrine' ||
        tile.kind === 'lore_tablet' ||
        tile.kind === 'contraband_cache' ||
        tile.kind === 'herb_node' ||
        tile.kind === 'whispering_bell' ||
        ((tile.kind === 'waystone' || tile.kind === 'forgotten_forge' || tile.kind === 'cursed_altar') &&
          !tile.used)
      ) {
        const didInteract = interactWithTile(tx, ty, nextP, nextZ);
        if (
          tile.kind === 'stairs_down' ||
          tile.kind === 'stairs_up' ||
          tile.kind === 'gate_city' ||
          tile.kind === 'shrine' ||
          tile.kind === 'lore_tablet' ||
          tile.kind === 'whispering_bell' ||
          tile.kind === 'waystone' ||
          tile.kind === 'forgotten_forge' ||
          tile.kind === 'cursed_altar'
        ) {
          return;
        }
        if (didInteract) return;
      }

      if ((nextP.hasteSteps ?? 0) > 0) {
        nextP.hasteSteps = (nextP.hasteSteps ?? 1) - 1;
        computeVisibility(nextZ, nextP.x, nextP.y, getSightRadius(nextP, worldFlags));
        setPlayer(nextP);
        setZones((prev) => ({ ...prev, [nextZ.id]: nextZ }));
        spawnFloating(tx, ty, 'HASTE', '#4EA885');
        return;
      }

      runEnemyTurns(nextP, nextZ, worldFlags);
    },
    [
      activePanel,
      addItemToPlayer,
      currentZone,
      gameState,
      handleEnemyDeath,
      interactWithTile,
      openNpcDialogue,
      player,
      pushLog,
      recordRunChronicle,
      runEnemyTurns,
      spawnBurst,
      spawnFloating,
      spawnHitFlash,
      specialPrompt,
      triggerShake,
      worldFlags,
    ]
  );

  // Target Selection Helpers for Keyboard / Mobile Skill Aiming
  const getInRangeEnemies = useCallback(
    (skillId: SkillId, p = player, z = currentZone): Enemy[] => {
      const def = SKILLS[skillId];
      if (!def || def.targeting === 'self') return [];
      const rank = p.skills[skillId] ?? 0;
      const effectiveRange =
        (skillId === 'ember_lance' || skillId === 'venom_tip') && rank >= 2
          ? def.range + 1
          : skillId === 'shadowstep'
            ? rank === 1
              ? 4
              : 5
            : def.range;

      return z.enemies
        .filter((e) => {
          const tile = z.tiles[e.y]?.[e.x];
          if (!tile?.visible) return false;
          if (chebyshev(p.x, p.y, e.x, e.y) > effectiveRange) return false;
          if (skillId === 'shadowstep') return false;
          return hasLineOfSight(z, p.x, p.y, e.x, e.y);
        })
        .sort(
          (a, b) =>
            chebyshev(p.x, p.y, a.x, a.y) - chebyshev(p.x, p.y, b.x, b.y) || a.hp - b.hp
        );
    },
    [currentZone, player]
  );

  // Trigger hotbar skill
  const handleTriggerHotbar = useCallback(
    (slotIdx: number) => {
      const skillId = player.hotbar[slotIdx];
      if (!skillId) return;
      const def = SKILLS[skillId];
      if ((player.skills[skillId] ?? 0) === 0) return;
      if ((player.cooldowns[skillId] ?? 0) > 0) {
        pushLog(`${def.name} is on cooldown (${player.cooldowns[skillId]}t).`, 'neutral');
        return;
      }
      if (player.mana < def.manaCost) {
        pushLog(`Not enough Mana for ${def.name}.`, 'danger');
        return;
      }
      if (def.targeting === 'self') {
        executeSkill(skillId, player.x, player.y);
        return;
      }
      soundEngine.playClick();
      setArmedInscriptionSlot(null);
      if (armedSkill === skillId) {
        setArmedSkill(null);
        setAimedTarget(null);
      } else {
        setArmedSkill(skillId);
        const candidates = getInRangeEnemies(skillId);
        setAimedTarget(candidates[0] ? { x: candidates[0].x, y: candidates[0].y } : null);
      }
    },
    [armedSkill, executeSkill, getInRangeEnemies, player, pushLog]
  );

  const handleCycleTarget = useCallback(() => {
    if (!armedSkill) return;
    const candidates = getInRangeEnemies(armedSkill);
    if (candidates.length === 0) {
      setAimedTarget(null);
      return;
    }
    const curIdx = aimedTarget
      ? candidates.findIndex((e) => e.x === aimedTarget.x && e.y === aimedTarget.y)
      : -1;
    const next = candidates[(curIdx + 1) % candidates.length];
    soundEngine.playClick();
    setAimedTarget({ x: next.x, y: next.y });
  }, [aimedTarget, armedSkill, getInRangeEnemies]);

  const handleConfirmAimedTarget = useCallback(() => {
    if (!armedSkill || !aimedTarget) return;
    executeSkill(armedSkill, aimedTarget.x, aimedTarget.y);
  }, [aimedTarget, armedSkill, executeSkill]);

  // Execute Inscription (Runes & Infusions)
  const executeInscription = useCallback(
    (slotIdx: number, targetX?: number, targetY?: number) => {
      const insc = (player.inscriptions ?? [null, null, null])[slotIdx];
      if (!insc || !insc.inscriptionKind) return;
      const cd = (player.inscriptionCooldowns ?? [0, 0, 0])[slotIdx] ?? 0;
      if (cd > 0) {
        pushLog(`${insc.name} is recharging (${cd}t).`, 'neutral');
        return;
      }

      let activeFlags: WorldFlags = worldFlags;
      let victoryTriggered = false;
      const kind = insc.inscriptionKind;
      const power = insc.inscriptionPower ?? INSCRIPTION_META[kind].basePower;
      const maxCd = insc.inscriptionCooldown ?? INSCRIPTION_META[kind].baseCd;
      const nextCds = [...(player.inscriptionCooldowns ?? [0, 0, 0])];
      nextCds[slotIdx] = maxCd;

      let nextP: PlayerState = {
        ...player,
        inscriptionCooldowns: nextCds,
        cooldowns: { ...player.cooldowns },
      };

      // Arcane Conduit reduces all other cooldowns when using a Rune
      if (insc.inscriptionCategory === 'rune' && hasProdigy(nextP, 'arcane_conduit')) {
        for (const k of Object.keys(nextP.cooldowns) as SkillId[]) {
          if ((nextP.cooldowns[k] ?? 0) > 0) {
            nextP.cooldowns[k] = Math.max(0, (nextP.cooldowns[k] ?? 0) - 1);
          }
        }
        nextP.inscriptionCooldowns = nextP.inscriptionCooldowns!.map((c, idx) =>
          idx === slotIdx ? c : Math.max(0, c - 1)
        );
      }

      const nextZ: ZoneMap = {
        ...currentZone,
        enemies: currentZone.enemies.map((e) => ({
          ...e,
          statuses: e.statuses.map((s) => ({ ...s })),
        })),
        loot: [...currentZone.loot],
      };
      const dStats = computeDerivedStats(nextP, activeFlags);

      if (kind === 'shielding_rune') {
        applyStatus(nextP.statuses, 'shielded', 4, power);
        soundEngine.playSpell();
        spawnBurst(nextP.x, nextP.y, '#60A5FA', '◊', 7);
        spawnFloating(nextP.x, nextP.y, `+${power} RUNE WARD`, '#60A5FA');
        pushLog(`Shielding Rune activates (+${power} DEF for 4 turns).`, 'arcane');
      } else if (kind === 'phase_door_rune') {
        const maxRange = Math.min(7, 5 + Math.floor(power / 6));
        if (targetX === undefined || targetY === undefined) return;
        const dist = chebyshev(nextP.x, nextP.y, targetX, targetY);
        const tile = nextZ.tiles[targetY]?.[targetX];
        const occupied = nextZ.enemies.some((e) => e.x === targetX && e.y === targetY);
        if (!tile?.walkable || !tile.visible || occupied || dist === 0 || dist > maxRange) {
          pushLog(`Choose an unoccupied visible tile within range ${maxRange}.`, 'neutral');
          return;
        }
        nextP.x = targetX;
        nextP.y = targetY;
        soundEngine.playSpell();
        spawnBurst(targetX, targetY, '#60A5FA', '◈', 8);
        spawnFloating(targetX, targetY, 'PHASED', '#60A5FA');
        pushLog('Phase Door Rune warps you across space!', 'arcane');
      } else if (kind === 'manasurge_rune') {
        nextP.mana = Math.min(dStats.maxMana, nextP.mana + power);
        soundEngine.playSpell();
        spawnBurst(nextP.x, nextP.y, '#60A5FA', '✦', 7);
        spawnFloating(nextP.x, nextP.y, `+${power} MP`, '#60A5FA');
        pushLog(`Manasurge Rune restores +${power} Mana!`, 'arcane');
      } else if (kind === 'biting_gale_rune') {
        const blastDmg = power + Math.round(dStats.spellPower * 0.6);
        soundEngine.playSpell();
        spawnBurst(nextP.x, nextP.y, '#93C5FD', '❄', 10);
        let hits = 0;
        const deadList: Enemy[] = [];
        for (const enemy of nextZ.enemies) {
          if (chebyshev(nextP.x, nextP.y, enemy.x, enemy.y) <= 2) {
            hits += 1;
            enemy.hp -= blastDmg;
            applyStatus(enemy.statuses, 'chilled', 3, 1);
            spawnHitFlash(enemy.x, enemy.y, '#93C5FD', 140);
            spawnFloating(enemy.x, enemy.y, `-${blastDmg} GALE`, '#93C5FD');
            if (enemy.hp <= 0) deadList.push(enemy);
          }
        }
        for (const d of deadList) {
          const res = handleEnemyDeath(d, nextP, nextZ, activeFlags);
          nextP = res.nextPlayer;
          nextZ.enemies = res.nextZone.enemies;
          nextZ.loot = res.nextZone.loot;
          activeFlags = res.nextFlags;
          if (res.victoryTriggered) victoryTriggered = true;
        }
        pushLog(
          hits > 0 ? `Biting Gale Rune chills ${hits} foe(s) for ${blastDmg} dmg!` : 'Biting Gale sweeps the stone.',
          'arcane'
        );
      } else if (kind === 'regeneration_infusion') {
        nextP.hp = Math.min(dStats.maxHp, nextP.hp + power);
        applyStatus(nextP.statuses, 'regen', 4, power);
        soundEngine.playHeal();
        spawnBurst(nextP.x, nextP.y, '#4EA885', '✿', 7);
        spawnFloating(nextP.x, nextP.y, `+${power} REGEN`, '#4EA885');
        pushLog(`Regeneration Infusion mends +${power} HP and +${power}/t (4t).`, 'loot');
      } else if (kind === 'wild_infusion') {
        nextP.statuses = nextP.statuses.filter(
          (s) => s.kind !== 'bleed' && s.kind !== 'burn' && s.kind !== 'poison' && s.kind !== 'chilled'
        );
        applyStatus(nextP.statuses, 'shielded', 3, power);
        soundEngine.playHeal();
        spawnBurst(nextP.x, nextP.y, '#4EA885', '♣', 7);
        spawnFloating(nextP.x, nextP.y, `CLEANSED +${power}`, '#4EA885');
        pushLog(`Wild Infusion purges ailments and grants +${power} DEF (3t).`, 'loot');
      } else if (kind === 'movement_infusion') {
        nextP.hasteSteps = (nextP.hasteSteps ?? 0) + 2;
        applyStatus(nextP.statuses, 'hasted', 2, 1);
        soundEngine.playSpell();
        spawnBurst(nextP.x, nextP.y, '#4EA885', '»', 6);
        spawnFloating(nextP.x, nextP.y, '2 FREE STEPS!', '#4EA885');
        pushLog('Movement Infusion activated: next 2 steps take 0 enemy turns!', 'arcane');
        setArmedInscriptionSlot(null);
        setAimedTarget(null);
        setPlayer(nextP);
        setZones((prev) => ({ ...prev, [nextZ.id]: nextZ }));
        return;
      } else if (kind === 'heroism_infusion') {
        const shieldDef = Math.max(4, Math.round(power * 0.6));
        nextP.hp = Math.min(dStats.maxHp, nextP.hp + power);
        applyStatus(nextP.statuses, 'shielded', 4, shieldDef);
        soundEngine.playHeal();
        spawnBurst(nextP.x, nextP.y, '#FBBF24', '★', 7);
        spawnFloating(nextP.x, nextP.y, `+${power} HP +${shieldDef} DEF`, '#FBBF24');
        pushLog(`Heroism Infusion bolsters +${power} HP and +${shieldDef} DEF (4t).`, 'combat');
      }

      setArmedInscriptionSlot(null);
      setAimedTarget(null);
      if (victoryTriggered) {
        setPlayer(nextP);
        setZones((prev) => ({ ...prev, [nextZ.id]: nextZ }));
        setGameState('VICTORY');
        return;
      }
      runEnemyTurns(nextP, nextZ, activeFlags);
    },
    [
      currentZone,
      handleEnemyDeath,
      player,
      pushLog,
      runEnemyTurns,
      spawnBurst,
      spawnFloating,
      spawnHitFlash,
      worldFlags,
    ]
  );

  const handleTriggerInscription = useCallback(
    (slotIdx: number) => {
      const insc = (player.inscriptions ?? [null, null, null])[slotIdx];
      if (!insc || !insc.inscriptionKind) return;
      const cd = (player.inscriptionCooldowns ?? [0, 0, 0])[slotIdx] ?? 0;
      if (cd > 0) {
        pushLog(`${insc.name} is recharging (${cd}t).`, 'neutral');
        return;
      }
      setArmedSkill(null);
      setAimedTarget(null);
      if (insc.inscriptionKind === 'phase_door_rune') {
        soundEngine.playClick();
        setArmedInscriptionSlot((prev) => (prev === slotIdx ? null : slotIdx));
        return;
      }
      executeInscription(slotIdx);
    },
    [executeInscription, player.inscriptionCooldowns, player.inscriptions, pushLog]
  );

  const handleSafeRest = useCallback(() => {
    if (gameState !== 'PLAYING' || activePanel !== 'NONE' || specialPrompt) return;
    setAutoExploring(false);
    const enemyNearby =
      !currentZone.isTown &&
      currentZone.enemies.some(
        (e) =>
          currentZone.tiles[e.y]?.[e.x]?.visible ||
          (e.alerted && chebyshev(e.x, e.y, player.x, player.y) <= 8)
      );
    if (enemyNearby) {
      pushLog('Cannot rest safely while enemies are nearby!', 'danger');
      return;
    }
    const hasHarmfulDot = player.statuses.some(
      (s) => s.kind === 'bleed' || s.kind === 'burn' || s.kind === 'poison'
    );
    if (hasHarmfulDot) {
      pushLog('Cannot safely rest while bleeding, burning, or poisoned!', 'danger');
      return;
    }

    const d = computeDerivedStats(player, worldFlags);
    const maxSkillCd = Math.max(0, ...Object.values(player.cooldowns).map((v) => v ?? 0));
    const maxInscCd = Math.max(0, ...(player.inscriptionCooldowns ?? [0, 0, 0]));
    const restTurns = Math.max(1, Math.min(12, Math.max(maxSkillCd, maxInscCd, 2)));

    const nextProdCds: Partial<Record<ProdigyId, number>> = {};
    for (const [k, v] of Object.entries(player.prodigyCooldowns ?? {})) {
      const rem = (v ?? 0) - restTurns;
      if (rem > 0) nextProdCds[k as ProdigyId] = rem;
    }

    const restedPlayer: PlayerState = {
      ...player,
      hp: d.maxHp,
      mana: d.maxMana,
      cooldowns: {},
      inscriptionCooldowns: [0, 0, 0],
      prodigyCooldowns: nextProdCds,
      statuses: [],
      hasteSteps: 0,
      firstStrikeReady: true,
      turnsElapsed: player.turnsElapsed + restTurns,
      companion: player.companion
        ? {
            ...player.companion,
            hp:
              player.companion.respawnCooldown > 0 && player.companion.respawnCooldown <= restTurns
                ? player.companion.maxHp
                : player.companion.hp > 0
                  ? player.companion.maxHp
                  : 0,
            respawnCooldown: Math.max(0, player.companion.respawnCooldown - restTurns),
          }
        : undefined,
    };
    soundEngine.playHeal();
    spawnBurst(player.x, player.y, '#4EA885', '✦', 6);
    spawnFloating(player.x, player.y, 'RESTED', '#4EA885');
    const cauterizeRem = nextProdCds.cauterize ?? 0;
    pushLog(
      `Rested safely (${restTurns}t): HP, Mana, Skills, and Inscriptions restored.${
        cauterizeRem > 0 ? ` (Cauterize cooldown: ${cauterizeRem}t)` : ''
      }`,
      'arcane',
      restedPlayer.turnsElapsed
    );
    tutorialRestedRef.current = true;
    setPlayer(restedPlayer);
  }, [activePanel, currentZone, gameState, player, pushLog, spawnBurst, spawnFloating, specialPrompt, worldFlags]);

  const handleToggleAutoExplore = useCallback(() => {
    if (gameState !== 'PLAYING' || activePanel !== 'NONE' || specialPrompt) return;
    if (autoExploring) {
      setAutoExploring(false);
      return;
    }
    const visibleEnemy =
      !currentZone.isTown &&
      currentZone.enemies.some((e) => currentZone.tiles[e.y]?.[e.x]?.visible);
    if (visibleEnemy) {
      pushLog('Enemy sighted—cannot Auto-Explore in combat!', 'danger');
      return;
    }
    soundEngine.playClick();
    setArmedSkill(null);
    setArmedInscriptionSlot(null);
    setAimedTarget(null);
    setAutoExploring(true);
  }, [activePanel, autoExploring, currentZone, gameState, pushLog, specialPrompt]);

  // Use quick healing draught or any consumable
  const handleUseConsumable = useCallback(
    (itemId: string) => {
      const idx = player.inventory.findIndex((i) => i.id === itemId);
      if (idx < 0) return;
      const item = player.inventory[idx];
      if (item.category !== 'consumable' || !item.consumableKind) return;

      const nextInv = [...player.inventory];
      if ((item.quantity ?? 1) > 1) {
        nextInv[idx] = { ...item, quantity: (item.quantity ?? 1) - 1 };
      } else {
        nextInv.splice(idx, 1);
      }

      const d = computeDerivedStats(player, worldFlags);
      const apothecaryBonusHp = (worldFlags.townUpgrades?.apothecary ?? 0) >= 1 ? 10 : 0;
      const apothecaryBonusMp = (worldFlags.townUpgrades?.apothecary ?? 0) >= 1 ? 6 : 0;
      let nextP = { ...player, inventory: nextInv };
      const nextZ = { ...currentZone, enemies: currentZone.enemies.map((e) => ({ ...e })) };

      if (item.consumableKind === 'heal_potion') {
        const amt =
          Math.max(worldFlags.miraPotionTier > 1 ? 38 : 24, Math.round(d.maxHp * 0.35)) +
          apothecaryBonusHp;
        nextP.hp = Math.min(d.maxHp, nextP.hp + amt);
        soundEngine.playHeal();
        spawnFloating(nextP.x, nextP.y, `+${amt} HP`, '#4EA885');
        pushLog(`Drank Crimson Draught (+${amt} HP).`, 'loot');
      } else if (item.consumableKind === 'mana_potion') {
        const mpAmt = Math.max(16, Math.round(d.maxMana * 0.4)) + apothecaryBonusMp;
        nextP.mana = Math.min(d.maxMana, nextP.mana + mpAmt);
        soundEngine.playSpell();
        spawnFloating(nextP.x, nextP.y, `+${mpAmt} MP`, '#60A5FA');
        pushLog(`Drank Aether Vial (+${mpAmt} MP).`, 'arcane');
      } else if (item.consumableKind === 'ward_talisman') {
        applyStatus(nextP.statuses, 'shielded', 4, 7);
        soundEngine.playSpell();
        spawnFloating(nextP.x, nextP.y, '+7 WARD', '#F59E0B');
        pushLog('Activated Warden Charm (+7 DEF, 4t).', 'combat');
      } else if (item.consumableKind === 'scroll_blink') {
        const candidates: Array<{ x: number; y: number }> = [];
        for (let y = 1; y < nextZ.height - 1; y++) {
          for (let x = 1; x < nextZ.width - 1; x++) {
            const dist = chebyshev(x, y, nextP.x, nextP.y);
            if (
              dist >= 3 &&
              dist <= 7 &&
              nextZ.tiles[y][x].walkable &&
              !nextZ.enemies.some((e) => e.x === x && e.y === y)
            ) {
              candidates.push({ x, y });
            }
          }
        }
        if (candidates.length > 0) {
          const dest = candidates[Math.floor(Math.random() * candidates.length)];
          nextP.x = dest.x;
          nextP.y = dest.y;
          computeVisibility(nextZ, nextP.x, nextP.y, getSightRadius(nextP, worldFlags));
          soundEngine.playSpell();
          spawnBurst(dest.x, dest.y, '#60A5FA', '?', 6);
          pushLog('Phased to a safer stone tile!', 'arcane');
        }
      } else if (item.consumableKind === 'throwing_knife') {
        const visibleEnemy = nextZ.enemies
          .filter((e) => nextZ.tiles[e.y]?.[e.x]?.visible)
          .sort((a, b) => manhattan(a.x, a.y, nextP.x, nextP.y) - manhattan(b.x, b.y, nextP.x, nextP.y))[0];
        if (!visibleEnemy) {
          pushLog('No visible enemy to throw a Serrated Dart at.', 'neutral');
          return;
        }
        visibleEnemy.hp -= 14;
        applyStatus(visibleEnemy.statuses, 'bleed', 3, 3);
        soundEngine.playHit();
        spawnProjectile(nextP.x, nextP.y, visibleEnemy.x, visibleEnemy.y, '#E2E8F0', '-', 170);
        spawnHitFlash(visibleEnemy.x, visibleEnemy.y, 'white', 130);
        spawnFloating(visibleEnemy.x, visibleEnemy.y, '-14 DART', '#ECE4D4');
        pushLog(`Serrated Dart hits ${visibleEnemy.name} for 14 dmg + Bleed.`, 'combat');
        if (visibleEnemy.hp <= 0) {
          const res = handleEnemyDeath(visibleEnemy, nextP, nextZ, worldFlags);
          nextP = res.nextPlayer;
          nextZ.enemies = res.nextZone.enemies;
          nextZ.loot = res.nextZone.loot;
          if (res.victoryTriggered) {
            setPlayer(nextP);
            setZones((prev) => ({ ...prev, [nextZ.id]: nextZ }));
            setGameState('VICTORY');
            return;
          }
        }
      }

      setPlayer(nextP);
      setZones((prev) => ({ ...prev, [nextZ.id]: nextZ }));
    },
    [currentZone, handleEnemyDeath, player, pushLog, spawnBurst, spawnFloating, spawnHitFlash, spawnProjectile, worldFlags]
  );

  const handleQuickHeal = useCallback(() => {
    const pot = player.inventory.find((i) => i.consumableKind === 'heal_potion');
    if (pot) handleUseConsumable(pot.id);
    else pushLog('No Crimson Draughts remaining.', 'neutral');
  }, [handleUseConsumable, player.inventory, pushLog]);

  // Canvas Click Handler
  const handleTileClick = useCallback(
    (tx: number, ty: number) => {
      if (gameState !== 'PLAYING' || activePanel !== 'NONE' || specialPrompt) return;
      setAutoExploring(false);

      if (armedInscriptionSlot !== null) {
        executeInscription(armedInscriptionSlot, tx, ty);
        return;
      }

      if (armedSkill) {
        executeSkill(armedSkill, tx, ty);
        return;
      }

      if (tx === player.x && ty === player.y) {
        interactWithTile(tx, ty, player, currentZone);
        return;
      }

      const dist = chebyshev(player.x, player.y, tx, ty);
      if (dist === 1) {
        attemptStep(tx - player.x, ty - player.y);
        return;
      }

      // Step 1 tile along shortest path toward clicked tile
      const nextStep = findPathNextStep(currentZone, player.x, player.y, tx, ty);
      if (nextStep) {
        attemptStep(nextStep.x - player.x, nextStep.y - player.y);
      }
    },
    [
      activePanel,
      armedInscriptionSlot,
      armedSkill,
      attemptStep,
      currentZone,
      executeInscription,
      executeSkill,
      gameState,
      interactWithTile,
      player,
      specialPrompt,
    ]
  );

  // Dialogue Choice Processor
  const handleSelectDialogueChoice = useCallback(
    (choice: DialogueChoice) => {
      if (!activeDialogue) return;
      soundEngine.playQuill();

      let resolvedNextNode = choice.nextNodeId;
      if (choice.check) {
        const pass = player.attributes[choice.check.attribute] >= choice.check.threshold;
        if (!pass) {
          resolvedNextNode = choice.failNodeId ?? choice.nextNodeId;
          if (resolvedNextNode) {
            setActiveDialogue({ npcId: activeDialogue.npcId, nodeId: resolvedNextNode });
          }
          return;
        }
      }

      const actions = [
        ...(choice.action ? [choice.action] : []),
        ...(choice.extraActions ?? []),
      ];

      let nextP = { ...player };
      let nextFlags: WorldFlags = { ...worldFlags };
      let flagsChanged = false;
      let shouldClose = false;
      let openUpgrades = false;
      let nextMerchant: string | null = null;

      for (const act of actions) {
        if (act.type === 'close_dialogue') {
          shouldClose = true;
        } else if (act.type === 'open_merchant') {
          nextMerchant = act.merchantId;
          shouldClose = true;
        } else if (act.type === 'open_upgrades') {
          openUpgrades = true;
          shouldClose = true;
        } else if (act.type === 'switch_companion') {
          const nextKind: CompanionKind =
            nextP.companion?.kind === 'starlight_owl' ? 'silverwind_lynx' : 'starlight_owl';
          const fresh = makeCompanion(
            nextKind,
            nextP.companion?.x ?? Math.max(1, nextP.x - 1),
            nextP.companion?.y ?? nextP.y,
            nextP.level
          );
          if (nextP.companion?.stance) {
            fresh.stance = nextP.companion.stance;
          }
          nextP.companion = fresh;
          const d = computeDerivedStats(nextP, nextFlags);
          nextP.maxHp = d.maxHp;
          nextP.maxMana = d.maxMana;
          soundEngine.playCompanion();
          pushLog(
            `Spirit Companion bonded: ${fresh.name} (${
              fresh.kind === 'starlight_owl' ? '+1 Sight Radius & Arcane Bolts' : 'Swift Melee Pounce'
            }).`,
            'quest'
          );
        } else if (act.type === 'heal_full') {
          const d = computeDerivedStats(nextP, nextFlags);
          nextP.hp = d.maxHp;
          nextP.mana = d.maxMana;
          nextP.statuses = [];
          soundEngine.playHeal();
        } else if (act.type === 'give_gold') {
          nextP.gold += act.amount;
        } else if (act.type === 'spend_gold') {
          nextP.gold = Math.max(0, nextP.gold - act.amount);
        } else if (act.type === 'consume_quest_item') {
          nextP.inventory = nextP.inventory.filter((i) => i.questTag !== act.tag);
        } else if (act.type === 'unlock_highspire') {
          nextFlags = { ...nextFlags, citadelAccess: true };
          flagsChanged = true;
          pushLog('Citadel Access unlocked! Walk through Oakhaven’s West Gate (Ω) or Travel [M].', 'quest');
        } else if (act.type === 'set_flag') {
          nextFlags = { ...nextFlags, [act.flag]: act.value };
          flagsChanged = true;
        } else if (act.type === 'grant_buff') {
          if (act.hpBonus) {
            nextP.bonusHp = (nextP.bonusHp ?? 0) + act.hpBonus;
            const d = computeDerivedStats(nextP, nextFlags);
            nextP.maxHp = d.maxHp;
            nextP.hp = Math.min(d.maxHp, nextP.hp + act.hpBonus);
          }
          pushLog(act.text, 'arcane');
        } else if (act.type === 'respec_skills') {
          if (nextP.gold >= act.cost) {
            nextP.gold -= act.cost;
            const preset = getStarterPreset(nextP.starterClass);
            const refunded = computeRespecPoints(nextP.level, nextFlags, quests);
            nextP = {
              ...nextP,
              attributes: { ...preset.attributes },
              skills: {},
              hotbar: [null, null, null, null, null],
              attributePoints: refunded.attributePoints,
              skillPoints: refunded.skillPoints,
            };
            const d = computeDerivedStats(nextP, nextFlags);
            nextP.maxHp = d.maxHp;
            nextP.hp = d.maxHp;
            nextP.maxMana = d.maxMana;
            nextP.mana = d.maxMana;
            soundEngine.playLevelUp();
          }
        } else if (act.type === 'start_quest') {
          setQuests((prev) => ({
            ...prev,
            [act.questId]: {
              id: act.questId,
              status: 'active',
              // Phase 3: the survey quest counts steles already transcribed
              // before it was accepted, so prior reading is never wasted.
              stage:
                act.questId === 'deep_survey'
                  ? Math.max(1, Math.min(6, nextFlags.readLoreIds.length))
                  : 1,
              history: [act.log],
            },
          }));
          pushLog(`Quest Started: ${QUEST_DEFS[act.questId]?.title ?? act.questId}`, 'quest');
        } else if (act.type === 'advance_quest') {
          setQuests((prev) => {
            const cur = prev[act.questId];
            if (!cur) return prev;
            return {
              ...prev,
              [act.questId]: { ...cur, stage: act.stage, history: [...cur.history, act.log] },
            };
          });
        } else if (act.type === 'complete_quest') {
          // Phase 7: a completion pays exactly once. Dialogue gating
          // already hides the turn-in after a quest completes; this guard
          // makes the handler itself refuse a second payout (e.g. a
          // same-frame double submit re-running on a stale closure).
          if (
            questRewardGuardRef.current.has(act.questId) ||
            quests[act.questId]?.status === 'completed'
          ) {
            // Already paid — no rewards, no duplicate completion entry.
          } else {
            questRewardGuardRef.current.add(act.questId);
            setQuests((prev) => {
              const cur = prev[act.questId];
              return {
                ...prev,
                [act.questId]: {
                  id: act.questId,
                  status: 'completed',
                  stage: 3,
                  outcomeLabel: act.outcomeLabel,
                  history: [...(cur?.history ?? []), act.log],
                },
              };
            });
            if (act.rewardGold) nextP.gold += act.rewardGold;
            if (act.rewardSkillPoint) nextP.skillPoints += act.rewardSkillPoint;
            if (act.rewardAttrPoint) nextP.attributePoints += act.rewardAttrPoint;
            if (act.rewardItemTag) {
              const relic = createNamedRelic(act.rewardItemTag);
              nextP = addItemToPlayer(nextP, relic);
              pushLog(`Received ${relic.name}!`, 'loot');
            }
            if (act.rewardXp) {
              const xpRes = grantXpAndCheckLevel(nextP, act.rewardXp, nextFlags);
              nextP = xpRes.nextPlayer;
            }
            soundEngine.playLevelUp();
            pushLog(`Quest Completed: ${QUEST_DEFS[act.questId]?.title ?? act.questId}`, 'quest');
          }
        }
      }

      if (flagsChanged) {
        const featRes = evaluateFeatsAndApply(nextP, nextFlags, nextP.turnsElapsed);
        nextP = featRes.nextPlayer;
        nextFlags = featRes.nextFlags;
        setWorldFlags(nextFlags);
      }
      setPlayer(nextP);

      if (openUpgrades) {
        setActiveDialogue(null);
        setActivePanel('UPGRADES');
        return;
      }
      if (nextMerchant) {
        setActiveDialogue(null);
        setActiveMerchantId(nextMerchant);
        setActivePanel('MERCHANT');
        return;
      }
      if (shouldClose || !resolvedNextNode) {
        setActiveDialogue(null);
        setActivePanel('NONE');
        return;
      }
      setActiveDialogue({ npcId: activeDialogue.npcId, nodeId: resolvedNextNode });
    },
    [activeDialogue, addItemToPlayer, evaluateFeatsAndApply, grantXpAndCheckLevel, player, pushLog, worldFlags]
  );

  // Auto-Explore background stepper
  useEffect(() => {
    if (!autoExploring || gameState !== 'PLAYING' || activePanel !== 'NONE' || specialPrompt) return;

    const timer = window.setTimeout(() => {
      const visibleEnemy =
        !currentZone.isTown &&
        currentZone.enemies.some((e) => currentZone.tiles[e.y]?.[e.x]?.visible);
      if (visibleEnemy) {
        setAutoExploring(false);
        pushLog('Auto-Explore paused: Enemy sighted!', 'danger');
        return;
      }
      if (player.hp < derived.maxHp * 0.35) {
        setAutoExploring(false);
        pushLog('Auto-Explore paused: Low Health!', 'danger');
        return;
      }
      if (player.statuses.some((s) => s.kind === 'bleed' || s.kind === 'burn' || s.kind === 'poison')) {
        setAutoExploring(false);
        pushLog('Auto-Explore paused: Afflicted by status damage.', 'danger');
        return;
      }
      let adjacentVault = false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (currentZone.tiles[player.y + dy]?.[player.x + dx]?.kind === 'vault_door') {
            adjacentVault = true;
          }
        }
      }
      if (adjacentVault) {
        setAutoExploring(false);
        pushLog('Auto-Explore paused: Sealed Treasure Vault Door spotted!', 'quest');
        return;
      }

      const target = findAutoExploreTarget(currentZone, player.x, player.y);
      if (!target.nextStep) {
        setAutoExploring(false);
        pushLog('Floor exploration complete.', 'quest');
        return;
      }
      attemptStep(target.nextStep.x - player.x, target.nextStep.y - player.y);
    }, 95);

    return () => window.clearTimeout(timer);
  }, [activePanel, attemptStep, autoExploring, currentZone, derived.maxHp, gameState, player.hp, player.statuses, player.x, player.y, pushLog, specialPrompt]);

  const handleInteractAction = useCallback(
    (allowWaitFallback: boolean) => {
      setAutoExploring(false);
      const adjNpc = currentZone.npcs.find((n) => chebyshev(n.x, n.y, player.x, player.y) <= 1);
      if (adjNpc) {
        openNpcDialogue(adjNpc.id);
        return;
      }
      if (interactWithTile(player.x, player.y, player, currentZone)) {
        return;
      }
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (interactWithTile(player.x + dx, player.y + dy, player, currentZone)) {
            return;
          }
        }
      }
      if (allowWaitFallback) {
        attemptStep(0, 0);
      }
    },
    [attemptStep, currentZone, interactWithTile, openNpcDialogue, player]
  );

  const handleCycleCompanionStance = useCallback(() => {
    if (!player.companion) return;
    const order: CompanionState['stance'][] = ['aggressive', 'guard', 'recall'];
    const curIdx = order.indexOf(player.companion.stance);
    const nextStance = order[(curIdx + 1) % order.length];
    soundEngine.playCompanion();
    setPlayer((prev) =>
      prev.companion ? { ...prev, companion: { ...prev.companion, stance: nextStance } } : prev
    );
    pushLog(
      `${player.companion.name} stance set to ${nextStance.toUpperCase()}.`,
      'quest'
    );
  }, [player.companion, pushLog]);

  // Global Keyboard Shortcuts
  const stateKeysRef = useRef({
    gameState,
    activePanel,
    armedSkill,
    armedInscriptionSlot,
    aimedTarget,
    autoExploring,
    specialPrompt,
    showHallOfFame,
    activeSlot,
    keymap: settings.keymap,
    cameraYawIndex,
    attemptStep,
    handleCameraYawChange,
    handleTriggerHotbar,
    handleTriggerInscription,
    handleQuickHeal,
    handleToggleAutoExplore,
    handleSafeRest,
    handleInteractAction,
    handleCycleTarget,
    handleConfirmAimedTarget,
  });

  useEffect(() => {
    stateKeysRef.current = {
      gameState,
      activePanel,
      armedSkill,
      armedInscriptionSlot,
      aimedTarget,
      autoExploring,
      specialPrompt,
      showHallOfFame,
      activeSlot,
      keymap: settings.keymap,
      cameraYawIndex,
      attemptStep,
      handleCameraYawChange,
      handleTriggerHotbar,
      handleTriggerInscription,
      handleQuickHeal,
      handleToggleAutoExplore,
      handleSafeRest,
      handleInteractAction,
      handleCycleTarget,
      handleConfirmAimedTarget,
    };
  }, [
    gameState,
    activePanel,
    armedSkill,
    armedInscriptionSlot,
    aimedTarget,
    autoExploring,
    specialPrompt,
    showHallOfFame,
    activeSlot,
    settings.keymap,
    cameraYawIndex,
    attemptStep,
    handleCameraYawChange,
    handleTriggerHotbar,
    handleTriggerInscription,
    handleQuickHeal,
    handleToggleAutoExplore,
    handleSafeRest,
    handleInteractAction,
    handleCycleTarget,
    handleConfirmAimedTarget,
  ]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const s = stateKeysRef.current;
      const activeTag = document.activeElement?.tagName;
      const isButtonFocused = activeTag === 'BUTTON' || activeTag === 'A';

      if (s.showHallOfFame) {
        if (e.key === 'Escape' || (!isButtonFocused && (e.key === 'Enter' || e.key === ' '))) {
          e.preventDefault();
          setShowHallOfFame(false);
        }
        return;
      }

      if (s.gameState === 'TITLE_MENU') {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        if (s.autoExploring) {
          setAutoExploring(false);
          return;
        }
        if (s.specialPrompt) {
          setSpecialPrompt(null);
          return;
        }
        if (s.activePanel !== 'NONE') {
          setActivePanel('NONE');
          setActiveDialogue(null);
          setActiveMerchantId(null);
          return;
        }
        if (s.armedSkill) {
          setArmedSkill(null);
          setAimedTarget(null);
          return;
        }
        if (s.armedInscriptionSlot !== null) {
          setArmedInscriptionSlot(null);
          setAimedTarget(null);
          return;
        }
        setGameState((cur) => (cur === 'PLAYING' ? 'PAUSED' : cur === 'PAUSED' ? 'PLAYING' : cur));
        return;
      }

      if (
        s.gameState === 'PLAYING' &&
        !s.specialPrompt &&
        (s.activePanel === 'LEGEND' || s.activePanel === 'QUESTS' || s.activePanel === 'UPGRADES') &&
        !isButtonFocused &&
        (e.key === 'Enter' || e.key === ' ')
      ) {
        e.preventDefault();
        setActivePanel('NONE');
        return;
      }

      if (s.gameState !== 'PLAYING' || s.activePanel !== 'NONE' || s.specialPrompt || s.showHallOfFame) return;

      if (e.key === 'Tab' && s.armedSkill) {
        e.preventDefault();
        s.handleCycleTarget();
        return;
      }

      // Number-row skills/runes stay fixed (never remappable).
      if (['1', '2', '3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        setAutoExploring(false);
        s.handleTriggerHotbar(Number(e.key) - 1);
        return;
      }
      if (['6', '7', '8'].includes(e.key)) {
        e.preventDefault();
        setAutoExploring(false);
        s.handleTriggerInscription(Number(e.key) - 6);
        return;
      }

      if (e.key === '[') {
        e.preventDefault();
        s.handleCameraYawChange(normalizeYawIndex(s.cameraYawIndex - 1));
        return;
      }
      if (e.key === ']') {
        e.preventDefault();
        s.handleCameraYawChange(normalizeYawIndex(s.cameraYawIndex + 1));
        return;
      }

      // Phase 4: every remappable single-key action routes through the
      // keymap resolver (game/settings.ts). Arrow keys always move and
      // Enter always interacts via the resolver's hardcoded fallbacks.
      const action = resolveKeyAction(s.keymap, e.key);
      if (!action) return;
      switch (action) {
        case 'moveUp': {
          e.preventDefault();
          setAutoExploring(false);
          const [rx, ry] = rotateStepByYaw(0, -1, s.cameraYawIndex);
          s.attemptStep(rx, ry);
          break;
        }
        case 'moveDown': {
          e.preventDefault();
          setAutoExploring(false);
          const [rx, ry] = rotateStepByYaw(0, 1, s.cameraYawIndex);
          s.attemptStep(rx, ry);
          break;
        }
        case 'moveLeft': {
          e.preventDefault();
          setAutoExploring(false);
          const [rx, ry] = rotateStepByYaw(-1, 0, s.cameraYawIndex);
          s.attemptStep(rx, ry);
          break;
        }
        case 'moveRight': {
          e.preventDefault();
          setAutoExploring(false);
          const [rx, ry] = rotateStepByYaw(1, 0, s.cameraYawIndex);
          s.attemptStep(rx, ry);
          break;
        }
        case 'wait':
          e.preventDefault();
          setAutoExploring(false);
          s.attemptStep(0, 0);
          break;
        case 'explore':
          e.preventDefault();
          s.handleToggleAutoExplore();
          break;
        case 'rest':
          e.preventDefault();
          s.handleSafeRest();
          break;
        case 'quickHeal':
          e.preventDefault();
          s.handleQuickHeal();
          break;
        case 'skills':
          e.preventDefault();
          setAutoExploring(false);
          setActivePanel('SKILLS');
          break;
        case 'inventory':
          e.preventDefault();
          setAutoExploring(false);
          setActivePanel('INVENTORY');
          break;
        case 'journal':
          e.preventDefault();
          setAutoExploring(false);
          setActivePanel('QUESTS');
          break;
        case 'map':
          e.preventDefault();
          setAutoExploring(false);
          setActivePanel('TRAVEL');
          break;
        case 'guide':
          e.preventDefault();
          setAutoExploring(false);
          setActivePanel('LEGEND');
          break;
        case 'interact':
          // Matches the pre-P4 behaviour: Space/Enter only interact when a
          // button isn't focused (so keyboard users can still activate
          // focused UI buttons natively).
          if (isButtonFocused) return;
          e.preventDefault();
          if (s.armedSkill && s.aimedTarget) {
            s.handleConfirmAimedTarget();
          } else {
            s.handleInteractAction(false);
          }
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // ------------------------------------------------ Phase 6: gamepad
  // Polling lives here; the mapping + repeat logic is the pure
  // game/gamepad.ts poller. Actions dispatch through the same handlers
  // and the same gating as the keyboard path above. A pad press can
  // never reach the Settings key-capture (it listens for keydown only),
  // and while Settings is open the pad may only back out of it.
  const [gamepadConnected, setGamepadConnected] = useState(false);

  useEffect(() => {
    const poller = new GamepadPoller();

    const dispatchPadAction = (action: GamepadAction) => {
      const s = stateKeysRef.current;
      const activeTag = document.activeElement?.tagName;
      // Never fire while a form field has focus (mirrors keyboard UX).
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;
      if (showSettings) {
        if (action === 'cancel') setShowSettings(false);
        return;
      }
      if (s.showHallOfFame) {
        if (action === 'cancel' || action === 'interact') setShowHallOfFame(false);
        return;
      }
      if (s.gameState === 'TITLE_MENU') return;

      if (action === 'cancel') {
        // Mirror the keyboard Escape cascade, step for step.
        if (s.autoExploring) {
          setAutoExploring(false);
          return;
        }
        if (s.specialPrompt) {
          setSpecialPrompt(null);
          return;
        }
        if (s.activePanel !== 'NONE') {
          setActivePanel('NONE');
          setActiveDialogue(null);
          setActiveMerchantId(null);
          return;
        }
        if (s.armedSkill) {
          setArmedSkill(null);
          setAimedTarget(null);
          return;
        }
        if (s.armedInscriptionSlot !== null) {
          setArmedInscriptionSlot(null);
          setAimedTarget(null);
          return;
        }
        setGameState((cur) => (cur === 'PLAYING' ? 'PAUSED' : cur === 'PAUSED' ? 'PLAYING' : cur));
        return;
      }

      if (action === 'pause') {
        // Start only toggles pause; closing panels/prompts is B's job.
        if (!s.specialPrompt && s.activePanel === 'NONE' && !s.armedSkill && s.armedInscriptionSlot === null) {
          setGameState((cur) => (cur === 'PLAYING' ? 'PAUSED' : cur === 'PAUSED' ? 'PLAYING' : cur));
        }
        return;
      }

      if (s.gameState !== 'PLAYING' || s.activePanel !== 'NONE' || s.specialPrompt || s.showHallOfFame) return;

      switch (action) {
        case 'moveUp': {
          setAutoExploring(false);
          const [rx, ry] = rotateStepByYaw(0, -1, s.cameraYawIndex);
          s.attemptStep(rx, ry);
          break;
        }
        case 'moveDown': {
          setAutoExploring(false);
          const [rx, ry] = rotateStepByYaw(0, 1, s.cameraYawIndex);
          s.attemptStep(rx, ry);
          break;
        }
        case 'moveLeft': {
          setAutoExploring(false);
          const [rx, ry] = rotateStepByYaw(-1, 0, s.cameraYawIndex);
          s.attemptStep(rx, ry);
          break;
        }
        case 'moveRight': {
          setAutoExploring(false);
          const [rx, ry] = rotateStepByYaw(1, 0, s.cameraYawIndex);
          s.attemptStep(rx, ry);
          break;
        }
        case 'interact': {
          // Same focus rule as the keyboard: a focused button keeps its
          // native activation instead of triggering a world interaction.
          const tag = document.activeElement?.tagName;
          if (tag === 'BUTTON' || tag === 'A') return;
          if (s.armedSkill && s.aimedTarget) {
            s.handleConfirmAimedTarget();
          } else {
            s.handleInteractAction(false);
          }
          break;
        }
        case 'map':
          setAutoExploring(false);
          setActivePanel('TRAVEL');
          break;
        case 'journal':
          setAutoExploring(false);
          setActivePanel('QUESTS');
          break;
        case 'cycleTarget':
          if (s.armedSkill) s.handleCycleTarget();
          break;
        case 'explore':
          s.handleToggleAutoExplore();
          break;
      }
    };

    let raf = 0;
    const loop = () => {
      raf = window.requestAnimationFrame(loop);
      if (!navigator.getGamepads) return;
      let pad: Gamepad | null = null;
      for (const candidate of navigator.getGamepads()) {
        if (candidate && candidate.connected) {
          pad = candidate;
          break;
        }
      }
      if (!pad) return;
      const actions = poller.poll({ buttons: pad.buttons, axes: pad.axes }, performance.now());
      for (const action of actions) dispatchPadAction(action);
    };
    raf = window.requestAnimationFrame(loop);

    const anyPadConnected = () =>
      Boolean(navigator.getGamepads) &&
      [...navigator.getGamepads()].some((p) => p && p.connected);
    const onConnect = () => setGamepadConnected(true);
    const onDisconnect = () => {
      poller.reset();
      setGamepadConnected(anyPadConnected());
    };
    window.addEventListener('gamepadconnected', onConnect);
    window.addEventListener('gamepaddisconnected', onDisconnect);
    // A pad connected before this effect mounted never re-fires the event.
    if (anyPadConnected()) setGamepadConnected(true);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('gamepadconnected', onConnect);
      window.removeEventListener('gamepaddisconnected', onDisconnect);
    };
  }, [showSettings]);

  // Inventory & Progression Handlers
  const handleSpendAttribute = (attr: AttributeKey) => {
    if (player.attributePoints <= 0) return;
    soundEngine.playClick();
    setPlayer((prev) => {
      const next: PlayerState = {
        ...prev,
        attributePoints: prev.attributePoints - 1,
        attributes: { ...prev.attributes, [attr]: prev.attributes[attr] + 1 },
      };
      const d = computeDerivedStats(next, worldFlags);
      next.maxHp = d.maxHp;
      next.maxMana = d.maxMana;
      next.hp = Math.min(d.maxHp, next.hp + 5);
      next.mana = Math.min(d.maxMana, next.mana + 4);
      return next;
    });
  };

  const handleLearnSkill = (skillId: SkillId) => {
    const check = canLearnSkill(player, skillId);
    if (!check.ok) return;
    soundEngine.playLevelUp();
    setPlayer((prev) => {
      const nextRank = (prev.skills[skillId] ?? 0) + 1;
      const nextHotbar = [...prev.hotbar];
      if (SKILLS[skillId].kind === 'active' && !nextHotbar.includes(skillId)) {
        const emptyIdx = nextHotbar.indexOf(null);
        if (emptyIdx >= 0) nextHotbar[emptyIdx] = skillId;
      }
      return {
        ...prev,
        skillPoints: prev.skillPoints - 1,
        skills: { ...prev.skills, [skillId]: nextRank },
        hotbar: nextHotbar,
      };
    });
  };

  const handleAssignHotbar = (skillId: SkillId, slotIdx: number) => {
    soundEngine.playClick();
    setPlayer((prev) => {
      const next = prev.hotbar.map((id) => (id === skillId ? null : id));
      next[slotIdx] = skillId;
      return { ...prev, hotbar: next };
    });
  };

  const handleClaimProdigy = (prodigyId: ProdigyId) => {
    const check = canLearnProdigy(player, prodigyId);
    if (!check.ok) return;
    soundEngine.playLevelUp();
    setPlayer((prev) => {
      const next: PlayerState = {
        ...prev,
        prodigyPoints: Math.max(0, (prev.prodigyPoints ?? 0) - 1),
        prodigies: [...(prev.prodigies ?? []), prodigyId],
      };
      const d = computeDerivedStats(next, worldFlags);
      const hpDiff = Math.max(0, d.maxHp - prev.maxHp);
      next.maxHp = d.maxHp;
      next.maxMana = d.maxMana;
      next.hp = Math.min(d.maxHp, next.hp + hpDiff);
      return next;
    });
    pushLog(`Claimed Milestone Prodigy: ${PRODIGIES[prodigyId].name}!`, 'arcane');
  };

  const handleEquipInscription = (itemId: string, slotIdx: number) => {
    const item = player.inventory.find((i) => i.id === itemId && i.category === 'inscription');
    if (!item || slotIdx < 0 || slotIdx > 2) return;
    soundEngine.playSpell();
    setPlayer((prev) => {
      const curInscriptions = [...(prev.inscriptions ?? [null, null, null])];
      const curCds = [...(prev.inscriptionCooldowns ?? [0, 0, 0])];
      const prevSlotted = curInscriptions[slotIdx];
      const nextInv = prev.inventory.filter((i) => i.id !== itemId);
      if (prevSlotted) nextInv.push(prevSlotted);
      curInscriptions[slotIdx] = item;
      curCds[slotIdx] = Math.max(curCds[slotIdx] ?? 0, 3);
      return {
        ...prev,
        inscriptions: curInscriptions,
        inscriptionCooldowns: curCds,
        inventory: nextInv,
      };
    });
    pushLog(`Engraved ${item.name} into Inscription Slot [${slotIdx + 6}] (3t attunement).`, 'arcane');
  };

  const handleEquipItem = (itemId: string) => {
    const item = player.inventory.find((i) => i.id === itemId);
    if (!item || !item.slot) return;
    soundEngine.playClick();
    const slot = item.slot;
    const prevEquipped = player.equipped[slot];
    const nextInv = player.inventory.filter((i) => i.id !== itemId);
    if (prevEquipped) nextInv.push(prevEquipped);
    let next: PlayerState = {
      ...player,
      equipped: { ...player.equipped, [slot]: item },
      inventory: nextInv,
    };
    const d = computeDerivedStats(next, worldFlags);
    next.maxHp = d.maxHp;
    next.maxMana = d.maxMana;
    next.hp = Math.min(next.hp, d.maxHp);
    next.mana = Math.min(next.mana, d.maxMana);
    const featRes = evaluateFeatsAndApply(next, worldFlags, next.turnsElapsed);
    next = featRes.nextPlayer;
    if (featRes.nextFlags !== worldFlags) {
      setWorldFlags(featRes.nextFlags);
    }
    setPlayer(next);
  };

  const handleUnequipItem = (slot: ItemSlot) => {
    const equippedItem = player.equipped[slot];
    if (!equippedItem) return;
    if (player.inventory.length >= 28) {
      pushLog('Pack is full (28/28) — salvage or sell an item before unequipping.', 'danger');
      return;
    }
    soundEngine.playClick();
    setPlayer((prev) => {
      const target = prev.equipped[slot];
      if (!target) return prev;
      const nextEquipped = { ...prev.equipped };
      delete nextEquipped[slot];
      const next: PlayerState = {
        ...prev,
        equipped: nextEquipped,
        inventory: [...prev.inventory, target],
      };
      const d = computeDerivedStats(next, worldFlags);
      next.maxHp = d.maxHp;
      next.maxMana = d.maxMana;
      next.hp = Math.min(next.hp, d.maxHp);
      next.mana = Math.min(next.mana, d.maxMana);
      return next;
    });
    pushLog(`Unequipped ${equippedItem.name}.`, 'neutral');
  };

  const handleSalvageItem = (itemId: string) => {
    const item = player.inventory.find((i) => i.id === itemId);
    if (!item || item.category !== 'equipment') return;
    const dust = getSalvageDustYield(item);
    soundEngine.playClick();
    setPlayer((prev) => ({
      ...prev,
      glyphDust: prev.glyphDust + dust,
      inventory: prev.inventory.filter((i) => i.id !== itemId),
    }));
    pushLog(`Salvaged ${item.name} into +${dust} Glyph Dust.`, 'loot');
  };

  const handleSalvageCommon = () => {
    const commons = player.inventory.filter((i) => i.category === 'equipment' && i.rarity === 'Common');
    if (commons.length === 0) return;
    const totalDust = commons.reduce((sum, item) => sum + getSalvageDustYield(item), 0);
    const ids = new Set(commons.map((i) => i.id));
    soundEngine.playClick();
    setPlayer((prev) => ({
      ...prev,
      glyphDust: prev.glyphDust + totalDust,
      inventory: prev.inventory.filter((i) => !ids.has(i.id)),
    }));
    pushLog(`Salvaged ${commons.length} Common gear piece${commons.length === 1 ? '' : 's'} into +${totalDust} Glyph Dust.`, 'loot');
  };

  const handleBuyItem = (itemId: string) => {
    if (!activeMerchantId) return;
    const stock = merchantStocks[activeMerchantId] ?? [];
    const item = stock.find((i) => i.id === itemId);
    if (!item || player.gold < item.value) return;
    soundEngine.playLoot();
    setPlayer((prev) => addItemToPlayer({ ...prev, gold: prev.gold - item.value }, { ...item }));
    setMerchantStocks((prev) => ({
      ...prev,
      [activeMerchantId]: stock.filter((i) => i.id !== itemId),
    }));
    pushLog(`Purchased ${item.name} for ${item.value}g.`, 'loot');
  };

  const handleSellItem = (itemId: string) => {
    const item = player.inventory.find((i) => i.id === itemId);
    if (!item || item.category === 'quest') return;
    const sellPrice = Math.max(4, Math.round(item.value * 0.55));
    soundEngine.playLoot();
    setPlayer((prev) => {
      const idx = prev.inventory.findIndex((i) => i.id === itemId);
      if (idx < 0) return prev;
      const cur = prev.inventory[idx];
      // Phase 7: a stacked consumable sells ONE unit at the shown price
      // (previously the whole stack was removed for a single payout).
      const nextInv = [...prev.inventory];
      if ((cur.quantity ?? 1) > 1) {
        nextInv[idx] = { ...cur, quantity: (cur.quantity ?? 1) - 1 };
      } else {
        nextInv.splice(idx, 1);
      }
      return { ...prev, gold: prev.gold + sellPrice, inventory: nextInv };
    });
    pushLog(`Sold ${item.name} for +${sellPrice}g.`, 'loot');
  };

  const handleUpgradeItem = (itemId: string, isEquipped: boolean) => {
    const target = isEquipped
      ? Object.values(player.equipped).find((i) => i?.id === itemId)
      : player.inventory.find((i) => i.id === itemId);
    const smithyLv = worldFlags.townUpgrades?.smithy ?? 0;
    const maxUpgrade = smithyLv >= 2 ? 4 : 3;
    if (!target || target.upgradeLevel >= maxUpgrade) return;
    const discount = smithyLv >= 1 ? 0.75 : 1;
    const goldCost = Math.max(8, Math.round((25 + target.upgradeLevel * 25) * discount));
    const dustCost = Math.max(3, Math.round((8 + target.upgradeLevel * 8) * discount));
    if (player.gold < goldCost || player.glyphDust < dustCost) return;

    const upgraded = upgradeEquipmentItem(target);
    soundEngine.playLevelUp();
    setPlayer((prev) => {
      const next: PlayerState = {
        ...prev,
        gold: prev.gold - goldCost,
        glyphDust: prev.glyphDust - dustCost,
      };
      if (isEquipped && target.slot) {
        next.equipped = { ...prev.equipped, [target.slot]: upgraded };
      } else {
        next.inventory = prev.inventory.map((i) => (i.id === itemId ? upgraded : i));
      }
      const d = computeDerivedStats(next, worldFlags);
      next.maxHp = d.maxHp;
      next.maxMana = d.maxMana;
      next.hp = Math.min(next.hp, d.maxHp);
      next.mana = Math.min(next.mana, d.maxMana);
      return next;
    });
    pushLog(`Tempered ${upgraded.name}!`, 'arcane');
  };

  const handleEnchantItem = (itemId: string, isEquipped: boolean, runeId: RuneEnchantId) => {
    const target = isEquipped
      ? Object.values(player.equipped).find((i) => i?.id === itemId)
      : player.inventory.find((i) => i.id === itemId);
    if (!target || target.category !== 'equipment') return;
    if (target.runeEnchant?.id === runeId) return;

    const smithyLv = worldFlags.townUpgrades?.smithy ?? 0;
    const discount = smithyLv >= 1 ? 0.75 : 1;
    const goldCost = Math.max(10, Math.round(30 * discount));
    const dustCost = Math.max(4, Math.round(10 * discount));
    if (player.gold < goldCost || player.glyphDust < dustCost) return;

    const enchanted = enchantEquipmentItem(target, runeId);
    soundEngine.playRuneforge();

    let next: PlayerState = {
      ...player,
      gold: player.gold - goldCost,
      glyphDust: player.glyphDust - dustCost,
    };
    if (isEquipped && target.slot) {
      next.equipped = { ...player.equipped, [target.slot]: enchanted };
    } else {
      next.inventory = player.inventory.map((i) => (i.id === itemId ? enchanted : i));
    }
    const d = computeDerivedStats(next, worldFlags);
    next.maxHp = d.maxHp;
    next.maxMana = d.maxMana;
    next.hp = Math.min(next.hp, d.maxHp);
    next.mana = Math.min(next.mana, d.maxMana);
    const featRes = evaluateFeatsAndApply(next, worldFlags, next.turnsElapsed);
    next = featRes.nextPlayer;
    if (featRes.nextFlags !== worldFlags) {
      setWorldFlags(featRes.nextFlags);
    }
    setPlayer(next);
    pushLog(`Etched ${RUNE_ENCHANTS[runeId].label} onto ${enchanted.name}.`, 'arcane');
  };

  const handleRerollAffix = (itemId: string, isEquipped: boolean) => {
    const target = isEquipped
      ? Object.values(player.equipped).find((i) => i?.id === itemId)
      : player.inventory.find((i) => i.id === itemId);
    if (!target || target.category !== 'equipment') return;
    if (target.rarity !== 'Rare' && target.rarity !== 'Epic' && target.rarity !== 'Relic') return;

    const smithyLv = worldFlags.townUpgrades?.smithy ?? 0;
    const discount = smithyLv >= 1 ? 0.75 : 1;
    const goldCost = Math.max(10, Math.round(25 * discount));
    const dustCost = Math.max(4, Math.round(8 * discount));
    if (player.gold < goldCost || player.glyphDust < dustCost) return;

    const reforged = rerollEquipmentAffix(target);
    soundEngine.playRuneforge();
    setPlayer((prev) => {
      const next: PlayerState = {
        ...prev,
        gold: prev.gold - goldCost,
        glyphDust: prev.glyphDust - dustCost,
      };
      if (isEquipped && target.slot) {
        next.equipped = { ...prev.equipped, [target.slot]: reforged };
      } else {
        next.inventory = prev.inventory.map((i) => (i.id === itemId ? reforged : i));
      }
      return next;
    });
    pushLog(`Reforged ${reforged.name}: ${reforged.affixLabel}`, 'arcane');
  };

  const handlePurchaseUpgrade = (upgradeId: 'apothecary' | 'smithy' | 'watchtower') => {
    const def = TOWN_UPGRADE_DEFS.find((d) => d.id === upgradeId);
    if (!def) return;
    const currentUpgrades = worldFlags.townUpgrades ?? {
      apothecary: 0,
      smithy: 0,
      watchtower: 0,
    };
    const curLv = currentUpgrades[upgradeId] ?? 0;
    if (curLv >= def.maxLevel) return;
    const spec = def.levels[curLv];
    if (!spec || player.gold < spec.gold || player.glyphDust < spec.dust) return;

    soundEngine.playLevelUp();
    let nextP: PlayerState = {
      ...player,
      gold: player.gold - spec.gold,
      glyphDust: player.glyphDust - spec.dust,
    };
    let nextFlags: WorldFlags = {
      ...worldFlags,
      townUpgrades: {
        ...currentUpgrades,
        [upgradeId]: curLv + 1,
      },
    };
    const featRes = evaluateFeatsAndApply(nextP, nextFlags, nextP.turnsElapsed);
    nextP = featRes.nextPlayer;
    nextFlags = featRes.nextFlags;
    setWorldFlags(nextFlags);
    setPlayer(nextP);
    pushLog(`${def.name} upgraded to Tier ${curLv + 1}!`, 'quest');
  };

  if (gameState === 'TITLE_MENU') {
    const localSummaries: Partial<Record<SaveSlotId, LocalSlotSummary>> = {};
    for (const s of SAVE_SLOTS) {
      if (localSlotMap[s]) localSummaries[s] = localSlotMap[s]!.summary;
    }
    const cloudSummaries: Partial<Record<SaveSlotId, CloudSaveSummary>> = {};
    for (const s of SAVE_SLOTS) {
      if (cloudSlotMap[s]) cloudSummaries[s] = cloudSlotMap[s]!.summary;
    }

    return (
      <>
        <TitleScreen
          activeSlot={activeSlot}
          onSelectSlot={setActiveSlot}
          localSlots={localSummaries}
          cloudSlots={cloudSummaries}
          slotIssues={slotIssues}
          chronicleCount={mergedChronicles.length}
          authUser={authUser}
          authBusy={authBusy}
          authError={authError}
          onSignIn={handleSignInGoogle}
          onSignOut={handleSignOutGoogle}
          onStartNew={handleStartNew}
          onContinueLocal={handleContinueSaved}
          onContinueCloud={handleContinueCloud}
          onDeleteSlot={handleDeleteSlot}
          onOpenHallOfFame={() => setShowHallOfFame(true)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenCredits={() => setShowCredits(true)}
          blockKeys={showHallOfFame}
          gamepadConnected={gamepadConnected}
        />
        {showHallOfFame && (
          <HallOfFameModal
            entries={mergedChronicles}
            isSignedIn={Boolean(authUser)}
            lifetime={lifetime}
            onClose={() => setShowHallOfFame(false)}
          />
        )}
        {showSettings && (
          <SettingsModal
            settings={settings}
            tileSize={tileSize}
            onSettingsChange={updateSettings}
            onTileSizeChange={handleTileSizeChange}
            onClose={() => setShowSettings(false)}
          />
        )}
        {showCredits && <CreditsScreen onClose={() => setShowCredits(false)} />}
      </>
    );
  }

  const inCombatDanger =
    !currentZone.isTown &&
    currentZone.enemies.some((e) => e.alerted && chebyshev(e.x, e.y, player.x, player.y) <= 7);

  const activeNpc = activeDialogue ? NPCS[activeDialogue.npcId] : null;
  const activeNode = activeNpc && activeDialogue ? activeNpc.nodes[activeDialogue.nodeId] : null;
  const activeMerchantNpc = activeMerchantId ? NPCS[activeMerchantId] : null;

  const armedInsc =
    armedInscriptionSlot !== null
      ? (player.inscriptions ?? [null, null, null])[armedInscriptionSlot]
      : null;
  const armedInscriptionRange =
    armedInsc?.inscriptionKind === 'phase_door_rune'
      ? Math.min(7, 5 + Math.floor((armedInsc.inscriptionPower ?? 6) / 6))
      : null;

  return (
    <div className="w-screen h-[100dvh] overflow-hidden bg-[#090B10] text-[#ECE4D4] flex flex-col">
      <TopHud
        zone={currentZone}
        player={player}
        derived={derived}
        muted={muted}
        onToggleMute={() => {
          const next = !settings.muted;
          updateSettings({ muted: next });
          if (!next) soundEngine.playClick();
        }}
        onOpenPanel={(p) => {
          soundEngine.playClick();
          setArmedSkill(null);
          setArmedInscriptionSlot(null);
          setAimedTarget(null);
          setAutoExploring(false);
          setActivePanel(p);
        }}
        onPause={() => {
          soundEngine.playClick();
          setAutoExploring(false);
          setGameState('PAUSED');
        }}
      />

      {/* Main Playfield Canvas */}
      <main className="relative flex-1 min-h-0">
        <IsometricCanvas
          zone={currentZone}
          player={player}
          armedSkill={armedSkill}
          armedInscriptionRange={armedInscriptionRange}
          aimedTarget={aimedTarget}
          floatingEffects={floatingEffects}
          particles={particles}
          projectiles={projectiles}
          hitFlashes={hitFlashes}
          shakeUntil={shakeUntil}
          tileSize={tileSize}
          patternSignals={settings.patternSignals}
          cameraYawIndex={cameraYawIndex}
          onCameraYawChange={handleCameraYawChange}
          onTileSizeChange={handleTileSizeChange}
          onTileClick={handleTileClick}
          onStep={(dx, dy) => {
            setAutoExploring(false);
            attemptStep(dx, dy);
          }}
          onCancelTargeting={() => {
            setArmedSkill(null);
            setArmedInscriptionSlot(null);
            setAimedTarget(null);
          }}
        />

        {/* Phase 2: pinned quest objectives (same derivation as the Journal) */}
        {gameState === 'PLAYING' && (
          <QuestTracker
            quests={quests}
            worldFlags={worldFlags}
            hidden={Boolean(activeDialogue || specialPrompt)}
          />
        )}

        {/* Subtle Non-Blocking Status Badges in Top-Left */}
        {player.statuses.length > 0 && (
          <div className="pointer-events-none absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 max-w-[55vw] sm:max-w-[75vw]">
            {player.statuses.map((st, idx) => (
              <div
                key={idx}
                className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border border-amber-400/35 bg-[#0E1219]/90 text-[10px] sm:text-[11px] font-mono-glyph text-amber-200"
              >
                {st.kind.toUpperCase()} ({st.turns}t)
              </div>
            ))}
          </div>
        )}

        {/* Non-Blocking Zone Arrival Context Banner */}
        {zoneBanner && !armedSkill && armedInscriptionRange === null && !specialPrompt && (
          <button
            type="button"
            onClick={() => setZoneBanner(null)}
            aria-label="Dismiss zone briefing"
            className="absolute top-12 md:top-3 left-1/2 -translate-x-1/2 z-20 w-[min(92vw,440px)] text-left px-3.5 py-2.5 rounded-lg border border-amber-400/40 bg-[#0D111A]/92 backdrop-blur-sm shadow-2xl cursor-pointer transition-opacity hover:border-amber-300/60"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="font-display text-sm sm:text-base font-bold text-amber-200 tracking-wide">
                    {zoneBanner.name}
                  </span>
                  <span className="text-[11px] font-mono-glyph text-slate-400">
                    {zoneBanner.subtitle} · {zoneBanner.recommended}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 leading-snug">
                  {zoneBanner.lore}
                </p>
                <p className="text-[11px] text-amber-300/90 mt-1 leading-snug">
                  {zoneBanner.tactical}
                </p>
              </div>
              <X className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
            </div>
          </button>
        )}

        {/* Phase 6: one-time coach-mark toast (same banner idiom as the
            zone briefing; stacks below it when both are up) */}
        {coachToast && (
          <button
            type="button"
            onClick={() => setCoachToast(null)}
            aria-label="Dismiss hint"
            className={`absolute ${
              zoneBanner ? 'top-36 md:top-32' : 'top-12 md:top-3'
            } left-1/2 -translate-x-1/2 z-30 w-[min(92vw,440px)] text-left px-3.5 py-2.5 rounded-lg border border-sky-400/40 bg-[#0D111A]/92 backdrop-blur-sm shadow-2xl cursor-pointer transition-opacity hover:border-sky-300/60`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-display text-sm sm:text-base font-bold text-sky-200 tracking-wide">
                  {coachToast.title}
                </div>
                <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 leading-snug">
                  {coachToast.body}
                </p>
              </div>
              <X className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
            </div>
          </button>
        )}

        {/* Mobile Touch Pad Toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            stopDpadHold();
            setShowMobilePad((v) => !v);
          }}
          aria-label="Toggle touch movement pad"
          className={`md:hidden absolute bottom-2.5 left-2.5 z-20 min-h-[44px] px-3 py-1.5 rounded border text-[11px] font-mono-glyph flex items-center gap-1.5 shadow-lg cursor-pointer ${
            showMobilePad
              ? 'border-amber-400/50 bg-[#0D121A]/90 text-amber-200'
              : 'border-white/15 bg-[#0D121A]/85 text-slate-300'
          }`}
        >
          <Gamepad2 className="w-3.5 h-3.5" />
          <span>{showMobilePad ? 'Hide Pad' : 'D-Pad'}</span>
        </button>

        {/* Mobile D-Pad + Interact/Act Overlay (supports tap & press-and-hold) */}
        {showMobilePad && (
          <div className="md:hidden absolute bottom-2.5 right-2.5 z-20 grid grid-cols-3 gap-1 p-1.5 rounded-lg border border-white/15 bg-[#0B0F17]/88 shadow-xl backdrop-blur-xs select-none touch-none">
            <div />
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.blur();
                startDpadHold(0, -1);
              }}
              onPointerUp={stopDpadHold}
              onPointerCancel={stopDpadHold}
              onPointerLeave={stopDpadHold}
              aria-label="Move North"
              className="w-11 h-11 rounded border border-white/15 bg-[#161D2B] active:bg-amber-500 active:text-[#0B0D12] flex items-center justify-center text-[#ECE4D4] cursor-pointer touch-none"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
            <div />

            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.blur();
                startDpadHold(-1, 0);
              }}
              onPointerUp={stopDpadHold}
              onPointerCancel={stopDpadHold}
              onPointerLeave={stopDpadHold}
              aria-label="Move West"
              className="w-11 h-11 rounded border border-white/15 bg-[#161D2B] active:bg-amber-500 active:text-[#0B0D12] flex items-center justify-center text-[#ECE4D4] cursor-pointer touch-none"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                handleInteractAction(true);
              }}
              aria-label="Interact or Wait 1 Turn"
              className="w-11 h-11 rounded border border-amber-400/45 bg-amber-500/20 active:bg-amber-500 active:text-[#0B0D12] flex flex-col items-center justify-center text-amber-200 cursor-pointer"
            >
              <CornerDownLeft className="w-4 h-4" />
              <span className="text-[9px] font-mono-glyph font-bold leading-none mt-0.5">ACT</span>
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.blur();
                startDpadHold(1, 0);
              }}
              onPointerUp={stopDpadHold}
              onPointerCancel={stopDpadHold}
              onPointerLeave={stopDpadHold}
              aria-label="Move East"
              className="w-11 h-11 rounded border border-white/15 bg-[#161D2B] active:bg-amber-500 active:text-[#0B0D12] flex items-center justify-center text-[#ECE4D4] cursor-pointer touch-none"
            >
              <ArrowRight className="w-5 h-5" />
            </button>

            <div />
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.blur();
                startDpadHold(0, 1);
              }}
              onPointerUp={stopDpadHold}
              onPointerCancel={stopDpadHold}
              onPointerLeave={stopDpadHold}
              aria-label="Move South"
              className="w-11 h-11 rounded border border-white/15 bg-[#161D2B] active:bg-amber-500 active:text-[#0B0D12] flex items-center justify-center text-[#ECE4D4] cursor-pointer touch-none"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
            <div />
          </div>
        )}

        {/* Phase 2: first-run tutorial coach-mark (non-blocking) */}
        {tutorialStepIdx !== null &&
          gameState === 'PLAYING' &&
          activePanel === 'NONE' &&
          !activeDialogue &&
          !specialPrompt &&
          TUTORIAL_STEPS[tutorialStepIdx] && (
            <TutorialOverlay
              step={TUTORIAL_STEPS[tutorialStepIdx]}
              stepIndex={tutorialStepIdx}
              totalSteps={TUTORIAL_STEPS.length}
              onNext={advanceTutorial}
              onSkip={finishTutorial}
            />
          )}
      </main>

      <ActionDock
        player={player}
        armedSkill={armedSkill}
        armedInscriptionSlot={armedInscriptionSlot}
        autoExploring={autoExploring}
        canCycleTarget={Boolean(armedSkill && getInRangeEnemies(armedSkill).length > 1)}
        hasAimedTarget={Boolean(aimedTarget)}
        logs={logs}
        onTriggerHotbar={handleTriggerHotbar}
        onTriggerInscription={handleTriggerInscription}
        onQuickHeal={handleQuickHeal}
        onToggleAutoExplore={handleToggleAutoExplore}
        onSafeRest={handleSafeRest}
        onWaitTurn={() => attemptStep(0, 0)}
        onCycleTarget={handleCycleTarget}
        onConfirmAimedTarget={handleConfirmAimedTarget}
        onCycleCompanionStance={handleCycleCompanionStance}
      />

      {/* Modals */}
      {activePanel === 'SKILLS' && (
        <CharacterSkillsModal
          player={player}
          worldFlags={worldFlags}
          onSpendAttribute={handleSpendAttribute}
          onLearnSkill={handleLearnSkill}
          onAssignHotbar={handleAssignHotbar}
          onClaimProdigy={handleClaimProdigy}
          onClose={() => setActivePanel('NONE')}
        />
      )}

      {activePanel === 'INVENTORY' && (
        <InventoryModal
          player={player}
          derived={derived}
          onEquipItem={handleEquipItem}
          onUnequipItem={handleUnequipItem}
          onEquipInscription={handleEquipInscription}
          onUseConsumable={handleUseConsumable}
          onSalvageItem={handleSalvageItem}
          onSalvageCommon={handleSalvageCommon}
          onClose={() => setActivePanel('NONE')}
        />
      )}

      {activePanel === 'DIALOGUE' && activeNpc && activeNode && (
        <DialogueModal
          npc={activeNpc}
          node={activeNode}
          player={player}
          worldFlags={worldFlags}
          quests={quests}
          onSelectChoice={handleSelectDialogueChoice}
          onClose={() => {
            setActiveDialogue(null);
            setActivePanel('NONE');
          }}
        />
      )}

      {activePanel === 'MERCHANT' && activeMerchantId && (
        <MerchantModal
          merchantName={activeMerchantNpc?.name ?? 'Merchant'}
          stock={merchantStocks[activeMerchantId] ?? []}
          player={player}
          worldFlags={worldFlags}
          onBuyItem={handleBuyItem}
          onSellItem={handleSellItem}
          onUpgradeItem={handleUpgradeItem}
          onEnchantItem={handleEnchantItem}
          onRerollAffix={handleRerollAffix}
          onOpenTownUpgrades={() => {
            setActiveMerchantId(null);
            setActivePanel('UPGRADES');
          }}
          onClose={() => {
            setActiveMerchantId(null);
            setActivePanel('NONE');
          }}
        />
      )}

      {activePanel === 'UPGRADES' && (
        <TownUpgradesModal
          player={player}
          worldFlags={worldFlags}
          onPurchaseUpgrade={handlePurchaseUpgrade}
          onClose={() => setActivePanel('NONE')}
        />
      )}

      {activePanel === 'QUESTS' && (
        <QuestJournalModal
          quests={quests}
          worldFlags={worldFlags}
          onClose={() => setActivePanel('NONE')}
        />
      )}

      {activePanel === 'TRAVEL' && (
        <TravelModal
          currentZone={currentZoneId}
          inCombatDanger={inCombatDanger}
          worldFlags={worldFlags}
          onTravel={(destId) => {
            setActivePanel('NONE');
            transitionToZone(destId, 'spawn', player, zones);
          }}
          onClose={() => setActivePanel('NONE')}
        />
      )}

      {activePanel === 'LEGEND' && (
        <LegendModal onClose={() => setActivePanel('NONE')} onReplayTutorial={replayTutorial} />
      )}

      {specialPrompt && (
        <SpecialEncounterModal prompt={specialPrompt} onClose={() => setSpecialPrompt(null)} />
      )}

      {gameState === 'VICTORY' && (
        <EndingScreen
          player={player}
          derived={derived}
          worldFlags={worldFlags}
          playTimeMs={playTimeBaseRef.current + (Date.now() - runStartedAtRef.current)}
          ngPlusCycle={ngPlusCycle}
          onAscend={handleAscendNgPlus}
          onContinueAbyss={() => {
            pushLog(
              'The cinder-throne is empty. Below Floor 5, the Abyssal Stair descends into the Endless Abyss.',
              'quest',
              player.turnsElapsed
            );
            setGameState('PLAYING');
          }}
          onOpenHallOfFame={() => setShowHallOfFame(true)}
          onShowCredits={() => setShowCredits(true)}
          onPlayAgain={() => handleStartNew(player.starterClass, activeSlot)}
          onReturnToTitle={() => {
            setActivePanel('NONE');
            setGameState('TITLE_MENU');
          }}
        />
      )}

      {(gameState === 'PAUSED' || gameState === 'GAME_OVER') && (
        <EndPauseModal
          mode={gameState}
          activeSlot={activeSlot}
          player={player}
          derived={derived}
          difficultyLabel={DIFFICULTY_INFO[difficulty].label}
          ngPlusCycle={ngPlusCycle}
          hardcore={hardcore}
          authUser={authUser}
          cloudBusy={authBusy || cloudSaving}
          onSignIn={handleSignInGoogle}
          canReturnToEnding={Boolean(worldFlags.malakorDefeated)}
          onReturnToEnding={() => setGameState('VICTORY')}
          onResume={() => setGameState('PLAYING')}
          onSaveRun={async () => {
            const bundle: SavedBundle = {
              player,
              zones,
              currentZoneId,
              worldFlags,
              quests,
              merchantStocks,
              logs,
              updatedAtMs: Date.now(),
              version: SAVE_VERSION,
              difficulty,
              completedAtMs: completedAtMs ?? undefined,
              ngPlusCycle,
              hardcore,
              deadAtMs: deathStampRef.current?.deadAtMs,
              deathNote: deathStampRef.current?.deathNote,
            };
            const localOk = saveBundleToStorage(bundle, derived.buildTitle, activeSlot, true);
            const slotLabel = activeSlot.replace('_', ' ').toUpperCase();
            if (authUser) {
              setCloudSaving(true);
              try {
                await saveSlotToCloud(authUser.uid, activeSlot, bundle, derived.buildTitle);
                setCloudSlotMap((prev) => ({
                  ...prev,
                  [activeSlot]: {
                    summary: {
                      slotId: activeSlot,
                      starterClass: player.starterClass,
                      level: player.level,
                      zoneId: currentZoneId,
                      zoneName: currentZone.name,
                      buildTitle: derived.buildTitle,
                      kills: player.kills,
                      gold: player.gold,
                      updatedAtMs: Date.now(),
                      completedAtMs: completedAtMs ?? undefined,
                      ngPlusCycle,
                      hardcore,
                      deadAtMs: deathStampRef.current?.deadAtMs,
                      deathNote: deathStampRef.current?.deathNote,
                    },
                    payload: bundle,
                  },
                }));
                pushLog(
                  localOk
                    ? `Saved ${slotLabel} to Cloud & Local storage.`
                    : `Saved ${slotLabel} to Cloud (local browser storage quota exceeded).`,
                  localOk ? 'quest' : 'danger'
                );
              } catch (err) {
                const msg = formatCloudError(err);
                pushLog(
                  localOk
                    ? `Saved ${slotLabel} locally; cloud sync failed: ${msg}`
                    : `Save failed: local quota exceeded & cloud sync failed (${msg}).`,
                  'danger'
                );
              } finally {
                setCloudSaving(false);
              }
            } else if (localOk) {
              pushLog(`Saved ${slotLabel} locally.`, 'quest');
            }
            setGameState('PLAYING');
          }}
          onOpenHallOfFame={() => setShowHallOfFame(true)}
          onPlayAgain={() => handleStartNew(player.starterClass, activeSlot)}
          onReturnToTitle={() => {
            setActivePanel('NONE');
            setGameState('TITLE_MENU');
          }}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          tileSize={tileSize}
          onSettingsChange={updateSettings}
          onTileSizeChange={handleTileSizeChange}
          onClose={() => setShowSettings(false)}
          difficulty={difficulty}
          onDifficultyChange={handleDifficultyChange}
        />
      )}

      {showCredits && <CreditsScreen onClose={() => setShowCredits(false)} />}

      {showHallOfFame && (
        <HallOfFameModal
          entries={mergedChronicles}
          isSignedIn={Boolean(authUser)}
          lifetime={lifetime}
          onClose={() => setShowHallOfFame(false)}
        />
      )}
    </div>
  );
}
