import type { Platform } from "./levels";

export type InstancedPlacement = {
  position: [number, number, number];
  rotationY: number;
  scale: [number, number, number];
  color?: string;
};

export type Level1BenchmarkLayout = {
  grassTufts: InstancedPlacement[];
  flowers: InstancedPlacement[];
  rocks: InstancedPlacement[];
  candyCanes: InstancedPlacement[];
  gumdrops: InstancedPlacement[];
  hills: InstancedPlacement[];
  clouds: InstancedPlacement[];
  routeChevrons: InstancedPlacement[];
  edgeLightStrips: InstancedPlacement[];
  edgeFlags: InstancedPlacement[];
};

const ROUTE_PLATFORM_IDS = new Set([
  "start",
  "path",
  "step1",
  "land1",
  "plaza",
  "jelly",
  "landj",
  "gapA",
  "final",
]);

const SHORTCUT_PLATFORM_IDS = new Set(["pounceA", "pounceB"]);

function placement(
  x: number,
  y: number,
  z: number,
  rotationY: number,
  scale: number | [number, number, number],
  color?: string,
): InstancedPlacement {
  return {
    position: [x, y, z],
    rotationY,
    scale: typeof scale === "number" ? [scale, scale, scale] : scale,
    color,
  };
}

function platformTop(platform: Platform): number {
  return platform.pos[1] + platform.size[1] / 2;
}

function makeForeground(): Pick<Level1BenchmarkLayout, "grassTufts" | "flowers" | "rocks"> {
  const grassTufts: InstancedPlacement[] = [];
  const flowers: InstancedPlacement[] = [];
  const rocks: InstancedPlacement[] = [];
  const flowerColors = ["#FF7A90", "#FFD166", "#8ED1FF", "#C792F7"];
  const rockColors = ["#9AA9B2", "#7F8F99", "#B7C3C9"];

  for (let i = 0; i < 176; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const row = Math.floor(i / 2);
    const lane = i % 5;
    const z = 18 - row * 1.18 + Math.sin(i * 0.83) * 0.3;
    const x = side * (10.9 + lane * 0.62 + Math.sin(i * 1.37) * 0.24 + Math.cos(i * 0.41) * 0.12);
    const scale = 0.76 + ((i * 37) % 17) / 34;

    grassTufts.push(placement(x, -0.02, z, ((i * 137) % 360) * (Math.PI / 180), scale));

    if (i % 7 === 3) {
      flowers.push(
        placement(
          x + side * 0.48,
          -0.02,
          z + Math.cos(i * 0.67) * 0.36,
          ((i * 91) % 360) * (Math.PI / 180),
          0.72 + ((i * 29) % 11) / 28,
          flowerColors[i % flowerColors.length],
        ),
      );
    }

    if (i % 13 === 5) {
      rocks.push(
        placement(
          x + side * 1.15,
          -0.02,
          z + Math.sin(i * 0.53) * 0.55,
          ((i * 211) % 360) * (Math.PI / 180),
          0.62 + ((i * 43) % 13) / 22,
          rockColors[i % rockColors.length],
        ),
      );
    }
  }

  return { grassTufts, flowers, rocks };
}

function makeMidground(): Pick<Level1BenchmarkLayout, "candyCanes" | "gumdrops"> {
  const candyCanes: InstancedPlacement[] = [];
  const gumdrops: InstancedPlacement[] = [];
  const gumdropColors = ["#FF9EB5", "#9BE8FF", "#FFD166", "#B8F28A"];

  for (let i = 0; i < 9; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    candyCanes.push(
      placement(
        side * (15.4 + (i % 4) * 1.55),
        0.58,
        12 - i * 10.2,
        ((i * 67) % 180) * (Math.PI / 180),
        0.82 + ((i * 31) % 9) / 20,
      ),
    );
  }

  for (let i = 0; i < 13; i += 1) {
    const side = i % 2 === 0 ? 1 : -1;
    gumdrops.push(
      placement(
        side * (16.2 + (i % 5) * 1.35),
        0.32,
        16 - i * 7.4 + Math.sin(i * 0.71) * 0.8,
        ((i * 149) % 360) * (Math.PI / 180),
        [0.85 + ((i * 23) % 10) / 26, 0.72 + ((i * 17) % 7) / 20, 0.85],
        gumdropColors[i % gumdropColors.length],
      ),
    );
  }

  return { candyCanes, gumdrops };
}

function makeBackground(): Pick<Level1BenchmarkLayout, "hills" | "clouds"> {
  const hills: InstancedPlacement[] = [];
  const clouds: InstancedPlacement[] = [];
  const hillColors = ["#63C38B", "#4EB47C", "#78D19B"];

  for (let i = 0; i < 16; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    hills.push(
      placement(
        side * (28.5 + (i % 4) * 4.2),
        -3.4,
        20 - i * 8.1 + Math.cos(i * 0.49) * 1.6,
        ((i * 113) % 360) * (Math.PI / 180),
        [2.4 + (i % 5) * 0.36, 1.8 + ((i * 19) % 7) * 0.28, 2.4],
        hillColors[i % hillColors.length],
      ),
    );
  }

  for (let i = 0; i < 18; i += 1) {
    const side = i % 2 === 0 ? 1 : -1;
    clouds.push(
      placement(
        side * (25 + (i % 5) * 5.8),
        7.4 + (i % 6) * 1.35,
        22 - i * 7.6 + Math.sin(i * 0.87) * 2.2,
        ((i * 173) % 360) * (Math.PI / 180),
        [2.5 + (i % 5) * 0.5, 0.72, 1.5 + ((i * 13) % 6) * 0.28],
        i % 3 === 0 ? "#F4FBFF" : "#E2F4FF",
      ),
    );
  }

  return { hills, clouds };
}

function makeRouteGuidance(
  platforms: Platform[],
  finishZ: number,
): Pick<Level1BenchmarkLayout, "routeChevrons" | "edgeLightStrips" | "edgeFlags"> {
  const routeChevrons: InstancedPlacement[] = [];
  const edgeLightStrips: InstancedPlacement[] = [];
  const edgeFlags: InstancedPlacement[] = [];

  for (const platform of platforms) {
    const top = platformTop(platform);
    const isRoute = ROUTE_PLATFORM_IDS.has(platform.id);
    const isShortcut = SHORTCUT_PLATFORM_IDS.has(platform.id);

    if (isRoute || isShortcut) {
      const firstZ = platform.pos[2] - platform.size[2] / 2 + 0.9;
      const lastZ = platform.pos[2] + platform.size[2] / 2 - 0.75;
      const count = Math.max(1, Math.min(3, Math.floor(platform.size[2] / 4)));
      for (let i = 0; i < count; i += 1) {
        const t = count === 1 ? 0.5 : i / (count - 1);
        routeChevrons.push(
          placement(
            platform.pos[0],
            top + 0.018,
            firstZ + (lastZ - firstZ) * t,
            0,
            isShortcut ? 0.78 : 1,
            isShortcut ? "#FFD166" : "#FFF6A8",
          ),
        );
      }
    }

    const stripCount = Math.max(2, Math.min(5, Math.ceil(platform.size[2] / 3.4)));
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < stripCount; i += 1) {
        const t = (i + 0.5) / stripCount;
        const z = platform.pos[2] - platform.size[2] / 2 + platform.size[2] * t;
        edgeLightStrips.push(
          placement(platform.pos[0] + side * (platform.size[0] / 2 - 0.16), top + 0.014, z, 0, [
            1,
            1,
            platform.size[2] / stripCount - 0.24,
          ]),
        );
      }
    }

    if (
      (ROUTE_PLATFORM_IDS.has(platform.id) || SHORTCUT_PLATFORM_IDS.has(platform.id)) &&
      platform.size[2] > 4
    ) {
      const exitZ = platform.pos[2] - platform.size[2] / 2 + 0.48;
      for (let side = -1; side <= 1; side += 2) {
        edgeFlags.push(
          placement(
            platform.pos[0] + side * (platform.size[0] / 2 - 0.28),
            top + 0.44,
            exitZ,
            side * -0.12,
            0.9,
            side < 0 ? "#FF7A90" : "#57D9FF",
          ),
        );
      }
    }
  }

  const finishFlagColors = ["#FF7A90", "#FFD166", "#57D9FF", "#B8F28A"];
  for (let i = 0; i < 7; i += 1) {
    edgeFlags.push(
      placement(
        -4.8 + i * 1.6,
        4.35,
        finishZ,
        Math.sin(i * 1.2) * 0.08,
        0.92,
        finishFlagColors[i % finishFlagColors.length],
      ),
    );
  }

  return { routeChevrons, edgeLightStrips, edgeFlags };
}

export function createLevel1BenchmarkLayout(
  platforms: Platform[],
  finishZ = -76,
): Level1BenchmarkLayout {
  return {
    ...makeForeground(),
    ...makeMidground(),
    ...makeBackground(),
    ...makeRouteGuidance(platforms, finishZ),
  };
}
