import { useRef, useState, type ReactNode } from "react";
import { Backpack, Egg, Flag, Home, Lock, Play, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sfxClick, unlockAudio } from "@/game/audio";
import { EGG_COLORS } from "@/game/config";
import { LEVELS, LEVEL_ORDER } from "@/game/levels";
import { GACHA_COST, FEATURED_GACHA_SKIN_ID, SKINS, getSkin, listSkins, rarityColor, rarityLabel, unlockLabel, type SkinKind, type SkinListFilter } from "@/game/skins";
import { sim } from "@/game/sim";
import { clampShowcaseDistance } from "@/game/presentation/profiles";
import { resolveSkinAppearance } from "@/game/presentation/appearance";
import { useGameStore, type Hub as HubId } from "@/game/store";
import { useRejectedSkinIds } from "@/engine/skin-asset/gate-registry";
import { clearSkinAssetCache } from "@/engine/skin-asset/loader";
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
    <div className="hub-root">
      <div className="hub-brand">
        <p className="hub-brand-kicker">Yolk Rush</p>
        <h1 className="hub-brand-title">蛋黄冲刺</h1>
        <p className="mt-1 text-xs text-fg-muted">
          {playerName} · LV.{lv} · 币 {coins}
        </p>
        <div className="mt-1 h-1.5 w-36 overflow-hidden rounded-full bg-ink/50">
          <div className="h-full bg-accent" style={{ width: `${xpIn}%` }} />
        </div>
      </div>

      {hub === "home" && (
        <div className="hub-cta">
          <Button
            size="lg"
            aria-label="Play"
            onClick={() => setHub("play")}
            className="h-14 min-h-11 min-w-44 rounded-full px-8 text-lg shadow-panel ring-2 ring-accent/70 landscape:h-12 landscape:min-w-36 landscape:text-base"
          >
            <Flag className="size-5" />
            PLAY
          </Button>
          <p className="hub-cta-hint">选关开赛</p>
        </div>
      )}

      {hub === "character" && <WardrobeOrbit />}

      {hub !== "home" && (
        <aside className={cn("hub-panel", hub === "character" && "is-thin")}>
          <div className="hub-panel-inner">
            <div className="hub-panel-head">
              <h2>
                {hub === "play" ? "比赛" : hub === "character" ? "衣橱" : hub === "inventory" ? "背包" : "我的"}
              </h2>
              <Button variant="ghost" onClick={() => setHub("home")} aria-label="Back">
                返回
              </Button>
            </div>
            <div className="hub-panel-body">
              {hub === "play" && <PlayPane />}
              {hub === "character" && <CharacterPane />}
              {hub === "inventory" && <InventoryPane />}
              {hub === "profile" && <ProfilePane />}
            </div>
            {hub === "play" && <PlayFoot onStart={startRace} />}
          </div>
        </aside>
      )}

      <nav className="hub-nav" aria-label="Main">
        <div className="hub-nav-inner">
          <NavBtn id="home" label="首页" icon={<Home className="size-5" />} />
          <NavBtn id="play" label="比赛" icon={<Play className="size-5" />} />
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
}: {
  id: HubId;
  label: string;
  icon: ReactNode;
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
      className={cn("hub-nav-btn", on && "is-on")}
    >
      {icon}
      <span className="hub-nav-label">{label}</span>
    </button>
  );
}

function PlayPane() {
  const levelId = useGameStore((s) => s.levelId);
  const setLevel = useGameStore((s) => s.setLevel);
  const isUnlocked = useGameStore((s) => s.isUnlocked);
  const cleared = useGameStore((s) => s.cleared);
  const levelBest = useGameStore((s) => s.levelBest);
  return (
    <div className="hub-play-grid">
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
  );
}

function PlayFoot({ onStart }: { onStart: () => void }) {
  return (
    <div className="hub-panel-foot">
      <Button
        size="lg"
        className="hub-play-cta w-full"
        aria-label="Start"
        onClick={() => {
          unlockAudio();
          sfxClick();
          onStart();
        }}
      >
        PLAY
      </Button>
    </div>
  );
}

function WardrobeOrbit() {
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const lastX = useRef(0);
  const pinch = useRef<number | null>(null);

  const syncPinch = () => {
    const pts = [...pointers.current.values()];
    if (pts.length < 2) {
      pinch.current = null;
      return false;
    }
    const dx = pts[0].x - pts[1].x;
    const dy = pts[0].y - pts[1].y;
    const dist = Math.hypot(dx, dy);
    if (pinch.current != null && pinch.current > 1) {
      const delta = dist - pinch.current;
      sim.showcaseDistance = clampShowcaseDistance(sim.showcaseDistance - delta * 0.012);
    }
    pinch.current = dist;
    sim.lookIdle = 0;
    return true;
  };

  return (
    <div
      className="hub-orbit"
      aria-label="Rotate character"
      onWheel={(e) => {
        sim.showcaseDistance = clampShowcaseDistance(sim.showcaseDistance + e.deltaY * 0.004);
        sim.lookIdle = 0;
      }}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        lastX.current = e.clientX;
      }}
      onPointerMove={(e) => {
        if (!pointers.current.has(e.pointerId)) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (syncPinch()) return;
        sim.showcaseYaw += (e.clientX - lastX.current) * 0.012;
        lastX.current = e.clientX;
        sim.lookIdle = 0;
      }}
      onPointerUp={(e) => {
        pointers.current.delete(e.pointerId);
        pinch.current = null;
      }}
      onPointerCancel={(e) => {
        pointers.current.delete(e.pointerId);
        pinch.current = null;
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
  const [cat, setCat] = useState<SkinListFilter>("all");
  const [own, setOwn] = useState<"all" | "owned" | "locked">("all");
  const viewing = getSkin(preview ?? equipped);
  const appearance = resolveSkinAppearance(viewing);
  const have = owned.includes(viewing.id);
  const equippedNow = viewing.id === equipped;
  const status = !have ? "LOCKED · 未拥有" : equippedNow ? "EQUIPPED · 已装备" : "OWNED · 已拥有";
  const catalog = SKINS.filter((s) => s.assetRole !== "test");
  const ownedCount = catalog.filter((s) => owned.includes(s.id)).length;
  const cats: { id: SkinListFilter; label: string }[] = [
    { id: "all", label: "全部" },
    { id: "yolk", label: "蛋黄" },
    { id: "animal", label: "动物" },
    { id: "fantasy", label: "奇幻" },
    { id: "mecha", label: "机甲" },
    { id: "lab", label: "实验室" },
  ];
  const owns: { id: "all" | "owned" | "locked"; label: string }[] = [
    { id: "all", label: "收藏" },
    { id: "owned", label: "已拥有" },
    { id: "locked", label: "未拥有" },
  ];
  const tiles = listSkins(cat).filter((s) => {
    if (rejected.has(s.id)) return false;
    if (own === "owned") return owned.includes(s.id);
    if (own === "locked") return !owned.includes(s.id);
    return true;
  });
  return (
    <>
      <p className="text-sm">
        {viewing.name} · {rarityLabel(viewing.rarity)} · {status}
      </p>
      <p className="mt-1 text-xs text-fg-muted">
        收藏 {ownedCount}/{catalog.length}
        {appearance.prototype ? " · 原型外观" : ""}
      </p>
      {!have && <p className="mt-1 text-xs text-fg-subtle">获取方式：{unlockLabel(viewing.unlock)}</p>}
      <div className="mt-3 flex flex-wrap gap-1">
        {owns.map((c) => (
          <button
            key={c.id}
            type="button"
            className={cn(
              "rounded-full border px-2 py-1 text-[11px]",
              own === c.id ? "border-accent text-fg" : "border-border text-fg-muted",
            )}
            onClick={() => setOwn(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
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
        {tiles.map((s) => {
          const got = owned.includes(s.id);
          const on = (preview ?? equipped) === s.id;
          const mark = !got ? "未拥有" : s.id === equipped ? "已装备" : "已拥有";
          return (
            <button
              key={s.id}
              type="button"
              aria-label={`${s.name}，${mark}`}
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
              <span className="mt-0.5 block text-[10px] text-fg-subtle">
                {s.assetRole === "test" ? "试作 · " : ""}
                {mark}
              </span>
            </button>
          );
        })}
      </div>
      {tiles.length === 0 && <p className="mt-3 text-sm text-fg-muted">这类还没有角色</p>}
      {cat === "lab" && <LabImportForm />}
      <div className="mt-3 flex gap-2 hub-sticky-cta">
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

function LabImportForm() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const setOverride = useGameStore((s) => s.setModelUrlOverride);
  const setPreviewSkin = useGameStore((s) => s.setPreviewSkin);
  return (
    <div className="mt-3 rounded-2xl border border-border bg-surface-2 p-3">
      <p className="text-xs text-fg-muted">Hunyuan3D 无法从会话上传。把 GLB 放到 GitHub raw / catbox 后贴链接。</p>
      <input
        type="url"
        inputMode="url"
        autoComplete="off"
        placeholder="https://…/model.glb"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="mt-2 h-10 w-full rounded-xl border border-border bg-ink px-3 text-sm text-fg outline-none placeholder:text-fg-subtle"
        aria-label="Hunyuan GLB 公开链接"
      />
      <Button
        className="mt-2 w-full"
        disabled={busy || url.trim().length < 8}
        onClick={() => {
          void (async () => {
            setBusy(true);
            setMsg("正在导入…");
            try {
              const res = await fetch("/api/skins/import-url", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ url: url.trim() }),
              });
              const data = (await res.json()) as { ok?: boolean; error?: string; modelUrl?: string };
              if (!data.ok || !data.modelUrl) {
                setMsg(data.error ?? "导入失败");
                return;
              }
              clearSkinAssetCache("lab_user_import");
              setOverride("lab_user_import", `${data.modelUrl}?t=${Date.now()}`);
              setPreviewSkin("lab_user_import");
              setMsg("已导入，点「实验室 · 导入」预览");
            } catch {
              setMsg("导入失败");
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        {busy ? "导入中" : "导入 Hunyuan GLB"}
      </Button>
      {msg ? <p className="mt-2 text-[11px] text-fg-subtle">{msg}</p> : null}
    </div>
  );
}

function InventoryPane() {
  const owned = useGameStore((s) => s.ownedSkins);
  const equipped = useGameStore((s) => s.equippedSkin);
  const setSkin = useGameStore((s) => s.setSkin);
  const coins = useGameStore((s) => s.coins);
  const pullGacha = useGameStore((s) => s.pullGacha);
  const rejected = useRejectedSkinIds();
  const [kind, setKind] = useState<SkinKind | "all" | "lab">("all");
  const kinds: { id: SkinKind | "all" | "lab"; label: string }[] = [
    { id: "all", label: "全部" },
    { id: "full", label: "角色" },
    { id: "hat", label: "头饰" },
    { id: "wings", label: "翅膀" },
    { id: "cape", label: "披风" },
    { id: "halo", label: "特效" },
    { id: "lab", label: "试作" },
  ];
  const featured = getSkin(FEATURED_GACHA_SKIN_ID);
  const list = SKINS.filter((s) => {
    if (rejected.has(s.id) || !owned.includes(s.id)) return false;
    if (kind === "lab") return s.assetRole === "test";
    if (s.assetRole === "test") return false;
    return kind === "all" || s.kind === kind;
  });
  return (
    <>
      <div className="mb-3 rounded-2xl border border-accent/50 bg-surface-2 p-3">
        <p className="text-[10px] uppercase tracking-wider text-fg-subtle">本期角色</p>
        <p className="mt-1 font-medium">{featured.name}</p>
        <p className="text-xs text-fg-muted">
          {rarityLabel(featured.rarity)} · {featured.description || "完整角色外观"}
        </p>
      </div>
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
        className="mt-4 w-full hub-sticky-cta"
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
      <p className="font-display text-xl">{name}</p>
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
