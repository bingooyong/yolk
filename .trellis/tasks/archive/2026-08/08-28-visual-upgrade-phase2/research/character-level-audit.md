# Research: Character, Course, Gameplay Presentation, and Level 1 Benchmark

- Query: Audit the existing character/course/gameplay presentation in the named game files and Rapier integration; produce exact evidence and prioritized P0/P1/P2 recommendations, including a Level 1 golden benchmark plan.
- Scope: internal, with official Three.js / Rapier / React Three Rapier reference checks
- Date: 2026-08-28

## Findings

### Scope and context

The active PRD calls for a P0 rendering foundation, character/material identity, grounding, a Level 1 golden benchmark, and preservation of the current Three/R3F/Rapier gameplay stack (`prd.md:3-14`, `29-64`, `73-83`). This audit intentionally narrows that broader request to the requested character/course/gameplay surface. It does not repeat the renderer/lighting/UI audit and does not treat every level as the first deliverable.

The frontend specs are currently placeholders (`spec/frontend/index.md:15-22`), so the strongest project-local contracts are the PRD and the fixed-step intention in `src/engine/pipeline.ts:1-7`: input, AI, jump/dash, kinematic character controller, hazards, bumps, checkpoints, and sim writing belong in the fixed pipeline; render interpolation is separate and gameplay should not live in `useFrame`.

### Files found

- `src/game/EggMesh.tsx` — character geometry, toon/basic materials, faces, accessories, and skin geometry.
- `src/game/EggRacer.tsx` — kinematic racer, Rapier character controller, movement/game-feel state, pickups, finish, and racer presentation.
- `src/game/Track.tsx` — colliders and presentation for platforms, movers, hazards, pickups, rings, finish, rails, sky, decor, and cloud floor.
- `src/game/config.ts` — movement, jump, dash, collider, camera, palette, and accessory constants.
- `src/game/course.ts` — level-module re-export facade.
- `src/game/levels.ts` — level schemas, course compiler, all level layouts, active level state, and mover velocities.
- `src/game/skins.ts` — skin taxonomy, rarity data, gacha, rewards, and lookup.
- `src/game/sim.ts` — racer/HUD/move-state simulation snapshot and global race state.
- `src/game/abilities.ts` — pounce/roll/boost/grab timing, speed, cooldown, and HUD state.
- `src/game/look.ts` — shared canvas textures, including the toon ramp and environment textures.
- `src/game/GameCanvas.tsx` and `src/engine/pipeline.ts` — Rapier `<Physics>` timing/interpolation and fixed-step contract.

### Executive diagnosis

The current character and course are readable and lightweight, but the presentation still reads as a gameplay prototype because:

1. The visual egg does not share a calibrated contact frame with the capsule/controller.
2. Character animation is mostly one universal bob/arm sway; the already-computed `MoveState` is not consumed by the visual character.
3. Toon, Lambert, and Basic materials are mixed, and the toon ramp violates Three.js's documented non-color texture requirement.
4. Course materials are mostly colored boxes; ice, bounce, conveyor, checkpoint, and finish surfaces do not have distinct readable identities.
5. Environment depth is one fixed sky dome, two long rails, five trees, and one cloud plane rather than a layered route world.
6. Important kinematic course objects are updated in render-rate `useFrame`, contradicting the project's fixed-step contract and making moving-contact feel frame-rate dependent.
7. The Level 1 gameplay finish plane and visual finish arch are two meters apart, and crossing the plane immediately cuts to results without a finish pose or celebration beat.

### Exact evidence and recommendations

#### P0 — Golden-benchmark blockers

| # | Evidence | Impact | Recommendation | Perf / effort |
|---|---|---|---|---|
| P0-1 | `EggRacer.tsx:139-147` creates a Rapier controller with `0.08` offset and ground snapping. `config.ts:44-45` defines radius `0.5` / half-height `0.1`, and `EggRacer.tsx:686-695` mounts that capsule. The capsule is therefore 1.2 tall with its bottom 0.6 below center; the controller offset implies a settled visual ground center around `0.68`. The egg visual half-height is `0.52 * 1.26 * 1.085 = 0.711` from `EggMesh.tsx:16-17,63-70`. `EggMesh.tsx:38-45` additionally bobs Y by ±0.03. | On flat ground the main egg can sink about 0.031, and the bob worsens penetration/liftoff to roughly 0.061. This directly causes the floating/piercing contact called out by PRD R3 and undermines every golden screenshot. | Choose one calibrated contact contract. Recommended first pass: keep the gameplay capsule unchanged, scale the visual egg to a 1.2 read height or move its visual root up by the calculated offset, and gate the idle bob by airborne/result state. Add a soft contact shadow/dust anchor at the collider foot, not under the visual bottom. | Very small geometry transform change; contact FX should use one cheap blob/quad, not full-screen post-processing. |
| P0-2 | `sim.ts:22-31` defines nine movement states and `EggRacer.tsx:528-547` computes idle/run/jump/air/fall/land/pounce/roll/boost, but `EggMesh` never receives `moveState`. The only character animation is universal body bob and arm sway (`EggMesh.tsx:38-45`), plus skin wing flaps (`EggMesh.tsx:292-323`). `JUMP_FEEL.stretch` is defined (`config.ts:31-35`) but unused. | Motion state is invisible to the character: running, falling, landing, boost, and roll all retain essentially the same silhouette. The game-feel constants drive camera/audio/HUD but not a readable performance. | Pass a compact visual-state prop into `EggMesh`: grounded velocity, vertical velocity, move state, and ability state. Add a compact three-phase run cycle, falling/landing shapes, directional lean, and reuse the existing squash envelope. Use `JUMP_FEEL.stretch` or remove it so config remains truthful. | Cheap transforms only. Avoid skeletal animation/loaded assets in this increment. |
| P0-3 | `look.ts:10-29` forces every canvas texture to `SRGBColorSpace`; `toonRamp()` returns that texture (`look.ts:32-48`). `EggMesh.tsx:68-96` and most attachments use it as `gradientMap`. Three.js explicitly requires `gradientMap` to be non-color data (`NoColorSpace`) with nearest filtering. | Incorrect color-space conversion changes the intended toon thresholds, so character shading cannot be tuned reliably across colors, skins, and quality levels. | Let `toonRamp` build a non-color texture with nearest filtering. Color imagery (sky/crate/stripes) should remain SRGB. Add a small unit check or runtime assertion for texture role/color space. | Negligible runtime cost; very low effort. |
| P0-4 | `GameCanvas.tsx:83` sets camera `far: 160`; `Track.tsx:144-151` renders a world-fixed sky sphere of radius 160, with fog disabled on it. `Track.tsx:128-140` also fixes rails to a 130-unit span centered at Z -40, although `levels.ts:727-738` includes courses through Z -110. | Once the camera moves away from the origin, parts of the dome exceed the far plane and expose the flat clear color. The sky is also one fixed gradient (`look.ts:128-140`) despite per-level theme skies (`levels.ts:37-49`), while rails disappear before the finale. This creates accidental background holes and undermines environment layering. | For the benchmark, parent a simplified sky/backdrop to the camera or use a scene background texture and make camera far comfortably larger than dome radius + maximum course extent. Make sky gradients theme-driven. Resize rails/decor per level from `startZ..finishZ`. | Larger far plane alone costs nothing meaningful if geometry is culled correctly; a camera-follow dome or background texture is cheaper than an oversized high-poly world. |
| P0-5 | `pipeline.ts:1-7` says gameplay runs at fixed 1/60 and gameplay must not be in `useFrame`. `GameCanvas.tsx:50-57` correctly configures fixed-step, interpolated Rapier. However, gameplay-moving surfaces/obstacles use render callbacks: drop tiles (`Track.tsx:93-106`), movers (`Track.tsx:157-170`), hammers (`Track.tsx:192-196`), spinners (`Track.tsx:232-236`), and pendulums (`Track.tsx:263-268`). `MovingPad` computes velocity with a hard-coded `1 / 60` denominator regardless of render delta (`Track.tsx:157-168`). | Moving-platform carrying, hazard timing, and trap drops can differ by display refresh rate. The post-collision conveyor translation (`EggRacer.tsx:415-445,508-526`) receives a velocity that was not measured over the actual physics step, so contact can feel laggy, clipping, or jittery. This contradicts PRD's requirement to preserve fixed-step gameplay. | Move all collision-affecting kinematic transforms and their velocity calculation into `useBeforePhysicsStep` with `PHYSICS_DT` and a dedicated accumulated simulation clock. Keep purely cosmetic rotation/bob in `useFrame`. For movers, update position and derivative in the same fixed callback. | Consolidating transforms is low/medium effort and reduces per-frame redundant physics writes. Start with movers because they affect carrying; Level 1 has no movers/traps. |
| P0-6 | `EggRacer.tsx:591-599` finishes when `nz <= level.finishZ`. Level 1's final platform is centered at Z -76 (`levels.ts:151-165`), but `Track.tsx:343-358` draws the arch at `z - 2` (Z -78). `store.ts:445-488` immediately changes phase to results. | The race ends two meters before the visual gate, and the memorable finish required by PRD R5 is replaced by an instantaneous UI cut. The trigger is also at the platform center, 5.92 m behind its leading edge, so it is not visually self-explanatory. | Keep the gameplay trigger plane unchanged if needed, but place the visual gate/finish line exactly on that plane (or move both together after gameplay validation). Add a short fixed-duration finish overlap: crossed-line pose, confetti/light burst, camera hold, then results. Keep input locked from the existing finish branch. | One arch transform plus a small state timer/effects; avoid confetti in physics and avoid full-screen post-processing. |
| P0-7 | Level 1 is data-only: platform colors are flat Lambert boxes through `Pad` (`Track.tsx:13-31,42-56`), rails are two fixed boxes (`Track.tsx:125-141`), and depth consists of five alternating trees plus a single transparent plane (`Track.tsx:362-411`). `theme.ground` is declared (`levels.ts:48`) but unused. | The route lacks foreground/midground/background hierarchy, readable edge language, and directional cues. This is exactly the “primitive-box scene” regression called out by the PRD. | Build a Level-1-only presentation layer from non-colliding geometry: near-edge candy trim, midground rolling hills/islands, far silhouette bands, and a themed horizon. Reserve high-detail objects near camera; use merged/instanced low-poly shapes for repeated props. | Low/medium effort. Keep all added course enrichment outside Rapier bodies. Use instancing/merging and quality-aware shadow participation rather than individual heavy meshes. |

#### P1 — Strong upgrades after the P0 baseline

| # | Evidence | Impact | Recommendation |
|---|---|---|---|
| P1-1 | Course surfaces map to the same generic `Pad` material (`Track.tsx:42-56`). Ice changes only friction, bounce changes impulse, and conveyor is hard-coded to Z -3.2 in `EggRacer.tsx:368-369,423-438`; the declared `Platform.conveyor` vector (`levels.ts:3-10`) is unused. | Players must memorize behavior because material language does not signal slip, bounce, belt direction, checkpoint, or finish. The data model also prevents level-specific belt direction. | Create shared surface material/geometry profiles: icy sheen, jelly squash/bounce, animated directional belt, checkpoint trim, finish checker. Consume the declared conveyor vector and add a small shader/texture offset animation. Keep colliders unchanged. |
| P1-2 | Fixed platform colliders extend 0.08 beyond visual depth: `Track.tsx:53` uses `size[2] / 2 + 0.08`, while the visual box uses exact size (`Track.tsx:27-30`). | This may bridge tiny seams, but it is an invisible gameplay advantage/disadvantage and can make edges feel untrustworthy. | Make the collision extension explicit in level data (or remove it) and show seam bridging as a visible lip/edge cap. At minimum, document why 0.08 exists and ensure Level 1 edge trim aligns with actual collision. |
| P1-3 | All pickup kinds other than coin render as the same textured cube: `Track.tsx:290-327`. Rings are always visible even after collection (`Track.tsx:330-340`), while racer collection only sets local ring memory (`EggRacer.tsx:563-573`). Shield and jelly share the global `sim.taken` set (`EggRacer.tsx:575-588`), so bots can consume player pickups. | Props do not communicate their gameplay effect, and fairness/feedback is weak: a bot can remove a coin/shield/jelly before the player sees it. | Give coin/shield/jelly distinct silhouettes and colors; add collect pops and per-kind player feedback. Decide whether pickups are player-only or per-racer, and model ownership explicitly. Make boost rings collapse/flash on use. |
| P1-4 | Ring pickup is a sphere test: any point within 1.35 of the torus center triggers (`EggRacer.tsx:563-572`), while the visible torus radius is 0.85 (`Track.tsx:330-339`). | Players can collect a ring while visibly missing the opening. This weakens course-language trust and aerial-route satisfaction. | Either use an oriented tube/annulus test or shrink the forgiving sphere to match visual tolerance. Keep a small forgiveness margin and show it with an inner soft gauge/glow. |
| P1-5 | Character/course shaders are split: egg/toon accessories (`EggMesh.tsx:68-96`), Lambert course (`Track.tsx:20-29`), and Basic faces/neon (`EggMesh.tsx:120-158`, `Track.tsx:134-137`). ACES tone mapping is global (`GameCanvas.tsx:40-47,91-95`). | Basic neon is tone-mapped unless explicitly disabled, and Lambert/toon respond differently to the same light. The result can look disconnected rather than intentionally stylized. | Define a small material system: one character toon profile, one course toy-plastic/toon profile, and one unlit accent profile with explicit `toneMapped` choices. Do not migrate every shader at once; lock Level 1 screenshots first. |
| P1-6 | The character uses manual horizontal bank from raw input (`EggRacer.tsx:549-561`) rather than actual velocity/surface. Ice reduces velocity responsiveness (`EggRacer.tsx:368-374`) but visual bank does not reflect drift. | Motion feels detached on ice and during recovery/wall knocks. | Drive lean/bank from actual `vx/vz`, yaw error, surface, and ability state. Keep values subtle on mobile. |
| P1-7 | Racer-to-racer bumping is manual and horizontal only after character-controller collision (`EggRacer.tsx:513-524`). It ignores height and can double-handle the same racer collider contact. | Crowded starts can look like intersecting or sliding eggs rather than toy collisions. | For visual-only Phase 2, add a short squash/tilt/particle response when bump is applied. Longer term, centralize bump resolution or use actual contact normals and vertical separation. |
| P1-8 | `levels.ts:86-121` compiles AI waypoints only from platforms with `abs(x) < 4.2`; Level 1's `pounceA`/`pounceB` are at x 5.6 (`levels.ts:154-165`), and pirate's `safe` platform at x 4.2 is excluded by strict `<`. Mover waypoints use average x and `from` y only (`levels.ts:96-101`). | Side routes and vertical movers do not inform bot movement consistently. This is outside the Level 1 benchmark but affects course/gameplay presentation in later levels. | Preserve the intentional main-route shortcut exclusion if desired, but make the cutoff data explicit. Use actual mover center/top and movement span, or omit moving platforms from naive waypoint compilation. |
| P1-9 | `Track.tsx:405-411` places the only lower-depth plane exactly at `KILL_Y = -12` (`config.ts:41`). It is one transparent Lambert plane, not a visible cloud layer. | Fall recovery happens at the same moment as the visual floor, so depth and danger timing read weakly. | Use two or three non-colliding parallax cloud bands above/below the kill plane. Keep reset logic unchanged. |
| P1-10 | Level 1 has no checkpoint visuals: `checkpoint` is only data (`levels.ts:154-165`) and the renderer maps every unknown/semantic surface to the same box (`Track.tsx:42-56`). | Players cannot see respawn milestones or progress rhythm. | Add non-colliding checkpoint flags/arches at the checkpoint Z values in `levels.ts:184-188`, with activated state after passing. |

#### P2 — Cleanup and longer-term polish

| # | Evidence | Impact | Recommendation |
|---|---|---|---|
| P2-1 | `config.ts:42-43` still declares `FINISH_Z = -186` and `START_Z = 6`, while every real level owns finish/start (`levels.ts:51-70`). Duplicated legacy dash values also coexist with the `DASH` object (`config.ts:13-29`). | Stale constants invite future course regressions and make audit/config work harder. | Remove or clearly namespace legacy constants after level-driven behavior is locked. |
| P2-2 | `EggRacer.tsx:900-911` duplicates the color map already represented by `EGG_COLORS` and `playerColorHex` (`config.ts:60-68`, `sim.ts:159-160`). | Two sources of truth can drift. | Reuse one palette helper. |
| P2-3 | Accessory/skin stacking is inconsistent: `EggMesh.tsx:28-31` chooses `skin.hat` or the fallback accessory, then only crown/halo suppress sprout and only wings suppress bow (`EggMesh.tsx:102-114`). | Some skins combine attachments while others replace them, making gacha identity hard to reason about. | Define explicit skin slot rules (replace / stack / hide accessory) in the skin schema. Preserve existing IDs and current default appearances while doing cleanup. |
| P2-4 | Bot names are duplicated in `BOT_NAMES` (`config.ts:71`) and the literal in `RacerField` (`EggRacer.tsx:881-894`). | Field composition can drift from config. | Reuse `BOT_NAMES` and derive bot visual data from one configuration point. |
| P2-5 | `SkyDome`, rails, decor, and floor are separate static meshes (`Track.tsx:125-151,385-411`). | Repeated props and large materials can become draw-call overhead on iPhone/iPad once enrichment lands. | Benchmark draw calls before adding detail; merge/instance repeated background props, disable shadow casting on far layers, and use quality-aware material features. |
| P2-6 | Egg skin color only changes attachment geometry; the body remains the racer color (`EggMesh.tsx:63-100`, `skins.ts:14-27`). | Rarity does not currently imply a stronger body identity. This may be intentional, but the gacha payoff is limited. | Add subtle body trim/material variation per rarity without changing silhouette/collider or skin IDs. |
| P2-7 | `EggMesh.tsx:50-60` adds a large additive player glow sprite; `Track.tsx:134-137` uses Basic material for rails without explicit `toneMapped=false`. | Additive glow and ACES can wash mobile highlights rather than create focus. | Treat glow as an accent layer: reduce base sprite size/intensity, make it state-driven, and explicitly decide tone mapping for all unlit accents. |

### Rapier integration assessment

The core character-controller usage follows the important Rapier shape/pattern: a capsule collider is moved with `computeColliderMovement`, corrected movement is read, and a position-based kinematic body receives `setNextKinematicTranslation` (`EggRacer.tsx:415-416,508-526,685-695`). Rapier's JavaScript guide identifies that pattern as the recommended one for position-based kinematic bodies, and documents that controller offset intentionally preserves a small environment gap. The controller also enables autostep, snap-to-ground, slope, and sliding options (`EggRacer.tsx:139-147`), which are appropriate for this move-and-slide character.

The integration's principal issue is not the Rapier character API; it is clock ownership. React Three Rapier's fixed numeric `timeStep` and interpolation props (`GameCanvas.tsx:53`) are correct, and its docs state that fixed-step transforms are interpolated over frame delta. However, course kinematics currently advance from R3F frame callbacks and `clock.elapsedTime`, while racer logic advances from `STEP` in `useBeforePhysicsStep`. Aligning collision-affecting transforms to the same fixed clock is the safest way to improve contact without replacing the engine.

Ground filtering is deliberately conservative: `EggRacer.tsx:424-454` requires controller grounding, a sufficiently upward normal, and low upward vertical velocity. That is reasonable, but the visual anchor is not calibrated to the 0.08 controller offset, so physically correct grounding still looks wrong. Fix the visual contact frame before changing controller thresholds.

### Level 1 golden benchmark plan

Use Level `meadow` only. Preserve its platform positions, dimensions, semantic surfaces, checkpoints, spawns, bots, and finish trigger while adding non-colliding presentation.

#### Benchmark setup

- Level: `meadow` (`levels.ts:131-196`); player: fixed default coral/sprout loadout; bot field: all four Level 1 bots.
- Capture matrix: landscape 1280×720 at DPR 1 for pixel references, plus one iPhone-class 390×844/DPR 2 sanity pass. Run high quality for golden art and low quality for budget validation.
- Use deterministic camera presets rather than the gameplay follow camera for stills: front 3/4, side profile, high route view, and finish POV. Freeze simulation state at each checkpoint or add a test-only state setter; do not use random mid-run screenshots as goldens.
- Store expected images/hashes and focused crops outside product code as test fixtures. Compare whole-frame only for environment regressions; use character/course crops for tolerable noise.
- Capture before changes, after P0, and after Level 1 enrichment so the team can distinguish foundation corrections from art direction changes.

#### Required golden shots

1. **Start lineup / character benchmark** at spawn Z 4 (`levels.ts:189-195`).
   - Front and side profile of player plus all bots.
   - Accept: no more than 0.01 world-unit unintended visual ground penetration; distinct body/face/accessory materials; marker and glow do not obscure silhouette; idle animation is subtle.
2. **Run/jump/step benchmark** around `path` / `step1` (Z -8 to -18.6).
   - Straight run, turn, jump start/apex/fall/land.
   - Accept: run state changes silhouette; jump and landing squash are visible; landing dust/contact shadow anchors at the collider foot; face remains readable at gameplay camera distance.
3. **Shortcut/ability benchmark** at `pounceA` Z -20.4 and `pounceB` Z -29.6 (`levels.ts:160-161`).
   - Pounce and roll through the side route.
   - Accept: direction lean precedes motion, roll reads as controlled rather than unbounded tumble, and shortcut remains optional for bots.
4. **Bounce/ring benchmark** at jelly Z -50 and ring Z -19 (`levels.ts:162-178`).
   - Bounce, boost-ring hit, and visible near-miss.
   - Accept: jelly material telegraphs bounce; ring collection has a pop/collapse; the forgiving collision zone visually matches or is only modestly larger than the ring.
5. **Final approach / layered world** from Z -66.54 to finish Z -76 (`levels.ts:164-165`).
   - Include foreground edge, route surface, midground prop, background band, sky, and rails.
   - Accept: route direction is obvious, far layer has parallax/silhouette separation, no sky/far-plane clipping, and low-quality still preserves composition without shadows/expensive effects.
6. **Finish state** at the actual finish plane.
   - Trigger crossing, short celebration, and results transition.
   - Accept: finish visual line/arch is within 0.05 of the gameplay trigger, input locks immediately, the character has a finish pose/impulse, and the UI transition happens after a fixed 0.4–0.8 s presentation beat.

#### Benchmark gates

- Contact: side-profile egg/platform intersection is visually corrected; no bob-induced ground piercing.
- State readability: idle, run, airborne, landing, pounce, roll, and boost have distinguishable thumbnail silhouettes.
- Course semantics: ice/bounce/conveyor/checkpoint/finish are distinguishable without motion, and clearer with motion.
- Environment: sky dome remains intact at all benchmark positions; at least foreground, route, midground, and background layers separate.
- Finish: visual trigger and gameplay trigger align; finish state has a repeatable beat.
- Performance: record draw calls, triangles, texture memory, and frame rate for each quality. The first benchmark should establish numbers; enrichment should not materially regress the low-quality mobile budget before P0 is accepted.

### External references

- Three.js `MeshToonMaterial` documentation: `gradientMap` is non-color data, must use `NoColorSpace`, and requires nearest filtering — <https://threejs.org/docs/pages/MeshToonMaterial.html>.
- Rapier JavaScript character-controller guide: controller offset preserves an environment gap; position-based kinematic bodies should apply corrected movement through `setNextKinematicTranslation`; controller supports slopes, autostep, and moving platforms — <https://rapier.rs/docs/user_guides/javascript/character_controller/>.
- React Three Rapier `PhysicsProps`: numeric `timeStep` runs fixed-rate simulation; `interpolate` interpolates world transforms using frame delta — <https://pmndrs.github.io/react-three-rapier/interfaces/PhysicsProps.html>.

### Related specs

- `.trellis/spec/frontend/index.md` — frontend spec index; substantive project-specific visual/gameplay rules are not yet populated.
- `.trellis/workflow.md` — planning-before-implementation and persistent task-research requirements.
- `.trellis/tasks/08-28-visual-upgrade-phase2/prd.md` — source for P0 foundation, character/material identity, grounding, Level 1 benchmark, fixed-step preservation, mobile performance, and no third-party art copying.

## Caveats / Not Found

- This is a code-level audit; no product code, `docs/visual`, or visual assets were modified.
- No runtime golden screenshot was captured in this research pass. The benchmark section defines the deterministic capture procedure to run during implementation.
- Renderer/lighting/UI were intentionally not re-audited here because this dispatch narrows the broader PRD to character/course/gameplay presentation.
- Exact performance numbers were not measured; performance implications above are implementation-level estimates, not profiler results.
- `GRAVITY` and several older dash constants have partial or legacy use. Removal is classified as cleanup and should be guarded by behavior checks rather than done blindly.
