# Yolk Rush Phase 2 Visual Upgrade

## Goal

Upgrade the existing React + Three.js / React Three Fiber stack from a playable but demo-looking 3D race into a cohesive mobile party-game presentation, starting with a P0 rendering foundation and a Level 1 “golden benchmark.” Preserve gameplay behavior and the current engine choice.

## Confirmed Context

- The project already uses React 19, Three.js 0.185, R3F 9.7, Drei 10.7, Rapier 2.2, Vite, TypeScript, Tailwind CSS 4, and Zustand.
- Existing 3D entry points are `src/game/GameCanvas.tsx`, `CameraRig.tsx`, `Track.tsx`, `EggRacer.tsx`, and `EggMesh.tsx`.
- Gameplay already runs on a fixed-step pipeline and interpolates rendering; `useFrame` is intended for presentation only.
- Current renderer config is local to `GameCanvas.tsx`; ACES tone mapping is set twice and quality mainly affects DPR/antialias/shadow enablement.
- Static/runtime audits found a radius-160 sky dome clipped by the camera far plane, render-rate Rapier mover updates, an uncalibrated egg contact frame, unused movement states, an incorrectly color-managed toon ramp, and a Level 1 finish visual/trigger mismatch.
- Persisted `localStorage` values can produce a React hydration mismatch on reload, making visual smoke evidence unstable.
- Baseline quality on 2026-08-28: `npm run typecheck` passed; `npm run lint` failed on pre-existing unrelated warnings plus one `src/lib/app-data/client.server.ts` empty-block error; `npm test` failed 16 of 195 cases in brand/PWA/local-app-env expectations unrelated to the 3D surface. This task must not hide those baseline results.
- The user’s supplied third-party reference images are not repository assets. This task may learn visual principles from them but must not copy characters, UI, models, textures, logos, or other protected material.
- iPhone/iPad performance is a first-class requirement, not a post-processing afterthought.

## Requirements

### R1 — Visual architecture audit

- Audit renderer, scene graph, lighting, shadows, materials, camera, environment, character, VFX, UI, and performance before broad code changes.
- Record exact current implementation locations, problems, impact, proposed changes, priority, effort, and performance implications.
- Produce `docs/visual/visual-architecture-audit.md`.

### R2 — Unified render foundation

- Consolidate renderer and visual settings into data-driven engine configuration rather than scattered magic values.
- Configure color space, tone mapping, exposure, DPR, shadow maps, and quality-aware mobile behavior consistently.
- Keep low quality genuinely low-cost while making medium/high visually coherent.

### R3 — Lighting and grounding

- Introduce a reusable lighting setup with key, fill/environment, rim, and local-highlight roles.
- Ensure characters and relevant course objects cast/receive shadows correctly.
- Add soft height-aware ground contact feedback so the player does not appear to float.
- Avoid oversized black blobs and heavy full-screen post-processing.

### R4 — Character and material identity

- Improve the player silhouette with secondary geometry and distinct egg/body/accessory materials.
- Add eye catchlights and enough material roughness/color variation to read as a toy-like character under directional light.
- Preserve existing skin IDs and gameplay dimensions unless a focused visual-only change is safe.

### R5 — Level 1 golden benchmark

- Use Level 1 as the first end-to-end visual benchmark, not rework every course at once.
- Establish foreground, midground, and background layers; readable route direction; decorated track edges; and a memorable finish moment.
- Keep course collision/layout behavior stable while enriching non-colliding presentation.

### R6 — Camera and game feel

- Preserve smooth follow, orbit/free look, shake, FOV, and input behavior.
- Improve framing and spatial depth without hiding upcoming hazards.
- Make camera behavior data-driven enough for later gacha/hero-shot modes.

### R7 — Visual documentation

- Create practical visual system documents under `docs/visual/` covering rendering, lighting, materials, camera, environment, VFX, performance, and style.
- Create `visual-architecture.md`, `rendering-pipeline.md`, `lighting-system.md`, `material-system.md`, `camera-system.md`, `vfx-system.md`, `environment-art.md`, `performance-guide.md`, and `visual-style-guide.md`.
- The docs must constrain future levels/skins so new content follows the benchmark instead of regressing to primitive-box scenes.

### R8 — Validation

- Add or maintain automated checks where practical (configuration tests, smoke tests, typecheck/lint).
- Run `npm test`, `npm run typecheck`, `npm run lint`, and a production build or the closest feasible browser smoke check.
- Capture runtime visual evidence for the key app/game states when local tooling permits.

## Out of Scope for This First Increment

- Replacing Three.js/R3F/Rapier or introducing Unity/Unreal.
- Redesigning every level.
- Adding large HDR downloads, imported third-party assets, or copied reference-game art.
- Full LOD, weather, advanced gacha cinematics, and exhaustive skin presentation work; these remain later phases after the P0 benchmark.

## Acceptance Criteria

- [x] `docs/visual/visual-architecture-audit.md` explains why the current build reads as a demo and identifies at least the ten highest-impact visual issues with priority, effort, and performance impact.
- [x] Renderer, tone mapping, exposure, color space, shadow, and quality settings are centralized and consistently applied.
- [x] A reusable lighting/grounding system gives Level 1 clearer volume, contact, and spatial separation on low/medium/high quality.
- [x] The player has a stronger silhouette, readable eyes/catchlights, and materially distinct components while remaining playable.
- [x] Level 1 has deliberate foreground/midground/background art, route guidance, decorated edges, and a stronger finish moment without changing intended gameplay.
- [x] Camera framing and speed feedback preserve obstacle visibility and input semantics.
- [x] Visual documentation defines reusable style/pipeline rules for future content.
- [x] New/targeted tests pass; `npm run typecheck` passes; `npm run lint` either passes or the only remaining findings are the recorded pre-existing baseline findings; `npm test` either passes or the exact pre-existing non-visual failures are recorded without being suppressed.
- [x] A production build and deterministic title/race browser visual check pass, with screenshots retained as task evidence; native device validation may be explicitly deferred when no physical device/simulator run is available.
- [x] No third-party reference characters, UI, textures, models, or logos are copied.

## Product Direction

The intended identity is **cute, rounded, colorful, toy-like, readable, premium mobile party game**. Visual changes should enhance depth, material response, grounding, animation readability, and performance—not add arbitrary CSS decoration or indiscriminate glow.

## Open Questions

None. Planning decisions are captured in `design.md`; advanced weather, LOD, gacha cinematics, and all-course theming are explicitly deferred.
