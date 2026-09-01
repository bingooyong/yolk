---
name: level-pipeline
description: >
  Run the Yolk Rush level pipeline for exactly one course. Use when asked to
  make, rebuild, or continue a level. Stops after that course. Does not start
  pirate / dessert / cloud / finale unless the user names that id.
metadata:
  short-description: "One course: design → blockout → playtest → polish → commit"
user-invocable: true
---

# Level Pipeline

**One course per run.** Meadow, ice, factory, sky are locked. Pirate–finale stay identity-only until named.

Read `docs/levels/lessons.md` first. Then:

1. **level-designer** — spec in `docs/levels/<id>.md`. No `Platform[]`.
2. **level-implementer** — `src/game/levels.ts` blockout + `*-layout.test.ts` only.
3. **level-playtester** — naive W-only, lip jumps, bots on the safe line.
4. Tune gaps / recovery / camera from numbers. Do not add gadgets.
5. Gameplay lock.
6. **level-polisher** — existing theme sheen. Do not move pads.
7. Commit **that level’s files only**. Push if asked.

Stop. Do not author the next course in the same turn.

## Locked vs identity

| Locked (do not rewrite) | Identity only |
|---|---|
| meadow, ice, factory, sky | pirate, dessert, cloud, finale |

## Hard stops

- No gadget parade. One core mechanic.
- No Rapier / Action Pad / gacha / skin / bot-AI rewrite.
- `compile()` stays a bot helper.
- Chinese player-facing copy. No clones. No pay-to-win.
