import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EGG_CONTACT_CENTER_HEIGHT,
  EGG_VISUAL_GROUND_OFFSET,
  createCharacterPresentation,
  getCharacterPose,
  getContactShadowPose,
  syncCharacterPresentation,
  type CharacterPresentationSnapshot,
} from "./character-presentation.ts";

function snapshot(
  overrides: Partial<CharacterPresentationSnapshot> = {},
): CharacterPresentationSnapshot {
  return {
    x: 0,
    y: 0.68,
    z: 0,
    moveState: "idle",
    grounded: true,
    horizontalSpeed: 0,
    verticalVelocity: 0,
    squash: 1,
    lean: 0,
    bank: 0,
    rollSpin: 0,
    rollT: 0,
    ...overrides,
  };
}

describe("character presentation contact contract", () => {
  it("derives the visual lift from the unchanged capsule and controller frame", () => {
    assert_almostEqual(EGG_CONTACT_CENTER_HEIGHT, 0.68, 1e-12);
    assert_almostEqual(EGG_VISUAL_GROUND_OFFSET, 0.030892, 1e-6);
  });

  it("keeps the lowest idle-breath point above the contact plane", () => {
    const presentation = createCharacterPresentation({ x: 0, y: 0.68, z: 0 });
    const pose = getCharacterPose(presentation, -Math.PI / 4.8);
    assert_almostEqual(EGG_VISUAL_GROUND_OFFSET + pose.lift, 0.016892, 1e-6);
    assert.ok(pose.lift < 0);
  });

  it("anchors the shadow at the last grounded position while airborne", () => {
    const presentation = createCharacterPresentation({ x: 0, y: 0.68, z: 0 });
    syncCharacterPresentation(presentation, snapshot({ x: 2, y: 0.68, z: -2 }));
    assert_almostEqual(presentation.contactX, 2, 1e-12);
    assert_almostEqual(presentation.contactY, 0, 1e-12);
    assert_almostEqual(presentation.contactZ, -2, 1e-12);

    syncCharacterPresentation(
      presentation,
      snapshot({
        x: 3,
        y: 1.68,
        z: -3,
        moveState: "airborne",
        grounded: false,
        verticalVelocity: -3,
      }),
    );
    assert.deepEqual([presentation.contactX, presentation.contactZ], [2, -2]);
    assert_almostEqual(presentation.contactHeight, 1, 1e-12);

    const airborne = getContactShadowPose(presentation);
    syncCharacterPresentation(presentation, snapshot());
    const landed = getContactShadowPose(presentation);
    assert.ok(airborne.opacity < landed.opacity);
    assert.ok(airborne.size < landed.size);
    assert.equal(presentation.contactHeight, 0);
    assert.equal(landed.opacity, 0.34);
  });

  it("gives ability states distinct transform-only silhouettes", () => {
    const idle = getCharacterPose(createCharacterPresentation({ x: 0, y: 0.68, z: 0 }), 0.2);
    const presentation = createCharacterPresentation({ x: 0, y: 0.68, z: 0 });
    syncCharacterPresentation(
      presentation,
      snapshot({ moveState: "roll", rollT: 0.2, squash: 0.58 }),
    );
    const rolling = getCharacterPose(presentation, 0.2);
    assert.ok(rolling.scaleY < idle.scaleY);
    assert.ok(rolling.scaleX > idle.scaleX);
    assert.ok(rolling.scaleZ > idle.scaleZ);
  });
});

function assert_almostEqual(actual: number, expected: number, epsilon: number) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`,
  );
}
