export type Surface = "static" | "bounce" | "conveyor" | "checkpoint" | "finish" | "ice";

export type Platform = {
  id: string;
  kind: Surface;
  pos: [number, number, number];
  size: [number, number, number];
  color: string;
  conveyor?: [number, number, number];
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
): Platform {
  return { id, kind, pos: [x, top - thick / 2, z], size: [w, thick, d], color };
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
): Platform {
  const prevFwd = prev.pos[2] - prev.size[2] / 2;
  const z = prevFwd - gap - d / 2;
  return plat(id, x, z, w, d, top, color, kind);
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
      .filter((p) => Math.abs(p.pos[0]) < 4.2 && platformTop(p) > -0.5)
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
      .filter((t) => !t.drops)
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

  const start = plat("start", 0, 8, 16, 16, 0, P, "checkpoint");
  const path = extend("path", start, CONNECT, 12, 14, 0, 0, C);
  const step1 = extend("step1", path, CONNECT, 10, 10, 0, 0, G);
  const land1 = extend("land1", step1, JUMP, 10, 9, 0, 0, C);
  const path2 = extend("path2", land1, CONNECT, 10, 16, 0, 0, P, "checkpoint");
  const rollLane = extend("rollLane", path2, CONNECT, 10, 11, 0, 0, C);
  const boostLane = extend("boostLane", rollLane, CONNECT, 10, 22, 0, 0, C);
  const fork = extend("fork", boostLane, CONNECT, 12, 8, 0, 0, P);
  const safeLane = extend("safeLane", fork, CONNECT, 9, 16, 0, 0, C);
  const plaza = extend("plaza", safeLane, CONNECT, 12, 10, 0, 0, P, "checkpoint");
  const gapA = extend("gapA", plaza, CONNECT, 9, 8, 0, 0, G);
  const landj = extend("landj", gapA, JUMP, 9, 8, 0, 0, C);
  const final = extend("final", landj, CONNECT, 14, 16, 0, 0, P, "finish");

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
    spawns: [
      [0, 0.72, 4],
      [-2.4, 0.72, 8],
      [-1.2, 0.72, 7.2],
      [1.2, 0.72, 8.1],
      [2.4, 0.72, 7.4],
    ],
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

  const start = plat("start", 0, 8, 14, 16, 0, S, "checkpoint");
  const ice1 = extend("ice1", start, CONNECT, 12, 18, 0, 0, I, "ice");
  const gap = extend("gap", ice1, CONNECT, 8.8, 12, 0, 0, I, "ice");
  const ice2 = extend("ice2", gap, JUMP, 9, 10, 0, 0, I, "ice");
  const lane = extend("lane", ice2, CONNECT, 10, 8, 0, 0, I, "ice");
  const tongue = extend("tongue", lane, CONNECT, 6.4, 16, 0, 0, I, "ice");
  const mid = extend("mid", tongue, CONNECT, 10, 8, 0, 0, S, "checkpoint");
  const water = extend("water", mid, CONNECT, 8, 8, 0, 0, I, "ice");
  const land = extend("land", water, JUMP, 9, 8, 0, 0, S);
  const slide = extend("slide", land, CONNECT, 6.5, 14, 0, -0.4, I, "ice");
  const land2 = extend("land2", slide, CONNECT, 9, 8, 0, 0, S);
  const final = extend("final", land2, CONNECT, 14, 14, 0, 0, D, "finish");

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
    spawns: [
      [0, 0.72, 4],
      [-2.2, 0.72, 8],
      [-1, 0.72, 7],
      [1, 0.72, 8],
      [2.2, 0.72, 7.2],
      [2.8, 0.72, 8.2],
    ],
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

  const start = plat("start", 0, 8, 14, 16, 0, Y, "checkpoint");
  const intro = extend("intro", start, CONNECT, 10, 16, 0, 0, M);
  const ham1 = extend("ham1", intro, CONNECT, 7.2, 14, 0, 0, D);
  const safe1 = extend("safe1", ham1, CONNECT, 11, 10, 0, 0, Y);
  const hall2 = extend("hall2", safe1, CONNECT, 10, 14, 0, 0, M);
  const ham2a = extend("ham2a", hall2, CONNECT, 7.2, 10, 0, 0, D);
  const ham2b = extend("ham2b", ham2a, CONNECT, 7.2, 10, 0, 0, D);
  const mid = extend("mid", ham2b, CONNECT, 12, 10, 0, 0, Y, "checkpoint");
  const gap = extend("gap", mid, CONNECT, 8, 10, 0, 0, M);
  const land = extend("land", gap, JUMP, 9, 8, 0, 0, Y);
  const finale = extend("finale", land, CONNECT, 7.4, 12, 0, 0, D);
  const final = extend("final", finale, CONNECT, 14, 14, 0, 0, Y, "finish");

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
    spawns: [
      [0, 0.72, 4],
      [-2.2, 0.72, 8],
      [-1, 0.72, 7],
      [1, 0.72, 8],
      [2.2, 0.72, 7.2],
      [2.8, 0.72, 8.2],
    ],
  });
}

export const FACTORY_SECTIONS: LevelSection[] = [
  { id: "intro", startZ: 16, endZ: -16, purpose: "see the hammer", mechanics: ["move"] },
  { id: "ham1", startZ: -16, endZ: -40, purpose: "one wait-window", mechanics: ["hammer"] },
  { id: "ham2", startZ: -40, endZ: -80, purpose: "rhythm pair or catwalk", mechanics: ["hammer"] },
  { id: "jump", startZ: -80, endZ: -110, purpose: "jump after the lesson", mechanics: ["jump"] },
  { id: "finale", startZ: -110, endZ: -160, purpose: "last window then sprint", mechanics: ["hammer"] },
];


function skyJump(): Level {
  const B = "#5BAFE0";
  const W = "#FFF6EB";
  const P = "#E08AA4";
  return compile({
    id: "sky",
    theme: {
      id: "sky",
      name: "天空弹跳岛",
      blurb: "看清落点再跳。果冻会把你送上去。",
      stars: 3,
      sky: "#8FD4F8",
      fog: "#C8ECFF",
      fogNear: 20,
      fogFar: 95,
      rail: "#E08AA4",
      neon: "#FFFFFF",
      ground: "#5BAFE0",
    },
    finishZ: -82,
    startZ: 8,
    bots: 5,
    platforms: [
      plat("start", 0, 8, 12, 14, 0, W, "checkpoint"),
      plat("a", 0, -6, 6, 6, 0, B),
      { ...plat("b1", 0, -14, 4.4, 4.4, 0, P, "bounce") },
      plat("c", 0, -24, 6, 6, 1.6, B),
      { ...plat("b2", -2.4, -34, 4.2, 4.2, 1.6, P, "bounce") },
      plat("d", 2.2, -44, 5.4, 5.4, 2.2, B),
      plat("mid", 0, -54, 8, 6, 1.2, W, "checkpoint"),
      plat("e", 0, -64, 5.2, 5, 1.2, B),
      plat("final", 0, -82, 13, 10, 0, W, "finish"),
    ],
    movers: [
      {
        id: "cloud",
        size: [4.4, 0.55, 4.4],
        color: "#FFF6EB",
        from: [-3.4, 1.4, -72],
        to: [3.4, 1.4, -72],
        period: 3.6,
        phase: 0,
      },
    ],
    hammers: [],
    spinners: [],
    pendulums: [],
    rings: [
      { id: "r1", pos: [0, 2.4, -24] },
      { id: "r2", pos: [0, 2.2, -64] },
    ],
    pickups: [
      { id: "c1", kind: "coin", pos: [0, 1.3, -6] },
      { id: "c2", kind: "coin", pos: [0, 2.8, -24] },
      { id: "c3", kind: "coin", pos: [2.2, 3.4, -44] },
      { id: "j1", kind: "jelly", pos: [0, 2.4, -54] },
    ],
    traps: [],
    gates: [],
    winds: [{ id: "up", pos: [0, 2, -64], size: [4, 4, 4], force: [0, 6, 0] }],
    checkpoints: [
      { z: 6, pos: [0, 0.7, 6] },
      { z: -54, pos: [0, 1.9, -52] },
    ],
    spawns: [
      [0, 0.72, 4],
      [-2, 0.72, 8],
      [2, 0.72, 7.4],
      [-1, 0.72, 8.2],
      [1.4, 0.72, 7],
    ],
  });
}

function pirate(): Level {
  const Wd = "#C4A574";
  const Sea = "#2B6BEE";
  const Flag = "#E8614A";
  return compile({
    id: "pirate",
    theme: {
      id: "pirate",
      name: "海盗港湾",
      blurb: "右边稳、左边快。掉落板会塌，看准再踩。",
      stars: 4,
      sky: "#7EC8E3",
      fog: "#8FD4F0",
      fogNear: 22,
      fogFar: 105,
      rail: "#C4A574",
      neon: "#E8C85A",
      ground: "#2B6BEE",
    },
    finishZ: -88,
    startZ: 8,
    bots: 6,
    platforms: [
      plat("dock", 0, 8, 16, 16, 0, Wd, "checkpoint"),
      plat("deck", 0, -8, 12, 12, 0, Wd),
      plat("safe", 4.2, -28, 5.2, 22, 0, Wd),
      plat("mid", 0, -44, 10, 8, 0, Flag, "checkpoint"),
      plat("ship", 0, -62, 8, 14, 0.3, Wd),
      plat("final", 0, -88, 14, 12, 0, Flag, "finish"),
    ],
    movers: [
      {
        id: "boat",
        size: [5, 0.6, 5],
        color: "#8B6914",
        from: [-3.2, 0.1, -74],
        to: [3.2, 0.1, -74],
        period: 3.4,
        phase: 0,
      },
    ],
    hammers: [],
    spinners: [],
    pendulums: [{ id: "mast", pos: [0, 4.1, -62], length: 3.1, speed: 1.05, phase: 0 }],
    rings: [{ id: "r1", pos: [-3.2, 1.5, -28] }],
    pickups: [
      { id: "c1", kind: "coin", pos: [4.2, 1.2, -22] },
      { id: "c2", kind: "coin", pos: [-3.2, 1.3, -28] },
      { id: "c3", kind: "coin", pos: [0, 1.4, -62] },
      { id: "s1", kind: "shield", pos: [0, 1.2, -44] },
    ],
    traps: ((): TrapTileDef[] => {
      const cols = [-4.4, -2.2, 0];
      const rows = [-20, -23.2, -26.4, -29.6, -32.8, -36];
      return rows.flatMap((z, ri) =>
        cols.map((x, ci) => {
          const path = (ci === 0 && ri % 2 === 0) || (ci === 1 && ri % 2 === 1);
          return {
            id: `t${ri}${ci}`,
            pos: [x, -0.22, z] as [number, number, number],
            size: [2.05, 0.44, 2.05] as [number, number, number],
            drops: !path && ri !== 0 && ri !== rows.length - 1,
            delay: 0.32,
          };
        }),
      );
    })(),
    gates: [],
    winds: [],
    checkpoints: [
      { z: 6, pos: [0, 0.7, 6] },
      { z: -44, pos: [0, 0.7, -42] },
      { z: -74, pos: [0, 0.7, -72] },
    ],
    spawns: [
      [0, 0.72, 4],
      [-2.4, 0.72, 8],
      [2.4, 0.72, 7.4],
      [-1.2, 0.72, 8],
      [1.2, 0.72, 7],
      [3, 0.72, 8.2],
    ],
  });
}

function dessert(): Level {
  const Ch = "#8B5A2B";
  const Ca = "#F3D984";
  const Je = "#E08AA4";
  return compile({
    id: "dessert",
    theme: {
      id: "dessert",
      name: "甜品工厂",
      blurb: "巧克力会滑，果冻会弹。看起来能撞的，多半真能撞。",
      stars: 4,
      sky: "#F7C9D8",
      fog: "#F8D8E4",
      fogNear: 22,
      fogFar: 100,
      rail: "#E08AA4",
      neon: "#FFF6A8",
      ground: "#F3D984",
    },
    finishZ: -84,
    startZ: 8,
    bots: 6,
    platforms: [
      plat("start", 0, 8, 14, 16, 0, Ca, "checkpoint"),
      plat("cake", 0, -8, 10, 12, 0, Ca),
      plat("choco", 0, -22, 9, 12, 0, Ch, "ice"),
      { ...plat("jelly", 0, -34, 4.6, 4.6, 0, Je, "bounce") },
      plat("belt", 0, -46, 9, 10, 0.4, Ca, "conveyor"),
      plat("mid", 0, -56, 10, 8, 0, Je, "checkpoint"),
      plat("spinF", 0, -66, 8.5, 10, 0, Ch),
      plat("final", 0, -84, 14, 10, 0, Ca, "finish"),
    ],
    movers: [
      {
        id: "lift",
        size: [4.6, 0.6, 4.6],
        color: "#E08AA4",
        from: [0, -0.1, -74],
        to: [0, 1.6, -74],
        period: 3.4,
        phase: 0,
      },
    ],
    hammers: [],
    spinners: [{ id: "candy", pos: [0, 1.05, -66], arm: 2.8, speed: 1.35, phase: 0 }],
    pendulums: [],
    rings: [{ id: "r1", pos: [0, 1.6, -46] }],
    pickups: [
      { id: "c1", kind: "coin", pos: [0, 1.2, -8] },
      { id: "c2", kind: "coin", pos: [0, 1.3, -22] },
      { id: "j1", kind: "jelly", pos: [0, 1.3, -34] },
      { id: "c3", kind: "coin", pos: [0, 1.4, -56] },
    ],
    traps: [],
    gates: [],
    winds: [],
    checkpoints: [
      { z: 6, pos: [0, 0.7, 6] },
      { z: -56, pos: [0, 0.7, -54] },
    ],
    spawns: [
      [0, 0.72, 4],
      [-2.2, 0.72, 8],
      [2.2, 0.72, 7.4],
      [-1, 0.72, 8],
      [1.2, 0.72, 7],
      [2.8, 0.72, 8.2],
    ],
  });
}

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
      plat("start", 0, 8, 14, 14, 0, C, "checkpoint"),
      plat("lane", 0, -8, 8, 14, 0, A),
      plat("a", 0, -22, 6.5, 8, 0.4, C),
      plat("b", 0, -36, 6.5, 8, 0.8, A),
      plat("mid", 0, -50, 9, 8, 0.4, C, "checkpoint"),
      plat("fast", 0, -64, 6, 12, 0.4, A),
      plat("final", 0, -90, 14, 12, 0, C, "finish"),
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
    spawns: [
      [0, 0.72, 4],
      [-2.2, 0.72, 8],
      [2.2, 0.72, 7.4],
      [-1, 0.72, 8],
      [1.2, 0.72, 7],
      [2.8, 0.72, 8.2],
    ],
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
      plat("start", 0, 8, 16, 16, 0, G, "checkpoint"),
      plat("ice", 0, -8, 10, 12, 0, "#C8E8FF", "ice"),
      plat("ham", 0, -24, 11, 14, 0, N),
      { ...plat("jelly", 0, -38, 4.4, 4.4, 0, P, "bounce") },
      plat("mid", 0, -48, 10, 8, 0, G, "checkpoint"),
      plat("spin", 0, -60, 8.8, 12, 0, N),
      plat("belt", 0, -74, 9, 10, 0.3, "#7ED9B8", "conveyor"),
      plat("air", 0, -88, 6, 8, 0.8, N),
      plat("final", 0, -110, 16, 14, 0, G, "finish"),
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
    spawns: [
      [0, 0.72, 4],
      [-3.2, 0.72, 8.4],
      [-2.0, 0.72, 7.2],
      [-1.0, 0.72, 8.6],
      [1.0, 0.72, 7.0],
      [2.0, 0.72, 8.5],
      [3.2, 0.72, 7.3],
      [3.6, 0.72, 8.2],
    ],
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
