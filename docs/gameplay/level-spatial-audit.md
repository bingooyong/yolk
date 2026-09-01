# Level Spatial Audit — 2026-09-01

Egg diameter = 1.0. Comfortable parallel spacing = 2.2. Packed = 1.05 (`EGG_BUMP`).
Camera: dist 6.2, height 2.55, lookahead 3.4, landscape FOV 46.
Do not treat “the pads are 8m so 8 eggs fit” as a pass. The shot is a corridor.

## Why it looks like a demo (root causes, value order)

1. **Full-length walls.** `NeonRails` are 2.5 m tall boxes at `x = ±10.2` for the whole course depth. Trees sit at `x = ±8.2`. The playable pad is 8 m; the player is in a 20 m hallway. This is the screenshot of “墙夹着蛋”.
2. **No world, only the gameplay mesh.** Meadow has FG/MG/BG. Every other course is pads + 7 trees + a faint cloud plane at `y = −12`. Void reads as missing map, not as sky.
3. **Sky is the narrowest course.** Average playable width **7.4** (meadow 8.8, pirate 9.3, finale 10.1). hopB 5.4, high islands 4.4. The gold *gameplay* course is the worst *space*.
4. **Camera is a corridor camera.** It does not know pad width. A 20 m plaza and a 5.4 m choke get the same 6.2 m chase. FOV-spam would make it worse; distance/height must scale.
5. **“Width” was path width.** High islands at `x = 4.6` sit on the *shoulder* of an 8.4 jelly (edge 4.2), not in a separate room. Left/mid/right is not readable as three spaces.
6. **Almost no width rhythm.** Start 14 → everything 7–10 → finish 14. No arena, no overtake plaza, no choke-after-wide.
7. **Six racers spawn in a 5 m cluster** (`x = −2.2 … 2.8`) on a 14 m pad.
8. **Everything is a straight −Z strip.** Curves are a later engine slice (waypoints, camera, compile). Not this pass.

Not the problem: jump gaps, bounce feel, pounce 6.25, roll gate, bot compile `|x| < 4.2`. Do not “fix space” by adding gadgets.

## Parallel capacity (comfort 2.2 m / racer)

| Width | Comfort | Packed | Role |
|---|---|---|---|
| 5.4 | 2 | 5 | choke (too tight to *race*) |
| 6.2 | 2 | 5 | **narrow** — challenge |
| 8.4 | 3 | 8 | current “standard” — still a lane |
| 12 | 5 | 11 | **standard** |
| 14 | 6 | 13 | **wide** overtake / boost |
| 20 | 9 | 19 | **arena** / start / finish |

Targets: normal ≥ 2, overtake ≥ 3, arena ≥ 4.

## Per course (playable pads, top y > −0.5)

| Id | min | avg | max | ≥14 | Distinct x | Verdict |
|---|---|---|---|---|---|---|
| meadow | 3.4 | 8.8 | 16 | start, final | 0 / 5.5 / −5.2 | Teaching kit. Still walled. Side pads skinny. |
| ice | 3.8 | 8.6 | 14 | start, final | 0 / 5.5 | Tongue 6.4 is the identity. Walls fight the slide. |
| factory | 3.8 | 8.5 | 14 | start, final | 0 / 5.5 | Hammer pads 7.2 must stay narrow. Catwalk 3.8 is a skip. |
| **sky** | **4.4** | **7.4** | **14** | start, final | 0 / 4.6 | **This phase’s spatial gold standard.** |
| pirate | 5.4 | 9.3 | 14 | start, final | 0 / 5.2 | Better average; still rails. |
| dessert | 4.6 | 9.9 | 14 | start, final | 0 | Strip. Identity only. |
| cloud | 6.0 | 9.1 | 14 | start, final | 0 | Strip. Identity only. |
| finale | 4.4 | 10.1 | 16 | start, final | 0 | Slightly roomier, still a corridor. |

## Other-7 ranking (do not edit this pass)

1. Corridor rails + hugging trees — every non-meadow course.
2. No arena / overtake plaza — all seven.
3. Side routes are 3.4–4.4 shoulders — meadow pounce, ice crack, factory catwalk, sky high (fixed here).
4. Camera ignores width — engine fix in this pass helps everyone.
5. dessert / cloud / finale still identity strips — later rebuilds.

## This pass (Sky only)

Width as rhythm, not `× 2`:

```
START 20 arena spawn
  ↓
intro 12     see the drop
  JUMP
land1 12
jelly 14     run right, overtake
  \ high 6 @ x=8.5   (a room, not a shoulder)
isle2 10
mid 20×16    SKY ARENA — left / mid / right
hopA 10
hopB 6.2     NARROW commit
hopC 14      relief + roll (center bar, edges are a risky skip)
jelly2 14
land2 12
FINAL 20     boost sprint, celebrate
```

- Kill sky `NeonRails`. Far cloud-islands (instanced, no collision).
- Camera distance/height/lookahead scale with local pad width. Do not raise FOV.
- `compile()` unchanged: safe pads `x = 0`; high `|x| >= 4.2`; recovery `y < −0.5`.
- Gaps, bounce, pounce 6.25, hopC depth 14, fromBounce: unchanged.
- No curves this pass.

## After this pass (Sky)

| | Before | After |
|---|---|---|
| Avg playable width | 7.4 | **11.8** |
| Start / arena / finish | 14 / 10 / 14 | 20 / 20 / 20 |
| Narrow choke | hopB 5.4 | hopB 6.2 |
| High route | x=4.6 shoulder | x=8.5 room |
| Rails | ±10.2 walls | none on sky |
| Camera | fixed 6.2 | scales with local width |
| Decor | trees at ±8.2 | far clouds + isles |

Other 7: **copied**. Corridor rails off globally. Start/arena/finish are rooms. Teaching chokes unchanged.

## After copy (locked courses)

| Course | Keep | Rooms (20) | Notes |
|---|---|---|---|
| meadow | jump 10, pounce 3.4, roll 10 | start, plaza, final; boost 14 | Art still from pad bounds |
| ice | tongue 6.4, slide 6.5, crack 3.8 | start, mid, final | Ice jump 2.2 |
| factory | hammers 7.2, finale 7.4, catwalk 3.8 | start, mid, final; safe1 14 | Cannot walk around hammers |
| pirate | intro 11, lane 6.2, PIER_X −5.5 | start, mid, final; ships 12 | Collapse teaching intact |
| sky | hopB 6.2, high x=8.5 | start, mid, final | Gold |
| dessert/cloud/finale | identity pads | start + finish only | No mechanic rewrite |

Rails: none. World: `ThemeWorld` or meadow benchmark. Camera: `camExtraForWidth` on every course.

## Acceptance

1. Average width — recompute after playtest.
2. Narrowest playable — hopB 6.2.
3. Widest — start/mid/final 20.
4. 3-wide — standard 12 and up.
5. 4-wide — wide 14, arena 20.
6. Shortcut — highA/B, highFin at x=8.5.
7. Arena — `mid` 20×16.
8. Boost — arena right ring + finish plaza.
9. Pounce — highA→highB and highFin chain.
10. Camera — `camExtraForWidth`.
11. iPhone landscape — playtest.
12. Perf — rails removed; +2 instanced batches.
