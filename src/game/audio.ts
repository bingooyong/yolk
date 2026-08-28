import { readDevice } from "@/engine/device";

export type MusicId = "party" | "candy" | "ice" | "factory" | "sky" | "finale";
export type MusicState = "MENU" | "GAMEPLAY" | "HIGH_INTENSITY" | "VICTORY" | "DEFEAT";
export type Intensity = 0 | 1 | 2;

type LayerName = "base" | "perc" | "high";

type TrackDef = {
  id: MusicId;
  title: string;
  bpm: number;
  layers: Record<LayerName, string>;
};

const TRACKS: Record<MusicId, TrackDef> = {
  party: {
    id: "party",
    title: "Yolk Party",
    bpm: 124,
    layers: {
      base: "./audio/music/menu/yolk-party-base.mp3",
      perc: "./audio/music/menu/yolk-party-perc.mp3",
      high: "./audio/music/menu/yolk-party-high.mp3",
    },
  },
  candy: {
    id: "candy",
    title: "Candy Run",
    bpm: 128,
    layers: {
      base: "./audio/music/levels/candy-run-base.mp3",
      perc: "./audio/music/levels/candy-run-perc.mp3",
      high: "./audio/music/levels/candy-run-high.mp3",
    },
  },
  ice: {
    id: "ice",
    title: "Ice Slide",
    bpm: 118,
    layers: {
      base: "./audio/music/levels/ice-slide-base.mp3",
      perc: "./audio/music/levels/ice-slide-perc.mp3",
      high: "./audio/music/levels/ice-slide-high.mp3",
    },
  },
  factory: {
    id: "factory",
    title: "Crazy Factory",
    bpm: 132,
    layers: {
      base: "./audio/music/levels/crazy-factory-base.mp3",
      perc: "./audio/music/levels/crazy-factory-perc.mp3",
      high: "./audio/music/levels/crazy-factory-high.mp3",
    },
  },
  sky: {
    id: "sky",
    title: "Sky Bounce",
    bpm: 130,
    layers: {
      base: "./audio/music/levels/sky-bounce-base.mp3",
      perc: "./audio/music/levels/sky-bounce-perc.mp3",
      high: "./audio/music/levels/sky-bounce-high.mp3",
    },
  },
  finale: {
    id: "finale",
    title: "Final Party",
    bpm: 140,
    layers: {
      base: "./audio/music/levels/final-party-base.mp3",
      perc: "./audio/music/levels/final-party-perc.mp3",
      high: "./audio/music/levels/final-party-high.mp3",
    },
  },
};

const STINGERS = {
  victory: "./audio/music/victory/victory.mp3",
  defeat: "./audio/music/defeat/defeat.mp3",
};

export const LEVEL_BGM: Record<string, MusicId> = {
  meadow: "candy",
  ice: "ice",
  factory: "factory",
  sky: "sky",
  pirate: "factory",
  dessert: "candy",
  cloud: "sky",
  finale: "finale",
};

const LAYERS: LayerName[] = ["base", "perc", "high"];

type Slot = {
  gain: GainNode;
  layer: Record<LayerName, GainNode>;
  sources: AudioBufferSourceNode[];
  id: MusicId | null;
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let duck: GainNode | null = null;
let sfx: GainNode | null = null;
let slots: [Slot, Slot] | null = null;
let activeSlot = 0;
let muted = false;
let musicVol = 0.72;
let sfxVol = 0.78;
let duckAmt = 1;
let intensity: Intensity = 0;
let musicState: MusicState = "MENU";
let currentId: MusicId | null = null;
let switching = false;
let unlocked = false;
let preloadOnce: Promise<void> | null = null;
const buffers = new Map<string, AudioBuffer>();

function AC(): typeof AudioContext {
  return window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
}

function curve(v: number) {
  return Math.max(0, Math.min(1, v)) ** 2;
}

function ramp(g: GainNode, value: number, t = 0.04) {
  if (!ctx) return;
  g.gain.setTargetAtTime(value, ctx.currentTime, t);
}

function makeSlot(c: AudioContext, bus: GainNode): Slot {
  const gain = c.createGain();
  gain.gain.value = 0;
  gain.connect(bus);
  const layer = {} as Record<LayerName, GainNode>;
  for (const name of LAYERS) {
    const g = c.createGain();
    g.gain.value = name === "base" ? 1 : 0;
    g.connect(gain);
    layer[name] = g;
  }
  return { gain, layer, sources: [], id: null };
}

function applyLayerGains(slot: Slot, level: Intensity) {
  const perc = level >= 1 ? 0.88 : 0;
  const high = level >= 2 ? 0.82 : level >= 1 ? 0.12 : 0;
  ramp(slot.layer.base, 1, 0.35);
  ramp(slot.layer.perc, perc, 0.45);
  ramp(slot.layer.high, high, 0.45);
}

function applyMaster() {
  if (!master || !musicBus || !sfx || !ctx) return;
  ramp(master, muted ? 0 : 0.95, 0.03);
  ramp(musicBus, curve(musicVol) * 0.9, 0.05);
  ramp(sfx, curve(sfxVol) * 0.75, 0.03);
  ramp(duck!, duckAmt, 0.08);
}

function ensure() {
  if (ctx) return ctx;
  ctx = new (AC())({ latencyHint: "interactive" });
  master = ctx.createGain();
  musicBus = ctx.createGain();
  duck = ctx.createGain();
  sfx = ctx.createGain();
  duck.gain.value = 1;
  musicBus.connect(duck);
  duck.connect(master);
  sfx.connect(master);
  master.connect(ctx.destination);
  slots = [makeSlot(ctx, musicBus), makeSlot(ctx, musicBus)];
  applyMaster();
  return ctx;
}

function stopSlot(slot: Slot, fade = 0.6) {
  if (!ctx) return;
  ramp(slot.gain, 0, fade * 0.25);
  const dying = slot.sources.splice(0);
  const when = ctx.currentTime + fade + 0.05;
  for (const src of dying) {
    try {
      src.stop(when);
    } catch {
      /* already stopped */
    }
    src.onended = () => src.disconnect();
  }
  slot.id = null;
}

function startSlot(slot: Slot, id: MusicId, at: number) {
  if (!ctx || !slots) return;
  const def = TRACKS[id];
  stopSlot(slot, 0.05);
  const sources: AudioBufferSourceNode[] = [];
  for (const name of LAYERS) {
    const buf = buffers.get(def.layers[name]);
    if (!buf) continue;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(slot.layer[name]);
    src.start(at);
    sources.push(src);
  }
  slot.sources = sources;
  slot.id = id;
  applyLayerGains(slot, intensity);
}

async function decode(url: string) {
  if (buffers.has(url)) return;
  const c = ensure();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`audio ${url} ${res.status}`);
  const raw = await res.arrayBuffer();
  const buf = await c.decodeAudioData(raw.slice(0));
  buffers.set(url, buf);
}

function liteAudio() {
  try {
    return readDevice().quality === "low";
  } catch {
    return false;
  }
}

function trackUrls(id: MusicId) {
  const skipHigh = liteAudio();
  return LAYERS.filter((l) => !(skipHigh && l === "high")).map((l) => TRACKS[id].layers[l]);
}

function evictUnused(keepId: MusicId) {
  const keep = new Set<string>([
    ...trackUrls("party"),
    ...trackUrls(keepId),
    STINGERS.victory,
    STINGERS.defeat,
  ]);
  for (const url of [...buffers.keys()]) {
    if (!keep.has(url)) buffers.delete(url);
  }
}

async function ensureTrack(id: MusicId) {
  await Promise.all(trackUrls(id).map((u) => decode(u)));
}

export function preloadMusic() {
  if (preloadOnce) return preloadOnce;
  preloadOnce = (async () => {
    ensure();
    await Promise.all(
      [
        ...trackUrls("party"),
        STINGERS.victory,
        STINGERS.defeat,
      ].map((u) => decode(u).catch(() => undefined)),
    );
  })();
  return preloadOnce;
}

export function unlockAudio() {
  const c = ensure();
  if (c.state === "suspended") void c.resume();
  unlocked = true;
  void preloadMusic();
}

export function suspendAudio() {
  if (ctx && ctx.state === "running") void ctx.suspend();
}

export function resumeAudio() {
  if (!unlocked) return;
  const c = ensure();
  if (c.state === "suspended") void c.resume();
}

export function isMuted() {
  return muted;
}

export function setMuted(v: boolean) {
  muted = v;
  applyMaster();
}

export function setMusicVolume(v: number) {
  musicVol = Math.max(0, Math.min(1, v));
  applyMaster();
}

export function setSfxVolume(v: number) {
  sfxVol = Math.max(0, Math.min(1, v));
  applyMaster();
}

export function getMusicVolume() {
  return musicVol;
}

export function getSfxVolume() {
  return sfxVol;
}

export function setIntensity(level: Intensity) {
  if (level === intensity) return;
  intensity = level;
  if (!slots) return;
  applyLayerGains(slots[0], level);
  applyLayerGains(slots[1], level);
}

export function currentMusicId() {
  return currentId;
}

export function currentMusicState() {
  return musicState;
}

let switchGen = 0;

export async function playBgm(id: MusicId) {
  ensure();
  if (currentId === id && !switching) return;
  const gen = ++switchGen;
  await preloadMusic();
  await ensureTrack(id).catch(() => undefined);
  if (gen !== switchGen || !ctx || !slots) return;
  if (currentId === id) return;
  switching = true;
  const next = (1 - activeSlot) as 0 | 1;
  const fade = 0.7;
  const at = ctx.currentTime + 0.03;
  startSlot(slots[next], id, at);
  ramp(slots[next].gain, 1, fade * 0.22);
  ramp(slots[activeSlot].gain, 0, fade * 0.22);
  const prev = slots[activeSlot];
  window.setTimeout(() => {
    stopSlot(prev, 0.05);
    evictUnused(id);
  }, fade * 1000);
  activeSlot = next;
  currentId = id;
  switching = false;
}

function playBufferOnce(url: string, dest: GainNode) {
  if (!ctx) return 0;
  const buf = buffers.get(url);
  if (!buf) return 0;
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  g.gain.value = 1;
  src.buffer = buf;
  src.connect(g);
  g.connect(dest);
  src.start();
  src.onended = () => {
    src.disconnect();
    g.disconnect();
  };
  return buf.duration;
}

export async function playStinger(kind: "victory" | "defeat") {
  ensure();
  await preloadMusic();
  if (!ctx || !duck) return;
  duckAmt = 0.12;
  applyMaster();
  const dur = playBufferOnce(STINGERS[kind], sfx!);
  window.setTimeout(
    () => {
      duckAmt = 1;
      applyMaster();
    },
    Math.max(1.2, dur * 1000 - 200),
  );
}

export async function setMusicState(next: MusicState, levelId?: string) {
  const prev = musicState;
  if (next === prev && next !== "GAMEPLAY") return;
  if (next === "GAMEPLAY" && prev === "HIGH_INTENSITY") {
    musicState = next;
    return;
  }
  if (next === "HIGH_INTENSITY" && prev === "GAMEPLAY") {
    musicState = next;
    setIntensity(2);
    return;
  }
  musicState = next;
  if (next === "MENU") {
    setIntensity(1);
    duckAmt = 1;
    applyMaster();
    await playBgm("party");
    return;
  }
  if (next === "GAMEPLAY") {
    const id = LEVEL_BGM[levelId ?? "meadow"] ?? "candy";
    duckAmt = 1;
    applyMaster();
    if (currentId !== id) setIntensity(0);
    await playBgm(id);
    return;
  }
  if (next === "HIGH_INTENSITY") {
    const id = LEVEL_BGM[levelId ?? "meadow"] ?? "candy";
    setIntensity(2);
    await playBgm(id);
    return;
  }
  if (next === "VICTORY") {
    await playStinger("victory");
    return;
  }
  if (next === "DEFEAT") {
    await playStinger("defeat");
  }
}

export function duckMusic(on: boolean) {
  duckAmt = on ? 0.38 : 1;
  applyMaster();
}

function beep(freq: number, dur: number, type: OscillatorType, gain = 0.12, slide = 0) {
  const c = ensure();
  if (c.state !== "running" || !sfx) return;
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(sfx);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
  osc.onended = () => {
    osc.disconnect();
    g.disconnect();
  };
}

export function sfxJump() {
  beep(420, 0.12, "square", 0.08, 280);
}
export function sfxDash() {
  beep(180, 0.16, "sawtooth", 0.07, 420);
}
export function sfxDashCharge(level: number) {
  beep(240 + level * 90, 0.07, "square", 0.045, 40);
}
export function sfxDashMax() {
  beep(520, 0.12, "triangle", 0.08, 180);
  window.setTimeout(() => beep(720, 0.1, "triangle", 0.07, 80), 70);
}
export function sfxDashRelease(level: number) {
  beep(160 + level * 40, 0.14, "sawtooth", 0.07 + level * 0.015, 380 + level * 40);
}
export function sfxPounce() {
  beep(210, 0.12, "square", 0.07, 260);
}
export function sfxRoll() {
  beep(140, 0.16, "sawtooth", 0.055, 90);
}
export function sfxLand() {
  beep(90, 0.08, "triangle", 0.1, -30);
}
export function sfxBounce() {
  beep(520, 0.14, "square", 0.08, 200);
}
export function sfxHit() {
  beep(110, 0.18, "sawtooth", 0.1, -70);
}
export function sfxCountdown(n: number) {
  beep(n <= 0 ? 660 : 320 + n * 40, n <= 0 ? 0.28 : 0.12, "square", 0.1, n <= 0 ? 200 : 0);
}
export function sfxFinish() {
  beep(392, 0.12, "triangle", 0.1, 0);
  window.setTimeout(() => beep(494, 0.12, "triangle", 0.1, 0), 90);
  window.setTimeout(() => beep(587, 0.22, "triangle", 0.12, 80), 180);
}
export function sfxCoin() {
  beep(880, 0.08, "square", 0.07, 120);
}
export function sfxPull() {
  beep(392, 0.1, "triangle", 0.09, 80);
  window.setTimeout(() => beep(523, 0.14, "triangle", 0.1, 140), 90);
}
export function sfxBoxDrop() {
  beep(220, 0.08, "square", 0.07, -80);
  window.setTimeout(() => beep(180, 0.1, "triangle", 0.08, -40), 70);
}
export function sfxBoxShake() {
  beep(90, 0.05, "sawtooth", 0.05, 30);
}
export function sfxBoxOpen() {
  beep(160, 0.12, "sawtooth", 0.09, 280);
  window.setTimeout(() => beep(620, 0.16, "triangle", 0.1, 180), 80);
}
export function sfxReveal(rarity: "common" | "rare" | "epic" | "legendary") {
  const seq =
    rarity === "legendary"
      ? [392, 494, 587, 784]
      : rarity === "epic"
        ? [349, 440, 523]
        : rarity === "rare"
          ? [330, 415, 494]
          : [294, 370];
  seq.forEach((f, i) => {
    window.setTimeout(() => beep(f, 0.16 + i * 0.02, "triangle", 0.09, 40), i * 110);
  });
}
export function sfxClick() {
  beep(640, 0.05, "square", 0.05, 0);
}
export function sfxShield() {
  beep(480, 0.12, "triangle", 0.08, 160);
}
export function sfxCheckpoint() {
  beep(523, 0.1, "square", 0.07, 80);
}
export function sfxButton() {
  sfxClick();
}
export function sfxLevelStart() {
  beep(392, 0.1, "triangle", 0.08, 40);
  window.setTimeout(() => beep(523, 0.12, "triangle", 0.09, 60), 80);
}
export function sfxVictory() {
  beep(523, 0.12, "triangle", 0.1, 0);
  window.setTimeout(() => beep(659, 0.16, "triangle", 0.1, 40), 110);
}
export function sfxDefeat() {
  beep(220, 0.2, "triangle", 0.09, -80);
}
