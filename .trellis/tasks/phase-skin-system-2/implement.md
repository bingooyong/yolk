# Implement — Phase 1

1. Extend `Skin` with modelType, visualId, category, animationProfile, description, unlock.
2. Register `knight` and `bear` full characters; keep existing modular skins as `visualId: yolk`.
3. `CharacterVisual` resolves registry; `EggRacer` uses it.
4. Store `previewSkinId`; wardrobe sets it; home/gameplay ignore unless title character hub.
5. KnightMesh / BearMesh: PBR, silhouette, face, no gameplay writes.
6. Hub character tab = wardrobe (categories, preview, lock, equip).
7. Tests: catalog ids, visual map coverage, getSkin fallback.
8. typecheck, lint, test:visual, build.
