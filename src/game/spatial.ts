/** Playable-space scale. Width is a level-design tool, not a paint value. */

export const SPATIAL = {
  /** Egg diameter used for “how many racers fit” talk. */
  body: 1.0,
  /** `EGG_BUMP` — packed shoulder-to-shoulder. */
  packed: 1.05,
  /** Comfortable overtake / boost-beside spacing. */
  comfort: 2.2,

  /** Challenge choke. ~2 racers comfortable, not a hallway. */
  narrow: 6.2,
  /** Default racing island. */
  standard: 12,
  /** Overtake / boost / run-right-before-bounce. */
  wide: 14,
  /** Plaza: 4+ comfortable, left/mid/right readable. */
  arena: 20,
  start: 20,
  finish: 20,
  recovery: 18,
  shortcut: 6,

  /** Camera treats this as “strip”. Wider pads pull back, never FOV-spam. */
  camRefWidth: 8,
} as const;

export type LevelSpatialProfile = {
  baseTrackWidth: number;
  minTrackWidth: number;
  maxTrackWidth: number;
  overtakingWidth: number;
  recoveryWidth: number;
  shortcutWidth: number;
  startAreaWidth: number;
  finishAreaWidth: number;
};

export const SKY_SPATIAL: LevelSpatialProfile = {
  baseTrackWidth: SPATIAL.standard,
  minTrackWidth: SPATIAL.narrow,
  maxTrackWidth: SPATIAL.arena,
  overtakingWidth: SPATIAL.wide,
  recoveryWidth: SPATIAL.recovery,
  shortcutWidth: SPATIAL.shortcut,
  startAreaWidth: SPATIAL.start,
  finishAreaWidth: SPATIAL.finish,
};

export function parallelCapacity(width: number, spacing = SPATIAL.comfort) {
  return Math.max(1, Math.floor(width / spacing));
}

export function camExtraForWidth(width: number) {
  const extra = Math.max(0, Math.min(3.4, (width - SPATIAL.camRefWidth) * 0.22));
  return {
    dist: extra,
    height: extra * 0.4,
    ahead: extra * 0.38,
  };
}

type PadLike = { pos: [number, number, number]; size: [number, number, number] };

/** Nearest playable pad (ignores recovery) at this Z — camera follow. */
export function localPlayableWidth(platforms: PadLike[], pz: number): number {
  let bestW: number = SPATIAL.standard;
  let best = 1e9;
  for (const p of platforms) {
    const top = p.pos[1] + p.size[1] / 2;
    if (top < -0.5) continue;
    const dz = Math.abs(p.pos[2] - pz);
    if (dz > p.size[2] / 2 + 3) continue;
    if (dz < best) {
      best = dz;
      bestW = p.size[0];
    }
  }
  return bestW;
}

export const SPREAD_SPAWNS: [number, number, number][] = [
  [0, 0.72, 4],
  [-6.2, 0.72, 8],
  [-3.2, 0.72, 7],
  [3.2, 0.72, 8],
  [6.2, 0.72, 7.2],
  [-1.6, 0.72, 8.2],
];
