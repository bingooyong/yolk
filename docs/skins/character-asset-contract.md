# Character Asset Contract

> Contract every Skin (Procedural OR Model) MUST honor so the runtime can
> treat them interchangeably. A Skin that violates the contract will be
> rejected by the Quality Gate before it ever reaches the wardrobe.

---

## 1. Skin entry — required fields

```ts
type Skin = {
  id: string;                    // stable, kebab-case or snake_case
  name: string;                  // display name (zh-CN)
  rarity: Rarity;                // 'common' | 'rare' | 'epic' | 'legendary'
  kind: SkinKind;                // legacy visual category
  tint: string;                  // hex color; required (EggMesh still reads it)
  renderKind: RenderKind;        // 'procedural' | 'model' — drives routing
  assetRole?: AssetRole;         // 'test' | 'production' — drives Quality Gate
};
```

- `id` MUST be globally unique across `SKINS`.
- `tint` MUST be a 6-digit hex color (`#RRGGBB`). The EggMesh fallback reads
  it even for Model skins, so removing it would break the visual parity path.
- `assetRole` defaults to `"production"` if absent. Test assets must set
  `"test"` explicitly to opt into the softer Quality Gate threshold.

## 2. Procedural Skin (`renderKind: "procedural"`)

No additional fields required. The legacy `kind` + optional `hat` drive the
procedural EggMesh pipeline.

## 3. Model Skin (`renderKind: "model"`)

### Required fields

| Field | Type | Purpose |
| --- | --- | --- |
| `modelUrl` | string | Public URL to the LOD0 GLB (must be `https://` or `/...`) |
| `presentationProfile.scale` | number | Uniform scale factor applied to the Model root |
| `presentationProfile.verticalOffset` | number | Y-axis lift (does not change capsule / controller offset) |
| `presentationProfile.rotationOffset.{x,y,z}` | number | Per-axis rotation in radians |
| `presentationProfile.contactShadowScale` | number | Scale passed to the runtime contact shadow plane |

### Optional fields

| Field | Type | Purpose |
| --- | --- | --- |
| `lod0` / `lod1` / `lod2` | string | Distinct URLs per LOD level. When omitted, `modelUrl` is used for all three. |
| `animationProfile.status` | `'static' \| 'embedded'` | Static means no clips; embedded means clips in the GLB |
| `animationProfile.defaultClip` | string | Name of the clip to play by default (when embedded) |
| `animationProfile.loop` | boolean | Whether the default clip loops |
| `assetManifest` | `AssetManifestRef` | Inlined validator report. Quality Gate reads this when present. |

### Prohibited in a Model Skin

- **No colliders** — the Model is mounted inside `<group ref={visual}>`,
  which lives inside `<RigidBody>`. The RigidBody already provides a single
  capsule collider; the Model MUST NOT add new ones. Doing so would couple
  physics to the asset (R7 violation).
- **No animation that drives the controller** — animation must drive visuals
  only. Squash / lean / breath are computed by `character-presentation.ts`
  and applied to the visual root.
- **No textures or shaders that fetch from `blob:` / `data:` URIs** — fetch
  paths must be `https://` or public asset paths so the GLB remains
  cache-friendly.
- **No external script tags** — the Model is parsed via GLTFLoader, which
  ignores scripts by design. Do not embed JS in textures or material extras.

## 4. GLB specification

| Property | Required value |
| --- | --- |
| Format | `glb` (binary glTF 2.0) |
| Triangle count | > 0 |
| Mesh count | >= 1 |
| Material count | 1 – 32 |
| Bounding box | each axis in [0.001, 100] |
| NaN / Infinity in vertex data | forbidden |
| File size | < 20 MB |
| Skeleton | optional (Recommended for production) |
| Animation | optional (Recommended for production) |
| Embedded textures | optional (Recommended for production) |
| PBR material | optional (Required for production) |

Anything outside this contract is rejected by the Validator (`scripts/validate-skin-asset.mjs`)
before the Quality Gate even runs.

## 5. Quality Gate outcomes

The Quality Gate (`scripts/quality-gate.mjs`) writes a sibling
`<manifest>.quality-gate-report.json` with one of three outcomes:

1. **`valid: true, 0 warnings`** — ready to ship. Wardrobe surfaces the Skin
   for any role.
2. **`valid: true, N warnings`** — accepted, but the Preview page header
   shows a "Test asset — production characters would require …" banner so
   operators see what is missing. Currently the only skin in this state is
   `egg_demo_model` (assetRole: `test`).
3. **`valid: false, M errors`** — rejected. The runtime Loader throws
   `QualityGateRejectedError` (R13.5) and the UI hides the Skin via
   `useRejectedSkinIds()` so it never reaches the wardrobe. The Skill
   workflow must iterate the asset and re-run the Gate; do NOT downgrade
   `assetRole` to `"test"` to bypass a rejection.

### Runtime integration

- The browser Loader (`src/engine/skin-asset/loader.ts`) reads the Gate
  report before returning the GLB. On `valid: false` it throws
  `QualityGateRejectedError { skinId, url, role, errors[], warnings[] }`.
- `CharacterVisual` catches the error, logs a `console.warn` with the
  rejection reason, and falls back to the procedural EggMesh so gameplay
  never blocks (R7).
- `Hub.tsx`'s `CharacterPane` and `InventoryPane` consult
  `useRejectedSkinIds()` and filter the registry before rendering — a
  rejected Skin is invisible even before the runtime tries to load it.
- A missing Gate report (HTTP 404) is treated as "ungraded" and accepted
  silently so dev previews still work before the first Gate run.

## 6. Manifest schema

```ts
type AssetManifestRef = {
  id: string;
  version: number;                 // bump on breaking shape change
  format: "glb";
  model: string;                   // public URL or absolute path
  thumbnail?: string;              // public URL
  triangleCount: number;           // MUST be > 0
  textureResolution: number;       // 0 when no textures
  animations: string[];            // clip names
  skeleton: boolean;               // true when skins are present
  lod: { lod0?: string; lod1?: string; lod2?: string };
  license: string;                 // SPDX-style or 'project-internal'
  source: string;                  // provenance: script URL or vendor
  generatedAt: string;             // ISO timestamp
  sha256: string;                  // 64-char hex
};
```

`triangleCount === 0` means the Validator failed to read the GLB; do not
patch the JSON to fix it — re-run the seed / export and let the Validator
write a real number.

## 7. Changelog

| Date | Author | Change |
| --- | --- | --- |
| 2026-08-29 | Codex | Initial contract. Mirrors `08-29-skin-3d-pipeline/design.md §3`. |
| 2026-08-29 | Codex | Document Quality Gate rejection → runtime: `QualityGateRejectedError`, `useRejectedSkinIds()` UI filter, fallback contract. |
