import type * as THREE from "three";

export const PERF_EVENT = "yolk:performance-sample";
const SAMPLE_COUNT = 120;
const EMIT_INTERVAL_MS = 500;

export type PerformanceSample = {
  fps: number;
  averageFrameMs: number;
  p95FrameMs: number;
  drawCalls: number;
  triangles: number;
  textures: number;
  canvasWidth: number;
  canvasHeight: number;
};

export type PerformanceSampleEvent = CustomEvent<PerformanceSample>;

type RenderMethod = (scene: THREE.Scene, camera: THREE.Camera) => void;

const observedRenderers = new WeakSet<THREE.WebGLRenderer>();
const frameTimes = new Float64Array(SAMPLE_COUNT);
const sortedFrameTimes = new Float64Array(SAMPLE_COUNT);
let sampleCount = 0;
let sampleIndex = 0;
let frameCount = 0;
let lastFrameMs = 0;
let lastEmitMs = 0;

function percentile95(): number {
  const count = Math.min(sampleCount, SAMPLE_COUNT);
  if (count === 0) return 0;
  sortedFrameTimes.set(frameTimes.subarray(0, count), 0);
  sortedFrameTimes.subarray(0, count).sort();
  const rank = Math.max(0, Math.ceil(count * 0.95) - 1);
  return sortedFrameTimes[rank];
}

function sample(renderer: THREE.WebGLRenderer): void {
  const now = performance.now();
  frameCount += 1;

  if (lastFrameMs > 0) {
    const frameMs = now - lastFrameMs;
    if (frameMs > 0 && frameMs < 1_000) {
      frameTimes[sampleIndex] = frameMs;
      sampleIndex = (sampleIndex + 1) % SAMPLE_COUNT;
      sampleCount = Math.min(sampleCount + 1, SAMPLE_COUNT);
    }
  }
  lastFrameMs = now;

  if (lastEmitMs === 0) {
    lastEmitMs = now;
    return;
  }
  if (now - lastEmitMs < EMIT_INTERVAL_MS) return;

  const elapsedSeconds = (now - lastEmitMs) / 1_000;
  const info = renderer.info;
  const count = Math.min(sampleCount, SAMPLE_COUNT);
  const total = frameTimes.subarray(0, count).reduce((sum, value) => sum + value, 0);
  const detail: PerformanceSample = {
    fps: frameCount / Math.max(elapsedSeconds, Number.EPSILON),
    averageFrameMs: count > 0 ? total / count : 0,
    p95FrameMs: percentile95(),
    drawCalls: info.render.calls,
    triangles: info.render.triangles,
    textures: info.memory.textures,
    canvasWidth: renderer.domElement.width,
    canvasHeight: renderer.domElement.height,
  };

  frameCount = 0;
  lastEmitMs = now;
  window.dispatchEvent(new CustomEvent<PerformanceSample>(PERF_EVENT, { detail }));
}

/**
 * Observe the concrete R3F renderer. This avoids relying on prototype mutation
 * and guarantees that samples come from the active canvas after a quality or
 * level remount. Call it only from the `?debug=perf` renderer bridge.
 */
export function observePerformanceRenderer(renderer: THREE.WebGLRenderer): void {
  if (observedRenderers.has(renderer)) return;
  observedRenderers.add(renderer);

  const originalRender = renderer.render.bind(renderer) as RenderMethod;
  renderer.render = (scene: THREE.Scene, camera: THREE.Camera): void => {
    originalRender(scene, camera);
    sample(renderer);
  };
}
