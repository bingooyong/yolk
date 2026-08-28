export type Platform = {
  id: string;
  kind: "static" | "bounce" | "conveyor" | "checkpoint" | "finish";
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

export type Hammer = {
  id: string;
  pos: [number, number, number];
  arm: number;
  speed: number;
  phase: number;
};

export type Spinner = {
  id: string;
  pos: [number, number, number];
  arm: number;
  speed: number;
  phase: number;
};

export type Pendulum = {
  id: string;
  pos: [number, number, number];
  length: number;
  speed: number;
  phase: number;
};

export type Ring = {
  id: string;
  pos: [number, number, number];
};

export type Waypoint = {
  x: number;
  y: number;
  z: number;
  jump: boolean;
  dash: boolean;
};

function plat(
  id: string,
  x: number,
  z: number,
  w: number,
  d: number,
  top: number,
  color: string,
  kind: Platform["kind"] = "static",
  thick = 0.85,
): Platform {
  return {
    id,
    kind,
    pos: [x, top - thick / 2, z],
    size: [w, thick, d],
    color,
  };
}

export const PLATFORMS: Platform[] = [
  plat("start", 0, 8, 20, 22, 0, "#E8C99A", "checkpoint"),
  plat("path", 0, -10, 13, 14, 0, "#7ED9B8"),
  plat("hammers", 0, -28, 11.5, 18, 0, "#7ED9B8"),
  plat("land1", 0, -42, 10, 8, 0, "#F0A07A"),
  plat("link1", 0, -48, 8, 5, 0, "#F0A07A"),
  { ...plat("b1", -2.2, -52, 4.2, 4.2, 0, "#F3D984", "bounce") },
  plat("link2", 0, -56.5, 5.5, 5, 0, "#F3D984"),
  { ...plat("b2", 2.4, -61, 4.2, 4.2, 0.4, "#F3D984", "bounce") },
  plat("link3", 0, -65.5, 5.5, 5, 0, "#F3D984"),
  { ...plat("b3", -1.4, -70, 4.2, 4.2, 0, "#F3D984", "bounce") },
  plat("link4", 0, -76, 7, 5, 0, "#F0A07A"),
  plat("plaza2", 0, -82, 12, 10, 0, "#F0A07A", "checkpoint"),
  plat("step", 0, -90, 6.2, 6, 0, "#5BAFE0"),
  plat("mid1", 0, -103, 5.2, 5, 0.2, "#5BAFE0"),
  plat("mid2", 0, -113, 5.2, 5, 0.2, "#5BAFE0"),
  plat("bridge", 0, -123, 6.5, 6, 0, "#5BAFE0"),
  plat("spin", 0, -132, 8.6, 16, 0, "#6EC4E8"),
  plat("beam", 0, -150, 4.8, 16, 0.15, "#E08AA4"),
  plat("beam-end", 0, -162, 8, 6, 0, "#E08AA4"),
  {
    ...plat("conv", 0, -172, 10, 10, 0.6, "#7ED9B8", "conveyor"),
    conveyor: [0, 0, -3.2],
  },
  plat("final", 0, -184, 14, 12, 0, "#F3D984", "finish"),
];

export const MOVERS: Mover[] = [
  {
    id: "m1",
    size: [4.8, 0.7, 4.8],
    color: "#5BAFE0",
    from: [-4.5, -0.15, -98],
    to: [4.5, -0.15, -98],
    period: 3.4,
    phase: 0,
  },
  {
    id: "m2",
    size: [4.8, 0.7, 4.8],
    color: "#5BAFE0",
    from: [4.5, 0.4, -108],
    to: [-4.5, 0.4, -108],
    period: 3.6,
    phase: 0.4,
  },
  {
    id: "m3",
    size: [4.8, 0.7, 4.8],
    color: "#5BAFE0",
    from: [-3.2, -0.15, -118],
    to: [3.2, -0.15, -118],
    period: 3.2,
    phase: 0.8,
  },
];

export const HAMMERS: Hammer[] = [
  { id: "h1", pos: [0, 1.15, -24], arm: 3.1, speed: 1.05, phase: 0 },
  { id: "h2", pos: [0, 1.15, -32], arm: 3.1, speed: -1.15, phase: 1.2 },
];

export const SPINNERS: Spinner[] = [
  { id: "s1", pos: [0, 1.05, -128], arm: 3.1, speed: 1.7, phase: 0 },
  { id: "s2", pos: [0, 1.05, -136], arm: 3.1, speed: -1.5, phase: 0.6 },
];

export const PENDULUMS: Pendulum[] = [
  { id: "p1", pos: [0, 4.2, -146], length: 3.2, speed: 1.15, phase: 0 },
  { id: "p2", pos: [0, 4.2, -154], length: 3.2, speed: 1.15, phase: Math.PI },
];

export const RINGS: Ring[] = [
  { id: "r1", pos: [0, 1.4, -16] },
  { id: "r2", pos: [0, 1.6, -88] },
  { id: "r3", pos: [0, 1.8, -176] },
];

export const CHECKPOINTS: { z: number; pos: [number, number, number] }[] = [
  { z: 4, pos: [0, 0.7, 6] },
  { z: -82, pos: [0, 0.7, -80] },
  { z: -118, pos: [0, 0.7, -121] },
  { z: -132, pos: [0, 0.7, -126] },
  { z: -162, pos: [0, 0.7, -160] },
];

export type Pickup = {
  id: string;
  kind: "coin" | "shield" | "jelly";
  pos: [number, number, number];
};

export const PICKUPS: Pickup[] = [
  { id: "c1", kind: "coin", pos: [-1.6, 1.1, -8] },
  { id: "c2", kind: "coin", pos: [1.6, 1.1, -8] },
  { id: "c3", kind: "coin", pos: [0, 1.2, -18] },
  { id: "s1", kind: "shield", pos: [3.6, 1.15, -28] },
  { id: "c4", kind: "coin", pos: [-3.2, 1.2, -36] },
  { id: "c5", kind: "coin", pos: [0, 1.4, -52] },
  { id: "j1", kind: "jelly", pos: [0, 1.3, -82] },
  { id: "c6", kind: "coin", pos: [0, 1.3, -90] },
  { id: "c7", kind: "coin", pos: [0, 1.3, -123] },
  { id: "s2", kind: "shield", pos: [0, 1.4, -140] },
  { id: "c8", kind: "coin", pos: [0, 1.4, -162] },
  { id: "c9", kind: "coin", pos: [-2, 1.5, -176] },
  { id: "c10", kind: "coin", pos: [2, 1.5, -176] },
];

export const SPAWNS: [number, number, number][] = [
  [0, 0.72, 2.2],
  [-3.4, 0.72, 8.4],
  [-2.2, 0.72, 7.2],
  [-1.1, 0.72, 8.6],
  [1.1, 0.72, 7.0],
  [2.2, 0.72, 8.5],
  [3.4, 0.72, 7.3],
  [3.9, 0.72, 8.2],
];

function walkables(): { x: number; y: number; z: number; d: number }[] {
  const list = [
    ...PLATFORMS.map((p) => ({
      x: p.pos[0],
      y: p.pos[1] + p.size[1] / 2,
      z: p.pos[2],
      d: p.size[2],
    })),
    ...MOVERS.map((m) => ({
      x: (m.from[0] + m.to[0]) / 2,
      y: m.from[1] + m.size[1] / 2,
      z: m.from[2],
      d: m.size[2],
    })),
  ];
  list.sort((a, b) => b.z - a.z);
  return list;
}

export const WAYPOINTS: Waypoint[] = (() => {
  const w = walkables();
  return w.map((p, i) => {
    const next = w[i + 1];
    let jump = false;
    let dash = false;
    if (next) {
      const endZ = p.z - p.d / 2;
      const nextStart = next.z + next.d / 2;
      const gap = endZ - nextStart;
      if (gap > 1.5 || next.y > p.y + 0.35) jump = true;
      if (gap > 4.8) dash = true;
    }
    return { x: p.x, y: p.y, z: p.z, jump, dash };
  });
})();

export const moverVel = new Map<string, { x: number; y: number; z: number }>();
