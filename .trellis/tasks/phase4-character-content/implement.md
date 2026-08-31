# Implement — Phase 4 presentation

## Slice 1 (done)
1. Add `src/game/presentation/` types, profiles, appearance resolver, ShowcaseStage, tests.
2. `sim.showcaseDistance` + `resetShowcaseView()`.
3. `CameraRig` wardrobe branch reads the wardrobe camera profile.
4. `GameCanvas` / `RacerField` hide track+bots in wardrobe; show stage.
5. `Hub` WardrobeOrbit: pinch + keep drag; CharacterPane: owned/locked badges.
6. `setHub("character")` resets yaw to front.
7. Update `.trellis/spec/frontend/skin-system.md`.
8. Playwright: 衣橱 → 蜜糖小熊 → 3D front, no track.

## Slice 2 Gacha 3D Reveal
1. `getPresentationMode(..., revealing)` returns `gacha` when `lastPull` is set.
2. `pullGacha` calls `resetShowcaseView("gacha")`. Hide Hub while revealing.
3. Rewrite `GachaCeremony` reveal: no SkinMark; orbit catcher + bottom sheet over live `CharacterVisual`.
4. EggRacer uses pulled skin id while `lastPull` is set.

## Slice 3 Home platform
1. Home profile: meadow + stage disc, `HOME_YAW` 3/4 front, slow auto-orbit.
2. `GameCanvas` mounts Track and ShowcaseStage independently; stage collider only when track is off.
3. `CameraRig` uses showcase camera for every non-gameplay mode.
4. `setHub("home")` / `toTitle` reset home yaw.

## Slice 4 Victory hero
1. Victory profile: studio, front yaw, frameLift over the results sheet.
2. `onPlayerFinish` resets victory view.
3. `ResultScreen` is a bottom sheet; 3D character is the hero.

Do not touch gacha weights, abilities, or provider stubs.
