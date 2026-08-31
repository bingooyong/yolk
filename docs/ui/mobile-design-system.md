# Yolk Rush Mobile UI Design System

Cute / playful / premium arcade. Not a dashboard. Not a marketing site.

## Layers

| Layer | Job |
|---|---|
| Canvas | Full viewport. Gameplay + character. |
| HUD / Menu overlay | Floating, compact, pointer-events only on chrome. |
| Modal | Pause / Settings. Medium card, never a fake page. |

## Page kinds

| Kind | Scroll | Examples |
|---|---|---|
| A Gameplay | Never | Race HUD, countdown, pause overlay |
| B Menu | Never (page). Local lists only | Home, Play, Settings, Victory, Gacha reveal |
| C Collection | Local container only | Wardrobe grid, Inventory list |

`body` stays `overflow: hidden`. If something scrolls, it is an **inner** pane.

## Compact landscape (primary)

`@media (orientation: landscape) and (max-height: 520px)`

iPhone 17 landscape is ~852×393. Design the **height** first.

### Regions

```
┌──┬──────────────────────────┬─────────────┐
│N │                          │ dock / CTA  │
│A │     3D character         │             │
│V │                          │             │
└──┴──────────────────────────┴─────────────┘
```

- **NAV:** left rail, icons, short labels. Includes `safe-area-inset-left`.
- **STAGE:** remaining canvas. The character is primary.
- **DOCK:** right sheet for Play / Wardrobe / Inventory / Profile / Gacha / Victory. Width `min(340px, 42vw)`. Inner scroll only.
- **HOME CTA:** PLAY on the right, vertically centered. No bottom stack.

Portrait keeps a compact bottom nav + shorter bottom sheet. Same components.

## Type

Tokens in `src/styles.css`. Landscape compact uses the lower bound.

| Role | Portrait | Compact landscape |
|---|---|---|
| Display (logo) | 28–32px | 22–26px |
| Title (sheet) | 20–24px | 16–18px |
| Body | 13–15px | 13px |
| Caption | 11–12px | 10–11px |
| Button | 14–16px | 13–14px |

No `Nvw` type. Display is for the logo only — not every `<h2>`.

## Space

4 / 8 / 12 / 16 / 20 / 24. Compact landscape sheet padding is **12**, not 20–24.

## Buttons

| Visual | Height | Hit |
|---|---|---|
| Compact | 40px | ≥44px |
| Default | 44px | 44px |
| Primary PLAY | 48px landscape / 56px portrait home | full control |

Do not stack three `lg` buttons on a 393px axis. Landscape actions go **in a row**.

## Touch

Visual chrome may shrink. Hit slop stays (`::after` on pads already). No hover-only actions.

## Safe area

- Landscape: pad **left and right** first (island / home indicator).
- Bottom inset still applied, but the nav is no longer a bottom bar in compact landscape.

## Motion

100–250ms overlay. Respect `prefers-reduced-motion`. No 800ms page choreography.

## Copy

Short verbs: PLAY / 装备 / 收下 / NEXT / PLAY AGAIN / HOME / 返回. One term per action.

## Hierarchy (must not invert)

| Screen | 1 | 2 | 3 |
|---|---|---|---|
| Home | Character | PLAY | Nav |
| Wardrobe | Character | Equip | Gallery |
| Gacha | Character | 收下 | Rarity line |
| Victory | Character | NEXT | Stats |
| Settings | Gear modal | Controls | — |

## What not to do

- Shrink type and keep the vertical stack.
- Duplicate DesktopPage / MobilePage.
- `md:`-only breakpoints for iPhone landscape.
- Full-bleed 90% modals.
- Long sentences on buttons.
