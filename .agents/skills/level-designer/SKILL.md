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

Read `docs/levels/current-level-audit.md` and `.trellis/spec/frontend/level-design.md` before designing. For Level 1 gold standard see `docs/levels/level1-meadow.md`.

## Input

Theme, difficulty (1–5), which abilities to emphasize, target first-clear time, constraints (no new gadgets, keep art ids, …).

## Output (always)

1. **One-line core experience** — the sentence a player remembers.
2. **Core mechanic** — one primary, one optional. Not “platforms + hammers + conveyor.”
3. **ASCII layout** — start, intro, teach, fork, recovery, checkpoint, finale, finish. Label Safe / Risk / Shortcut / Recovery.
4. **Sections table** — id, z-intent, purpose, mechanics, fail type (soft / medium / hard).
5. **Route options** — at least one of: shortcut, risk, recovery. Safe line must be bot-finishable with jump+dash only.
6. **Obstacles** — only those that create a decision or teach a skill. No gadget parade.
7. **Pickups** — normal / risk / shortcut coins. Shield on risk if it earns the danger.
8. **Checkpoints** — after a completed challenge, not every 40m.
9. **Difficulty + estimated first-clear** — party pace, 45–90s for a teaching course. Not “longer is better.”
10. **Playtest checklist** — can a new player discover the skill from space, not from a popup?

## Hard rules

- Geometry is not design. Do not say “gap > 1.4 so they will jump.” Say “this pit is a Jump lesson” and give a target gap.
- Main line must not require Pounce or Roll. Bots only jump/dash (`compile()` waypoints).
- Side routes use `|x| >= 4.2`. Recovery shelves use top `y < -0.5`.
- Roll cannot duck a solid Rapier bar (capsule does not shrink). A low gate is a **player-only overlap stun**, or do not teach roll that way.
- Fairness: observe → act. 3–5 body lengths of preview before a hazard. Safe after a challenge. No screen-edge hammers.
- Rhythm: SAFE → CHALLENGE → SAFE → CHALLENGE → COMBO → SAFE → FINALE.
- Soft fail (stun/slow) vs medium (recovery shelf) vs hard (kill plane → checkpoint). A small mistake is not a full restart.
- Do not invent new engine features. Design inside current `Level` types plus `gates`.
- Chinese player-facing copy. No copyrighted clones. No pay-to-win.

## Gap ballpark (tune in playtest, do not freeze in the spec)

- Connect: ~0.14
- Jump: ~3.2–3.6 (walk dies, jump lives)
- Pounce: ~6.0–6.5 (jump dies, jump→pounce lives)
- Boost teach: a long safe straight, not a mandatory dash gap

## Refuse

- “Add more obstacles.”
- Redesigning all eight courses in one pass.
- Writing TypeScript platforms “so we can tweak later.”
