# Asset Pipeline

> End-to-end flow from "we want a new skin" to "the player can equip it".

```
┌────────────────────────┐
│ 1. Authoring           │   design doc / concept art / Meshy prompt
└──────────┬─────────────┘
           ▼
┌────────────────────────┐
│ 2. Provider call       │   server/routes/api/skins/generate.ts
│   (Meshy / Rodin /     │   ↳ reads MESHY_API_KEY etc. from env
│    Trellis / Mock)     │   ↳ returns GeneratedAsset { modelUrls.glb }
└──────────┬─────────────┘
           ▼
┌────────────────────────┐
│ 3. Download GLB        │   server/routes/api/skins/download/+server.ts
│                        │   ↳ fetches the GLB, stores under
│                        │     public/assets/skins/<skin-id>/lod{0,1,2}.glb
└──────────┬─────────────┘
           ▼
┌────────────────────────┐
│ 4. Validator           │   scripts/validate-skin-asset.mjs
│   scripts/validate-…   │   ↳ reads GLB, writes
│                        │     <glb>.asset-manifest.json
│                        │     (paths normalized to public URLs)
└──────────┬─────────────┘
           ▼
┌────────────────────────┐
│ 5. Quality Gate        │   scripts/quality-gate.mjs --role {test|production}
│   scripts/quality-…    │   ↳ reads manifest, applies role thresholds,
│                        │     writes <glb>.quality-gate-report.json
└──────────┬─────────────┘
           │  valid=true
           ▼
┌────────────────────────┐
│ 6. Skin entry          │   src/game/skins.ts (manual PR)
│   register in SKINS    │   ↳ renderKind: "model", modelUrl, lod0/1/2,
│                        │     presentationProfile, assetManifest, assetRole
│                        │     (modelUrl is the public URL, not the
│                        │      absolute filesystem path)
└──────────┬─────────────┘
           ▼
┌────────────────────────┐
│ 7. Runtime             │   src/components/CharacterVisual.tsx
│   CharacterVisual +    │   ↳ useRejectedSkinIds() filters the registry
│   SkinAssetLoader      │     before the wardrobe renders anything
│                        │   ↳ loader fetches GLB + sibling
│                        │     <url>.quality-gate-report.json
│                        │   ↳ valid:false → QualityGateRejectedError
│                        │     → console.warn + EggMesh fallback
│                        │   ↳ reads presentationProfile → transform-only
└──────────┬─────────────┘
           ▼
┌────────────────────────┐
│ 8. Player              │   Wardrobe card → onClick → setSkin(id)
└────────────────────────┘
```

---

## Server-only boundary

`MeshyProvider`, `RodinProvider`, and `TrellisProvider` constructors read
`process.env.MESHY_API_KEY`, `process.env.RODIN_API_KEY`,
`process.env.TRELLIS_API_KEY`. They MUST only ever be constructed from
server-only code paths:

```
server/routes/api/skins/generate.ts   (Nitro route handler)
server/routes/api/skins/download.ts
server/middleware/*
```

The browser bundle excludes `src/engine/skin-asset/provider/{meshy,rodin,trellis}-provider.ts`
because `vite.config.ts` resolves every `src/engine/skin-asset/provider/*`
import inside server-only call sites; the Vite native bundle config also
excludes the provider directory when building for iOS. See
`vite.native.config.ts` and `src/native-entry.tsx` for the iOS bundle
plumbing.

## Mock → real Provider switch

To promote a Skin from Mock to a real provider:

1. Provision the API key in the deployment environment (Vercel project
   settings → Environment Variables).
2. Add the Skin to the production role via `assetRole: "production"` and
   re-run the Quality Gate against `role: production`.
3. Update `docs/skins/third-party-assets.md` with the new asset inventory
   row.

No code change is required — `factory.createProvider(kind)` reads the env
vars at request time, so flipping `MESHY_API_KEY` from unset to valid
auto-constructs the real provider on the next request.

## Manual overrides

For local dev only, set `VITE_AUTH_ENABLED=false` and `MESHY_API_KEY=...` in
`.env.local`. NEVER commit `.env.local` or any file containing real API
keys. The repo's `.gitignore` already excludes `.env.local`; the CI lints
the source tree for `process.env.*_KEY` literals as a defense in depth.

## Cache control

`SkinAssetLoader` (browser) caches by `skinId`. To force a refresh during
development:

```ts
import { clearSkinAssetCache } from "@/engine/skin-asset/loader";
clearSkinAssetCache();     // all skins
clearSkinAssetCache(id);   // one skin
```

The dev preview page (`/dev/skin-preview?skin=…`) exposes a "Reload GLB"
button that calls `clearSkinAssetCache(skin.id)`.

## Path convention

`Skin.modelUrl` and the manifest's `model` / `lod.*` fields MUST be
**public-relative URLs** (e.g. `/assets/skins/_demo/egg-exported.glb`),
not absolute filesystem paths. The Validator normalizes paths through
`toPublicUrl()` whenever the GLB lives under the project's `public/`
directory, so a fresh validate run produces a manifest that's directly
consumable by `Skin.modelUrl` at runtime.
