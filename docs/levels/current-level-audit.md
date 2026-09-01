# Current Level Audit — Phase 6 Step 1

Source of truth: `src/game/levels.ts` on current main. This is a design audit, not a rewrite. Ice, factory, sky, and pirate later matched their identities (`docs/levels/level2-ice.md`, `docs/levels/level3-factory.md`, `docs/levels/level4-sky.md`, `docs/levels/level5-pirate.md`). Dessert–finale remain identity-only.

## Verdict

The data model can already express a race: platforms, movers, hammers, spinners, pendulums, rings, pickups, trap tiles, wind, checkpoints, spawns, waypoints.

What it actually *authors* is eight themed **obstacle strips**:

```
straight pad (x = 0) → gadget → straight pad → gadget → finish
```

Theme, sky, and one signature prop change. Route, rhythm, and decision-making do not. “Technically runnable” is not the same as “designed to be played.”

## Shared geometry

All eight courses:

- Run **−Z**, startZ ≈ 8, finishZ in `[-76, -110]`.
- Almost every pad is **x = 0**, top **y = 0**.
- Length 84–118 units. At `MOVE_SPEED = 8.4` that is ~10–14s of pure running.
- `bots` 4–7, all following the same compiled waypoint chain.
- Checkpoints are start + one mid + sometimes a late pad — placed by distance, not by “challenge completed.”

Lateral offsets that exist today are decorative or accidental (`pounceA/B` at x=5.6, ice cracks at ±3.4, pirate `safe` at x=4.2, a few sky islands). They are not a route graph.

## `compile()` — geometry guessing design

```86:122:src/game/levels.ts
function compile(partial: Omit<Level, "waypoints" | "coinCount">): Level {
  const walk = [
    ...partial.platforms
      .filter((p) => Math.abs(p.pos[0]) < 4.2)
      ...
  ].sort((a, b) => b.z - a.z);
  // gap > 1.4 or height +0.35 → jump
  // gap > 4.4 → dash
}
```

Consequences:

| Rule | Effect |
|---|---|
| `\|x\| < 4.2` | Side routes (meadow pounce pads, pirate safe) are **invisible to bots**. |
| No Y filter (before this slice) | A recovery shelf at y < 0 would become a bot waypoint. Bots would dive off the course. |
| `gap > 1.4` → jump | Flush pads (`gap ≈ 0.1`) never teach jump. A 0.28m step is walked (`autostep = 0.38`). |
| `gap > 4.4` → dash | Bots dash; they **cannot pounce or roll**. A required pounce on the main line is an unfinishable bot path. |
| Sort by z only | Two pads at the same z (ice `crackL/R`) produce an unstable zigzag. |

`compile()` is a **bot convenience**. It must not be the level-design source of truth. Design specifies “this gap is a Jump / this is a Pounce shortcut / this is recovery.” Geometry then matches that intent. Waypoints follow the **safe** line so bots finish.

## Player abilities vs current courses

From `src/game/config.ts` + `src/game/abilities.ts` + `EggRacer.tsx`:

| Ability | What it actually does | What current courses demand |
|---|---|---|
| Jump (`JUMP_V=9.5`, hang ~0.68s, air ~5.0 units) | Height + modest gap | Almost never required on meadow. Sky islands are the exception. |
| Pounce (13.2 × 0.36s, `vy=5.5`) | Locked forward leap. Jump→pounce covers ~6.2 | Meadow right pads exist, but the main line does not need them. |
| Roll (11.2 × 0.58s) | Speed + visual squash. **Capsule does not shrink** | No course has a low gate. Roll is a cosmetic button. |
| Boost (charged dash 12.2–20.2) | Burst speed | Rings grant a free dash; no course makes Boost the answer to a space problem. |

Soft vs hard fail today:

- **Hard:** `y < KILL_Y (-12)` → last checkpoint, `setFail("掉下去了")`.
- **Soft-ish:** hazard hit → stun 0.28, bounce, fail hint, keep running.
- There is **no recovery route**. Miss a jump and you fall to kill plane.

## AI / bots

`EggRacer.tsx` bots seek `waypoints[wp]`, advance at dist < 1.7, jump if `wp.jump && dist < 4.5`, dash if `wp.dash && dist < 5.5`, plus a 0.4% random jump.

They are **path-following agents**, not racers:

- One line, one skill set (jump/dash).
- No route choice, no pounce/roll, no catch-up beyond whatever the player’s mistakes create.
- `lane * 0.35` is a spawn offset, not a second line.

Phase 6 does **not** rewrite AI. Level 1 keeps bots on the safe compiled line. Side routes stay at `|x| >= 4.2` so bots ignore them. Different routes for bots is Phase 7.

## Checkpoints / fail recovery

Respawn uses `level.checkpoints` ordered by decreasing z. `L.cp` only advances on a kill-plane fall (it catches up by comparing `nz` to later `z` values). Passing a checkpoint without falling still respawns at the last one you had *physically gone past* at the moment of death — that part works.

What does not work as design:

- Checkpoints are not “after a challenge.”
- No medium-fail shelf. Every pit is hard fail.
- First-clear time is dominated by falling off a demo gap, not by learning a skill.

## Eight-level table (current vs intended identity)

Design-only for 2–8. Do not rebuild them this slice.

| Id | Name | Stars | Length (z) | What it is now | Intended core | Intended routes | Signature (target) |
|---|---|---|---|---|---|---|---|
| meadow | 糖果草原 | 1 | 8 → −76 | Connected pads, 0.28 step, optional right pads bots never take | Teach Move / Jump / Pounce / Roll / Boost | Safe center, right pounce shortcut, left/under recovery | “Jump 不够，Pounce 抄近路” |
| ice | 冰雪滑坡 | 2 | 8 → −78 | Ice pads + crack L/R + one floe | Ice steering / braking | Center slide vs crack sides | 滑坡上改方向 |
| factory | 旋转工厂 | 3 | 8 → −86 | Hall, two hammers, conveyor, spinner, piston, pendulum | Timing / rhythm | Single line with wait-windows | 看锤再过 |
| sky | 天空弹跳岛 | 3 | 8 → −82 | Bounce islands, slight x drift, cloud mover, updraft | Aerial commits | Island graph (high/low) | 连跳选落点 |
| pirate | 海盗港湾 | 4 | 8 → −126 | Stripe pits + left run pier + ship jump. See `docs/levels/level5-pirate.md`. | Multi-route / read the floor | Safe center, fast-left drop pier, boat merge | 条纹板会塌，左边抄近路 |
| dessert | 甜品工厂 | 4 | 8 → −84 | Ice-as-choco + jelly + conveyor + spinner + lift | Skill combo | Safe walk vs syrup speed | 糖浆上 Roll+Boost |
| cloud | 云端竞速 | 4 | 8 → −90 | Rising pads, three rings, tailwind, gust mover | High-speed Boost | Wide sprint vs ring line | 风场冲刺 |
| finale | 终极派对 | 5 | 8 → −110 | Ice + hammer + jelly + spinner + belt + pendulum + wind, in a row | Mix of taught skills | Safe vs greedy line through the mix | 最后二十米全用上 |

### Per-level gaps (current)

**meadow.** Main pads are flush (`gap ≈ 0.08–0.20`). `step1` top 0.28 is autostepped. Jelly is a bounce on an otherwise connected strip. `pounceA/B` at x=5.6 are the only designed shortcut, and `compile()` drops them. First-clear is a 15–25s jog, not a 45–90s lesson.

**ice.** Real ice surface. `crackL/R` are a weak dual line (both at z=−40, both `|x|<4.2`, bots zigzag). Floe is a single lateral mover. No recovery under the cracks.

**factory.** The closest thing to a rhythm course, still a straight hall. Hammers/spinner/pendulum/piston are a gadget parade, not SAFE→CHALLENGE→SAFE.

**sky.** Bounce pads + island jumps. High islands at `|x|>=4.2`. Recovery under pits. See `docs/levels/level4-sky.md`.

**pirate.** Stripe pits + left run pier. Walk falls on the first collapse; jump lands. Fast pier at `|x|>=4.2`. Recovery under pits. See `docs/levels/level5-pirate.md`.

**dessert.** Factory gadgets with dessert materials. Ice + bounce + conveyor + spinner is “one of each,” not a combo line.

**cloud.** Rings + tailwind are the right hook, but the road is still a straight staircase of pads.

**finale.** Concatenates the gadgets. A recap gauntlet is the right *identity*; it is not yet a recap of *taught* skills, because Level 1 never taught them.

## Constraints this slice will not break

- Do not rebuild Rapier, Action Pad, gacha weights, skin pipeline, Provider/Loader/Quality Gate.
- Roll **cannot** physically duck a solid bar (capsule stays `[EGG_HALF, EGG_RADIUS]`). A low gate must be a **player-only overlap volume** that stuns if `rollT <= 0`. Bots ignore it so `compile()` paths still finish.
- Bots only jump/dash. Main/safe line must be finishable with jump + dash. Pounce, roll, boost are player advantages.
- Level 1 art keys off platform ids (`start`, `path`, `step1`, `land1`, `plaza`, `pounce*`, `jelly`, `landj`, `gapA`, `final`). Redesign keeps or remaps those ids; it does not invent a second art system.
- `compile()` stays. Surgical filter only: skip pads with top y < −0.5 so recovery shelves are not bot waypoints.

## Level 1 is the vertical slice

Do not refactor all eight. Gold-standard **糖果草原** first:

1. Audit (this file)
2. Identity for all eight (table above — design only)
3. Choose meadow
4. ASCII layout → `docs/levels/level1-meadow.md`
5. Blockout `meadow()` only
6. Playtest jump / pounce / roll / boost / fail / shortcut / bots
7. Tune gaps, landing, fail, camera, speed
8. Gameplay lock
9. Art pass in the existing candy-meadow style
10. Visual smoke
11. Performance (mobile 30fps, no extra RT / post / shadows)
12. Trellis spec
13. Commit

## Production pipeline (locked)

```
level-designer  →  spec (no code)
        ↓
level-implementer  →  Level definition
        ↓
level-playtester  →  run / fail / skills / camera / bots
        ↓
level-polisher  →  art / VFX / audio after gameplay lock
```

Skills live under `.grok/skills/` (this workspace; the prompt’s `.agents/skills/` maps here).
