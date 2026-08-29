# Material System

## Color and light response

Renderer output is sRGB with ACES Filmic tone mapping. Texture color values that represent color should use `SRGBColorSpace`. Texture values that represent lighting ramps should use the non-color-data path; do not color-manage a ramp as if it were an albedo image.

## Character materials

`EggMesh` uses shared core geometry and a deliberate split of Standard and Physical materials:

- Shell/body: Standard, low metalness (`0.02`–`0.08`), with matte-to-satin roughness.
- Belly/lower band: distinct roughness so the silhouette reads in directional light.
- Eyes/catchlights: Physical with clearcoat; catchlights are geometry and emissive accents, not a downloaded texture.
- Wings/cape: Physical sheen and controlled transparency/opacity.
- Halo/crown-style accessories: higher metalness and clearcoat; emissive intensity stays restrained.

The unchanged controller capsule and environment gap remain authoritative. `character-presentation.ts` applies only the calibrated visual root lift. Character state changes must animate transforms, scale, opacity, or emissive values—not gameplay fields or collider bounds.

## Course materials

Current platforms and hazards use Lambert for inexpensive lit geometry, Basic for unlit neon/glow accents, and shared canvas-generated textures. A material must communicate a gameplay semantic before it adds detail:

- Normal platform: stable saturated top and darker side.
- Ice: cool/glossy reading and lower friction semantics.
- Bounce: high-energy accent.
- Conveyor: directional stripes.
- Hazard: warm red/high-contrast warning.
- Boost/checkpoint: teal/restrained emissive.
- Finish: readable frame, banner/flag accents, and a short cross-trigger beat.

Large Level 1 decoration should share geometry and materials and prefer instancing. Do not import third-party textures, models, UI, or protected character designs. Screen-space bloom, AO, and DoF are not part of this material baseline.
