import { create } from "zustand";
import { EGG_COLORS } from "./config";
import { sim, resetSimRacers } from "./sim";
import {
  DUP_REFUND,
  GACHA_COST,
  STARTER_SKINS,
  placeReward,
  pullSkin,
  type Skin,
} from "./skins";
import { LEVELS, LEVEL_ORDER, setActiveLevel, type LevelId } from "./levels";

export type Phase = "title" | "countdown" | "playing" | "paused" | "results";
export type LobbyTab = "play" | "gacha";
export type Hub = "home" | "play" | "character" | "inventory" | "profile";

export type HudRacer = {
  id: string;
  name: string;
  color: string;
  isPlayer: boolean;
  place: number;
  finished: boolean;
  finishTime: number;
  progress: number;
};

type Persist = {
  bestTime: number | null;
  wins: number;
  colorId: string;
  coins: number;
  ownedSkins: string[];
  equippedSkin: string;
  levelId: LevelId;
  cleared: string[];
  levelBest: Record<string, number>;
  muted: boolean;
  musicVol: number;
  sfxVol: number;
  camSens: number;
  controlScale: number;
  controlOpacity: number;
  hapticOn: boolean;
  gfx: "auto" | "low" | "medium" | "high";
  gamesPlayed: number;
  xp: number;
  playerName: string;
  /**
   * v5-only fields — optional, defaults applied at hydration. See
   * `08-29-skin-3d-pipeline` R1 / implement.md P1. Forward-compat: unknown
   * keys are preserved by JSON.stringify so future fields don't get lost.
   */
  preferredLod?: "lod0" | "lod1" | "lod2";
  lastPreviewedSkinId?: string;
};

/**
 * Save key bumped from v4 → v5 with the Skin Model extension. Migration to
 * v5 is performed by `load()` below — a v4-only save is upgraded in place
 * on next read and re-saved under the v5 key. See CLAUDE.md "store.ts 的
 * SAVE_KEY 升级规则" — never replace Persist in-place; always add a new key.
 */
export const SAVE_KEY = "yolk-rush-v5";
export const LEGACY_SAVE_KEYS = [
  "yolk-rush-v4",
  "yolk-rush-v3",
  "yolk-rush-v2",
  "yolk-rush-v1",
] as const;

function defaultPersist(): Persist {
  return {
    bestTime: null,
    wins: 0,
    colorId: "coral",
    coins: 160,
    ownedSkins: [...STARTER_SKINS],
    equippedSkin: "mint_wings",
    levelId: "meadow",
    cleared: [],
    levelBest: {},
    muted: false,
    musicVol: 0.72,
    sfxVol: 0.78,
    camSens: 1,
    controlScale: 1,
    controlOpacity: 0.92,
    hapticOn: true,
    gfx: "auto" as const,
    gamesPlayed: 0,
    xp: 0,
    playerName: "Yolk",
    preferredLod: undefined,
    lastPreviewedSkinId: undefined,
  };
}

/**
 * Pure v4 → v5 migration. Returns a fully-formed Persist. Unknown v4 fields
 * (future additions) are preserved on the returned object via spread.
 */
export function migrateV4ToV5(v4: Partial<Persist>): Persist {
  const owned = Array.isArray(v4.ownedSkins)
    ? Array.from(new Set([...STARTER_SKINS, ...(v4.ownedSkins as string[])]))
    : [...STARTER_SKINS];
  const levelId = LEVEL_ORDER.includes(v4.levelId as LevelId)
    ? (v4.levelId as LevelId)
    : "meadow";
  return {
    ...(v4 as Persist),
    bestTime: typeof v4.bestTime === "number" ? v4.bestTime : null,
    wins: typeof v4.wins === "number" ? v4.wins : 0,
    colorId: EGG_COLORS.some((c) => c.id === v4.colorId) ? (v4.colorId as string) : "coral",
    coins: typeof v4.coins === "number" ? v4.coins : 160,
    ownedSkins: owned,
    equippedSkin: owned.includes(v4.equippedSkin ?? "")
      ? (v4.equippedSkin as string)
      : "mint_wings",
    levelId,
    cleared: Array.isArray(v4.cleared) ? (v4.cleared as string[]) : [],
    levelBest:
      v4.levelBest && typeof v4.levelBest === "object"
        ? (v4.levelBest as Record<string, number>)
        : {},
    muted: v4.muted === true,
    musicVol: typeof v4.musicVol === "number" ? Math.min(1, Math.max(0, v4.musicVol)) : 0.72,
    sfxVol: typeof v4.sfxVol === "number" ? Math.min(1, Math.max(0, v4.sfxVol)) : 0.78,
    camSens: typeof (v4 as { camSens?: number }).camSens === "number"
      ? Math.min(1.6, Math.max(0.5, (v4 as { camSens: number }).camSens))
      : 1,
    controlScale: typeof v4.controlScale === "number"
      ? Math.min(1.25, Math.max(0.8, v4.controlScale))
      : 1,
    controlOpacity: typeof v4.controlOpacity === "number"
      ? Math.min(1, Math.max(0.4, v4.controlOpacity))
      : 0.92,
    hapticOn: v4.hapticOn !== false,
    gfx: v4.gfx === "low" || v4.gfx === "medium" || v4.gfx === "high" ? v4.gfx : "auto",
    gamesPlayed: typeof v4.gamesPlayed === "number" ? v4.gamesPlayed : 0,
    xp: typeof v4.xp === "number" ? v4.xp : 0,
    playerName:
      typeof v4.playerName === "string" && v4.playerName.trim()
        ? v4.playerName.slice(0, 16)
        : "Yolk",
    preferredLod: undefined,
    lastPreviewedSkinId: undefined,
  };
}

function load(): Persist {
  const fallback = defaultPersist();
  try {
    const rawV5 = localStorage.getItem(SAVE_KEY);
    if (rawV5) {
      const p = JSON.parse(rawV5) as Partial<Persist>;
      // Re-apply defaults to fill any missing field (forward compat).
      return applyDefaults(p);
    }
    for (const legacyKey of LEGACY_SAVE_KEYS) {
      const raw = localStorage.getItem(legacyKey);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Partial<Persist>;
      const migrated = migrateV4ToV5(parsed);
      // Persist the upgrade so future loads hit v5 directly.
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(migrated));
        localStorage.removeItem(legacyKey);
      } catch {
        /* ignore */
      }
      return migrated;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Fill missing / malformed v5 fields with safe defaults. Pure: never
 * strips unknown keys so future schema growth stays compatible.
 */
function applyDefaults(p: Partial<Persist>): Persist {
  const fallback = defaultPersist();
  const owned = Array.isArray(p.ownedSkins)
    ? Array.from(new Set([...STARTER_SKINS, ...(p.ownedSkins as string[])]))
    : [...STARTER_SKINS];
  const levelId = LEVEL_ORDER.includes(p.levelId as LevelId)
    ? (p.levelId as LevelId)
    : "meadow";
  const preferredLod: Persist["preferredLod"] =
    p.preferredLod === "lod0" || p.preferredLod === "lod1" || p.preferredLod === "lod2"
      ? p.preferredLod
      : undefined;
  return {
    ...(p as Persist),
    bestTime: typeof p.bestTime === "number" ? p.bestTime : null,
    wins: typeof p.wins === "number" ? p.wins : 0,
    colorId: EGG_COLORS.some((c) => c.id === p.colorId) ? (p.colorId as string) : "coral",
    coins: typeof p.coins === "number" ? p.coins : 160,
    ownedSkins: owned,
    equippedSkin: owned.includes(p.equippedSkin ?? "")
      ? (p.equippedSkin as string)
      : "mint_wings",
    levelId,
    cleared: Array.isArray(p.cleared) ? (p.cleared as string[]) : [],
    levelBest:
      p.levelBest && typeof p.levelBest === "object"
        ? (p.levelBest as Record<string, number>)
        : {},
    muted: p.muted === true,
    musicVol: typeof p.musicVol === "number" ? Math.min(1, Math.max(0, p.musicVol)) : 0.72,
    sfxVol: typeof p.sfxVol === "number" ? Math.min(1, Math.max(0, p.sfxVol)) : 0.78,
    camSens: typeof (p as { camSens?: number }).camSens === "number"
      ? Math.min(1.6, Math.max(0.5, (p as { camSens: number }).camSens))
      : 1,
    controlScale: typeof p.controlScale === "number"
      ? Math.min(1.25, Math.max(0.8, p.controlScale))
      : 1,
    controlOpacity: typeof p.controlOpacity === "number"
      ? Math.min(1, Math.max(0.4, p.controlOpacity))
      : 0.92,
    hapticOn: p.hapticOn !== false,
    gfx: p.gfx === "low" || p.gfx === "medium" || p.gfx === "high" ? p.gfx : "auto",
    gamesPlayed: typeof p.gamesPlayed === "number" ? p.gamesPlayed : 0,
    xp: typeof p.xp === "number" ? p.xp : 0,
    playerName:
      typeof p.playerName === "string" && p.playerName.trim()
        ? p.playerName.slice(0, 16)
        : "Yolk",
    preferredLod,
    lastPreviewedSkinId:
      typeof p.lastPreviewedSkinId === "string" && p.lastPreviewedSkinId.length <= 64
        ? p.lastPreviewedSkinId
        : fallback.lastPreviewedSkinId,
  };
}

function save(p: Persist) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

const initial = defaultPersist();
function persistFrom(s: {
  bestTime: number | null;
  wins: number;
  colorId: string;
  coins: number;
  ownedSkins: string[];
  equippedSkin: string;
  levelId: LevelId;
  cleared: string[];
  levelBest: Record<string, number>;
  muted: boolean;
  musicVol: number;
  sfxVol: number;
  camSens: number;
  controlScale: number;
  controlOpacity: number;
  hapticOn: boolean;
  gfx: Persist["gfx"];
  gamesPlayed: number;
  xp: number;
  playerName: string;
  preferredLod?: Persist["preferredLod"];
  lastPreviewedSkinId?: string;
}): Persist {
  return {
    bestTime: s.bestTime,
    wins: s.wins,
    colorId: s.colorId,
    coins: s.coins,
    ownedSkins: s.ownedSkins,
    equippedSkin: s.equippedSkin,
    levelId: s.levelId,
    cleared: s.cleared,
    levelBest: s.levelBest,
    muted: s.muted,
    musicVol: s.musicVol,
    sfxVol: s.sfxVol,
    camSens: s.camSens,
    controlScale: s.controlScale,
    controlOpacity: s.controlOpacity,
    hapticOn: s.hapticOn,
    gfx: s.gfx,
    gamesPlayed: s.gamesPlayed,
    xp: s.xp,
    playerName: s.playerName,
    preferredLod: s.preferredLod,
    lastPreviewedSkinId: s.lastPreviewedSkinId,
  };
}

type GameStore = {
  phase: Phase;
  countLeft: number;
  colorId: string;
  bestTime: number | null;
  wins: number;
  raceId: number;
  muted: boolean;
  musicVol: number;
  sfxVol: number;
  camSens: number;
  controlScale: number;
  controlOpacity: number;
  hapticOn: boolean;
  gfx: Persist["gfx"];
  howTo: boolean;
  lobbyTab: LobbyTab;
  coins: number;
  ownedSkins: string[];
  equippedSkin: string;
  levelId: LevelId;
  cleared: string[];
  levelBest: Record<string, number>;
  lastPull: { skin: Skin; duplicate: boolean } | null;
  pullSeq: number;
  raceCoins: number;
  lastBonus: { first: number; perfect: number; noFall: number };
  hub: Hub;
  previewSkinId: string | null;
  gamesPlayed: number;
  xp: number;
  playerName: string;
  /** v5 fields — round-trip through reconcilePersisted + persistFrom(get()). */
  preferredLod?: Persist["preferredLod"];
  lastPreviewedSkinId?: string;

  lastPayout: number;
  hud: {
    time: number;
    place: number;
    dashCd: number;
    coinsRun: number;
    racers: HudRacer[];
    failHint: string;
  };
  setColor: (id: string) => void;
  setSkin: (id: string) => void;
  setLevel: (id: LevelId) => void;
  isUnlocked: (id: LevelId) => boolean;
  setLobbyTab: (tab: LobbyTab) => void;
  setHub: (hub: Hub) => void;
  setPreviewSkin: (id: string | null) => void;
  nextRace: () => void;
  toggleMute: () => void;
  setMusicVol: (v: number) => void;
  setSfxVol: (v: number) => void;
  setCamSens: (v: number) => void;
  setControlScale: (v: number) => void;
  setControlOpacity: (v: number) => void;
  setHapticOn: (v: boolean) => void;
  setGfx: (v: Persist["gfx"]) => void;
  setPlayerName: (name: string) => void;
  setPreferredLod: (v: Persist["preferredLod"]) => void;
  setLastPreviewedSkinId: (id: string | undefined) => void;
  toggleHowTo: () => void;
  startRace: () => void;
  forcePlay: () => void;
  reconcilePersisted: () => void;
  go: () => void;
  pause: () => void;
  resume: () => void;
  toTitle: () => void;
  pullSim: () => void;
  onPlayerFinish: (time: number) => void;
  pullGacha: () => void;
  clearPull: () => void;
};

export const useGameStore = create<GameStore>((set, get) => ({
  phase: "title",
  countLeft: 3,
  colorId: initial.colorId,
  bestTime: initial.bestTime,
  wins: initial.wins,
  raceId: 0,
  muted: initial.muted,
  musicVol: initial.musicVol,
  sfxVol: initial.sfxVol,
  camSens: initial.camSens ?? 1,
  controlScale: initial.controlScale ?? 1,
  controlOpacity: initial.controlOpacity ?? 0.92,
  hapticOn: initial.hapticOn !== false,
  gfx: initial.gfx ?? "auto",
  howTo: false,
  lobbyTab: "play",
  coins: initial.coins,
  ownedSkins: initial.ownedSkins,
  equippedSkin: initial.equippedSkin,
  levelId: initial.levelId,
  cleared: initial.cleared,
  levelBest: initial.levelBest,
  lastPull: null,
  pullSeq: 0,
  raceCoins: 0,
  lastBonus: { first: 0, perfect: 0, noFall: 0 },
  hub: "home" as Hub,
  previewSkinId: null as string | null,
  gamesPlayed: initial.gamesPlayed ?? 0,
  xp: initial.xp ?? 0,
  playerName: initial.playerName ?? "Yolk",
  preferredLod: initial.preferredLod,
  lastPreviewedSkinId: initial.lastPreviewedSkinId,

  lastPayout: 0,
  hud: { time: 0, place: 8, dashCd: 0, coinsRun: 0, racers: [], failHint: "" },

  setColor: (id) => {
    set({ colorId: id });
    save(persistFrom(get()));
  },

  setSkin: (id) => {
    if (!get().ownedSkins.includes(id)) return;
    set({ equippedSkin: id });
    save(persistFrom(get()));
  },

  setLevel: (id) => {
    set({ levelId: id });
    setActiveLevel(id);
    save(persistFrom(get()));
  },

  isUnlocked: (id) => {
    const idx = LEVEL_ORDER.indexOf(id);
    if (idx <= 0) return true;
    const prev = LEVEL_ORDER[idx - 1];
    return get().cleared.includes(prev);
  },

  setLobbyTab: (tab) => set({ lobbyTab: tab, howTo: false }),
  setHub: (hub) =>
    set({
      hub,
      previewSkinId: hub === "character" ? get().previewSkinId ?? get().equippedSkin : null,
    }),
  setPreviewSkin: (id) => set({ previewSkinId: id }),
  toggleMute: () => {
    set({ muted: !get().muted });
    save(persistFrom(get()));
  },
  setMusicVol: (v) => {
    set({ musicVol: Math.max(0, Math.min(1, v)) });
    save(persistFrom(get()));
  },
  setSfxVol: (v) => {
    set({ sfxVol: Math.max(0, Math.min(1, v)) });
    save(persistFrom(get()));
  },
  setCamSens: (v) => {
    set({ camSens: Math.max(0.5, Math.min(1.6, v)) });
    save(persistFrom(get()));
  },
  setControlScale: (v) => {
    set({ controlScale: Math.max(0.8, Math.min(1.25, v)) });
    save(persistFrom(get()));
  },
  setControlOpacity: (v) => {
    set({ controlOpacity: Math.max(0.4, Math.min(1, v)) });
    save(persistFrom(get()));
  },
  setHapticOn: (v) => {
    set({ hapticOn: v });
    save(persistFrom(get()));
  },
  setGfx: (v) => {
    set({ gfx: v });
    save(persistFrom(get()));
  },
  setPlayerName: (name) => {
    const trimmed = typeof name === "string" ? name.trim().slice(0, 16) : "Yolk";
    set({ playerName: trimmed || "Yolk" });
    save(persistFrom(get()));
  },
  setPreferredLod: (v) => {
    set({ preferredLod: v });
    save(persistFrom(get()));
  },
  setLastPreviewedSkinId: (id) => {
    set({ lastPreviewedSkinId: id });
    save(persistFrom(get()));
  },
  toggleHowTo: () => set({ howTo: !get().howTo }),

  startRace: () => {
    const lv = LEVELS[get().levelId];
    setActiveLevel(get().levelId);
    resetSimRacers();
    sim.coinsTotal = lv.coinCount;
    set((s) => ({
      phase: "countdown",
      countLeft: 3,
      raceId: s.raceId + 1,
      howTo: false,
      raceCoins: 0,
      lastPull: null,
      lastBonus: { first: 0, perfect: 0, noFall: 0 },
    }));
  },

  forcePlay: () => {
    const s = get();
    if (s.phase === "playing") return;
    setActiveLevel(s.levelId);
    resetSimRacers();
    sim.coinsTotal = LEVELS[s.levelId].coinCount;
    set({
      phase: "playing",
      countLeft: 0,
      raceId: s.phase === "title" || s.phase === "results" ? s.raceId + 1 : s.raceId,
      howTo: false,
    });
  },

  reconcilePersisted: () => {
    const persisted = load();
    set({
      bestTime: persisted.bestTime,
      wins: persisted.wins,
      colorId: persisted.colorId,
      muted: persisted.muted,
      musicVol: persisted.musicVol,
      sfxVol: persisted.sfxVol,
      camSens: persisted.camSens,
      controlScale: persisted.controlScale,
      controlOpacity: persisted.controlOpacity,
      hapticOn: persisted.hapticOn,
      gfx: persisted.gfx,
      coins: persisted.coins,
      ownedSkins: persisted.ownedSkins,
      equippedSkin: persisted.equippedSkin,
      levelId: persisted.levelId,
      cleared: persisted.cleared,
      levelBest: persisted.levelBest,
      gamesPlayed: persisted.gamesPlayed,
      xp: persisted.xp,
      playerName: persisted.playerName,
      preferredLod: persisted.preferredLod,
      lastPreviewedSkinId: persisted.lastPreviewedSkinId,
    });
    setActiveLevel(persisted.levelId);
  },

  go: () => set({ phase: "playing", countLeft: 0 }),

  pause: () => {
    if (get().phase === "playing") set({ phase: "paused" });
  },
  resume: () => {
    if (get().phase === "paused") set({ phase: "playing" });
  },
  toTitle: () => set({ phase: "title", howTo: false, lobbyTab: "play", hub: "home", previewSkinId: null }),

  nextRace: () => {
    const s = get();
    const i = LEVEL_ORDER.indexOf(s.levelId);
    const nid = LEVEL_ORDER[i + 1];
    if (!nid) {
      set({ phase: "title", hub: "play" });
      return;
    }
    s.setLevel(nid);
    s.startRace();
  },

  pullSim: () => {
    const lv = LEVELS[get().levelId];
    const FINISH = lv.finishZ;
    const START = lv.startZ;
    const span = Math.max(1, START - FINISH);
    const racers: HudRacer[] = sim.racers.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      isPlayer: r.isPlayer,
      place: r.place,
      finished: r.finished,
      finishTime: r.finishTime,
      progress: Math.max(0, Math.min(1, (START - r.z) / span)),
    }));
    racers.sort((a, b) => a.place - b.place || b.progress - a.progress);
    const player = sim.racers.find((r) => r.isPlayer);
    set({
      hud: {
        time: sim.time,
        place: player?.place ?? racers.length,
        dashCd: player?.dashCd ?? 0,
        coinsRun: sim.coinsRun,
        racers,
        failHint: sim.time < sim.failUntil ? sim.failHint : "",
      },
    });
  },

  onPlayerFinish: (time) => {
    const s = get();
    const player = sim.racers.find((r) => r.isPlayer);
    const won = player?.place === 1;
    const best = s.bestTime == null ? time : Math.min(s.bestTime, time);
    const wins = s.wins + (won ? 1 : 0);
    const first = s.cleared.includes(s.levelId) ? 0 : 40;
    const noFall = sim.falls === 0 ? 18 : 0;
    const perfect = sim.falls === 0 && sim.coinsRun >= sim.coinsTotal * 5 ? 28 : 0;
    const payout =
      placeReward(player?.place ?? 8, Boolean(player?.finished)) + sim.coinsRun + first + perfect + noFall;
    const coins = s.coins + payout;
    const cleared = first ? [...s.cleared, s.levelId] : s.cleared;
    const prevBest = s.levelBest[s.levelId];
    const levelBest = {
      ...s.levelBest,
      [s.levelId]: prevBest == null ? time : Math.min(prevBest, time),
    };
    const gamesPlayed = s.gamesPlayed + 1;
    const xp = s.xp + 24 + Math.max(0, 5 - (player?.place ?? 8)) * 8 + (first ? 20 : 0);
    const next = {
      ...persistFrom({ ...s, gamesPlayed, xp }),
      bestTime: best,
      wins,
      coins,
      cleared,
      levelBest,
      gamesPlayed,
      xp,
    };
    save(next);
    set({
      phase: "results",
      bestTime: best,
      wins,
      coins,
      lastPayout: payout,
      raceCoins: sim.coinsRun,
      cleared,
      levelBest,
      lastBonus: { first, perfect, noFall },
      gamesPlayed,
      xp,
    });
  },

  pullGacha: () => {
    const s = get();
    if (s.coins < GACHA_COST) return;
    const { skin, duplicate } = pullSkin(s.ownedSkins);
    let coins = s.coins - GACHA_COST;
    let owned = s.ownedSkins;
    if (duplicate) coins += DUP_REFUND;
    else owned = [...owned, skin.id];
    const equipped = duplicate ? s.equippedSkin : skin.id;
    set({
      coins,
      ownedSkins: owned,
      equippedSkin: equipped,
      lastPull: { skin, duplicate },
      pullSeq: s.pullSeq + 1,
    });
    save(persistFrom({ ...get(), coins, ownedSkins: owned, equippedSkin: equipped }));
  },

  clearPull: () => set({ lastPull: null }),
}));

if (typeof window !== "undefined") setActiveLevel(initial.levelId);
