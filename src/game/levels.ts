import { SPATIAL, SPREAD_SPAWNS } from "./spatial.ts";

export type Surface = "static" | "bounce" | "conveyor" | "checkpoint" | "finish" | "ice";
export type Lane = "safe" | "side";

export type Platform = {
  id: string;
  kind: Surface;
  pos: [number, number, number];
  size: [number, number, number];
  color: string;
  conveyor?: [number, number, number];
  lane?: Lane;
};

export type Mover = {
  id: string;
  size: [number, number, number];
  color: string;
  from: [number, number, number];
  to: [number, number, number];
  period: number;
  phase: number;
};

export type Hammer = { id: string; pos: [number, number, number]; arm: number; speed: number; phase: number };
export type Spinner = { id: string; pos: [number, number, number]; arm: number; speed: number; phase: number };
export type Pendulum = { id: string; pos: [number, number, number]; length: number; speed: number; phase: number };
export type Ring = { id: string; pos: [number, number, number] };
export type Pickup = { id: string; kind: "coin" | "shield" | "jelly"; pos: [number, number, number] };
export type TrapTileDef = {
  id: string;
  pos: [number, number, number];
  size: [number, number, number];
  drops: boolean;
  delay: number;
};
export type WindZone = { id: string; pos: [number, number, number]; size: [number, number, number]; force: [number, number, number] };
export type Waypoint = { x: number; y: number; z: number; jump: boolean; dash: boolean };
export type LowGate = {
  id: string;
  pos: [number, number, number];
  size: [number, number, number];
};
export type LevelSection = {
  id: string;
  startZ: number;
  endZ: number;
  purpose: string;
  mechanics: string[];
};

export type LevelTheme = {
  id: string;
  name: string;
  blurb: string;
  stars: number;
  sky: string;
  fog: string;
  fogNear: number;
  fogFar: number;
  rail: string;
  neon: string;
  ground: string;
};

export type Level = {
  id: string;
  theme: LevelTheme;
  finishZ: number;
  startZ: number;
  bots: number;
  platforms: Platform[];
  movers: Mover[];
  hammers: Hammer[];
  spinners: Spinner[];
  pendulums: Pendulum[];
  rings: Ring[];
  pickups: Pickup[];
  traps: TrapTileDef[];
  gates: LowGate[];
  winds: WindZone[];
  checkpoints: { z: number; pos: [number, number, number] }[];
  spawns: [number, number, number][];
  waypoints: Waypoint[];
  coinCount: number;
};

function inferLane(id: string, x: number, top: number): Lane {
  if (id.startsWith("rec") || top < -0.5) return "side";
  return Math.abs(x) < 4.2 ? "safe" : "side";
}

export function platformLane(p: Platform): Lane {
  return p.lane ?? inferLane(p.id, p.pos[0], platformTop(p));
}

function plat(
  id: string,
  x: number,
  z: number,
  w: number,
  d: number,
  top: number,
  color: string,
  kind: Surface = "static",
  thick = 0.7,
  lane?: Lane,
): Platform {
  return {
    id,
    kind,
    pos: [x, top - thick / 2, z],
    size: [w, thick, d],
    color,
    lane: lane ?? inferLane(id, x, top),
  };
}

function extend(
  id: string,
  prev: Platform,
  gap: number,
  w: number,
  d: number,
  x: number,
  top: number,
  color: string,
  kind: Surface = "static",
  lane?: Lane,
): Platform {
  const prevFwd = prev.pos[2] - prev.size[2] / 2;
  const z = prevFwd - gap - d / 2;
  return plat(id, x, z, w, d, top, color, kind, 0.7, lane);
}

export function platformGap(a: Platform, b: Platform) {
  return a.pos[2] - a.size[2] / 2 - (b.pos[2] + b.size[2] / 2);
}

export function platformTop(p: Platform) {
  return p.pos[1] + p.size[1] / 2;
}

function compile(partial: Omit<Level, "waypoints" | "coinCount">): Level {
  const walk = [
    ...partial.platforms
      .filter((p) => platformLane(p) === "safe" && platformTop(p) > -0.5)
      .map((p) => ({
        x: p.pos[0],
        y: p.pos[1] + p.size[1] / 2,
        z: p.pos[2],
        d: p.size[2],
      })),
    ...partial.movers
      .filter((m) => Math.abs((m.from[0] + m.to[0]) / 2) < 4.2)
      .map((m) => ({
      x: (m.from[0] + m.to[0]) / 2,
      y: m.from[1] + m.size[1] / 2,
      z: m.from[2],
      d: m.size[2],
    })),
    ...partial.traps
      .filter((t) => !t.drops && Math.abs(t.pos[0]) < 4.2)
      .map((t) => ({
        x: t.pos[0],
        y: t.pos[1] + t.size[1] / 2,
        z: t.pos[2],
        d: t.size[2],
      })),
  ].sort((a, b) => b.z - a.z);

  const waypoints: Waypoint[] = walk.map((p, i) => {
    const next = walk[i + 1];
    let jump = false;
    let dash = false;
    if (next) {
      const gap = p.z - p.d / 2 - (next.z + next.d / 2);
      if (gap > 1.4 || next.y > p.y + 0.35) jump = true;
      if (gap > 4.4) dash = true;
    }
    return { x: p.x, y: p.y, z: p.z, jump, dash };
  });

  return {
    ...partial,
    waypoints,
    coinCount: partial.pickups.filter((p) => p.kind === "coin").length,
  };
}

export const MEADOW_GAPS = {
  connect: 0.14,
  jump: 3.45,
  pounce: 6.25,
} as const;

function meadow(): Level {
  const C = "#7ED9B8";
  const G = "#9EE7A8";
  const P = "#F3D984";
  const Rec = "#5EA882";
  const { connect: CONNECT, jump: JUMP, pounce: POUNCE } = MEADOW_GAPS;

  const start = plat("start", 0, 8, SPATIAL.start, 16, 0, P, "checkpoint");
  const path = extend("path", start, CONNECT, SPATIAL.standard, 14, 0, 0, C);
  const step1 = extend("step1", path, CONNECT, 10, 10, 0, 0, G);
  const land1 = extend("land1", step1, JUMP, 10, 9, 0, 0, C);
  const path2 = extend("path2", land1, CONNECT, 10, 16, 0, 0, P, "checkpoint");
  const rollLane = extend("rollLane", path2, CONNECT, 10, 11, 0, 0, C);
  const boostLane = extend("boostLane", rollLane, CONNECT, SPATIAL.wide, 22, 0, 0, C);
  const fork = extend("fork", boostLane, CONNECT, SPATIAL.standard, 8, 0, 0, P);
  const safeLane = extend("safeLane", fork, CONNECT, 9, 16, 0, 0, C);
  const plaza = extend("plaza", safeLane, CONNECT, SPATIAL.arena, 12, 0, 0, P, "checkpoint");
  const gapA = extend("gapA", plaza, CONNECT, 9, 8, 0, 0, G);
  const landj = extend("landj", gapA, JUMP, 9, 8, 0, 0, C);
  const final = extend("final", landj, CONNECT, SPATIAL.finish, 16, 0, 0, P, "finish");

  const pounceA = plat("pounceA", 5.6, land1.pos[2] - 4.4, 3.4, 3.2, 0.18, P);
  const pounceB = extend("pounceB", pounceA, POUNCE, 3.6, 4.0, 5.6, 0.22, G);

  const riskA = plat("riskA", 5.5, fork.pos[2] - 4, 3.8, 3.6, 0.12, P);
  const riskB = extend("riskB", riskA, JUMP, 3.8, 3.6, 5.5, 0.12, G);
  const riskC = extend("riskC", riskB, JUMP, 3.8, 4.0, 4.8, 0.1, G);

  const jumpMidZ = (step1.pos[2] - step1.size[2] / 2 + land1.pos[2] + land1.size[2] / 2) / 2;
  const recJump = plat("recJump", 0, jumpMidZ, 12, 6.4, -2.7, Rec);
  const recJump2 = plat("recJump2", -5.1, land1.pos[2], 5.2, 6, -1.45, Rec);
  const recJump3 = plat("recJump3", -5.2, land1.pos[2] - 5.4, 5.4, 4.4, -0.2, Rec);

  const pounceMidZ = (pounceA.pos[2] - pounceA.size[2] / 2 + pounceB.pos[2] + pounceB.size[2] / 2) / 2;
  const recPounce = plat("recPounce", 5.6, pounceMidZ, 4.4, 5.2, -2.7, Rec);

  const mixMidZ = (gapA.pos[2] - gapA.size[2] / 2 + landj.pos[2] + landj.size[2] / 2) / 2;
  const recMix = plat("recMix", 0, mixMidZ, 10, 5.6, -2.7, Rec);
  const recMix2 = plat("recMix2", -5.0, landj.pos[2], 5.2, 5, -1.4, Rec);

  const platforms = [
    start,
    path,
    step1,
    land1,
    path2,
    rollLane,
    boostLane,
    fork,
    safeLane,
    plaza,
    gapA,
    landj,
    final,
    pounceA,
    pounceB,
    riskA,
    riskB,
    riskC,
    recJump,
    recJump2,
    recJump3,
    recPounce,
    recMix,
    recMix2,
  ];

  const topOf = (p: Platform) => platformTop(p) + 0.9;

  return compile({
    id: "meadow",
    theme: {
      id: "meadow",
      name: "糖果草原",
      blurb: "先跳近缺口。远台跳不够，右边扑能抄。矮门要滚，直道就冲。",
      stars: 1,
      sky: "#9EE8FF",
      fog: "#B8ECFF",
      fogNear: 28,
      fogFar: 160,
      rail: "#3DCFB0",
      neon: "#FFF6A8",
      ground: "#7ED9B8",
    },
    finishZ: final.pos[2],
    startZ: start.pos[2],
    bots: 4,
    platforms,
    movers: [],
    hammers: [],
    spinners: [],
    pendulums: [],
    rings: [
      { id: "rJump", pos: [0, 1.55, jumpMidZ] },
      { id: "rPounce", pos: [5.6, 1.7, pounceMidZ] },
      { id: "rBoost", pos: [0, 1.55, boostLane.pos[2]] },
    ],
    pickups: [
      { id: "cStartL", kind: "coin", pos: [-2.2, topOf(start), start.pos[2] - 2] },
      { id: "cStartR", kind: "coin", pos: [2.2, topOf(start), start.pos[2] - 2] },
      { id: "cJump", kind: "coin", pos: [0, 1.35, jumpMidZ] },
      { id: "cPounceA", kind: "coin", pos: [5.6, 1.25, pounceA.pos[2]] },
      { id: "cPounceB", kind: "coin", pos: [5.6, 1.3, pounceB.pos[2]] },
      { id: "cRoll", kind: "coin", pos: [0, topOf(rollLane), rollLane.pos[2]] },
      { id: "cBoost1", kind: "coin", pos: [0, topOf(boostLane), boostLane.pos[2] + 6] },
      { id: "cBoost2", kind: "coin", pos: [0, topOf(boostLane), boostLane.pos[2]] },
      { id: "cBoost3", kind: "coin", pos: [0, topOf(boostLane), boostLane.pos[2] - 6] },
      { id: "cSafe", kind: "coin", pos: [0, topOf(safeLane), safeLane.pos[2]] },
      { id: "cRisk", kind: "coin", pos: [5.5, 1.25, riskA.pos[2]] },
      { id: "sRisk", kind: "shield", pos: [5.5, 1.2, riskB.pos[2]] },
      { id: "cMix", kind: "coin", pos: [0, 1.35, mixMidZ] },
    ],
    traps: [],
    gates: [
      { id: "gateRoll", pos: [0, 1.55, rollLane.pos[2]], size: [11.4, 3.4, 0.85] },
      { id: "gateMix", pos: [0, 1.55, landj.pos[2] - 1.1], size: [10.4, 3.4, 0.85] },
    ],
    winds: [],
    checkpoints: [
      { z: 6, pos: [0, 0.7, 6] },
      { z: path2.pos[2] + 2, pos: [0, 0.7, path2.pos[2] + 2] },
      { z: plaza.pos[2] + 2, pos: [0, 0.7, plaza.pos[2] + 2] },
    ],
    spawns: SPREAD_SPAWNS.slice(0, 5),
  });
}

export const MEADOW_SECTIONS: LevelSection[] = [
  { id: "intro", startZ: 16, endZ: -16, purpose: "move", mechanics: ["move"] },
  { id: "jump", startZ: -16, endZ: -36, purpose: "teach jump", mechanics: ["jump"] },
  { id: "pounce", startZ: -36, endZ: -58, purpose: "pounce shortcut", mechanics: ["pounce"] },
  { id: "roll", startZ: -58, endZ: -72, purpose: "teach roll", mechanics: ["roll"] },
  { id: "boost", startZ: -72, endZ: -96, purpose: "teach boost", mechanics: ["boost"] },
  { id: "split", startZ: -96, endZ: -120, purpose: "safe vs risk", mechanics: ["jump"] },
  { id: "mix", startZ: -120, endZ: -140, purpose: "jump then roll", mechanics: ["jump", "roll"] },
  { id: "finale", startZ: -140, endZ: -160, purpose: "sprint", mechanics: ["boost"] },
];

export const ICE_GAPS = {
  connect: 0.14,
  jump: 2.2,
} as const;

function ice(): Level {
  const I = "#C8E8FF";
  const S = "#8EC8F0";
  const D = "#5BAFE0";
  const Rec = "#7AA8C8";
  const { connect: CONNECT, jump: JUMP } = ICE_GAPS;

  const start = plat("start", 0, 8, SPATIAL.start, 16, 0, S, "checkpoint");
  const ice1 = extend("ice1", start, CONNECT, SPATIAL.standard, 18, 0, 0, I, "ice");
  const gap = extend("gap", ice1, CONNECT, 8.8, 12, 0, 0, I, "ice");
  const ice2 = extend("ice2", gap, JUMP, 9, 10, 0, 0, I, "ice");
  const lane = extend("lane", ice2, CONNECT, 10, 8, 0, 0, I, "ice");
  const tongue = extend("tongue", lane, CONNECT, 6.4, 16, 0, 0, I, "ice");
  const mid = extend("mid", tongue, CONNECT, SPATIAL.arena, 10, 0, 0, S, "checkpoint");
  const water = extend("water", mid, CONNECT, 8, 8, 0, 0, I, "ice");
  const land = extend("land", water, JUMP, 9, 8, 0, 0, S);
  const slide = extend("slide", land, CONNECT, 6.5, 14, 0, -0.4, I, "ice");
  const land2 = extend("land2", slide, CONNECT, 9, 8, 0, 0, S);
  const final = extend("final", land2, CONNECT, SPATIAL.finish, 14, 0, 0, D, "finish");

  const crackR = extend("crackR", lane, CONNECT, 3.8, 10, 5.5, 0, I, "ice");
  const crackR2 = extend("crackR2", crackR, JUMP, 3.8, 4.2, 5.2, 0, I, "ice");

  const jumpMidZ = (gap.pos[2] - gap.size[2] / 2 + ice2.pos[2] + ice2.size[2] / 2) / 2;
  const recIce = plat("recIce", 0, jumpMidZ, 14, 8, -2.5, Rec);
  const recIce2 = plat("recIce2", -5.1, ice2.pos[2], 5.2, 6, -1.45, Rec);
  const recIce3 = plat("recIce3", -5.2, ice2.pos[2] - 5.2, 5.4, 4.2, -0.2, Rec);

  const crackL = plat("crackL", -5.3, tongue.pos[2], 5.2, 14, -2.7, Rec);

  const waterMidZ = (water.pos[2] - water.size[2] / 2 + land.pos[2] + land.size[2] / 2) / 2;
  const recWater = plat("recWater", 0, waterMidZ, 12, 7, -2.5, Rec);
  const recWater2 = plat("recWater2", -5.0, land.pos[2], 5.2, 5, -1.4, Rec);

  const landBack = land.pos[2] + land.size[2] / 2;
  const crackFwd = crackR.pos[2] - crackR.size[2] / 2;

  const platforms = [
    start,
    ice1,
    gap,
    ice2,
    lane,
    tongue,
    mid,
    water,
    land,
    slide,
    land2,
    final,
    crackR,
    crackR2,
    crackL,
    recIce,
    recIce2,
    recIce3,
    recWater,
    recWater2,
  ];

  const topOf = (p: Platform) => platformTop(p) + 0.9;

  return compile({
    id: "ice",
    theme: {
      id: "ice",
      name: "冰雪滑坡",
      blurb: "冰面很滑。提前改方向。裂缝别急转，浮冰能抄近路。",
      stars: 2,
      sky: "#D8F0FF",
      fog: "#E8F6FF",
      fogNear: 24,
      fogFar: 150,
      rail: "#8EC8F0",
      neon: "#FFFFFF",
      ground: "#C8E8FF",
    },
    finishZ: final.pos[2],
    startZ: start.pos[2],
    bots: 5,
    platforms,
    movers: [
      {
        id: "floe",
        size: [4.0, 0.55, 4.0],
        color: "#E8F6FF",
        from: [5.6, -0.05, crackFwd],
        to: [5.6, -0.05, landBack + 0.2],
        period: 6.4,
        phase: 0,
      },
    ],
    hammers: [],
    spinners: [],
    pendulums: [],
    rings: [
      { id: "rIce", pos: [0, 1.5, jumpMidZ] },
      { id: "rSlide", pos: [0, 1.45, slide.pos[2]] },
    ],
    pickups: [
      { id: "cIce1", kind: "coin", pos: [0, topOf(ice1), ice1.pos[2]] },
      { id: "cGap", kind: "coin", pos: [0, topOf(gap), gap.pos[2]] },
      { id: "cJump", kind: "coin", pos: [0, 1.35, jumpMidZ] },
      { id: "cTongue", kind: "coin", pos: [0, topOf(tongue), tongue.pos[2]] },
      { id: "cRisk", kind: "coin", pos: [5.5, 1.25, crackR.pos[2]] },
      { id: "sRisk", kind: "shield", pos: [5.5, 1.2, crackR2.pos[2]] },
      { id: "cFloe", kind: "coin", pos: [5.6, 1.25, waterMidZ] },
      { id: "cSlide", kind: "coin", pos: [0, topOf(slide) + 0.15, slide.pos[2]] },
    ],
    traps: [],
    gates: [],
    winds: [],
    checkpoints: [
      { z: 6, pos: [0, 0.7, 6] },
      { z: mid.pos[2] + 2, pos: [0, 0.7, mid.pos[2] + 2] },
      { z: land2.pos[2] + 2, pos: [0, 0.7, land2.pos[2] + 2] },
    ],
    spawns: SPREAD_SPAWNS,
  });
}

export const ICE_SECTIONS: LevelSection[] = [
  { id: "intro", startZ: 16, endZ: -20, purpose: "feel ice", mechanics: ["move", "ice"] },
  { id: "narrow", startZ: -20, endZ: -45, purpose: "stay centered then jump", mechanics: ["ice", "jump"] },
  { id: "crack", startZ: -45, endZ: -90, purpose: "tongue vs risk", mechanics: ["ice"] },
  { id: "water", startZ: -90, endZ: -110, purpose: "jump or floe", mechanics: ["jump"] },
  { id: "slide", startZ: -110, endZ: -130, purpose: "ice then step up", mechanics: ["ice", "jump"] },
  { id: "finale", startZ: -130, endZ: -160, purpose: "sprint", mechanics: ["move"] },
];

export const FACTORY_GAPS = {
  connect: 0.14,
  jump: 3.45,
} as const;

function factory(): Level {
  const M = "#8A9BB0";
  const Y = "#E8C85A";
  const D = "#6A7A90";
  const Rec = "#5A6A7C";
  const { connect: CONNECT, jump: JUMP } = FACTORY_GAPS;

  const start = plat("start", 0, 8, SPATIAL.start, 16, 0, Y, "checkpoint");
  const intro = extend("intro", start, CONNECT, SPATIAL.standard, 16, 0, 0, M);
  const ham1 = extend("ham1", intro, CONNECT, 7.2, 14, 0, 0, D);
  const safe1 = extend("safe1", ham1, CONNECT, SPATIAL.wide, 10, 0, 0, Y);
  const hall2 = extend("hall2", safe1, CONNECT, SPATIAL.standard, 14, 0, 0, M);
  const ham2a = extend("ham2a", hall2, CONNECT, 7.2, 10, 0, 0, D);
  const ham2b = extend("ham2b", ham2a, CONNECT, 7.2, 10, 0, 0, D);
  const mid = extend("mid", ham2b, CONNECT, SPATIAL.arena, 12, 0, 0, Y, "checkpoint");
  const gap = extend("gap", mid, CONNECT, 8, 10, 0, 0, M);
  const land = extend("land", gap, JUMP, 9, 8, 0, 0, Y);
  const finale = extend("finale", land, CONNECT, 7.4, 12, 0, 0, D);
  const final = extend("final", finale, CONNECT, SPATIAL.finish, 14, 0, 0, Y, "finish");

  const catA = plat("catA", 5.5, ham2a.pos[2], 3.8, 8, 0, Y);
  const catB = extend("catB", catA, JUMP, 3.8, 10, 5.5, 0, Y);

  const recHam1 = plat("recHam1", 0, ham1.pos[2], 12, 12, -2.5, Rec);
  const recHam1b = plat("recHam1b", -5.2, safe1.pos[2], 5.2, 6, -1.4, Rec);
  const recHam1c = plat("recHam1c", -5.2, safe1.pos[2] - 3.2, 5.4, 4.2, -0.2, Rec);

  const ham2MidZ = (ham2a.pos[2] + ham2b.pos[2]) / 2;
  const recHam2 = plat("recHam2", 0, ham2MidZ, 12, 16, -2.5, Rec);
  const recHam2b = plat("recHam2b", -5.2, mid.pos[2], 5.2, 6, -1.4, Rec);
  const recHam2c = plat("recHam2c", -5.2, mid.pos[2] - 3.2, 5.4, 4.2, -0.2, Rec);

  const jumpMidZ = (gap.pos[2] - gap.size[2] / 2 + land.pos[2] + land.size[2] / 2) / 2;
  const recJump = plat("recJump", 0, jumpMidZ, 12, 8, -2.5, Rec);
  const recJump2 = plat("recJump2", -5.0, land.pos[2], 5.2, 5, -1.4, Rec);

  const platforms = [
    start,
    intro,
    ham1,
    safe1,
    hall2,
    ham2a,
    ham2b,
    mid,
    gap,
    land,
    finale,
    final,
    catA,
    catB,
    recHam1,
    recHam1b,
    recHam1c,
    recHam2,
    recHam2b,
    recHam2c,
    recJump,
    recJump2,
  ];

  const topOf = (p: Platform) => platformTop(p) + 0.9;

  return compile({
    id: "factory",
    theme: {
      id: "factory",
      name: "旋转工厂",
      blurb: "锤子按节奏转。看空隙，再过。不要慌。",
      stars: 3,
      sky: "#7A90A8",
      fog: "#8AA0B8",
      fogNear: 24,
      fogFar: 150,
      rail: "#E8C85A",
      neon: "#FFD36A",
      ground: "#6A7A90",
    },
    finishZ: final.pos[2],
    startZ: start.pos[2],
    bots: 5,
    platforms,
    movers: [],
    hammers: [
      { id: "h1", pos: [0, 1.15, ham1.pos[2]], arm: 3.0, speed: 0.85, phase: 0 },
      { id: "h2a", pos: [0, 1.15, ham2a.pos[2]], arm: 3.0, speed: 1.05, phase: 0 },
      { id: "h2b", pos: [0, 1.15, ham2b.pos[2]], arm: 3.0, speed: 1.05, phase: 1.25 },
      { id: "h3", pos: [0, 1.15, finale.pos[2]], arm: 3.0, speed: 1.15, phase: 0.4 },
    ],
    spinners: [],
    pendulums: [],
    rings: [
      { id: "rHam1", pos: [0, 1.55, ham1.pos[2] + 4] },
      { id: "rJump", pos: [0, 1.55, jumpMidZ] },
    ],
    pickups: [
      { id: "cIntro", kind: "coin", pos: [0, topOf(intro), intro.pos[2]] },
      { id: "cHam1L", kind: "coin", pos: [-2.2, topOf(ham1), ham1.pos[2]] },
      { id: "cHam1R", kind: "coin", pos: [2.2, topOf(ham1), ham1.pos[2]] },
      { id: "cSafe", kind: "coin", pos: [0, topOf(safe1), safe1.pos[2]] },
      { id: "cCat", kind: "coin", pos: [5.5, 1.25, catA.pos[2]] },
      { id: "sCat", kind: "shield", pos: [5.5, 1.2, catB.pos[2]] },
      { id: "cHam2", kind: "coin", pos: [2.2, topOf(ham2a), ham2a.pos[2]] },
      { id: "cJump", kind: "coin", pos: [0, 1.35, jumpMidZ] },
      { id: "cFinale", kind: "coin", pos: [0, topOf(finale), finale.pos[2] - 3] },
    ],
    traps: [],
    gates: [],
    winds: [],
    checkpoints: [
      { z: 6, pos: [0, 0.7, 6] },
      { z: mid.pos[2] + 2, pos: [0, 0.7, mid.pos[2] + 2] },
      { z: land.pos[2] + 2, pos: [0, 0.7, land.pos[2] + 2] },
    ],
    spawns: SPREAD_SPAWNS,
  });
}

export const FACTORY_SECTIONS: LevelSection[] = [
  { id: "intro", startZ: 16, endZ: -16, purpose: "see the hammer", mechanics: ["move"] },
  { id: "ham1", startZ: -16, endZ: -40, purpose: "one wait-window", mechanics: ["hammer"] },
  { id: "ham2", startZ: -40, endZ: -80, purpose: "rhythm pair or catwalk", mechanics: ["hammer"] },
  { id: "jump", startZ: -80, endZ: -110, purpose: "jump after the lesson", mechanics: ["jump"] },
  { id: "finale", startZ: -110, endZ: -160, purpose: "last window then sprint", mechanics: ["hammer"] },
];


export const SKY_GAPS = {
  connect: 0.14,
  jump: 3.45,
  pounce: 6.25,
} as const;

function skyJump(): Level {
  const B = "#5BAFE0";
  const W = "#FFF6EB";
  const P = "#E08AA4";
  const Rec = "#4A8BB8";
  const { connect: CONNECT, jump: JUMP, pounce: POUNCE } = SKY_GAPS;

  const start = plat("start", 0, 8, SPATIAL.start, 16, 0, W, "checkpoint");
  const intro = extend("intro", start, CONNECT, SPATIAL.standard, 10, 0, 0, B);
  const land1 = extend("land1", intro, JUMP, SPATIAL.standard, 10, 2.4, 0, B);
  const jelly = extend("jelly", land1, CONNECT, SPATIAL.wide, 8, 3.8, 0, P, "bounce");
  const isle2 = extend("isle2", jelly, JUMP, 10, 10, 2.2, 0, B);
  const mid = extend("mid", isle2, CONNECT, SPATIAL.arena, 16, 0, 0, W, "checkpoint");
  const hopA = extend("hopA", mid, CONNECT, 10, 10, -3.6, 0, B);
  const hopB = extend("hopB", hopA, JUMP, SPATIAL.narrow, 10, -6.0, 0, B, "static", "safe");
  const hopC = extend("hopC", hopB, JUMP, SPATIAL.wide, 14, -2.4, 0, B);
  const jelly2 = extend("jelly2", hopC, JUMP, SPATIAL.wide, 8, 0, 0, P, "bounce");
  const land2 = extend("land2", jelly2, JUMP, SPATIAL.standard, 10, 0, 0, B);
  const final = extend("final", land2, CONNECT, SPATIAL.finish, 18, 0, 0, W, "finish");

  const HIGH_X = jelly.pos[0] + jelly.size[0] / 2 + 1.8;
  const highA = plat("highA", HIGH_X, jelly.pos[2] - 4.6, SPATIAL.shortcut, 12, 1.55, P);
  const highB = extend("highB", highA, POUNCE, SPATIAL.shortcut, 6.0, HIGH_X, 1.55, W);
  const highFin = plat("highFin", HIGH_X, jelly2.pos[2] - 4.6, SPATIAL.shortcut, 12, 1.55, P);
  const highFin2 = extend("highFin2", highFin, POUNCE, SPATIAL.shortcut, 6.0, HIGH_X, 1.55, W);

  const stairX = (land: Platform) => land.pos[0] - land.size[0] / 2 - 2.6;

  const jumpMidZ = (intro.pos[2] - intro.size[2] / 2 + land1.pos[2] + land1.size[2] / 2) / 2;
  const recJump = plat("recJump", land1.pos[0], land1.pos[2] + 2, SPATIAL.recovery, 14, -2.5, Rec, "static", 1.2);
  const recJump2 = plat("recJump2", stairX(land1), land1.pos[2], 5.2, 6, -1.4, Rec);
  const recJump3 = plat("recJump3", stairX(land1) - 0.2, land1.pos[2] - 3.2, 5.4, 4.2, -0.2, Rec);

  const recJelly = plat("recJelly", isle2.pos[0], isle2.pos[2] + 2, 22, 14, -2.5, Rec, "static", 1.2);
  const recJelly2 = plat("recJelly2", stairX(isle2), isle2.pos[2], 5.2, 6, -1.4, Rec);
  const recJelly3 = plat("recJelly3", stairX(isle2) - 0.2, isle2.pos[2] - 3.2, 5.4, 4.2, -0.2, Rec);

  const hopMidZ = (hopA.pos[2] - hopA.size[2] / 2 + hopC.pos[2] + hopC.size[2] / 2) / 2;
  const recHopBack = hopA.pos[2] - hopA.size[2] / 2 + 2;
  const recHopFront = jelly2.pos[2] + jelly2.size[2] / 2;
  const recHop = plat(
    "recHop",
    (hopA.pos[0] + hopC.pos[0]) / 2,
    (recHopBack + recHopFront) / 2,
    22,
    recHopBack - recHopFront,
    -2.5,
    Rec,
    "static",
    1.2,
  );
  const recHop2 = plat("recHop2", stairX(hopC), hopC.pos[2], 5.2, 6, -1.4, Rec);
  const recHop3 = plat("recHop3", stairX(hopC) - 0.2, hopC.pos[2] - 3.2, 5.4, 4.2, -0.2, Rec);

  const recFin = plat("recFin", land2.pos[0], land2.pos[2] - 4, 22, 28, -2.5, Rec, "static", 1.2);
  const recFin2 = plat("recFin2", stairX(land2), land2.pos[2], 5.2, 6, -1.4, Rec);
  const recFin3 = plat("recFin3", stairX(land2) - 0.2, land2.pos[2] - 3.2, 5.4, 4.2, -0.2, Rec);

  const platforms = [
    start,
    intro,
    land1,
    jelly,
    isle2,
    mid,
    hopA,
    hopB,
    hopC,
    jelly2,
    land2,
    final,
    highA,
    highB,
    highFin,
    highFin2,
    recJump,
    recJump2,
    recJump3,
    recJelly,
    recJelly2,
    recJelly3,
    recHop,
    recHop2,
    recHop3,
    recFin,
    recFin2,
    recFin3,
  ];

  const topOf = (p: Platform) => platformTop(p) + 0.9;

  return compile({
    id: "sky",
    theme: {
      id: "sky",
      name: "天空弹跳岛",
      blurb: "果冻把你弹起来。看清落点再跳。高岛有金币，低岛稳。",
      stars: 3,
      sky: "#8FD4F8",
      fog: "#C8ECFF",
      fogNear: 40,
      fogFar: 170,
      rail: "#E08AA4",
      neon: "#FFFFFF",
      ground: "#5BAFE0",
    },
    finishZ: final.pos[2],
    startZ: start.pos[2],
    bots: 5,
    platforms,
    movers: [],
    hammers: [],
    spinners: [],
    pendulums: [],
    rings: [
      { id: "rJump", pos: [1.2, 1.55, jumpMidZ] },
      { id: "rHop", pos: [hopB.pos[0], 1.55, hopMidZ] },
      { id: "rHigh", pos: [HIGH_X, 3.2, highA.pos[2]] },
      { id: "rMid", pos: [6, 1.55, mid.pos[2]] },
      { id: "rFin", pos: [0, 1.55, final.pos[2] + 4] },
    ],
    pickups: [
      { id: "cIntro", kind: "coin", pos: [0, topOf(intro), intro.pos[2]] },
      { id: "cLand1", kind: "coin", pos: [land1.pos[0], topOf(land1), land1.pos[2]] },
      { id: "cJellyR", kind: "coin", pos: [jelly.pos[0] + 4.6, topOf(jelly), jelly.pos[2] - 1.2] },
      { id: "cHighA", kind: "coin", pos: [HIGH_X, topOf(highA), highA.pos[2]] },
      { id: "sHigh", kind: "shield", pos: [HIGH_X, topOf(highB), highB.pos[2]] },
      { id: "cIsle2", kind: "coin", pos: [isle2.pos[0], topOf(isle2), isle2.pos[2]] },
      { id: "cMidL", kind: "coin", pos: [-6, topOf(mid), mid.pos[2] + 2] },
      { id: "cMidR", kind: "coin", pos: [6, topOf(mid), mid.pos[2] - 2] },
      { id: "cHopB", kind: "coin", pos: [hopB.pos[0], topOf(hopB), hopB.pos[2]] },
      { id: "cHighFin", kind: "coin", pos: [HIGH_X, topOf(highFin), highFin.pos[2]] },
      { id: "cHighFin2", kind: "coin", pos: [HIGH_X, topOf(highFin2), highFin2.pos[2]] },
      { id: "cLand2", kind: "coin", pos: [0, topOf(land2), land2.pos[2]] },
    ],
    traps: [],
    gates: [{ id: "gateCloud", pos: [hopC.pos[0], 1.55, hopC.pos[2] + hopC.size[2] / 2 - 5.5], size: [11.0, 3.4, 0.85] }],
    winds: [],
    checkpoints: [
      { z: 6, pos: [0, 0.7, 6] },
      { z: mid.pos[2] + 2, pos: [0, 0.7, mid.pos[2] + 2] },
      { z: hopC.pos[2] + 2, pos: [hopC.pos[0], 0.7, hopC.pos[2] + 2] },
    ],
    spawns: SPREAD_SPAWNS,
  });
}

export const SKY_SECTIONS: LevelSection[] = [
  { id: "intro", startZ: 16, endZ: -24, purpose: "islands not a road", mechanics: ["jump"] },
  { id: "jelly", startZ: -24, endZ: -56, purpose: "bounce then choose landing", mechanics: ["bounce"] },
  { id: "high", startZ: -24, endZ: -56, purpose: "right-side bounce then pounce", mechanics: ["pounce"] },
  { id: "arena", startZ: -56, endZ: -72, purpose: "wide plaza, left mid right", mechanics: ["boost"] },
  { id: "hops", startZ: -72, endZ: -110, purpose: "narrow commit, roll cloud, relief", mechanics: ["jump", "roll"] },
  { id: "finale", startZ: -110, endZ: -170, purpose: "last bounce then boost sprint", mechanics: ["bounce", "boost"] },
];


export const PIRATE_GAPS = {
  connect: 0.14,
  jump: 3.45,
  drop: 3.45,
} as const;

function pirate(): Level {
  const Wd = "#C4A574";
  const Flag = "#E8614A";
  const Rec = "#2E5A8A";
  const { connect: CONNECT, jump: JUMP, drop: DROP } = PIRATE_GAPS;

  const start = plat("start", 0, 8, SPATIAL.start, 16, 0, Flag, "checkpoint");
  const intro = extend("intro", start, CONNECT, 11, 10, 0, 0, Wd);
  const land1 = extend("land1", intro, DROP, 11, 10, 0, 0, Wd);
  const lane = extend("lane", land1, CONNECT, 6.2, 12, 0, 0, Wd);
  const safe1 = extend("safe1", lane, CONNECT, SPATIAL.wide, 10, 0, 0, Flag);
  const ship1 = extend("ship1", safe1, CONNECT, SPATIAL.standard, 10, 0, 0, Wd);
  const ship2 = extend("ship2", ship1, JUMP, SPATIAL.standard, 10, 0, 0, Wd);
  const mid = extend("mid", ship2, CONNECT, SPATIAL.arena, 12, 0, 0, Flag, "checkpoint");
  const gap = extend("gap", mid, CONNECT, 8, 10, 0, 0, Wd);
  const land2 = extend("land2", gap, CONNECT, SPATIAL.standard, 10, 0, 0, Wd);
  const finale = extend("finale", land2, CONNECT, SPATIAL.standard, 10, 0, 0, Wd);
  const final = extend("final", finale, JUMP, SPATIAL.finish, 18, 0, 0, Flag, "finish");

  const recPit1 = plat("recPit1", 0, land1.pos[2] + 2, 12, 14, -2.5, Rec, "static", 1.2);
  const recPit1b = plat("recPit1b", 5.2, land1.pos[2], 5.2, 6, -1.4, Rec);
  const recPit1c = plat("recPit1c", 5.2, land1.pos[2] - 3.2, 5.4, 4.2, -0.2, Rec);

  const recShips = plat("recShips", 0, ship2.pos[2] + 2, 12, 14, -2.5, Rec, "static", 1.2);
  const recShipsb = plat("recShipsb", 5.2, ship2.pos[2], 5.2, 6, -1.4, Rec);
  const recShipsc = plat("recShipsc", 5.2, ship2.pos[2] - 3.2, 5.4, 4.2, -0.2, Rec);

  const recFin = plat("recFin", 0, finale.pos[2] - 6, 12, 16, -2.5, Rec, "static", 1.2);
  const recFin2 = plat("recFin2", 5.2, final.pos[2], 5.2, 6, -1.4, Rec);
  const recFin3 = plat("recFin3", 5.2, final.pos[2] - 3.2, 5.4, 4.2, -0.2, Rec);

  const TILE: [number, number, number] = [2.05, 0.44, 2.05];
  const TEACH = 0;
  const RUN = 0.52;
  const PIER_X = -5.5;
  const drop = (id: string, x: number, z: number, delay: number): TrapTileDef => ({
    id,
    pos: [x, -0.22, z],
    size: TILE,
    drops: true,
    delay,
  });
  const pitRows = (prefix: string, a: Platform, _b: Platform, delay: number): TrapTileDef[] => {
    const aFront = a.pos[2] - a.size[2] / 2;
    const z = aFront - 0.14 - 1.025;
    return [-2.2, 0, 2.2].map((x, ci) => drop(`${prefix}0${ci}`, x, z, delay));
  };
  const pitPier = (prefix: string, a: Platform, b: Platform): TrapTileDef[] => {
    const mid = (a.pos[2] - a.size[2] / 2 + b.pos[2] + b.size[2] / 2) / 2;
    return [3, 1, -1, -3].map((o, i) => drop(`${prefix}${i}`, PIER_X, mid + o, RUN));
  };
  const lanePier = (): TrapTileDef[] => {
    const z0 = lane.pos[2] + 3;
    return [0, 1, 2, 3].map((i) => drop(`laneL${i}`, PIER_X, z0 - i * 2.0, RUN));
  };

  const traps: TrapTileDef[] = [
    ...pitRows("p1", intro, land1, TEACH),
    ...pitPier("p1L", intro, land1),
    ...lanePier(),
    ...pitPier("shL", ship1, ship2),
    ...pitPier("fnL", finale, final),
  ];

  const pit1MidZ = (intro.pos[2] - intro.size[2] / 2 + land1.pos[2] + land1.size[2] / 2) / 2;
  const shipMidZ = (ship1.pos[2] - ship1.size[2] / 2 + ship2.pos[2] + ship2.size[2] / 2) / 2;
  const finMidZ = (finale.pos[2] - finale.size[2] / 2 + final.pos[2] + final.size[2] / 2) / 2;

  const platforms = [
    start,
    intro,
    land1,
    lane,
    safe1,
    ship1,
    ship2,
    mid,
    gap,
    land2,
    finale,
    final,
    recPit1,
    recPit1b,
    recPit1c,
    recShips,
    recShipsb,
    recShipsc,
    recFin,
    recFin2,
    recFin3,
  ];

  const topOf = (p: Platform) => platformTop(p) + 0.9;

  return compile({
    id: "pirate",
    theme: {
      id: "pirate",
      name: "海盗港湾",
      blurb: "条纹木板会塌。看见就跳，或者跑左边抄近路。不要停。",
      stars: 4,
      sky: "#7EC8E3",
      fog: "#8FD4F0",
      fogNear: 22,
      fogFar: 150,
      rail: "#C4A574",
      neon: "#E8C85A",
      ground: "#2B6BEE",
    },
    finishZ: final.pos[2],
    startZ: start.pos[2],
    bots: 5,
    platforms,
    movers: [],
    hammers: [],
    spinners: [],
    pendulums: [],
    rings: [
      { id: "rPit1", pos: [0, 1.55, pit1MidZ] },
      { id: "rShips", pos: [0, 1.55, shipMidZ] },
    ],
    pickups: [
      { id: "cIntro", kind: "coin", pos: [0, topOf(intro), intro.pos[2]] },
      { id: "cLand1", kind: "coin", pos: [0, topOf(land1), land1.pos[2]] },
      { id: "cPitL", kind: "coin", pos: [PIER_X, 0.9, pit1MidZ] },
      { id: "cLaneL", kind: "coin", pos: [PIER_X, 0.9, lane.pos[2]] },
      { id: "cSafe", kind: "coin", pos: [0, topOf(safe1), safe1.pos[2]] },
      { id: "cShipL", kind: "coin", pos: [PIER_X, 0.9, shipMidZ + 1.2] },
      { id: "sShipL", kind: "shield", pos: [PIER_X, 0.9, shipMidZ - 1.2] },
      { id: "cShip2", kind: "coin", pos: [0, topOf(ship2), ship2.pos[2]] },
      { id: "cFinL", kind: "coin", pos: [PIER_X, 0.9, finMidZ] },
      { id: "cFinale", kind: "coin", pos: [0, topOf(finale), finale.pos[2]] },
    ],
    traps,
    gates: [],
    winds: [],
    checkpoints: [
      { z: 6, pos: [0, 0.7, 6] },
      { z: safe1.pos[2] + 2, pos: [0, 0.7, safe1.pos[2] + 2] },
      { z: mid.pos[2] + 2, pos: [0, 0.7, mid.pos[2] + 2] },
    ],
    spawns: SPREAD_SPAWNS,
  });
}

export const PIRATE_SECTIONS: LevelSection[] = [
  { id: "intro", startZ: 16, endZ: -20, purpose: "see the stripes", mechanics: ["move"] },
  { id: "pit1", startZ: -20, endZ: -40, purpose: "first collapse", mechanics: ["drop"] },
  { id: "lane", startZ: -40, endZ: -60, purpose: "stripes beside the dock", mechanics: ["drop"] },
  { id: "ships", startZ: -60, endZ: -90, purpose: "shortcut between boats", mechanics: ["drop", "jump"] },
  { id: "dock", startZ: -90, endZ: -110, purpose: "wood rest after the boats", mechanics: ["move"] },
  { id: "finale", startZ: -110, endZ: -160, purpose: "last water jump then sprint", mechanics: ["jump"] },
];

export const DESSERT_GAPS = {
  connect: 0.14,
  jump: 3.45,
} as const;

function dessert(): Level {
  const Ch = "#8B5A2B";
  const Ca = "#F3D984";
  const Rec = "#C47890";
  const { connect: CONNECT, jump: JUMP } = DESSERT_GAPS;

  const start = plat("start", 0, 8, SPATIAL.start, 16, 0, Ca, "checkpoint");
  const intro = extend("intro", start, CONNECT, SPATIAL.standard, 10, 0, 0, Ca);
  const choco1 = extend("choco1", intro, CONNECT, SPATIAL.standard, 14, 0, 0, Ch, "ice");
  const cake1 = extend("cake1", choco1, CONNECT, SPATIAL.standard, 10, 0, 0, Ca);
  const land1 = extend("land1", cake1, JUMP, SPATIAL.standard, 10, 0, 0, Ca);
  const mid = extend("mid", land1, CONNECT, SPATIAL.arena, 12, 0, 0, Ca, "checkpoint");
  const choco2 = extend("choco2", mid, CONNECT, SPATIAL.standard, 22, 0, 0, Ch, "ice");
  const cake2 = extend("cake2", choco2, CONNECT, SPATIAL.standard, 10, 0, 0, Ca);
  const finale = extend("finale", cake2, JUMP, SPATIAL.standard, 10, 0, 0, Ca);
  const final = extend("final", finale, CONNECT, SPATIAL.finish, 16, 0, 0, Ca, "finish");

  const pit1Mid = (cake1.pos[2] - cake1.size[2] / 2 + land1.pos[2] + land1.size[2] / 2) / 2;
  const syrup = plat(
    "syrup",
    6.8,
    (cake1.pos[2] + land1.pos[2]) / 2,
    5.2,
    Math.abs(cake1.pos[2] - land1.pos[2]) + 8,
    0,
    Ch,
    "ice",
  );

  const stairX = (land: Platform) => land.pos[0] - land.size[0] / 2 - 2.6;
  const recJump = plat("recJump", 0, land1.pos[2] + 2, SPATIAL.recovery, 14, -2.5, Rec, "static", 1.2);
  const recJump2 = plat("recJump2", stairX(land1), land1.pos[2], 5.2, 6, -1.4, Rec);
  const recJump3 = plat("recJump3", stairX(land1) - 0.2, land1.pos[2] - 3.2, 5.4, 4.2, -0.2, Rec);

  const recFin = plat("recFin", 0, finale.pos[2] + 2, SPATIAL.recovery, 16, -2.5, Rec, "static", 1.2);
  const recFin2 = plat("recFin2", stairX(finale), finale.pos[2], 5.2, 6, -1.4, Rec);
  const recFin3 = plat("recFin3", stairX(finale) - 0.2, finale.pos[2] - 3.2, 5.4, 4.2, -0.2, Rec);

  const platforms = [
    start,
    intro,
    choco1,
    cake1,
    land1,
    mid,
    choco2,
    cake2,
    finale,
    final,
    syrup,
    recJump,
    recJump2,
    recJump3,
    recFin,
    recFin2,
    recFin3,
  ];

  const topOf = (p: Platform) => platformTop(p) + 0.9;
  const gateZ = (p: Platform) => p.pos[2] + p.size[2] / 2 - 5.5;

  return compile({
    id: "dessert",
    theme: {
      id: "dessert",
      name: "甜品工厂",
      blurb: "巧克力会滑。滚过去、冲过去，别在上面慢慢走。",
      stars: 4,
      sky: "#F7C9D8",
      fog: "#F8D8E4",
      fogNear: 28,
      fogFar: 160,
      rail: "#E08AA4",
      neon: "#FFF6A8",
      ground: "#F3D984",
    },
    finishZ: final.pos[2],
    startZ: start.pos[2],
    bots: 6,
    platforms,
    movers: [],
    hammers: [],
    spinners: [],
    pendulums: [],
    rings: [
      { id: "rBoost", pos: [0, 1.55, choco2.pos[2]] },
      { id: "rSyrup", pos: [6.8, 1.55, pit1Mid] },
    ],
    pickups: [
      { id: "cIntro", kind: "coin", pos: [0, topOf(intro), intro.pos[2]] },
      { id: "cChoco1", kind: "coin", pos: [0, topOf(choco1), choco1.pos[2]] },
      { id: "cCake1", kind: "coin", pos: [0, topOf(cake1), cake1.pos[2]] },
      { id: "cSyrup", kind: "coin", pos: [6.8, topOf(syrup), pit1Mid] },
      { id: "sSyrup", kind: "shield", pos: [6.8, topOf(syrup), syrup.pos[2] - 3] },
      { id: "cMid", kind: "coin", pos: [0, topOf(mid), mid.pos[2]] },
      { id: "cChoco2", kind: "coin", pos: [0, topOf(choco2), choco2.pos[2]] },
      { id: "cCake2", kind: "coin", pos: [0, topOf(cake2), cake2.pos[2]] },
      { id: "cFinale", kind: "coin", pos: [0, topOf(finale), finale.pos[2]] },
    ],
    traps: [],
    gates: [
      { id: "gateSyrup1", pos: [0, 1.55, gateZ(choco1)], size: [12.2, 3.4, 0.85] },
      { id: "gateSyrup2", pos: [0, 1.55, gateZ(choco2)], size: [12.2, 3.4, 0.85] },
    ],
    winds: [],
    checkpoints: [
      { z: 6, pos: [0, 0.7, 6] },
      { z: land1.pos[2] + 2, pos: [0, 0.7, land1.pos[2] + 2] },
      { z: cake2.pos[2] + 2, pos: [0, 0.7, cake2.pos[2] + 2] },
    ],
    spawns: SPREAD_SPAWNS,
  });
}

export const DESSERT_SECTIONS: LevelSection[] = [
  { id: "intro", startZ: 16, endZ: -16, purpose: "see chocolate", mechanics: ["move"] },
  { id: "syrup1", startZ: -16, endZ: -40, purpose: "roll on ice or bounce the gate", mechanics: ["roll", "ice"] },
  { id: "jump1", startZ: -40, endZ: -60, purpose: "cake pit after the lesson", mechanics: ["jump"] },
  { id: "arena", startZ: -60, endZ: -80, purpose: "sweet plaza", mechanics: ["boost"] },
  { id: "syrup2", startZ: -80, endZ: -110, purpose: "longer chocolate, roll then boost", mechanics: ["roll", "boost", "ice"] },
  { id: "finale", startZ: -110, endZ: -160, purpose: "last cake jump then sprint", mechanics: ["jump"] },
];

function cloud(): Level {
  const C = "#B8E0FF";
  const A = "#5BAFE0";
  return compile({
    id: "cloud",
    theme: {
      id: "cloud",
      name: "云端竞速",
      blurb: "风环加速。看前方，别只盯着脚底下。",
      stars: 4,
      sky: "#7EC8FF",
      fog: "#A8DCFA",
      fogNear: 26,
      fogFar: 110,
      rail: "#FFFFFF",
      neon: "#7CF0FF",
      ground: "#5BAFE0",
    },
    finishZ: -90,
    startZ: 8,
    bots: 6,
    platforms: [
      plat("start", 0, 8, SPATIAL.start, 14, 0, C, "checkpoint"),
      plat("lane", 0, -8, 8, 14, 0, A),
      plat("a", 0, -22, 6.5, 8, 0.4, C),
      plat("b", 0, -36, 6.5, 8, 0.8, A),
      plat("mid", 0, -50, 9, 8, 0.4, C, "checkpoint"),
      plat("fast", 0, -64, 6, 12, 0.4, A),
      plat("final", 0, -90, SPATIAL.finish, 12, 0, C, "finish"),
    ],
    movers: [
      {
        id: "gust",
        size: [4.8, 0.55, 4.8],
        color: "#FFF6EB",
        from: [-3.6, 0.5, -76],
        to: [3.6, 0.5, -76],
        period: 2.8,
        phase: 0,
      },
    ],
    hammers: [],
    spinners: [],
    pendulums: [],
    rings: [
      { id: "r1", pos: [0, 1.6, -16] },
      { id: "r2", pos: [0, 2.0, -36] },
      { id: "r3", pos: [0, 1.8, -64] },
    ],
    pickups: [
      { id: "c1", kind: "coin", pos: [0, 1.3, -8] },
      { id: "c2", kind: "coin", pos: [0, 1.6, -36] },
      { id: "j1", kind: "jelly", pos: [0, 1.4, -50] },
      { id: "c3", kind: "coin", pos: [0, 1.5, -64] },
    ],
    traps: [],
    gates: [],
    winds: [
      { id: "tail", pos: [0, 1, -64], size: [5, 3, 10], force: [0, 0, -10] },
    ],
    checkpoints: [
      { z: 6, pos: [0, 0.7, 6] },
      { z: -50, pos: [0, 1.1, -48] },
    ],
    spawns: SPREAD_SPAWNS,
  });
}

function finale(): Level {
  const N = "#2B6BEE";
  const G = "#E8C85A";
  const P = "#E08AA4";
  return compile({
    id: "finale",
    theme: {
      id: "finale",
      name: "终极派对",
      blurb: "前面学过的都会来一遍。最后二十米，冲。",
      stars: 5,
      sky: "#6A8CFF",
      fog: "#8AA4FF",
      fogNear: 24,
      fogFar: 115,
      rail: "#7CF0FF",
      neon: "#FF8AD4",
      ground: "#2B6BEE",
    },
    finishZ: -110,
    startZ: 8,
    bots: 7,
    platforms: [
      plat("start", 0, 8, SPATIAL.start, 16, 0, G, "checkpoint"),
      plat("ice", 0, -8, 10, 12, 0, "#C8E8FF", "ice"),
      plat("ham", 0, -24, 11, 14, 0, N),
      { ...plat("jelly", 0, -38, 4.4, 4.4, 0, P, "bounce") },
      plat("mid", 0, -48, 10, 8, 0, G, "checkpoint"),
      plat("spin", 0, -60, 8.8, 12, 0, N),
      plat("belt", 0, -74, 9, 10, 0.3, "#7ED9B8", "conveyor"),
      plat("air", 0, -88, 6, 8, 0.8, N),
      plat("final", 0, -110, SPATIAL.finish, 14, 0, G, "finish"),
    ],
    movers: [
      {
        id: "mix",
        size: [4.6, 0.6, 4.6],
        color: "#F0A07A",
        from: [-3.8, 0.9, -96],
        to: [3.8, 0.9, -96],
        period: 3.0,
        phase: 0,
      },
    ],
    hammers: [{ id: "h1", pos: [0, 1.15, -24], arm: 3.0, speed: 1.1, phase: 0 }],
    spinners: [{ id: "s1", pos: [0, 1.05, -60], arm: 2.9, speed: 1.5, phase: 0 }],
    pendulums: [{ id: "p1", pos: [0, 4.0, -88], length: 2.9, speed: 1.15, phase: 0 }],
    rings: [
      { id: "r1", pos: [0, 1.5, -16] },
      { id: "r2", pos: [0, 1.8, -74] },
      { id: "r3", pos: [0, 2.0, -96] },
    ],
    pickups: [
      { id: "c1", kind: "coin", pos: [0, 1.2, -8] },
      { id: "s1", kind: "shield", pos: [3.2, 1.15, -24] },
      { id: "c2", kind: "coin", pos: [0, 1.4, -48] },
      { id: "j1", kind: "jelly", pos: [0, 1.5, -74] },
      { id: "c3", kind: "coin", pos: [0, 1.6, -96] },
    ],
    traps: [],
    gates: [],
    winds: [{ id: "finalwind", pos: [0, 1.4, -100], size: [6, 4, 8], force: [0, 0, -8] }],
    checkpoints: [
      { z: 6, pos: [0, 0.7, 6] },
      { z: -48, pos: [0, 0.7, -46] },
      { z: -88, pos: [0, 1.5, -86] },
    ],
    spawns: [...SPREAD_SPAWNS, [8.0, 0.72, 7.5], [-8.0, 0.72, 8.0]],
  });
}

export const LEVEL_ORDER = ["meadow", "ice", "factory", "sky", "pirate", "dessert", "cloud", "finale"] as const;
export type LevelId = (typeof LEVEL_ORDER)[number];

export const LEVELS: Record<LevelId, Level> = {
  meadow: meadow(),
  ice: ice(),
  factory: factory(),
  sky: skyJump(),
  pirate: pirate(),
  dessert: dessert(),
  cloud: cloud(),
  finale: finale(),
};

export const moverVel = new Map<string, { x: number; y: number; z: number }>();

let activeId: LevelId = "meadow";

export function setActiveLevel(id: string) {
  activeId = isLevelId(id) ? id : "meadow";
  moverVel.clear();
}

export function currentLevel(): Level {
  return LEVELS[activeId];
}

export function isLevelId(id: string): id is LevelId {
  return (LEVEL_ORDER as readonly string[]).includes(id);
}
