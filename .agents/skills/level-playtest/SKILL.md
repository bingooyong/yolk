---
name: level-playtest
description: >
  Run a Yolk Rush course as a player, not as a compiler. Use after a blockout
  or polish pass. Outputs a gameplay review: first/second/tenth run, signature
  moment, skill counts, camera, fairness. Does not redesign from the chair.
metadata:
  short-description: "Play, measure, write a gameplay review"
user-invocable: true
---

# Level Playtest (review)

Read `docs/levels/lessons.md` and `.agents/skills/level-playtester/SKILL.md` for the harness.

This skill’s job is the **review**, not the key-injection recipe.

## Output

Write (or append) `docs/gameplay/current-gameplay-audit.md` for the course:

1. Signature one-liner. Empty = fail.
2. First run / second run / tenth run (what they learned).
3. Table: time, finish, falls, jumps, pounces, rolls, boosts, coins, botMinZ.
4. Camera: did they see the next landing before the lip?
5. Choice: if W+jump is enough, the course failed.
6. Top 5 problems, pick 3–5 to change. One sentence of *gameplay reason* each.

Then a row in `docs/gameplay/sky-tuning-log.md` (or the course’s log): before / after / reason.

## Hard rules

- Naive W-only must fail the first teaching beat.
- Bots finishing the safe line is the lock, not a scripted player finish.
- Do not change 20 variables. Do not add gadgets to “create data.”
- Do not rewrite bot AI. Do not start the next course in the same turn.
