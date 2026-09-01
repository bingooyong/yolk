# Design — Phase 9 Sky S-curve

## Change boundary

- **Gap:** Safe line is `x = 0` forever; camera looks −Z; `compile()` cannot keep a pad at `|x| >= 4.2`.
- **Lives in:** `Platform.lane`, `compile()`, `skyJump()`, `CameraRig` look-at, sky tests.
- **Not doing:** spline, dessert, ice tongue weave.

## Lane

```ts
lane?: "safe" | "side"
```

Default: `id` starts with `rec` or `top < -0.5` or `|x| >= 4.2` → `side`; else `safe`.
Curved safe pads pass `lane: "safe"` explicitly.

`compile()` walks `lane === "safe"` (and movers/traps keep the old x filter; sky has none).

## Sky S (centers)

```
start 0 → intro 0 → land1 +2.4 → jelly +4.2 → isle2 +2.2 → mid 0
  → hopA −3.6 → hopB −6.0 (narrow, must mark safe) → hopC −2.4
  → jelly2 0 → land2 0 → final 0
```

High: `HIGH_X = jelly.x + jelly.w/2 + 1.8` so it stays a room on the right of the shifted jelly.

First jump stays on x≈0 so the teaching beat does not become a steer lesson.

## Camera

Find the next safe pad with `z < playerZ − 1.5`. Look-at.x lerps toward that pad’s x (≈0.4). User lookYaw still wins when they look. `camYaw` then makes W follow the road. Do not raise FOV.

## Recovery

Shelves centered on the local pad x, wide enough to catch a miss. Stairs: `pad.x − pad.w/2 − 2.6`.
