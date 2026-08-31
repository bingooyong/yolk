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

## Lab Image-to-3D Pilot

### `public/assets/skins/lab_img3d_pilot/lod0.glb`

| Field | Value |
| --- | --- |
| **Skin ID** | `lab_img3d_pilot` |
| **Role** | `test` |
| **Source** | Tencent [Hunyuan3D-2 Space](https://huggingface.co/spaces/tencent/Hunyuan3D-2) Turbo `shape_generation` from `docs/skins/concept-art/hunyuan-pilot-front.jpg`. Post-processed (`scripts/import-glb-url.mjs`) to add 1 PBR material, smooth normals, and unit height. |
| **Texture** | Anonymous ZeroGPU quota was too small for `/generation_all` (135s requested vs 80s left). Paste a textured Hunyuan GLB public URL in wardrobe **实验室**. |
| **License** | Tencent Hunyuan 3D Community License; concept art project-internal |
| **Triangle Count** | 139412 |
| **Material** | 1 PBR (`LabPBR`, cream, metallic=0.04, roughness=0.48) |
| **Textures** | 0 |
| **Animations** | 0 |
| **Skeleton** | 0 |
| **File Size** | ~2.59 MB |
| **Quality Gate** | `role: test` → valid, 0 errors, 0 warnings |

Not in the gacha pool. Wardrobe **实验室** tab / backpack **试作** filter only.

### `lab_user_import`

Empty slot. Wardrobe **实验室** accepts an https GLB URL (GitHub raw / catbox). `scripts/import-glb-url.mjs` writes `public/assets/skins/lab_user_import/lod0.glb`. Chat cannot attach GLB files.

Free operator path:

```bash
python3 scripts/hunyuan-img2-3d.py docs/skins/concept-art/<name>.jpg /tmp/out.glb
node scripts/import-glb-url.mjs --file /tmp/out.glb lab_user_import --role test
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
| `lab_img3d_pilot` | `public/assets/skins/lab_img3d_pilot/lod0.glb` | `test` | Hunyuan3D-2 Space + Imagine concept | Hunyuan 3D Community | ✓ |
| `lab_user_import` | `public/assets/skins/lab_user_import/lod0.glb` | `test` | User-supplied public GLB URL | per source file | import slot |
