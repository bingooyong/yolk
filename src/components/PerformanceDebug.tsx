import { useEffect, useRef, type RefObject } from "react";
import { useDevice } from "@/engine/device";
import { useGameStore } from "@/game/store";
import {
  PERF_EVENT,
  type PerformanceSampleEvent,
} from "@/game/performanceInstrumentation";

export function PerformanceDebugOverlay() {

  const device = useDevice();
  const gfx = useGameStore((state) => state.gfx);
  const fps = useRef<HTMLSpanElement>(null);
  const average = useRef<HTMLSpanElement>(null);
  const p95 = useRef<HTMLSpanElement>(null);
  const drawCalls = useRef<HTMLSpanElement>(null);
  const triangles = useRef<HTMLSpanElement>(null);
  const textures = useRef<HTMLSpanElement>(null);
  const canvasSize = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    function set(ref: RefObject<HTMLSpanElement | null>, value: string) {
      if (ref.current && ref.current.textContent !== value) ref.current.textContent = value;
    }

    function onSample(event: Event) {
      const sample = (event as PerformanceSampleEvent).detail;
      set(fps, sample.fps.toFixed(0));
      set(average, `${sample.averageFrameMs.toFixed(2)} ms`);
      set(p95, `${sample.p95FrameMs.toFixed(2)} ms`);
      set(drawCalls, sample.drawCalls.toString());
      set(triangles, sample.triangles.toLocaleString("en-US"));
      set(textures, sample.textures.toString());
      set(canvasSize, `${sample.canvasWidth}×${sample.canvasHeight}`);
    }

    window.addEventListener(PERF_EVENT, onSample);
    return () => window.removeEventListener(PERF_EVENT, onSample);
  }, []);

  const resolvedQuality = gfx === "auto" ? device.quality : gfx;

  return (
    <aside
      aria-label="Performance debug"
      data-testid="performance-debug"
      className="pointer-events-none absolute left-3 top-1/2 z-50 -translate-y-1/2 rounded-xl border border-white/15 bg-black/70 p-3 font-mono text-[11px] leading-5 text-white/90 shadow-panel"
    >
      <p className="mb-1 font-semibold text-white">PERF</p>
      <p>
        FPS <span ref={fps}>--</span>
      </p>
      <p>
        AVG <span ref={average}>--</span>
      </p>
      <p>
        P95 <span ref={p95}>--</span>
      </p>
      <p>
        DRAW <span ref={drawCalls}>--</span>
      </p>
      <p>
        TRI <span ref={triangles}>--</span>
      </p>
      <p>
        TEX <span ref={textures}>--</span>
      </p>
      <p>
        PX <span ref={canvasSize}>--</span>
      </p>
      <p>Q {resolvedQuality.toUpperCase()}</p>
    </aside>
  );
}
