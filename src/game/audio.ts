let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfx: GainNode | null = null;
let muted = false;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx = new AC({ latencyHint: "interactive" });
  master = ctx.createGain();
  sfx = ctx.createGain();
  sfx.gain.value = 0.7;
  master.gain.value = muted ? 0 : 0.85;
  sfx.connect(master);
  master.connect(ctx.destination);
  return ctx;
}

export function unlockAudio() {
  const c = ensure();
  if (c.state === "suspended") void c.resume();
}

export function isMuted() {
  return muted;
}

export function setMuted(v: boolean) {
  muted = v;
  if (master && ctx) {
    master.gain.setTargetAtTime(v ? 0 : 0.85, ctx.currentTime, 0.03);
  }
}

function beep(freq: number, dur: number, type: OscillatorType, gain = 0.12, slide = 0) {
  const c = ensure();
  if (c.state !== "running") return;
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
  g.connect(sfx!);
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
  setTimeout(() => beep(494, 0.12, "triangle", 0.1, 0), 90);
  setTimeout(() => beep(587, 0.22, "triangle", 0.12, 80), 180);
}
export function sfxCoin() {
  beep(880, 0.08, "square", 0.07, 120);
}
export function sfxPull() {
  beep(392, 0.1, "triangle", 0.09, 80);
  setTimeout(() => beep(523, 0.14, "triangle", 0.1, 140), 90);
}
export function sfxBoxDrop() {
  beep(220, 0.08, "square", 0.07, -80);
  setTimeout(() => beep(180, 0.1, "triangle", 0.08, -40), 70);
}
export function sfxBoxShake() {
  beep(90, 0.05, "sawtooth", 0.05, 30);
}
export function sfxBoxOpen() {
  beep(160, 0.12, "sawtooth", 0.09, 280);
  setTimeout(() => beep(620, 0.16, "triangle", 0.1, 180), 80);
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
    setTimeout(() => beep(f, 0.16 + i * 0.02, "triangle", 0.09, 40), i * 110);
  });
}
export function sfxClick() {
  beep(640, 0.05, "square", 0.05, 0);
}
