import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUp, Lock, Sparkles, Zap } from "lucide-react";
import { useDevice } from "@/engine/device";
import { haptic } from "@/engine/haptics";
import { touch } from "@/game/input";
import { sim } from "@/game/sim";
import { useGameStore } from "@/game/store";
import { cn } from "@/lib/utils";

export function TouchControls() {
  const device = useDevice();
  const phase = useGameStore((s) => s.phase);
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
      <ActionPad large={device.iPad} />
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

function ActionPad({ large }: { large: boolean }) {
  const jumpRef = useRef<HTMLButtonElement>(null);
  const dashRef = useRef<HTMLButtonElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const jumpPid = useRef<number | null>(null);
  const dashPid = useRef<number | null>(null);

  useEffect(() => {
    let id = 0;
    const circ = 2 * Math.PI * 38;
    const tick = () => {
      const p = sim.pad;
      const dash = dashRef.current;
      const jump = jumpRef.current;
      const ring = ringRef.current;
      if (dash) {
        dash.classList.toggle("is-down", p.dashState === "charging" || p.dashState === "ready");
        dash.classList.toggle("is-max", p.dashState === "ready");
        dash.classList.toggle("is-pulse", p.dashState === "release" || p.dashState === "active");
      }
      if (jump) {
        jump.classList.toggle("is-down", p.jumpHeld);
      }
      if (ring) {
        const charge = p.dashState === "idle" || p.dashState === "recovery" ? 0 : p.dashCharge;
        ring.style.strokeDashoffset = String(circ * (1 - charge));
        ring.style.opacity = charge > 0.02 ? "1" : "0";
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(id);
      touch.jump = false;
      touch.dash = false;
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
      sim.pad.jumpPulse = performance.now();
      jumpRef.current?.classList.add("is-down", "is-pulse");
      haptic("light");
      window.setTimeout(() => jumpRef.current?.classList.remove("is-pulse"), 170);
    } else {
      if (jumpPid.current != null && e.pointerId !== jumpPid.current) return;
      jumpPid.current = null;
      touch.jump = false;
      sim.pad.jumpHeld = false;
      jumpRef.current?.classList.remove("is-down");
    }
  };

  const holdDash = (e: React.PointerEvent, kind: "down" | "up" | "cancel") => {
    if (kind === "down") {
      dashPid.current = e.pointerId;
      e.currentTarget.setPointerCapture(e.pointerId);
      e.preventDefault();
      touch.dashCancel = false;
      touch.dash = true;
      haptic("medium");
      return;
    }
    if (dashPid.current != null && e.pointerId !== dashPid.current) return;
    dashPid.current = null;
    if (kind === "cancel") {
      touch.dashCancel = true;
      touch.dash = false;
    } else {
      touch.dashCancel = false;
      touch.dash = false;
    }
  };

  const s = large ? 1.16 : 1;
  const dash = 84 * s;
  const jump = 70 * s;
  const skill = 42 * s;

  return (
    <div className={cn("action-pad", large && "pad-lg")} aria-label="Action pad">
      <SkillSlot
        label="Skill 1"
        left={78 * s}
        top={2 * s}
        size={skill}
        icon={<Sparkles className="size-4" />}
      />
      <button
        ref={jumpRef}
        type="button"
        aria-label="Jump"
        className="pad-btn"
        style={{ left: 4 * s, top: 36 * s, width: jump, height: jump }}
        onPointerDown={(e) => holdJump(e, true)}
        onPointerUp={(e) => holdJump(e, false)}
        onPointerCancel={(e) => holdJump(e, false)}
      >
        <span className="pad-ripple" />
        <span className="pad-face bg-accent text-accent-fg">
          <ArrowUp className="size-8" strokeWidth={2.6} />
        </span>
      </button>
      <SkillSlot
        label="Skill 2"
        left={142 * s}
        top={48 * s}
        size={skill}
        icon={<Sparkles className="size-4" />}
      />
      <button
        ref={dashRef}
        type="button"
        aria-label="Dash"
        className="pad-btn"
        style={{ left: 58 * s, top: 96 * s, width: dash, height: dash }}
        onPointerDown={(e) => holdDash(e, "down")}
        onPointerUp={(e) => holdDash(e, "up")}
        onPointerCancel={(e) => holdDash(e, "cancel")}
      >
        <svg className="pad-ring" viewBox="0 0 88 88" aria-hidden>
          <circle cx="44" cy="44" r="38" fill="none" stroke="rgb(255 246 235 / 0.12)" strokeWidth="4" />
          <circle
            ref={ringRef}
            cx="44"
            cy="44"
            r="38"
            fill="none"
            stroke="var(--color-coral)"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 38}
            strokeDashoffset={2 * Math.PI * 38}
            style={{ opacity: 0 }}
          />
        </svg>
        <span className="pad-ripple" />
        <span className="pad-face bg-coral text-fg">
          <Zap className="size-8" strokeWidth={2.4} fill="currentColor" />
        </span>
      </button>
      <SkillSlot
        label="Skill 3"
        left={128 * s}
        top={138 * s}
        size={skill}
        icon={<Sparkles className="size-4" />}
      />
    </div>
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
