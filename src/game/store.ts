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

export type Phase = "title" | "countdown" | "playing" | "paused" | "results";
export type LobbyTab = "play" | "gacha";

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
};

const SAVE_KEY = "yolk-rush-v3";

function load(): Persist {
  const fallback: Persist = {
    bestTime: null,
    wins: 0,
    colorId: "coral",
    coins: 160,
    ownedSkins: [...STARTER_SKINS],
    equippedSkin: "mint_wings",
  };
  try {
    const raw =
      localStorage.getItem(SAVE_KEY) ??
      localStorage.getItem("yolk-rush-v2") ??
      localStorage.getItem("yolk-rush-v1");
    if (!raw) return fallback;
    const p = JSON.parse(raw) as Partial<Persist>;
    const owned = Array.isArray(p.ownedSkins)
      ? Array.from(new Set([...STARTER_SKINS, ...p.ownedSkins]))
      : [...STARTER_SKINS];
    return {
      bestTime: typeof p.bestTime === "number" ? p.bestTime : null,
      wins: typeof p.wins === "number" ? p.wins : 0,
      colorId: EGG_COLORS.some((c) => c.id === p.colorId) ? (p.colorId as string) : "coral",
      coins: typeof p.coins === "number" ? p.coins : 160,
      ownedSkins: owned,
      equippedSkin: owned.includes(p.equippedSkin ?? "")
        ? (p.equippedSkin as string)
        : "mint_wings",
    };
  } catch {
    return fallback;
  }
}

function save(p: Persist) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

const initial =
  typeof window !== "undefined"
    ? load()
    : {
        bestTime: null as number | null,
        wins: 0,
        colorId: "coral",
        coins: 160,
        ownedSkins: [...STARTER_SKINS],
        equippedSkin: "mint_wings",
      };

function persistFrom(s: {
  bestTime: number | null;
  wins: number;
  colorId: string;
  coins: number;
  ownedSkins: string[];
  equippedSkin: string;
}): Persist {
  return {
    bestTime: s.bestTime,
    wins: s.wins,
    colorId: s.colorId,
    coins: s.coins,
    ownedSkins: s.ownedSkins,
    equippedSkin: s.equippedSkin,
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
  howTo: boolean;
  lobbyTab: LobbyTab;
  coins: number;
  ownedSkins: string[];
  equippedSkin: string;
  lastPull: { skin: Skin; duplicate: boolean } | null;
  pullSeq: number;
  raceCoins: number;

  lastPayout: number;
  hud: {
    time: number;
    place: number;
    dashCd: number;
    coinsRun: number;
    racers: HudRacer[];
  };
  setColor: (id: string) => void;
  setSkin: (id: string) => void;
  setLobbyTab: (tab: LobbyTab) => void;
  toggleMute: () => void;
  toggleHowTo: () => void;
  startRace: () => void;
  forcePlay: () => void;
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
  muted: false,
  howTo: false,
  lobbyTab: "play",
  coins: initial.coins,
  ownedSkins: initial.ownedSkins,
  equippedSkin: initial.equippedSkin,
  lastPull: null,
  pullSeq: 0,
  raceCoins: 0,

  lastPayout: 0,
  hud: { time: 0, place: 8, dashCd: 0, coinsRun: 0, racers: [] },

  setColor: (id) => {
    set({ colorId: id });
    save(persistFrom(get()));
  },

  setSkin: (id) => {
    if (!get().ownedSkins.includes(id)) return;
    set({ equippedSkin: id });
    save(persistFrom(get()));
  },

  setLobbyTab: (tab) => set({ lobbyTab: tab, howTo: false }),
  toggleMute: () => set({ muted: !get().muted }),
  toggleHowTo: () => set({ howTo: !get().howTo }),

  startRace: () => {
    resetSimRacers();
    set((s) => ({
      phase: "countdown",
      countLeft: 3,
      raceId: s.raceId + 1,
      howTo: false,
      raceCoins: 0,
      lastPull: null,
    }));
  },

  forcePlay: () => {
    const s = get();
    if (s.phase === "playing") return;
    resetSimRacers();
    set({
      phase: "playing",
      countLeft: 0,
      raceId: s.phase === "title" || s.phase === "results" ? s.raceId + 1 : s.raceId,
      howTo: false,
    });
  },

  go: () => set({ phase: "playing", countLeft: 0 }),

  pause: () => {
    if (get().phase === "playing") set({ phase: "paused" });
  },
  resume: () => {
    if (get().phase === "paused") set({ phase: "playing" });
  },
  toTitle: () => set({ phase: "title", howTo: false, lobbyTab: "play" }),

  pullSim: () => {
    const FINISH = -186;
    const START = 8;
    const span = START - FINISH;
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
      },
    });
  },

  onPlayerFinish: (time) => {
    const s = get();
    const player = sim.racers.find((r) => r.isPlayer);
    const won = player?.place === 1;
    const best = s.bestTime == null ? time : Math.min(s.bestTime, time);
    const wins = s.wins + (won ? 1 : 0);
    const payout = placeReward(player?.place ?? 8, Boolean(player?.finished)) + sim.coinsRun;
    const coins = s.coins + payout;
    const next = {
      ...persistFrom(s),
      bestTime: best,
      wins,
      coins,
    };
    save(next);
    set({
      phase: "results",
      bestTime: best,
      wins,
      coins,
      lastPayout: payout,
      raceCoins: sim.coinsRun,
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
