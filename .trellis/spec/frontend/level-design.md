# Level Design Guidelines

## Scope / Trigger

Apply when changing course layout, `src/game/levels.ts`, checkpoints, roll gates, or level skills. Do not use this file to restyle characters or gacha.

## Stable rules (not live tunables)

1. **Design before pads.** ASCII + sections + routes exist before `Platform[]`. Specs live in `docs/levels/`.
2. **`compile()` is a bot helper**, not the designer. It infers jump/dash from safe-line gaps. It must not decide that a course is “about jumping.”
3. **Safe line is bot-finishable** with jump + dash only. Pounce, roll, and boost are player advantages.
4. **Side routes** sit at `|x| >= 4.2` so `compile()` ignores them. **Recovery** sits at platform top `y < -0.5` for the same reason.
5. **One core mechanic per course.** Do not stack hammer + spinner + conveyor + ice on a teaching level.
6. **Fails are tiered.** Soft = stun/slow and continue. Medium = recovery shelf. Hard = kill plane (`KILL_Y`) → last completed-challenge checkpoint. A small mistake is not a full restart.
7. **Checkpoints follow challenges**, not raw distance.
8. **Roll low-gates are player-only overlap volumes.** The kinematic capsule does not shrink. Do not add a solid Rapier bar and expect roll to duck it.
9. **No TrackSegment compiler this phase.** Author pads with explicit gaps (`extend(prev, gap, …)`). Do not auto-extrude a spline.
10. **Gameplay lock before art.** Polisher may not move locked pads. Meadow art stays on `Level1BenchmarkArt` / `level1-benchmark.ts` ids.
11. **Do not rewrite bot AI here.** Catch-up personalities are a later phase. Bots follow compiled safe waypoints.
12. **Do not put playtest tunables in this spec** (exact gap floats, hammer speed). Those live in the level file and the level’s design doc.

13. **Camera serves landings.** Gameplay chase-cam look-ahead uses `CAM_LOOKAHEAD`. Do not overwrite it to the egg’s feet. Airborne / bounce may lift the camera with the player; it may not hide the next pad.
14. **Checkpoints are felt.** Hitting one plays `sfxCheckpoint` (already in `audio.ts`) and a short hint. Silent `checkpointsHit++` is not feedback.
15. **Polish one locked course at a time.** Do not rebuild dessert–finale. Do not paste meadow’s roll gate onto the sky.

## Pipeline

`level-designer` → `level-implementer` → `level-playtester` / `level-playtest` → `level-polisher`

Skills: `.grok/skills/level-*/SKILL.md` (persisted copy: `.agents/skills/level-*/`). Lessons from L1–L5: `docs/levels/lessons.md`. Gameplay audit: `docs/gameplay/current-gameplay-audit.md`. Do not rebuild dessert–finale until named.

## Level 1 gold standard

`docs/levels/level1-meadow.md`. Level 2: `docs/levels/level2-ice.md`. Level 3: `docs/levels/level3-factory.md`. Level 4: `docs/levels/level4-sky.md`. Level 5: `docs/levels/level5-pirate.md`. Lessons: `docs/levels/lessons.md`. Other courses keep their **identity** from `docs/levels/current-level-audit.md` until a later slice rebuilds them.

## Validation

- Safe-line jump gaps are jumpable by bots; pounce pits are not on that line.
- Recovery and shortcuts are absent from `level.waypoints`.
- Session stats (`sim` / `window.__yolkStats`) record ability uses and falls for playtest.
- `npm run test:visual` includes meadow layout assertions.
