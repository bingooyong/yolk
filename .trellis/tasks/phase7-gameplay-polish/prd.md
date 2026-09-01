# PRD — Phase 7 Gameplay Polish

## Problem

Courses can be finished. They are not yet *worth playing ten times*. Sky Bounce Island is the newest locked course and the right gold standard: bounce, choose a landing, then want a second and third run.

## Goal

Players feel Yolk Rush is fun, fair, readable, and rhythmic. First run: simple and clear. Second: discover the high route. Third: chase time.

## In

- Gameplay audit of all 8 (`docs/gameplay/current-gameplay-audit.md`)
- Sky Bounce as the only course that gets layout/feel tuning this phase
- Camera look-ahead, checkpoint feedback, landing readability
- Playtest log (10 attempts) and a short tuning log
- `level-playtest` skill + trellis spec update

## Out

- New levels, new gadgets, new abilities, new currency, monetization
- Rapier / Action Pad / gacha / skin pipeline rebuild
- Bot personality rewrite
- Visual renderer rewrite
- Touching archived Skin / Visual / Phase 4–5 tasks

## Success

Sky has a one-line signature (“果冻弹起来，看清落点再跳”). Naive W-only fails the first pit. Bots finish the safe line. A skilled run uses the high route at least once. Camera shows the next landing before the lip. Checkpoint is felt. `npm run test:visual` still passes.
