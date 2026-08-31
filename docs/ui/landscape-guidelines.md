# Landscape guidelines

Primary device: iPhone landscape, short axis ≈ 393–430px.

1. Height is the budget. Width is surplus.
2. Put navigation on the **long** leftover: a left rail, not a bottom tab bar.
3. Put secondary UI in a **right dock**, not a 58% bottom sheet.
4. The 3D character is the main view. Type and chrome yield.
5. If PLAY is not visible without dragging, the layout failed.
6. Safe-area in landscape is left/right first.
7. `md:` is not landscape. `(orientation: landscape) and (max-height: 520px)` is.
8. Inner pane scroll is allowed for collections. Body/page scroll is not.
9. Three stacked large buttons are forbidden on the short axis — use a row.
10. Do not fork a second app for desktop. Regions restyle; components stay shared.
