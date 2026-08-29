import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { sfxBoxDrop, sfxBoxOpen, sfxBoxShake, sfxReveal, unlockAudio } from "@/game/audio";
import { haptic } from "@/engine/haptics";
import { EGG_COLORS } from "@/game/config";
import { rarityColor, rarityLabel, type Rarity, type Skin, type VisualId } from "@/game/skins";
import { useGameStore } from "@/game/store";
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
  const colorId = useGameStore((s) => s.colorId);
  const eggHex = EGG_COLORS.find((c) => c.id === colorId)?.hex ?? "#E8614A";
  const [stage, setStage] = useState<Stage>(reducedMotion() ? "reveal" : "drop");
  const skipped = useRef(false);
  const canSkip = useRef(false);
  const glow = rarityColor(skin.rarity);
  const times = TIMING[skin.rarity];

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

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-40 flex flex-col items-center justify-center bg-ink/88 px-4"
      role="dialog"
      aria-label="开盒"
      onClick={stage !== "reveal" ? skip : undefined}
    >
      {(stage === "burst" || stage === "glow") && (
        <div
          className="gacha-flash pointer-events-none absolute inset-0"
          style={{ background: glow }}
        />
      )}

      <p className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-fg-subtle">
        {stage === "reveal" ? "开出了" : "糖果盲盒"}
      </p>

      <div className="relative flex h-64 w-56 items-center justify-center">
        {(stage === "burst" || stage === "reveal") &&
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
        {(stage === "burst" || stage === "reveal") &&
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

        {stage !== "reveal" && (
          <CandyCapsule
            stage={stage}
            glow={open ? glow : stage === "glow" ? glow : "#F0A07A"}
            open={open}
          />
        )}

        {stage === "reveal" && (
          <div className="gacha-pop flex flex-col items-center">
            <SkinMark skin={skin} egg={eggHex} />
          </div>
        )}
      </div>

      {stage === "reveal" ? (
        <div className="mt-2 flex w-full max-w-xs flex-col items-center text-center">
          <p className="text-xs font-medium" style={{ color: glow }}>
            {rarityLabel(skin.rarity)}
            {duplicate ? " · 重复" : " · 新皮肤"}
          </p>
          <h2 className="mt-1 font-display text-4xl">{skin.name}</h2>
          {duplicate && (
            <p className="mt-2 text-sm text-fg-muted">重复款，返还 25 币</p>
          )}
          <p className="mt-1 text-xs text-fg-subtle">只改外观，不影响速度</p>
          <Button size="lg" className="mt-5 w-full" onClick={onDone}>
            收下 · 装备
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
          background: `linear-gradient(180deg, ${glow} 0%, #221e28 100%)`,
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

function SkinMark({ skin, egg }: { skin: Skin; egg: string }) {
  if (skin.modelType === "full_character") {
    return <FullSkinMark visualId={skin.visualId} tint={skin.tint} />;
  }
  return (
    <div className="relative h-40 w-40">
      {skin.kind === "wings" && (
        <>
          <span
            className="absolute left-1 top-10 h-20 w-16 -rotate-12 rounded-full"
            style={{ background: skin.tint }}
          />
          <span
            className="absolute right-1 top-10 h-20 w-16 rotate-12 rounded-full"
            style={{ background: skin.tint }}
          />
        </>
      )}
      {skin.kind === "cape" && (
        <span
          className="absolute left-1/2 top-16 h-24 w-16 -translate-x-1/2 rounded-b-full"
          style={{ background: skin.tint }}
        />
      )}
      <span
        className="absolute left-1/2 top-8 h-[5.5rem] w-[4.4rem] -translate-x-1/2 rounded-[50%]"
        style={{ background: egg }}
      />
      <span
        className="absolute left-1/2 top-[4.6rem] h-10 w-12 -translate-x-1/2 rounded-[50%] bg-fg/90"
      />
      {skin.kind === "ears" && (
        <>
          <span className="absolute left-10 top-2 h-10 w-5 -rotate-12 rounded-full bg-fg" />
          <span className="absolute right-10 top-2 h-10 w-5 rotate-12 rounded-full bg-fg" />
        </>
      )}
      {skin.kind === "halo" && (
        <span
          className="absolute left-1/2 top-4 h-3 w-16 -translate-x-1/2 rounded-full border-4"
          style={{ borderColor: skin.tint }}
        />
      )}
      {skin.kind === "crown" && (
        <span
          className="absolute left-1/2 top-3 h-6 w-10 -translate-x-1/2"
          style={{
            background: skin.tint,
            clipPath: "polygon(0 100%, 20% 20%, 50% 70%, 80% 20%, 100% 100%)",
          }}
        />
      )}
      {skin.kind === "hat" && (
        <span
          className="absolute left-1/2 top-4 size-6 -translate-x-1/2 rounded-full"
          style={{ background: skin.tint }}
        />
      )}
    </div>
  );
}

function FullSkinMark({ visualId, tint }: { visualId: VisualId; tint: string }) {
  if (visualId === "knight") {
    return (
      <div className="relative h-40 w-40">
        <span className="absolute left-1/2 top-14 h-24 w-14 -translate-x-1/2 rounded-b-full bg-[#6B2A38]" />
        <span
          className="absolute left-1/2 top-8 h-[5.8rem] w-[4.6rem] -translate-x-1/2 rounded-[50%]"
          style={{ background: "#8A93A3" }}
        />
        <span className="absolute left-1/2 top-6 h-10 w-16 -translate-x-1/2 rounded-t-full bg-[#2A3038]" />
        <span className="absolute left-1/2 top-12 h-2 w-10 -translate-x-1/2 rounded-full bg-[#4EC8E8]" />
        <span
          className="absolute left-1/2 top-[4.4rem] h-3 w-16 -translate-x-1/2 rounded-full"
          style={{ background: tint }}
        />
      </div>
    );
  }
  if (visualId === "bear") {
    return (
      <div className="relative h-40 w-40">
        <span
          className="absolute left-1/2 top-10 h-[5.6rem] w-[5.2rem] -translate-x-1/2 rounded-[50%]"
          style={{ background: tint }}
        />
        <span className="absolute left-9 top-6 size-8 rounded-full" style={{ background: tint }} />
        <span className="absolute right-9 top-6 size-8 rounded-full" style={{ background: tint }} />
        <span className="absolute left-1/2 top-[4.8rem] h-10 w-12 -translate-x-1/2 rounded-[50%] bg-[#F3D5A8]" />
        <span className="absolute left-1/2 top-16 h-6 w-8 -translate-x-1/2 rounded-full bg-[#F3D5A8]" />
        <span className="absolute left-1/2 top-[4.4rem] size-2 -translate-x-1/2 rounded-full bg-[#2A1C18]" />
      </div>
    );
  }
  return (
    <div className="relative h-40 w-40">
      <span
        className="absolute left-1/2 top-8 h-[5.5rem] w-[4.4rem] -translate-x-1/2 rounded-[50%]"
        style={{ background: tint }}
      />
    </div>
  );
}
