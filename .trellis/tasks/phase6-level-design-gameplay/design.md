# Design — Phase 6

See `docs/levels/current-level-audit.md`, `docs/levels/level1-meadow.md`, `docs/levels/level2-ice.md`, `docs/levels/level3-factory.md`.

Safe line at x=0 for bots. Pounce/risk/catwalk at `|x|>=4.2`. Recovery at y < −0.5. Roll gate = player-only AABB. `compile()` keeps inferring bot jump/dash; it does not author the course.

Level 1 sequence: Move → Jump → Pounce shortcut → Roll gate → Boost lane → Safe/Risk fork → Checkpoint → Jump+Roll mix → Finish.

Level 2 sequence: Grippy → wide ice → ice jump → tongue vs crack → water jump or floe → slide → Finish.

Level 3 sequence: Observe hammer → one slow wait-window → rest → rhythm pair or catwalk → jump pit → last hammer → Finish.
