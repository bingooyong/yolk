import { useEffect, useState } from "react";
import { Home, RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Confetti } from "@/components/Confetti";
import { sfxVictory, unlockAudio } from "@/game/audio";
import { LEVELS, LEVEL_ORDER } from "@/game/levels";
import { useGameStore } from "@/game/store";
import { cn } from "@/lib/utils";

function formatTime(t: number) {
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}

export function ResultScreen({
  onAgain,
  onMenu,
  onNext,
}: {
  onAgain: () => void;
  onMenu: () => void;
  onNext: () => void;
}) {
  const racers = useGameStore((s) => s.hud.racers);
  const time = useGameStore((s) => s.hud.time);
  const bestTime = useGameStore((s) => s.bestTime);
  const payout = useGameStore((s) => s.lastPayout);
  const bonus = useGameStore((s) => s.lastBonus);
  const levelId = useGameStore((s) => s.levelId);
  const you = racers.find((r) => r.isPlayer);
  const win = you?.place === 1;
  const idx = LEVEL_ORDER.indexOf(levelId);
  const hasNext = idx >= 0 && idx < LEVEL_ORDER.length - 1;
  const [step, setStep] = useState(0);

  useEffect(() => {
    unlockAudio();
    sfxVictory();
    const a = window.setTimeout(() => setStep(1), 280);
    const b = window.setTimeout(() => setStep(2), 720);
    const c = window.setTimeout(() => setStep(3), 1180);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
      window.clearTimeout(c);
    };
  }, []);

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-end justify-center bg-ink/45 md:items-center">
      <Confetti active={win && step >= 1} />
      <div
        className="relative w-full max-w-md rounded-t-3xl border border-border bg-ink/90 p-5 shadow-panel backdrop-blur-md md:rounded-3xl md:p-7"
        style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}
      >
        <div className="flex flex-col items-center text-center">
          <Trophy
            className={cn(
              "size-16 text-butter transition-transform duration-500",
              step >= 1 ? "scale-100 rotate-0" : "scale-0 -rotate-12",
            )}
            strokeWidth={1.6}
          />
          <p className="mt-2 font-display text-4xl">{win ? "VICTORY" : "完赛"}</p>
          <p className="text-sm text-fg-muted">{LEVELS[levelId].theme.name}</p>
        </div>
        {step >= 2 && (
          <div className="mt-4 space-y-1 text-center text-sm">
            <p>第 {you?.place ?? "—"} 名 · {formatTime(you?.finishTime || time)}</p>
            {bestTime != null && <p className="text-xs text-fg-subtle">最佳 {formatTime(bestTime)}</p>}
            <p className="text-butter">+{payout} 币</p>
            {(bonus.first > 0 || bonus.perfect > 0 || bonus.noFall > 0) && (
              <p className="text-xs text-fg-subtle">
                {bonus.first > 0 ? `首通 +${bonus.first}  ` : ""}
                {bonus.noFall > 0 ? `无掉落 +${bonus.noFall}  ` : ""}
                {bonus.perfect > 0 ? `收集 +${bonus.perfect}` : ""}
              </p>
            )}
          </div>
        )}
        {step >= 3 && (
          <div className="mt-5 flex flex-col gap-2">
            {hasNext ? (
              <Button size="lg" onClick={onNext} className="w-full" aria-label="Next level">
                NEXT LEVEL
              </Button>
            ) : (
              <Button size="lg" onClick={onMenu} className="w-full">
                全部完成
              </Button>
            )}
            <Button variant="secondary" size="lg" onClick={onAgain} className="w-full" aria-label="Play again">
              <RotateCcw className="size-4" />
              PLAY AGAIN
            </Button>
            <Button variant="ghost" size="lg" onClick={onMenu} className="w-full" aria-label="Home">
              <Home className="size-4" />
              HOME
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
