# Visual Architecture Audit — Yolk Rush Phase 2

- Audit date: 2026-08-28
- Sources: rendering, character/course, and UI/performance research reports in `.trellis/tasks/08-28-visual-upgrade-phase2/research/`
- Baseline stack: React 19, Three.js 0.185, R3F 9.7, Drei 10.7 (installed but unused by product code), Rapier 2.2, Vite, TypeScript, Tailwind CSS 4, and Zustand
- Asset policy: reference images were used only to identify visual principles. No reference character, UI, model, texture, logo, font, or other protected asset may be copied into this project.

## Executive diagnosis

The game is playable and lightweight, but it reads as a prototype because its rendering foundation, contact frame, and presentation vocabulary are not yet a system:

1. The renderer configuration is split between `GameCanvas`, camera/light code, and device helpers; two paths set tone mapping, and quality settings imply mutable WebGL MSAA even though MSAA is immutable.
2. A world-centered sky sphere is clipped by the camera far plane, so the flat scene background often replaces the intended gradient sky.
3. A single directional light does most of the visual work. There is no reusable key/fill/rim contract or procedural environment map.
4. Moving platforms and hazards mutate Rapier transforms at render rate while racers simulate at fixed 60 Hz.
5. The egg's visual height and idle bob are not calibrated to the controller contact frame, so grounded characters can sink or float.
6. Movement states exist in simulation but barely affect character silhouette.
7. Courses are mostly colored boxes. Surface semantics, route direction, foreground/midground/background layers, and the finish beat are underdeveloped.
8. UI flow is coherent, but language is mixed Chinese/English, a large legacy presentation branch remains, persisted state can hydrate incorrectly, and smoke tests do not reach a race.
9. There is no performance instrumentation or captured renderer budget before adding effects.
10. Materials mix Lambert, Toon, and Basic without a consistent color-management and accent policy.

## Current implementation

| Area                          | Baseline evidence                                                                                                                                                                          | Consequence                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Fixed-step pipeline           | `src/engine/pipeline.ts` defines 60 Hz physics and a render interpolation boundary; `EggRacer` uses the fixed-step hook.                                                                   | The core gameplay contract is sound and should be preserved.                                                         |
| Renderer                      | `src/game/GameCanvas.tsx` configured DPR, shadows, opaque WebGL context, ACES, exposure, and sRGB output; tone setup also existed in a separate `Tone` component.                          | Correct values were duplicated rather than represented as one data contract.                                         |
| Quality tiers                 | `src/engine/device.ts` selected low/medium/high and separately mapped DPR/shadow sizes.                                                                                                    | Quality behavior was difficult to test and MSAA remount semantics were implicit.                                     |
| Camera and light              | `src/game/CameraRig.tsx` handled damping, look, FOV, shake, and one following shadow-casting directional light.                                                                            | Player framing is functional, but directional key light was the only meaningful shape model.                         |
| Sky and fog                   | `Track.tsx` mounted a radius-160 world-centered dome against a camera far plane of 160.                                                                                                    | The dome was clipped; long courses often showed the flat background color.                                           |
| Course kinematics             | Movers, hammers, spinners, pendulums, and dropping traps advanced in `useFrame`; mover velocity divided deltas by a literal `1 / 60`.                                                      | Collision motion changed with display refresh rate and contradicted the fixed-step pipeline.                         |
| Character contact             | `EggRacer` uses a Rapier controller offset and grounded snapping; `EggMesh` has a larger visual half-height plus idle bob.                                                                 | Correct physical grounding could still look pierced or floating.                                                     |
| Character animation/materials | One generic bob/arm motion dominated; Toon, Lambert, and Basic materials were mixed; the toon ramp was created as sRGB rather than non-color data.                                         | Characters lacked state identity and predictable response to light.                                                  |
| Course presentation           | Platforms use Lambert boxes; rails, decor, rings, pickups, and finish props are lightweight but semantically thin. The Level 1 gameplay finish plane and visual arch are two meters apart. | The route reads as a test course rather than a themed place.                                                         |
| UI and flow                   | Live flow is title → level sheet → countdown/race → results, with separate gacha ceremony. Copy and aria labels mix Chinese and English; dead legacy components remain.                    | The experience is usable but not linguistically or visually unified.                                                 |
| Performance                   | Static quality tiers only. Local Chromium measured a race sample near 120 FPS, 8.32 ms average frame, 10.6 ms p95, and about 82 MB JS heap; title first paint was about 3.23 s.            | These are useful local indicators, not iPhone/iPad hardware evidence; no adaptive budget or runtime evidence exists. |
| QA                            | Browser smoke is title-only and hard-coded to an unavailable artifact path; persisted coins can trigger SSR hydration mismatch on reload.                                                  | Visual regression and reload checks are not stable.                                                                  |

## Stage 1 baseline response

The first implementation increment addresses the renderer portion without changing gameplay collision or controller semantics:

- `src/engine/visualProfile.ts` becomes the pure data contract for DPR, immutable context MSAA, shadows, environment resolution, camera frustum, tone, exposure, and lighting.
- `GameCanvas` consumes that profile, uses `PHYSICS_DT`, keeps one tone setup, and remounts the canvas only when the immutable MSAA mode changes.
- `LightingSystem` owns player-follow key/fill/rim lights, hemisphere light, and a tiny procedural cube environment generated from the existing gradient texture.
- The sky is now a camera-following shell with an early render order, no depth write, and a radius safely inside the camera far plane.
- Moving pads, hammers, spinners, pendulums, and dropping traps use the fixed physics-step clock while Rapier interpolation remains the render boundary.

Character, Level 1 art, UI, persisted-state hydration, and QA tooling are intentionally deferred to later stages.

## Top 10 prioritized issues

| #   | Priority | Issue                                                                                          | Impact                                                                               | Approach                                                                                                                                  | Effort       | Performance cost                                                             |
| --- | -------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------- |
| 1   | P0       | Sky dome clipped by camera far plane and course travel.                                        | Empty/flat horizon undermines every screenshot and world layer.                      | Camera-following sky shell inside the far plane, early render order, no depth write; verify start/mid/finish.                             | Small        | Negligible: one existing sphere transform per frame.                         |
| 2   | P0       | Renderer/tone/quality values scattered and MSAA treated as mutable.                            | Accidental tone drift, dishonest quality switching, and untested mobile budgets.     | Pure profile module + Node tests; canvas remount only when immutable MSAA mode changes.                                                   | Small        | None after profile lookup; canvas rebuild only on AA-mode transition.        |
| 3   | P0       | Collision-affecting course transforms advanced at render rate.                                 | Moving-platform velocity and hazard timing vary between 30/60/120 Hz.                | Advance local course clocks in `useBeforePhysicsStep` with `PHYSICS_DT`; preserve Rapier interpolation.                                   | Small        | CPU-neutral; the same per-step work moves to the correct clock.              |
| 4   | P0       | Egg visual contact frame and idle bob are uncalibrated.                                        | Characters sink into or float above platforms, making grounding unreadable.          | Keep controller/collider unchanged; calibrate visual root/scale and gate bob by airborne/result state; anchor cheap contact shadow.       | Medium       | One shared quad/radial texture per racer; no contact render target.          |
| 5   | P0       | Simulation movement states barely affect character silhouette.                                 | Idle, run, jump, landing, pounce, roll, and boost look interchangeable.              | Pass compact presentation state to `EggMesh`; animate transform/scale/emissive only in render.                                            | Medium       | Transform/material updates only; no skeletal or asset loading.               |
| 6   | P0       | Level 1 lacks depth layers, readable surface semantics, and an aligned finish moment.          | Course reads as primitive boxes and the finish trigger feels abrupt.                 | Deterministic instanced foreground/midground/background props, route chevrons, semantic materials, and gate aligned to trigger.           | Large        | Use shared geometry/materials and instancing; disable shadows on far layers. |
| 7   | P0/P1    | Lighting hierarchy and material color management are incomplete.                               | Characters and surfaces flatten; toon ramp and unlit accents respond inconsistently. | Keep reusable key/fill/rim/hemisphere contract; calibrate theme variants; set toon ramp to non-color data and decide accent tone mapping. | Medium       | Three directional/hemisphere lights are cheap; only the key casts shadows.   |
| 8   | P0       | QA evidence is unstable: persisted hydration mismatch plus title-only smoke and guarded paths. | Reload can fail before visual capture; current checks cannot prove race states.      | Reconcile persistence after mount; add package-owned title → race deterministic smoke with guarded artifacts.                             | Medium       | Test-only when invoked; no normal gameplay overhead.                         |
| 9   | P1       | No runtime performance budget or device-class evidence.                                        | Effects/art could regress iPhone/iPad before regression is detected.                 | Add debug-only renderer/frame-time counters and record draw calls, triangles, memory, DPR, and p95 by quality on target devices.          | Medium       | Overlay/sampler gated by URL; keep normal mode off.                          |
| 10  | P1/P2    | UI language, dead presentation code, and touch ergonomics are inconsistent.                    | The surrounding product feels less finished than the 3D improvements.                | Chinese-first copy/aria rules, delete dead branches, sticky sheet actions, direct-DOM per-move visuals, and real iOS geometry checks.     | Medium-Large | Primarily code/DOM cleanup; avoid enlarging React-updated pointer subtrees.  |

## Why the reference principles read stronger

The supplied references are not assets to reproduce. Their useful principles are:

- **Believable contact:** bodies, shadows, dust, and surfaces agree on the same foot position.
- **Readable silhouette:** shape, squash/stretch, and facing communicate state before texture detail.
- **Light hierarchy:** one clear key direction, soft fill, rim separation, and restrained ambient/environment energy.
- **Depth composition:** foreground props, route surface, themed midground, and distant bands create parallax without hiding hazards.
- **Semantic color and motion:** ice, bounce, conveyor, checkpoints, boosts, hazards, and finish have distinct identities.
- **Finish beat:** crossing the gameplay trigger continues briefly into pose/flags/confetti before UI replaces the scene.
- **Mobile restraint:** hero readability comes from composition and values, not full-screen passes or oversized assets.
- **Unified product voice:** UI, HUD, results, and gacha use one language and visual vocabulary.

Yolk Rush should translate those principles into original toy-like egg racing, procedural candy/meadow environments, and mobile-safe rendering. Copying a reference character, screen layout, icon, model, texture, palette token-for-token, or UI text would violate the task policy and make the system less reusable.

## Validation and baseline gates

The audit research recorded:

- `npm run typecheck`: passed.
- `npm run lint`: failed on one unrelated empty-block error and existing warnings in `GameUI`, `EggRacer`, `levels`, and auth code.
- `npm test`: 179/195 passed; 16 failures clustered in brand/PWA/environment expectations and a missing `.grok/skills/og/references` directory.
- Local Chromium title: DOMContentLoaded/first paint around 3.23 s, about 65 MB JS heap.
- Local Chromium race sample: about 120 FPS, 8.32 ms average, 10.6 ms p95, about 82 MB JS heap, DPR capped at 1.5.
- No reliable production/native or physical-device numbers were captured.

Phase 2 must therefore keep the new profile test and typecheck targeted, document unrelated red gates rather than hiding them, and add deterministic browser/device evidence before accepting later art/effects.
