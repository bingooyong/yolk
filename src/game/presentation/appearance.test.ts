import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { resolveSkinAppearance } from "./appearance.ts";
import {
  clampShowcaseDistance,
  COMPACT_LANDSCAPE_MAX_HEIGHT,
  getPresentationMode,
  HOME_YAW,
  isShowcaseMode,
  PRESENTATION_PROFILES,
  showcaseViewOffset,
  WARDROBE_FRONT_YAW,
} from "./profiles.ts";

describe("SkinAppearanceResolver", () => {
  test("yolk modular is production procedural, not a prototype full character", () => {
    const a = resolveSkinAppearance("plain");
    assert.equal(a.skinId, "plain");
    assert.equal(a.renderKind, "procedural");
    assert.equal(a.visualId, "yolk");
    assert.equal(a.prototype, false);
    assert.equal(a.animationCapability, "procedural");
    assert.equal(a.animationFallback, "transform");
  });

  test("knight and bear are prototype full characters", () => {
    const k = resolveSkinAppearance("knight");
    const b = resolveSkinAppearance("bear");
    assert.equal(k.prototype, true);
    assert.equal(b.prototype, true);
    assert.equal(k.visualId, "knight");
    assert.equal(b.visualId, "bear");
    assert.equal(k.renderKind, "procedural");
    assert.equal(k.animationCapability, "procedural");
  });

  test("rabbit and robot stay prototype procedural full characters", () => {
    const r = resolveSkinAppearance("rabbit");
    const o = resolveSkinAppearance("robot");
    assert.equal(r.prototype, true);
    assert.equal(o.prototype, true);
    assert.equal(r.visualId, "rabbit");
    assert.equal(o.visualId, "robot");
    assert.equal(r.animationFallback, "transform");
  });

  test("test GLB is prototype with unavailable clips", () => {
    const a = resolveSkinAppearance("egg_demo_model");
    assert.equal(a.renderKind, "model");
    assert.equal(a.prototype, true);
    assert.equal(a.animationCapability, "unavailable");
    assert.ok(a.modelUrl);
    const lab = resolveSkinAppearance("lab_img3d_pilot");
    assert.equal(lab.prototype, true);
    assert.equal(lab.animationCapability, "unavailable");
    const imported = resolveSkinAppearance("lab_user_import");
    assert.equal(imported.prototype, true);
    assert.equal(imported.renderKind, "model");
  });

  test("resolver does not special-case ids beyond the registry", () => {
    const src = [
      resolveSkinAppearance("knight").animationFallback,
      resolveSkinAppearance("bear").animationFallback,
      resolveSkinAppearance("rabbit").animationFallback,
      resolveSkinAppearance("mint_wings").animationFallback,
    ];
    assert.deepEqual(src, ["transform", "transform", "transform", "transform"]);
  });
});

describe("presentation modes", () => {
  test("wardrobe is the only title+character mode", () => {
    assert.equal(getPresentationMode("title", "character"), "wardrobe");
    assert.equal(getPresentationMode("title", "home"), "home");
    assert.equal(getPresentationMode("playing", "character"), "gameplay");
    assert.equal(getPresentationMode("results", "home"), "victory");
    assert.equal(getPresentationMode("title", "inventory"), "home");
  });

  test("gacha reveal takes the studio even from inventory", () => {
    assert.equal(getPresentationMode("title", "inventory", true), "gacha");
    assert.equal(getPresentationMode("title", "character", true), "gacha");
    assert.equal(getPresentationMode("title", "home", true), "gacha");
    assert.equal(getPresentationMode("playing", "inventory", true), "gameplay");
    const g = PRESENTATION_PROFILES.gacha;
    assert.equal(g.environment.showTrack, false);
    assert.equal(g.environment.showBots, false);
    assert.equal(g.environment.showStage, true);
    assert.equal(g.camera.defaultYaw, WARDROBE_FRONT_YAW);
    assert.ok(g.camera.autoOrbitSpeed > 0);
    assert.ok(g.camera.frameLift > 0);
  });

  test("home is a meadow podium that still shows the face", () => {
    const h = PRESENTATION_PROFILES.home;
    assert.equal(h.environment.showTrack, true);
    assert.equal(h.environment.showStage, true);
    assert.equal(h.environment.showBots, true);
    assert.equal(h.camera.defaultYaw, HOME_YAW);
    assert.ok(Math.abs(h.camera.defaultYaw - WARDROBE_FRONT_YAW) < 1);
    assert.ok(h.camera.frameLift > 0);
    assert.equal(isShowcaseMode("home"), true);
    assert.equal(isShowcaseMode("gameplay"), false);
  });

  test("victory is a studio hero shot over the results sheet", () => {
    assert.equal(getPresentationMode("results", "play"), "victory");
    assert.equal(getPresentationMode("results", "home", true), "victory");
    const v = PRESENTATION_PROFILES.victory;
    assert.equal(v.environment.showTrack, false);
    assert.equal(v.environment.showBots, false);
    assert.equal(v.environment.showStage, true);
    assert.equal(v.camera.defaultYaw, WARDROBE_FRONT_YAW);
    assert.ok(v.camera.frameLift > 0);
    assert.ok(v.camera.autoOrbitSpeed > 0);
  });

  test("wardrobe camera defaults to a front-facing yaw and a clamped zoom", () => {
    const cam = PRESENTATION_PROFILES.wardrobe.camera;
    assert.equal(cam.defaultYaw, WARDROBE_FRONT_YAW);
    assert.ok(cam.minDistance < cam.distancePortrait);
    assert.ok(cam.maxDistance > cam.distance);
    assert.equal(PRESENTATION_PROFILES.wardrobe.environment.showTrack, false);
    assert.equal(PRESENTATION_PROFILES.wardrobe.environment.showBots, false);
    assert.equal(PRESENTATION_PROFILES.wardrobe.environment.showStage, true);
    assert.ok(PRESENTATION_PROFILES.wardrobe.camera.frameLift > 0);
    assert.equal(PRESENTATION_PROFILES.gameplay.camera.frameLift, 0);
    assert.equal(PRESENTATION_PROFILES.gameplay.environment.showStage, false);
  });

  test("pinch zoom cannot enter the mesh or fly to infinity", () => {
    const cam = PRESENTATION_PROFILES.wardrobe.camera;
    assert.equal(clampShowcaseDistance(0.2), cam.minDistance);
    assert.equal(clampShowcaseDistance(99), cam.maxDistance);
    assert.equal(clampShowcaseDistance(cam.distancePortrait), cam.distancePortrait);
  });

  test("showcase view-offset is vertical in portrait and horizontal beside a landscape dock", () => {
    const lift = PRESENTATION_PROFILES.wardrobe.camera.frameLift;
    const portrait = showcaseViewOffset({
      mode: "wardrobe",
      portrait: true,
      width: 390,
      height: 844,
      hub: "character",
      frameLift: lift,
    });
    assert.ok(portrait);
    assert.equal(portrait.x, 0);
    assert.ok(portrait.y < 0);

    const docked = showcaseViewOffset({
      mode: "wardrobe",
      portrait: false,
      width: 852,
      height: 393,
      hub: "character",
      frameLift: lift,
    });
    assert.ok(docked);
    assert.ok(docked.x > 0);
    assert.equal(docked.y, 0);

    const home = showcaseViewOffset({
      mode: "home",
      portrait: false,
      width: 852,
      height: 393,
      hub: "home",
      frameLift: PRESENTATION_PROFILES.home.camera.frameLift,
    });
    assert.equal(home, null);

    const playDock = showcaseViewOffset({
      mode: "home",
      portrait: false,
      width: 852,
      height: 393,
      hub: "play",
      frameLift: PRESENTATION_PROFILES.home.camera.frameLift,
    });
    assert.ok(playDock);
    assert.ok(playDock.x > 0);

    const tall = showcaseViewOffset({
      mode: "wardrobe",
      portrait: false,
      width: 1280,
      height: 800,
      hub: "character",
      frameLift: lift,
    });
    assert.ok(tall);
    assert.equal(tall.x, 0);
    assert.ok(tall.y < 0);

    assert.equal(
      showcaseViewOffset({
        mode: "gameplay",
        portrait: false,
        width: 852,
        height: 393,
        hub: "home",
        frameLift: 0,
      }),
      null,
    );
    assert.ok(COMPACT_LANDSCAPE_MAX_HEIGHT >= 393);
  });
});
