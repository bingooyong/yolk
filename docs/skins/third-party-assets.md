# Third-Party Assets

> The Yolk Rush Skin 3D Asset Pipeline runs against assets that ship inside
> the project repository. This document tracks **every** GLB / texture /
> animation / model file that gets loaded at runtime so an operator can
> answer "where did this come from?" and "is it safe to ship?" in seconds.

---

## Runtime Integration Test Asset

### `public/assets/skins/_demo/egg-exported.glb`

| Field | Value |
| --- | --- |
| **Skin ID** | `egg_demo_model` (`src/game/skins.ts`) |
| **Role** | `test` (Runtime Integration Test Asset) |
| **Source** | `scripts/seed-demo-glb.mjs` — programmatically authored via `@gltf-transform/core` |
| **License** | project-internal (NOT a third-party asset) |
| **Triangle Count** | 12 (single box, indexed) |
| **Material** | 1 PBR (`baseColorFactor`, `metallic=0.05`, `roughness=0.4`) |
| **Textures** | 0 (test asset — texture is Optional) |
| **Animations** | 0 (test asset — animation is Recommended for production only) |
| **Skeleton** | 0 (test asset — skeleton is Recommended for production only) |
| **File Size** | ~1.7 KB |
| **Manifest** | `egg-exported.asset-manifest.json` (validator output) |
| **Quality Gate Report** | `egg-exported.quality-gate-report.json` |

#### Why this asset exists

`egg_demo_model` is registered in `src/game/skins.ts` with `renderKind: "model"`
and `assetRole: "test"`. It is **not** a production character. Its purpose is
to keep the SkinAssetLoader + CharacterVisual + Wardrobe integration code path
exercised end-to-end without burning real Meshy / Rodin credits.

#### Why this asset does NOT violate the "no fake GLBs" rule

The seed script builds the GLB from real geometric data:

- 8 unique vertex positions, 24 unique normals
- 12 indexed triangles (2 per box face × 6 faces)
- One PBR material with non-default metallic / roughness factors
- Valid bounding box `[-0.5, 0.5]³`

A Validator run reports:

```json
{
  "valid": true,
  "triangleCount": 12,
  "materials": 1,
  "meshes": 1,
  "pbr": true,
  "boundingBox": { "min": [-0.5, -0.5, -0.5], "max": [0.5, 0.5, 0.5] },
  "fileSizeBytes": 1696
}
```

A Quality Gate run for `role: "test"` returns `valid: true, 0 errors, 0 warnings`.

A Quality Gate run for `role: "production"` returns `valid: true, 0 errors,
3 warnings` (texture / skeleton / animation recommended).

#### Re-seeding

Re-run when the seed logic changes:

```bash
node scripts/seed-demo-glb.mjs
node scripts/validate-skin-asset.mjs public/assets/skins/_demo/egg-exported.glb
node scripts/quality-gate.mjs public/assets/skins/_demo/egg-exported.asset-manifest.json --role test
```

---

## Future Third-Party Models (Deferred)

When `MeshyProvider`, `RodinProvider`, or `TrellisProvider` are connected to
real keys (see `src/engine/skin-asset/provider/{meshy,rodin,trellis}-provider.ts`),
their generated assets will live under `public/assets/skins/<skin-id>/` and
**MUST** ship with:

1. A populated `asset-manifest.json` (Validator output)
2. A `quality-gate-report.json` with `role: "production"` passing 0 errors
3. License + source metadata in `asset-manifest.json.license` and
   `asset-manifest.json.source`
4. An entry in this document recording provenance, model, and license terms

No third-party model may reach the Wardrobe without those four artifacts in
place. The Quality Gate rejects any production-role asset that fails a
Required check (parseable / mesh / triangle / bounding box / material count /
model size / NaN-free / file size).

---

## Asset Inventory

| Skin ID | Path | Role | Provenance | License | Manifest |
| --- | --- | --- | --- | --- | --- |
| `egg_demo_model` | `public/assets/skins/_demo/egg-exported.glb` | `test` | `scripts/seed-demo-glb.mjs` | project-internal | ✓ |
