# Check — Phase 6

## Level 1 糖果草原

- [x] Holding forward + jump is not enough to play the course well (roll gate blocks; pounce/boost have a reason)
- [x] Jump pit: walk falls, jump lands
- [x] Pounce pads: jump falls short, pounce lands
- [x] Roll gate: stand/jump stuns and bounces back, roll passes
- [x] Boost lane is optional but clearly faster
- [x] Recovery shelf catches a missed jump
- [x] Bots finish the safe line
- [x] Art is still candy-meadow instancing
- [x] Finish fall no longer respawns a finished racer at a mid checkpoint

## Level 2 冰雪滑坡

- [x] Ice is the core, not a gadget parade
- [x] Safe line at x=0, jump pits walk-fail / jump-land (`ICE_GAPS.jump` 2.2)
- [x] Tongue 6.4 wide: twitch slides you off; recovery `crackL`
- [x] `crackR` risk at `|x|>=4.2` with coins
- [x] Floe mover at x=5.6 is ignored by `compile()` (mover x filter)
- [x] Bots finished the safe line in playtest (`botMinZ` past finishZ)
- [x] No hammers / roll gates / required pounce
- [x] `npm run test:visual` includes `ice-layout.test.ts`

## Level 3 旋转工厂

- [x] Hammers are the core, not a gadget parade (no spinner / pendulum / piston / conveyor)
- [x] First hammer is a readable wait-window (observe, then go)
- [x] Double-hammer is the same rhythm, not a new gadget
- [x] Catwalk at `|x|>=4.2` skips the pair; bots ignore it
- [x] Jump pit walk-fail / jump-land (`FACTORY_GAPS.jump` 3.45)
- [x] Recovery under halls; knocked-off is medium fail
- [x] Hammer hits are soft (`setHint`), not counted as falls
- [x] Bots finish the safe line
- [x] `npm run test:visual` includes `factory-layout.test.ts`
