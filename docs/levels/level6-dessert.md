# Level 6 — 甜品工厂 Gameplay Spec

Same pipeline as L1–L5. Do not add hammers, spinners, lifts, bounce jelly, or a gadget parade. Chocolate *is* the obstacle. Roll and boost lock your heading on it.

## One-line core

**“巧克力会滑。滚过去、冲过去，别在上面慢慢走。”**

## Core mechanic

| | |
|---|---|
| Primary | Syrup = ice. Walking slides. Roll / boost lock direction and cross it. |
| Optional | Right syrup highway (`\|x\| >= 4.2`) skips the first jump. Boost is faster. |
| Risk | Coins on the highway. Walk it and you wobble. |
| Recovery | Shelves under both cake jumps. |

Holding W into the first chocolate **hits the low gate** (soft stun). That is the lesson. Roll through. Bots ignore the gate and walk the cake/chocolate line. The course fails if chocolate is just “brown ice with a spinner.”

Engine fact: `EggRacer` sets `vx/vz` from wish on ice (`grip=1.55`), but **roll / dash overwrite** to locked heading. The combo is already in the mover.

## Numbers (intent, tune in playtest)

| | |
|---|---|
| First clear | 45–90s |
| Expert | ~20–35s |
| Length | startZ 8 → finishZ ≈ −130, span ≥ 120 |
| Jump | 3.45 on cake (walk dies, lip jump lives) |
| Connect | 0.14 |
| Chocolate depth 1 | ≥ 13 so a roll (≈6.5m) finishes before the next cake |
| Chocolate depth 2 | longer, same mechanic + boost ring |
| Safe line | x ≈ 0, cake + chocolate, `lane: safe` |
| Highway | x ≈ 6.8, ice, `lane: side` |
| Recovery | top y < −0.5 |
| Stars | 4 |

Safe line never requires pounce, roll, or the highway. Bots jump the cake pits. No dash-sized gaps (`> 4.4`). No bounce, conveyor, hammer, spinner, mover, wind.

## ASCII

```
 z+  START 20 cake          spawn plaza
      |
     intro 12 cake          see brown syrup ahead
      |
     choco1 12 ice d≈14     === LOW GATE ===     [roll or soft-stun]
      |
     cake1 12               rest                 [SAFE]
      | \
      |  \ recJump
      |  \ syrup highway x=+6.8 ice             [boost skip]
     JUMP 3.45
      | /
     land1 12
      |
     mid 20 cake            SWEET ARENA          [CP]
      |
     choco2 12 ice d≈22     GATE then BOOST RING [same lesson harder]
      |
     cake2 12               rest
      | \
      |  \ recFin
     JUMP 3.45
      | /
     finale 12 cake
      |
     FINISH 20 cake
 z-
```

## Sections

| id | purpose | mechanics | fail |
|---|---|---|---|
| intro | see chocolate, not a candy hall | move | none |
| syrup1 | roll on ice or bounce off the gate | roll, ice | soft stun |
| jump1 | cake pit after the lesson | jump | medium rec / hard |
| arena | overtake plaza | boost | none |
| syrup2 | longer chocolate, roll then boost | roll, boost, ice | soft stun |
| jump2 | last cake pit | jump | medium rec / hard |
| finale | grippy sprint | move | none |

## Routes

- **Safe:** cake → chocolate (walk; bots) → jump → chocolate 2 → jump → finish.
- **Player:** roll the first gate, boost the second chocolate, optional highway skip.
- **Recovery:** under both jumps, stairs off the safe lane.

## Obstacles (exhaustive)

1. Chocolate pads (`kind: "ice"`, brown).
2. Two player-only low gates on those pads.
3. One boost ring on choco2.
4. Two cake jump pits (3.45).
5. One side syrup highway.

Forbidden on this course: hammer, spinner, pendulum, bounce jelly, conveyor, lift, wind, drop tiles.

## Pickups

- Coins on cake rests and on the highway.
- Shield on the highway.
- Ring on choco2 (look-up tell for boost).

## Checkpoints

1. Start plaza.
2. After first chocolate + jump (`land1` / `mid`).
3. After second chocolate (`cake2`).

## Playtest

- Naive W: first gate stops them (`rolls=0`, z before choco1 front).
- Roll at the gate: they pass chocolate and reach the cake jump.
- Lip jump the two pits.
- Highway is faster if boosted; not on bot waypoints.
- Bots: `botMinZ` past `finishZ`, 3–4 finished. They may slide but the 12-wide chocolate holds them.
