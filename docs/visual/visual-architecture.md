# Visual Architecture

Yolk Rush uses one presentation boundary around the unchanged fixed-step Rapier simulation. The architecture favors original procedural art, shared Three.js resources, readable mobile framing, and quality-aware costs over downloaded assets and full-screen effects.

## Ownership map

| Layer                  | Owner                                                     | Contract                                                                                            |
| ---------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Pure visual data       | `src/engine/visualProfile.ts`                             | Renderer, camera, sky, lighting, and quality values are testable data without WebGL.                |
| Device capability      | `src/engine/device.ts`                                    | Selects portrait/touch/quality and reacts to pointer or viewport changes.                           |
| Render container       | `src/game/GameCanvas.tsx`                                 | Creates the R3F canvas, applies the profile, and mounts the visual/game systems.                    |
| Fixed simulation       | `src/engine/pipeline.ts`, `EggRacer`, `Track` kinematics  | Gameplay runs at 60 Hz; presentation may only interpolate or animate in `useFrame`.                 |
| Lighting/environment   | `src/game/LightingSystem.tsx`, `src/game/look.ts`         | Player-following key/fill/rim rig plus a procedural environment and camera-following sky.           |
| Character presentation | `character-presentation.ts`, `EggRacer`, `EggMesh`        | Controller state is converted to contact, silhouette, and accessory motion without changing bounds. |
| Course presentation    | `src/game/Track.tsx`                                      | Physics colliders stay attached to gameplay definitions; decoration is non-colliding.               |
| Runtime QA             | `GameApp`, `PerformanceDebug`, `scripts/visual-smoke.mjs` | Deterministic persisted hydration, gated instrumentation, and title-to-race browser evidence.       |

## Rendering principles

1. The renderer has one ACES/exposure/sRGB contract, consumed from `VISUAL_FOUNDATION`.
2. Low quality must retain composition while disabling shadow maps, MSAA, and high-resolution environment work.
3. Immutable WebGL context settings are changed by canvas remount, not by pretending they are mutable.
4. The sky shell follows the camera and remains inside the camera far plane.
5. No presentation calculation may replace a gameplay simulation step.
6. New art must use shared geometry/material/texture resources and deterministic placement before adding draw calls.
7. Post-processing is not part of the P0 foundation. Bloom, ambient occlusion, depth of field, weather, automatic LOD, and gacha cinematic render passes are explicitly deferred until measured budgets justify them.

## Current integration boundary

The implemented P0 boundary covers the profile-driven renderer/lighting pipeline, calibrated character presentation, deterministic Level 1 benchmark layers, aligned finish gate, persisted-state reconciliation, and gated performance instrumentation. Treat Level 1 as the reference implementation for future courses. Completion claims still require focused visual tests, typecheck/lint/build, deterministic title/race screenshots, and eventually physical iPhone/iPad measurements.
