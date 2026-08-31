# Check — Phase 5

## Slice 1 menu chrome

- [x] Home 852×393: character visible, PLAY visible, no inner-scroll, nav is a side rail
- [x] Play: all four courses + PLAY on screen without dragging
- [x] Settings: 返回 on screen, no clipped sliders
- [x] Wardrobe: 3D larger than the gallery dock
- [x] Gacha reveal: character not covered by the sheet
- [x] Victory: title + stats + three actions on one screen
- [x] Portrait 390×844 still usable (regression)
- [x] `npm run test:visual` / typecheck
- [x] No gacha weight or movement changes

## Slice 2 gameplay HUD

- [x] Race 852×393: chips one row (27px), standings hidden, HUD no longer a 160px stack
- [x] Action Pad ~0.45 of short axis, bottom-right + safe-area
- [x] Pause: 继续 + 返回首页 in one row, no clip
- [x] Countdown compact (no `md:` blow-up)
- [x] Pad / joystick / look logic unchanged

## Slice 3 polish

- [x] Play dock: PLAY is a footer, grid does not inner-scroll
- [x] Victory landscape: right dock + row actions, character left of the sheet
- [x] iPhone 17 Pro Max 932×430: rail + PLAY
- [x] Portrait settings: 返回 visible
