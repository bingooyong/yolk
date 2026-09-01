# Gameplay Audit — 2026-09-01

Evaluation order: experience > feel > flow > fairness > camera > feedback > replay > code > perf.
Do not treat “the code is correct” as a pass.

Playtest harness: `__yolkSetLevel` / `__yolkForcePlay` / `__yolkStats`, iPhone landscape 852×393.

## Signature test (every course)

If this box is empty, the course has no gold-standard moment.

| Id | Name | Signature moment | Status |
|---|---|---|---|
| meadow | 糖果草原 | 矮门必须滚；远台必须扑 | Locked teaching kit |
| ice | 冰雪滑坡 | 舌头上乱扭会掉 | Locked |
| factory | 旋转工厂 | 看锤再过 | Locked |
| sky | 天空弹跳岛 | 果冻弹起来，看清落点再跳，高岛有金币 | **This phase’s gold standard** |
| pirate | 海盗港湾 | 条纹木板会塌，左边抄近路 | Locked |
| dessert | 甜品工厂 | 巧克力会滑，滚过去冲过去 | Locked teaching |
| cloud | 云端竞速 | 侧风要改方向，顺风就冲 | Locked teaching |
| finale | 终极派对 | 最后二十米全用上（identity only） | Prototype strip |

---

## Level 4 — 天空弹跳岛 (playtested)

### ASCII (as shipped, before this polish)

```
 z+  START plaza
      intro ──JUMP 3.45── land1
      jelly (pink bounce, w=5.6)
        \  highA/highB  x=+5.5 y=2.0   [intended shortcut]
         \ isle2 low                    [bots]
      mid CP
      hopA ──JUMP── hopB ──JUMP── hopC   [same width, same gap]
      jelly2
        \  highFin
         \ land2
      FINISH 18m
 z-
```

### Runs (this audit)

| Driver | Time | Finish | Falls | Jumps | Pounce/Roll/Boost | Coins | Notes |
|---|---|---|---|---|---|---|---|
| Naive W only | 3.4s | no | 0 | 0 | 0/0/0 | 0 | First pit, Y≈−1.8 on recovery. Lesson works. |
| Lip jumps | 35s | no | 5 | 5 | 0/0/0 | 10 | Reached hopC. Bots finished (3). High coins 0. |
| Bounce + D | 66s | no | 12 | 5 | 0/0/0 | 10 | Never landed highA. Y=−9 kill at the end. Bots finished. |

Bots: `botMinZ` past `finishZ` (−125). Safe line is fair for AI.

### 15-point card

1. **First clear** — first pit teaches “this is islands.” Recovery catches. Then the course becomes two identical hops plus a bounce the player does not aim.
2. **Expert** — high route does not pay. Pounce/roll/boost unused.
3. **Length** — span 133, party-sized. Fine.
4. **Fail points** — first jump (good), hop chain (same gap twice), high islands (unreachable from center bounce).
5. **Skills** — Jump used. Pounce 0, Roll 0, Boost 0.
6. **Camera** — look-ahead is overwritten to ~0.15m. Shot at recovery: egg fills the frame, next island is a sliver. Air bounce gets +0.38m height. Player cannot *choose* a landing they cannot see.
7. **Routes** — highA is x=5.5, y=2. Air-steer from x=0 covers ~3.3m. Math says the signature is dead. Screenshot confirms: no high coins.
8. **Obstacles** — bounce + gaps only. Correct identity. Not the problem.
9. **Checkpoints** — three, after challenges. Silent: `sfxCheckpoint` exists and is never called. No hint, no light.
10. **Bots** — finish the safe line. All on x=0. Acceptable this phase (no AI rewrite).
11. **Tells** — two rings on jump gaps. Nothing says “steer in the air.” High pads are small and off-screen with this camera.
12. **Best moment** — first bounce, if you feel the launch.
13. **Most boring** — hopA/B/C are the same 7.2×10 island at 3.45.
14. **Most frustrating** — trying to take the high island and falling, with no idea why.
15. **Keep** — bounce as the core; recovery stairs; no gadget parade; bots on the low line.

### Top 5 problems (value order)

1. **High route is not actually a route.** Center bounce cannot reach x=5.5. Signature moment fails.
2. **Camera does not look ahead.** `CAM_LOOKAHEAD` is computed then replaced with 0.15. Landings are a surprise.
3. **Pounce has no space problem on this course.** HighA→highB is a 0.14 connect. Jump is the only tool.
4. **Checkpoint is invisible.** Counter increments, nobody feels it.
5. **Hop chain is two copies of the same jump.** No relief, no commit island.

### After this polish

| Driver | Result |
|---|---|
| Naive W only | First pit, Y≈−1.8 recovery (`n4`). Lesson holds. |
| Lip + roll + boost | Multiple scripted finishes (`s2` 28s, `s3` 25s, `s4` 37s, `s9` 31s). Rolls used. Bots on the safe line pass `finishZ`. |
| High strafe to x≈3.2 then bounce | Lands highA (`h9` y=2.2 x=4.7). Jump→pounce then finish (`h8` 27s, pounce 1, coins 20). |
| Camera | Next island and the right high pad are visible during bounce. |
| Checkpoint | 「检查点」 + sfx. |
| Roll | hopC cloud bar, island deep enough that roll ends before the lip. |
| Bounce | Launches without holding Space (`fromBounce`). |
| Landing | squash + sfx + puff + haptic. |

**Lock for this phase:** bots + naive + camera + checkpoint + roll beat + landable high pounce + scripted finishes. Spatial copy done: no corridor rails; locked courses have start/arena/finish rooms; teaching chokes stay. Do not rebuild dessert–finale mechanics. Do not rewrite bot AI.

---

## Level 1 — 糖果草原 (locked, not retuned)

Teaching kit still the gold *ability* standard: jump pit, pounce shortcut, roll gate, boost lane. Keep pads. Camera/checkpoint feel from this phase should apply globally (those are engine, not meadow layout).

## Level 2 — 冰雪滑坡 (locked)

Steering. Tongue dumps a twitch. Jump 2.2. Do not restyle.

## Level 3 — 旋转工厂 (locked)

Hammer wait-windows. Soft hits. Do not add sky bounce here.

## Levels 6–8 — identity only

Still short strips (`finishZ` −84 to −110). Gadget parades in finale. **Do not rebuild this phase.**

| Id | What the blurb promises | What the data is |
|---|---|---|
| pirate | 条纹板会塌；左边跑过去 | Stripe pits + left run pier + ship jump. Span ~130. See `docs/levels/level5-pirate.md`. |
| dessert | 巧克力会滑，滚过去冲过去 | Chocolate ice + two roll gates + cake jumps. Span 122. |
| cloud | 侧风要改方向，顺风就冲 | Crosswind + tailwind + jet. Span 142. |
| finale | 前面学过的都会来 | Ice + hammer + bounce + spinner + conveyor + pendulum + wind. Span ~118. |

---

## Engine notes (not sky-only)

- Landing: squash + `sfxLand` + puff ring + light haptic.
- Boost FOV / charge SFX already exist.
- `compile()` still infers bot jump/dash. Do not make it the designer.
- Action Pad / Rapier / gacha: do not touch.
