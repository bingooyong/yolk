import assert from "node:assert/strict";
import { test } from "node:test";
import { getCanvasRemountKey, getVisualProfile, VISUAL_FOUNDATION } from "./visualProfile.ts";

test("low quality stays inside the mobile budget", () => {
  const profile = getVisualProfile("low");

  assert.equal(profile.contextAntialias, false);
  assert.equal(profile.shadows, false);
  assert.equal(profile.shadowMapSize, 0);
  assert.equal(profile.dpr[1] <= 1.25, true);
  assert.equal(profile.environmentMapSize <= 32, true);
});

test("medium and high add coherent quality without exceeding their tier", () => {
  const medium = getVisualProfile("medium");
  const high = getVisualProfile("high");

  assert.equal(medium.contextAntialias, true);
  assert.equal(medium.shadows, true);
  assert.equal(medium.shadowMapSize, 1024);
  assert.equal(high.contextAntialias, true);
  assert.equal(high.shadows, true);
  assert.equal(high.shadowMapSize, 1536);
  assert.equal(medium.dpr[1] < high.dpr[1], true);
  assert.equal(medium.environmentMapSize < high.environmentMapSize, true);
  assert.equal(medium.environmentIntensity < high.environmentIntensity, true);
});

test("canvas remounting follows immutable MSAA mode, not every quality change", () => {
  const low = getCanvasRemountKey("level-1", "low");
  const medium = getCanvasRemountKey("level-1", "medium");
  const high = getCanvasRemountKey("level-1", "high");

  assert.notEqual(low, medium);
  assert.equal(medium, high);
});

test("the camera-following sky shell stays inside the camera far plane", () => {
  assert.equal(VISUAL_FOUNDATION.sky.radius < VISUAL_FOUNDATION.camera.far, true);
});

test("tone and color output have one explicit foundation contract", () => {
  assert.equal(VISUAL_FOUNDATION.renderer.toneMapping, "ACESFilmic");
  assert.equal(VISUAL_FOUNDATION.renderer.exposure, 1.18);
  assert.equal(VISUAL_FOUNDATION.renderer.outputColorSpace, "sRGB");
});
