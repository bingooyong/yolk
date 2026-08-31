import type { PresentationProfile, RenderKind, VisualId } from "../skins";

export type PresentationMode = "home" | "wardrobe" | "gacha" | "victory" | "gameplay";

export type AnimationCapability = "procedural" | "embedded" | "partial" | "unavailable";

export type CameraProfile = {
  distance: number;
  distancePortrait: number;
  height: number;
  heightPortrait: number;
  lookHeight: number;
  minDistance: number;
  maxDistance: number;
  autoOrbitSpeed: number;
  autoOrbitDelay: number;
  defaultYaw: number;
  /** Shift the projection up so a bottom sheet does not cover the character. */
  frameLift: number;
};

export type LightingProfile = {
  ambient: number;
  key: number;
  fill: number;
  rim: number;
};

export type ShowcaseAnimationProfile = {
  idle: "breath" | "none";
  autoOrbit: boolean;
};

export type EnvironmentProfile = {
  showTrack: boolean;
  showBots: boolean;
  showStage: boolean;
  background: string;
  fog: string;
  fogNear: number;
  fogFar: number;
};

export type ModePresentation = {
  camera: CameraProfile;
  lighting: LightingProfile;
  animation: ShowcaseAnimationProfile;
  environment: EnvironmentProfile;
};

export type VisualAsset = {
  skinId: string;
  renderKind: RenderKind;
  visualId: VisualId;
  modelUrl?: string;
  prototype: boolean;
  animationCapability: AnimationCapability;
  animationFallback: "transform";
  presentationProfile: PresentationProfile;
};
