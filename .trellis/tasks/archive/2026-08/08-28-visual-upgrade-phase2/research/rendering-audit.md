# Research: Rendering foundation audit for Phase 2 visual upgrade

- Query: Audit only the rendering foundation — `pipeline.ts`, `GameCanvas.tsx`, `CameraRig.tsx`, relevant Three/R3F/Drei usage, color management, tone mapping, renderer settings, lighting, shadows, postprocessing, and quality/mobile behavior — and produce prioritized P0 recommendations.
- Scope: mixed
- Date: 2026-08-28

## Findings

### Current foundation

| Area | Evidence |
| --- | --- |
| Fixed-step contract | `src/engine/pipeline.ts:1-8` defines 60 Hz physics and a 0.1 s maximum camera delta; the file is constants plus contract documentation only. |
| Canvas / renderer | `src/game/GameCanvas.tsx:77-95` configures dynamic shadows, quality-derived DPR, opaque context (`alpha: false`), no stencil, depth, high-performance GPU preference, quality-derived MSAA, camera frustum, and ACES tone mapping. |
| Color / tone | `src/game/GameCanvas.tsx:40-48` explicitly sets ACES, exposure 1.18, and sRGB output; `<color>`/`<fog>` are attached at `src/game/GameCanvas.tsx:97-98`. |
| Scene contents | `src/game/Track.tsx:34-84` mounts sky, rails, platforms, traps, movers, hazards, rings, pickups, finish arch, decor, and cloud floor; `src/game/EggMesh.tsx:16-117` builds the egg from shared core geometry plus many declarative toon/basic meshes. |
| Camera / light rig | `src/game/CameraRig.tsx:18-104` performs frame-rate-independent camera damping, FOV animation, shake, and look input; `src/game/CameraRig.tsx:109-135` provides one moving shadow-casting directional light. |
| Quality tiers | `src/engine/device.ts:28-46` selects device quality from UA, cores, pointer type, viewport, and optional memory; `src/engine/device.ts:80-90` maps quality to DPR ranges and shadow-map sizes. |
| Installed versions | `package-lock.json:2227`, `:2267`, `:2315`, `:7421` resolve Drei 10.7.8, R3F 9.7.0, Rapier 2.2.0, and Three 0.185.1. |

### P0 recommendations

1. **Fix the sky dome / camera far-plane coupling before adding visual layers.**  
   The camera has `far: 160` (`src/game/GameCanvas.tsx:83`), while `SkyDome` is a radius-160 BackSide sphere centered at the world origin (`src/game/Track.tsx:144-150`). The camera starts behind positive-Z (`src/game/CameraRig.tsx:64-74`) and follows tracks to `finishZ: -110` in the finale (`src/game/levels.ts:653-667`). At the start, the rendered far side of the dome is already more than 160 units from the camera; near the finale it is roughly 264 units away. Consequently the gradient dome is clipped and the user mostly sees the flat `<color>` fallback. Use a camera-following sky shell with radius comfortably inside the far plane (`depthWrite: false`, early `renderOrder`), or make the background a proper screen-space/equirect background. Add start/mid/finish visual checks on the longest track.

2. **Make quality switching honest about immutable WebGL MSAA.**  
   Quality can change at runtime through the settings selector (`src/components/GameUI.tsx:488-495`; `src/game/store.ts:358-360`), and `antialias` is derived from that quality (`src/game/GameCanvas.tsx:84-90`). The Canvas is keyed only by level (`src/game/GameCanvas.tsx:78-79`), so it is not recreated for an AA change. MDN documents WebGL context attributes as creation-time attributes and the same canvas always returns the same context instance; therefore switching high/medium to low after creation cannot turn off the existing MSAA context, and low-to-high cannot enable it. Either key/rebuild the renderer only when the immutable AA mode changes, or always disable context MSAA and use a quality-gated postprocess AA strategy. DPR and shadow toggles are already dynamic (`src/game/GameCanvas.tsx:61-66`, `:81-85`; `src/engine/device.ts:80-90`).

3. **Move moving-world updates onto the fixed-step boundary.**  
   The pipeline says gameplay belongs to fixed 1/60 physics and render merely interpolates (`src/engine/pipeline.ts:1-8`), and player logic correctly uses `useBeforePhysicsStep` with `STEP` (`src/game/EggRacer.tsx:219-229`). In contrast, movers calculate positions in render-rate `useFrame`, then divide position deltas by hard-coded `1 / 60` (`src/game/Track.tsx:157-169`); hammers/spinners/pendulums also set Rapier transforms from render `useFrame` (`src/game/Track.tsx:188-267`). At 120 Hz the exported mover velocity is approximately half the real movement; at 30 Hz it doubles. Move world motion to `useBeforePhysicsStep`, import `PHYSICS_DT`, compute velocity from old/new fixed-step positions, and let Rapier interpolation render it. Also replace the literal `timeStep={1 / 60}` at `src/game/GameCanvas.tsx:53` with the pipeline constant.

4. **Choose the postprocessing path before Phase 2 art is layered on top.**  
   There is no `EffectComposer`, bloom, vignette, SMAA/FXAA, `Environment`, `ContactShadows`, `SoftShadows`, `PerformanceMonitor`, `AdaptiveDpr`, or `Preload` usage in `src/`. `package.json:49` installs Drei, but source has no Drei import; no `@react-three/postprocessing`/`postprocessing` dependency is installed. Current “glow” is one additive player sprite (`src/game/EggMesh.tsx:50-60`) and unlit neon rails (`src/game/Track.tsx:125-140`). Decide explicitly between (a) a no-post stylized path with `toneMapped: false` accents and no new composer, or (b) a quality-gated composer with a validated linear-render-to-final-sRGB order. Do not add assets/effects before that contract is fixed.

### Rendering, color, and tone observations

- R3F 9 defaults already align with the intended color pipeline: `linear` and `flat` default false, output is sRGB, tone mapping is ACES, and `shadows` defaults false (R3F Canvas docs). The explicit settings in `Tone` and `onCreated` are therefore redundant but not incorrect. Keep one authoritative setup rather than both (`src/game/GameCanvas.tsx:40-48`, `:91-95`).
- Canvas textures are correctly marked sRGB (`src/game/look.ts:10-29`). Derived darker colors go through `THREE.Color` before material assignment (`src/game/Track.tsx:11-25`; `src/game/EggMesh.tsx:32-34`), preserving normal color-space conversion.
- ACES is applied to most unlit/neon materials by default. This is inconsistent: player markers opt out (`src/game/EggRacer.tsx:813-842`), but neon rails and the player glow do not (`src/game/Track.tsx:134-137`; `src/game/EggMesh.tsx:50-60`). If accents should read as neon, set `toneMapped: false` consistently or route them through a real bloom pass.
- The lighting rig is global rather than theme-aware: ambient 0.62, a fixed warm/blue hemisphere pair, and a 1.55 directional light (`src/game/GameCanvas.tsx:99-101`; `src/game/CameraRig.tsx:120-131`). `LevelTheme` contains sky/fog/rail/neon/ground but no lighting fields (`src/game/levels.ts:37-49`). Add theme-controlled light color/intensity/exposure before theme-specific art, rather than adding more lights ad hoc.
- Materials are intentionally mixed: Lambert track (`src/game/Track.tsx:20-30`, `:117-120`, etc.) and Toon eggs (`src/game/EggMesh.tsx:64-114`). That can be a useful character/world separation, but final light and exposure calibration must test both together.

### Shadows

- The single shadow-casting directional light is a good mobile baseline. It follows the player (`src/game/CameraRig.tsx:112-118`) and uses a 44×44 orthographic shadow volume with 1024/1536 maps (`src/game/CameraRig.tsx:120-134`; `src/engine/device.ts:86-90`). High quality yields roughly 35 texels per world unit, which is reasonable for this scale.
- `shadow-bias: -0.0004` is present but no `normalBias` is tuned (`src/game/CameraRig.tsx:131`). Verify acne/peter-panning on stacked spheres, rails, movers, and tilted geometry across all quality tiers.
- Low quality disables both renderer shadows and light casting (`src/game/GameCanvas.tsx:61-66`; `src/game/CameraRig.tsx:120-124`), which is a clear tier boundary.
- Very large 130-unit rails are marked cast-shadow (`src/game/Track.tsx:125-133`). Confirm whether they need to cast at all; excluding non-essential casters can recover mobile headroom without changing the visible shadow aesthetic.

### Quality / mobile behavior

- Current DPR caps are low `[1,1.25]`, medium `[1,1.5]`, high `[1,2]` (`src/engine/device.ts:80-84`), and the renderer is opaque with no stencil (`src/game/GameCanvas.tsx:84-90`) — sensible for mobile.
- Device selection is static and heuristic (`src/engine/device.ts:28-46`). There is no runtime performance monitor or adaptive DPR/fallback tier. Add a `PerformanceMonitor`-style budget before expanding effects; R3F’s scaling guide recommends measuring and adapting rather than relying only on device class.
- `Canvas key={levelId}` (`src/game/GameCanvas.tsx:78-79`) destroys and recreates the whole WebGL context on level change even though `Track` already has a level+race key (`src/game/Track.tsx:35-40`) and racers are race-keyed (`src/game/EggRacer.tsx:848-895`). Prefer resetting scene contents rather than the renderer/context; key by renderer-immutable mode only.
- WebGL fallback is absent from `Canvas` (`src/game/GameCanvas.tsx:77-108`), while boot chrome uses a fixed DOM sky (`src/components/GameApp.tsx:57-62`; `src/styles.css:13-19`). A context-loss/unsupported fallback and theme-matched boot color are lower priority but should be part of the final visual contract.

### Camera / frame-loop consistency

- Camera damping uses `1 - exp(-k * dt)` and clamps delta with `MAX_FRAME_DT` (`src/game/CameraRig.tsx:25-26`, `:80-83`), which is frame-rate independent and follows the pipeline contract.
- The Canvas declares initial portrait/landscape FOV 58/50 (`src/game/GameCanvas.tsx:83`), but the rig immediately animates toward base 54/46 (`src/game/CameraRig.tsx:93-99`). Remove one FOV source to avoid accidental regressions.
- `HudPump` is documented as ~12 Hz, but `Math.floor(t * 12) % 2 === 0` samples about 6 Hz and can call multiple times within the same bucket (`src/engine/pipeline.ts:3-4`; `src/game/GameCanvas.tsx:31-37`). Store the last sample bucket if 12 Hz is intended.
- `Ranker` mutates ranking state in render `useFrame` (`src/game/GameCanvas.tsx:14-29`). It is presentation ordering rather than physics, but it should be grouped with the fixed-step/pump boundary decision so “render does not own gameplay state” remains unambiguous.

### Resource hygiene / draw-call foundation

- R3F guidance is to reuse geometry/materials and use instancing for repeated objects. Core egg geometry is shared (`src/game/EggMesh.tsx:16-17`), but each of up to eight racers still creates many accessory geometries/materials (`src/game/EggMesh.tsx:71-117`, `:120-337`; bot count `src/game/EggRacer.tsx:848-895`). This is not necessarily a current bottleneck, but baseline draw-call/material counts should be captured before postprocessing.
- `Pad` creates Lambert materials in `useMemo` without explicit disposal (`src/game/Track.tsx:13-30`) while tracks remount by level/race (`src/game/Track.tsx:34-40`). Verify R3F disposal behavior or cache/dispose these materials explicitly.
- Procedural textures are intentionally cached module-wide (`src/game/look.ts:3-8`, `:32-140`), which avoids repeated canvas/GPU uploads.

## P1/P2 follow-ups

1. P1: Preserve the renderer across level changes; reset only `Track`/race state.
2. P1: Make lighting/exposure part of `LevelTheme` and calibrate all eight themes with both Lambert and Toon materials.
3. P1: Add a runtime performance budget/adaptive tier before enabling bloom or additional shadow work.
4. P1: Unify immutable renderer mode, DPR, AA, shadows, and postprocessing into one documented quality contract.
5. P2: Remove duplicate tone configuration, reconcile initial/rig FOV, fix HUD cadence, and add WebGL fallback/context-loss handling.
6. P2: Match DOM boot/background tokens to the active 3D theme.

## Files found

- `src/engine/pipeline.ts` — Fixed-step constants and render/physics boundary contract.
- `src/game/GameCanvas.tsx` — R3F Canvas, renderer, tone/color, lights, physics mount, HUD/ranking pumps.
- `src/game/CameraRig.tsx` — Camera smoothing/FOV/shake and directional shadow rig.
- `src/engine/device.ts` — Device profiling, DPR, and shadow-map quality mapping.
- `src/game/Track.tsx` — World meshes, procedural textures, sky/fog scene objects, and Rapier kinematics.
- `src/game/EggMesh.tsx` — Egg materials, geometry, procedural animation, and player glow.
- `src/game/EggRacer.tsx` — Fixed-step player simulation, visual-only racer updates, bot count, tone-mapped markers.
- `src/game/levels.ts` — Theme, fog, sky, level extent, and active-level state.
- `src/components/GameUI.tsx` / `src/game/store.ts` — Runtime graphics-quality selection and persistence.
- `src/components/GameApp.tsx` / `src/styles.css` — Canvas hosting, boot surface, and DOM color tokens.
- `package.json` / `package-lock.json` — Exact Three/R3F/Drei/Rapier dependency versions.

## External references

- React Three Fiber Canvas API and defaults: https://r3f.docs.pmnd.rs/api/canvas
- React Three Fiber scaling performance / resource reuse / monitoring: https://r3f.docs.pmnd.rs/advanced/scaling-performance
- MDN `HTMLCanvasElement.getContext()` — creation-time WebGL context attributes and same-context lifetime: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
- Three.js `WebGLRenderer.outputColorSpace`: https://threejs.org/docs/#api/en/renderers/WebGLRenderer.outputColorSpace

## Related specs

- `.trellis/spec/frontend/index.md` — frontend guideline index; current package-specific guideline files are placeholders.
- `.trellis/spec/guides/code-reuse-thinking-guide.md` and `.trellis/spec/guides/cross-layer-thinking-guide.md` — relevant to fixed-step/render boundaries and resource reuse, but they contain no rendering-specific contract.

## Caveats / Not Found

- This was a static source audit; no browser screenshot, GPU trace, frame-time capture, or visual regression test was run. The sky clipping finding is based on explicit geometry/frustum arithmetic and should still be confirmed visually at start/mid/finish.
- No product code, `docs/visual`, or spec file was modified.
- The task PRD seed is still entirely TBD (`prd.md`), so this audit follows the rendering-foundation scope stated in the dispatch prompt rather than an existing acceptance criterion.
- `@react-three/drei` is installed but unused at present; whether Phase 2 should use or remove it is a design decision, not established by current code.
