import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Flag,
  Gift,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DASH, EGG_COLORS } from "@/game/config";
import { sfxClick, sfxCountdown, sfxPull, setMuted, unlockAudio } from "@/game/audio";
import { useGameStore } from "@/game/store";
import { GachaCeremony } from "@/components/GachaCeremony";
import { Hub } from "@/components/Hub";
import { ResultScreen } from "@/components/ResultScreen";
import {
  DUP_REFUND,
  GACHA_COST,
  SKINS,
  rarityColor,
  rarityLabel,
} from "@/game/skins";
import { LEVELS, LEVEL_ORDER } from "@/game/levels";
import { cn } from "@/lib/utils";

function formatTime(t: number) {
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}

function ordinal(n: number) {
  return `第 ${n} 名`;
}

export function GameUI() {
  const phase = useGameStore((s) => s.phase);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const countLeft = useGameStore((s) => s.countLeft);
  const colorId = useGameStore((s) => s.colorId);
  const bestTime = useGameStore((s) => s.bestTime);
  const wins = useGameStore((s) => s.wins);
  const muted = useGameStore((s) => s.muted);
  const howTo = useGameStore((s) => s.howTo);
  const hud = useGameStore((s) => s.hud);
  const coins = useGameStore((s) => s.coins);
  const lobbyTab = useGameStore((s) => s.lobbyTab);
  const lastPayout = useGameStore((s) => s.lastPayout);
  const camSens = useGameStore((s) => s.camSens);
  const setCamSens = useGameStore((s) => s.setCamSens);
  const lastPull = useGameStore((s) => s.lastPull);
  const pullSeq = useGameStore((s) => s.pullSeq);
  const clearPull = useGameStore((s) => s.clearPull);
  const setColor = useGameStore((s) => s.setColor);
  const startRace = useGameStore((s) => s.startRace);
  const nextRace = useGameStore((s) => s.nextRace);
  const pause = useGameStore((s) => s.pause);
  const resume = useGameStore((s) => s.resume);
  const toTitle = useGameStore((s) => s.toTitle);
  const toggleMute = useGameStore((s) => s.toggleMute);
  const toggleHowTo = useGameStore((s) => s.toggleHowTo);
  const setLobbyTab = useGameStore((s) => s.setLobbyTab);

  useEffect(() => {
    setMuted(muted);
  }, [muted]);

  useEffect(() => {
    if (phase !== "countdown") return;
    unlockAudio();
    sfxCountdown(3);
    const id = window.setInterval(() => {
      const n = useGameStore.getState().countLeft - 1;
      if (n <= 0) {
        window.clearInterval(id);
        sfxCountdown(0);
        useGameStore.getState().go();
      } else {
        useGameStore.setState({ countLeft: n });
        sfxCountdown(n);
      }
    }, 900);
    return () => window.clearInterval(id);
  }, [phase]);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 text-fg">
      <div
        className="pointer-events-auto absolute z-30 flex gap-2"
        style={{
          top: "max(12px, env(safe-area-inset-top))",
          right: "max(12px, env(safe-area-inset-right))",
        }}
      >
        <Button
          variant="secondary"
          size="icon"
          className="size-11 bg-ink/55"
          aria-label={muted ? "Unmute" : "Mute"}
          onClick={() => {
            unlockAudio();
            toggleMute();
          }}
        >
          {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
        </Button>
        {phase === "title" && (
          <Button
            variant="secondary"
            size="icon"
            className="size-11 bg-ink/55"
            aria-label="Settings"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="size-5" />
          </Button>
        )}
        {phase === "playing" && (
          <Button
            variant="secondary"
            size="icon"
            className="size-11 bg-ink/55"
            aria-label="Pause"
            onClick={pause}
          >
            <Pause className="size-5" />
          </Button>
        )}
      </div>

      {(phase === "playing" || phase === "countdown") && (
        <>
          <HudBar
            time={hud.time}
            place={hud.place}
            dashCd={hud.dashCd}
            coinsRun={hud.coinsRun}
            racers={hud.racers}
          />
          {hud.failHint ? (
            <div className="pointer-events-none absolute bottom-[22%] left-1/2 z-20 w-[min(92%,420px)] -translate-x-1/2 rounded-2xl border border-border bg-ink/80 px-4 py-3 text-center text-sm shadow-panel">
              {hud.failHint}
            </div>
          ) : null}
        </>
      )}

      {phase === "countdown" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="font-display text-7xl text-fg drop-shadow-lg md:text-8xl">
            {countLeft > 0 ? countLeft : "GO"}
          </p>
        </div>
      )}

      {phase === "title" && <Hub />}

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}

      {phase === "paused" && (
        <CenterCard>
          <h2 className="font-display text-3xl">暂停</h2>
          <p className="mt-2 text-sm text-fg-muted">比赛还在等你回来</p>
          <label className="mt-4 flex items-center justify-between gap-3 text-xs text-fg-muted">
            镜头灵敏度
            <input
              type="range"
              min={0.5}
              max={1.6}
              step={0.05}
              value={camSens}
              onChange={(e) => setCamSens(Number(e.target.value))}
              className="w-28"
              aria-label="Camera sensitivity"
            />
          </label>
          <div className="mt-6 flex flex-col gap-2">
            <Button size="lg" onClick={resume} aria-label="Resume">
              <Play className="size-4" />
              继续
            </Button>
            <Button variant="secondary" size="lg" onClick={toTitle}>
              返回首页
            </Button>
          </div>
        </CenterCard>
      )}

      {phase === "results" && (
        <ResultScreen
          onAgain={() => {
            unlockAudio();
            startRace();
          }}
          onMenu={toTitle}
          onNext={() => {
            unlockAudio();
            nextRace();
          }}
        />
      )}

      {phase === "title" && lastPull && (
        <GachaCeremony
          key={pullSeq}
          skin={lastPull.skin}
          duplicate={lastPull.duplicate}
          onDone={() => {
            sfxClick();
            clearPull();
          }}
        />
      )}
    </div>
  );
}

function HudBar({
  time,
  place,
  dashCd,
  coinsRun,
  racers,
}: {
  time: number;
  place: number;
  dashCd: number;
  coinsRun: number;
  racers: { id: string; name: string; color: string; isPlayer: boolean; place: number }[];
}) {
  const ready = dashCd <= 0;
  return (
    <div
      className="pointer-events-none absolute flex flex-col gap-2"
      style={{
        top: "max(12px, env(safe-area-inset-top))",
        left: "max(12px, env(safe-area-inset-left))",
        right: "max(88px, env(safe-area-inset-right))",
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="hud-chip rounded-xl px-3 py-2 text-sm font-semibold">{ordinal(place)}</div>
        <div className="hud-chip rounded-xl px-3 py-2 text-sm">{formatTime(time)}</div>
        <div className="hud-chip rounded-xl px-3 py-2 text-sm">币 {coinsRun}</div>
        <div className="hud-chip flex items-center gap-2 rounded-xl px-3 py-2 text-xs">
          <span className="text-fg-muted">冲刺</span>
          <span
            className={cn(
              "h-1.5 w-16 overflow-hidden rounded-full bg-surface-2",
              ready && "ring-1 ring-accent",
            )}
          >
            <span
              className="block h-full bg-accent"
              style={{ width: `${ready ? 100 : (1 - dashCd / DASH.cooldown) * 100}%` }}
            />
          </span>
        </div>
      </div>
      <ol className="hidden max-w-xs gap-1 sm:flex sm:flex-col">
        {racers.slice(0, 4).map((r) => (
          <li
            key={r.id}
            className={cn(
              "hud-chip flex items-center gap-2 rounded-lg px-2 py-1 text-xs",
              r.isPlayer && "border-border-strong",
            )}
          >
            <span className="size-2.5 rounded-full" style={{ backgroundColor: r.color }} />
            <span className="tabular-nums text-fg-muted">{r.place}</span>
            <span>{r.name}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TitleSheet({
  colorId,
  setColor,
  bestTime,
  wins,
  howTo,
  coins,
  lobbyTab,
  setLobbyTab,
  onStart,
  onHowTo,
}: {
  colorId: string;
  setColor: (id: string) => void;
  bestTime: number | null;
  wins: number;
  howTo: boolean;
  coins: number;
  lobbyTab: "play" | "gacha";
  setLobbyTab: (t: "play" | "gacha") => void;
  onStart: () => void;
  onHowTo: () => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [canStart, setCanStart] = useState(true);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => {
      setCanStart(el.scrollHeight - el.scrollTop - el.clientHeight <= 28);
    };
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    const id = window.setTimeout(measure, 80);
    return () => {
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      window.clearTimeout(id);
    };
  }, [lobbyTab, howTo]);

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
        <h1 className="font-display text-4xl leading-none md:text-5xl">蛋黄冲刺</h1>
      </div>

      {lobbyTab === "play" && (
        <div
          className="pointer-events-auto absolute inset-0 z-10 flex flex-col items-center justify-center"
          style={{ paddingBottom: "min(34vh, 280px)" }}
        >
          <Button
            size="lg"
            aria-label="Start"
            disabled={!canStart}
            onClick={() => {
              if (!canStart) return;
              onStart();
            }}
            className={cn(
              "h-16 min-w-52 rounded-full px-10 text-xl shadow-panel",
              canStart && "ring-2 ring-accent/70",
            )}
          >
            <Flag className="size-5" />
            START
          </Button>
          <p className="mt-3 text-sm text-fg-muted">
            {canStart ? "Tap to Start" : "滑到下面解锁开始"}
          </p>
        </div>
      )}

      <div
        className={cn(
          "pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex max-h-[42%] flex-col",
          "landscape:max-h-[58%] md:max-h-[48%]",
        )}
        style={{
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
          paddingLeft: "max(12px, env(safe-area-inset-left))",
          paddingRight: "max(12px, env(safe-area-inset-right))",
        }}
      >
        <div
          ref={scroller}
          className="overflow-auto rounded-t-3xl border border-border bg-ink/84 p-5 shadow-panel backdrop-blur-md md:mx-auto md:w-[min(440px,92vw)] md:rounded-3xl"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-fg-muted">先选关卡和蛋壳，再开始</p>
            <div className="hud-chip rounded-full px-3 py-1.5 text-sm">币 {coins}</div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              variant={lobbyTab === "play" ? "primary" : "secondary"}
              onClick={() => setLobbyTab("play")}
            >
              比赛
            </Button>
            <Button
              variant={lobbyTab === "gacha" ? "primary" : "secondary"}
              onClick={() => setLobbyTab("gacha")}
            >
              <Gift className="size-4" />
              抽卡
            </Button>
          </div>

          {lobbyTab === "play" ? (
            <>
              <p className="mt-3 max-w-sm text-pretty text-sm text-fg-muted">
                {LEVELS[useGameStore.getState().levelId].theme.blurb}
              </p>
              <LevelPicker />
              <div className="mt-3 flex gap-4 text-xs text-fg-subtle">
                <span>胜场 {wins}</span>
                <span>最佳 {bestTime != null ? formatTime(bestTime) : "--"}</span>
              </div>
              <p className="mt-4 text-xs font-medium text-fg-muted">蛋壳颜色</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {EGG_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-label={c.name}
                    aria-pressed={colorId === c.id}
                    onClick={() => setColor(c.id)}
                    className={cn(
                      "size-11 rounded-full border-2",
                      colorId === c.id ? "border-fg" : "border-transparent",
                    )}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
              {howTo && (
                <ul className="mt-4 space-y-2 text-sm text-fg-muted">
                  <li>跳管高度 · 扑管缺口 · 滚管低姿态 · 加速管冲刺</li>
                  <li>右边缺口：跳差一点，扑能过去</li>
                </ul>
              )}
              <Button variant="secondary" size="lg" onClick={onHowTo} className="mt-4 w-full">
                {howTo ? "收起说明" : "怎么玩"}
              </Button>
              <p className="mt-4 pb-2 text-center text-xs text-fg-subtle">滑到这里就可以开始</p>
            </>
          ) : (
            <GachaPanel coins={coins} />
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const musicVol = useGameStore((s) => s.musicVol);
  const sfxVol = useGameStore((s) => s.sfxVol);
  const camSens = useGameStore((s) => s.camSens);
  const controlScale = useGameStore((s) => s.controlScale);
  const controlOpacity = useGameStore((s) => s.controlOpacity);
  const hapticOn = useGameStore((s) => s.hapticOn);
  const gfx = useGameStore((s) => s.gfx);
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-ink/55 p-4">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-5 shadow-panel">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">设置</h2>
          <Button variant="secondary" size="icon" aria-label="Close settings" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="mt-4 space-y-4 text-sm text-fg-muted">
          <label className="flex items-center justify-between gap-3">
            音乐
            <input type="range" min={0} max={1} step={0.01} value={musicVol} aria-label="Music volume" onPointerDown={() => unlockAudio()} onChange={(e) => useGameStore.getState().setMusicVol(Number(e.target.value))} className="w-36 accent-accent" />
          </label>
          <label className="flex items-center justify-between gap-3">
            音效
            <input type="range" min={0} max={1} step={0.01} value={sfxVol} aria-label="SFX volume" onPointerDown={() => unlockAudio()} onChange={(e) => useGameStore.getState().setSfxVol(Number(e.target.value))} className="w-36 accent-accent" />
          </label>
          <label className="flex items-center justify-between gap-3">
            镜头灵敏度
            <input type="range" min={0.5} max={1.6} step={0.05} value={camSens} aria-label="Camera sensitivity" onChange={(e) => useGameStore.getState().setCamSens(Number(e.target.value))} className="w-36 accent-accent" />
          </label>
          <label className="flex items-center justify-between gap-3">
            按键大小
            <input type="range" min={0.8} max={1.25} step={0.05} value={controlScale} aria-label="Control size" onChange={(e) => useGameStore.getState().setControlScale(Number(e.target.value))} className="w-36 accent-accent" />
          </label>
          <label className="flex items-center justify-between gap-3">
            按键透明度
            <input type="range" min={0.4} max={1} step={0.05} value={controlOpacity} aria-label="Control opacity" onChange={(e) => useGameStore.getState().setControlOpacity(Number(e.target.value))} className="w-36 accent-accent" />
          </label>
          <label className="flex items-center justify-between gap-3">
            画质
            <select aria-label="Graphics quality" className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-fg" value={gfx} onChange={(e) => useGameStore.getState().setGfx(e.target.value as "auto" | "low" | "medium" | "high")}>
              <option value="auto">自动</option>
              <option value="low">省电</option>
              <option value="medium">均衡</option>
              <option value="high">高</option>
            </select>
          </label>
          <label className="flex items-center justify-between gap-3">
            振动
            <input type="checkbox" checked={hapticOn} aria-label="Haptic" onChange={(e) => useGameStore.getState().setHapticOn(e.target.checked)} />
          </label>
        </div>
        <Button className="mt-5 w-full" onClick={onClose}>
          返回
        </Button>
      </div>
    </div>
  );
}

function VolumeRow() {
  const musicVol = useGameStore((s) => s.musicVol);
  const sfxVol = useGameStore((s) => s.sfxVol);
  const setMusicVol = useGameStore((s) => s.setMusicVol);
  const setSfxVol = useGameStore((s) => s.setSfxVol);
  return (
    <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-fg-muted">
      <label className="flex items-center gap-2">
        <span className="shrink-0">音乐</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={musicVol}
          aria-label="Music volume"
          onPointerDown={() => unlockAudio()}
          onChange={(e) => setMusicVol(Number(e.target.value))}
          className="h-2 w-full accent-accent"
        />
      </label>
      <label className="flex items-center gap-2">
        <span className="shrink-0">音效</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={sfxVol}
          aria-label="SFX volume"
          onPointerDown={() => unlockAudio()}
          onChange={(e) => setSfxVol(Number(e.target.value))}
          className="h-2 w-full accent-accent"
        />
      </label>
    </div>
  );
}

function LevelPicker() {
  const levelId = useGameStore((s) => s.levelId);
  const setLevel = useGameStore((s) => s.setLevel);
  const isUnlocked = useGameStore((s) => s.isUnlocked);
  const cleared = useGameStore((s) => s.cleared);
  const levelBest = useGameStore((s) => s.levelBest);
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {LEVEL_ORDER.map((id) => {
        const lv = LEVELS[id];
        const open = isUnlocked(id);
        const done = cleared.includes(id);
        const active = levelId === id;
        return (
          <button
            key={id}
            type="button"
            disabled={!open}
            onClick={() => open && setLevel(id)}
            className={cn(
              "rounded-xl border px-3 py-2 text-left",
              active ? "border-fg bg-surface-2" : "border-border",
              !open && "opacity-40",
            )}
          >
            <span className="block font-display text-sm">{lv.theme.name}</span>
            <span className="mt-0.5 block text-[11px] text-fg-subtle">
              {"★".repeat(lv.theme.stars)}
              {"☆".repeat(5 - lv.theme.stars)}
              {done ? " · 已通关" : open ? "" : " · 通关上一关"}
              {levelBest[id] != null ? ` · ${formatTime(levelBest[id])}` : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function GachaPanel({ coins }: { coins: number }) {
  const owned = useGameStore((s) => s.ownedSkins);
  const equipped = useGameStore((s) => s.equippedSkin);
  const setSkin = useGameStore((s) => s.setSkin);
  const pullGacha = useGameStore((s) => s.pullGacha);
  const canPull = coins >= GACHA_COST;

  return (
    <div className="mt-4">
      <div className="mb-3 flex justify-center">
        <div className="gacha-bob relative h-24 w-16">
          <div
            className="absolute inset-x-1 top-0 h-[46%] rounded-t-full border border-border-strong"
            style={{ background: "linear-gradient(180deg, var(--color-fg) 0%, var(--color-peach) 100%)" }}
          />
          <div
            className="absolute inset-x-1 bottom-0 h-[58%] rounded-b-[1.6rem] border border-border-strong"
            style={{ background: "linear-gradient(180deg, var(--color-peach) 0%, var(--color-surface) 100%)" }}
          />
          <div className="absolute left-1/2 top-[42%] h-2.5 w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-peach" />
          <span className="absolute left-1/2 top-[60%] -translate-x-1/2 font-display text-lg text-fg/80">
            ?
          </span>
        </div>
      </div>
      <p className="text-center text-sm text-fg-muted">
        投入 {GACHA_COST} 币打开糖果盲盒。皮肤只改外观。重复返还 {DUP_REFUND} 币。
      </p>
      <Button
        size="lg"
        className="mt-3 w-full"
        disabled={!canPull}
        onClick={() => {
          unlockAudio();
          sfxPull();
          pullGacha();
        }}
      >
        <Sparkles className="size-4" />
        抽一次 · 开盒
      </Button>
      {!canPull && <p className="mt-2 text-center text-xs text-fg-subtle">币不够，先去比赛收集。</p>}

      <p className="mt-4 text-xs font-medium text-fg-muted">衣柜 · 点选装备</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {SKINS.map((s) => {
          const have = owned.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              disabled={!have}
              onClick={() => have && setSkin(s.id)}
              className={cn(
                "rounded-xl border px-3 py-2 text-left text-sm",
                equipped === s.id ? "border-fg bg-surface-2" : "border-border",
                !have && "opacity-40",
              )}
            >
              <span className="block text-xs" style={{ color: rarityColor(s.rarity) }}>
                {rarityLabel(s.rarity)}
              </span>
              {have ? s.name : "???"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CenterCard({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-ink/45 p-4">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-6 shadow-panel">
        {children}
      </div>
    </div>
  );
}

function Results({
  racers,
  time,
  bestTime,
  payout,
  onAgain,
  onMenu,
}: {
  racers: {
    id: string;
    name: string;
    color: string;
    isPlayer: boolean;
    place: number;
    finished: boolean;
    finishTime: number;
  }[];
  time: number;
  bestTime: number | null;
  payout: number;
  onAgain: () => void;
  onMenu: () => void;
}) {
  const you = racers.find((r) => r.isPlayer);
  const bonus = useGameStore((s) => s.lastBonus);
  const levelName = LEVELS[useGameStore((s) => s.levelId)].theme.name;
  return (
    <div className="pointer-events-auto absolute inset-0 flex items-end justify-center bg-ink/40 p-4 md:items-center">
      <div
        className="w-full max-w-md rounded-t-3xl border border-border bg-ink/88 p-5 shadow-panel backdrop-blur-md md:rounded-3xl md:p-7"
        style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center gap-2 text-accent">
          <Trophy className="size-5" />
          <p className="text-xs font-medium uppercase tracking-[0.16em]">{levelName}</p>
        </div>
        <h2 className="mt-1 font-display text-3xl">{you ? ordinal(you.place) : "完赛"}</h2>
        <p className="mt-1 text-sm text-fg-muted">
          用时 {formatTime(you?.finishTime || time)}
          {bestTime != null ? ` · 最佳 ${formatTime(bestTime)}` : ""}
        </p>
        <p className="mt-2 text-sm text-butter">本局入账 +{payout} 币</p>
        {(bonus.first > 0 || bonus.perfect > 0 || bonus.noFall > 0) && (
          <p className="mt-1 text-xs text-fg-subtle">
            {bonus.first > 0 ? `首通 +${bonus.first}  ` : ""}
            {bonus.noFall > 0 ? `无掉落 +${bonus.noFall}  ` : ""}
            {bonus.perfect > 0 ? `收集 +${bonus.perfect}` : ""}
          </p>
        )}
        <ol className="mt-4 max-h-44 space-y-1.5 overflow-auto">
          {racers.map((r) => (
            <li
              key={r.id}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm",
                r.isPlayer ? "bg-surface-2" : "bg-transparent",
              )}
            >
              <span className="w-6 tabular-nums text-fg-muted">{r.place}</span>
              <span className="size-3 rounded-full" style={{ backgroundColor: r.color }} />
              <span className="flex-1">{r.name}</span>
              <span className="tabular-nums text-xs text-fg-subtle">
                {r.finished ? formatTime(r.finishTime) : "…"}
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex flex-col gap-2">
          <Button size="lg" onClick={onAgain} className="w-full">
            <RotateCcw className="size-4" />
            再来一局
          </Button>
          <Button variant="secondary" size="lg" onClick={onMenu} className="w-full">
            返回首页
          </Button>
        </div>
      </div>
    </div>
  );
}
