# PRD — Phase 8 Spatial Copy

## Problem

Sky Bounce now has playable space (width rhythm, no corridor walls, camera follows pad width). The other seven courses still look like a walled demo: `NeonRails` at ±10.2, hugging trees at ±8.2, start/finish packed, no overtake plaza. The player asked to plan this in Trellis and finish the copy.

## Goal

Locked courses feel like rooms in a world, not a hallway. Width stays a design tool. Teaching identities do not move.

## In

- Engine: remove full-length corridor rails on every course; side world is instanced, not hugging trees
- Copy Sky spatial rhythm onto locked courses: meadow, ice, factory, pirate
- Identity courses (dessert / cloud / finale): start + finish plazas only, no mechanic rewrite
- Camera already scales with local width — keep it
- Layout tests + `npm run test:visual` + start-plaza screenshots
- Update `docs/gameplay/level-spatial-audit.md` and level-design spec rule 16

## Out

- `×2` every pad
- New gadgets, abilities, currency, gacha, skins, Rapier, bot AI
- Rebuilding dessert / cloud / finale as teaching courses
- Moving ice tongue, factory hammer pads, pirate collapse lane, meadow pounce pads
- Curves / spline track compiler
- Sky pad rewrite (already gold)

## Identity that must stay

| Course | Keep narrow / keep mechanic |
|---|---|
| meadow | jump 3.45, pounce 3.4–3.6 side pads, roll gates |
| ice | tongue 6.4, slide 6.5, ice jump 2.2 |
| factory | hammer pads ≤ 7.4 (cannot walk around) |
| pirate | first-pit collapse, lane 6.2, drop tiles |
| sky | already locked spatial gold |

## Success

- No course renders full-length `NeonRails`
- Each locked course: start ≥ 18, at least one arena ≥ 18, finish ≥ 18
- Teaching chokes still fail naive W where they did before
- Bots still compile the safe line (`|x| < 4.2`)
- `npm run test:visual` + `tsc --noEmit` pass
