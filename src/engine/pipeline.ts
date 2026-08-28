/**
 * Fixed-step gameplay pipeline (Rapier 1/60).
 * Order: input → AI wish → jump/dash → kinematic CC → hazards → egg bump → checkpoints → write sim.
 * Render interpolates; HUD samples at ~12 Hz. Do not put gameplay in useFrame.
 */
export const PHYSICS_HZ = 60;
export const PHYSICS_DT = 1 / PHYSICS_HZ;
export const MAX_FRAME_DT = 0.1;
