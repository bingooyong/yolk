# Performance Guide

## Practical gate

```bash
npm run test:visual
npm run typecheck
npx eslint src/engine/visualProfile.ts src/engine/visualProfile.test.ts src/game/character-presentation.ts src/game/character-presentation.test.ts src/game/level1-benchmark.ts src/game/level1-benchmark.test.ts src/game/Level1BenchmarkArt.tsx src/game/LightingSystem.tsx src/game/Track.tsx src/game/store.ts src/game/store-hydration.test.ts src/components/GameApp.tsx src/components/PerformanceDebug.tsx scripts/visual-smoke.mjs
npm run build
npm run smoke:visual -- --url http://127.0.0.1:4173/
```

The broad `npm test`/`npm run lint` suites have documented pre-existing failures unrelated to this visual increment. Do not hide those results, but do not block the focused visual gate on them.

## Runtime evidence

Append `?debug=perf` only when measuring. The overlay reports FPS, rolling average and p95 frame time, renderer draw calls, triangles, textures, canvas pixel dimensions, and resolved quality. Samples are held in a fixed 120-frame ring and emitted every 500 ms; React does not re-render each frame.

Current local benchmark evidence is in the Trellis task research directory. A 390×844 medium-quality Chromium/SwiftShader run reported 308 draw calls, 98,320 triangles, 9 textures, and a 585×1266 canvas. Its software-rendered 5 FPS / 123.15 ms average / 320 ms p95 is not representative of iPhone GPU timing; use it only as a counter/render-path probe until physical-device measurements exist.

## Budget rules

- Keep low quality free of shadow maps, MSAA, large environment targets, and heavy instanced detail.
- Medium is the default coherent target; high adds resolution and shadow detail rather than new essential information.
- Prefer one key shadow light and cheap anchored contact shadows.
- Prefer shared geometry/materials, instancing, and canvas-generated textures over asset weight.
- Do not allocate objects, arrays, or textures inside `useFrame`.
- Keep gameplay at fixed 60 Hz and presentation in render interpolation.
- Compare desktop and mobile screenshots with `scripts/visual-smoke.mjs`; the script waits for the real viewport-sized R3F canvas and rejects the 300×150 boot placeholder. Treat desktop Chromium as a smoke proxy only.
- Physical-device iPhone/iPad evidence is still required before accepting Bloom, AO, DoF, weather, or LOD work; all are deferred.

## Hydration QA

The store deliberately initializes with deterministic defaults. `GameApp` reconciles `localStorage` after mount and preserves the existing `yolk-rush-v4` key. The visual smoke seeds a saved player, reloads, and requires no console/page errors so persisted reloads cannot destabilize screenshots.
