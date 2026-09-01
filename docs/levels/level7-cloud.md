# Level 7 — 云端竞速 Gameplay Spec

Same pipeline as L1–L6. Do not add ice, bounce, hammers, gates, conveyors, or a gadget parade. Wind *is* the obstacle.

## One-line core

**“风会推你。侧风要改方向，顺风就冲。别只盯着脚下。”**

## Core mechanic

| | |
|---|---|
| Primary | Wind volumes. Crosswind dumps a W-only player. Tailwind is a sprint. |
| Optional | Right jet stream (`\|x\| >= 4.2`) — stronger tailwind, narrower |
| Risk | Coins on the jet. Miss the steering and you fall |
| Recovery | Shelves under the first crosswind (side dump) and both jumps |

Holding W into the first crosswind **will** slide off the cloud. That is the lesson. Steer against the arrows. Bots seek x=0 and hold a 12-wide pad. The course fails if “cloud” is just stairs and three rings.

Engine: `WindZone.force` XZ is **added speed** (m/s) while inside the volume. Y stays acceleration. Leaving the volume returns you to walk speed.

## Numbers (intent, tune in playtest)

| | |
|---|---|
| First clear | 45–90s |
| Expert | ~20–35s |
| Length | startZ 8 → finishZ ≈ −140, span ≥ 120 |
| Jump | 3.45 (walk dies, lip jump lives) |
| Connect | 0.14 |
| Crosswind 1 | ~+5.5 m/s X on a 12-wide, d≈16 pad |
| Tailwind | ~−8 m/s Z on a wide stream |
| Jet | x≈6.8, w≈6.2, ~−12 m/s Z |
| Crosswind 2 | opposite X, slightly narrower |
| Safe line | x ≈ 0, `lane: safe` |
| Recovery | top y < −0.5 |
| Stars | 4 |

Safe line never requires pounce, roll, or the jet. Bots jump the two pits. No dash-sized gaps. No ice / bounce / hammer / spinner / gate / conveyor / traps.

## ASCII

```
 z+  START 20             spawn plaza
      |
     intro 12             see arrows / cyan stream
      |
     cross1 12 d≈16       CROSSWIND →            [W-only dumps]
      | \
      |  \ recCross  wide shelf
      |
     rest1 12             SAFE
      | \
      |  \ recJump
     JUMP 3.45
      | /
     land1 12
      |
     mid 20               CLOUD ARENA            [CP]
      |
     stream 14 d≈22       TAILWIND  →→→          [sprint]
      | \
      |  \ jet x=+6.8 w=6.2  stronger wind       [risk]
      |
     land2 12             rest after stream
      | \
      |  \ recFin
     JUMP 3.45
      | /
     cross2 10 d≈16       CROSSWIND ←  harder
      |
     finale 12
      |
     FINISH 20
 z-
```

## Sections

| id | purpose | mechanics | fail |
|---|---|---|---|
| intro | see the stream, not a staircase | move | none |
| cross1 | W-only drifts off; steer | wind | medium rec / hard |
| jump1 | still a race | jump | medium rec |
| arena | overtake plaza | boost | none |
| stream | ride the tailwind | wind, boost | none on the 14-wide |
| jet | greedy extra speed | wind | medium / hard |
| cross2 | same lesson, other way | wind | medium rec |
| finale | last jump then sprint | jump | medium rec |

## Routes

- **Safe:** clouds on x=0, steer the crosswinds, jump twice, take the wide tailwind.
- **Player:** boost in the stream; jet is faster if you stay on it.
- **Recovery:** under cross1 and both jumps.

## Obstacles (exhaustive)

1. Crosswind volumes on `cross1` and `cross2`.
2. Tailwind volume on `stream`.
3. Stronger tailwind on `jet` (side).
4. Two jump pits (3.45).
5. Visible wind arrows (Track), not a popup.

Forbidden: ice, bounce, hammer, spinner, pendulum, gate, conveyor, lift, drop tiles.

## Pickups

- Coins on rests and on the jet.
- Shield on the jet.
- Rings at the mouth of each wind (look-up tell).

## Checkpoints

1. Start plaza.
2. After first wind + jump (`land1` / `mid`).
3. After the stream (`land2`).

## Playtest

- Naive W: first crosswind dumps them onto rec (`playerY ≈ −1.8` to −2.5), not a full restart.
- Steer against the arrows: they stay on `cross1`.
- Lip jump both pits.
- Jet is not on bot waypoints.
- Bots: `botMinZ` past `finishZ`, 3–4 finished.
