# Research: Build, Test, Operations, Generated Artifacts, History, and Hidden Constraints

- Baseline commit: `4ce0ce90b37f83db55094b1716d23f01e5c0b7fb`
- Date: 2026-08-29
- Scope: read-only analysis of committed project state.
- Parallel-work policy: dirty files belonging to the concurrent skin pipeline are excluded from this baseline. This research uses the committed tree and the three pre-existing local dirty paths only as context.

## Evidence conventions

- `CONFIRMED` means directly visible in the committed code/config/tests/docs/git history.
- `INFERRED` means supported by multiple evidence points but not directly declared.
- `UNKNOWN` means repository evidence cannot settle the claim.

## 1. Technology and dependency baseline — CONFIRMED

`package.json` defines an ESM private npm workspace. The principal stack is:

- React 19 / React DOM
- TanStack Start, Router, and Router Plugin
- Vite 8 plus Nitro 3 beta (`preset: "vercel"`)
- Tailwind CSS 4
- Three.js, R3F, Rapier, and Drei
- Zustand
- Better Auth, Kysely, node-postgres, PGLite
- Playwright
- TypeScript, ESLint, Prettier

`package-lock.json` is committed. `npm install` is the documented dependency step (`README.md:9-16`).

Many template UI/data dependencies are not visibly imported by the game surface (for example most Radix packages, React Hook Form, React Query, Recharts, and Drei). This is `INFERRED` template/dependency weight, not proof that every package is safely removable; no dependency-removal audit was performed.

## 2. Command matrix — CONFIRMED

| Command                                    | Purpose / contract                                                                                                                                                                                    |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                              | Wrapper-injected Vite dev server at `0.0.0.0:8080`; live-preview host/port contract.                                                                                                                  |
| `npm run build`                            | Vercel-oriented Vite/Nitro production build, then `npm run db:migrate`.                                                                                                                               |
| `npm run build:dev`                        | Development-mode Vite build.                                                                                                                                                                          |
| `npm run build:ios`                        | Vite native build from `native/` into `native/ios/YolkRush/www`; output consumed by WKWebView.                                                                                                        |
| `npm run preview`                          | Wrapped production preview; Vite config binds loopback `127.0.0.1:8081`.                                                                                                                              |
| `npm run preview:restart` / `preview:stop` | Preview daemon lifecycle helpers.                                                                                                                                                                     |
| `npm run db:migrate`                       | Applies ordered `migrations/*.sql` to `DATABASE_URL`; skips when unset.                                                                                                                               |
| `npm run typecheck`                        | `tsc --noEmit`.                                                                                                                                                                                       |
| `npm run lint`                             | ESLint over repository, excluding generated/build directories and `src/routeTree.gen.ts`.                                                                                                             |
| `npm run format`                           | Prettier write-all; not a check-only command.                                                                                                                                                         |
| `npm run test`                             | Broad script tests plus app-data/auth TS tests. Current clone lacks ignored `.grok/app-env.json` and referenced `.grok/skills/og/references`, so this suite has known environment-dependent failures. |
| `npm run test:visual`                      | Focused visual/rendering/character/Level 1/store-hydration tests.                                                                                                                                     |
| `npm run smoke:visual`                     | Package-owned Playwright title→race desktop/mobile visual smoke.                                                                                                                                      |
| `npm run check:auth`                       | Compares live dev `VITE_AUTH_ENABLED` with next build value through `/__app-env`.                                                                                                                     |
| `npm run audio:bgm`                        | Python procedural BGM generation.                                                                                                                                                                     |

No GitHub Actions, GitLab CI, CircleCI, Dockerfile, Compose, `vercel.json`, or Netlify config exists in the committed tree. Deployment automation is therefore `UNKNOWN`; only the Vite/Nitro Vercel preset and generated Vercel output shape are confirmed.

## 3. Test architecture — CONFIRMED

Tests use Node's built-in test runner, not Jest/Vitest:

- `scripts/*.test.mjs`: platform/build/auth-env/PWA/migration/preview/browser-verdict/atomic-write behavior.
- `src/lib/app-data/app-data.test.ts`: connector proxy, failure memoization, error taxonomy, and login helpers.
- `src/lib/auth/gate-identity.test.ts`: signed gate identity, bearer identity, and session binding.
- `src/engine/visualProfile.test.ts`: quality, immutable MSAA remount, tone/color, and sky/frustum contract.
- `src/game/character-presentation.test.ts`: contact offset, idle clearance, anchored shadow, and state poses.
- `src/game/level1-benchmark.test.ts`: deterministic layout, depth bands, platform-backed guidance, finish alignment, and instancing.
- `src/game/store-hydration.test.ts`: deterministic first store render, saved-state reconciliation, and v4 persistence.

Current automated gaps: no dedicated tests were found for `EggRacer` controller physics, ranking semantics, `Track` collision behavior, audio, touch controls, gacha probabilities, or full game progression. These gaps are `CONFIRMED` by test inventory.

## 4. Browser and visual QA — CONFIRMED

- `scripts/browser-smoke.mjs` uses Playwright and browser-guard helpers; its broad path checks title/canvas/overflow/console/page errors and brand/auth invariants.
- `scripts/browser-smoke-verdict.mjs` supports baseline divergence and fail-closed verdicts.
- `scripts/visual-smoke.mjs` seeds a persisted player, reloads, enters title→level→race, captures desktop and mobile images, waits for a viewport-sized real R3F canvas, and rejects the 300×150 boot placeholder.
- `scripts/preview-thumbnail.mjs` captures guarded screenshots.
- Playwright is a dev dependency; no separate E2E directory or Playwright test runner config was found.

## 5. Build pipeline boundaries — CONFIRMED

### Web/TanStack path

`vite.config.ts` composes:

1. PGLite bootstrap plugin (serve only)
2. auth popup plugin (serve only, before TanStack)
3. app-env plugin
4. Grok PWA plugin
5. Tailwind
6. TanStack Start
7. Nitro Vercel preset for build/preview with `serverDir: "./server"`
8. React plugin

Removing Nitro's `serverDir` disconnects `server/middleware/grok-pwa.ts`; source tests guard this wiring.

### Native path

`vite.native.config.ts` sets root `native/`, relative base, manual `@` alias, public assets, no JS/CSS chunk splitting, assetsInlineLimit 0, and output `native/ios/YolkRush/www`. The Xcode WKWebView serves this directory through the custom `yolkrush` scheme.

### Server output

The committed `.vercel/output` is ignored generated output. It is not a source of truth, but its observed routing shape is filesystem-first with unmatched requests sent to the Nitro server function and `/assets/*` cached immutably.

## 6. Generated, ignored, and special paths — CONFIRMED

Do not hand-edit:

- `src/routeTree.gen.ts` — explicitly generated by TanStack Router.
- `node_modules/`, `.vercel/`, `.output/`, `dist/`, logs, screenshots, artifacts — generated/ignored.
- `.grok/` — ignored local platform/tool state; it may contain environment/skills expected by broad tests but is absent in a clean clone.
- `native/ios/YolkRush/www/` — native build destination. The repository currently tracks a stale snapshot (`index.html`, favicon, and `__grok` install assets) whose referenced hashed JS/CSS assets are not tracked. A clean checkout is therefore not a runnable iOS payload until `npm run build:ios` regenerates it.
- `public/audio/**` — generated original audio assets with a documented replacement policy in `docs/audio/music-manifest.md`.
- `public/__grok/**` — static platform install assets duplicated into native output by builds.
- `screenshots/` — ignored local visual evidence.

## 7. Source organization and code style — CONFIRMED / INFERRED

Confirmed:

- `src/routes` and `src/router.tsx` own the web shell.
- `src/native-entry.tsx` bypasses the router.
- `src/components` owns React UI/composition.
- `src/game` owns the R3F game, simulation, levels, state, input, audio, and skins.
- `src/engine` owns cross-game pipeline/device/visual/haptic utilities.
- `src/lib` owns server-only app-data/auth/db/multiplayer/preview infrastructure.
- `server` owns Nitro middleware.
- `scripts` owns build/QA/platform tooling.
- TypeScript is strict, isolatedModules, bundler resolution, `@/* -> src/*`.
- ESLint uses flat config and Prettier compatibility; generated/build paths are ignored.
- Prettier is configured for double quotes, trailing commas, and width 100.
- Documentation language is mixed: product docs are mostly Chinese, Trellis spec instructions require English.

Inferred conventions:

- Component/game files are named PascalCase; engine/game utility modules are camelCase.
- Tests are colocated and use `.test.ts` or `.test.mjs`.
- Runtime errors tend to be thrown at boundary modules; scripts use prefixed console messages or JSON verdicts. There is no centralized production logger.

## 8. Git history and high-change modules — CONFIRMED

Commit history is short but concentrated. Files changed most often at baseline:

1. `src/game/GameCanvas.tsx` — 8 changes
2. `src/game/store.ts` — 7
3. `src/game/EggRacer.tsx` — 7
4. `src/components/GameUI.tsx` — 7
5. `src/game/sim.ts` — 6
6. `src/game/config.ts` — 6
7. `src/game/audio.ts` — 6
8. `src/game/CameraRig.tsx` — 6
9. `src/game/Track.tsx` — 5
10. `package.json` — 5

Historical topics show rapid progression from initial shell → abilities/input/camera → hub/results → visual pipeline. The game core is both high-frequency and high-risk.

## 9. Hidden constraints and compatibility rules — CONFIRMED

1. Preserve dev server `0.0.0.0:8080`; live preview depends on it.
2. Do not create `src/routes/auth/popup.tsx`; the Vite serve middleware must own `/auth/popup`.
3. `getSql()` and app-data connector calls are server-only.
4. Preserve Nitro `serverDir: "./server"` or deployed PWA middleware is unwired.
5. Game save reads v4/v3/v2/v1 and writes v4; schema evolution needs v5 plus fallback.
6. PGLite pools/instances live on `globalThis` for HMR safety.
7. `migrations/*.sql` is the schema source; `migrations/auth/` is opt-in and not recursively applied.
8. PGLite/Neon result parsers normalize int8/date/interval to JSON-safe values.
9. Visual MSAA mode is immutable; canvas remount key handles low↔MSAA mode changes.
10. Gameplay/kinematic Rapier mutations use `useBeforePhysicsStep` and `PHYSICS_DT`.
11. `scripts/with-app-env.mjs` must wrap dev/build/preview so auth flags agree.
12. Original procedural visual/audio assets only; do not copy commercial-game material.
13. Browser-smoke file operations are guarded against non-loopback URLs and unsafe output paths.
14. Broad tests can depend on ignored local `.grok` state; distinguish environment failure from product regression before editing code.

## 10. Technical debt and risk register — CONFIRMED / INFERRED

- **High risk:** `EggRacer.tsx` (995 lines) owns controller, abilities, collision, surfaces, hazards, pickups, finish, bot AI, presentation sync, and rank outcome.
- **High risk:** `Track.tsx` (573 lines) owns all course colliders, kinematics, hazards, pickups, sky, and Level 1 benchmark integration.
- **High risk:** `GameUI.tsx` (748 lines) still contains dead legacy `TitleSheet`, `VolumeRow`, and `Results` branches alongside live UI.
- **High risk:** mutable globals (`sim`, `actions`, `touch`, active level, mover velocities, audio, texture caches) assume one game instance and require careful reset/lifecycle handling.
- **Boundary inconsistency:** `Ranker` mutates placement in render `useFrame`; placement affects victory/results.
- **Input cleanup debt:** anonymous `visibilitychange` listener is not removed by `installInput` cleanup.
- **HUD cadence debt:** current half-duty clock expression does not implement a clean edge-triggered 12 Hz sampler.
- **Native payload debt:** tracked `www/index.html` references untracked hashed assets; clean checkout cannot run in Xcode until rebuilt.
- **Dependency weight:** multiple template packages and Drei are not visibly imported; removal safety is `UNKNOWN`.
- **No CI:** no repository workflow enforces typecheck/test/build on push.
- **Physical-device gap:** iPhone/iPad FPS, thermal, safe-area, and WKWebView evidence remains `UNKNOWN`.
- **P2P utility gap:** `P2PRoom` expects `/api/rtc`, but no route implements it and no current game code instantiates the room.

## 11. Unknowns

- Production hosting/provisioning outside generated Vercel output.
- Real deployment env values and secret rotation policy.
- Why `course.ts` exists as a narrow re-export facade.
- Whether player-gated race time or render-time ranking produces user-visible bugs.
- Whether any dormant template dependency is safe to remove.
- Native App Store distribution constraints and offline Google-font behavior.
- Historical reason for tracked partial native payload.

## Related docs/specs

- `CLAUDE.md` — detailed current architecture/constraint notes, but it is untracked local guidance rather than durable Trellis spec.
- `docs/visual/**`, `docs/audio/**`, `docs/ui/ia.md`, `docs/features/abilities.md`.
- `.trellis/spec/frontend/visual-rendering.md`.
