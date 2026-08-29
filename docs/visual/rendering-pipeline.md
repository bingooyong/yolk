# Rendering Pipeline

## Frame order

1. React mounts `GameCanvas` with a quality profile selected from the persisted setting or device capability.
2. Rapier advances gameplay in fixed `PHYSICS_DT` steps (`1/60`); interpolation is the render boundary.
3. Kinematic movers, spinners, pendulums, and trap timers use `useBeforePhysicsStep`, not render delta.
4. `useFrame` performs presentation only: camera damping, lighting follow, HUD sampling at roughly 12 Hz, character scale/accessory motion, and non-gameplay spin/bob.
5. Three renders one opaque, depth-enabled WebGL framebuffer with ACES tone mapping, exposure `1.18`, and sRGB output.

## Renderer contract

`src/game/GameCanvas.tsx` creates a high-performance, opaque context without stencil. DPR, MSAA, shadow allocation, and the remount key come from `getVisualProfile()` and `getCanvasRemountKey()`. The camera uses near `0.4` and far `190`; the camera-following sky radius is `120`.

The scene background and fog remain fallback/theme values. The actual gradient sky is a camera-following `BackSide` sphere with early render order, no depth write, and no fog. It must continue following the camera so no course position can clip its far side.

## Quality behavior

| Quality | DPR max | Context MSAA | Shadows  | Shadow map | Environment cube |
| ------- | ------: | ------------ | -------- | ---------: | ---------------: |
| Low     |    1.25 | No           | Disabled |          0 |            16 px |
| Medium  |     1.5 | Yes          | Enabled  |       1024 |            32 px |
| High    |       2 | Yes          | Enabled  |       1536 |            64 px |

Medium and high can update dynamic settings. A transition across MSAA mode must recreate the canvas. Keep this behavior covered by `src/engine/visualProfile.test.ts`.

## Debug evidence

`?debug=perf` mounts an in-canvas bridge that observes the concrete R3F `WebGLRenderer`. The wrapper samples render timestamps and renderer info, while the React overlay updates DOM text only twice per second. Canvas/level remounts register their new renderer automatically. Normal gameplay installs no renderer wrapper or overlay. Do not add per-frame React state for these counters.
