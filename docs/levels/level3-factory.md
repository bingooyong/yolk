# Level 3 — 旋转工厂 Gameplay Spec

Same pipeline as Level 1 / 2. Do not add spinners, pendulums, pistons, or a conveyor parade. The hammer *is* the obstacle.

## One-line core

**“锤子按节奏转。看空隙，再过。不要慌。”**

## Core mechanic

| | |
|---|---|
| Primary | Wait-window: watch the spinning bar, go through the gap |
| Optional | Right catwalk skips the double-hammer (jump) |
| Risk | Coins sit in the gap — grab them only when the bar is clear |
| Recovery | Shelves under the hammer halls and the jump pit |

Holding W without waiting **will** get you hit. That is the lesson. Soft stun, keep racing. Expert waits (or jumps the bar). The course fails if the player never *sees* a window.

## Numbers (intent, tune in playtest)

| | |
|---|---|
| First clear | 45–90s |
| Expert | ~20–35s |
| Length | startZ 8 → finishZ ≈ −126 |
| Jump gap | 3.45 (grippy metal; walk falls, jump lands) |
| Connect | 0.14 |
| Safe line | x ≈ 0, `|x| < 4.2` |
| Catwalk | `|x| >= 4.2` |
| Recovery | top y < −0.5 |
| Hammer pad | ~7.2 wide, arm 3.0 — you cannot walk around |

Bots jump/dash only. They will eat hammers (soft stun) and still finish. Safe line never requires pounce, roll, or the catwalk.

## ASCII

```
 z+  START   wide plaza                     [move]
      |
     intro   long hall                      [see the hammer — observe]
      |
     ham1    NARROW, ONE slow hammer        [wait, then go]
      | \
      |  \ recHam1
     SAFE1   wide rest                      [SAFE]
      |
     hall2   see two hammers                [observe]
      | \
      |  \ catA/catB  x=+5.5  JUMP          [skip the pair]
     ham2a   hammer
     ham2b   same spin, phase in rhythm
      | /
     mid     CP                             [after hammer lesson]
      |
     gap     takeoff
      | \
      |  \ recJump
     JUMP 3.45
      | /
     land
      |
     finale  last hammer, then sprint
      |
     FINISH
 z-
```

## Sections

| id | purpose | mechanics | fail |
|---|---|---|---|
| intro | see the first hammer spin | move | none |
| ham1 | one slow wait-window | hammer | soft stun / medium rec |
| safe1 | rest after a challenge | — | none |
| ham2 | two hammers, same rhythm | hammer | soft stun / medium rec |
| cat | skip the pair | jump | medium rec / hard |
| jump | still a race after the lesson | jump | medium rec |
| finale | one last window, then go | hammer | soft stun |
| finish | sprint | move | none |

## Routes

- **Safe:** center pads, wait (or eat stun), jump the pit. Bots.
- **Shortcut:** `catA/catB` — skip ham2, jump 3.45, coins + shield.
- **Risk:** coins in the hammer gaps. Same line, worse timing.
- **Recovery:** under ham1, under the double, under the jump.

## Obstacles (only these)

Four hammers (slow teach, rhythm pair, finale). One jump pit. One side catwalk. No spinner, pendulum, piston, conveyor, ice, roll gate, bounce pad.

## Checkpoints

1. Start
2. `mid` — after the double-hammer
3. `land` — after the jump, before the last hammer

## Playtest

- Hold W: first hammer stuns you. You notice.
- Wait for the bar to point down the track, offset a little, go: clean.
- Double-hammer: same rhythm as the first if you don't panic.
- Catwalk: faster if you land the jump.
- Miss a jump: recovery, not start.
- Bots finish the safe line. They never path onto the catwalk.
