# Skin production

1. Concept (silhouette, palette, rarity)
2. SkinDefinition in `src/game/skins.ts`
3. Visual component registered in `SKIN_VISUALS` (`visualId`)
4. Animation profile only (`default | bouncy | hero`)
5. Wardrobe + gacha pick it up from the catalog
6. QA: load, scale, collider clearance, shadow, gameplay unchanged

Do not add `if (skin.id === ...)` in EggRacer, Hub, or CameraRig.
