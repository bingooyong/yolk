# Level 5 — 海盗港湾 Gameplay Spec

Same pipeline as Levels 1–4. Do not add pendulums, hammers, ice, bounce, conveyors, or a gadget parade. Drop planks *are* the obstacle.

## One-line core

**“条纹木板会塌。看见就跳，或者跑左边抄近路。不要停。”**

## Core mechanic

| | |
|---|---|
| Primary | Read the floor: striped planks drop after a beat |
| Optional | Left drop pier (`\|x\| >= 4.2`) — keep running, skip the water jump |
| Risk | Coins sit on the left pier. Stop and it falls |
| Recovery | Shelves under every drop pit / water gap |

Holding W onto the first stripe strip **will** collapse the floor. That is the lesson. Jump the stripes (safe, bots) or run the left pier without stopping (faster, coins). The course fails if the player never *sees* wood vs stripe.

## Numbers (intent, tune in playtest)

| | |
|---|---|
| First clear | 45–90s |
| Expert | ~20–35s |
| Length | startZ 8 → finishZ ≈ −126 |
| Jump / drop pit | 3.45. First pit has a stripe at the lip; walk drops, jump lands. |
| Connect | 0.14 |
| Teach delay | 0 (the plank is gone the moment you stand on it) |
| Run delay | ~0.52s (hold W lives; stand still dies) |
| Safe line | x ≈ 0, `\|x\| < 4.2`, solid wood |
| Fast pier | x ≈ −5.5, `\|x\| >= 4.2`, all `drops: true` |
| Recovery | top y < −0.5. Stairs at **x ≈ +5.2** so they do not sit under the left pier |

Bots jump/dash only. Drop tiles are not waypoints (`drops: true`, and `compile()` ignores `|x| >= 4.2` traps). Safe line never requires pounce, roll, or the left pier. No dash-sized gaps (`> 4.4`). No movers — waiting for a ferry is a different mechanic. The boats are the ship pads.

## ASCII

```
 z+  START   wide dock                      [move]
      |
     intro   see purple stripes ahead       [observe]
      | \
      |  \ recPit1          stairs x=+5.2
      |  \ LEFT pier x=-5.5  RUN, delay 0.52   [fast, coins]
     DROP  3.45, stripe at the lip then air    [walk dies]
      | /
     land1   wood rest                      [SAFE]
      |
     lane    NARROW wood. stripes visible left [observe the pier]
      |
     safe1   wide rest                      [SAFE]
      |
     ship1   first boat
      | \
      |  \ recShips
      |  \ LEFT pier         船间抄近路        [fast, coins+shield]
     WATER 3.45, stripes in the gap
      | /
     ship2   second boat
      |
     mid     CP                             [after the boats]
      |
     dock    long wood                       [SAFE]
      |
     finale  last water jump
      |
     FINISH
 z-
```

## Sections

| id | purpose | mechanics | fail |
|---|---|---|---|
| intro | see stripes | move | none |
| pit1 | first collapse | drop + jump | medium rec |
| lane | stripes beside the dock | observe | none (optional left fall) |
| ships | same lesson between boats | drop + jump | medium rec |
| jump | still a race after the lesson | jump | medium rec |
| finale | one last stripe pit | drop + jump | medium rec |
| finish | sprint | move | none |

## Routes

- **Safe:** center wood, jump every 3.45 pit (stripes are a tell, not a floor). Bots.
- **Shortcut:** left drop pier — connected, no jump hang, coins. Keep W. Stop = fall.
- **Risk:** same pier, greed for coins.
- **Recovery:** under pit1, under the ships, under the jump. Stairs on the **right**.

## Obstacles (only these)

Drop tiles (teach delay on the safe-line pits, run delay on the left pier). Three jump-sized water gaps. One extra wood jump after the boats. No pendulum, hammer, spinner, mover, ice, bounce, conveyor, roll gate, wind.

## Checkpoints

1. Start
2. `safe1` — after the first collapse
3. `mid` — after the two ships

## Playtest

- Hold W: first stripe strip drops you. Recovery, not start.
- Jump from the intro lip: clear the stripes, land on wood.
- Left pier: hold W, collect coins, do not stop.
- Stop on the left pier: it falls, recovery.
- Ship gap: same choice, left is the 船间抄近路.
- Bots finish the safe line. They never path onto the pier or recovery.
