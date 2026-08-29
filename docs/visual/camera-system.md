# Camera System

`CameraRig` is the only gameplay camera authority. It reads the player, look state, trauma, and phase, then damps position and look-at with a frame-rate-independent exponential factor. The frame delta is clamped by `MAX_FRAME_DT` (`0.1`).

## Framing

- Portrait uses a wider base FOV and more distance/height; landscape is tighter.
- Title/results use a calm three-quarter hero framing with a slow orbit.
- Race mode keeps the route and upcoming hazards visible while adding height/FOV energy for air and dash.
- User look has persistent yaw/pitch and an idle recenter; sensitivity is persisted.
- Shake uses squared trauma and remains a small position offset.
- The camera does not perform gameplay work.

The canvas camera frustum is `0.4`–`190`; the sky shell follows the camera at radius `120`. Any future cinematic mode must preserve the fixed simulation and use a separate camera state contract rather than adding render-time gameplay calculations. Gacha cinematics are deferred.
