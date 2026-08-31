# Phase 4 Character Content Audit

Date: 2026-08-31  
Baseline: `origin/main` **f8a0307** (Rabbit + Robot + featured banner).  
Public notes that stop at `4ce0ce9` are stale: Knight / Bear / wardrobe / GLB pipeline already landed in `450fa5d`…`f8a0307`.

This audit is from the running tree, not GitHub snippets.

---

## 1. Skin Runtime

**Working.** `CharacterVisual` is the only gameplay visual switch. Order:

1. `renderKind: "model"` + `modelUrl` → `SkinAssetLoader` + Quality Gate  
2. `visualId` registry → Knight / Bear / Rabbit / Robot / EggMesh  
3. EggMesh fallback (never blocks movement)

`character-presentation.ts` is **gameplay pose only** (squash, lift, contact shadow). It is not a Home / Wardrobe / Gacha / Victory camera system.

Physics: one capsule. No skin-id branches in `EggRacer` movement.

## 2. Model Skin

**Pipeline exists, content does not.**

| Asset | Kind | Role | Animation |
|---|---|---|---|
| 12 yolk accessories | procedural modular | production | procedural transform |
| Default yolk | procedural base | production | procedural transform |
| Knight / Bear / Rabbit / Robot | procedural `full_character` | production catalog, **prototype mesh** | procedural transform (`hero` / `bouncy`) |
| `egg_demo_model` | GLB box | test | none |
| `lab_img3d_pilot` | TripoSR GLB | test | none |

Meshy / Rodin / Trellis providers are **stubs** (missing key throws). MockProvider + demo GLB prove loader + gate. There is **no production AI GLB**.

Do not pretend KnightMesh is a Meshy character.

## 3. 3D Preview

**Partial.** Wardrobe uses the **same race canvas**. `CameraRig` orbits `sim.showcaseYaw` when `hub === "character"`. `WardrobeOrbit` drags yaw. Auto-orbit resumes after 1.1s idle.

Missing: dedicated stage, pinch zoom, guaranteed front face, hidden track/bots, distance limits.

`/dev/skin-preview` is a separate orbit page, not the product wardrobe.

## 4. Wardrobe

**Product shell exists, presentation does not.**

- Hub bottom nav: 首页 / 比赛 / 衣橱 / 背包 / 我的  
- Owned preview + locked preview via `previewSkinId`  
- Equip owned-only  
- Categories: 全部 / 蛋黄 / 动物 / 奇幻 / 机甲 / 实验室  
- Sheet is ~44% of the screen; the character shares the frame with meadow + bots

Unowned skins already swap `CharacterVisual`. Cards are still the main UI, not a collection stage.

## 5. Gacha

**Ceremony state machine is real. Reveal is DOM.**

`GachaCeremony` drop → shake → glow → burst → reveal. Reveal mounts `SkinMark` / `FullSkinMark` (CSS circles). No 3D stage, no gacha camera, no orbit, no rarity lighting beyond color.

Weights 60 / 28 / 10 / 2 unchanged. Test skins excluded from `pullSkin`.

## 6. Home Character

Title canvas shows the **equipped** (or preview) racer in the meadow with bots. 3/4 camera, idle breath. Not a character platform. Equipped Knight/Bear **do** appear if equipped.

## 7. Gameplay Character

**Done for prototype meshes.** Equip Knight → race as Knight. Same `PlayerController`. Pose fallback (jump / pounce / roll / boost) is transform-only. No clip mixer, no crossfade.

## 8. Victory Character

`ResultScreen` is trophy + confetti + stats. **No skin.** The 3D world is still the finish camera behind the overlay, not a hero shot.

## 9. Top 10 blockers (commercial character experience)

1. **No Character Presentation layer** — Home / Wardrobe / Gacha / Victory / Gameplay each special-case cameras.  
2. **Wardrobe is still the racetrack** — character does not own the frame.  
3. **Default orbit shows the back** — `showcaseYaw = 0` sits the camera on +Z; yolk faces −Z.  
4. **Gacha reveal is SkinMark DOM** — the player never sees the 3D character they pulled.  
5. **Victory has no character.**  
6. **Knight / Bear / Rabbit / Robot are prototype primitives**, not production GLBs.  
7. **No SkinAppearanceResolver** — gacha/hub re-encode silhouette in CSS.  
8. **No animation clips / state machine** — only `getCharacterPose` squash. Must stay labeled fallback.  
9. **No auto-normalized bounds** — GLB scale is per-skin `presentationProfile`, procedural meshes are authored to yolk height.  
10. **No pinch-zoom, no stage lighting, no resource lifecycle** beyond the loader cache.

## 10. What already must not be rebuilt

- Provider factory / Meshy / Rodin / Trellis stubs  
- Validator + Quality Gate  
- `SkinAssetLoader` + `useRejectedSkinIds`  
- `SKINS` registry, gacha weights, `yolk-rush-v5` persist  
- Rapier kinematic controller, Action Pad, abilities  
- Hub IA and WardrobeOrbit drag  
- Procedural 12-skin baseline  

## 11. Phase 4 slice (this pass)

**In:** CharacterPresentationSystem (profiles + resolver) + Wardrobe 3D Viewer (stage, front face, orbit, pinch, owned/locked 3D preview).  

**Out:** Gacha 3D reveal, Home platform, Victory hero, Meshy HTTP, new skins, gacha economy.
