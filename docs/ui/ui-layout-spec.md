# UI layout spec — compact landscape

Implements `mobile-design-system.md` on the current overlay (`Hub`, `GameUI`, `ResultScreen`, `GachaCeremony`, `SettingsPanel`).

## Breakpoints

```css
@media (orientation: landscape) and (max-height: 520px) { /* compact — iPhone landscape */ }
@media (orientation: landscape) and (min-height: 521px) { /* wide — iPad / desktop */ }
@media (orientation: portrait) { /* bottom nav + bottom sheet */ }
```

JS: `useDevice().portrait` already tracks orientation. Camera view-offset may use it. Layout itself is CSS.

## Chrome map

| Class | Portrait | Compact landscape |
|---|---|---|
| `.hub-nav` | Bottom bar | Left rail `56px + safe-left` |
| `.hub-brand` | Top-left | Top, inset past the rail |
| `.hub-cta` | Bottom-center above nav | Right-center, does not cover the egg |
| `.hub-panel` | Bottom sheet 38–58% height | Right dock `min(340px,42vw)`, full short axis minus 16px |
| `.hub-orbit` | Upper 42% | Stage between rail and dock |
| `.ui-modal` | Center card | `max-height: calc(100dvh - 16px)`, two-col body |
| `.result-sheet` / `.gacha-sheet` | Bottom sheet | Same dock language as `.hub-panel` |

## Home

Character owns the frame. PLAY is a pill on the right. Mute/settings stay top-right (already). No “选关开赛” caption in compact.

## Play

Dock: 2-col level cards (compact padding) + sticky PLAY. Opening Play must **not** require a drag to start.

## Wardrobe / Inventory / Profile

Same dock. Gallery/list scrolls **inside** `.hub-panel-body`. Equip / 抽蛋 stick to the dock footer when present.

## Settings

Two columns of sliders. Title is Title-size, not Display. 返回 always on screen.

## Gacha / Victory

3D stays in the stage. Sheet is the right dock. Victory actions: one row (NEXT primary, PLAY AGAIN secondary, HOME ghost).

## Camera (minimal integration)

Portrait + bottom sheet: keep vertical `frameLift`.  
Compact landscape + right dock: horizontal `setViewOffset` so the character sits in the stage, not under the dock. Home (no dock) clears the offset.

Do not remount the Canvas on rotate.

## Gameplay HUD

Compact landscape: one chip row, no standings list (place chip is enough). Fail hint sits under the chips, not over the thumbs. Action Pad `scale(0.8)` from the bottom-right, safe-area right/bottom. Pause actions in one row. Pad / joystick / look **logic** unchanged.
