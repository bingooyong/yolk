# PRD — Phase 9 Sky S-curve

## Problem

Width and walls are fixed. Every locked course is still a −Z strip. That is the leftover “demo track” read.

## Goal

Sky Bounce weaves (gentle S). The camera shows the turn. Bots still finish the safe line. No spline compiler.

## In

- `compile()` follows `lane: "safe"`, not `|x| < 4.2`
- Sky pads offset into a readable S after the first jump
- High islands stay a side room relative to the jelly
- Camera look-at leads toward the next safe pad so W follows the road
- Recovery / stairs follow the weave
- Sky layout tests + `test:visual`

## Out

- Spline / TrackSegment compiler
- Hairpins, 90° snaps
- Rebuilding dessert / cloud / finale
- Copying the weave onto ice/factory this pass
- New gadgets, bot AI rewrite, FOV spam

## Success

- Safe pads with `|x| >= 4.2` still compile as waypoints
- High islands still do not
- First jump still dumps naive W
- Camera looks at the next island, not only −Z
- `npm run test:visual` + `tsc` pass
