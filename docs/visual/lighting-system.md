# Lighting System

`src/game/LightingSystem.tsx` owns the scene light hierarchy. It follows the player every frame while keeping light direction stable.

## Roles

- **Key:** warm `#FFF3D8`, intensity `1.45`, offset `(10, 16, 8)`. This is the only shadow caster.
- **Fill:** cool `#D8EFFF`, intensity `0.32`, offset `(-8, 9, -4)`.
- **Rim:** warm `#FFE9B8`, intensity `0.45`, offset `(-4, 10, -12)`.
- **Hemisphere:** sky `#FFF5E8`, ground `#6EA7FF`, intensity `0.7`.
- **Ambient:** low `0.12` floor so shadows retain readable separation.
- **Environment:** procedural gradient cube at 16/32/64 px by quality, with 0.25/0.35/0.45 scene intensity.

## Rules

- Key, fill, rim, and their targets move with the player; do not introduce multiple expensive player lights.
- Only the key light casts shadows. Its orthographic extent is 22 units with a `-0.0004` bias.
- Low quality keeps the light composition but disables shadow maps and uses the smallest environment target.
- Procedural environment resources are created per quality mode, restored on unmount, and disposed; no HDR or network texture is allowed.
- Contact readability comes from the cheap anchored character shadow, not an additional render target.
- Volumetric light, bloom, ambient-occlusion, and depth-of-field passes are deferred until `?debug=perf` evidence shows budget headroom on target devices.
