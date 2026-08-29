# Skin Generation

> Authoring guide for new Model Skins using the AI3D pipeline. Pairs with
> `docs/skins/character-asset-contract.md` (what the runtime demands) and
> `docs/skins/asset-pipeline.md` (how the GLB reaches the game).

---

## 1. When to use a Model Skin

A Skin becomes a Model when:

- The character needs a fundamentally different silhouette (e.g. bear,
  robot, dragon) that the procedural EggMesh pipeline cannot express.
- The player is willing to pay for visual variety — Model skins consume
  extra bundle weight (the GLB is shipped in the static asset directory)
  and require a Quality Gate pass for production role.

A Skin should stay Procedural when:

- It is a hat / wings / cape / halo decoration on top of the egg.
- The differentiation is purely color / material variation.

## 2. Authoring flow

```
1. Concept art  →  docs/skins/concept-art/<subject>-brief.md
2. Provider     →  MeshyProvider / RodinProvider / TrellisProvider
3. Validate     →  scripts/validate-skin-asset.mjs
4. Quality Gate →  scripts/quality-gate.mjs --role production
5. Register     →  src/game/skins.ts (PR with asset inventory update)
6. Preview      →  /dev/skin-preview?skin=<id>  (dev only)
```

### Step 1 — Concept art brief

Use the existing `concept-art/bear-explorer-brief.md` as a template. The
brief must include:

- Subject description (species, pose, proportions)
- Outfit / props list
- Material / color palette
- 3D-suitability notes (target polycount, expected bounding box, skeleton)
- Meshy + Rodin API call drafts (copy-pasteable curl commands)

### Step 2 — Provider call

Real providers are wired through `server/routes/api/skins/generate.ts`.
Until a real key is provisioned, use the MockProvider to validate the
end-to-end pipeline against `public/assets/skins/_demo/egg-exported.glb`.

```ts
import { createProvider } from "@/engine/skin-asset/provider";

const provider = createProvider("mock"); // swap to "meshy" once key set
const result = await provider.generateFromImage({
  imageUrl: "/assets/concept/bear-explorer.png",
  modelType: "standard",
  topology: "triangle",
  textureResolution: 1024,
  enablePbr: true,
});
// result.modelUrls.glb → "/assets/skins/_demo/egg-exported.glb"
```

### Step 3 — Validator

```bash
node scripts/validate-skin-asset.mjs public/assets/skins/<skin-id>/lod0.glb
```

The Validator writes `<glb>.asset-manifest.json` next to the GLB. Because
the GLB lives under `public/`, the manifest's `model` / `lod.*` / `source`
fields are normalized to public-relative URLs (e.g.
`/assets/skins/bear-explorer/lod0.glb`) — copy those into `Skin.modelUrl`
without further munging.

Check that `triangleCount`, `materials`, `pbr`, `boundingBox`, and `sha256`
are populated. A zero or `NaN` in any of those fields means the GLB failed
to parse — re-export and re-run.

### Step 4 — Quality Gate

```bash
node scripts/quality-gate.mjs \
  public/assets/skins/<skin-id>/lod0.asset-manifest.json \
  --role production \
  --out public/assets/skins/<skin-id>/lod0.quality-gate-report.json
```

The gate reads `assetRole` from the Skin entry — make sure to set
`assetRole: "production"` in `src/game/skins.ts` before running. A
production-role gate that produces any errors must be fixed before the PR
can merge. **Do not downgrade `assetRole` to `"test"` to bypass a
rejection** — the runtime Loader reads the report and will throw
`QualityGateRejectedError`, hiding the Skin via `useRejectedSkinIds()`.

### Step 5 — Register

Add the Skin to `SKINS` in `src/game/skins.ts`:

```ts
{
  id: "bear_explorer",
  name: "小熊探险家",
  rarity: "epic",
  kind: "none",
  tint: "#7B4F2A",
  renderKind: "model",
  assetRole: "production",
  modelUrl: "/assets/skins/bear-explorer/lod0.glb",
  lod0: "/assets/skins/bear-explorer/lod0.glb",
  lod1: "/assets/skins/bear-explorer/lod1.glb",
  lod2: "/assets/skins/bear-explorer/lod2.glb",
  presentationProfile: {
    scale: 1.05,
    verticalOffset: 0,
    rotationOffset: { x: 0, y: 0, z: 0 },
    contactShadowScale: 1.0,
  },
  animationProfile: { status: "embedded", defaultClip: "idle", loop: true },
  assetManifest: {
    id: "bear_explorer",
    version: 1,
    format: "glb",
    model: "/assets/skins/bear-explorer/lod0.glb",
    triangleCount: 18450,
    textureResolution: 1024,
    animations: ["idle", "run"],
    skeleton: true,
    lod: { lod0: "...", lod1: "...", lod2: "..." },
    license: "project-internal",
    source: "MeshyProvider v2 (TODO when key provisioned)",
    generatedAt: new Date().toISOString(),
    sha256: "<copy from manifest>",
  },
},
```

Add a row to `docs/skins/third-party-assets.md` under "Asset Inventory".

### Step 6 — Preview

Open `/dev/skin-preview?skin=bear_explorer` in dev mode. Use the orbit
controls + Reload GLB button to validate visually. Production builds
return 404 for the same URL.

## 3. Grok prompt template

When asking Grok (or another concept-art model) to produce reference art
for a Model Skin, use this template:

```
Subject: <one-sentence species + personality>
Setting: <game world / theme>
Palette: <2-3 hex colors>
Props: <ordered list of accessories>
Pose: <T-pose | A-pose | dynamic 3/4 view>
Constraints:
  - background must be flat, no perspective grid
  - one subject per frame, no crowd / shadow clutter
  - subject must fit inside a 1:1:1 cube (the runtime bounding box)
  - prefer simple silhouettes readable at thumbnail size
```

Drop the result into `docs/skins/concept-art/<subject>.png` and reference
the file in the brief.

## 4. Meshy API call draft (deferred until key provisioned)

```http
POST https://api.meshy.ai/openapi/v2/image-to-3d
Authorization: Bearer ${MESHY_API_KEY}
Content-Type: application/json

{
  "image_url": "https://yolk-rush.example/assets/concept/bear-explorer.png",
  "model_type": "standard",
  "topology": "triangle",
  "target_polycount": 20000,
  "texture_resolution": 1024,
  "enable_pbr": true,
  "name": "bear_explorer_lod0"
}
```

Polling endpoint:

```http
GET https://api.meshy.ai/openapi/v2/image-to-3d/${task_id}
```

The Provider implementation will poll until `status === "SUCCEEDED"`, then
download `model_urls.glb` to `public/assets/skins/bear-explorer/lod0.glb`
and run the Validator + Quality Gate automatically.

## 5. Common authoring pitfalls

- **Mismatched bounding box** — if the Subject's bbox extends outside
  `[0.001, 100]` on any axis, the Quality Gate rejects. Clamp by adjusting
  `presentationProfile.scale` instead of re-exporting.
- **Texture / data URI leaks** — Meshy occasionally embeds textures as
  `data:` URIs. Re-export with external references; the loader's `fetch`
  path rejects `blob:` / `data:` URLs.
- **Animated root transform** — some providers bake a root motion into the
  idle clip. Strip it during export; the runtime applies squash / lean /
  breath to the visual root, not to the imported animation.
- **Missing presentation profile** — without one, the Model appears at
  scale 1 with no offset, often misaligned with the procedural EggMesh
  silhouette. Always supply a tuned profile.
