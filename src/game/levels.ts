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

function compile(partial: Omit<Level, "waypoints" | "coinCount">): Level {
  const walk = [
    ...partial.platforms
      .filter((p) => Math.abs(p.pos[0]) < 4.2)
      .map((p) => ({
      x: p.pos[0],
      y: p.pos[1] + p.size[1] / 2,
      z: p.pos[2],
      d: p.size[2],
    })),
    ...partial.movers.map((m) => ({
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

function meadow(): Level {
  const C = "#7ED9B8";
  const G = "#9EE7A8";
  const P = "#F3D984";
  const J = "#E08AA4";
  return compile({
    id: "meadow",
    theme: {
      id: "meadow",
      name: "糖果草原",
      blurb: "跑、跳过台阶。右边缺口用扑能抄近路。",
      stars: 1,
      sky: "#9EE8FF",
      fog: "#B8ECFF",
      fogNear: 28,
      fogFar: 120,
      rail: "#3DCFB0",
      neon: "#FFF6A8",
      ground: "#7ED9B8",
    },
    finishZ: -76,
    startZ: 8,
    bots: 4,
    platforms: [
      plat("start", 0, 8, 16, 15.84, 0, P, "checkpoint"),
      plat("path", 0, -8, 12, 15.76, 0, C),
      plat("step1", 0, -18.6, 10, 5.2, 0.28, G),
      plat("land1", 0, -26.7, 11, 10.84, 0, C),
      plat("plaza", 0, -39.62, 12, 14.76, 0, P, "checkpoint"),
      plat("pounceA", 5.6, -20.4, 3.4, 3.2, 0.18, P),
      plat("pounceB", 5.6, -29.6, 3.6, 4.0, 0.22, G),
      { ...plat("jelly", 0, -50, 5.2, 5.84, 0, J, "bounce") },
      plat("landj", 0, -58, 10, 9.84, 0, C),
      plat("gapA", 0, -66.54, 9, 6.92, 0, G),
      plat("final", 0, -76, 14, 11.84, 0, P, "finish"),
    ],
    movers: [],
    hammers: [],
    spinners: [],
    pendulums: [],
    rings: [{ id: "r1", pos: [0, 1.5, -19] }],
    pickups: [
      { id: "c1", kind: "coin", pos: [-1.8, 1.1, 4] },
      { id: "c2", kind: "coin", pos: [1.8, 1.1, 4] },
      { id: "c3", kind: "coin", pos: [0, 1.35, -18] },
      { id: "c4", kind: "coin", pos: [0, 1.4, -32] },
      { id: "c5", kind: "coin", pos: [0, 1.4, -48] },
      { id: "c6", kind: "coin", pos: [0, 1.5, -68] },
      { id: "c7", kind: "coin", pos: [5.6, 1.45, -21] },
      { id: "c8", kind: "coin", pos: [5.6, 1.55, -29.4] },
    ],
    traps: [],
    winds: [],
    checkpoints: [
      { z: 6, pos: [0, 0.7, 6] },
      { z: -40, pos: [0, 0.7, -38] },
      { z: -58, pos: [0, 0.7, -56] },
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

function ice(): Level {
  const I = "#C8E8FF";
  const S = "#8EC8F0";
  const D = "#5BAFE0";
  return compile({
    id: "ice",
    theme: {
      id: "ice",
      name: "冰雪滑坡",
      blurb: "冰面很滑。提前松摇杆，别在裂缝上急转。",
      stars: 2,
      sky: "#D8F0FF",
      fog: "#E8F6FF",
      fogNear: 24,
      fogFar: 110,
      rail: "#8EC8F0",
      neon: "#FFFFFF",
      ground: "#C8E8FF",
    },
    finishZ: -78,
    startZ: 8,
    bots: 5,
    platforms: [
      plat("start", 0, 8, 14, 16, 0, S, "checkpoint"),
      plat("ice1", 0, -8, 10, 16, 0, I, "ice"),
      plat("gap", 0, -20, 7, 5, 0, D),
      plat("ice2", 0, -30, 9, 12, 0, I, "ice"),
      plat("crackL", -3.4, -40, 4.2, 6, 0, I, "ice"),
      plat("crackR", 3.4, -40, 4.2, 6, 0, I, "ice"),
      plat("mid", 0, -48, 8, 6, 0, S, "checkpoint"),
      plat("slide", 0, -58, 6.5, 10, -0.4, I, "ice"),
      plat("land", 0, -68, 9, 6, 0, S),
      plat("final", 0, -78, 13, 10, 0, D, "finish"),
    ],
    movers: [
      {
        id: "floe",
        size: [4.2, 0.55, 4.2],
        color: "#E8F6FF",
        from: [-3.8, -0.05, -24],
        to: [3.8, -0.05, -24],
        period: 3.8,
        phase: 0,
      },
    ],
    hammers: [],
    spinners: [],
    pendulums: [],
    rings: [{ id: "r1", pos: [0, 1.5, -58] }],
    pickups: [
      { id: "c1", kind: "coin", pos: [0, 1.2, -8] },
      { id: "c2", kind: "coin", pos: [-3.4, 1.2, -40] },
      { id: "c3", kind: "coin", pos: [3.4, 1.2, -40] },
      { id: "c4", kind: "coin", pos: [0, 1.3, -58] },
      { id: "s1", kind: "shield", pos: [0, 1.2, -48] },
    ],
    traps: [],
    winds: [],
    checkpoints: [
      { z: 6, pos: [0, 0.7, 6] },
      { z: -48, pos: [0, 0.7, -46] },
      { z: -68, pos: [0, 0.7, -66] },
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

function factory(): Level {
  const M = "#8A9BB0";
  const Y = "#E8C85A";
  const R = "#E8614A";
  return compile({
    id: "factory",
    theme: {
      id: "factory",
      name: "旋转工厂",
      blurb: "锤子按节奏转。看空隙，再过。不要慌。",
      stars: 3,
      sky: "#7A90A8",
      fog: "#8AA0B8",
      fogNear: 22,
      fogFar: 100,
      rail: "#E8C85A",
      neon: "#FFD36A",
      ground: "#6A7A90",
    },
    finishZ: -86,
    startZ: 8,
    bots: 6,
    platforms: [
      plat("start", 0, 8, 14, 16, 0, Y, "checkpoint"),
      plat("hall", 0, -10, 11, 16, 0, M),
      plat("ham", 0, -26, 11, 14, 0, M),
      plat("belt", 0, -42, 10, 12, 0, Y, "conveyor"),
      plat("mid", 0, -54, 10, 8, 0, M, "checkpoint"),
      plat("spin", 0, -66, 9, 12, 0, M),
      plat("final", 0, -86, 14, 12, 0, Y, "finish"),
    ],
    movers: [
      {
        id: "piston",
        size: [4.6, 0.6, 4.6],
        color: "#F0A07A",
        from: [-4, 0.2, -76],
        to: [4, 0.2, -76],
        period: 3.2,
        phase: 0,
      },
    ],
    hammers: [
      { id: "h1", pos: [0, 1.15, -22], arm: 3.0, speed: 1.05, phase: 0 },
      { id: "h2", pos: [0, 1.15, -30], arm: 3.0, speed: -1.12, phase: 1.1 },
    ],
    spinners: [{ id: "s1", pos: [0, 1.05, -66], arm: 2.9, speed: 1.45, phase: 0 }],
    pendulums: [{ id: "p1", pos: [0, 4.0, -80], length: 3.0, speed: 1.1, phase: 0 }],
    rings: [{ id: "r1", pos: [0, 1.5, -42] }],
    pickups: [
      { id: "c1", kind: "coin", pos: [0, 1.2, -10] },
      { id: "s1", kind: "shield", pos: [3.4, 1.15, -26] },
      { id: "c2", kind: "coin", pos: [0, 1.3, -54] },
      { id: "c3", kind: "coin", pos: [0, 1.3, -76] },
    ],
    traps: [],
    winds: [],
    checkpoints: [
      { z: 6, pos: [0, 0.7, 6] },
      { z: -54, pos: [0, 0.7, -52] },
      { z: -76, pos: [0, 0.7, -74] },
    ],
    spawns: [
      [0, 0.72, 4],
      [-2.6, 0.72, 8],
      [-1.3, 0.72, 7],
      [1.3, 0.72, 8],
      [2.6, 0.72, 7.2],
      [3.1, 0.72, 8.2],
      [-3.1, 0.72, 7.6],
    ],
  });
}

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
          const path = ci === 0 && ri % 2 === 0 || ci === 1 && ri % 2 === 1;
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
