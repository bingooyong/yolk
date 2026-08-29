import { EGG_HALF, EGG_RADIUS } from "./config.ts";
import type { MoveState } from "./sim";

/**
 * Rapier keeps an intentional 0.08 environment gap around the unchanged
 * capsule. A settled capsule center is therefore one capsule half-height plus
 * that controller offset above the visual ground plane.
 */
export const CHARACTER_CONTROLLER_OFFSET = 0.08;
export const EGG_SHELL_SCALE = 1.085;

/** Half-height of the visible outer egg shell, after its presentation scale. */
export const EGG_VISUAL_HALF_HEIGHT = 0.52 * 1.26 * EGG_SHELL_SCALE;

/** Distance from a settled racer center to the visual contact plane. */
export const EGG_CONTACT_CENTER_HEIGHT = EGG_RADIUS + EGG_HALF + CHARACTER_CONTROLLER_OFFSET;

/**
 * The outer shell is 0.030892 taller than the controller's settled contact
 * frame. Lifting only the presentation root removes the ground penetration
 * without changing the capsule, controller offset, snap distance, or bounds.
 */
export const EGG_VISUAL_GROUND_OFFSET = EGG_VISUAL_HALF_HEIGHT - EGG_CONTACT_CENTER_HEIGHT;

export type CharacterPresentation = {
  moveState: MoveState;
  grounded: boolean;
  horizontalSpeed: number;
  verticalVelocity: number;
  squash: number;
  lean: number;
  bank: number;
  rollSpin: number;
  rollT: number;
  contactX: number;
  contactY: number;
  contactZ: number;
  contactHeight: number;
  contactValid: boolean;
};

export type CharacterPresentationSnapshot = {
  x: number;
  y: number;
  z: number;
  moveState: MoveState;
  grounded: boolean;
  horizontalSpeed: number;
  verticalVelocity: number;
  squash: number;
  lean: number;
  bank: number;
  rollSpin: number;
  rollT: number;
};

export function createCharacterPresentation(spawn: {
  x: number;
  y: number;
  z: number;
}): CharacterPresentation {
  return {
    moveState: "idle",
    grounded: true,
    horizontalSpeed: 0,
    verticalVelocity: 0,
    squash: 1,
    lean: 0,
    bank: 0,
    rollSpin: 0,
    rollT: 0,
    contactX: spawn.x,
    contactY: spawn.y - EGG_CONTACT_CENTER_HEIGHT,
    contactZ: spawn.z,
    contactHeight: 0,
    contactValid: true,
  };
}

/**
 * Copy compact fixed-step state into the render-side object. This function is
 * presentation sync only: callers must continue deriving every input in the
 * physics step, not in a render frame.
 */
export function syncCharacterPresentation(
  presentation: CharacterPresentation,
  snapshot: CharacterPresentationSnapshot,
): void {
  presentation.moveState = snapshot.moveState;
  presentation.grounded = snapshot.grounded;
  presentation.horizontalSpeed = snapshot.horizontalSpeed;
  presentation.verticalVelocity = snapshot.verticalVelocity;
  presentation.squash = snapshot.squash;
  presentation.lean = snapshot.lean;
  presentation.bank = snapshot.bank;
  presentation.rollSpin = snapshot.rollSpin;
  presentation.rollT = snapshot.rollT;

  if (snapshot.grounded) {
    presentation.contactX = snapshot.x;
    presentation.contactY = snapshot.y - EGG_CONTACT_CENTER_HEIGHT;
    presentation.contactZ = snapshot.z;
    presentation.contactHeight = 0;
    presentation.contactValid = true;
    return;
  }

  if (!presentation.contactValid) {
    presentation.contactX = snapshot.x;
    presentation.contactY = snapshot.y - EGG_CONTACT_CENTER_HEIGHT;
    presentation.contactZ = snapshot.z;
    presentation.contactValid = true;
  }

  presentation.contactHeight = Math.max(
    0,
    snapshot.y - EGG_CONTACT_CENTER_HEIGHT - presentation.contactY,
  );
}

export type CharacterPose = {
  lift: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  armSway: number;
  wingEnergy: number;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * Produce a transform-only character pose. Gameplay still owns all timing and
 * movement; this uses already-computed presentation state plus render time.
 */
export function getCharacterPose(presentation: CharacterPresentation, time: number): CharacterPose {
  const speedRatio = clamp01(presentation.horizontalSpeed / 8.4);
  let lift = 0;
  let scaleX = 1;
  let scaleY = presentation.squash;
  let scaleZ = 1;
  let armSway = 0;
  let wingEnergy = 0.35;

  if (presentation.moveState === "idle" && presentation.grounded) {
    // The calibrated root offset is 0.030892; this amplitude leaves roughly
    // 0.017 clearance at the lowest breath point instead of piercing ground.
    const breath = Math.sin(time * 2.4);
    lift += breath * 0.014;
    scaleY *= 1 - breath * 0.012;
    scaleX *= 1 + breath * 0.01;
    scaleZ *= 1 + breath * 0.01;
    armSway = Math.sin(time * 3.2) * 0.12;
  } else if (presentation.moveState === "running" && presentation.grounded) {
    lift += Math.abs(Math.sin(time * 11)) * 0.035 * speedRatio;
    scaleY *= 1 - Math.abs(Math.sin(time * 22)) * 0.035 * speedRatio;
    scaleX *= 1 + Math.abs(Math.sin(time * 22)) * 0.022 * speedRatio;
    scaleZ *= 1 + Math.abs(Math.sin(time * 22)) * 0.022 * speedRatio;
    armSway = Math.sin(time * 11) * (0.24 + speedRatio * 0.24);
    wingEnergy = 0.7 + speedRatio * 0.3;
  }

  const airStretch = clamp01(Math.abs(presentation.verticalVelocity) / 9.5) * 0.14;

  switch (presentation.moveState) {
    case "jump_start":
      scaleY *= 1.08;
      scaleX *= 0.94;
      scaleZ *= 0.94;
      wingEnergy = 0.9;
      break;
    case "airborne":
    case "falling":
      scaleY *= 1 + airStretch;
      scaleX *= 1 - airStretch * 0.55;
      scaleZ *= 1 - airStretch * 0.55;
      wingEnergy = 1;
      break;
    case "landing":
      scaleY *= 0.96;
      scaleX *= 1.04;
      scaleZ *= 1.04;
      wingEnergy = 0.5;
      break;
    case "pounce":
      scaleY *= 1.14;
      scaleX *= 0.9;
      scaleZ *= 0.9;
      lift += 0.02;
      wingEnergy = 1;
      break;
    case "roll":
      scaleY *= 0.72;
      scaleX *= 1.12;
      scaleZ *= 1.12;
      wingEnergy = 0.8;
      break;
    case "boost":
      scaleY *= 0.92;
      scaleX *= 1.07;
      scaleZ *= 1.07;
      lift += 0.01;
      armSway = 0.36;
      wingEnergy = 1;
      break;
    default:
      break;
  }

  // Guard the cheap stretch math against extreme values while preserving the
  // fixed-step squash impulse from jump, landing, and ability states.
  scaleY = Math.min(1.5, Math.max(0.48, scaleY));
  const inverseWidth = 1 / Math.sqrt(scaleY);
  scaleX *= inverseWidth;
  scaleZ *= inverseWidth;

  return { lift, scaleX, scaleY, scaleZ, armSway, wingEnergy };
}

export type ContactShadowPose = {
  opacity: number;
  size: number;
  visible: boolean;
};

/**
 * A radial blob is intentionally approximate. It costs one textured quad and
 * no depth pass, while retaining height and landing cues on every racer.
 */
export function getContactShadowPose(presentation: CharacterPresentation): ContactShadowPose {
  const height = presentation.contactHeight;
  const fade = 1 / (1 + (height / 1.15) ** 2);
  const shrink = clamp01(height / 3.4);
  const opacity = 0.34 * fade;
  const size = 0.95 * (1 - shrink * 0.42);
  return {
    opacity,
    size,
    visible: presentation.contactValid && opacity > 0.012,
  };
}
