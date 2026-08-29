# Visual Rendering Guidelines

## Scope / Trigger

Apply this guide when changing Three.js/R3F rendering, lighting, quality tiers, character presentation, course decoration, or visual smoke tooling in `src/engine` or `src/game`.

## Signatures and ownership

```ts
getVisualProfile(quality: Quality): VisualQualityProfile
getCanvasRemountKey(scope: string, quality: Quality): string
observePerformanceRenderer(renderer: THREE.WebGLRenderer): void
createCharacterPresentation(spawn: { x: number; y: number; z: number }): CharacterPresentation
syncCharacterPresentation(target: CharacterPresentation, snapshot: CharacterPresentationSnapshot): void
createLevel1BenchmarkLayout(platforms: Platform[], finishZ?: number): Level1BenchmarkLayout
```

- `src/engine/visualProfile.ts` owns pure renderer, camera, sky, lighting, and quality data. It must remain importable by Node tests without WebGL.
- `src/game/LightingSystem.tsx` owns player-following key/fill/rim/hemisphere lights and the procedural environment.
- `src/game/character-presentation.ts` owns contact geometry and transform-only pose derivation.
- `src/game/Level1BenchmarkArt.tsx` owns the Level 1 benchmark presentation and instanced resource batches.

## Contracts

1. Gameplay advancement and Rapier kinematic transforms run in `useBeforePhysicsStep` or the fixed pipeline at `PHYSICS_DT`. Do not add new gameplay work to `useFrame`. Existing exceptions are narrowly coupled to presentation/control: `CameraRig` updates look/`camYaw` state consumed by movement, while `Ranker` and `HudPump` project live race state; changes there require explicit game-flow tests.
2. All renderer/tone/camera/sky/quality constants come from `visualProfile.ts`; do not scatter replacement magic numbers through components.
3. Context MSAA is immutable. Dynamic DPR/shadow changes may update in place, but crossing the low-quality MSAA boundary must use `getCanvasRemountKey`.
4. The camera-following sky shell radius must remain inside the camera far plane on every course.
5. Use original procedural geometry/textures only. Do not copy reference-game characters, UI, models, textures, logos, or layouts.
6. Repeated environment props use deterministic placement and `InstancedMesh` with shared geometry/material resources. Do not emit one mesh per grass tuft, flower, rock, or hill.
7. Character contact shadows use the cheap anchored radial quad. Do not add Drei `ContactShadows` or another depth pass without new target-device evidence.
8. `?debug=perf` is the only renderer instrumentation path. Observe the concrete R3F renderer; do not mutate `WebGLRenderer.prototype` or re-render React every frame.
9. Persisted store state must initialize from deterministic defaults and reconcile only after mount. Never read `localStorage` during the first store render.
10. Visual smoke must wait for a viewport-sized real R3F canvas; a 300×150 canvas is only the boot placeholder and is not evidence.

## Validation & error matrix

| Condition                             | Required result                                                                                                                         |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Quality profile changes               | `npm run test:visual` asserts tier limits, sky/frustum safety, remount behavior, and tone/color contract.                               |
| Character/controller geometry changes | Focused contact test proves the lowest idle point stays above the contact plane.                                                        |
| Course decoration changes             | Layout test proves deterministic placement, depth bands, platform-backed guidance, finish alignment, and instanced batching.            |
| Persistence/hydration changes         | Focused test proves deterministic first render and post-mount saved-state reconciliation.                                               |
| Canvas/viewport smoke                 | Desktop and 390×844 mobile contexts have a viewport-sized canvas, no horizontal overflow, and no console/page errors.                   |
| Renderer instrumentation              | Debug overlay emits FPS, average/p95 frame time, draw calls, triangles, textures, pixel size, and quality without normal-mode overhead. |

## Good / base / bad cases

- **Good:** a mover computes old/new positions with `PHYSICS_DT` in `useBeforePhysicsStep`, writes mover velocity, and lets Rapier interpolation render it.
- **Base:** an idle character breathes through a transform-only pose derived from fixed-step state.
- **Bad:** a spinner rotates from `clock.elapsedTime` in `useFrame` and directly writes a Rapier kinematic transform; render rate now changes gameplay timing.

## Tests required

```bash
npm run test:visual
npm run typecheck
npm run lint
npm run build
npm run smoke:visual -- --url http://127.0.0.1:<port>/ --out <project-root-artifact-dir>
```

For an iOS-facing change, also run `npm run build:ios`; do not commit generated `native/ios/YolkRush/www` build output unless the repository explicitly adopts it.

## Skin 3D Asset Pipeline (08-29-skin-3d-pipeline)

Adds an opt-in Model path for character Skins. Procedural EggMesh remains
the default; the new pipeline only fires when a Skin declares
`renderKind: "model"`.

### Boundaries

- `src/engine/skin-asset/loader.ts` — fetches + parses the GLB **and** the
  sibling `<url>.quality-gate-report.json`; caches by `skinId`; returns
  `null` on network / parse failure; throws `QualityGateRejectedError`
  when the Quality Gate report reports `valid: false` (the runtime
  dispatcher in `CharacterVisual` catches it, logs a warning, and falls
  back to the procedural EggMesh so gameplay never blocks).
- `src/engine/skin-asset/provider/{types,mock-provider,meshy-provider,rodin-provider,trellis-provider,factory,index}.ts`
  — Provider interface + 4 implementations. Real providers throw
  `MissingApiKeyError` on construction; server-only via
  `server/routes/api/skins/*`.
- `scripts/seed-demo-glb.mjs` — programmatic GLB seed for the demo asset.
- `scripts/validate-skin-asset.mjs` — reads a GLB, writes
  `<glb>.asset-manifest.json`. Each numeric field is annotated with a
  `requiredLevel` (`Required` / `Optional` / `Recommended` / `Deferred`).
- `scripts/quality-gate.mjs` — applies per-role thresholds; rejects
  `role: "production"` Skins with Required failures; tolerates `role:
"test"` Skins with Optional / Recommended misses.
- `src/components/CharacterVisual.tsx` — picks procedural vs model at
  render time. Falls back to `<EggMesh>` on any loader error or Quality
  Gate rejection (`QualityGateRejectedError` → `console.warn` + EggMesh).
  Wardrobe filtering by `getSkin(id)` + `isRejectedSkin(id)` (R13.5) keeps
  rejected assets from surfacing in the picker in the first place.
- `src/routes/dev/skin-preview.tsx` — `import.meta.env.DEV` guard via
  `notFound()` in `beforeLoad`. Production builds 404 the URL.

### Gameplay non-interference (R7)

CharacterVisual mounts inside `<group ref={visual}>` (the existing
presentation root). It does NOT alter:

- The `<RigidBody>` kinematic body
- The `CapsuleCollider` shape, half-height, or radius
- `EGG_HALF`, `EGG_RADIUS`, `CHARACTER_CONTROLLER_OFFSET`,
  `EGG_VISUAL_GROUND_OFFSET`
- `useBeforePhysicsStep` / fixed-step pipeline timing

`presentationProfile` is transform-only and applied multiplicatively
with squash / lean / breath from `character-presentation.ts`.

### Tests required

```bash
npm run test:skin    # factory + mock-provider + loader + validator + quality-gate
npm run typecheck
npm run lint
npm run build
```

### Wrong vs correct (Model Skins)

**Wrong:** adding a new `RigidBody` + `CapsuleCollider` for a Model Skin
so the imported rig drives movement. Couples physics to the asset; any
GLB swap retunes the collider.

**Wrong:** writing `presentationProfile` values that change `position-y`
to compensate for a misaligned export — they are visual transforms only.

**Correct:** `CharacterVisual` mounts `<primitive object={scene.clone()} />`
inside a transform-only `<group scale=… position-y=… rotation=…>`,
leaves the existing collider untouched, and falls back to `<EggMesh>` on
load failure.

## Wrong vs correct

### Wrong

```tsx
useFrame(({ clock }) => {
  body.current?.setNextKinematicRotation(rotationFromClock(clock.elapsedTime));
});
```

### Correct

```tsx
useBeforePhysicsStep(() => {
  elapsed.current += PHYSICS_DT;
  body.current?.setNextKinematicRotation(rotationFromElapsed(elapsed.current));
});
```
