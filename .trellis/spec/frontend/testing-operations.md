# Testing and Operations

## Command matrix

| Command                | Use                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| `npm run dev`          | Start the platform-contracted Vite server at `0.0.0.0:8080`. Do not change host/port casually. |
| `npm run build`        | Vercel-oriented production build plus deploy migration.                                        |
| `npm run build:ios`    | Rebuild the WKWebView payload into `native/ios/YolkRush/www`.                                  |
| `npm run preview`      | Serve production output on loopback `127.0.0.1:8081`.                                          |
| `npm run typecheck`    | Required TypeScript gate.                                                                      |
| `npm run lint`         | Required repository ESLint gate.                                                               |
| `npm run test`         | Broad script/app-data/auth gate; can depend on ignored local `.grok` files.                    |
| `npm run test:visual`  | Focused visual/profile/contact/Level 1/hydration tests.                                        |
| `npm run smoke:visual` | Playwright title→race desktop/mobile smoke with persisted reload.                              |
| `npm run check:auth`   | Compare live and next-build auth flags.                                                        |

`npm run format` rewrites files; do not use it as a check-only gate.

## Choosing validation by change type

- Rendering/visual/course/character changes: `test:visual`, `typecheck`, targeted lint, production build, and `smoke:visual` where practical.
- Persistence changes: store hydration test plus visual smoke’s persisted reload.
- Auth/app-data/DB changes: relevant focused TS tests, `check:auth`, typecheck, and production build.
- Build/platform scripts: their colocated Node tests plus both web and native builds when the entry graph changes.
- Audio changes: verify manifest/prompt documentation and layered loop behavior manually.

No CI workflow exists in the repository. A clean local validation run is required before claiming completion; do not assume push-time checks will catch regressions.

## Test framework and placement

Tests use Node's built-in runner:

- script/tooling tests: `scripts/*.test.mjs`;
- source-focused tests: colocated `.test.ts` files.

There is no Jest/Vitest config and no Playwright test-runner config. Playwright is invoked by scripts.

Known missing automated coverage at the baseline:

- `EggRacer` character controller and ability physics;
- ranking/finish semantics;
- Track collision and moving-platform carry behavior;
- audio;
- touch ergonomics;
- gacha probabilities;
- progression integration.

Do not claim these are verified just because typecheck/lint/build pass.

## Browser and visual QA rules

- `scripts/visual-smoke.mjs` must wait for a real viewport-sized R3F canvas; a 300×150 canvas is only the boot placeholder.
- Mobile smoke must use a real 390×844 viewport, not top-level width/height fields that Playwright ignores.
- Persisted-state reload is part of the visual gate because first-render defaults intentionally differ from reconciled saved state.
- Browser scripts must continue using loopback/output guards.
- Desktop Chromium performance is not iPhone/iPad evidence. Use `?debug=perf` only as a renderer counter probe; hardware FPS/thermal/safe-area results remain separate.

## Web and native build boundaries

The web config composes PGLite bootstrap, auth popup, app env, PWA, Tailwind, TanStack, Nitro, and React plugins. Auth popup middleware must precede TanStack. Nitro must retain `serverDir: "./server"`.

The native config uses root `native/`, relative base, manual `@` alias, and output `www/`. It intentionally omits the server/TanStack path.

The committed native `www/index.html` references untracked hashed assets. A clean checkout is not a runnable iOS payload. Run `npm run build:ios`, then Xcode, for native validation; do not hand-edit stale generated files.

## Generated/local paths

Do not hand-edit or commit regenerated build output:

- `src/routeTree.gen.ts`
- `.vercel/`
- `.output/`
- `dist/`
- logs and screenshots
- newly generated `native/ios/YolkRush/www/assets|audio|images`

`.grok/` is ignored and may be absent in clean clones; broad tests that expect its files can fail for environment reasons. Record the exact failure before classifying it as a product regression.

## Required reporting discipline

When validation cannot pass or cannot run, report:

1. exact command;
2. exit status;
3. representative failure;
4. whether it is a pre-existing/environmental issue;
5. focused test that covers the changed surface.

Never suppress a broad failure or replace it with an unrelated passing command.
