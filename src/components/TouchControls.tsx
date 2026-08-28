import { useCallback, useRef, useState } from "react";
import { useDevice } from "@/engine/device";
import { haptic } from "@/engine/haptics";
import { touch } from "@/game/input";
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
      <div
        className={cn(
          "absolute flex flex-col gap-3",
          device.iPad ? "bottom-8 right-8" : "bottom-5 right-4",
          "landscape:bottom-3 landscape:right-5",
        )}
      >
        <ActionBtn
          label="冲"
          aria="Dash"
          large={device.iPad}
          className="bg-coral text-fg"
          onHold={(v) => {
            touch.dash = v;
            if (v) haptic("medium");
          }}
        />
        <ActionBtn
          label="跳"
          aria="Jump"
          large={device.iPad}
          className="bg-accent text-accent-fg"
          onHold={(v) => {
            touch.jump = v;
            if (v) haptic("light");
          }}
        />
      </div>
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

  const onDown = useCallback(
    (e: React.PointerEvent) => {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      pid.current = e.pointerId;
      originRef.current = { x: e.clientX, y: e.clientY };
      setOrigin({ x: e.clientX, y: e.clientY });
      setKnob({ x: 0, y: 0 });
      touch.moveX = 0;
      touch.moveY = 0;
    },
    [],
  );

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

function ActionBtn({
  label,
  aria,
  className,
  large,
  onHold,
}: {
  label: string;
  aria: string;
  className?: string;
  large: boolean;
  onHold: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-label={aria}
      className={cn(
        "pointer-events-auto rounded-full font-display shadow-panel",
        large ? "size-20 text-2xl" : "size-[68px] text-xl",
        className,
      )}
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        e.preventDefault();
        onHold(true);
      }}
      onPointerUp={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
    >
      {label}
    </button>
  );
}
