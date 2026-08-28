import { EGG_COLORS } from "./config";
import type { AbilityHud } from "./abilities";

export type RacerSim = {
  id: string;
  name: string;
  color: string;
  isPlayer: boolean;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  grounded: boolean;
  dashCd: number;
  finished: boolean;
  finishTime: number;
  place: number;
  squash: number;
};

export type MoveState =
  | "idle"
  | "running"
  | "jump_start"
  | "airborne"
  | "falling"
  | "landing"
  | "pounce"
  | "roll"
  | "boost";
export type DashState = "idle" | "charging" | "ready" | "release" | "active" | "recovery";

export type PadHud = {
  jumpHeld: boolean;
  jumpPulse: number;
  dashState: DashState;
  dashCharge: number;
  dashLevel: 0 | 1 | 2 | 3;
  dashCd: number;
  pounce: AbilityHud;
  roll: AbilityHud;
  boost: AbilityHud;
};

const idleHud = (): AbilityHud => ({ phase: "ready", cd01: 0, flash: 0 });

export type SimWorld = {
  raceId: number;
  time: number;
  trauma: number;
  playerYaw: number;
  playerSpeed: number;
  playerDashing: boolean;
  dashFov: number;
  camYaw: number;
  lookYaw: number;
  lookPitch: number;
  lookIdle: number;
  coinsRun: number;
  taken: Set<string>;
  racers: RacerSim[];
  moveState: MoveState;
  failHint: string;
  failUntil: number;
  falls: number;
  coinsTotal: number;
  pad: PadHud;
};

export const sim: SimWorld = {
  raceId: 0,
  time: 0,
  trauma: 0,
  playerYaw: 0,
  playerSpeed: 0,
  playerDashing: false,
  dashFov: 0,
  camYaw: 0,
  lookYaw: 0,
  lookPitch: 0,
  lookIdle: 0,
  coinsRun: 0,
  taken: new Set(),
  racers: [],
  moveState: "idle",
  failHint: "",
  failUntil: 0,
  falls: 0,
  coinsTotal: 0,
  pad: {
    jumpHeld: false,
    jumpPulse: 0,
    dashState: "idle",
    dashCharge: 0,
    dashLevel: 0,
    dashCd: 0,
    pounce: idleHud(),
    roll: idleHud(),
    boost: idleHud(),
  },
};

export function addTrauma(amount: number) {
  sim.trauma = Math.min(0.22, sim.trauma + amount);
}

export function decayTrauma(dt: number) {
  sim.trauma = Math.max(0, sim.trauma - dt * 2.4);
}

export function ensureRacer(id: string, init: Omit<RacerSim, "id">) {
  let r = sim.racers.find((x) => x.id === id);
  if (!r) {
    r = { id, ...init };
    sim.racers.push(r);
  }
  return r;
}

export function resetSimRacers() {
  for (const r of sim.racers) {
    r.finished = false;
    r.finishTime = 0;
    r.place = 0;
    r.speed = 0;
    r.dashCd = 0;
  }
  sim.time = 0;
  sim.trauma = 0;
  sim.playerSpeed = 0;
  sim.playerDashing = false;
  sim.dashFov = 0;
  sim.lookYaw = 0;
  sim.lookPitch = 0;
  sim.lookIdle = 0;
  sim.coinsRun = 0;
  sim.taken = new Set();
  sim.moveState = "idle";
  sim.failHint = "";
  sim.failUntil = 0;
  sim.falls = 0;
  sim.pad.jumpHeld = false;
  sim.pad.dashState = "idle";
  sim.pad.dashCharge = 0;
  sim.pad.dashLevel = 0;
  sim.pad.dashCd = 0;
  sim.pad.pounce = idleHud();
  sim.pad.roll = idleHud();
  sim.pad.boost = idleHud();
}

export function setFail(hint: string) {
  sim.failHint = hint;
  sim.failUntil = sim.time + 2.6;
  sim.falls += 1;
}

export function playerColorHex(id: string) {
  return EGG_COLORS.find((c) => c.id === id)?.hex ?? EGG_COLORS[0].hex;
}

export function lerpAngle(a: number, b: number, t: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
