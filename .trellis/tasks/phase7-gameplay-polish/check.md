# Check — Phase 7

## Audit
- [x] `docs/gameplay/current-gameplay-audit.md` exists and covers 8 courses
- [x] Sky has a one-line signature moment

## Sky gold standard
- [x] Naive W-only falls at the first island pit (or recovery)
- [x] Jump from the lip lands; walk does not
- [x] Bounce launches; low landing is the safe line
- [x] High islands are a real choice (reachable with a tap-steer, faster or richer, miss = recovery). Hold-D is the wrong input (yaw).
- [x] Pounce has two 6.25 gaps on the high chain; hopC has a player-only roll bar; finale has a boost ring
- [x] Camera shows the next pad before the lip
- [x] Checkpoint is felt (sfx / hint)
- [x] Bots finish the safe line
- [x] No gadget parade (no wind / hammer / mover added)

## Regression
- [x] `npm run test:visual` (75 pass)
- [x] `npx tsc --noEmit`
- [x] Meadow / ice / factory layouts untouched
