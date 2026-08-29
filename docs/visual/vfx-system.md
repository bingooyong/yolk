# VFX System

Phase 2 VFX are lightweight, state-readable, and transform/material-only.

## Current vocabulary

- Character: idle breath, run lean/bounce, air stretch, landing squash, roll/pounce/boost silhouettes.
- Contact: one shared radial texture quad per racer, anchored at the last grounded position and faded/shrunk by height.
- Accessories: wing energy, cape lift, halo lift, and restrained emissive response.
- Course: rotating boost rings, floating pickups, theme-colored rails/neon, and finish/result celebration through existing UI/particle systems.
- Feedback: existing trails, ghost marker, confetti, audio, haptics, and screen shake.

## Rules

- VFX may update object transforms, scale, material opacity, or emissive intensity in `useFrame`.
- VFX must not allocate per frame, mutate gameplay state, or enlarge React-updated subtrees.
- Anchored contact shadows must agree with the calibrated egg contact frame.
- Favor shared geometry, shared textures, instancing, and deterministic timing.
- Do not add a full-screen post-processing stack in P0. Bloom, AO, DoF, weather effects, and LOD-driven transitions are deferred pending measured target-device budgets.
