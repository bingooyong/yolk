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

Read the spec (`docs/levels/<id>.md`). Write **blockout data** only.

## Do

- Author platforms with `plat` / a local `extend(prev, gap, …)` so gaps are explicit.
- Safe line at x ≈ 0, y = 0, `|x| < 4.2`.
- Shortcuts/risk at `|x| >= 4.2`.
- Recovery at top y < −0.5.
- Checkpoints after named sections, matching pad tops.
- Pickups on the three coin routes. Rings as “look up / go faster” tells, not as the puzzle.
- `gates` for roll teaches (visual arch in `Track.tsx`, overlap in `EggRacer.tsx`, player-only).
- Keep existing platform **ids** the art already keys off, or remap `meadowPadRole` + `ROUTE_PLATFORM_IDS` in the same change.
- Add `gates: []` on courses you are not redesigning.

## Do not

- Rebuild `compile()`, Rapier, Action Pad, AI personalities, gacha, skins.
- Place hammers “because the type exists.”
- Run an art pass. Blockout first.
- Touch levels the spec did not name.

## Verify before handing to playtester

- Unit-test safe-line jump gaps, pounce gaps, recovery Y, shortcut X, finishZ.
- `compile()` waypoints stay on the safe line (no recovery, no `|x|>=4.2`).
- Bots can finish: every safe-line gap is a jump (≤ ~4.2) or connected, never a 6+ pounce pit.
