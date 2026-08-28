import { useEffect, useRef } from "react";
import {
  duckMusic,
  resumeAudio,
  setIntensity,
  setMusicState,
  setMusicVolume,
  setMuted,
  setSfxVolume,
  suspendAudio,
  unlockAudio,
  type Intensity,
} from "./audio";
import { useGameStore } from "./store";

export function MusicDirector() {
  const phase = useGameStore((s) => s.phase);
  const levelId = useGameStore((s) => s.levelId);
  const muted = useGameStore((s) => s.muted);
  const musicVol = useGameStore((s) => s.musicVol);
  const sfxVol = useGameStore((s) => s.sfxVol);
  const raceId = useGameStore((s) => s.raceId);
  const place = useGameStore((s) => s.hud.place);
  const progress = useGameStore((s) => {
    const p = s.hud.racers.find((r) => r.isPlayer);
    return p?.progress ?? 0;
  });
  const peak = useRef<Intensity>(0);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("touchend", unlock);
    window.addEventListener("keydown", unlock);
    const vis = () => {
      if (document.hidden) suspendAudio();
      else resumeAudio();
    };
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchend", unlock);
      window.removeEventListener("keydown", unlock);
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  useEffect(() => {
    setMuted(muted);
  }, [muted]);
  useEffect(() => {
    setMusicVolume(musicVol);
  }, [musicVol]);
  useEffect(() => {
    setSfxVolume(sfxVol);
  }, [sfxVol]);

  useEffect(() => {
    peak.current = 0;
  }, [raceId]);

  useEffect(() => {
    if (phase === "paused") {
      duckMusic(true);
      return;
    }
    duckMusic(false);
    if (phase === "title") void setMusicState("MENU");
    else if (phase === "countdown" || phase === "playing") void setMusicState("GAMEPLAY", levelId);
  }, [phase, levelId]);

  useEffect(() => {
    if (phase === "results") void setMusicState(place === 1 ? "VICTORY" : "DEFEAT");
  }, [phase, place]);

  useEffect(() => {
    if (phase !== "playing") return;
    const next: Intensity = progress >= 0.78 ? 2 : progress >= 0.55 ? 1 : 0;
    if (next <= peak.current) return;
    peak.current = next;
    if (next === 2) void setMusicState("HIGH_INTENSITY", levelId);
    else setIntensity(next);
  }, [phase, progress, levelId]);

  return null;
}
