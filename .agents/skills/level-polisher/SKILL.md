---
name: level-polisher
description: >
  After a Yolk Rush level is gameplay-locked, apply the existing theme art,
  VFX, audio, and camera dressing. Do not move pads or change gaps.
metadata:
  short-description: "Art/VFX/audio after gameplay lock"
user-invocable: true
---

# Level Polisher

Only after **gameplay lock**. Read `docs/levels/lessons.md`. Route and core obstacles are frozen.

## Do

- Pad sheen via existing flags in `Track.tsx` `Pad`: `ice`, `metal` (factory, skip `rec*`), `bounce` (jelly). No new materials system.
- `Decor` / `NeonRails` already scale with `finishZ`. Add a theme color branch if the default mint trees fight the sky (sky uses pink/white).
- Meadow only: `Level1BenchmarkArt` / `meadowPadRole` / `ROUTE_PLATFORM_IDS`. Remap ids in the same change if the blockout renamed pads.
- Keep `InstancedMesh`. No extra shadow maps, post, or render targets.
- Mobile 30fps. Lighting stays in `LightingSystem` / `visualProfile`.

## Do not

- Move gameplay pads “a little for composition.”
- Invent a second art path for a locked course.
- Restyle other courses in this pass.
- Copy copyrighted layouts or characters.
- Add wind / movers / props that play as obstacles.
