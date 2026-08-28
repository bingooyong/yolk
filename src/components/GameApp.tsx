import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";
import { GameUI } from "@/components/GameUI";
import { TouchControls } from "@/components/TouchControls";
import { installInput } from "@/game/input";
import { MusicDirector } from "@/game/MusicDirector";
import { resumeAudio, suspendAudio } from "@/game/audio";

const gameCanvasLoad =
  typeof window !== "undefined" ? import("@/game/GameCanvas") : null;

const GameCanvas = lazy(
  () => gameCanvasLoad ?? import("@/game/GameCanvas"),
) as ComponentType;

export function GameApp() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    const off = installInput();
    const resume = () => {
      if (document.hidden) suspendAudio();
      else resumeAudio();
    };
    const block = (e: Event) => e.preventDefault();
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

  return (
    <div className="game-root relative h-dvh w-full overflow-hidden bg-sky">
      {ready ? (
        <Suspense fallback={<Boot />}>
          <GameCanvas />
        </Suspense>
      ) : (
        <Boot />
      )}
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