import { Suspense, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import * as THREE from "three";
import { useDevice } from "@/engine/device";
import { PHYSICS_DT } from "@/engine/pipeline";
import { getCanvasRemountKey, getVisualProfile, VISUAL_FOUNDATION } from "@/engine/visualProfile";
import { CameraRig } from "./CameraRig";
import { RacerField } from "./EggRacer";
import { LightingSystem } from "./LightingSystem";
import { Track } from "./Track";
import { currentLevel } from "./course";
import { installControlsTest } from "./input";
import { observePerformanceRenderer } from "./performanceInstrumentation";
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

function Scene() {
  const paused = useGameStore((s) => s.phase === "paused");
  return (
    <Physics gravity={[0, -28, 0]} timeStep={PHYSICS_DT} interpolate paused={paused}>
      <Track />
      <RacerField />
      <Ranker />
    </Physics>
  );
}

function PerformanceRendererBridge() {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("debug") !== "perf") return;
    observePerformanceRenderer(gl);
  }, [gl]);
  return null;
}

export default function GameCanvas() {
  const device = useDevice();
  const gfx = useGameStore((s) => s.gfx);
  const quality = gfx === "auto" ? device.quality : gfx;
  const profile = getVisualProfile(quality);
  const levelId = useGameStore((s) => s.levelId);
  const theme = currentLevel().theme;
  const canvasKey = getCanvasRemountKey(levelId, quality);
  const renderer = VISUAL_FOUNDATION.renderer;

  useEffect(() => {
    installControlsTest(
      () => sim.playerYaw,
      () => sim.playerSpeed,
    );
  }, []);

  return (
    <Canvas
      key={canvasKey}
      className="absolute inset-0"
      shadows={profile.shadows}
      dpr={profile.dpr}
      camera={{
        position: [0, 6, 14],
        fov: device.portrait ? 58 : 50,
        near: VISUAL_FOUNDATION.camera.near,
        far: VISUAL_FOUNDATION.camera.far,
      }}
      gl={{
        antialias: profile.contextAntialias,
        powerPreference: "high-performance",
        alpha: false,
        stencil: false,
        depth: true,
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = renderer.exposure;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
    >
      <color attach="background" args={[theme.sky]} />
      <fog attach="fog" args={[theme.fog, theme.fogNear, theme.fogFar]} />
      <LightingSystem quality={quality} />
      <CameraRig portrait={device.portrait} />
      <PerformanceRendererBridge />
      <HudPump />
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  );
}
