# Check — Phase 4 presentation slices

## Slice 1 Wardrobe
- [x] `resolveSkinAppearance("knight").prototype === true`
- [x] `resolveSkinAppearance("plain").prototype === false`
- [x] Wardrobe camera default yaw shows the face (not the back)
- [x] Drag orbits; pinch does not enter the mesh
- [x] Unowned Knight/Bear preview in 3D; Equip disabled
- [x] Equip owned skin → title racer matches after leaving wardrobe
- [x] Track/bots hidden in wardrobe
- [x] Procedural accessory skins still render (sprout / mint_wings / baseline tests)
- [x] `npm run test:visual` pass
- [x] No gacha weight change

Slice 1 visual smoke: `output/phase4-wardrobe/` (mobile 390).

## Slice 2 Gacha 3D Reveal
- [x] Pull from 背包 → capsule ceremony → live 3D CharacterVisual (no SkinMark circle)
- [x] Gacha studio hides track/bots, shows stage, front yaw
- [x] Bottom sheet: rarity / name / 原型外观 / 收下
- [x] Duplicate does not leave the pulled skin as the meadow preview after 收下
- [x] Weights unchanged 60/28/10/2

## Slice 3 Home platform
- [x] Title home: podium disc on meadow, 3/4 front of equipped skin
- [x] PLAY / nav stay; race marker hidden on the podium
- [x] Leaving wardrobe / victory / 收下 resets to home yaw (not leftover orbit)
- [x] 收下 lands on the home podium, not under the inventory sheet

## Slice 4 Victory hero
- [x] Results: studio + live 3D character above a bottom sheet
- [x] No full-screen dim covering the racer
- [x] HOME returns to the meadow podium

Not this pass: animation clip mixer, Meshy HTTP, new skins.

Visual smoke: `output/phase4-presentation/`.
