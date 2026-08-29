# Skin system

Skin changes **who you look like**. Skin never changes **how you play**.

## Contract

- Gameplay (move, jump, pounce, roll, boost, capsule) is independent of `visualId`.
- A skin is a `SkinDefinition` in the catalog, not a branch in `EggRacer`.
- `modelType`: `base` (default yolk), `modular` (yolk + accessory), `full_character` (replacement silhouette).
- Visuals resolve through `visualId` → registered mesh component.
- Unowned skins may preview in wardrobe; Equip is owned-only.
- Collision, camera gameplay, and cooldowns ignore mesh bounds.

## Adding a skin

1. Add a `SkinDefinition` to the catalog.
2. If `full_character`, register a visual in `SKIN_VISUALS`.
3. Optional: `animationProfile` (`default | bouncy | hero`).
4. Do not edit Home / Gacha / Victory / EggRacer conditionals.

## Performance

- Share geometries at module scope.
- Do not reload assets per page.
- Full characters must stay inside the existing capsule visually (scale to yolk, not the reverse).
