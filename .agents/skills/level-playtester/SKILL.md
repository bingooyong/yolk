---
name: level-playtester
description: >
  Run a Yolk Rush level like a new player and like an expert. Check route
  readability, skill use, fail fairness, checkpoints, camera preview, and
  bots on the safe line. Records session stats (jumps/pounces/rolls/boosts/falls).
metadata:
  short-description: "Play the blockout, report truth"
user-invocable: true
---

# Level Playtester

Play the running build. Do not redesign from the chair.

## Session stats

`window.__yolkStats` (and `sim` counters): jumps, pounces, rolls, boosts, falls, checkpoints, coins, time, finish.

A clean expert run that never pounces means the shortcut is optional *and* unreadable — say so.

## Human-like passes (minimum)

1. **New player** — hold forward, jump when a pit appears. Did they learn, or bounce off kill plane?
2. **Pounce discover** — jump the 6.25 pit, fail, then pounce / jump→pounce the yellow pads.
3. **Roll** — walk into the candy bar (soft stun), then roll through.
4. **Boost** — walk the long lane, then boost. Time delta should be obvious.
5. **Shortcut vs safe** — both finish. Shortcut faster if landed.
6. **Recovery** — miss a jump, land on the shelf, climb back, still racing.
7. **Hard fail** — fall past recovery, respawn at the last completed-challenge checkpoint, not at start unless they have not cleared one.
8. **Bots** — four bots finish the safe line without pouncing. They may clip the roll visual (player-only gate). They must not dive onto recovery.

## Camera / fairness

Player sees the pit or fork before they are on the lip. If a jump is a surprise, the approach pad is too short — fix layout, do not add FOV.

## Report

Best / average / worst time, falls, skill uses, one sentence on whether the player made a **choice**. If they only held forward + jump, the course failed.

Then hand numbers to implementer for tuning. Art is not next until gameplay lock.
