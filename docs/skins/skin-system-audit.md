# Skin system audit (main @ 4ce0ce9)

## Current architecture

Skin data lives in a single `src/game/skins.ts` list. Each row is `{ id, name, rarity, kind, tint, hat? }`. `kind` is `none | hat | wings | cape | ears | halo | crown`.

Runtime:

- `EggMesh` reads `getSkin(skinId)` and hangs accessories on the shared procedural egg.
- `EggRacer` / `RacerField` pass `equippedSkin` for the local player; bots get hardcoded accessory ids.
- `Hub` Character / Inventory list the same array.
- `pullSkin()` rolls rarity weights 60/28/10/2 then a random skin of that rarity.
- `CharacterPresentation` already separates gameplay pose from the visual mesh (squash, lean, contact shadow). Collision stays a Rapier capsule.

## Current capability

- Cosmetic-only: no speed / jump / collider changes.
- Modular hats, wings, cape, ears, halo, crown on one yolk body.
- Gacha + duplicate refund + persist equipped id.
- Presentation pose is shared (good reuse).

## Limits

- A skin is not a character. Adding content means more attachments on the same egg.
- `if (skin.kind === ...)` style branching lives in `EggMesh`.
- No model file, skeleton, animation clip, VFX profile, or presentation profile.
- No asset loader / cache (everything is procedural geometry).
- Home, wardrobe, gacha, and victory do not share a Character Presentation mode.
- Unowned skins are greyed list rows, not 3D previews.
- No wardrobe orbit viewer.

## Reuse

- `CharacterPresentation` + `getCharacterPose` + contact shadow.
- Rapier capsule + ability state machine.
- Hub navigation, gacha ceremony overlay, store persistence of `equippedSkin`.
- Visual profile / lighting / camera from Phase 2.

## Must change

- Domain model: `SkinDefinition` with `modelType` (`base | modular | full_character`) and `visualId`.
- Visual registry instead of accessory-only `EggMesh`.
- Wardrobe: preview unowned full characters, orbit, equip only if owned.
- Gameplay adapter stays one capsule; visuals never write physics.
- Catalog remains data. New full characters register a visual component; EggRacer does not branch on skin id.

## Phase 1 result

Shipped in this change:

- `SkinDefinition` fields: `modelType`, `visualId`, `animationProfile`, `unlock`, `category`.
- `CharacterVisual` registry: `yolk` → EggMesh, `knight` → KnightMesh, `bear` → BearMesh.
- Wardrobe (衣橱): category chips, 360° drag, unowned 3D preview, Equip owned-only.
- Gameplay capsule / abilities unchanged; EggRacer does not branch on skin id.

