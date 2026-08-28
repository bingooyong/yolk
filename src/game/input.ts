import { useGameStore } from "./store";
import { sim } from "./sim";

const keys = new Set<string>();
let injected: Set<string> | null = null;

export const actions = {
  moveX: 0,
  moveY: 0,
  jump: false,
  dash: false,
  jumpPressed: false,
  dashPressed: false,
};

let prevJump = false;
let prevDash = false;

export const touch = {
  moveX: 0,
  moveY: 0,
  jump: false,
  dash: false,
};

const GAME_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowLeft",
  "ArrowDown",
  "ArrowRight",
  "Space",
  "ShiftLeft",
  "ShiftRight",
  "KeyK",
  "KeyJ",
]);

function radialDeadzone(x: number, y: number, dz = 0.15) {
  const m = Math.hypot(x, y);
  if (m < dz) return { x: 0, y: 0 };
  const scale = (m - dz) / (1 - dz) / m;
  return { x: x * scale, y: y * scale };
}

export function setInjectedKeys(codes: string[]) {
  injected = new Set(codes);
  const st = useGameStore.getState();
  if (st.phase !== "playing" && codes.length > 0) {
    st.forcePlay();
  }
}

export function clearInjectedKeys() {
  injected = null;
}

export function isDown(code: string) {
  if (injected) return injected.has(code);
  return keys.has(code);
}

export function installInput() {
  const onDown = (e: KeyboardEvent) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    keys.add(e.code);
    if (e.code === "Escape") {
      const st = useGameStore.getState();
      if (st.phase === "playing") st.pause();
      else if (st.phase === "paused") st.resume();
    }
  };
  const onUp = (e: KeyboardEvent) => {
    keys.delete(e.code);
  };
  const clear = () => keys.clear();

  window.addEventListener("keydown", onDown);
  window.addEventListener("keyup", onUp);
  window.addEventListener("blur", clear);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clear();
  });

  return () => {
    window.removeEventListener("keydown", onDown);
    window.removeEventListener("keyup", onUp);
    window.removeEventListener("blur", clear);
  };
}

export function pollInput() {
  let x = 0;
  let y = 0;
  let jump = false;
  let dash = false;

  if (injected) {
    if (injected.has("KeyA") || injected.has("ArrowLeft")) x -= 1;
    if (injected.has("KeyD") || injected.has("ArrowRight")) x += 1;
    if (injected.has("KeyW") || injected.has("ArrowUp")) y += 1;
    if (injected.has("KeyS") || injected.has("ArrowDown")) y -= 1;
    jump = injected.has("Space") || injected.has("KeyK");
    dash = injected.has("ShiftLeft") || injected.has("ShiftRight") || injected.has("KeyJ");
  } else {
    if (keys.has("KeyA") || keys.has("ArrowLeft")) x -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) x += 1;
    if (keys.has("KeyW") || keys.has("ArrowUp")) y += 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) y -= 1;
    jump = keys.has("Space") || keys.has("KeyK");
    dash = keys.has("ShiftLeft") || keys.has("ShiftRight") || keys.has("KeyJ");

    x += touch.moveX;
    y += touch.moveY;
    jump = jump || touch.jump;
    dash = dash || touch.dash;

    const pads = navigator.getGamepads?.() ?? [];
    for (const pad of pads) {
      if (!pad) continue;
      const stick = radialDeadzone(pad.axes[0] ?? 0, -(pad.axes[1] ?? 0));
      x += stick.x;
      y += stick.y;
      if (pad.buttons[0]?.pressed || pad.buttons[12]?.pressed) jump = true;
      if (pad.buttons[1]?.pressed || pad.buttons[7]?.pressed || pad.buttons[5]?.pressed) {
        dash = true;
      }
      if (pad.buttons[14]?.pressed) x -= 1;
      if (pad.buttons[15]?.pressed) x += 1;
      if (pad.buttons[12]?.pressed) y += 1;
      if (pad.buttons[13]?.pressed) y -= 1;
    }
  }

  x = Math.max(-1, Math.min(1, x));
  y = Math.max(-1, Math.min(1, y));
  const mag = Math.hypot(x, y);
  if (mag > 1) {
    x /= mag;
    y /= mag;
  }

  actions.moveX = x;
  actions.moveY = y;
  actions.jump = jump;
  actions.dash = dash;
  actions.jumpPressed = jump && !prevJump;
  actions.dashPressed = dash && !prevDash;
  prevJump = jump;
  prevDash = dash;
}

export type ControlsProbe = {
  getYaw: () => number;
  getSpeed: () => number;
  getZ?: () => number;
  setSteer?: (v: number) => void;
  setKeys?: (codes: string[]) => void;
};

declare global {
  interface Window {
    __controlsTest?: ControlsProbe;
  }
}

let steerOverride: number | null = null;

export function consumeSteerOverride() {
  return steerOverride;
}

export function installControlsTest(getYaw: () => number, getSpeed: () => number) {
  window.__controlsTest = {
    getYaw,
    getSpeed,
    getZ: () => sim.racers.find((r) => r.isPlayer)?.z ?? 0,
    setSteer: (v: number) => {
      steerOverride = v;
    },
    setKeys: (codes: string[]) => {
      if (codes.length === 0) {
        clearInjectedKeys();
        steerOverride = null;
      } else {
        setInjectedKeys(codes);
      }
    },
  };
}
