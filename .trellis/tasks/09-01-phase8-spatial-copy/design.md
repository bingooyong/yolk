# Design — Phase 8 Spatial Copy

## Change boundary

- **Gap:** Seven courses still use path-width + corridor walls. Sky already has `SPATIAL` + no rails + camera extra.
- **Lives in:** `Track.tsx` (`NeonRails`, `Decor`), `levels.ts` pad widths/spawns, layout tests, spatial audit.
- **Not doing:** Sky pad rewrite, dessert–finale mechanic rebuild, bot AI, new gadgets, curves.

## Engine

`NeonRails` (2.5 m boxes at ±10.2, full course depth) come off every theme. `Decor` trees at ±8.2 come off. Non-meadow courses mount one `ThemeWorld` (the Sky instanced clouds/isles, recolored). Meadow keeps `Level1BenchmarkArt`. `CloudFloor` is 160 wide for every course.

Camera (`camExtraForWidth`) already global. Do not raise FOV.

## Width copy (rhythm, not multiply)

Use `SPATIAL` from `src/game/spatial.ts`.

| Pad role | Width | Apply |
|---|---|---|
| start / finish / mid plaza | 20 | all locked + identity start/finish |
| standard run | 12 | ice1, intro halls, pirate docks — if not a choke |
| wide / boost | 14 | meadow boostLane, ice rest after tongue, pirate safe1 |
| narrow / teach | keep | meadow jump 10, ice tongue 6.4, factory hammers 7.2, pirate lane 6.2, sky hopB 6.2 |
| shortcut | keep | meadow pounce 3.4, ice crack 3.8, factory catwalk 3.8, sky high 6 |

Recovery shelves widen under plazas (`SPATIAL.recovery`). Stairs stay `|x| >= 4.2`. Pirate left pier stays at `PIER_X = -5.5` so intro/land1 stay 11 (edge 5.5) — do not swallow the pier.

Spawns use a spread list so six racers occupy the start plaza.

## Compatibility

- `compile()` still `|x| < 4.2` and `y > -0.5`. Center pads remain x=0.
- Meadow art keys `ROUTE_PLATFORM_IDS`. Wider bounds only move edge strips. Midground must stay `|x| >= 14.5`.
- Factory test: `ham1.size[0] <= 7.4`.
- Sky tests already lock hopB / arena.

## Perf

Rails removed (two huge boxes). ThemeWorld is two `InstancedMesh` batches. Draw calls should drop, not rise.

## Rollback

Revert `Track.tsx` rails/world and the width numbers in `levels.ts`. Camera extra can stay.
