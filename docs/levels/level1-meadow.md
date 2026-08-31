# Level 1 — 糖果草原 Gameplay Spec

Vertical slice. Blockout follows this layout. Do not add hammers, spinners, ice, or extra gadgets.

## One-line core

**“跳过近缺口。远台跳不够，扑才能抄近路。矮门要滚。直道就冲。”**

## Numbers (design intent, not spec law)

| | |
|---|---|
| First clear | 45–90s (hesitation + 1–2 medium fails) |
| Expert | clearly faster (~20–35s), not a fixed cap |
| Length | startZ 8 → finishZ ≈ −140 (tune in playtest) |
| Jump gap | ~3.45 (walk falls, jump lands) |
| Pounce gap | ~6.25 (jump falls short, jump→pounce lands) |
| Connect gap | 0.14 (flush, no jump flag) |
| Safe line | x ≈ 0, y = 0, `|x| < 4.2` so bots follow it |
| Shortcut / risk | `|x| >= 4.2` so `compile()` ignores them |
| Recovery | top y < −0.5 so `compile()` ignores them |

Player jump air travel ≈ 5.0. Ground pounce ≈ 4.8. Jump then pounce ≈ 6.2+. Bots only jump/dash: **safe line never requires pounce or roll.**

## ASCII

```
 z+  (behind)
     START  wide plaza, coins L/R          [move]
      |
     INTRO  path                           [see forward]
      |
     step1  takeoff, ring over the pit     [see the gap]
      | \ 
      |  \ recJump  y=-2.7  → stairs back  [medium fail]
     JUMP 3.45
      |  /
     land1
      | \ 
      |  \ pounceA  x=+5.6                 [jump 不够]
      |     |
      |    POUNCE 6.25 + coins
      |     |
      |    pounceB ----merge               [shortcut]
      |  /
     path2  CP-1                           [after jump lesson]
      |
     rollLane  === LOW GATE ===            [roll or soft-stun]
      |
     boostLane  long, rings, coin line     [boost is faster]
      |
     fork
      | \
      |  \ riskA/B  x=+5.5, jump, shield   [risk / reward]
     safeLane  wide, slower
      | /
     plaza  CP-2
      |
     gapA  takeoff
      | \
      |  \ recMix                          [medium fail]
     JUMP 3.45
      | /
     landj  second low gate                [jump then roll]
      |
     FINALE  wide sprint
      |
     FINISH
 z-
```

## Sections

| Id | Purpose | Mechanics | Fail |
|---|---|---|---|
| intro | Move, look ahead | Move | None |
| jump | Must jump. Coins in the arc | Jump | Miss → recJump (slow stairs) or kill → CP start |
| pounce | Optional right pads. Jump cannot make 6.25 | Pounce (jump→pounce) | Miss → recPounce or CP-1 |
| roll | Full-width candy bar. Standing stuns, roll passes | Roll | Soft: stun, keep going |
| boost | Long straight. Walking works, boost is obviously faster | Boost | None |
| split | Safe wide vs right jump + shield/coins | Choice, Jump | Miss risk → rec or CP-1 |
| plaza | Rest after a challenge | — | CP-2 |
| mix | Jump then roll on the same landing | Jump + Roll | recMix or CP-2 |
| finale | Wide overtake, finish | Boost optional | None |

## Routes

- **Safe:** center pads, jump gaps only, bots live here.
- **Shortcut:** `pounceA/B` — shorter Z, needs pounce, extra coins.
- **Risk:** `riskA/B` after the boost — shorter than `safeLane`, jump, shield + coins.
- **Recovery:** shelves under the two jump pits, stairs back. Time loss, not a restart.

## Skills the player must *use*, not just own

If a playtest finishes with jump-only and never pounces, the shortcut is not readable. If roll uses = 0, the gate is skippable or invisible. Fix the course, not the player.

## Art (after gameplay lock)

Reuse candy-meadow instancing in `level1-benchmark.ts` / `Level1BenchmarkArt.tsx`. Remap `ROUTE_PLATFORM_IDS` to the new safe-line ids. Do not invent a second art system. No extra render targets, post, or shadow maps.

## Out

Hammers, spinners, ice, conveyors, TrackSegment refactor, bot personality rewrite, live tuning panel, server telemetry.
