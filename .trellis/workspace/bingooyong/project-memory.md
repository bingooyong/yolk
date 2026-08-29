# Yolk Rush Project Memory

Last synchronized: 2026-08-29  
Source baseline: `4ce0ce90b37f83db55094b1716d23f01e5c0b7fb`

## Current project state

Yolk Rush is a Chinese-first 3D party obstacle race built as one full-screen React/R3F game. It has a web TanStack Start route and a standalone iOS WKWebView build that converge on `GameApp`. The active game uses browser-local progression. Server/database/auth/connector code is mostly dormant template infrastructure, not an active game backend.

## Durable decisions

- Keep the existing React + Three.js/R3F/Rapier stack; do not swap engines for visual work.
- Separate fixed-step gameplay from render presentation.
- Keep visual settings profile-driven and mobile-quality aware.
- Keep deterministic first render and reconcile localStorage after mount.
- Preserve v4/v3/v2/v1 game-save fallback; schema evolution needs a new key.
- Keep original procedural visual/audio assets; do not copy commercial-game art.
- Keep `0.0.0.0:8080` as the live-preview dev contract.
- Keep auth popup handling in Vite middleware, not a React route.
- Keep Nitro `serverDir: "./server"` for deployed PWA middleware.

## Important history and rationale

- The visual P0 task fixed sky clipping, immutable MSAA behavior, render-rate Rapier movement, character contact, material response, deterministic Level 1 art, and hydration instability.
- `src/game/course.ts` is a narrow compatibility/re-export facade over `levels.ts`; why it was introduced is unknown.
- The project grew rapidly from a template/initial shell to abilities, hub/results, and a visual benchmark in only a few commits, leaving some dead presentation branches and dormant dependencies.
- `CLAUDE.md` contains useful architecture notes but is untracked local guidance; Trellis specs are the durable source of truth.

## Known debt and pitfalls

- `EggRacer.tsx`, `Track.tsx`, `GameCanvas.tsx`, `store.ts`, and `GameUI.tsx` are high-change/high-risk.
- `Ranker` mutates placement in render `useFrame`; result victory depends on placement.
- `installInput` leaks an anonymous `visibilitychange` listener on repeated mount/unmount.
- HUD sampling is not a clean edge-triggered cadence.
- Race time is player-gated; post-player-finish bot semantics are unclear.
- `GameUI.tsx` contains dead legacy title/gacha/results code.
- Current game state is client-authoritative; users can edit localStorage.
- P2P expects `/api/rtc`, but no route or game integration exists.
- No CSP/SRI protects the injected Grok extensions script.
- Tracked native `www/index.html` references untracked hashed assets; clean checkout requires `build:ios`.
- Broad `npm test` can fail because ignored `.grok` template files are absent.
- Many template dependencies and Drei are not visibly imported; removal safety is unknown.
- No CI enforces the quality gate.

## Unknowns to investigate later

- Physical iPhone/iPad FPS, thermal, safe-area, offline font, and WKWebView behavior.
- Production provisioning, deployment environment, and secret rotation.
- Actual dependency-removal safety.
- Whether render-time ranking and player-gated time create user-visible bugs.
- App Store/native distribution constraints.
- Why partial native payload is tracked.
- Whether any dormant server/backend capability should become part of the product roadmap.

## Cautions for future agents

- Check for parallel Trellis tasks before interpreting dirty business files as baseline facts.
- Do not refactor large hot-path modules while doing unrelated visual or UI work.
- Do not move gameplay into `useFrame`.
- Do not treat local screenshot evidence or software-rendered FPS as device validation.
- Do not remove compatibility code based only on apparent non-use.
- Distinguish intentional platform infrastructure from dead code before deletion.
