# Level 4 — 天空弹跳岛 Gameplay Spec

Same pipeline as Levels 1–3. Do not add wind, cloud movers, hammers, ice, or a gadget parade. Bounce pads and island gaps *are* the obstacle.

## One-line core

**“果冻把你弹起来。看清落点再跳。高岛有金币，低岛稳。”**

## Core mechanic

| | |
|---|---|
| Primary | Aerial commit: bounce (or jump) then choose a landing |
| Optional | Right high islands (`\|x\| >= 4.2`) — bounce onto them, then pounce the 6.25 gap |
| Risk | Steer to the high island while still in the air. Miss = pit |
| Recovery | Shelves under every island gap |

Holding W across a gap without jumping **falls**. Stepping on jelly **launches** you; the extra height is how you reach the high islands. The course fails if the player never *aims* a landing.

## Numbers (intent, tune in playtest)

| | |
|---|---|
| First clear | 45–90s |
| Expert | ~20–35s |
| Length | startZ 8 → finishZ ≈ −130 |
| Jump gap | 3.45 (walk falls, jump lands) |
| Bounce gap | 3.45 after jelly (second bounce carries you; high islands use the extra height) |
| Pounce (high) | ~6.25 (jump falls short, jump→pounce lands) |
| Connect | 0.14 |
| Safe line | x ≈ 0, `|x| < 4.2` |
| High islands | `|x| >= 4.2`, top ≈ 2.0. Jelly is wide so you can run right *before* the launch. |
| Recovery | top y < −0.5 |

Bots jump/dash only, but jelly is a **surface**: walking onto it launches them too. Safe line never requires pounce, roll, or the high islands. No dash-sized gaps (`> 4.4`).

## ASCII

```
 z+  START   wide plaza                     [move]
      |
     intro   first island, see the drop     [observe]
      | \
      |  \ recJump
     JUMP 3.45
      | /
     land1   rest                           [SAFE]
      |
     jelly   PINK bounce                    [feel the launch]
      | \
      |  \ highA  x=+5.5  y=2.0  coins      [steer in air]
      |     |
      |    highB  x=+5.5  y=2.0  shield
      |     |
     isle2   LOW landing y=0                [safe, bots]
      | /
     mid     plaza CP                       [after bounce lesson]
      |
     hopA    island
      | \
      |  \ recHop
     JUMP 3.45
      |
     hopB    island
     JUMP 3.45
      |
     hopC    island                         [chain: commit each]
      |
     jelly2  bounce again                   [same lesson]
      | \
      |  \ highFin x=+5.5 y=2.0 coins
      |
     land2   low
      |
     FINISH
 z-
```

## Sections

| id | purpose | mechanics | fail |
|---|---|---|---|
| intro | see that this is islands, not a road | jump | medium rec / hard |
| jelly | bounce launches you; high vs low | bounce | medium rec |
| high | optional coins in the air | bounce + steer | medium rec / hard |
| hops | commit island, cloud bar you roll, relief | jump + roll | medium rec / soft gate |
| finale | jump onto jelly, bounce, sprint | bounce + boost ring | medium rec |
| finish | sprint | move | none |

## Routes

- **Safe:** center islands, jump the pits, walk onto jelly, land low. Bots.
- **Shortcut:** `highA/highB` then `highFin` — faster + coins if you land them.
- **Risk:** same bounce, worse landing. Coins sit on the high pads.
- **Recovery:** under the first jump, under the bounce gap, under the hop chain.

## Obstacles (only these)

Two jelly bounce pads. Jump gaps of 3.45. High islands on the right. One player-only roll bar on hopC. Recovery shelves. No wind, mover, hammer, spinner, pendulum, conveyor, ice, or traps.

## Checkpoints

1. Start
2. `mid` — after the first bounce lesson
3. `hopC` — after the island chain, before the last bounce

## Playtest

- Hold W into the first pit: fall. Jump: land. Lesson: this is islands.
- Walk onto jelly: launched. Don't steer: land on low isle2.
- Steer right in the air: highA, coins. Miss: recovery, not start.
- Hop chain: jump, roll the cloud bar, jump onto the last jelly, bounce.
- Bots finish the safe line (they ignore the roll bar). They never path onto high islands.
- No extra gadgets besides bounce, gaps, and one roll bar.
