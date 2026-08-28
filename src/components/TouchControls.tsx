import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUp, ChevronsRight, CircleDashed, Lock, Sparkles, Zap } from "lucide-react";
import { useDevice } from "@/engine/device";
import { haptic } from "@/engine/haptics";
import { touch } from "@/game/input";
import { sim } from "@/game/sim";
import { useGameStore } from "@/game/store";
import { cn } from "@/lib/utils";

export function TouchControls() {
  const device = useDevice();
  const phase = useGameStore((s) => s.phase);
  const scale = useGameStore((s) => s.controlScale);
  const opacity = useGameStore((s) => s.controlOpacity);
  const active = phase === "playing" || phase === "countdown";

  if (!device.touchUI || !active) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20"
      style={{
        paddingLeft: "max(8px, env(safe-area-inset-left))",
        paddingRight: "max(8px, env(safe-area-inset-right))",
        paddingBottom: "max(10px, env(safe-area-inset-bottom))",
      }}
    >
      <JoystickZone large={device.iPad} />
      <LookZone />
      <ActionPad large={device.iPad} scale={scale} opacity={opacity} />
    </div>
  );
}

function JoystickZone({ large }: { large: boolean }) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const pid = useRef<number | null>(null);
  const originRef = useRef({ x: 0, y: 0 });
  const max = large ? 56 : 48;

  const update = (cx: number, cy: number) => {
    let dx = cx - originRef.current.x;
    let dy = cy - originRef.current.y;
    const mag = Math.hypot(dx, dy);
    if (mag > max) {
      dx = (dx / mag) * max;
      dy = (dy / mag) * max;
    }
    setKnob({ x: dx, y: dy });
    touch.moveX = dx / max;
    touch.moveY = -dy / max;
  };

  const onDown = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pid.current = e.pointerId;
    originRef.current = { x: e.clientX, y: e.clientY };
    setOrigin({ x: e.clientX, y: e.clientY });
    setKnob({ x: 0, y: 0 });
    touch.moveX = 0;
    touch.moveY = 0;
  }, []);

  const onMove = (e: React.PointerEvent) => {
    if (pid.current !== e.pointerId) return;
    update(e.clientX, e.clientY);
  };

  const onUp = (e: React.PointerEvent) => {
    if (pid.current !== e.pointerId) return;
    pid.current = null;
    setOrigin(null);
    setKnob({ x: 0, y: 0 });
    touch.moveX = 0;
    touch.moveY = 0;
  };

  const size = large ? 136 : 112;

  return (
    <div
      className="pointer-events-auto absolute bottom-0 left-0 h-[46%] w-[48%] landscape:h-[58%] landscape:w-[42%]"
      style={{ touchAction: "none" }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      aria-label="Move"
    >
      {origin && (
        <div
          className="pointer-events-none fixed z-20 rounded-full border border-border bg-ink/40"
          style={{
            width: size,
            height: size,
            left: origin.x,
            top: origin.y,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            className="absolute left-1/2 top-1/2 rounded-full bg-fg/90"
            style={{
              width: large ? 56 : 48,
              height: large ? 56 : 48,
              transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
            }}
          />
        </div>
      )}
    </div>
  );
}

function LookZone() {
  const pid = useRef<number | null>(null);
  const last = useRef({ x: 0, y: 0 });
  return (
    <div
      className="pointer-events-auto absolute right-0 w-[48%]"
      style={{
        touchAction: "none",
        top: "max(58px, calc(env(safe-area-inset-top) + 48px))",
        height: "38%",
      }}
      aria-label="Look"
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        pid.current = e.pointerId;
        last.current = { x: e.clientX, y: e.clientY };
        sim.lookIdle = 0;
      }}
      onPointerMove={(e) => {
        if (pid.current !== e.pointerId) return;
        touch.lookX += e.clientX - last.current.x;
        touch.lookY += e.clientY - last.current.y;
        last.current = { x: e.clientX, y: e.clientY };
        sim.lookIdle = 0;
      }}
      onPointerUp={(e) => {
        if (pid.current !== e.pointerId) return;
        pid.current = null;
      }}
      onPointerCancel={() => {
        pid.current = null;
      }}
    />
  );
}

function ActionPad({ large, scale, opacity }: { large: boolean; scale: number; opacity: number }) {
  const jumpRef = useRef<HTMLButtonElement>(null);
  const boostRef = useRef<HTMLButtonElement>(null);
  const pounceRef = useRef<HTMLButtonElement>(null);
  const rollRef = useRef<HTMLButtonElement>(null);
  const pounceRing = useRef<SVGCircleElement>(null);
  const rollRing = useRef<SVGCircleElement>(null);
  const boostRing = useRef<SVGCircleElement>(null);
  const jumpPid = useRef<number | null>(null);
  const boostPid = useRef<number | null>(null);

  useEffect(() => {
    let id = 0;
    const circ = 2 * Math.PI * 34;
    const tick = () => {
      const p = sim.pad;
      jumpRef.current?.classList.toggle("is-down", p.jumpHeld);
      boostRef.current?.classList.toggle("is-down", p.dashState === "charging" || p.dashState === "ready");
      boostRef.current?.classList.toggle("is-max", p.dashState === "ready");
      pounceRef.current?.classList.toggle("is-ready-flash", p.pounce.flash > 0);
      rollRef.current?.classList.toggle("is-ready-flash", p.roll.flash > 0);
      boostRef.current?.classList.toggle("is-ready-flash", p.boost.flash > 0);
      pounceRef.current?.classList.toggle("is-cool", p.pounce.phase === "cooldown");
      rollRef.current?.classList.toggle("is-cool", p.roll.phase === "cooldown");
      const setRing = (el: SVGCircleElement | null, cd01: number, show: boolean) => {
        if (!el) return;
        el.style.strokeDashoffset = String(circ * (1 - cd01));
        el.style.opacity = show ? "1" : "0";
      };
      setRing(pounceRing.current, p.pounce.cd01, p.pounce.phase !== "ready");
      setRing(rollRing.current, p.roll.cd01, p.roll.phase !== "ready");
      const boostCharge = p.dashState === "idle" || p.dashState === "recovery" ? p.boost.cd01 : p.dashCharge;
      setRing(boostRing.current, boostCharge, p.dashState !== "idle" || p.boost.phase !== "ready");
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(id);
      touch.jump = false;
      touch.dash = false;
      touch.pounce = false;
      touch.roll = false;
      touch.dashCancel = false;
      sim.pad.jumpHeld = false;
    };
  }, []);

  const holdJump = (e: React.PointerEvent, on: boolean) => {
    if (on) {
      jumpPid.current = e.pointerId;
      e.currentTarget.setPointerCapture(e.pointerId);
      e.preventDefault();
      touch.jump = true;
      sim.pad.jumpHeld = true;
      jumpRef.current?.classList.add("is-down", "is-pulse");
      haptic("light");
      window.setTimeout(() => jumpRef.current?.classList.remove("is-pulse"), 160);
    } else {
      if (jumpPid.current != null && e.pointerId !== jumpPid.current) return;
      jumpPid.current = null;
      touch.jump = false;
      sim.pad.jumpHeld = false;
      jumpRef.current?.classList.remove("is-down");
    }
  };

  const holdBoost = (e: React.PointerEvent, kind: "down" | "up" | "cancel") => {
    if (kind === "down") {
      boostPid.current = e.pointerId;
      e.currentTarget.setPointerCapture(e.pointerId);
      e.preventDefault();
      touch.dashCancel = false;
      touch.dash = true;
      haptic("medium");
      return;
    }
    if (boostPid.current != null && e.pointerId !== boostPid.current) return;
    boostPid.current = null;
    touch.dashCancel = kind === "cancel";
    touch.dash = false;
  };

  const tap = (key: "pounce" | "roll", e: React.PointerEvent, on: boolean) => {
    e.preventDefault();
    if (on) {
      e.currentTarget.setPointerCapture(e.pointerId);
      touch[key] = true;
      haptic("medium");
    } else {
      touch[key] = false;
    }
  };

  const s = (large ? 1.12 : 1) * scale;
  const jump = 100 * s;
  const mid = 56 * s;
  const skill = 38 * s;

  return (
    <div
      className={cn("action-pad", large && "pad-lg")}
      aria-label="Action pad"
      style={{ opacity, transform: large ? undefined : undefined }}
    >
      <SkillSlot label="Skill" left={80 * s} top={2 * s} size={skill} icon={<Sparkles className="size-3.5" />} />
      <PadAbility
        btnRef={rollRef}
        ringRef={rollRing}
        aria="Roll"
        left={4 * s}
        top={36 * s}
        size={mid}
        face="bg-sky text-ink"
        icon={<CircleDashed className="size-6" strokeWidth={2.4} />}
        onPointerDown={(e) => tap("roll", e, true)}
        onPointerUp={(e) => tap("roll", e, false)}
        onPointerCancel={(e) => tap("roll", e, false)}
      />
      <PadAbility
        btnRef={pounceRef}
        ringRef={pounceRing}
        aria="Pounce"
        left={136 * s}
        top={36 * s}
        size={mid}
        face="bg-peach text-ink"
        icon={<ChevronsRight className="size-6" strokeWidth={2.6} />}
        onPointerDown={(e) => tap("pounce", e, true)}
        onPointerUp={(e) => tap("pounce", e, false)}
        onPointerCancel={(e) => tap("pounce", e, false)}
      />
      <button
        ref={jumpRef}
        type="button"
        aria-label="Jump"
        className="pad-btn pad-jump"
        style={{ left: 48 * s, top: 62 * s, width: jump, height: jump, zIndex: 2 }}
        onPointerDown={(e) => holdJump(e, true)}
        onPointerUp={(e) => holdJump(e, false)}
        onPointerCancel={(e) => holdJump(e, false)}
      >
        <span className="pad-ripple" />
        <span className="pad-face bg-accent text-accent-fg">
          <ArrowUp className="size-11" strokeWidth={2.6} />
        </span>
      </button>
      <PadAbility
        btnRef={boostRef}
        ringRef={boostRing}
        aria="Dash"
        left={70 * s}
        top={162 * s}
        size={mid}
        face="bg-coral text-fg"
        icon={<Zap className="size-6" strokeWidth={2.4} fill="currentColor" />}
        onPointerDown={(e) => holdBoost(e, "down")}
        onPointerUp={(e) => holdBoost(e, "up")}
        onPointerCancel={(e) => holdBoost(e, "cancel")}
      />
    </div>
  );
}

function PadAbility({
  btnRef,
  ringRef,
  aria,
  left,
  top,
  size,
  face,
  icon,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
}: {
  btnRef: React.RefObject<HTMLButtonElement | null>;
  ringRef: React.RefObject<SVGCircleElement | null>;
  aria: string;
  left: number;
  top: number;
  size: number;
  face: string;
  icon: ReactNode;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
}) {
  const circ = 2 * Math.PI * 34;
  return (
    <button
      ref={btnRef}
      type="button"
      aria-label={aria}
      className="pad-btn"
      style={{ left, top, width: size, height: size }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <svg className="pad-ring" viewBox="0 0 80 80" aria-hidden>
        <circle cx="40" cy="40" r="34" fill="none" stroke="rgb(255 246 235 / 0.12)" strokeWidth="4" />
        <circle
          ref={ringRef}
          cx="40"
          cy="40"
          r="34"
          fill="none"
          stroke="var(--color-fg)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ}
          style={{ opacity: 0 }}
        />
      </svg>
      <span className="pad-ripple" />
      <span className={cn("pad-face", face)}>{icon}</span>
    </button>
  );
}

function SkillSlot({
  label,
  left,
  top,
  size,
  icon,
}: {
  label: string;
  left: number;
  top: number;
  size: number;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={`${label} locked`}
      disabled
      className="pad-btn is-locked"
      style={{ left, top, width: size, height: size }}
    >
      <span className="pad-face bg-surface-2 text-fg-subtle">
        <span className="relative">
          {icon}
          <Lock className="absolute -right-2 -top-1 size-3" />
        </span>
      </span>
    </button>
  );
}
