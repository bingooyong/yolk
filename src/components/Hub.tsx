import { useRef, useState, type ReactNode } from "react";
import { Backpack, Egg, Flag, Home, Lock, Play, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sfxClick, unlockAudio } from "@/game/audio";
import { EGG_COLORS } from "@/game/config";
import { LEVELS, LEVEL_ORDER } from "@/game/levels";
import { GACHA_COST, SKINS, getSkin, listSkins, rarityColor, rarityLabel, unlockLabel, type SkinCategory, type SkinKind } from "@/game/skins";
import { sim } from "@/game/sim";
import { useGameStore, type Hub as HubId } from "@/game/store";
import { useRejectedSkinIds } from "@/engine/skin-asset/gate-registry";
import { cn } from "@/lib/utils";

function formatTime(t: number) {
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}

export function Hub() {
  const hub = useGameStore((s) => s.hub);
  const setHub = useGameStore((s) => s.setHub);
  const startRace = useGameStore((s) => s.startRace);
  const coins = useGameStore((s) => s.coins);
  const xp = useGameStore((s) => s.xp);
  const playerName = useGameStore((s) => s.playerName);
  const lv = 1 + Math.floor(xp / 100);
  const xpIn = xp % 100;

  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className="pointer-events-none absolute left-0 right-24"
        style={{
          top: "max(14px, env(safe-area-inset-top))",
          paddingLeft: "max(16px, env(safe-area-inset-left))",
        }}
      >
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-fg-subtle">Yolk Rush</p>
        <h1 className="font-display text-3xl leading-none md:text-4xl">蛋黄冲刺</h1>
        <p className="mt-1 text-xs text-fg-muted">
          {playerName} · LV.{lv} · 币 {coins}
        </p>
        <div className="mt-1 h-1.5 w-36 overflow-hidden rounded-full bg-ink/50">
          <div className="h-full bg-accent" style={{ width: `${xpIn}%` }} />
        </div>
      </div>

      {hub === "home" && (
        <div
          className="pointer-events-auto absolute inset-x-0 z-10 flex flex-col items-center"
          style={{ bottom: "max(92px, calc(72px + env(safe-area-inset-bottom)))" }}
        >
          <Button
            size="lg"
            aria-label="Play"
            onClick={() => setHub("play")}
            className="h-16 min-w-52 rounded-full px-10 text-xl shadow-panel ring-2 ring-accent/70"
          >
            <Flag className="size-5" />
            PLAY
          </Button>
          <p className="mt-2 text-sm text-fg-muted">选关开赛</p>
        </div>
      )}

      {hub === "character" && <WardrobeOrbit />}

      {hub !== "home" && (
        <div
          className={cn(
            "pointer-events-auto absolute inset-x-0 z-20 flex flex-col",
            hub === "character" ? "max-h-[44%]" : "max-h-[58%]",
          )}
          style={{
            bottom: "max(76px, calc(60px + env(safe-area-inset-bottom)))",
            paddingLeft: "max(12px, env(safe-area-inset-left))",
            paddingRight: "max(12px, env(safe-area-inset-right))",
          }}
        >
          <div className="overflow-auto rounded-t-3xl border border-border bg-ink/88 p-4 shadow-panel backdrop-blur-md md:mx-auto md:w-[min(460px,92vw)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-2xl">
                {hub === "play" ? "比赛" : hub === "character" ? "衣橱" : hub === "inventory" ? "背包" : "我的"}
              </h2>
              <Button variant="ghost" onClick={() => setHub("home")} aria-label="Back">
                返回
              </Button>
            </div>
            {hub === "play" && <PlayPane onStart={startRace} />}
            {hub === "character" && <CharacterPane />}
            {hub === "inventory" && <InventoryPane />}
            {hub === "profile" && <ProfilePane />}
          </div>
        </div>
      )}

      <nav
        className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 border-t border-border bg-ink/90 backdrop-blur-md"
        style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}
        aria-label="Main"
      >
        <div className="mx-auto flex max-w-lg items-end justify-around px-2 pt-2">
          <NavBtn id="home" label="首页" icon={<Home className="size-5" />} />
          <NavBtn id="play" label="比赛" icon={<Play className="size-5" />} big />
          <NavBtn id="character" label="衣橱" icon={<Egg className="size-5" />} />
          <NavBtn id="inventory" label="背包" icon={<Backpack className="size-5" />} />
          <NavBtn id="profile" label="我的" icon={<User className="size-5" />} />
        </div>
      </nav>
    </div>
  );
}

function NavBtn({
  id,
  label,
  icon,
  big,
}: {
  id: HubId;
  label: string;
  icon: ReactNode;
  big?: boolean;
}) {
  const hub = useGameStore((s) => s.hub);
  const setHub = useGameStore((s) => s.setHub);
  const on = hub === id;
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={on ? "page" : undefined}
      onClick={() => setHub(id)}
      className={cn(
        "flex min-w-12 flex-col items-center gap-0.5 rounded-2xl px-3 py-1 text-[10px]",
        on ? "text-accent" : "text-fg-muted",
        big && "px-4 py-1.5 text-xs",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function PlayPane({ onStart }: { onStart: () => void }) {
  const levelId = useGameStore((s) => s.levelId);
  const setLevel = useGameStore((s) => s.setLevel);
  const isUnlocked = useGameStore((s) => s.isUnlocked);
  const cleared = useGameStore((s) => s.cleared);
  const levelBest = useGameStore((s) => s.levelBest);
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {LEVEL_ORDER.map((id, i) => {
          const lv = LEVELS[id];
          const locked = !isUnlocked(id);
          const done = cleared.includes(id);
          return (
            <button
              key={id}
              type="button"
              disabled={locked}
              onClick={() => setLevel(id)}
              className={cn(
                "rounded-2xl border p-3 text-left",
                levelId === id ? "border-accent bg-surface-2" : "border-border bg-ink/40",
                locked && "opacity-40",
              )}
            >
              <p className="text-[10px] uppercase tracking-wider text-fg-subtle">Level {i + 1}</p>
              <p className="font-medium">{lv.theme.name}</p>
              <p className="mt-1 text-xs text-fg-muted">
                {locked ? "锁定" : done ? `最佳 ${formatTime(levelBest[id] ?? 0)}` : "未通关"}
              </p>
            </button>
          );
        })}
      </div>
      <Button
        size="lg"
        className="mt-4 w-full"
        aria-label="Start"
        onClick={() => {
          unlockAudio();
          sfxClick();
          onStart();
        }}
      >
        PLAY
      </Button>
    </>
  );
}

function WardrobeOrbit() {
  const pid = useRef<number | null>(null);
  const last = useRef(0);
  return (
    <div
      className="pointer-events-auto absolute inset-x-[8%] z-10 h-[36%]"
      style={{ top: "14%" }}
      aria-label="Rotate character"
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        pid.current = e.pointerId;
        last.current = e.clientX;
      }}
      onPointerMove={(e) => {
        if (pid.current !== e.pointerId) return;
        sim.showcaseYaw += (e.clientX - last.current) * 0.012;
        last.current = e.clientX;
        sim.lookIdle = 0;
      }}
      onPointerUp={() => {
        pid.current = null;
      }}
      onPointerCancel={() => {
        pid.current = null;
      }}
    />
  );
}

function CharacterPane() {
  const equipped = useGameStore((s) => s.equippedSkin);
  const preview = useGameStore((s) => s.previewSkinId);
  const owned = useGameStore((s) => s.ownedSkins);
  const setSkin = useGameStore((s) => s.setSkin);
  const setPreviewSkin = useGameStore((s) => s.setPreviewSkin);
  const colorId = useGameStore((s) => s.colorId);
  const setColor = useGameStore((s) => s.setColor);
  const rejected = useRejectedSkinIds();
  const [cat, setCat] = useState<SkinCategory | "all">("all");
  const viewing = getSkin(preview ?? equipped);
  const have = owned.includes(viewing.id);
  const cats: { id: SkinCategory | "all"; label: string }[] = [
    { id: "all", label: "全部" },
    { id: "yolk", label: "蛋黄" },
    { id: "animal", label: "动物" },
    { id: "fantasy", label: "奇幻" },
    { id: "mecha", label: "机甲" },
  ];
  return (
    <>
      <p className="text-sm">
        {viewing.name} · {rarityLabel(viewing.rarity)} {have ? "· 已拥有" : "· 未拥有"}
      </p>
      <p className="mt-1 text-xs text-fg-muted">{viewing.description || "拖动画布可 360° 查看"}</p>
      {!have && <p className="mt-1 text-xs text-fg-subtle">获取方式：{unlockLabel(viewing.unlock)}</p>}
      <div className="mt-3 flex flex-wrap gap-1">
        {cats.map((c) => (
          <button
            key={c.id}
            type="button"
            className={cn(
              "rounded-full border px-2 py-1 text-[11px]",
              cat === c.id ? "border-accent text-fg" : "border-border text-fg-muted",
            )}
            onClick={() => setCat(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {listSkins(cat).filter((s) => !rejected.has(s.id)).map((s) => {
          const got = owned.includes(s.id);
          const on = (preview ?? equipped) === s.id;
          return (
            <button
              key={s.id}
              type="button"
              aria-label={got ? s.name : `${s.name}，未拥有`}
              aria-pressed={on}
              onClick={() => setPreviewSkin(s.id)}
              className={cn(
                "rounded-xl border px-2 py-2 text-left text-xs",
                on ? "border-accent" : "border-border",
                !got && "opacity-80",
              )}
            >
              <span className="mb-1 flex items-center gap-1">
                <span className="size-2 rounded-full" style={{ backgroundColor: rarityColor(s.rarity) }} />
                {!got && <Lock className="size-3 text-fg-subtle" aria-hidden />}
              </span>
              {s.name}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          className="flex-1"
          aria-label={viewing.id === equipped ? "已装备当前皮肤" : have ? "装备当前皮肤" : "未拥有无法装备"}
          disabled={!have || viewing.id === equipped}
          onClick={() => {
            if (!have) return;
            setSkin(viewing.id);
            setPreviewSkin(viewing.id);
          }}
        >
          {viewing.id === equipped ? "已装备" : have ? "装备" : "未拥有"}
        </Button>
      </div>
      <p className="mt-4 text-xs text-fg-subtle">蛋壳颜色</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {EGG_COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-label={c.name}
            onClick={() => setColor(c.id)}
            className={cn("size-10 rounded-full border-2", colorId === c.id ? "border-fg" : "border-transparent")}
            style={{ backgroundColor: c.hex }}
          />
        ))}
      </div>
    </>
  );
}

function InventoryPane() {
  const owned = useGameStore((s) => s.ownedSkins);
  const equipped = useGameStore((s) => s.equippedSkin);
  const setSkin = useGameStore((s) => s.setSkin);
  const coins = useGameStore((s) => s.coins);
  const pullGacha = useGameStore((s) => s.pullGacha);
  const rejected = useRejectedSkinIds();
  const [kind, setKind] = useState<SkinKind | "all">("all");
  const kinds: { id: SkinKind | "all"; label: string }[] = [
    { id: "all", label: "全部" },
    { id: "hat", label: "头饰" },
    { id: "wings", label: "翅膀" },
    { id: "cape", label: "披风" },
    { id: "halo", label: "特效" },
  ];
  const list = SKINS.filter(
    (s) =>
      !rejected.has(s.id) &&
      owned.includes(s.id) &&
      (kind === "all" || s.kind === kind),
  );
  return (
    <>
      <div className="flex flex-wrap gap-1">
        {kinds.map((k) => (
          <button
            key={k.id}
            type="button"
            className={cn(
              "rounded-full border px-2 py-1 text-[11px]",
              kind === k.id ? "border-accent text-fg" : "border-border text-fg-muted",
            )}
            onClick={() => setKind(k.id)}
          >
            {k.label}
          </button>
        ))}
      </div>
      <ul className="mt-3 space-y-2">
        {list.map((s) => (
          <li key={s.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2">
            <span className="size-3 rounded-full" style={{ backgroundColor: s.tint }} />
            <div className="flex-1">
              <p className="flex items-center gap-2 text-sm">
                {s.name}
                {s.renderKind === "model" ? (
                  <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] uppercase text-fg-subtle">
                    GLB · {s.assetRole === "test" ? "Test" : "Prod"}
                  </span>
                ) : null}
              </p>
              <p className="text-[11px] text-fg-subtle">{rarityLabel(s.rarity)}</p>
            </div>
            <Button
              size="default"
              variant={equipped === s.id ? "secondary" : "primary"}
              onClick={() => setSkin(equipped === s.id ? "plain" : s.id)}
            >
              {equipped === s.id ? "卸下" : "装备"}
            </Button>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="mt-4 text-sm text-fg-muted">这类还没有道具</p>}
      <Button
        className="mt-4 w-full"
        variant="secondary"
        disabled={coins < GACHA_COST}
        onClick={() => {
          unlockAudio();
          sfxClick();
          pullGacha();
        }}
      >
        抽蛋 · {GACHA_COST} 币
      </Button>
    </>
  );
}

function ProfilePane() {
  const wins = useGameStore((s) => s.wins);
  const games = useGameStore((s) => s.gamesPlayed);
  const best = useGameStore((s) => s.bestTime);
  const cleared = useGameStore((s) => s.cleared);
  const xp = useGameStore((s) => s.xp);
  const name = useGameStore((s) => s.playerName);
  const lv = 1 + Math.floor(xp / 100);
  const badges = [
    { id: "first", label: "FIRST WIN", on: wins >= 1 },
    { id: "finisher", label: "RACE FINISHER", on: cleared.length >= 1 },
    { id: "runner", label: "TEN RACES", on: games >= 10 },
    { id: "clears", label: "FOUR COURSES", on: cleared.length >= 4 },
  ];
  return (
    <div className="space-y-3 text-sm">
      <p className="font-display text-3xl">{name}</p>
      <p className="text-fg-muted">
        LV.{lv} · XP {xp}
      </p>
      <p>
        胜场 {wins} · 场次 {games}
      </p>
      <p>
        通关 {cleared.length}/{LEVEL_ORDER.length}
      </p>
      <p>最佳 {best != null ? formatTime(best) : "--"}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {badges.map((b) => (
          <div
            key={b.id}
            className={cn(
              "rounded-xl border px-3 py-2 text-xs",
              b.on ? "border-accent text-fg" : "border-border text-fg-subtle",
            )}
          >
            {b.label}
            <span className="mt-1 block">{b.on ? "已解锁" : "未完成"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
