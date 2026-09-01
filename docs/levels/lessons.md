# Level Design Lessons — L1–L5

Source of truth after 糖果草原 / 冰雪滑坡 / 旋转工厂 / 天空弹跳岛 / 海盗港湾.
Do not rebuild dessert–finale until asked. Pipeline: designer → implementer → playtester → polisher.

## Locked courses

| Id | Name | Core (one sentence) | Safe line | Player advantage |
|---|---|---|---|---|
| meadow | 糖果草原 | 近缺口跳，远台扑，矮门滚，直道冲 | jump 3.45 | pounce 6.25, roll gate, boost lane |
| ice | 冰雪滑坡 | 冰面很滑，提前改方向 | jump 2.2 (forgiving on ice) | crack risk, floe shortcut |
| factory | 旋转工厂 | 看锤再过，不要慌 | wait-window + jump 3.45 | catwalk skip |
| sky | 天空弹跳岛 | 果冻弹起来，看清落点再跳 | island jump 3.45, jelly bounce | high islands |
| pirate | 海盗港湾 | 条纹木板会塌，左边抄近路 | drop at the lip, ship jump 3.45 | left run pier |

Specs: `docs/levels/level1-meadow.md` … `level5-pirate.md`.
Identity-only (do not author pads): dessert 糖浆上 Roll+Boost, cloud 风场冲刺, finale 最后二十米全用上.

## What actually worked

1. **One mechanic per course.** Theme is dressing. A spinner on a hammer level is a gadget parade, not “more content.”
2. **Spec before `Platform[]`.** ASCII + sections + routes in `docs/levels/<id>.md`. `compile()` is a bot helper, not the designer.
3. **The player must make a choice.** If holding W+jump is enough, the course failed. Meadow: roll gate blocks. Ice: tongue dumps a twitch. Factory: hammer stuns the impatient. Sky: walk falls off the first island.
4. **SAFE → CHALLENGE → SAFE.** Teach once, rest, then the same lesson harder (not a new gadget). Factory: one slow hammer, then a rhythm pair. Pirate: first collapse, then the same choice between ships.
5. **Observe → act.** 3–5 body lengths of preview. No screen-edge hammers, no surprise lips.
6. **Fails are tiered.** Soft = `setHint` (hammer, gate, ice slide). Medium = recovery shelf. Hard = `KILL_Y` → last *challenge* checkpoint. A small mistake is not a restart.
7. **Bots on the safe line are the lock.** `compile()` waypoints, jump+dash only. Scripted player finish is a bonus; Playwright key latency is not a level bug.

## Engine facts that ate design time

These are not tunables. Design inside them.

| Fact | Consequence |
|---|---|
| Capsule never shrinks on roll | Low gate = **player-only overlap** + bounce back. Bots ignore it. |
| `compile()` takes `\|x\| < 4.2` and top `y > -0.5` | Shortcuts at `\|x\| >= 4.2`. Recovery top `y < -0.5`. Stairs at `x ≈ -5.2` even when top is `-0.2`. |
| Movers: midX `\|x\| < 4.2` | Side floe / catwalk movers must sit at `x >= 4.2` or bots path onto them. |
| Jump air ≈ 5.0 (`JUMP_V=9.5`, `AIR_SPEED=7.4`) | Gap **3.45**: walk dies, jump from the **lip** lives. Jump 4m early and you die in the pit. |
| Ice already taxes steering | Ice jump **2.2**, not 3.45. |
| Pounce ≈ 4.8, jump→pounce ≈ 6.2 | Pounce pit **6.25** on a **side** pad. Never on the bot line. |
| Bounce is a **surface** (`vy=10.4`) | Bots that walk onto jelly get launched. A short connected jelly launches from the **back** and misses the next pad. Depth ≥ ~8 so the second bounce is near the front. **JUMP_CUT does not eat bounce** (`fromBounce`): stepping on jelly launches even if Space is up. |
| Trap tiles must keep falling after they trigger | A one-frame drop sinks ~0.27m (`autostep` 0.38) so walkers still cross. After `dropped`, keep kinematic translation down. Teach delay 0; run-pier delay ~0.52. |
| Mash-jump (hold Space) period ≈ 5m | Island / takeoff pads **d ≈ 10** so the last auto-jump is at the lip. `d=8` on sky hops made mash-jump fall in the hole. A **roll** island needs **d ≥ 13** so roll (0.58s × 11.2 ≈ 6.5m) ends before the next lip. |
| `FALL_GRAVITY=48`, recovery thick 0.7 | Recovery must run **under the landing pad**, not only under the gap, or holding W walks off the shelf into kill. Stairs: tops `-2.5 / -1.4 / -0.2`. |
| Hazard hit used to increment `falls` | Soft hits = `setHint`. Only kill-plane `setFail`. |
| Coins at pad top were uncatchable | Place at `platformTop + 0.9`. |
| Finished racer still hit `KILL_Y` | Skip kill-plane after `finished`. |
| Dash gap `> 4.4` | Safe line never uses it unless you intend bots to dash. |
| NeonRails at `x=±10.2` are 2.5 m walls the whole course | That is a hallway. **No course** mounts them. `ThemeWorld` (far instanced clouds/isles) or meadow benchmark art. |
| Width is rhythm (`src/game/spatial.ts`) | `narrow 6.2` / `standard 12` / `wide 14` / `arena 20`. Do not `×2` every pad. Side rooms sit past the main pad edge, not on its shoulder. |
| Camera follows local pad width | Extra distance/height/lookahead from width. Do not open FOV to fake space. |

## Authoring recipe (every new course)

```
GAPS = { connect: 0.14, jump: 3.45 }   // ice jump 2.2
safe  = extend(id, prev, gap, w, d, x=0, top=0, color)
side  = plat(id, x=5.5, z, …)           // |x| >= 4.2
rec   = plat("rec…", 0, land.pos[2]+2, 12, 14, -2.5, Rec, "static", 1.2)
stair = plat("rec…2", -5.2, land.pos[2], 5.2, 6, -1.4, Rec)
```

- Span `startZ - finishZ >= 120` (party 45–90s, `MOVE_SPEED=8.4`).
- Checkpoints: start + after each completed challenge (not every 40m).
- `layout.test.ts`: safe-line x=0, jump gap, side `|x|>=4.2`, rec y filter, no gadget parade, span, stars.
- Art after lock: Pad sheen only (`ice` / `metal` / `bounce` flags in `Track.tsx`). No extra lights, RT, shadows.

## Playtest harness

```
window.__yolkSetLevel(id)
window.__yolkForcePlay()
window.__yolkStats()  // jumps, falls, playerZ, playerY, botMinZ, botsFinished, finish, time
window.__controlsTest.setKeys(["KeyW"]) / setKeys(["KeyW","Space"])
```

- Naive: **W only**. First teaching beat must fail (fall / stun / slide off).
- Skills: jump **at the lip**. In-page 16ms loop, not Playwright round-trip (80ms is too slow; early Space cuts `JUMP_CUT`).
- Do **not** hold Space the whole race on islands or ice.
- Bots: `botMinZ` past `finishZ`, 3–4 finished. They may eat hammers (soft).
- WebGL shots: CDP `Page.captureScreenshot`. `page.screenshot` hangs after fonts.
- Do not `import()` the store from the harness (duplicates zustand). Use the `window` probes.

## Refuse

- “Add more obstacles.”
- Redesigning all remaining courses in one pass.
- New engine features (solid roll-under bar, new gadget types, bot personalities).
- Moving locked pads “for composition.”
- Pay-to-win, copyrighted clones, gacha weight changes (60/28/10/2).
