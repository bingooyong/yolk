import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  CAM_DIST,
  CAM_HEIGHT,
  CAM_LOOKAHEAD,
  CAM_PITCH_MAX,
  CAM_PITCH_MIN,
  CAM_RECENTER,
} from "./config";
import { MAX_FRAME_DT } from "@/engine/pipeline";
import { actions, touch } from "./input";
import { decayTrauma, sim } from "./sim";
import { useGameStore } from "./store";
import { currentLevel } from "./course";
import { camExtraForWidth, localPlayableWidth } from "./spatial";
import { getPresentationMode, isShowcaseMode, PRESENTATION_PROFILES, showcaseViewOffset } from "./presentation/profiles";

export function CameraRig({ portrait }: { portrait: boolean }) {
  const { camera, size } = useThree();
  const pos = useRef(new THREE.Vector3(0, 8, 16));
  const look = useRef(new THREE.Vector3(0, 0.6, 0));
  const desired = useRef(new THREE.Vector3());
  const lookAt = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const dt = Math.min(delta, MAX_FRAME_DT);
    const phase = useGameStore.getState().phase;
    decayTrauma(dt);
    const t = state.clock.elapsedTime;
    const sens = useGameStore.getState().camSens ?? 1;

    const player = sim.racers.find((r) => r.isPlayer);
    const px = player?.x ?? 0;
    const py = player?.y ?? 0.7;
    const pz = player?.z ?? 6;

    if (phase === "playing" || phase === "paused") {
      sim.lookYaw -= touch.lookX * 0.0075 * sens;
      sim.lookPitch += touch.lookY * 0.0055 * sens;
      touch.lookX = 0;
      touch.lookY = 0;
      sim.lookYaw += actions.lookX * 2.35 * dt * sens;
      sim.lookPitch += actions.lookY * 1.6 * dt * sens;
      sim.lookPitch = THREE.MathUtils.clamp(sim.lookPitch, CAM_PITCH_MIN, CAM_PITCH_MAX);
      const looking = Math.abs(actions.lookX) + Math.abs(actions.lookY) > 0.04;
      if (looking) sim.lookIdle = 0;
      else sim.lookIdle += dt;
      if (sim.lookIdle > CAM_RECENTER) {
        sim.lookYaw += (0 - sim.lookYaw) * (1 - Math.exp(-1.15 * dt));
        sim.lookPitch += (0 - sim.lookPitch) * (1 - Math.exp(-1.15 * dt));
      }
    } else if (phase === "title" || phase === "results") {
      sim.lookYaw += (0 - sim.lookYaw) * (1 - Math.exp(-3 * dt));
      sim.lookPitch += (0 - sim.lookPitch) * (1 - Math.exp(-3 * dt));
    }

    const hub = useGameStore.getState().hub;
    const revealing = Boolean(useGameStore.getState().lastPull);
    const mode = getPresentationMode(phase, hub, revealing);
    const cam = PRESENTATION_PROFILES[mode].camera;

    if (isShowcaseMode(mode)) {
      sim.showcaseYaw += touch.lookX * 0.01;
      if (Math.abs(touch.lookX) > 0.2) sim.lookIdle = 0;
      else {
        sim.lookIdle += dt;
        if (cam.autoOrbitSpeed > 0 && sim.lookIdle > cam.autoOrbitDelay) {
          sim.showcaseYaw += dt * cam.autoOrbitSpeed;
        }
      }
      touch.lookX = 0;
      touch.lookY = 0;
      const yaw = sim.showcaseYaw;
      const dist = THREE.MathUtils.clamp(
        sim.showcaseDistance,
        cam.minDistance,
        cam.maxDistance,
      );
      const height = portrait ? cam.heightPortrait : cam.height;
      desired.current.set(
        px + Math.sin(yaw) * dist,
        py + height,
        pz + Math.cos(yaw) * dist,
      );
      lookAt.current.set(px, py + cam.lookHeight, pz);
    } else {
      const padW = localPlayableWidth(currentLevel().platforms, pz);
      const extra = camExtraForWidth(padW);
      const dist = (portrait ? CAM_DIST + 1.1 : CAM_DIST) + extra.dist + (sim.playerDashing ? 0.35 : 0);
      const height = (portrait ? CAM_HEIGHT + 0.35 : CAM_HEIGHT) + extra.height;
      const air = player && !player.grounded;
      const airLift = air ? Math.min(2.4, 0.45 + Math.max(0, py - 0.7) * 0.55) : 0;
      const yaw = sim.lookYaw;
      const pitch = sim.lookPitch;
      const back = dist * Math.cos(pitch);
      desired.current.set(
        px - Math.sin(yaw) * back,
        Math.max(1.45, py + height + airLift + Math.sin(pitch) * dist * 0.85),
        pz + Math.cos(yaw) * back,
      );
      const ahead = (CAM_LOOKAHEAD + extra.ahead) * (air ? 1.15 : 1);
      lookAt.current.set(px, py + 0.45, pz - Math.cos(yaw) * ahead);
    }

    const k = isShowcaseMode(mode) ? 1.8 : 3.2;
    const a = 1 - Math.exp(-k * dt);
    pos.current.lerp(desired.current, a);
    look.current.lerp(lookAt.current, a);

    const mag = sim.trauma * sim.trauma * 0.035;
    camera.position.set(
      pos.current.x + Math.sin(t * 18) * mag,
      Math.max(1.35, pos.current.y),
      pos.current.z,
    );
    camera.lookAt(look.current);

    const persp = camera as THREE.PerspectiveCamera;
    if (persp.isPerspectiveCamera) {
      const base = portrait ? 54 : 46;
      const target = isShowcaseMode(mode) ? base - 4 : base + sim.dashFov;
      persp.fov += (target - persp.fov) * (1 - Math.exp(-5 * dt));
      const lift = cam.frameLift;
      const offset = showcaseViewOffset({
        mode,
        portrait,
        width: size.width,
        height: size.height,
        hub,
        frameLift: lift,
      });
      if (offset) {
        persp.setViewOffset(size.width, size.height, offset.x, offset.y, size.width, size.height);
      } else {
        persp.clearViewOffset();
      }
      persp.updateProjectionMatrix();
    }

    const dirX = look.current.x - camera.position.x;
    const dirZ = look.current.z - camera.position.z;
    sim.camYaw = Math.atan2(-dirX, -dirZ);
  });

  return null;
}
