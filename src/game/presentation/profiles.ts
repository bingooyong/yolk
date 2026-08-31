import type { ModePresentation, PresentationMode } from "./types";

/** Character faces −Z. Yaw π puts the camera on −Z so the wardrobe opens on the face. */
export const WARDROBE_FRONT_YAW = Math.PI;
/** Slight 3/4 off the face so home reads as a character poster, not a mugshot. */
export const HOME_YAW = WARDROBE_FRONT_YAW - 0.55;

const wardrobe: ModePresentation = {
  camera: {
    distance: 2.55,
    distancePortrait: 2.25,
    height: 1.22,
    heightPortrait: 1.08,
    lookHeight: 0.38,
    minDistance: 1.6,
    maxDistance: 4.0,
    autoOrbitSpeed: 0.26,
    autoOrbitDelay: 1.15,
    defaultYaw: WARDROBE_FRONT_YAW,
    frameLift: 0.22,
  },
  lighting: { ambient: 0.34, key: 1.45, fill: 0.5, rim: 0.75 },
  animation: { idle: "breath", autoOrbit: true },
  environment: {
    showTrack: false,
    showBots: false,
    showStage: true,
    background: "#16121c",
    fog: "#16121c",
    fogNear: 7,
    fogFar: 16,
  },
};

const home: ModePresentation = {
  camera: {
    distance: 2.95,
    distancePortrait: 2.48,
    height: 1.18,
    heightPortrait: 1.05,
    lookHeight: 0.45,
    minDistance: 2.05,
    maxDistance: 4.4,
    autoOrbitSpeed: 0.12,
    autoOrbitDelay: 2.2,
    defaultYaw: HOME_YAW,
    frameLift: 0.06,
  },
  lighting: { ambient: 0.4, key: 1.05, fill: 0.3, rim: 0.4 },
  animation: { idle: "breath", autoOrbit: true },
  environment: {
    showTrack: true,
    showBots: true,
    showStage: true,
    background: "",
    fog: "",
    fogNear: 0,
    fogFar: 0,
  },
};

const gameplay: ModePresentation = {
  ...home,
  camera: { ...home.camera, autoOrbitSpeed: 0, autoOrbitDelay: 99, defaultYaw: 0, frameLift: 0 },
  animation: { idle: "breath", autoOrbit: false },
  environment: {
    showTrack: true,
    showBots: true,
    showStage: false,
    background: "",
    fog: "",
    fogNear: 0,
    fogFar: 0,
  },
};

const victory: ModePresentation = {
  camera: {
    ...wardrobe.camera,
    distance: 2.85,
    distancePortrait: 2.48,
    autoOrbitSpeed: 0.22,
    autoOrbitDelay: 0.55,
    frameLift: 0.2,
  },
  lighting: { ambient: 0.32, key: 1.5, fill: 0.45, rim: 0.88 },
  animation: { idle: "breath", autoOrbit: true },
  environment: {
    showTrack: false,
    showBots: false,
    showStage: true,
    background: "#141018",
    fog: "#141018",
    fogNear: 6,
    fogFar: 14,
  },
};

const gacha: ModePresentation = {
  camera: {
    ...wardrobe.camera,
    distance: 2.7,
    distancePortrait: 2.32,
    autoOrbitSpeed: 0.48,
    autoOrbitDelay: 0.35,
    frameLift: 0.2,
  },
  lighting: { ambient: 0.3, key: 1.55, fill: 0.42, rim: 0.95 },
  animation: { idle: "breath", autoOrbit: true },
  environment: {
    showTrack: false,
    showBots: false,
    showStage: true,
    background: "#140f18",
    fog: "#140f18",
    fogNear: 6,
    fogFar: 14,
  },
};

export const PRESENTATION_PROFILES: Record<PresentationMode, ModePresentation> = {
  home,
  wardrobe,
  gacha,
  victory,
  gameplay,
};

export function getPresentationMode(
  phase: string,
  hub: string,
  revealing = false,
): PresentationMode {
  if (phase === "playing" || phase === "paused" || phase === "countdown") return "gameplay";
  if (phase === "results") return "victory";
  if (phase === "title" && revealing) return "gacha";
  if (phase === "title" && hub === "character") return "wardrobe";
  return "home";
}

export function isShowcaseMode(mode: PresentationMode) {
  return mode !== "gameplay";
}

export function clampShowcaseDistance(value: number) {
  const { minDistance, maxDistance } = PRESENTATION_PROFILES.wardrobe.camera;
  return Math.min(maxDistance, Math.max(minDistance, value));
}

/** Compact iPhone landscape — matches CSS `(orientation: landscape) and (max-height: 520px)`. */
export const COMPACT_LANDSCAPE_MAX_HEIGHT = 520;
const DOCK_SHIFT = 0.18;

/**
 * Portrait / tall landscape: vertical frameLift for a bottom sheet.
 * Compact landscape + right dock: horizontal shift so the character sits in the stage.
 * Home with no dock, and gameplay: no offset.
 */
export function showcaseViewOffset(opts: {
  mode: PresentationMode;
  portrait: boolean;
  width: number;
  height: number;
  hub: string;
  frameLift: number;
}): { x: number; y: number } | null {
  if (opts.mode === "gameplay") return null;
  const compact =
    typeof window !== "undefined"
      ? window.innerWidth > window.innerHeight && window.innerHeight <= COMPACT_LANDSCAPE_MAX_HEIGHT
      : !opts.portrait && opts.height <= COMPACT_LANDSCAPE_MAX_HEIGHT;
  if (compact) {
    const docked =
      opts.mode === "wardrobe" ||
      opts.mode === "gacha" ||
      opts.mode === "victory" ||
      opts.hub !== "home";
    if (docked) return { x: opts.width * DOCK_SHIFT, y: 0 };
    return null;
  }
  if (opts.frameLift > 0) return { x: 0, y: -opts.height * opts.frameLift };
  return null;
}
