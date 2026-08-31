import { sim } from "../sim";
import { PRESENTATION_PROFILES, clampShowcaseDistance } from "./profiles";
import type { PresentationMode } from "./types";

export { clampShowcaseDistance };

export function resetShowcaseView(mode: PresentationMode = "wardrobe") {
  const cam = PRESENTATION_PROFILES[mode].camera;
  sim.showcaseYaw = cam.defaultYaw;
  sim.showcaseDistance = cam.distancePortrait;
  sim.lookIdle = 0;
}
