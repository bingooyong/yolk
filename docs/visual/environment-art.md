# Environment Art

## Layer contract

1. **Foreground:** deterministic, non-colliding grass/flowers/rocks or theme equivalents; close enough for depth but never blocking the player or route.
2. **Route:** readable platform semantics, edge accents, and directional chevrons that point toward the next gameplay decision.
3. **Midground:** compact candy/theme props and rails that establish scale without dense shadow casters.
4. **Background:** broad hills/cloud bands and the cloud floor to fill the horizon without high-frequency detail.
5. **Sky:** procedural camera-following gradient shell plus theme fallback/fog.

Current integration:

- `Track` mounts `Level1BenchmarkArt` only for Level 1 (`meadow`) and retains the generic theme path for other courses.
- `level1-benchmark.ts` deterministically generates foreground grass/flowers/rocks, midground candy canes/gumdrops, background hills/clouds, route chevrons, edge strips, and finish flags from platform bounds.
- `Level1BenchmarkArt.tsx` batches repeated props with `InstancedMesh`, shared low-poly geometry/materials, static matrices, and explicit resource disposal.
- `Level1FinishGate` aligns its celebration plane and banner with the gameplay finish Z coordinate.
- Level 1 platforms use role-specific material responses for checkpoint, shortcut, bounce, lift, field, and finish surfaces without changing colliders.

## Level 1 requirements

- Generate props from deterministic seeds or formulas; no random values that alter screenshots between runs.
- Prefer instanced meshes and shared geometry/materials.
- Keep decoration non-colliding and outside the active race lane unless it explains a hazard.
- Align the visual finish gate with the level's gameplay trigger and preserve collider data.
- Preserve composition at low quality by disabling costly shadow/detail work, not by moving key props.
- Use only original procedural textures/geometry and project-owned assets.
- Weather and automatic LOD systems are deferred.
