---
name: create-skin
description: "Orchestrates authoring a new Yolk Rush Model Skin end-to-end: concept brief, Provider call (Meshy/Rodin/Trellis/Mock), Validator, Quality Gate, Skin registration, dev preview, and inventory update. Use when the user asks to add a new character skin, swap a Model skin's GLB, or migrate from Mock to a real cloud Provider."
---

# create-skin

Add a new Model Skin to Yolk Rush from concept to player-visible Wardrobe
entry. The Skill orchestrates existing scripts and modules; it does not
re-implement the Provider, Validator, Quality Gate, or runtime loader.

---

## When to invoke

- "Add a new character skin (e.g. bear / dragon / robot)"
- "Swap the demo GLB for a real Meshy output"
- "Promote `egg_demo_model` from Mock to a real Provider"
- "Wire up MESHY_API_KEY once the key is provisioned"

## When NOT to invoke

- Pure color / hat / wings variations — those stay procedural; edit
  `src/game/skins.ts` directly.
- Touching the procedural EggMesh pipeline — out of scope.
- Replacing the Asset Validator or Quality Gate — out of scope; extend
  those scripts in place.

---

## Pre-flight (required)

1. Read `docs/skins/character-asset-contract.md` so the resulting Skin
   entry satisfies every required field.
2. Read `docs/skins/asset-pipeline.md` so the steps map to the right
   scripts and module boundaries.
3. Read `docs/skins/third-party-assets.md` so the inventory row matches
   the existing format.

If any of those docs are missing, stop and run `pnpm docs:sync` (or
create them under `docs/skins/`).

## Workflow

### 1. Concept brief

Create `docs/skins/concept-art/<subject>-brief.md` using the template in
`docs/skins/skin-generation.md` §3. The brief must include subject,
palette, props, pose, Meshy + Rodin API call drafts.

If the user already supplied concept art, link it from the brief.

### 2. Generate or source the GLB

Pick a Provider based on the env:

```bash
# Mock — always works, returns the demo GLB. Use for local dev / CI.
node -e "import('./src/engine/skin-asset/provider/index.ts').then(m => m.createProvider('mock').generateFromImage({ imageUrl: '/assets/concept/<subject>.png' }).then(console.log))"
```

For real providers, ensure the matching env var is set in the deployment
target (NEVER in `.env.local` that gets committed):

```bash
echo "MESHY_API_KEY present? $([[ -n \"$MESHY_API_KEY\" ]] && echo yes || echo no)"
```

If absent, stop and tell the user the key must be provisioned before
proceeding.

Download the GLB to:

```
public/assets/skins/<skin-id>/lod0.glb
public/assets/skins/<skin-id>/lod1.glb
public/assets/skins/<skin-id>/lod2.glb
```

(LODs may share the same URL for now; the loader picks by URL.)

### 3. Validate

```bash
node scripts/validate-skin-asset.mjs public/assets/skins/<skin-id>/lod0.glb
```

The script writes `lod0.asset-manifest.json` next to the GLB. Because the
GLB lives under `public/`, the manifest's `model` / `lod.*` / `source`
fields are normalized to **public-relative URLs** (e.g.
`/assets/skins/<skin-id>/lod0.glb`) via `toPublicUrl()`. Copy those
straight into `Skin.modelUrl` — do not paste absolute filesystem paths.

Read the manifest and verify:

- `valid === true`
- `triangleCount > 0`
- `materials` is in `[1, 32]`
- `boundingBox.min` / `boundingBox.max` are finite and the extent fits in
  `[0.001, 100]` per axis

If any check fails, re-export the GLB and retry. Do NOT hand-edit the
manifest.

### 4. Quality Gate

```bash
node scripts/quality-gate.mjs \
  public/assets/skins/<skin-id>/lod0.asset-manifest.json \
  --role production \
  --out public/assets/skins/<skin-id>/lod0.quality-gate-report.json
```

- `valid: true, 0 errors` — proceed.
- `valid: true, N warnings` — proceed ONLY if `assetRole: "test"`. For
  production role, fix and re-run.
- `valid: false` — stop. Surface the errors and ask the user how to
  proceed (iterate on the GLB). **Do NOT downgrade `assetRole` to
  `"test"` to bypass a rejection** — the runtime Loader will throw
  `QualityGateRejectedError` and `useRejectedSkinIds()` will hide the Skin
  from the wardrobe anyway.

#### Runtime Gate integration (R13.5)

The browser Loader (`src/engine/skin-asset/loader.ts`) reads the
`<url>.quality-gate-report.json` it wrote in step 4 before returning the
GLB. On `valid: false` it throws `QualityGateRejectedError`; the
`CharacterVisual` dispatcher logs a `console.warn` and falls back to the
procedural EggMesh so gameplay never blocks.

The wardrobe (`Hub.tsx`) hides rejected Skins via
`useRejectedSkinIds()` from `src/engine/skin-asset/gate-registry.ts`. So a
rejected Skin is invisible to the player — even when the runtime fallback
would have kept things playable.

### 5. Register in `SKINS`

Edit `src/game/skins.ts`:

```ts
{
  id: "<skin-id>",
  name: "<display name>",
  rarity: "rare" | "epic" | "legendary",
  kind: "none",
  tint: "#RRGGBB",
  renderKind: "model",
  assetRole: "test" | "production",
  modelUrl: "/assets/skins/<skin-id>/lod0.glb",
  lod0: "/assets/skins/<skin-id>/lod0.glb",
  lod1: "/assets/skins/<skin-id>/lod1.glb",
  lod2: "/assets/skins/<skin-id>/lod2.glb",
  presentationProfile: {
    scale: 1.0,                       // tune in step 7
    verticalOffset: 0,
    rotationOffset: { x: 0, y: 0, z: 0 },
    contactShadowScale: 1.0,
  },
  animationProfile: { status: "static" }, // upgrade to "embedded" once clips exist
  assetManifest: { /* copy fields from lod0.asset-manifest.json */ },
},
```

Test assets: also add the id to `STARTER_SKINS` so the wardrobe shows
it without a gacha roll.

### 6. Inventory update

Add a row to `docs/skins/third-party-assets.md` "Asset Inventory" table
with the new skin's path, role, provenance, and license.

### 7. Preview + tune

Start the dev server (the preview is dev-only — `npm run dev` listens on
`0.0.0.0:8080`, see CLAUDE.md hard constraint).

Open: `http://localhost:8080/dev/skin-preview?skin=<skin-id>`

Use the orbit controls + Reload GLB button to iterate on
`presentationProfile.scale / verticalOffset / rotationOffset` until the
Model lines up with the procedural EggMesh silhouette. The page header
shows the asset role; a `test` asset triggers a yellow "Test asset —
production characters would require PBR + Animation" banner.

### 8. Tests + verification

```bash
npm run typecheck       # 0 errors
npm run lint            # 0 errors
npm run test:skin       # factory + mock-provider + loader + validator + gate
npm run build           # succeeds
```

Add new test cases only when the Skin introduces a new code path (e.g. a
new presentation profile field, a new Provider). Do NOT touch the existing
test suites.

## Guard rails

- **No API keys in source** — the Provider module reads `process.env.*`.
  Any literal `MESHY_API_KEY=...` line in a tracked file is a hard fail.
  `grep -rE '(MESHY|RODIN|TRELLIS)_API_KEY\s*=' src/ scripts/` must return
  zero matches.
- **No fake GLBs** — the demo GLB is built by `scripts/seed-demo-glb.mjs`
  from real geometry. Do not patch the binary or write a hand-crafted
  `glb` file with literal triangles.
- **No physics changes** — Model Skins mount inside the existing
  `<group ref={visual}>` inside `<RigidBody>`. Do not add new colliders,
  alter the capsule, or change controller offset.
- **No production route exposure** — the `/dev/skin-preview` route is
  gated by `import.meta.env.DEV` and returns `notFound()` in production.

## Output

When the Skill completes, the user has:

1. A new `SKINS` entry visible in the Wardrobe with a GLB badge.
2. A passing Quality Gate report under `public/assets/skins/<skin-id>/`.
3. A row in `docs/skins/third-party-assets.md`.
4. A dev preview URL that loads the new character.
5. A passing `npm run test:skin` + `npm run build`.

## References

- `docs/skins/character-asset-contract.md` — runtime contract
- `docs/skins/asset-pipeline.md` — end-to-end flow diagram
- `docs/skins/third-party-assets.md` — asset inventory
- `docs/skins/skin-generation.md` — authoring guide + Grok prompt template
- `src/engine/skin-asset/provider/` — Provider interface + 4 implementations
- `scripts/validate-skin-asset.mjs` — Asset Validator
- `scripts/quality-gate.mjs` — Asset Quality Gate
- `src/components/CharacterVisual.tsx` — runtime dispatcher
- `src/components/DeveloperSkinPreview.tsx` — dev-only preview surface
