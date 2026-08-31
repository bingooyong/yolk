# Level 2 — 冰雪滑坡 Gameplay Spec

Same pipeline as Level 1. Do not add hammers, roll gates, or required pounce. Ice *is* the obstacle.

## One-line core

**“冰面很滑。提前改方向。裂缝别急转，浮冰能抄近路。”**

## Core mechanic

| | |
|---|---|
| Primary | Ice steering / not over-correcting |
| Optional | Ride the floe (right) to skip the water jump |
| Risk | Narrow crack-side ice + coins — slide off if you yank the stick |
| Recovery | Shelves under the jump pits and under the tongue |

Holding forward without steering **is** valid ice play (you stay centered). The course fails if the player never *feels* ice, not if they never press A/D. A fork and a floe are the choices.

## Numbers (intent, tune in playtest)

| | |
|---|---|
| First clear | 45–90s |
| Expert | ~20–35s |
| Length | startZ 8 → finishZ ≈ −140 |
| Jump gap | ~2.2 on ice (walk falls; jump from the approach still lands). Shorter than meadow because ice takeoff is slidey. |
| Connect | 0.14 |
| Safe line | x ≈ 0, `|x| < 4.2` |
| Risk / floe | `|x| >= 4.2` |
| Recovery | top y < −0.5 |
| Ice grip | existing `1.55` (do not retune the global constant this slice) |

Bots jump/dash only. Safe line never requires pounce, roll, or the floe.

## ASCII

```
 z+  START   grippy snow                    [move]
      |
     ice1    WIDE ice                       [feel the slide]
      |
     gap     NARROW ice tongue              [stay centered or rec]
      | \
      |  \ recIce
     JUMP 2.2
      |  /
     ice2
      |
     lane    see the crack                  [observe]
      | \ \
      |  \  \ crackR  x=+5.5  coins         [risk, yank = fall]
      |   \  recCrack y=-2.7
     tongue  x=0  6.4 wide ice              [safe, don't twitch]
      |
     mid     grippy CP                      [after ice lesson]
      |
     water   ice takeoff
      | \ 
      |  \ floe  x=+5.6 moving −Z           [shortcut, wait and ride]
     JUMP 2.2
      |  /
     land    grippy
      |
     slide   downhill ice                   [ice again, then step up]
      |
     land2   grippy
      |
     FINISH  wide snow
```

## Sections

| id | purpose | mechanics | fail |
|---|---|---|---|
| intro | grippy then wide ice | move, ice | none |
| narrow | stay centered | ice | medium rec |
| jump | jump while sliding | jump, ice | medium rec |
| crack | safe tongue vs right risk | ice, choice | medium rec / hard if past rec |
| water | jump or ride floe | jump / mover | medium rec |
| slide | ice then step onto snow | ice, jump | hard |
| finale | grippy sprint | move | none |

## Routes

- **Safe:** center ice, jump both pits, skip the floe. Bots.
- **Risk:** `crackR` — shorter, coins + shield, narrow ice.
- **Shortcut:** floe over the water. Compile ignores it (`|x|>=4.2` + mover x filter).
- **Recovery:** under the two jump pits and under the tongue.

## Obstacles (only these)

Ice surface, one water jump, one moving floe on the side, a downhill slide. No hammers, spinners, roll gates, bounce pads.

## Checkpoints

1. Start
2. `mid` — after the crack/tongue (ice lesson done)
3. `land2` — after the slide, before finish

## Playtest

- Hold W on wide ice, tap A: you slide, you notice.
- Hold W+jump only: can finish if they don't twitch off the tongue.
- Yank A/D on the tongue: recovery, not start.
- Right coins: faster if they don't fall.
- Floe: wait, ride, skip the water jump.
- Bots finish the safe line. They never path onto the floe or `crackR`.
