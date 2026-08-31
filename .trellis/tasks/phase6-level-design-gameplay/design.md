# Design — Phase 6

See `docs/levels/current-level-audit.md` and `docs/levels/level1-meadow.md`.

Safe line at x=0 for bots. Pounce/risk at `|x|>=4.2`. Recovery at y < −0.5. Roll gate = player-only AABB. `compile()` keeps inferring bot jump/dash; it does not author the course.

Level 1 sequence: Move → Jump → Pounce shortcut → Roll gate → Boost lane → Safe/Risk fork → Checkpoint → Jump+Roll mix → Finish.
