# Research: Yolk Rush Phase 2 UI, flow, assets, performance, and QA audit

- Query: Audit the live game UI language, app flow, HUD state, gacha/result presentation, touch ergonomics, assets, performance instrumentation, browser/native constraints, and validation path for the Phase 2 visual upgrade.
- Scope: mixed — repository inspection plus local Chromium/Playwright runtime checks; no product-code edits.
- Date: 2026-08-28

## Files found

- `src/components/GameApp.tsx` — mounts lazy 3D canvas, music director, HUD shell, and touch controls; installs browser gesture/audio lifecycle handlers.
- `src/components/GameUI.tsx` — live countdown/pause/HUD/result/gacha orchestration, plus a large legacy title/gacha/results branch that is no longer rendered.
- `src/components/Hub.tsx` — current title/home experience with bottom navigation, level selection, character, inventory/gacha, and profile panes.
- `src/components/GachaCeremony.tsx` — staged capsule ceremony with rarity-dependent timing, sound, haptics, skip, and reduced-motion fast path.
- `src/components/ResultScreen.tsx` — staged victory/finish card, payout summary, next/replay/home actions, and confetti trigger.
- `src/components/TouchControls.tsx` — dynamic floating joystick, right-side look zone, and direct-Raf action-button state updates.
- `src/components/Confetti.tsx` — canvas confetti particles.
- `src/styles.css` — theme tokens, mobile gesture rules, HUD/touch styles, gacha animations, and reduced-motion overrides.
- `src/game/GameCanvas.tsx`, `src/game/store.ts`, `src/game/EggRacer.tsx`, `src/game/sim.ts`, `src/game/audio.ts`, `src/engine/device.ts` — supporting runtime evidence for HUD updates, quality/DPR, audio, and device constraints.
- `public/` — icon/share-card assets and 17 MB total layered music assets.
- `native/index.html`, `native/ios/YolkRush/Info.plist`, `native/ios/YolkRush/YolkRushApp.swift`, `vite.native.config.ts` — WKWebView/iPhone/iPad packaging constraints.
- `package.json`, `scripts/browser-smoke.mjs`, `scripts/browser-smoke-verdict.mjs`, `scripts/browser-guard.mjs` — available validation commands and current smoke limitations.
- `.trellis/spec/frontend/*.md` — all six frontend guides are currently template placeholders, so they provided no project-specific UI rules.

## Findings

### 1. Highest-priority findings

#### 1.1 Persisted local state causes a real SSR hydration error on reload

The store selects browser `localStorage` during module initialization (`src/game/store.ts:128-130`) and hydrates persisted values such as coins (`src/game/store.ts:54-117`). The server branch instead uses defaults, including `coins: 160` (`src/game/store.ts:128-152`). `Hub` directly renders those values (`src/components/Hub.tsx:17-23,38-39`).

A local Chromium reload after one gacha purchase left `localStorage` at 80 coins and produced:

> `Hydration failed because the server rendered text didn't match the client`
> `+ 80`
> `- 160`

The trace pointed through `Home -> GameApp -> GameUI -> Hub`. This is not theoretical: any returning player whose persisted coins/level/profile differ from defaults can trigger the error. It would also make `scripts/browser-smoke.mjs` exit with code 2 because page errors are fail conditions (`scripts/browser-smoke.mjs:100-107,120-139,162-165`).

**Recommendation:** render the deterministic server/default state first, apply persisted state in a post-mount effect, or supply a serialized server snapshot. Add a regression that mutates persistence, reloads, and asserts zero console/page errors.

#### 1.2 Current native `www` payload is not runnable and must be rebuilt before iOS validation

`vite.native.config.ts:17-20` builds into `native/ios/YolkRush/www` and intentionally emits separate assets. At audit time that directory was only 240 KB and contained `index.html`, favicon, icon, and install stylesheet; it had no emitted JavaScript, CSS, source map, or audio. The native shell loads `yolkrush://game/index.html` (`native/ios/YolkRush/YolkRushApp.swift:60-62`), so the current checked-out runtime payload cannot start the React app.

This is likely an unrun/ignored-build-output state rather than proof that the build config is broken. It is still a QA blocker for the current workspace.

**Recommended gate:**
```bash
npm run build:ios
xcodebuild -project native/ios/YolkRush.xcodeproj \
  -scheme YolkRush \
  -configuration Debug \
  -destination 'generic/platform=iOS Simulator' build
```
Then launch the simulator and verify title, race, gacha, pause/resume, visibility/audio suspension, orientation, and safe areas. `xcodebuild -list` already found target and scheme `YolkRush`; Xcode 26.6 is installed.

#### 1.3 Existing QA is not currently a clean baseline

Commands run from the repository root:

- `npm run typecheck` — **passed**.
- `npm run lint` — **failed**, exit 1.
  - One unrelated error: `src/lib/app-data/client.server.ts:214` empty block.
  - Thirteen warnings in the audited `GameUI.tsx` for unused store selectors and unused `TitleSheet`, `VolumeRow`, and `Results` functions (`src/components/GameUI.tsx:46-68,285,510,669`).
  - Other warnings exist in `EggRacer.tsx`, `levels.ts`, and auth code.
- `npm test` — **failed**: 179/195 passed, 16 failed. Failures cluster in brand/PWA/env expectations and a missing `.grok/skills/og/references` directory; they are not UI-component tests. No tests currently exercise the requested visual/game-flow states.
- Production web and iOS builds were intentionally not run because both write outside this research role's permitted scope.

A first quality-gate attempt also briefly failed with missing `tsc`/`eslint`; `node_modules` appeared while another concurrent agent was working. The final typecheck/lint/test results above were from the installed state.

**Recommendation:** before visual edits, make the expected current baseline explicit. Either fix the unrelated red gates or scope the Phase 2 check to `typecheck`, lint target files, a new game-flow smoke suite, and build gates. Do not treat the current full `npm test` as a reliable visual regression signal.

#### 1.4 The existing browser smoke is title-only and cannot write artifacts in this checkout

`scripts/browser-smoke.mjs` captures 1280×800 and 390×844 screenshots, checks title/canvas/overflow/body-text/console errors, and writes a verdict (`scripts/browser-smoke.mjs:62-67,98-125,152-165`). However:

- There is no package script for it.
- Output paths are hard-guarded to `/workspace` (`scripts/browser-smoke.mjs:29-33`; `scripts/browser-guard.mjs:33-41`).
- `/workspace` does not exist on this machine.
- It does not click PLAY, enter a race, trigger gacha, inspect HUD/control geometry, or capture result/confetti states.

The default dev port 8080 was occupied by an unrelated Java process, so a stable smoke command also needs an explicit free port. A direct local invocation shape is:

```bash
node scripts/with-app-env.mjs ./node_modules/.bin/vite \
  --host 127.0.0.1 --port <free-port> --strictPort
node scripts/browser-smoke.mjs http://127.0.0.1:<free-port>/ \
  /workspace/screenshots/yolk.png
```

But that output path will fail here unless `/workspace` exists.

**Recommendation:** add a package-owned smoke script with a configurable, guarded artifact directory and a second flow script for title → level sheet → countdown/HUD → touch controls → gacha reveal → result. Store stable baselines outside `docs/visual` only if that is the task's agreed artifact policy.

### 2. App flow and UI-language audit

The live flow is coherent:

1. Title phase renders `Hub` (`src/components/GameUI.tsx:162`).
2. Home exposes PLAY (`src/components/Hub.tsx:46-61`) and bottom navigation (`src/components/Hub.tsx:90-102`).
3. The play pane selects a level and starts (`src/components/Hub.tsx:139-185`).
4. Countdown advances to GO (`src/components/GameUI.tsx:74-90,154-160`).
5. Race HUD and touch controls appear for playing/countdown (`src/components/GameUI.tsx:137-151`; `src/components/TouchControls.tsx:10-31`).
6. Results are rendered by `ResultScreen` (`src/components/GameUI.tsx:195-207`).
7. Gacha is initiated from inventory (`src/components/Hub.tsx:240-303`) and presented by `GachaCeremony` while still in title phase (`src/components/GameUI.tsx:209-219`).

The main presentation problem is inconsistent language. The document/root locale is Chinese (`src/routes/__root.tsx:6,45-47`), and most copy is Chinese, but primary actions switch among:

- English `PLAY`, `START`, `VICTORY`, `NEXT LEVEL`, `PLAY AGAIN`, `HOME`, `FIRST WIN`, `RACE FINISHER`, `TEN RACES`, `FOUR COURSES`.
- Chinese `开始`, `比赛`, `再来一局`, `返回首页`, `收下 · 装备`.
- Mixed aria labels: visible Chinese nav labels are Chinese (`src/components/Hub.tsx:96-100`), but action labels are `Play`, `Back`, and `Start` (`src/components/Hub.tsx:53,78,176`).

Examples: `Hub.tsx:51-60,164-184`; `ResultScreen.tsx:65-99`; `Hub.tsx:315-345`.

**Recommendation:** define a Phase 2 language rule before restyling. For this product, use Chinese-first UI copy and localized aria labels, reserving English for the `YOLK RUSH` brand mark and proper nouns. This also improves screen-reader consistency.

### 3. `GameUI.tsx` contains a large dead legacy presentation branch

The only `TitleSheet`, `GachaPanel`, `VolumeRow`, and old `Results` call path is unreachable from the live component. `GameUI` renders the new `Hub` for title (`src/components/GameUI.tsx:162`) and `ResultScreen` for results (`src/components/GameUI.tsx:195-207`); repository search found no JSX references to these legacy functions.

Dead ranges include:

- `TitleSheet` and its scroll-unlock/start logic: `src/components/GameUI.tsx:285-448`.
- Old settings panel variants and `VolumeRow`: `src/components/GameUI.tsx:450-547`.
- Old level/gacha panels: `src/components/GameUI.tsx:549-657`.
- Old `Results` leaderboard card: `src/components/GameUI.tsx:669-748`.
- Unused store selectors at `src/components/GameUI.tsx:46-68`.

`styles.css` also has `.gacha-bob` only for the dead old gacha panel (`src/styles.css:215-223,304-306`) and its reduced-motion entry (`src/styles.css:327-340`); the live ceremony uses the other gacha classes.

This explains 13 target-file lint warnings and creates a high risk that Phase 2 edits improve the wrong presentation. **Recommendation:** delete the dead branch and now-unused imports/constants/CSS after confirming `Hub`, `GachaCeremony`, and `ResultScreen` are canonical. That should be a prerequisite to further visual changes.

### 4. HUD state

Current HUD shows place, time, run coins, dash status, fail hint, and a top-four rank list (`src/components/GameUI.tsx:137-151,224-281`). Runtime at 390×844 showed readable text: `第 5 名`, `0:02.83`, `币 0`, `冲刺`.

Issues:

1. **Update cadence and precision disagree.** `HudPump` calls `pullSim()` when `floor(clock.elapsedTime * 12) % 2 === 0`, effectively about 6 Hz (`src/game/GameCanvas.tsx:31-38`). The formatter renders hundredths (`src/components/GameUI.tsx:32-36`), so time visibly advances in coarse ~0.17 s jumps.
2. **Rank list is hidden on the primary iPhone target.** It uses `hidden ... sm:flex` (`src/components/GameUI.tsx:266-280`), so 390 px players only see their own place. Consider a compact top-two/progress strip or reveal toggle.
3. **Dash HUD does not represent charge.** It marks `ready` whenever `dashCd <= 0` and fills only cooldown (`src/components/GameUI.tsx:237,253-263`). The simulation and touch pad distinguish idle/charging/ready/release/active/recovery and charge level (`src/game/sim.ts:32-44`; `src/game/EggRacer.tsx:651-668`; `src/components/TouchControls.tsx:163-185`). Consequently the HUD can show full/ready while the player is still holding to charge.
4. `pullSim` reallocates/maps/sorts racer data at each update (`src/game/store.ts:416-442`), and `Ranker` copies/sorts every frame (`src/game/GameCanvas.tsx:14-28`). Small at eight racers, but it should be included in instrumentation before adding richer Phase 2 HUD effects.

**Recommendation:** choose 10 Hz or exact accumulated HUD timing if hundredths remain visible; reuse one derived rank array; expose dash state/charge rather than only cooldown; and add a compact mobile ranking treatment.

### 5. Gacha presentation

Strengths:

- Rarity controls ceremony length (`common` 700 ms shake; `legendary` 1900 ms) (`src/components/GachaCeremony.tsx:10-17,40-74`).
- Sound/haptics accompany drop, shake, glow, burst, and reveal (`src/components/GachaCeremony.tsx:40-87`).
- Skip unlocks after 480 ms and cannot fire twice (`src/components/GachaCeremony.tsx:35-36,82-87`).
- `prefers-reduced-motion` jumps directly to reveal (`src/components/GachaCeremony.tsx:19-21,34-47`), and CSS disables live gacha animations (`src/styles.css:327-340`).
- Runtime gacha from inventory showed a full-screen dialog, rarity/name/equipped state, and a 320×48 primary action at 390 px.

Defects and polish opportunities:

1. **Legendary spark distribution is wrong.** The code generates 22 legendary sparks but divides each angle by hardcoded `14`: `Array.from({ length: 22 })` with `(i / 14) * Math.PI * 2` (`src/components/GachaCeremony.tsx:89-96`). Angles wrap and overlap after 14. Use the actual array length or a low-discrepancy angle.
2. **State commits before player accepts.** `pullGacha` deducts coins, adds/equips the skin, and persists before the ceremony (`src/game/store.ts:491-508`); `onDone` only clears `lastPull` (`src/game/store.ts:510`). Thus `收下 · 装备` implies acceptance/equip but both already happened. Either label it `知道了`/`已装备`, or stage the result and commit/equip on Done with an explicit rollback-safe persistence boundary.
3. **Duplicate refund is duplicated as a magic number.** The ceremony hardcodes `25` (`src/components/GachaCeremony.tsx:172-174`) while the source of truth is `DUP_REFUND = 25` (`src/game/skins.ts:29-31`). Import the constant or pass a formatted reward string.
4. **Dialog accessibility is incomplete.** The overlay is `role="dialog"` but not `aria-modal`, has no initial focus, focus trap, or Escape handling, and skip is click-only (`src/components/GachaCeremony.tsx:101-107,180-182`). Keyboard users can still tab into the Hub underneath.
5. Shake sound runs every 140 ms while the visual loop is 180 ms (`src/components/GachaCeremony.tsx:76-80`; `src/styles.css:307-309`), so audio/visual pulses drift. Align intervals.

### 6. Result screen and confetti

`ResultScreen` has a clear staged sequence: trophy at 280 ms, stats at 720 ms, actions at 1180 ms (`src/components/ResultScreen.tsx:35-48,57-102`). It correctly gates confetti on first place and step 1 (`src/components/ResultScreen.tsx:31-35,50-55`), and mobile uses a bottom sheet with safe-area padding (`src/components/ResultScreen.tsx:51-56`).

Problems:

1. **Confetti never terminates its Raf loop.** It spawns 80 total particles, decrements life by 0.006 per frame, and never removes dead particles (`src/components/Confetti.tsx:16-31,44-61`). Once all are dead, the result overlay remains active and the loop continues `clearRect` plus 80 iterations indefinitely. Stop after all lives reach zero (or after a fixed duration), and remove/filter dead particles.
2. **Canvas resize checks only width.** `if (canvas.width !== w * dpr)` updates width/height (`src/components/Confetti.tsx:34-42`); a height-only change can leave stale buffer height. Compare width and height.
3. **No reduced-motion bypass for result choreography/confetti.** CSS reduced-motion rules do not cover the timed result reveals or canvas confetti (`src/styles.css:327-340`). For reduced motion, show complete content/actions immediately and disable confetti.
4. The result card omits the full standings even though the old dead `Results` component had one (`src/components/GameUI.tsx:718-735`). If Phase 2 aims at race clarity, add a collapsed podium/standings rather than retaining dead code.
5. Like the rest of the UI, `VICTORY`/`NEXT LEVEL`/`PLAY AGAIN`/`HOME` should be localized consistently.

### 7. Touch controls and viewport ergonomics

Strengths:

- Controls appear only on touch/coarse/small-screen profiles during countdown/playing (`src/components/TouchControls.tsx:10-17`; `src/engine/device.ts:28-46`).
- Joystick, look zone, and action buttons use pointer capture and cancel handling (`src/components/TouchControls.tsx:55-88,116-148,199-242`).
- Action button class/ring changes run in one Raf loop with direct DOM updates rather than React re-renders (`src/components/TouchControls.tsx:163-197`).
- Extra hit area is intentionally inflated (`styles.css:119-123`), and the action pad shrinks in short landscape viewports (`styles.css:207-213`).

Observed geometry at 390×844:

- `Skill locked`: 38×38.
- Roll/Pounce/Dash: 56×56.
- Jump: 100×100.
- No horizontal document overflow.

Observed geometry at 390×667 and 844×390:

- The play sheet is scrollable and the PLAY action is initially below the visible sheet area; Playwright auto-scrolled it into view before clicking.
- On 390×667, the action button was initially laid out under the bottom navigation region before scroll; the nav is z-30 while the sheet is z-20 (`src/components/Hub.tsx:64-87,90-102`).
- Landscape is functional but especially scroll-dependent.

Other issues:

- Joystick movement updates React state on every pointer move (`src/components/TouchControls.tsx:35-75`), unlike the action pad's direct DOM loop. Current visuals are small, but Phase 2 should not enlarge the React-updated subtree per move.
- The look zone starts at `max(58px, safe-area+48px)` (`src/components/TouchControls.tsx:116-127`), while top buttons end around 60 px in the observed no-safe-area viewport. This leaves only a tiny overlap, but a clearer offset from actual button bounds would be safer.
- iOS haptics are effectively absent: `navigator.vibrate` is used and the implementation explicitly notes most iOS Safari versions do not support it (`src/engine/haptics.ts:3-9`). WKWebView should not advertise haptics as a working setting without a native bridge.

**Recommendation:** make primary sheet actions a sticky footer inside the sheet with scroll-body padding; keep direct-DOM updates for per-frame control visuals; verify final geometry on iPhone SE (390×667), iPhone Pro (390×844/DPR3), and short landscape; and either bridge haptics natively or label the setting as unsupported on iOS.

### 8. Performance evidence and missing instrumentation

Runtime checks used local Vite + Chromium. A fresh mobile-emulated context had:

- iPhone UA, touch enabled, 390×844 viewport, DPR 3.
- Canvas buffer 585×1266 (the device quality cap selected 1.5, not raw DPR 3).
- DOMContentLoaded ~3230 ms; first paint/FCP ~3232 ms; heap ~65 MB at title.
- Race sample over 2 seconds: 241 frames, ~120 FPS, 8.32 ms average, 10.6 ms p95, zero long tasks, ~82 MB JS heap.
- No horizontal overflow.
- Console had zero errors on a fresh context, but three Three.js deprecation warnings:
  - `THREE.Clock` deprecated.
  - Deprecated Rapier initialization parameter style.
  - `PCFSoftShadowMap` deprecated.

A separate normal Chromium run measured the Google Fonts CSS at ~4269 ms duration, 184,909 bytes transferred, and 673,143 bytes decoded. In dev mode the largest resources were unminified Vite dependencies (for example Three and Rapier), so those transfer sizes must not be quoted as production bundle size.

Current controls are static quality policy rather than adaptive performance management:

- Device heuristic chooses low/medium/high (`src/engine/device.ts:28-46`).
- Quality maps to DPR and shadow map size (`src/engine/device.ts:80-89`).
- Canvas consumes the setting for DPR/antialias/shadows and requests `high-performance` WebGL (`src/game/GameCanvas.tsx:61-95`).
- There is no runtime FPS/frame-time sampler, draw-call/triangle counter, physics-step duration, HUD commit count, audio decode timeline, thermal/visibility telemetry, or automatic quality downgrade.

**Recommendation:** add a gated `?debug=perf` overlay and User Timing marks for shell paint, canvas first frame, physics ready, first race frame, audio unlock/decode, gacha open, and result open. Record rolling FPS/p95 frame duration, renderer info, canvas pixel size, selected quality, JS heap where available, and long tasks. Keep automation thresholds conservative: local Chromium at 120 FPS/DPR3 is useful for regressions but not a substitute for iPhone/iPad hardware.

### 9. Assets and delivery

Public asset inventory:

- Total public assets: ~17 MB.
- Level music: ~14 MB across 15 MP3 stems (each level has three ~0.86–1.0 MB layers).
- Menu music: ~2.8 MB across three stems.
- Victory/defeat: ~120 KB each.
- `public/og.jpg`: 84 KB, 1200×630.
- `public/x-banner.jpg`: 40 KB, 1200×264.
- App/web icon: 4 KB, 180×180.
- Native app icon: 16 KB, 1024×1024.

Audio is fetched/decoded into an in-memory map (`src/game/audio.ts:219-227`). First unlock preloads three menu layers plus victory/defeat (`src/game/audio.ts:258-278`), and low quality skips the high layer (`src/game/audio.ts:229-240`). Unused level buffers are evicted while preserving menu/current/stingers (`src/game/audio.ts:242-255`). That design is sensible, but Phase 2 QA should measure decode time/memory on real devices and consider lazy-loading the next level during late race progress.

Fonts are loaded from Google Fonts in both web root HTML (`src/routes/__root.tsx:34-42`) and native HTML (`native/index.html:14-19`). This is a native offline/latency risk: the stylesheet is remote and render-blocking. **Recommendation:** bundle a subsetted WOFF2 or use system Chinese fonts as the immediate native first-paint path, and only fetch optional display type asynchronously.

### 10. Browser/native constraints

Web app:

- Viewport is fixed to device width, cover, no zoom (`src/routes/__root.tsx:13-16`).
- Body/root use `100dvh`, hidden overflow, no overscroll (`src/styles.css:38-56`).
- Game root disables touch action, selection, callout, and tap highlight (`src/styles.css:70-77`).
- `GameApp` blocks iOS gesture/context events and suspends/resumes audio on visibility (`src/components/GameApp.tsx:18-39`).
- Route and native entry both mount the same `GameApp` (`src/routes/index.tsx:1-11`; `src/native-entry.tsx:1-6`).

iOS packaging:

- Deployment target 16.0; iPhone/iPad device families; fullscreen required (`native/ios/YolkRush.xcodeproj/project.pbxproj:149-218`).
- 120 Hz is enabled by `CADisableMinimumFrameDurationOnPhone` (`native/ios/YolkRush/Info.plist:27-28`).
- All needed orientations are supported, with upside-down only on iPad (`native/ios/YolkRush/Info.plist:40-52`).
- WKWebView uses a custom `yolkrush` scheme, JavaScript, mobile content mode, no scroll bounce, no back gestures, and inspector support on iOS 16.4+ (`native/ios/YolkRush/YolkRushApp.swift:25-62`).
- Arbitrary ATS loads are disabled (`native/ios/YolkRush/Info.plist:53-57`), so HTTPS Google Fonts remain permitted but offline behavior must still be tested.
- Safe-area handling is present in the game root, HUD, Hub, touch controls, and result card, but actual notch/home-indicator insets require simulator/device screenshots.

## Recommended validation plan

1. **Static gates**
   ```bash
   npm run typecheck
   npm run lint
   npm test
   ```
2. **Web production gate**
   ```bash
   npm run build
   npm run preview
   ```
   Add a package script for browser smoke and use an explicit free port.
3. **Flow screenshots in fresh contexts at minimum:**
   - 1280×800 desktop title/HUD.
   - 390×844 DPR3/touch title, play sheet, countdown, race HUD, gacha reveal, victory result.
   - 390×667 title/play sheet/action layout.
   - 844×390 landscape title/play sheet/action layout.
4. **Runtime assertions:**
   - zero console/page errors after persistence-changing reload;
   - no horizontal overflow in all capture states;
   - PLAY/Start reachable without ambiguous nav overlap;
   - gacha reduced-motion path reveals immediately;
   - confetti loop stops;
   - pause hides controls and resumes safely;
   - visibility change suspends/resumes audio.
5. **Production artifacts:**
   ```bash
   npm run build:ios
   xcodebuild -project native/ios/YolkRush.xcodeproj \
     -scheme YolkRush -configuration Debug \
     -destination 'generic/platform=iOS Simulator' build
   ```
6. **Device-class performance:** collect the same timing/frame metrics on a physical low/medium iPhone and an iPad; do not accept desktop Chromium 120 FPS as final hardware evidence.

## Related specs

- `.trellis/spec/frontend/index.md` and all linked guides are placeholders (“To be filled by the team”), including component, hook, state, quality, type-safety, and directory guidance.
- `.trellis/workflow.md` requires research to be persisted and planning artifacts to remain task-local; this audit follows that requirement.

## Caveats / Not Found

- The task PRD is still entirely TBD (`prd.md`), so this audit infers the visual-upgrade scope from the dispatched file list rather than approved acceptance criteria.
- No production web/iOS build was run because both create files outside the permitted research-write scope; native `www` incompleteness therefore identifies current workspace state, not a proven build failure.
- Chromium mobile emulation cannot reproduce iPhone GPU, thermal, WKWebView scheduler, real safe-area insets, or physical touch latency. Its DPR3/touch context is a useful geometry/smoke proxy only.
- The large Vite dependency transfer sizes are development-mode values and must not be treated as final bundle size.
- The result/confetti presentation was statically audited; a forced result-state injection did not update the live React store instance, so no false result runtime claim is made beyond the code and flow evidence.
- Other agents were concurrently active in the workspace; this research changed only the assigned audit file.
