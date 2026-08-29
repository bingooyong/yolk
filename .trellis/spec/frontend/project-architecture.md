# Project Architecture

## Scope and evidence baseline

This spec describes Yolk Rush as observed at commit `4ce0ce90b37f83db55094b1716d23f01e5c0b7fb`. Update it only after verifying a behavioral change in source. Items labeled **Debt** or **Unknown** are not coding ideals.

## Product and runtime shape

Yolk Rush is a Chinese-first, mobile-focused 3D egg party obstacle race. The active game is one full-screen React/R3F experience with browser-local progression. The web route is the only TanStack route; the iOS app is a standalone WKWebView shell that loads a Vite bundle.

Two entries converge on the same shell:

| Entry | Path                                                                | Responsibility                                                       |
| ----- | ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Web   | `src/router.tsx` → `src/routes/__root.tsx` → `src/routes/index.tsx` | HTML metadata, auth provider, preview bridge, route tree, `GameApp`. |
| iOS   | `src/native-entry.tsx`                                              | Global CSS and `GameApp` only; bypasses router/auth/preview bridge.  |

`src/components/GameApp.tsx` composes the lazy R3F canvas, game UI, touch controls, music director, optional performance overlay, input installation, gesture suppression, and post-mount persisted-state reconciliation.

The iOS native layer only serves bundled files through the custom `yolkrush` scheme. It has no native JavaScript message bridge, haptics bridge, or feature API.

## Module ownership

| Area                  | Stable owner                                                               | Contract                                                                                                           |
| --------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Web shell             | `src/routes`, `src/router.tsx`                                             | Do not hand-edit `src/routeTree.gen.ts`; TanStack Router generates it.                                             |
| Native bootstrap      | `src/native-entry.tsx`, `vite.native.config.ts`                            | Build from `native/` root with relative base into `native/ios/YolkRush/www`.                                       |
| React composition     | `src/components/GameApp.tsx`                                               | One shared composition point for both entries.                                                                     |
| HUD / hub / touch UI  | `src/components`                                                           | UI state comes from `useGameStore` and input singletons; do not duplicate gameplay calculations in DOM components. |
| Renderer              | `src/game/GameCanvas.tsx`, `LightingSystem.tsx`, `engine/visualProfile.ts` | Follow `.trellis/spec/frontend/visual-rendering.md`.                                                               |
| Simulation            | `src/game/sim.ts`, `EggRacer.tsx`, `Track.tsx`, `engine/pipeline.ts`       | Gameplay and Rapier kinematics run on fixed `PHYSICS_DT`; render hooks only present/interpolate.                   |
| Level definitions     | `src/game/levels.ts`                                                       | Level data, colliders, hazards, pickups, surfaces, and unlock order.                                               |
| Durable UI state      | `src/game/store.ts`                                                        | Zustand phase/progression/economy/settings and persisted schema.                                                   |
| Live race state       | `src/game/sim.ts`, `input.ts`, `course.ts`                                 | Mutable singleton state for one active race.                                                                       |
| Audio                 | `src/game/audio.ts`, `MusicDirector.tsx`                                   | One AudioContext-oriented singleton with layered BGM/SFX.                                                          |
| Server infrastructure | `src/lib`, `server`                                                        | See `data-security.md`; most capability is currently dormant library infrastructure.                               |

`src/game/course.ts` is a narrow re-export facade over selected `levels.ts` APIs. Its historical reason is **Unknown**; preserve imports until a dedicated migration is planned.

## Core simulation and state flow

1. UI calls `useGameStore.startRace`.
2. Store selects the active level, clears mover velocity through `setActiveLevel`, resets shared race state, sets coin totals, increments `raceId`, and enters countdown.
3. `GameCanvas` mounts Rapier with gravity `-28`, fixed `PHYSICS_DT`, interpolation, and pause tied to store phase.
4. `RacerField` creates one player and level-defined bots, keyed by race.
5. Each racer uses `useBeforePhysicsStep`: input or AI intent → abilities → velocity/gravity/wind → Rapier character controller → surfaces/hazards/bumps → pickups/finish/fall → state mirror.
6. Course movers, spinners, pendulums, hammers, and dropping traps also update in `useBeforePhysicsStep` using accumulated fixed-step time.
7. `useFrame` may damp cameras, animate materials, sample HUD, and interpolate visuals; it must not own gameplay state transitions.
8. Player finish calls `onPlayerFinish`; store computes reward/XP/progression and enters results.

There are two intentional state families:

- `useGameStore`: phase, selected level/skin, durable progression/economy/settings, result and HUD projections.
- `sim` plus `actions`/`touch`: mutable live race, input, camera-control, pickup, ranking, and pad state.

This split assumes one game instance. Do not add a second live simulation or mutate these globals from unrelated UI components.

## Persistence and compatibility

`src/game/store.ts` writes localStorage key `yolk-rush-v4` and reads v4/v3/v2/v1 fallbacks. The store initializes from deterministic defaults and reconciles saved values only after mount to avoid SSR hydration mismatch.

If the persisted schema changes:

1. introduce a new key such as `yolk-rush-v5`;
2. retain read compatibility with prior keys;
3. continue writing the newest key;
4. update validation and hydration tests before shipping.

Do not mutate the current `Persist` shape in place and assume old saves remain valid.

## Generated and protected paths

- `src/routeTree.gen.ts`: generated by TanStack Router; never hand-edit.
- `native/ios/YolkRush/www/`: native build destination. The committed tree contains a stale partial snapshot whose referenced hashed JS/CSS are absent; rebuild with `npm run build:ios` before Xcode validation. Do not treat the stale files as source.
- `node_modules/`, `.vercel/`, `.output/`, `dist/`, logs, `screenshots/`, and `artifacts/`: generated/local.
- `.grok/`: ignored platform/tool state; clean clones may lack files expected by broad template tests.
- `public/audio/**`: original generated audio assets; follow `docs/audio/music-manifest.md` when replacing.

## High-risk modules

| Module / pattern            | Risk                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `src/game/EggRacer.tsx`     | Very large owner of controller, abilities, collision, surfaces, hazards, pickups, finish, bot AI, and presentation sync. |
| `src/game/Track.tsx`        | Owns course colliders, kinematics, hazards, pickups, sky, and Level 1 benchmark integration.                             |
| `src/game/GameCanvas.tsx`   | High-change renderer boundary; quality/remount mistakes affect mobile stability.                                         |
| `src/game/store.ts`         | Save compatibility, progression, economy, phase, and hydration all meet here.                                            |
| `src/components/GameUI.tsx` | Large UI file with confirmed dead legacy branches near live presentation code.                                           |
| Global mutable game state   | Reset/lifecycle mistakes leak state between races or UI mounts.                                                          |

## Known debt — do not mistake for design guidance

- `Ranker` currently mutates racer placement in render `useFrame`, although placement affects victory/results.
- `installInput` does not remove its anonymous `visibilitychange` listener.
- HUD sampling uses a half-duty clock expression rather than a clean edge-triggered cadence.
- Race time is player-gated; bot finish semantics after player completion are unclear.
- `GameUI.tsx` contains unused legacy title/gacha/results presentation code.
- No dedicated controller, ranking, audio, touch, or gacha tests were found at the baseline.

Fix these only with focused behavior tests and a task that names the debt; do not silently refactor them while doing unrelated work.

## Wrong vs correct

### Wrong

```tsx
useFrame(({ clock }) => {
  body.current?.setNextKinematicRotation(rotation(clock.elapsedTime));
});
```

### Correct

```tsx
useBeforePhysicsStep(() => {
  elapsed.current += PHYSICS_DT;
  body.current?.setNextKinematicRotation(rotation(elapsed.current));
});
```
