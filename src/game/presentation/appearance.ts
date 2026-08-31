import {
  DEFAULT_PRESENTATION_PROFILE,
  getSkin,
  type Skin,
} from "../skins.ts";
import type { AnimationCapability, VisualAsset } from "./types";

/**
 * Single appearance source of truth. UI / runtime must not re-encode
 * silhouettes (no CSS Knight, no `if (id === "bear")` in EggRacer).
 */
export function resolveSkinAppearance(skinOrId: Skin | string): VisualAsset {
  const skin = typeof skinOrId === "string" ? getSkin(skinOrId) : skinOrId;
  const isModel = skin.renderKind === "model" && Boolean(skin.modelUrl);

  let animationCapability: AnimationCapability = "procedural";
  if (isModel) {
    if (skin.animationProfile?.status === "embedded" && skin.animationProfile.defaultClip) {
      animationCapability = "embedded";
    } else if (skin.animationProfile?.status === "embedded") {
      animationCapability = "partial";
    } else {
      animationCapability = "unavailable";
    }
  }

  return {
    skinId: skin.id,
    renderKind: skin.renderKind,
    visualId: skin.visualId,
    modelUrl: skin.modelUrl,
    prototype:
      skin.assetRole === "test" ||
      (skin.modelType === "full_character" && skin.renderKind === "procedural"),
    animationCapability,
    animationFallback: "transform",
    presentationProfile: skin.presentationProfile ?? DEFAULT_PRESENTATION_PROFILE,
  };
}
