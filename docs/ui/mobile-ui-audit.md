# Mobile UI Audit — Phase 5

Date: 2026-08-31  
Baseline: sandbox tree (Phase 4 presentation on top of Hub / Action Pad).  
Primary target: **iPhone landscape** (logical ~852×393 / 932×430).  
Evidence: `screenshots/phase5-audit/` at 852×393.

## Verdict

The overlay is a **portrait web sheet** (bottom nav + stacked title + bottom card). It does not become a game UI when the viewport rotates. Horizontal space is unused; vertical space is spent on type, padding, and a 58% sheet.

`html, body { overflow: hidden }` already blocks **document** scroll. The failure mode is **inner sheet scroll**: Play / Wardrobe / Inventory / Settings / Victory stack more block height than the short axis, so the player must drag to reach PLAY / 返回.

Viewport meta already has `viewport-fit=cover`. Safe-area insets exist on chrome, but landscape **notch is on the left/right**, while the nav still sits on the **bottom** — the expensive axis.

## Page table

| Page | Current problem | Landscape target | Scroll allowed | Priority |
|---|---|---|---|---|
| Home | Title + PLAY + 5-tab bar stacked on the short axis. PLAY covers the 3D character. Wide empty left/right. | Left rail nav, center character, right PLAY | No | P0 |
| Level Select | `max-h-[58%]` bottom sheet + `text-2xl` + `Button lg` + 2×2 cards. On 393px height the sheet is the screen; PLAY is below the fold. | Right dock: compact grid, PLAY sticky | No (grid may clip, not page-scroll) | P0 |
| Character / Wardrobe | Bottom 38% sheet + 3-col cards + color row. Character is a thin strip above the sheet. `frameLift` assumes a **bottom** sheet. | Right dock + 3D in remaining frame; horizontal view offset | Gallery local | P0 |
| Inventory | Same 58% sheet, featured banner, list rows, 抽蛋 at the bottom | Right dock, 抽蛋 sticky | List local | P0 |
| Profile | `text-3xl` name + stacked stats in the same sheet | Right dock, two-col badges | No | P0 |
| Settings | Centered `max-w-sm` form, 7 stacked rows, `text-2xl` title. 返回 clipped on 393px height | Compact modal, two-col sliders, 返回 always visible | No | P0 |
| Gacha reveal | Bottom sheet over 3D (portrait). Landscape still uses vertical stack | 3D center, info + 收下 as right dock | No | P0 |
| Victory | Full-width bottom sheet, `text-4xl`, three stacked `lg` buttons | Right dock, actions in one row | No | P0 |
| Pause | Center card, `text-3xl` + two `lg` buttons | Small center card | No | P1 |
| Gameplay HUD | Top-left chips + right Action Pad (already has a landscape scale). Not this slice | Overlay, thumbs, no page scroll | No | P1 |
| Action Pad | Exists; landscape `scale(0.86)`. Leave logic | Size / safe-area only later | No | P1 |

## What already fits Mobile

- Full-screen Canvas + DOM overlay (`pointer-events` split).
- Body `overflow: hidden` + `100dvh`.
- Action Pad + joystick + look zone (touch, not hover).
- Safe-area padding on mute/settings and the pad.
- One Hub component (no desktop/mobile page forks).
- CharacterPresentationSystem is **not** the layout problem.

## What is still Web-page thinking

1. **Bottom navigation on the short axis.** Five labels + safe-area eat ~72px of 393px.
2. **Vertical stack as the only composition:** brand → character remnant → sheet → nav.
3. **Display type used as decoration:** Hub `text-3xl` / `text-2xl` / PLAY `text-xl h-16` / Victory `text-4xl` / Settings `text-2xl` / Pause `text-3xl`.
4. **Sheets sized as a fraction of height** (`38%` / `58%`) instead of a **width dock** in landscape.
5. **Buttons all `h-12` / `h-16`.** Fine in portrait; three of them in a column overflow landscape.
6. **Dead TitleSheet** in `GameUI.tsx` still encodes “滑到下面解锁开始” — the old web-scroll lobby. Hub replaced it, but the idea remains in PlayPane.

## Font / height offenders (landscape 393px)

| Element | Class | Why it overflows |
|---|---|---|
| Hub title | `font-display text-3xl` | ~30px + tracking on a 393px axis |
| Hub sheet title | `text-2xl` | Plus 返回 row + `p-4` |
| PLAY home | `h-16 text-xl` | Sits in the character band |
| Play sheet PLAY | `size="lg"` after 4 cards | Below the fold |
| Settings h2 | `text-2xl` + `space-y-4` × 7 | 返回 clipped |
| Victory title | `text-4xl` + 3× `lg` | Sheet taller than remaining height |
| Profile name | `text-3xl` | Wasted vertical in the dock |

No `vw` font bombs. The bug is **fixed large type + vertical rhythm**, not fluid over-scale.

## Should be fullscreen, currently inner-scroll

- Home (inner not body, but PLAY/nav steal the stage)
- Level Select (sheet scroll to reach PLAY)
- Settings (modal taller than viewport)
- Victory / Gacha reveal (risk on 393px)
- Pause (usually fits)

## Vertical layout that wastes height

- Home: unused ~60% of width; all chrome on the height axis
- Play: character almost gone; cards + PLAY stacked
- Settings: one column of sliders
- Victory: trophy, stats, and CTAs stacked on the short axis

## Safe area / orientation gaps

- Notch in landscape is **horizontal**. Bottom nav does not yield left/right for the island.
- `frameLift` in CameraRig is **vertical** (bottom sheet). Wrong for a right dock.
- `useDevice().portrait` exists; overlay CSS almost never uses `orientation: landscape` except Action Pad scale.
- Settings / Pause / Result use `items-center` desktop patterns (`md:`) — height is the missing breakpoint.

## Breakpoint strategy (proposed)

| Token | Query | Intent |
|---|---|---|
| `portrait` | `orientation: portrait` | Bottom nav, bottom sheet |
| `landscape` | `orientation: landscape` | Side rail + side dock |
| `compact` | `landscape and (max-height: 520px)` | iPhone landscape. This is the primary game layout |
| `wide` | `landscape and (min-height: 521px)` | iPad / desktop preview; same regions, more padding |

Do **not** key off `md:` width alone. iPhone landscape is **wide and short**.

## Out of this audit (do not rebuild)

Skin pipeline, gacha weights, Rapier, Action Pad logic, BGM, CharacterVisual, presentation profiles (camera numbers may get a landscape view-offset only).
