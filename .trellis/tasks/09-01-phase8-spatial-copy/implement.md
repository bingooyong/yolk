# Implement — Phase 8 Spatial Copy

Ordered. Do not skip identity-preserve checks.

## 1. Engine walls → world

- [ ] `Track.tsx`: do not mount `NeonRails` on any course
- [ ] Replace hugging `Decor` trees with `ThemeWorld` (recolor Sky’s two instanced batches)
- [ ] `CloudFloor` width 160
- [ ] Meadow still uses `Level1BenchmarkArt` only

## 2. `spatial.ts`

- [ ] Export `SPREAD_SPAWNS` (six slots). Meadow uses first five.

## 3. Meadow

- [ ] start 20, plaza 20, final 20, boostLane 14
- [ ] keep jump/roll/pounce pads
- [ ] spread spawns
- [ ] assert start/plaza/final ≥ 18 in meadow-layout if cheap

## 4. Ice

- [ ] start 20, mid 20, final 20, ice1 12
- [ ] keep tongue 6.4, slide 6.5, crack 3.8, jump 2.2
- [ ] spread spawns

## 5. Factory

- [ ] start 20, safe1 14, mid 20, final 20, intro/hall2 12
- [ ] keep ham* 7.2, finale 7.4, catwalk 3.8
- [ ] spread spawns

## 6. Pirate

- [ ] start 20, safe1 14, mid 20, ships 12, final 20
- [ ] keep intro/land1 11, lane 6.2, `PIER_X = -5.5`, drop geometry
- [ ] spread spawns

## 7. Identity-only plazas

- [ ] dessert / cloud / finale: start + final 20 only. No gadget moves.

## 8. Docs / spec

- [ ] `level-spatial-audit.md` after-copy table
- [ ] Spec rule 16: Sky is gold; locked courses copy rhythm; identity chokes stay
- [ ] lessons.md one line: rails are gone globally

## 9. Verify

```
npx tsc --noEmit
npm run test:visual
```

Naive W still dies at each course’s first teaching beat. Bots `botMinZ` past finish on a 40s sky/pirate sample if time allows.

## Rollback

`git checkout -- src/game/Track.tsx src/game/levels.ts src/game/spatial.ts`
