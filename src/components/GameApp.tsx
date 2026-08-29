import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";
import { GameUI } from "@/components/GameUI";
import { PerformanceDebugOverlay } from "@/components/PerformanceDebug";
import { TouchControls } from "@/components/TouchControls";
import { installInput } from "@/game/input";
import { MusicDirector } from "@/game/MusicDirector";
import { useGameStore } from "@/game/store";
import { resumeAudio, suspendAudio } from "@/game/audio";

const GameCanvas = lazy(() => import("@/game/GameCanvas")) as ComponentType;

export function GameApp() {
  const [ready, setReady] = useState(false);
  const [debugPerf, setDebugPerf] = useState(false);

  useEffect(() => {
    const off = installInput();
    const resume = () => {
      if (document.hidden) suspendAudio();
      else resumeAudio();
    };
    const block = (event: Event) => event.preventDefault();
    document.addEventListener("visibilitychange", resume);
    document.addEventListener("gesturestart", block);
    document.addEventListener("gesturechange", block);
    document.addEventListener("gestureend", block);
    document.addEventListener("contextmenu", block);
    return () => {
      off();
      document.removeEventListener("visibilitychange", resume);
      document.removeEventListener("gesturestart", block);
      document.removeEventListener("gesturechange", block);
      document.removeEventListener("gestureend", block);
      document.removeEventListener("contextmenu", block);
    };
  }, []);

  useEffect(() => {
    useGameStore.getState().reconcilePersisted();
    const enabled = new URLSearchParams(window.location.search).get("debug") === "perf";
    setDebugPerf(enabled);
    setReady(true);
  }, []);

  return (
    <div className="game-root relative h-dvh w-full overflow-hidden bg-sky">
      {ready ? (
        <Suspense fallback={<Boot />}>
          <GameCanvas />
        </Suspense>
      ) : (
        <Boot />
      )}
      {debugPerf && <PerformanceDebugOverlay />}
      <MusicDirector />
      <GameUI />
      <TouchControls />
    </div>
  );
}

function Boot() {
  return (
    <div className="absolute inset-0 bg-sky">
      <canvas className="absolute inset-0 h-full w-full" aria-hidden />
    </div>
  );
}
