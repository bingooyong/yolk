# Implementation Plan — P0 Rendering Pipeline and Level 1 Benchmark

## Preconditions

- [x] Task PRD captures scope, constraints, and acceptance criteria.
- [x] Three research audits exist under `research/`.
- [x] Baseline screenshots captured for title and gameplay.
- [x] Baseline `npm run typecheck` passes.
- [x] Baseline `npm test` and `npm run lint` failures are documented as pre-existing/unrelated where not fixed by this task.

## Stage 0 — Audit deliverable

- [x] Create `docs/visual/visual-architecture-audit.md` from the three research reports.
- [x] Include the ten highest-impact issues, impact, approach, effort, performance cost, and priority.
- [x] Explain why the current build reads as a demo and why the reference principles read stronger without copying assets.

## Stage 1 — Reliable render foundation

- [x] Add a pure visual/render profile module with Node tests.
- [x] Refactor `GameCanvas` to consume it, remove duplicate tone setup, and use `PHYSICS_DT`.
- [x] Fix immutable quality/MSAA handling.
- [x] Move player-follow key/fill/rim lighting and procedural environment into one `LightingSystem`.
- [x] Convert the sky dome to a camera-following shell inside the far plane.

Validation:

- [x] Visual profile test passes.
- [x] `npm run typecheck`.
- [x] Title/gameplay screenshots contain the gradient sky rather than flat fallback at start and far-course positions.

## Stage 2 — Character contact and material identity

- [x] Document and apply the calibrated egg visual ground offset.
- [x] Gate idle bob so it cannot pierce or float from the contact surface.
- [x] Add height-aware anchored contact shadows for all racers.
- [x] Pass movement/ground/velocity state into `EggMesh`.
- [x] Add readable state animation: idle breath, run bounce/lean, air stretch, landing squash, boost/pounce/roll silhouettes.
- [x] Upgrade character materials with distinct PBR values, catchlights, and accessory response while preserving IDs and gameplay bounds.

Validation:

- [x] Title and race screenshots show grounded player/bots.
- [x] Spot-check jump and landing: shadow stays anchored, fades with height, and recovers on landing.
- [x] Character remains readable at 390px-wide gameplay viewport.

## Stage 3 — Level 1 golden benchmark

- [x] Add deterministic foreground grass/flowers/rocks, midground candy props, background hills/cloud bands, and route chevrons using shared geometry/materials and instancing.
- [x] Upgrade Level 1 platform/edge materials and route semantics without changing colliders.
- [x] Align the finish visual with the gameplay trigger.
- [x] Strengthen the finish gate with readable pillars, banner, flags, and restrained glow.
- [x] Upgrade pickups/rings with material distinction and visible collection/emissive states where existing state permits.

Validation:

- [x] Start, route, ability, final approach, and finish screenshots cover foreground/midground/background.
- [x] Low quality preserves composition with shadows/detail disabled.
- [x] No obvious sky clipping or empty horizon.

## Stage 4 — Runtime QA and documentation

- [x] Fix persisted-state hydration mismatch so reload visual checks are stable.
- [x] Add a package-owned deterministic visual smoke script or extend the existing smoke script with guarded artifact paths and a title → race flow.
- [x] Add debug-only renderer/FPS/frame-time evidence behind a URL flag; keep it off normal gameplay.
- [x] Create the required concise docs under `docs/visual/`: rendering pipeline, lighting, materials, camera, environment, VFX, performance, and style guide.
- [x] Run targeted tests, typecheck, lint, production build, and browser smoke.
- [x] Record exact evidence and any pre-existing full-suite failures in the task check notes.

## Stage 5 — Review gates

- [x] Verify no third-party assets or copied UI were introduced.
- [x] Verify gameplay controls and collision behavior remain playable.
- [x] Attempted the required Trellis check dispatch; both implement/check sub-agents hit the platform usage limit, so the main session performed the final check under `trellis-check`.
- [x] Address findings, rerun the smallest relevant checks, then run the full practical gate.

## Rollback points

- Stage 1 can be reverted without touching character/course art.
- Stage 2 can be reverted while retaining renderer/lighting fixes.
- Stage 3 is presentation-only and should not alter level collision data.
- Stage 4 QA tooling is independently removable from visual behavior.
