import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CAM_DIST, CAM_HEIGHT, CAM_LOOKAHEAD } from "./config";
import { shadowMapSize, type Quality } from "@/engine/device";
import { MAX_FRAME_DT } from "@/engine/pipeline";
import { decayTrauma, sim } from "./sim";
import { useGameStore } from "./store";

export function CameraRig({ portrait }: { portrait: boolean }) {
  const { camera } = useThree();
  const pos = useRef(new THREE.Vector3(0, 8, 16));
  const look = useRef(new THREE.Vector3(0, 0.6, 0));
  const desired = useRef(new THREE.Vector3());
  const lookAt = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const dt = Math.min(delta, MAX_FRAME_DT);
    const phase = useGameStore.getState().phase;
    decayTrauma(dt);
    const t = state.clock.elapsedTime;

    const player = sim.racers.find((r) => r.isPlayer);
    const px = player?.x ?? 0;
    const py = player?.y ?? 0.7;
    const pz = player?.z ?? 6;

    if (phase === "title") {
      const side = portrait ? 1.35 : 1.85;
      const back = portrait ? 4.0 : 4.6;
      const up = portrait ? 1.55 : 1.75;
      desired.current.set(px + side + Math.sin(t * 0.35) * 0.2, py + up, pz + back);
      lookAt.current.set(px, py + 0.52, pz);
    } else {
      const dist = portrait ? CAM_DIST + 1.1 : CAM_DIST;
      const height = portrait ? CAM_HEIGHT + 0.35 : CAM_HEIGHT;
      desired.current.set(px * 0.35, py + height, pz + dist);
      lookAt.current.set(px * 0.22, py + 0.55, pz - CAM_LOOKAHEAD);
    }

    const k = phase === "title" ? 1.8 : 3.2;
    const a = 1 - Math.exp(-k * dt);
    pos.current.lerp(desired.current, a);
    look.current.lerp(lookAt.current, a);

    const mag = sim.trauma * sim.trauma * 0.06;
    camera.position.set(
      pos.current.x + Math.sin(t * 23) * mag,
      pos.current.y,
      pos.current.z,
    );
    camera.lookAt(look.current);

    const persp = camera as THREE.PerspectiveCamera;
    if (persp.isPerspectiveCamera) {
      const base = portrait ? 54 : 46;
      const target = phase === "title" ? base - 4 : base + (sim.playerDashing ? 2 : 0);
      persp.fov += (target - persp.fov) * (1 - Math.exp(-5 * dt));
      persp.updateProjectionMatrix();
    }

    const dirX = look.current.x - camera.position.x;
    const dirZ = look.current.z - camera.position.z;
    sim.camYaw = Math.atan2(-dirX, -dirZ);
  });

  return null;
}

export function FollowLight({ quality }: { quality: Quality }) {
  const ref = useRef<THREE.DirectionalLight>(null);
  const size = shadowMapSize(quality);
  useFrame(() => {
    const p = sim.racers.find((r) => r.isPlayer);
    if (!p || !ref.current) return;
    ref.current.position.set(p.x + 10, p.y + 16, p.z + 8);
    ref.current.target.position.set(p.x, p.y, p.z);
    ref.current.target.updateMatrixWorld();
  });
  return (
    <directionalLight
      ref={ref}
      castShadow={size > 0}
      intensity={1.55}
      shadow-mapSize={[size || 256, size || 256]}
      shadow-camera-near={2}
      shadow-camera-far={80}
      shadow-camera-left={-22}
      shadow-camera-right={22}
      shadow-camera-top={22}
      shadow-camera-bottom={-22}
      shadow-bias={-0.0004}
    >
      <object3D attach="target" />
    </directionalLight>
  );
}
