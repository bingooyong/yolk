---
name: level-implementer
description: >
  Turn a Yolk Rush Level Design Spec into Level definition data in
  src/game/levels.ts. Use after level-designer. Keep compile() as a bot
  helper. Do not invent gadgets, rewrite AI, or polish art.
metadata:
  short-description: "Spec → levels.ts blockout"
user-invocable: true
---

# Level Implementer

Read `docs/levels/lessons.md` and the spec (`docs/levels/<id>.md`). Write **blockout data** only. Do not touch locked courses (meadow / ice / factory / sky) unless the spec names a bugfix.

## Do

- Author with `plat` / `extend(prev, gap, …)` so gaps are explicit. Put `FOO_GAPS = { connect: 0.14, jump: 3.45 }` next to the function (ice jump 2.2).
- Safe line at x ≈ 0, top y = 0, `|x| < 4.2`. Takeoff / island depth **d ≈ 10** so mash-jump still leaves a lip.
- Shortcuts/risk at `|x| >= 4.2`.
- Recovery under the **landing pad**, not only the gap midpoint: `plat("rec…", 0, land.pos[2]+2, 12, 14, -2.5, Rec, "static", 1.2)`. Stairs at `x ≈ -5.2`, tops `-1.4` then `-0.2`.
- Bounce pads on the safe line: depth ≥ ~8 if connected to the previous pad (first contact launches from the back).
- Checkpoints after named sections, matching pad tops.
- Pickups at `platformTop + 0.9`. Rings are “look up” tells, not the puzzle.
- `gates` for roll teaches (visual arch in `Track.tsx`, overlap in `EggRacer.tsx`, player-only). Bounce-back ~2.8m, `gateHit` ~0.4s.
- Hammers: pad ~7.2 wide (cannot walk around), arm 3.0, phase offset for rhythm. Hits are `setHint`, not `setFail`.
- Keep existing platform **ids** the art already keys off, or remap `meadowPadRole` + `ROUTE_PLATFORM_IDS` in the same change.
- `gates: []`, empty gadget arrays, on courses you are not redesigning.

## Do not

- Rebuild `compile()`, Rapier, Action Pad, AI personalities, gacha, skins.
- Place hammers / wind / movers “because the type exists.” The spec’s obstacle list is exhaustive.
- Run an art pass. Blockout first.
- Touch levels the spec did not name.

## Verify before handing to playtester

- `*-layout.test.ts`: safe-line x=0, jump gap, side `|x|>=4.2` absent from waypoints, rec y < −0.5, no gadget parade, span ≥ 120, stars.
- Every safe-line gap is connected or jump (≤ ~4.2), never a 6+ pounce pit, never a dash pit unless intended.
- `npm run test:visual` includes the new file. `npx tsc --noEmit`.
