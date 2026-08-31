# Design — Slice 1 Presentation + Wardrobe Viewer

## Split two layers

| Module | Job |
|---|---|
| `character-presentation.ts` | Gameplay pose (squash / lift / contact). Unchanged. |
| `src/game/presentation/` | Showcase modes: camera, stage, appearance resolver. |

## Modes

`home | wardrobe | gacha | victory | gameplay`

Slice 1 **wires wardrobe only**. Other modes exist as profiles so later slices do not invent a second camera.

## Appearance resolver

`resolveSkinAppearance(skinId)` → `{ renderKind, visualId, modelUrl, prototype, animationCapability, animationFallback: "transform" }`.

- Procedural full_character → `prototype: true`, capability `procedural`
- Test GLB → `prototype: true`, capability `unavailable` (transform fallback)
- Yolk modular → `prototype: false`, capability `procedural`

No `if (skinId === "bear")` outside the registry.

## Wardrobe viewer

Reuse the existing Canvas (mobile cannot afford a second WebGL context).

When `phase === "title" && hub === "character"`:

- Hide Track + bots
- Mount `ShowcaseStage` (platform, studio fog)
- Camera from `PRESENTATION_PROFILES.wardrobe`
- Default yaw = π (camera on −Z, character faces −Z → front)
- Drag yaw; pinch distance clamp `[min, max]`
- Auto-orbit after idle delay; do not snap on release

Hub sheet stays; it becomes auxiliary (owned / locked / equip).
