# Skin System

> Design overview + stable engineering rules for the character Skin subsystem.
> Optimized for AI assistants and new team members — captures only the rules
> that survive upcoming Skin additions, full-character mesh swaps, and
> Provider upgrades. Temporary experiments, the concrete paths of placeholder
> GLBs, and any unverified Provider call snippets deliberately stay in
> `docs/skins/`.

---

## Design overview

Skin changes **who you look like**. Skin never changes **how you play**.

### Contract

- Gameplay (move, jump, pounce, roll, boost, capsule) is independent of `visualId` and `renderKind`.
- A skin is a `SkinDefinition` in the catalog, not a branch in `EggRacer`.
- `modelType`: `base` (default yolk), `modular` (yolk + accessory), `full_character` (replacement silhouette).
- Visuals resolve through `visualId` (procedural full-character meshes, e.g. KnightMesh / BearMesh / RabbitMesh / RobotMesh) **or** through `renderKind: "model"` (GLB Asset Loader). Model takes precedence over the procedural registry when both are set.
- Unowned skins may preview in wardrobe; Equip is owned-only.
- Collision, camera gameplay, and cooldowns ignore mesh bounds.
- Showcase cameras (wardrobe / later gacha / victory) live in `src/game/presentation/`. Gameplay pose stays in `character-presentation.ts`. Do not merge the two.
- `resolveSkinAppearance(id)` is the only appearance source of truth. Gacha DOM marks are a fallback, not the product reveal.
- Procedural Knight / Bear / Rabbit / Robot are **prototype** full characters. Do not label them as production GLB.

### Presentation modes

`getPresentationMode(phase, hub, revealing)` → `home | wardrobe | gacha | victory | gameplay`.

Wardrobe (`title` + `hub=character`): hide track and bots, show `ShowcaseStage`, camera from `PRESENTATION_PROFILES.wardrobe`, default yaw π (front face). Pinch / wheel zoom clamped. Auto-orbit resumes after idle; release does not snap yaw.

Gacha (`title` + `lastPull`): same studio as wardrobe, faster auto-orbit, `PRESENTATION_PROFILES.gacha`. Overlay is the candy capsule then a bottom sheet; the reveal is the live `CharacterVisual`, never a CSS SkinMark. Weights stay 60/28/10/2.

Home (`title`, other hubs): meadow stays, `ShowcaseStage` podium under the racer, 3/4 front yaw (`HOME_YAW`), slow auto-orbit. Race marker/glow off. Track collider stays; stage collider is off.

Victory (`results`): studio like gacha, `PRESENTATION_PROFILES.victory`. `ResultScreen` is a bottom sheet over the live character (orbit + auto-orbit), not a dimmed trophy card.

### Adding a skin

1. Add a `SkinDefinition` to the catalog.
2. If `full_character`, register a visual in `SKIN_VISUALS`.
3. Optional: `animationProfile` (`default | bouncy | hero`).
4. Do not edit Home / Gacha / Victory / EggRacer conditionals.
5. If the Skin loads through the GLB Asset Loader (`renderKind: "model"`), add the asset manifest reference and gate report alongside the GLB. See "Quality Gate runtime" below.

### Performance

- Share geometries at module scope.
- Do not reload assets per page.
- Full characters must stay inside the existing capsule visually (scale to yolk, not the reverse).

---

## Compatibility strategy

- **`SKINS` is the single source of truth.** Every character Skin — procedural
  variation, hat/cape/wings combo, or Model — is one row in
  `src/game/skins.ts` `SKINS: Skin[]`. UI / runtime never instantiates a
  Skin outside this array.
- **`renderKind: "procedural" | "model"`** is the discriminator the runtime
  uses to pick between the EggMesh path and the GLB Asset Loader. Every
  entry MUST declare one; the type is non-optional.
- **`assetRole: "test" | "production"`** governs whether `pullSkin()`
  surfaces the Skin through gacha. Test-role Skins stay reachable only
  through `STARTER_SKINS` (developer onboarding) and the dev preview
  route. Never downgrade a production-role Skin to `test` to bypass a
  Quality Gate failure — re-export the asset instead.
- **Forward-compatible SKINS schema.** Bump `Skin` is additive only. Never
  remove or rename an existing field; deprecate by leaving the field and
  introducing a new one alongside it. Downstream consumers (UI, persist
  store, CharacterVisual) MUST tolerate unknown fields.
- **Procedural baseline is invariant.** The 12 procedural Skins
  (`plain`, `sprout`, `bow`, `starlet`, `mint_wings`, `sky_wings`,
  `star_cape`, `bunny`, `sunset_wings`, `cloud_wings`, `halo`, `crown`)
  MUST stay `renderKind: "procedural"`. Enforced by
  `src/game/skins.test.ts`.

---

## Provider interface contract

`src/engine/skin-asset/provider/types.ts` defines the canonical seam:

```ts
interface SkinProvider {
  readonly kind: ProviderKind;
  generateFromImage(req: GenerateFromImageRequest): Promise<GenerateTask>;
  generateFromPrompt(req: GenerateFromPromptRequest): Promise<GenerateTask>;
}
```

- **One implementation per Provider kind** (`mock`, `meshy`, `rodin`,
  `trellis`). Implementations live in `src/engine/skin-asset/provider/`.
- **Factory entry point.** `createProvider(kind)` returns the
  implementation for `kind`; throws `MissingApiKeyError` for real
  Providers when the corresponding `*_API_KEY` env var is empty.
- **`MissingApiKeyError`** is the only error a Provider is allowed to
  throw during construction. Generation errors propagate as the raw
  Provider error wrapped in a typed envelope; the `providerErrorCode()`
  helper maps them to `{missing_api_key, unknown}`.
- **Never accept Provider objects as a function parameter.** All UI /
  Skill code reaches the Provider through `createProvider(kind)` so the
  factory stays the single boundary that knows about env vars.

---

## Server boundary rules

The Skin subsystem is split along the same trust line as the rest of the
project: anything that touches a real cloud Provider runs **server-only**;
anything that touches WebGL / Three.js runs **browser-only**.

| Layer | Where | Why |
| --- | --- | --- |
| Provider implementations | `src/engine/skin-asset/provider/*.ts` (Node ESM) | Pure data shaping + HTTP. Imported by `server/routes/api/skins/*`. |
| Provider factory | `src/engine/skin-asset/provider/factory.ts` | Reads `process.env.MESHY_API_KEY` / `RODIN_API_KEY` / `TRELLIS_API_KEY`. **Never** imported by browser code. |
| API route | `server/routes/api/skins/[provider]/generate.post.ts` | Reads multipart upload, validates with Zod, calls factory, writes a Task envelope. The only place that mounts the factory in production. |
| Asset Validator | `scripts/validate-skin-asset.mjs` (CLI) | Runs on the operator's machine / CI. Writes `<glb>.asset-manifest.json`. |
| Asset Quality Gate | `scripts/quality-gate.mjs` (CLI) | Reads a manifest + `--role`, writes `<manifest>.quality-gate-report.json`. |
| Browser Loader | `src/engine/skin-asset/loader.ts` | `fetch()` + Three.js GLTFLoader. Browser-only. |
| Runtime dispatcher | `src/components/CharacterVisual.tsx` | Picks procedural vs model, falls back on loader error. |

Hard rules:

- **`process.env.MESHY_API_KEY` / `RODIN_API_KEY` / `TRELLIS_API_KEY` MUST
  NOT appear** in `src/`, `server/`, or any committed file. The grep
  `grep -rE '(MESHY|RODIN|TRELLIS)_API_KEY\s*=' src/ scripts/` returns
  zero matches. Real keys live in deployment env only.
- **`globalThis.fetch` is forbidden in Provider code.** Use Node's
  `fetch` (Node 18+) directly so the server bundle's headers, body, and
  timeout match the operator's expectation.
- **No client-side Provider instantiation.** Any code that imports
  `createProvider` and is reachable from a client bundle is a defect.
- **Asset outputs go through the public/ filesystem path.** `modelUrl`
  in the registry MUST be a public-relative URL starting with `/`, not
  an absolute filesystem path. The Validator (`toPublicUrl`) and the
  GLB file on disk together determine the URL.

---

## Asset Validator entry point

The Validator is a Node CLI; it does not have a runtime API. Always
invoke it from the project root:

```bash
node scripts/validate-skin-asset.mjs <glb-path> [--out <report-path>]
```

- `<glb-path>` is resolved against `process.cwd()`; absolute paths and
  paths inside `public/` are both accepted.
- Output defaults to `<dirname>/<basename>.asset-manifest.json`.
- When the GLB lives under `public/`, paths in the manifest are
  normalized to public-relative URLs (`/assets/skins/<id>/<filename>.glb`).
  The `toPublicUrl()` helper owns the rule.
- `report.requiredLevels` annotates every numeric field with one of
  `Required | Recommended | Optional | Deferred`. The Quality Gate
  consumes this map to apply per-role thresholds.

The Validator's contract — what fields it must populate and what each
field means — is the version-stamped shape of the manifest. Bump
`REPORT_VERSION` only when changing the shape; additive changes do not
require a bump.

---

## Asset Quality Gate

- **Two roles, different thresholds.** `role: "test"` exempts the
  `pbr | texture | skeleton | animation` checks from `Required` (they
  stay `Recommended` / `Optional`). `role: "production"` makes PBR
  `Required` and the rest `Recommended`.
- **Output is a sibling JSON** of the manifest:
  `<manifest>.quality-gate-report.json`. `{valid, role, errors[], warnings[]}`.
- **The Loader reads the report, not the manifest.** A Skin whose report
  reports `valid: false` makes the Loader throw
  `QualityGateRejectedError`; the runtime dispatcher catches it, logs a
  warning, and falls back to the procedural EggMesh.
- **Missing report = ungraded.** The Loader treats an HTTP 404 as
  "author hasn't run the Gate yet" and accepts the asset. Production
  deployments must enforce a Gate pass before shipping a new Skin.

---

## Browser-side runtime contract

`src/components/CharacterVisual.tsx` is the only place that knows about
the procedural vs Model dispatch:

- **R7 — gameplay non-interference.** `CharacterVisual` mounts inside
  the existing `<group ref={visual}>` inside the player's `<RigidBody>`.
  It does NOT add a new `RigidBody`, change the `CapsuleCollider`, alter
  `EGG_HALF` / `EGG_RADIUS`, or feed back into physics timing.
  `presentationProfile` is transform-only (scale, verticalOffset,
  rotationOffset, contactShadowScale).
- **Cache.** GLBs are cached by `skinId` in the Loader; concurrent
  fetches are deduplicated via an inflight `Map`. `clearSkinAssetCache()`
  is the seam for hot-swapping a Skin's model.
- **Failure modes.**
  - Network / parse failure → `loadSkinAsset` returns `null`; runtime
    falls back to `EggMesh`.
  - Quality Gate rejection → `loadSkinAsset` throws
    `QualityGateRejectedError`; runtime logs `console.warn` (with
    `skinId`, `role`, and `errors`) and falls back to `EggMesh`.
  - Missing Quality Gate report (404) → silently accepted as ungraded.
- **Gameplay never blocks on a Skin asset.**

---

## Dev-only preview

`src/routes/dev/skin-preview.tsx` and
`src/components/DeveloperSkinPreview.tsx` are the only sanctioned way to
inspect a Skin asset outside gameplay.

- **Dev-only route guard.** `beforeLoad` returns `notFound()` when
  `import.meta.env.DEV` is false. Production builds 404 the URL even
  though the module may be tree-shaken into the bundle.
- **No real Provider calls in the dev preview.** The preview consumes a
  Skin's `modelUrl` and its sibling Quality Gate report directly; it
  does not re-run generation.
- **Asset Info panel surfaces `assetRole` and the latest Gate status** so
  the developer can see whether the Skin would ship to production.

---

## Manifest schema (canonical)

Versioned by `REPORT_VERSION` in `scripts/validate-skin-asset.mjs`.
The runtime consumes `Skin.modelUrl` (public-relative URL) and, via the
Loader, the sibling `<url>.quality-gate-report.json`.

Key fields and their meaning:

| Field | Type | Purpose |
| --- | --- | --- |
| `valid` | boolean | GLB parsed + every Required field passes |
| `id` | string | basename of the GLB without extension |
| `model` | string | public-relative URL of the GLB |
| `lod.lod{0,1,2}` | string | public-relative URLs of LOD variants |
| `triangleCount` | number | total triangle count across meshes |
| `materials` | number | in `[1, 32]` |
| `textures` / `textureResolution` | number | embedded texture inventory |
| `pbr` | boolean | any material deviates from glTF defaults |
| `boundingBox` | `{min, max}` | 3-floats each, finite, extent in `[0.001, 100]` |
| `fileSizeKB` / `fileSizeBytes` | number | hard cap 20 MB |
| `requiredLevels` | map | per-field grading tag for the Gate |
| `errors[]` | string[] | populated when `valid === false` |

---

## Wrong vs correct

### Wrong

```ts
// Provider constructed inline at a UI handler — pulls the env var in the
// browser bundle.
async function onClick() {
  const provider = new MeshyProvider(process.env.MESHY_API_KEY);
  await provider.generateFromImage(req);
}
```

```ts
// Model Skin adds its own collider to "feel right".
<group ref={visual}>
  <CapsuleCollider args={[1, 0.5]} />
  <primitive object={scene} />
</group>
```

```ts
// Manifest hard-coded to an absolute path in a CI log.
report.model = "/Users/alice/repo/public/assets/skins/foo.glb";
```

### Correct

```ts
// API route mounts the factory; the browser never imports it.
import { createProvider } from "@/engine/skin-asset/provider/factory";
const provider = createProvider("meshy");
const task = await provider.generateFromImage(req);
```

```tsx
// CharacterVisual mounts inside the existing presentation group.
<group ref={visual}>
  <FeelTrail color={color} active={isPlayer} />
  <CharacterVisual color={color} accessory={accessory} skinId={skinId} isPlayer={isPlayer} presentation={presentation} />
</group>
```

```ts
// Validator normalizes through toPublicUrl() when run from the project root.
node scripts/validate-skin-asset.mjs public/assets/skins/foo.glb
// → report.model === "/assets/skins/foo.glb"
```
