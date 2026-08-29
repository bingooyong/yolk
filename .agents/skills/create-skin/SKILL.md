---
name: create-skin
description: Add a Yolk Rush character skin from a short concept. Registers a SkinDefinition and visual, never changes gameplay.
---

# Create skin

Read `.trellis/spec/frontend/skin-system.md` and `docs/skins/skin-production-guide.md` first.

1. Design silhouette, rarity, category, palette.
2. Add `SkinDefinition` to `src/game/skins.ts`.
3. If `full_character`, add a mesh under `src/game/visuals/` and register it in `SKIN_VISUALS`.
4. Do not branch on skin id in EggRacer / physics / abilities.
5. Wardrobe and gacha read the catalog automatically.
6. Run `npm run test:visual` and `npx tsc --noEmit`.

Phase 1 visuals: yolk, knight, bear. Rabbit / robot come later.
