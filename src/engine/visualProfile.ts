import type { Quality } from "./device";

/**
 * Visual settings that are independent of device capability.
 *
 * Three.js enum objects are intentionally not imported here: this module stays
 * pure data and can therefore be locked by Node tests without WebGL.
 */
export const VISUAL_FOUNDATION = {
  renderer: {
    toneMapping: "ACESFilmic",
    exposure: 1.18,
    outputColorSpace: "sRGB",
  },
  camera: {
    near: 0.4,
    far: 190,
  },
  sky: {
    // The shell follows the camera, so its complete radius must remain inside
    // the camera far plane at every point along every course.
    radius: 120,
  },
  lighting: {
    ambientIntensity: 0.12,
    hemisphere: {
      skyColor: "#FFF5E8",
      groundColor: "#6EA7FF",
      intensity: 0.7,
    },
    key: {
      color: "#FFF3D8",
      intensity: 1.45,
      offset: [10, 16, 8] as [number, number, number],
    },
    fill: {
      color: "#D8EFFF",
      intensity: 0.32,
      offset: [-8, 9, -4] as [number, number, number],
    },
    rim: {
      color: "#FFE9B8",
      intensity: 0.45,
      offset: [-4, 10, -12] as [number, number, number],
    },
    shadow: {
      near: 2,
      far: 80,
      extent: 22,
      bias: -0.0004,
    },
  },
} as const;

export type VisualQualityProfile = {
  /** Dynamic R3F DPR range; lower than the display rate on capped tiers. */
  dpr: [number, number];
  /** WebGL context MSAA is immutable after canvas/context creation. */
  contextAntialias: boolean;
  /** Enables Three's dynamic shadow-map path and shadow-casting lights. */
  shadows: boolean;
  /** Zero disables shadow-map allocation on low-quality devices. */
  shadowMapSize: number;
  /** Cube-face resolution for the procedural gradient environment. */
  environmentMapSize: number;
  /** Scene.environmentIntensity used by standard/physical materials. */
  environmentIntensity: number;
};

const QUALITY_PROFILES: Record<Quality, VisualQualityProfile> = {
  low: {
    dpr: [1, 1.25],
    contextAntialias: false,
    shadows: false,
    shadowMapSize: 0,
    environmentMapSize: 16,
    environmentIntensity: 0.25,
  },
  medium: {
    dpr: [1, 1.5],
    contextAntialias: true,
    shadows: true,
    shadowMapSize: 1024,
    environmentMapSize: 32,
    environmentIntensity: 0.35,
  },
  high: {
    dpr: [1, 2],
    contextAntialias: true,
    shadows: true,
    shadowMapSize: 1536,
    environmentMapSize: 64,
    environmentIntensity: 0.45,
  },
};

export function getVisualProfile(quality: Quality): VisualQualityProfile {
  return QUALITY_PROFILES[quality];
}

/**
 * Remount only when an immutable context attribute changes. Medium -> high can
 * update DPR/shadows dynamically; low -> medium must recreate the WebGL context
 * because context MSAA cannot be toggled after creation.
 */
export function getCanvasRemountKey(scope: string, quality: Quality): string {
  const aaMode = QUALITY_PROFILES[quality].contextAntialias ? "msaa" : "no-msaa";
  return `${scope}:${aaMode}`;
}
