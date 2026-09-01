---
name: level-designer
description: >
  Author a Yolk Rush level as a design spec, never as code. Use when asked to
  design a course, layout, shortcut, teaching beat, or "make a forest level
  that teaches Pounce". Outputs concept, core mechanic, ASCII, sections,
  routes, checkpoints, pickups, difficulty, time, and a playtest checklist.
  Does not edit src/game/levels.ts — that is level-implementer.
metadata:
  short-description: "Yolk Rush level design spec (no code)"
user-invocable: true
---

# Level Designer

Produce a **Level Design Spec**. Do not write `Platform[]`. Do not edit `levels.ts`.

Pipeline: **designer → implementer → playtester → polisher**. This skill is step 1.

Read `docs/levels/lessons.md`, `docs/levels/current-level-audit.md`, and `.trellis/spec/frontend/level-design.md` before designing. Gold specs: `docs/levels/level1-meadow.md` … `level4-sky.md`.

## Input

Theme, difficulty (1–5), which abilities to emphasize, target first-clear time, constraints (no new gadgets, keep art ids, …).

## Output (always)

1. **One-line core experience** — the sentence a player remembers (Chinese).
2. **Core mechanic** — one primary, one optional. Not “platforms + hammers + conveyor.”
3. **ASCII layout** — start, intro, teach, fork, recovery, checkpoint, finale, finish. Label Safe / Risk / Shortcut / Recovery.
4. **Sections table** — id, z-intent, purpose, mechanics, fail type (soft / medium / hard).
5. **Route options** — at least one of: shortcut, risk, recovery. Safe line must be bot-finishable with jump+dash only.
6. **Obstacles** — only those that create a decision or teach a skill. List them. Everything else is forbidden on this course.
7. **Pickups** — normal / risk / shortcut coins. Shield on risk if it earns the danger.
8. **Checkpoints** — after a completed challenge, not every 40m.
9. **Difficulty + estimated first-clear** — party pace, 45–90s. Span ≥ 120. Not “longer is better.”
10. **Playtest checklist** — can a new player discover the skill from space, not from a popup?

## Hard rules (from L1–L4)

- Geometry is not design. Do not say “gap > 1.4 so they will jump.” Say “this pit is a Jump lesson” and give a target gap.
- Main line must not require Pounce or Roll. Bots only jump/dash (`compile()` waypoints).
- Side routes use `|x| >= 4.2`. Recovery shelves use top `y < -0.5`. Stairs stay at `|x| >= 4.2` even when the top step is `y = -0.2`.
- Roll cannot duck a solid Rapier bar. A low gate is a **player-only overlap stun**, or do not teach roll that way.
- Bounce is a surface, not a button. If jelly is on the safe line, bots will launch. Connected jelly needs depth ≥ ~8 or the first bounce misses the next pad.
- Fairness: observe → act. 3–5 body lengths of preview. Safe after a challenge.
- Rhythm: SAFE → CHALLENGE → SAFE → CHALLENGE → COMBO → SAFE → FINALE. The harder beat is the **same** mechanic, not a new gadget.
- Soft fail (stun/slow) vs medium (recovery shelf) vs hard (kill plane → checkpoint).
- Do not invent new engine features. Design inside current `Level` types plus `gates`.
- Chinese player-facing copy. No copyrighted clones. No pay-to-win.

## Gap ballpark (tune in playtest)

- Connect: ~0.14
- Jump: ~3.45 grippy (walk dies, jump from the **lip** lives). Ice: ~2.2.
- Pounce: ~6.25, **side** pads only
- Bounce-after gap: same as jump if jelly is deep enough for a second bounce
- Boost teach: a long safe straight, not a mandatory dash gap (`> 4.4` makes bots dash)

## Locked identities (do not rewrite)

meadow 四技能 / ice 转向 / factory 看锤再过 / sky 连跳选落点.

Pirate 船间抄近路, dessert 糖浆上 Roll+Boost, cloud 风场冲刺, finale 最后二十米全用上 — spec only until the user names that course.

## Refuse

- “Add more obstacles.”
- Redesigning all remaining courses in one pass.
- Writing TypeScript platforms “so we can tweak later.”
