# PRD — 云端竞速 teaching course

## Problem

Cloud is stairs + rings + a wind volume that grip eats. Identity is 风场冲刺.

## Goal

侧风会把只按 W 的人推下去。顺风是冲刺。

## In

- Wind XZ = additive m/s while inside (EggRacer)
- Visible arrows in Track
- Rewrite `cloud()` only
- Spec, layout tests, playtest

## Out

- Ice / bounce / hammers / gates / conveyor
- Finale rebuild
- Spline, bot AI, gacha

## Success

Naive W dumps on first crosswind. Bots finish. Span ≥ 120. `test:visual` passes.
