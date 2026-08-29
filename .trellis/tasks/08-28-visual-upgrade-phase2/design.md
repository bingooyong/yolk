# Design — Yolk Rush Phase 2 P0 Visual Foundation

## Decision

Keep React + Three.js + React Three Fiber + Rapier. Build a reusable presentation layer around the existing fixed-step gameplay pipeline, then prove it on Level 1. Do not replace the engine, import third-party reference assets, or redesign all eight courses in this increment.

## Architecture

### 1. Visual configuration boundary

Add a pure engine configuration module for quality and render constants. It owns:

- quality profile (`dpr`, context MSAA, shadow map size, shadow enablement);
- camera frustum and follow framing defaults;
- tone mapping, exposure, output color space, and light intensities;
- contact-shadow size/opacity/fade rules.

`GameCanvas`, the lighting system, and the camera consume this module. Device detection remains responsible only for selecting a quality tier. A Node test locks the low/medium/high tradeoff so future effects cannot silently regress low-end iPhones.

### 2. Scene composition

Replace renderer-local visual setup with small scene-system components:

- `LightingSystem` — player-tracking key/shadow light plus fill, rim, hemisphere, and a one-frame low-resolution procedural `Environment` map. No large HDR download.
- `SkyDome` — camera-following gradient shell whose radius stays inside the camera far plane, with early render order and no depth write.
- `Level1BenchmarkArt` — deterministic instanced foreground/midground/background props, route chevrons, edge markers, and an aligned finish gate. Collision definitions stay in `levels.ts`.
- `ContactShadow` — a cheap shared radial-texture quad anchored at the last grounded foot position. It fades/shrinks with height instead of using per-frame Drei contact render targets.

The gameplay `Scene` remains responsible for physics-mounted gameplay entities only.

### 3. Character presentation contract

Keep the capsule/controller unchanged. Establish a documented visual contact offset so the egg reads as standing on the platform while the Rapier controller keeps its intentional 0.08 environment gap.

Convert the egg from mostly MeshToon/Lambert to Standard/Physical materials with distinct roughness/metalness for shell, clothing-like lower band, belly, eyes, blush, and accessories. Add catchlights and stronger secondary forms. Preserve all skin IDs and gameplay dimensions.

Pass compact presentation state from `EggRacer` to `EggMesh`: movement state, grounded flag, horizontal speed, and vertical velocity. Animate only transform/scale/material-emissive values in `useFrame`; no gameplay calculations and no skeletal asset loading.

### 4. Fixed-step and quality correctness

- Replace render-rate kinematic course updates with `useBeforePhysicsStep` and `PHYSICS_DT`; Rapier interpolation remains the render boundary.
- Make immutable context-MSAA changes honest by recreating the canvas only when quality changes. This is acceptable because graphics settings are exposed in the title settings panel, not during a race.
- Keep quality effects additive: low quality retains calibrated color/light/contact composition but avoids expensive shadows/environment resolution; medium is default; high adds larger shadows and environment detail.
- No postprocessing dependency is added in P0. Bloom/AO/DoF wait until benchmark performance counters exist.

### 5. Runtime reliability

Persisted Zustand state currently causes SSR hydration mismatch after reload. Apply deterministic defaults during SSR/first render and reconcile saved localStorage state after mount. This is a prerequisite for reproducible visual screenshots and browser smoke tests.

### 6. Documentation and benchmark

Create `docs/visual/` documentation that records the audit, pipeline, style, lighting, materials, camera, environment, VFX, and performance budget. Use deterministic Level 1 screenshots as evidence rather than subjective-only review.

## Key tradeoffs

- **Cheap blob contact shadow vs Drei ContactShadows:** blob shadows are less physically accurate but stable on iPhone and scale to all racers without an extra depth render pass.
- **Canvas rebuild on quality change vs immutable MSAA mismatch:** rebuilding is a brief title-screen transition and is safer than pretending the context attribute can change at runtime.
- **No P0 postprocessing vs instant screenshot gloss:** PBR, lighting, grounding, composition, and animation must establish a stable base first. Effects that mask a broken base are explicitly deferred.
- **Level 1 benchmark vs all-level restyle:** one calibrated course prevents inconsistent visual language and limits performance/art risk.

## Compatibility and rollback

- Gameplay collision and controller constants remain unchanged unless a focused fix has a deterministic test/smoke check.
- Existing routes, persistence keys, skin IDs, level unlocks, audio APIs, and input semantics remain stable.
- Rollback is grouped by module: render config/canvas, lighting/sky, character/contact, Level 1 art, and QA tooling. Each group can be reverted independently.
