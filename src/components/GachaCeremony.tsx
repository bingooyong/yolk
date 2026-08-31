import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { sfxBoxDrop, sfxBoxOpen, sfxBoxShake, sfxReveal, unlockAudio } from "@/game/audio";
import { haptic } from "@/engine/haptics";
import { rarityColor, rarityLabel, type Rarity, type Skin } from "@/game/skins";
import { resolveSkinAppearance } from "@/game/presentation/appearance";
import { sim } from "@/game/sim";
import { cn } from "@/lib/utils";

type Stage = "drop" | "shake" | "glow" | "burst" | "reveal";

const TIMING: Record<Rarity, { shake: number; glow: number }> = {
  common: { shake: 700, glow: 280 },
  rare: { shake: 1000, glow: 360 },
  epic: { shake: 1400, glow: 480 },
  legendary: { shake: 1900, glow: 640 },
};

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function GachaCeremony({
  skin,
  duplicate,
  onDone,
}: {
  skin: Skin;
  duplicate: boolean;
  onDone: () => void;
}) {
  const [stage, setStage] = useState<Stage>(reducedMotion() ? "reveal" : "drop");
  const skipped = useRef(false);
  const canSkip = useRef(false);
  const lastX = useRef(0);
  const glow = rarityColor(skin.rarity);
  const times = TIMING[skin.rarity];
  const appearance = resolveSkinAppearance(skin);

  useEffect(() => {
    const lock = window.setTimeout(() => {
      canSkip.current = true;
    }, 480);
    if (reducedMotion()) {
      sfxReveal(skin.rarity);
      return () => window.clearTimeout(lock);
    }
    unlockAudio();
    sfxBoxDrop();
    haptic("light");

    const t: number[] = [];
    t.push(window.setTimeout(() => setStage("shake"), 380));
    t.push(
      window.setTimeout(() => {
        setStage("glow");
        haptic("medium");
      }, 380 + times.shake),
    );
    t.push(
      window.setTimeout(() => {
        setStage("burst");
        sfxBoxOpen();
        haptic("medium");
      }, 380 + times.shake + times.glow),
    );
    t.push(
      window.setTimeout(() => {
        setStage("reveal");
        sfxReveal(skin.rarity);
      }, 380 + times.shake + times.glow + 520),
    );
    return () => t.forEach((id) => window.clearTimeout(id));
  }, [skin, times.glow, times.shake]);

  useEffect(() => {
    if (stage !== "shake") return;
    const id = window.setInterval(() => sfxBoxShake(), 140);
    return () => window.clearInterval(id);
  }, [stage]);

  const skip = () => {
    if (!canSkip.current || skipped.current || stage === "reveal") return;
    skipped.current = true;
    setStage("reveal");
    sfxReveal(skin.rarity);
  };

  const sparks = useMemo(
    () =>
      Array.from({ length: skin.rarity === "legendary" ? 22 : 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2 + 0.2;
        const d = 90 + (i % 5) * 18;
        return { i, x: Math.cos(a) * d, y: Math.sin(a) * d, rot: (i * 24) % 360 };
      }),
    [skin.rarity],
  );

  const open = stage === "burst" || stage === "reveal";
  const revealing = stage === "reveal";

  return (
    <div
      className={cn(
        "pointer-events-auto absolute inset-0 z-40",
        revealing ? "gacha-reveal" : "flex flex-col items-center justify-center bg-ink/90",
      )}
      role="dialog"
      aria-label="开盒"
      onClick={revealing ? undefined : skip}
    >
      {(stage === "burst" || stage === "glow") && (
        <div
          className="gacha-flash pointer-events-none absolute inset-0"
          style={{ background: glow }}
        />
      )}

      {revealing && (
        <div
          className="gacha-orbit"
          aria-label="旋转角色"
          onPointerDown={(e) => {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            lastX.current = e.clientX;
          }}
          onPointerMove={(e) => {
            if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
            sim.showcaseYaw += (e.clientX - lastX.current) * 0.012;
            lastX.current = e.clientX;
            sim.lookIdle = 0;
          }}
        />
      )}

      {!revealing && (
        <p className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-fg-subtle">糖果盲盒</p>
      )}

      {!revealing && (
        <div className="relative flex h-64 w-56 items-center justify-center">
          {stage === "burst" &&
            sparks.map((s) => (
              <span
                key={s.i}
                className="gacha-ray pointer-events-none absolute left-1/2 top-1/2 h-28 w-1 origin-bottom rounded-full"
                style={
                  {
                    background: glow,
                    "--rot": `${s.rot}deg`,
                  } as CSSProperties
                }
              />
            ))}
          {stage === "burst" &&
            sparks.map((s) => (
              <span
                key={`d${s.i}`}
                className="gacha-spark pointer-events-none absolute left-1/2 top-1/2 size-2 rounded-full"
                style={
                  {
                    background: glow,
                    "--sx": `${s.x}px`,
                    "--sy": `${s.y}px`,
                  } as CSSProperties
                }
              />
            ))}
          <CandyCapsule
            stage={stage}
            glow={open ? glow : stage === "glow" ? glow : "#F0A07A"}
            open={open}
          />
        </div>
      )}

      {revealing ? (
        <div className="gacha-sheet">
          <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-fg-subtle">开出了</p>
          <p className="mt-1 text-center text-xs font-medium" style={{ color: glow }}>
            {rarityLabel(skin.rarity)}
            {duplicate ? " · 重复" : " · 新皮肤"}
            {appearance.prototype ? " · 原型外观" : ""}
          </p>
          <h2 className="gacha-name">{skin.name}</h2>
          {duplicate && <p className="mt-1 text-center text-sm text-fg-muted">重复款，返还 25 币</p>}
          <p className="mt-1 text-center text-xs text-fg-subtle">拖动旋转 · 只改外观，不影响速度</p>
          <Button size="lg" className="mt-3 w-full" onClick={onDone}>
            {duplicate ? "收下" : "收下 · 装备"}
          </Button>
        </div>
      ) : (
        <p className="mt-8 text-xs text-fg-subtle">轻触跳过</p>
      )}
    </div>
  );
}

function CandyCapsule({
  stage,
  glow,
  open,
}: {
  stage: Stage;
  glow: string;
  open: boolean;
}) {
  return (
    <div
      className={cn(
        "relative h-44 w-32",
        stage === "shake" && "gacha-shake",
        stage === "drop" && "gacha-pop",
      )}
      style={{
        filter: stage === "glow" || open ? `drop-shadow(0 0 22px ${glow})` : undefined,
      }}
    >
      <div
        className={cn("absolute inset-x-2 top-0 h-[46%]", open && "gacha-lid-open")}
        style={{ transformStyle: "preserve-3d" }}
      >
        <div
          className="absolute inset-0 rounded-t-full border border-border-strong"
          style={{
            background: `linear-gradient(180deg, var(--color-fg) 0%, ${glow} 100%)`,
          }}
        />
        <div className="absolute left-1/2 top-5 size-8 -translate-x-1/2 rounded-full bg-fg/25" />
      </div>
      <div
        className="absolute inset-x-2 bottom-0 h-[58%] rounded-b-[2.4rem] border border-border-strong"
        style={{
          background: `linear-gradient(180deg, ${glow} 0%, var(--color-surface) 100%)`,
        }}
      />
      <div
        className="absolute left-1/2 top-[42%] h-4 w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-border-strong"
        style={{ background: glow }}
      />
      {!open && (
        <span className="absolute left-1/2 top-[62%] -translate-x-1/2 font-display text-3xl text-fg/80">
          ?
        </span>
      )}
    </div>
  );
}
