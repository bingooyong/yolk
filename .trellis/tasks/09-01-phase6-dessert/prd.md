# PRD — 甜品工厂 teaching course

## Problem

Dessert is a gadget strip: ice + jelly + conveyor + spinner + lift. Identity is “糖浆上 Roll+Boost.”

## Goal

One sentence: 巧克力会滑。滚过去、冲过去，别在上面慢慢走。

## In

- Spec `docs/levels/level6-dessert.md`
- Rewrite `dessert()` only
- Chocolate = ice, roll/boost lock heading
- Two gates, two cake jumps, one side highway
- Layout tests + playtest (naive gate, bots finish)

## Out

- Hammers, spinners, lifts, bounce, conveyor, wind
- Cloud / finale / locked L1–L5
- Spline, bot AI, gacha, Rapier

## Success

Naive W fails the first gate. Bots finish the cake line. No gadget parade. Span ≥ 120. `test:visual` passes.
