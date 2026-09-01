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

Read `docs/levels/lessons.md`. Play the running build. Do not redesign from the chair.

## Probes (already on `window` after GameCanvas mounts)

```
__yolkSetLevel(id)
__yolkForcePlay()
__yolkStats()     // jumps, falls, playerZ, playerY, botMinZ, botsFinished, finish, time, coins
__controlsTest.setKeys(["KeyW"] | ["KeyW","Space"])
__controlsTest.setSteer(v)
```

Do not dynamic-import the store (duplicates zustand). Spoof `document.visibilityState = "visible"`. Chromium: disable background timer throttling. WebGL shots: CDP `Page.captureScreenshot`.

## Human-like passes (minimum)

1. **Naive** — W only. First teaching beat **must fail** (fall / stun / slide). Recovery should catch (playerY ≈ −2.5, not a full restart).
2. **Lip jump** — Space only in the last ~1.3m before a jump lip, held through hang (~4m past the lip) so `JUMP_CUT` does not eat the jump. In-page **16ms** loop. Playwright 80ms round-trip is too slow and jumps early.
3. **Do not hold Space the whole race** on islands or ice. Mash period ≈ 5m; a pad of d=8 dumps you in the pit.
4. **Pounce / roll / boost / high island** — only if this course teaches them. Shortcut faster if landed.
5. **Hard fail** — past recovery → last completed-challenge checkpoint.
6. **Bots** — 3–4 finish the safe line (`botMinZ` past `finishZ`). They may eat hammers (soft). They must not path onto `|x|>=4.2` or recovery.

## Lock criterion

**Bots finish the safe line** and the naive player learns the beat from space. Scripted player finish is a bonus, not a gate. If they only held W+jump and still raced well, the course failed.

## Report

Best / average / worst time, falls, skill uses, `playerZ` / `botMinZ`, one sentence on whether the player made a **choice**. Then hand numbers to implementer. Art is not next until gameplay lock.
