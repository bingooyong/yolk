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

Only after **gameplay lock**. Route and core obstacles are frozen.

## Do

- Extend the existing theme system (`Level1BenchmarkArt`, `meadowPadRole`, instanced props).
- Cover the new finishZ with the same grass / cane / hill / cloud bands.
- Keep `InstancedMesh`. No extra shadow maps, post, or render targets.
- Mobile 30fps budget. `?debug=perf` if you need evidence.
- Lighting stays in `LightingSystem` / `visualProfile`.

## Do not

- Move gameplay pads “a little for composition.”
- Invent a second meadow art path.
- Restyle other courses.
- Copy copyrighted layouts or characters.
