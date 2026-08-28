import { useGameStore } from "./store";
import { sim } from "./sim";

const keys = new Set<string>();
let injected: Set<string> | null = null;

export const actions = {
  moveX: 0,
  moveY: 0,
  lookX: 0,
  lookY: 0,
  jump: false,
  dash: false,
  jumpPressed: false,
  jumpReleased: false,
  dashPressed: false,
  dashReleased: false,
  dashCanceled: false,
  dashHold: 0,
  pounce: false,
  pouncePressed: false,
  roll: false,
  rollPressed: false,
  grab: false,
  grabPressed: false,
};

let prevJump = false;
let prevDash = false;
let prevPounce = false;
let prevRoll = false;
let prevGrab = false;
let dashHoldT = 0;

export const touch = {
  moveX: 0,
  moveY: 0,
  lookX: 0,
  lookY: 0,
  jump: false,
  dash: false,
  dashCancel: false,
  pounce: false,
  roll: false,
  grab: false,
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
  "KeyI",
  "KeyL",
  "KeyF",
  "KeyQ",
  "KeyE",
  "KeyG",
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
  let lookX = 0;
  let lookY = 0;
  let jump = false;
  let dash = false;
  let pounce = false;
  let roll = false;
  let grab = false;
  let canceled = false;

  if (injected) {
    if (injected.has("KeyA") || injected.has("ArrowLeft")) x -= 1;
    if (injected.has("KeyD") || injected.has("ArrowRight")) x += 1;
    if (injected.has("KeyW") || injected.has("ArrowUp")) y += 1;
    if (injected.has("KeyS") || injected.has("ArrowDown")) y -= 1;
    jump = injected.has("Space") || injected.has("KeyK");
    dash = injected.has("ShiftLeft") || injected.has("ShiftRight") || injected.has("KeyJ");
    pounce = injected.has("KeyI") || injected.has("KeyF");
    roll = injected.has("KeyL");
    grab = injected.has("KeyG");
    if (injected.has("KeyQ")) lookX += 1;
    if (injected.has("KeyE")) lookX -= 1;
  } else {
    if (keys.has("KeyA") || keys.has("ArrowLeft")) x -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) x += 1;
    if (keys.has("KeyW") || keys.has("ArrowUp")) y += 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) y -= 1;
    jump = keys.has("Space") || keys.has("KeyK");
    dash = keys.has("ShiftLeft") || keys.has("ShiftRight") || keys.has("KeyJ");
    pounce = keys.has("KeyI") || keys.has("KeyF");
    roll = keys.has("KeyL");
    grab = keys.has("KeyG");
    if (keys.has("KeyQ")) lookX += 1;
    if (keys.has("KeyE")) lookX -= 1;

    x += touch.moveX;
    y += touch.moveY;
    jump = jump || touch.jump;
    dash = dash || touch.dash;
    pounce = pounce || touch.pounce;
    roll = roll || touch.roll;
    grab = grab || touch.grab;
    canceled = touch.dashCancel;
    touch.dashCancel = false;

    const pads = navigator.getGamepads?.() ?? [];
    for (const pad of pads) {
      if (!pad) continue;
      const stick = radialDeadzone(pad.axes[0] ?? 0, -(pad.axes[1] ?? 0));
      x += stick.x;
      y += stick.y;
      const look = radialDeadzone(pad.axes[2] ?? 0, pad.axes[3] ?? 0, 0.18);
      lookX -= look.x;
      lookY -= look.y;
      if (pad.buttons[0]?.pressed || pad.buttons[12]?.pressed) jump = true;
      if (pad.buttons[1]?.pressed) pounce = true;
      if (pad.buttons[2]?.pressed) roll = true;
      if (pad.buttons[5]?.pressed || pad.buttons[7]?.pressed) dash = true;
      if (pad.buttons[3]?.pressed) grab = true;
      if (pad.buttons[14]?.pressed) x -= 1;
      if (pad.buttons[15]?.pressed) x += 1;
      if (pad.buttons[12]?.pressed) y += 1;
      if (pad.buttons[13]?.pressed) y -= 1;
    }
  }

  if (typeof document !== "undefined" && document.hidden) {
    canceled = true;
    dash = false;
    jump = false;
    pounce = false;
    roll = false;
  }

  x = Math.max(-1, Math.min(1, x));
  y = Math.max(-1, Math.min(1, y));
  const mag = Math.hypot(x, y);
  if (mag > 1) {
    x /= mag;
    y /= mag;
  }

  if (dash) dashHoldT += 1 / 60;
  else dashHoldT = 0;

  actions.moveX = x;
  actions.moveY = y;
  actions.lookX = Math.max(-1, Math.min(1, lookX));
  actions.lookY = Math.max(-1, Math.min(1, lookY));
  actions.jump = jump;
  actions.dash = dash;
  actions.jumpPressed = jump && !prevJump;
  actions.jumpReleased = !jump && prevJump;
  actions.dashPressed = dash && !prevDash;
  actions.dashReleased = !dash && prevDash && !canceled;
  actions.dashCanceled = (!dash && prevDash && canceled) || canceled;
  actions.dashHold = dashHoldT;
  actions.pounce = pounce;
  actions.pouncePressed = pounce && !prevPounce;
  actions.roll = roll;
  actions.rollPressed = roll && !prevRoll;
  actions.grab = grab;
  actions.grabPressed = grab && !prevGrab;
  prevJump = jump;
  prevDash = dash;
  prevPounce = pounce;
  prevRoll = roll;
  prevGrab = grab;
}

export type ControlsProbe = {
  getYaw: () => number;
  getSpeed: () => number;
  getZ?: () => number;
  getLookYaw?: () => number;
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
    getLookYaw: () => sim.lookYaw,
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
