import { Suspense, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import * as THREE from "three";
import { qualityToDpr, useDevice } from "@/engine/device";
import { CameraRig, FollowLight } from "./CameraRig";
import { RacerField } from "./EggRacer";
import { Track } from "./Track";
import { currentLevel } from "./course";
import { installControlsTest } from "./input";
import { sim } from "./sim";
import { useGameStore } from "./store";

function Ranker() {
  useFrame(() => {
    const list = sim.racers;
    if (list.length === 0) return;
    const ranked = [...list].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return a.z - b.z;
    });
    ranked.forEach((r, i) => {
      r.place = i + 1;
    });
  });
  return null;
}

function HudPump() {
  useFrame(({ clock }) => {
    if (Math.floor(clock.elapsedTime * 12) % 2 === 0) {
      useGameStore.getState().pullSim();
    }
  });
  return null;
}

function Tone() {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.18;
    gl.outputColorSpace = THREE.SRGBColorSpace;
  }, [gl]);
  return null;
}

function Scene() {
  const paused = useGameStore((s) => s.phase === "paused");
  return (
    <Physics gravity={[0, -28, 0]} timeStep={1 / 60} interpolate paused={paused}>
      <Track />
      <RacerField />
      <Ranker />
    </Physics>
  );
}

export default function GameCanvas() {
  const device = useDevice();
  const dpr = qualityToDpr(device.quality);
  const shadows = device.quality !== "low";
  const levelId = useGameStore((s) => s.levelId);
  const theme = currentLevel().theme;

  useEffect(() => {
    installControlsTest(
      () => sim.playerYaw,
      () => sim.playerSpeed,
    );
  }, []);

  return (
    <Canvas
      key={levelId}
      className="absolute inset-0"
      shadows={shadows}
      dpr={dpr}
      camera={{ position: [0, 6, 14], fov: device.portrait ? 58 : 50, near: 0.1, far: 220 }}
      gl={{
        antialias: device.quality !== "low",
        powerPreference: "high-performance",
        alpha: false,
        stencil: false,
        depth: true,
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(theme.sky);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.18;
      }}
    >
      <color attach="background" args={[theme.sky]} />
      <fog attach="fog" args={[theme.fog, theme.fogNear, theme.fogFar]} />
      <ambientLight intensity={0.62} />
      <hemisphereLight args={["#FFF1DC", "#2A5AAA", 0.95]} />
      <FollowLight quality={device.quality} />
      <CameraRig portrait={device.portrait} />
      <Tone />
      <HudPump />
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  );
}
