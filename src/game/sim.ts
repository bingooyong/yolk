import { EGG_COLORS } from "./config";

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

export type SimWorld = {
  raceId: number;
  time: number;
  trauma: number;
  playerYaw: number;
  playerSpeed: number;
  playerDashing: boolean;
  camYaw: number;
  coinsRun: number;
  taken: Set<string>;
  racers: RacerSim[];
};

export const sim: SimWorld = {
  raceId: 0,
  time: 0,
  trauma: 0,
  playerYaw: 0,
  playerSpeed: 0,
  playerDashing: false,
  camYaw: 0,
  coinsRun: 0,
  taken: new Set(),
  racers: [],
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
  sim.coinsRun = 0;
  sim.taken = new Set();
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
