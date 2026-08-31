# Check — Phase 6

- [x] Holding forward + jump is not enough to play the course well (roll gate blocks; pounce/boost have a reason)
- [x] Jump pit: walk falls, jump lands (`step1`→`land1` gap 3.45)
- [x] Pounce pads: jump falls short, pounce (or jump→pounce) lands (`pounceA`→`pounceB` gap 6.25, `|x|>=4.2`)
- [x] Roll gate: stand/jump stuns and bounces back, roll passes (bots still finish — player-only overlap)
- [x] Boost lane is optional but clearly faster
- [x] Recovery shelf catches a missed jump (`recJump` top y < -0.5)
- [x] Checkpoint after jump lesson (`path2`) and after the fork (`plaza`)
- [x] Bots finish the safe line (at least one bot reached finishZ in playtest)
- [x] Scripted expert ~18s; naive W+jump stuck at the roll gate. First-clear 45–90s is touch hesitation, not empty road
- [x] Art is still candy-meadow instancing (`Level1BenchmarkArt`)
- [x] `npm run test:visual` (57) + typecheck
- [x] No extra RT / post / shadow maps
- [x] Levels 2–8 unchanged except empty `gates: []`
- [x] Archived Skin/Visual tasks untouched
