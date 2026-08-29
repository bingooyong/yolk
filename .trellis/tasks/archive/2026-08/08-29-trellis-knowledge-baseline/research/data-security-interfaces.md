# Research: Data, API, Security, Multiplayer, and Deployment Interfaces

- Query: Audit Yolk Rush data, server/API interfaces, auth/security/isolation, database/migrations, app-data connectors, multiplayer P2P, external services, logging/error handling, and environment/deployment contracts; classify findings and map actual flows, trust boundaries, compatibility constraints, risks, and debt.
- Scope: internal
- Date: 2026-08-29

## Evidence conventions

- `CONFIRMED` means the statement is directly supported by current source/config/tests/docs or a command run in this workspace.
- `INFERRED` means multiple direct evidence points support the conclusion but no one line declares it.
- `UNKNOWN` means the repository cannot establish the fact, usually because platform provisioning/proxy behavior is external.

Validation run during this read-only audit:

- `npm run typecheck` — passed (`tsc --noEmit`).
- `npm run lint` — exited 0, with 17 warnings in game/auth UI files.
- `node --experimental-strip-types --test src/lib/app-data/app-data.test.ts src/lib/auth/gate-identity.test.ts` — 32/32 passed.
- `npm run test` — failed before reaching the TypeScript suite; the failures included missing `.grok/app-env.json` and missing `.grok/skills/og/*`, plus OG-title expectations. Relevant security/data unit suites were then run directly and passed.
- No build was run because this researcher is prohibited from modifying generated artifacts.

## Files found

- `src/lib/db.ts` — dual Neon PostgreSQL / embedded PGLite SQL abstraction and migration bootstrap.
- `src/lib/app-data/*` — server-only Grok connector proxy, error taxonomy, login routing helpers, and tests.
- `src/lib/auth/*` — Better Auth client/server, OAuth popup, gate identity/session, isolation middleware, PGLite dialect, gates, and tests.
- `src/lib/multiplayer/p2p.ts` — full-mesh WebRTC client and `/api/rtc` signaling contract.
- `migrations/auth/0001_auth.sql` — opt-in Better Auth Postgres schema.
- `scripts/migration-plan.mjs`, `scripts/migrate.mjs` — shared migration ordering and deploy-time Postgres applier.
- `scripts/with-app-env.mjs`, `scripts/app-env-plugin.mjs`, `scripts/check-auth-invariant.mjs` — compile-time auth environment consistency machinery.
- `scripts/grok-pwa-plugin.mjs`, `scripts/grok-pwa-shared.mjs`, `server/middleware/grok-pwa.ts` — Vite/Nitro PWA, install page, OG metadata, and external extensions injection.
- `vite.config.ts`, `vite.native.config.ts`, `package.json`, `.vercel/output/*` — web/native/Vercel build and deployment contracts.
- `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/router.tsx`, `src/routeTree.gen.ts` — actual SSR router surface.
- `src/game/store.ts`, `src/game/audio.ts` — current browser persistence and static audio fetch flow.
- `src/lib/preview-host-bridge.ts`, `src/lib/preview-embedder-origin.ts` — sandbox/host postMessage interface.
- `src/lib/error-component.tsx` — global router error presentation.
- `native/index.html`, `src/native-entry.tsx`, `native/ios/YolkRush/Info.plist` — offline WKWebView path and native security/deployment settings.

## Executive architecture

1. **CONFIRMED — The shipped game’s active web path is a single SSR route with browser-local persistence, not a database-backed app.**
   - The generated route surface contains only `/` (`src/routeTree.gen.ts:20-59`), which mounts `GameApp` (`src/routes/index.tsx:4-10`).
   - `GameApp` reconciles persisted game state after mount; state is loaded from `localStorage` and written back on changes (`src/game/store.ts:79-130`, `src/game/store.ts:374-399`).
   - There is no non-test invocation of `createServerFn`, `getSql`, `callTool`, or `authMiddleware` anywhere in `src/`, `server/`, or `scripts/`; the only matches are library definitions, comments, and examples (`src/lib/auth/middleware.ts:10-26`, `src/lib/app-data/server-only.ts:6`). This makes DB, connector, and authenticated server-function capability dormant infrastructure.

2. **CONFIRMED — Native is a deliberately narrower standalone shell.**
   - `src/native-entry.tsx:5-8` directly renders `GameApp`; it bypasses router, SSR, auth provider, preview bridge, DB, and server functions.
   - Native builds use `vite.native.config.ts`, output local web assets, and disable asset inlining (`vite.native.config.ts:6-22`).
   - The app allows only HTTPS by ATS (`NSAllowsArbitraryLoads=false` in `native/ios/YolkRush/Info.plist`) but still loads Google Fonts over the network (`native/index.html:14-19`). Therefore “offline” is only offline for local code/assets, not guaranteed with no network.

3. **CONFIRMED — Web deployment is TanStack Start + Nitro Vercel preset, but the only implemented Nitro middleware is platform PWA/OG chrome.**
   - The plugin chain explicitly enables Nitro only for build/preview, preset `vercel`, and `serverDir: "./server"` (`vite.config.ts:169-180`).
   - `server/middleware/grok-pwa.ts:63-110` implements the manifest, install page, and HTML head injection; `server/` contains no API route or auth handler.
   - The generated Vercel routing config sends unmatched routes to the Nitro server function and caches `/assets/*` immutably (`.vercel/output/config.json:8-21`).

## Actual request and data flows

### 1. Current game / browser flow

`CONFIRMED`

```text
Browser GET /
  -> TanStack root/index SSR route
  -> GameApp mounts
  -> localStorage v4 (or v1-v3 fallback) is parsed/normalized after mount
  -> Zustand actions save a new v4 JSON object on game/economy/settings changes
  -> audio preload fetches relative ./audio/... URLs
  -> fonts and injected platform extension script are external
```

Evidence:

- Only `/` exists (`src/routeTree.gen.ts:20-59`).
- Local storage compatibility chain and defensive field normalization are in `src/game/store.ts:52-121`.
- Writes use `SAVE_KEY = "yolk-rush-v4"` and silently ignore quota/serialization failure (`src/game/store.ts:124-130`).
- Game completion and gacha mutate trusted client state before persistence (`src/game/store.ts:452-514`).
- Audio tracks are relative URLs and fetched in the browser (`src/game/audio.ts:16-82`, `src/game/audio.ts:213-232`).
- Root HTML preloads/loads Google Fonts (`src/routes/__root.tsx:34-42`); platform chrome injects `https://grok.com/grok-app-builder/extensions.js` (`scripts/grok-pwa-shared.mjs:203-241`).

Implication: economy/progression integrity is a client concern. A user can alter local storage or state; there is no server authority. This is acceptable only while skins/coins are cosmetic/local.

### 2. Development OAuth popup flow

`CONFIRMED as implemented for Vite serve; dormant in the current UI`

```text
UI click (if wired)
  -> signIn sees *.grok-sandbox.com
  -> opens same-origin GET /auth/popup?providerId=...
  -> Vite middleware intercepts before TanStack
  -> popup.server asks Better Auth to start OAuth
  -> 302 to Grok broker/upstream
  -> callback returns /auth/popup?done=1
  -> completion HTML reads __Host session cookie
  -> postMessage(session token) to same-origin opener
  -> client stores bearer in sessionStorage
```

Evidence:

- Middleware intercepts only GET `/auth/popup` and rejects other methods (`vite.config.ts:64-85`).
- It is registered before `tanstackStart()` so a React route cannot win (`vite.config.ts:160-169`).
- Popup completion reads the session cookie, marks the page `no-store`, and posts the token (`src/lib/auth/popup.server.ts:32-51`).
- The popup redirects broker-side and forwards state/PKCE cookies (`src/lib/auth/popup.server.ts:62-104`).
- The opener accepts messages only from its own origin (`src/lib/auth/client.ts:176-205`).
- The plugin is `apply: "serve"`; production uses full-page OAuth by design (`vite.config.ts:54-63`).

Current-state caveat: no component imports `signIn`, `SignedIn`, `RedirectToSignIn`, or `UserButton`; these are library-only today.

### 3. Expected authenticated server-function flow

`CONFIRMED as library contract; UNKNOWN runtime because no server function currently uses it`

```text
React client
  -> TanStack createServerFn POST
  -> authMiddleware.client forwards preview bearer if present
  -> authMiddleware.server
       1. rejects scripted cross-site/sibling requests
       2. resolves Better Auth session cookie or bearer
       3. returns verified userId
  -> handler scopes every query by userId
```

Evidence:

- Client hook forwards the bearer as `sendContext` (`src/lib/auth/middleware.ts:28-35`).
- Server hook calls isolation and `requireUserId` before the handler (`src/lib/auth/middleware.ts:36-46`).
- `requireUserId` rejects a real DB configured with auth disabled, rather than returning the shared `dev-user` (`src/lib/auth/verify.server.ts:73-96`).
- Query ownership guidance is explicit in `src/lib/auth/middleware.ts:21-26` and the auth schema header (`migrations/auth/0001_auth.sql:13-17`).

### 4. Expected Grok app-data connector flow

`CONFIRMED as library contract; dormant because `callTool` has no production caller`

```text
POST server function
  -> server-only callTool
  -> require Sec-Fetch isolation and POST
  -> read x-connector-access-token from inbound edge-gate request
  -> derive connectors host from trusted forwarded host or env override
  -> POST JSON to {connectors}/call-tool with bearer token
  -> normalize 401/403/tool/HTTP errors
```

Evidence:

- Module load fails in a browser context (`src/lib/app-data/server-only.ts:1-9`).
- `callTool` first runs Fetch-Metadata isolation and rejects non-POST requests (`src/lib/app-data/client.server.ts:257-280`).
- Inbound token/header and public host are read from `getRequest()` (`src/lib/app-data/client.server.ts:54-84`).
- Gate base selection is explicit env override, staging suffix, or production suffix (`src/lib/app-data/client.server.ts:36-52`).
- Outbound call uses bearer auth, manual redirects, and JSON parsing (`src/lib/app-data/client.server.ts:94-143`).
- 401 maps to login-required and is never cached; other failures can use a five-second memo (`src/lib/app-data/client.server.ts:328-356`; `src/lib/app-data/app-data.test.ts:129-142`).

### 5. Expected multiplayer flow

`CONFIRMED as client library; currently unusable end-to-end because the required signaling endpoint is absent`

```text
P2PRoom.join()
  -> GET /api/rtc?room=&peer=&name=&since=  (register + roster + signals)
  -> reconcile roster; larger peer id dials
  -> POST /api/rtc op=signal offer/answer/ice
  -> RTCPeerConnection full mesh
  -> unreliable "state" + ordered reliable "reliable" DataChannels
  -> leave POST /api/rtc op=leave
```

Evidence:

- The file declares `/api/rtc` as the required relay (`src/lib/multiplayer/p2p.ts:1-18`).
- Poll and signal requests are implemented at `src/lib/multiplayer/p2p.ts:188-211` and `447-474`; leave is at `133-147`.
- Roster dialing and channel setup are at `223-312`.
- No `/api/rtc` route exists under `src/routes/`, `server/`, or generated Nitro output. This is `CONFIRMED` for the current repository.

## API/server interface inventory

| Interface | Current status | Evidence / behavior |
|---|---|---|
| `/` | CONFIRMED active | Only TanStack route (`src/routeTree.gen.ts:20-59`). |
| `/auth/popup` | CONFIRMED dev-only interception | `apply: "serve"` middleware (`vite.config.ts:54-85`). |
| `/__app-env` | CONFIRMED dev-only | Serves the live Vite env JSON and is excluded from deploys (`scripts/app-env-plugin.mjs:1-31`). |
| `/__grok/manifest.webmanifest`, `manifest.json` | CONFIRMED active in Vite and Nitro | Dynamic manifest (`server/middleware/grok-pwa.ts:70-80`; `scripts/grok-pwa-plugin.mjs:45-62`). |
| `?install=1&platform=ios` | CONFIRMED active | Renders the bundled iOS tutorial when path/document/Accept qualify (`server/middleware/grok-pwa.ts:82-97`). |
| HTML documents | CONFIRMED transformed | PWA/OG tags are streamed into unencoded HTML at `</head>` (`server/middleware/grok-pwa.ts:99-110`). |
| `/api/auth/*` | UNKNOWN/CONTRADICTED | Client/server docs claim it exists (`src/lib/auth/client.ts:7-14`; `src/lib/auth/server.ts:5-12`), but no handler/route import/mount exists. Current deployment does not expose this contract. |
| `/api/rtc` | CONFIRMED missing | Required by `P2PRoom`, but no route exists. |
| TanStack server functions | CONFIRMED none currently | No `createServerFn` call sites outside example comments/tests. |
| `/api/auth/get-session` gate hook | UNKNOWN runtime | Plugin targets `/get-session` (`src/lib/auth/gate-session.server.ts:151-175`) but there is no mounted auth endpoint. |

## Database and migration architecture

### Backend selection and parity

`CONFIRMED`

- Empty/whitespace `DATABASE_URL` is treated as unset to avoid accidentally using PGLite in production (`src/lib/db.ts:6-19`).
- Set `DATABASE_URL` selects Neon/node-postgres; unset selects in-memory PGLite (`src/lib/db.ts:13-19`, `88-105`, `108-167`).
- The `Sql` abstraction exposes tagged templates and `.query`, converting interpolation to `$1...` parameters (`src/lib/db.ts:21-38`, `72-86`).
- Both drivers normalize `int8` to number, `date` to `YYYY-MM-DD`, and interval to Postgres text for JSON-safe parity (`src/lib/db.ts:53-68`, `88-99`, `112-119`).
- Huge `int8` values intentionally lose precision after conversion to JS number; code says cast `::text` when that matters (`src/lib/db.ts:58-61`).

Trust/compatibility consequence: callers can mostly write one SQL layer for ephemeral preview and persistent production, but exact arbitrary-precision int8 behavior is not preserved.

### Lifecycle and concurrency

`CONFIRMED`

- PGLite instances, SQL promise, and migration chain are stored on `globalThis` to survive Vite HMR module recreation and prevent duplicate pools/migrations (`src/lib/db.ts:40-51`).
- Failed initialization clears the memo so later requests retry (`src/lib/db.ts:101-105`, `126-129`, `189-194`).
- PGLite data is process-local and resets on dev-server restart (`src/lib/db.ts:108-111`).
- Vite waits for PGLite bootstrap in `configureServer`, but only when the non-recursive top-level migration scope contains a SQL file (`vite.config.ts:24-51`).

### Migration application

`CONFIRMED`

- Migration identity is the basename, so copying `migrations/auth/0001_auth.sql` to `migrations/0001_auth.sql` will not re-run on a database that already recorded that basename (`scripts/migration-plan.mjs:1-13`, `20-45`).
- Neither applier descends into `migrations/auth/` (`scripts/migration-plan.mjs:9-12`; `scripts/migrate.mjs:8-13`).
- Deploy migrations use one Postgres connection, create `_migrations`, apply each file in a transaction, and record it atomically (`scripts/migrate.mjs:45-76`).
- PGLite uses the same pending calculation and a transaction around SQL + bookkeeping (`src/lib/db.ts:132-162`).
- The current top-level scope has **zero** pending migrations; only `migrations/auth/0001_auth.sql` exists. This was also verified with `pendingMigrations(readdirSync("migrations"), [])`, returning `[]`.
- Tests explicitly encode that the auth schema is optional and should remain outside the globbed directory until sign-in is enabled (`scripts/migration-plan.test.mjs:16-27`, `59-75`).

### Better Auth schema

`CONFIRMED`

`migrations/auth/0001_auth.sql` defines Better Auth’s user/session/account/verification tables with case-sensitive quoted camelCase columns (`19-63`) and user indexes (`65-67`). Its header requires app tables to use `user_id TEXT NOT NULL` and server-side query scoping (`13-17`).

`CONFIRMED risk`: no current top-level copy exists, so if Better Auth were imported/activated in the present workspace without first copying that file, the preview PGLite database would have `_migrations` only and auth queries would target missing tables. This is not hypothetical speculation about the applier; it follows from the empty top-level glob result and Better Auth’s configured PGLite database (`src/lib/auth/server.ts:139-146`).

## Auth, isolation, and session security

### Intended modes

`CONFIRMED from comments/config`

- Deployed: platform injects per-app `GROK_AUTH_*`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, and `DATABASE_URL` (`src/lib/auth/server.ts:14-25`, `73-86`).
- Live preview: shared preview OAuth client, dynamic `*.grok-sandbox.com` origin, process-stable signing secret, and PGLite (`src/lib/auth/server.ts:14-22`, `50-65`, `88-114`, `175-180`).
- Auth off: dev user when no real DB; fail-closed if `DATABASE_URL` is set (`src/lib/auth/verify.server.ts:73-96`).

### Cookie/bearer design

`CONFIRMED`

- Session cookies use explicit `__Host-grok-auth.*` names, Secure, Lax, Path `/`, and no Domain, preventing sibling `*.grok.me` cookie tossing (`src/lib/auth/server.ts:216-231`).
- A five-minute signed `session_data` cookie cache reduces DB reads (`src/lib/auth/server.ts:207-211`).
- Preview iframe clients store the session bearer token in `sessionStorage` and attach it to Better Auth requests (`src/lib/auth/client.ts:43-67`, `20-29`).
- `authMiddleware` forwards that bearer to server functions (`src/lib/auth/middleware.ts:28-35`).
- Deployed cookie sign-out requires a successful server response; preview local token deletion can suffice (`scripts/sign-out-plan.mjs:1-19`, `94-117`).

Security tradeoff (`CONFIRMED mechanism`, `INFERRED severity`): sessionStorage bearer tokens are readable by any successful XSS, unlike HttpOnly cookies. This is a deliberate partitioned-iframe workaround, but CSP/XSS discipline is especially important when preview auth is active.

### Fetch-Metadata sibling isolation

`CONFIRMED`

- `assertSameSiteRequest` allows missing `Sec-Fetch-Site`, `same-origin`, `none`, and top-level non-embed GET navigation; all other scripted cross-site/same-site requests throw 403 (`src/lib/auth/isolation.server.ts:33-51`).
- The stated threat model is mutually untrusted sibling apps on `*.grok.me`, because SameSite=Lax cookies still ride same-site subrequests (`src/lib/auth/isolation.server.ts:11-23`).
- It is enforced by `authMiddleware` (`src/lib/auth/middleware.ts:36-46`) and `callTool` (`src/lib/app-data/client.server.ts:179-188`, `269-275`).

Caveat (`INFERRED`): this control assumes the edge proxy/browser preserves Fetch-Metadata headers and normalizes spoofable forwarding headers. Repository code cannot prove proxy behavior.

### Gate-injected identity

`CONFIRMED library behavior`

- Gate identity is active only when auth is not off and `GROK_PROJECT_ID` exists (`src/lib/auth/gate-identity.server.ts:29-31`).
- It trusts `x-grok-identity`, resolves the gate issuer from explicit env or a known public host suffix, verifies EdDSA JWT signature/issuer/audience/required claims and a 10-minute maximum age (`src/lib/auth/gate-identity.server.ts:93-116`, `120-177`).
- JWKS accepts only Ed25519/EdDSA keys, caches for five minutes, and refetches on missing/rotated `kid` (`src/lib/auth/gate-identity.server.ts:47-84`).
- Tests reject wrong audience/issuer/expiry/missing `exp`/wrong key and verify key rotation (`src/lib/auth/gate-identity.test.ts:73-207`).
- On `/get-session`, bearer sessions are left untouched; a verified gate identity reuses only a session bound to the same `grok-gate` account, deletes a mismatched session, creates a new one, emits cookies, and expires stale `session_data` (`src/lib/auth/gate-session.server.ts:151-279`, `97-134`).

### Current activation mismatch

`CONFIRMED`

- The current workspace has no `.grok/app-env.json`; `.grok/` is ignored (` .gitignore:9`).
- Missing/unparseable app-env becomes `{}`, and auth is enabled unless explicitly `"false"` (`scripts/with-app-env.mjs:32-60`; `src/lib/auth/client.ts:31-39`).
- Direct `buildAuthEnabled(process.cwd(), {})` returned `true`.
- Tests nevertheless assert the shipped template has `{VITE_AUTH_ENABLED:"false"}` (`scripts/with-app-env.test.mjs:62-64`) and `npm run test` fails because the file is absent.
- There is no `/login` route despite `RedirectToSignIn` defaulting there (`src/lib/auth/gates.tsx:16-17`, `35-45`), and no current UI caller of the auth gates.
- There is no mounted `/api/auth/*` handler even though client/server docs assume one.

This is the most important environment/deployment inconsistency: source defaults toward auth-on, the expected off-switch is omitted, the expected API is absent, and the opt-in auth schema has not been copied. The current game still runs because it does not import/use auth, but enabling a route or server function on top of this state is unsafe/ambiguous.

### Shared preview credential

`CONFIRMED`

`src/lib/auth/preview.ts` hardcodes `PREVIEW_CLIENT_ID` and a full `PREVIEW_CLIENT_SECRET` (`19-21`) and says these must match broker environment values. Comments describe it as low-privilege, preview-only, wildcard-host constrained, with only a broker-side hash stored (`13-17`), but the repository also says “Do not write secrets into code” (`CLAUDE.md:113-117`).

Risk classification: `CONFIRMED committed secret`; actual exploitability is `UNKNOWN` because broker enforcement and rotation state are external. At minimum this is credential-management debt and broad publication/rotation coupling.

## App-data connector trust boundary

`CONFIRMED`

- Inbound connector credential comes from `x-connector-access-token`, or `GROK_CONNECTOR_ACCESS_TOKEN` only outside production (`src/lib/app-data/client.server.ts:62-84`).
- Production connector calls therefore fail closed to login-required when the edge gate has not injected the header (`src/lib/app-data/client.server.ts:166-177`).
- The outbound gate base must be an absolute HTTP(S) URL and is normally restricted to fixed staging/production hosts (`src/lib/app-data/client.server.ts:36-52`, `94-111`).
- The request forwards the inbound public host as `x-forwarded-host` and the token as outbound Authorization bearer (`113-127`).
- 401 returns login behavior; 403 maps to access denied; downstream errors/messages are propagated (`328-356`).
- Error classification turns raw messages into user-facing kinds and retains raw detail (`src/lib/app-data/errors.ts:17-55`).

### Connector-specific risks / debt

- `CONFIRMED`: `options.token` takes precedence over the edge-injected token (`src/lib/app-data/client.server.ts:277-280`). That is useful for trusted server code/tests, but any future handler that accepts a client-supplied `token` field would bypass the intended edge boundary.
- `CONFIRMED`: outbound `fetch` has no timeout/cancellation (`122-127`), so a wedged connector can wedge the calling request.
- `CONFIRMED`: failure memo keys include raw tool name, arguments, connector/catalog identity, and hashed token identity (`294-306`), with a five-second TTL and no maximum size (`191-243`). Expired entries are swept only on a later memoized write.
- `INFERRED`: if a future server function exposes arbitrary tool names/arguments to untrusted users, large unique argument objects can temporarily grow the memo and gateway response/error text can leak internals. Current lack of call sites prevents this from being an active vulnerability.
- `CONFIRMED`: raw `errorMessage` is returned to callers (`355-356`) and `AppErrorComponent` renders `error.message` directly (`src/lib/error-component.tsx:12-18`), so future handlers must sanitize internal exception details before reaching the router boundary.

## Multiplayer trust and compatibility constraints

`CONFIRMED`

- The P2P model is explicitly client-authoritative (`src/lib/multiplayer/p2p.ts:1-5`); do not use it for authoritative scoring/economy.
- Message payloads are parsed as JSON and delivered as `unknown`; application consumers must validate them (`315-344`).
- Default ICE uses public Google and Cloudflare STUN; no TURN server is configured (`84-95`, `538-540`). Symmetric/NAT-blocked peers can therefore fail.
- `VITE_STUN_URLS` can replace the defaults (`84-95`).
- Polling falls back/retries; connection failures trigger ICE restart and eventually terminal after three recovery attempts (`114-131`, `271-289`, `493-535`).
- Reliable and unreliable channels are differentiated (`149-164`, `304-311`).
- The signaling relay is responsible for roster trust: signals from peers absent from the roster are ignored (`361-375`), but the absent server means no authentication/room authorization layer currently exists.

## External services and platform interfaces

| Boundary | Protocol | Trust/security notes | Status |
|---|---|---|---|
| Grok auth broker | HTTPS OAuth/OIDC-like endpoints | App holds local client credentials; broker holds upstream Google/X secrets (`src/lib/auth/providers.ts:4-17`; `src/lib/auth/server.ts:130-171`). | Library-only; endpoint not mounted. |
| Gate identity/JWKS | HTTPS JWT/JWKS | EdDSA, issuer/audience/age verification and rotation tests. | Library-only. |
| Connectors | HTTPS JSON `/call-tool` | Edge-injected bearer, same-site isolation, fixed host derivation. | Library-only. |
| Public STUN | STUN Google/Cloudflare | Exposes network metadata to third parties; no TURN/relay. | Library-only. |
| Google Fonts | HTTPS CSS/fonts | Network dependency in SSR and native shell. | Active. |
| Grok extensions | HTTPS JavaScript | Injected into every HTML document without SRI or CSP in this repo. | Active in PWA chrome. |
| OG service | HTTPS card URL | Public host/title/color are encoded; host comes from env/request. | Active in PWA chrome. |
| Neon PostgreSQL | PostgreSQL over `DATABASE_URL` | Server-only secret; no top-level schema currently. | Library-only. |
| Preview host bridge | postMessage | Parent origin is derived from allowlist/remint pairing, event source and origin checked, path constrained to same-origin. | Active when embedded. |

### PWA/OG security details

`CONFIRMED`

- HTML values are escaped (`scripts/grok-pwa-shared.mjs:31-38`), and host-derived install-page injection has an escaping regression test (`scripts/grok-pwa-plugin.test.mjs:471-474`).
- Public host parsing strips ports, rejects loopback/IP-like/invalid hosts and Vercel system hosts, and prefers `VITE_PUBLIC_HOSTNAME` (`scripts/grok-pwa-shared.mjs:84-117`).
- The install page only activates for `install=1|true` plus `platform=ios`, and API/internal/asset-like paths are excluded (`119-142`).
- Manifest `start_url`/scope are fixed to `/`, so host affects display name but not install scope (`160-183`).
- The platform extension script is fixed and HTML-escaped project metadata is attached, but no Content-Security-Policy or SRI is defined in the repo (`203-241`; `server/middleware/grok-pwa.ts:39-60`).
- Streaming transformation removes content-length when modifying the body (`server/middleware/grok-pwa.ts:39-60`), avoiding stale framing.

`INFERRED risk`: absent CSP/SRI means application/security posture depends wholly on the fixed Grok origin and deployment platform headers. An XSS or compromise at that origin affects every HTML document.

### Preview host bridge

`CONFIRMED`

- Allowed parent origins are Grok domains, localhost, or validated sandbox/remint pairings (`src/lib/preview-embedder-origin.ts:1-55`).
- Messages are accepted only from `window.parent` and the exact derived origin (`src/lib/preview-host-bridge.ts:170-175`).
- Navigation paths must start `/`, reject `//` and backslashes, and resolve to the same dummy origin (`47-57`); the default navigation also checks the real origin (`138-148`).
- Schemas constrain channel/version/type and navigation/history fields (`20-38`).
- Outbound reports contain route paths and current location components (`113-135`).

`INFERRED`: localhost parent allowance is useful for development but means a local page can drive the preview if it is the actual embedder. It is not a general origin bypass because source/origin checks still apply.

## Environment and deployment contracts

### Environment variables read by runtime/scripts

`CONFIRMED`

Runtime/auth/data:

- `DATABASE_URL`
- `VITE_AUTH_ENABLED`
- `GROK_AUTH_ISSUER`
- `GROK_AUTH_CLIENT_ID`
- `GROK_AUTH_CLIENT_SECRET`
- `BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`
- `GROK_PROJECT_ID`
- `GROK_GATE_ORIGIN`
- `GROK_CONNECTORS_URL`
- `GROK_CONNECTOR_ACCESS_TOKEN` (non-production only)
- `NODE_ENV`

Platform/build/PWA/multiplayer/QA:

- `VITE_PUBLIC_HOSTNAME`
- `VITE_PROJECT_ID`
- `VITE_OG_SERVICE_URL`
- `X_CREATOR`, `X_CREATOR_ID`
- `VITE_STUN_URLS`
- `BROWSER_ALLOW_EXTERNAL_HOST`
- `BROWSER_SMOKE_TIMEOUT_MS`, `VISUAL_SMOKE_TIMEOUT_MS`, `VISUAL_SMOKE_URL`
- `PREVIEW_READY_TIMEOUT_MS`, `PREVIEW_THUMBNAIL_TIMEOUT_MS`

Secret visibility:

- `scripts/with-app-env.mjs` deliberately allows only `VITE_` string keys and treats that file as build flags, not a secret store (`10-20`, `32-51`).
- Process environment overrides the file (`63-66`).
- `.env`, `.env.*`, and `.grok/` are ignored (` .gitignore:9,13-14`), which is why the expected shipped auth-off JSON can disappear from a clone.

### Web deploy contract

`CONFIRMED`

- `npm run build` runs Vite production build then deploy migrations (`package.json:9-15`).
- Vite uses Nitro preset `vercel` and scans `./server` only for build/preview (`vite.config.ts:169-180`).
- Removing `serverDir` silently unwires the middleware; a source test guards this wiring (`scripts/grok-pwa-plugin.test.mjs:483-499`).
- Vercel output maps filesystem first, then all unmatched paths to `__server` and caches assets for one year (` .vercel/output/config.json:8-21`).
- The generated Nitro function declares Node.js 24 and no skew protection (` .vercel/output/nitro.json:17-24`).

### Dev/preview contract

`CONFIRMED`

- Dev server must bind `0.0.0.0:8080` (`vite.config.ts:145-158`); this is a platform preview contract.
- Preview binds loopback `127.0.0.1:8081` and is strict-port (`vite.config.ts:153-158`).
- Preview lifecycle owns/kills the 8081 process and is Linux `/proc`-only (`scripts/preview.mjs:1-10`, `26-44`).
- Browser tooling refuses non-loopback URLs unless explicitly overridden (`scripts/browser-guard.mjs`).

### Native deploy contract

`CONFIRMED`

- `build:ios` uses the separate Vite config (`package.json:14`; `vite.native.config.ts:6-22`).
- iOS target is 16.0, bundle ID `com.yolkrush.party`, automatic signing, and a fixed Info.plist (`native/ios/YolkRush.xcodeproj/project.pbxproj:145-212`).
- ATS disallows arbitrary loads, but code still loads Google Fonts over HTTPS.
- Native local persistence uses the same browser storage APIs inside WKWebView; no native secure storage/keychain bridge exists in `src/lib`.

## Logging and error handling

`CONFIRMED`

- DB bootstrap failures are logged and rethrown, so startup fails rather than serving with an unknown DB state (`vite.config.ts:37-49`; `src/lib/db.ts:227-237`).
- Migration errors include Postgres code/detail/hint/position/where where available (`scripts/migrate.mjs:83-89`).
- Gate session operations log structured prefixed errors, including user/sub identifiers, but do not log bearer/session token values (`src/lib/auth/gate-session.server.ts:47-93`, `157-277`).
- Auth-off plus real DB logs a fail-closed warning (`src/lib/auth/verify.server.ts:21-27`).
- App-data converts exceptions to `ok:false` and preserves `e.message` (`src/lib/app-data/client.server.ts:315-357`).
- Client connector errors are classified with stable user messages and optional raw detail (`src/lib/app-data/errors.ts:17-55`).
- P2P transient poll/negotiation failures are mostly swallowed, while failed signal retries and ICE candidate errors warn (`src/lib/multiplayer/p2p.ts:213-220`, `348-358`, `423-429`, `465-470`).
- Router failures render raw `error.message` (`src/lib/error-component.tsx:4-19`).

Debt: there is no centralized request logger, correlation ID, rate limiter, metric, or telemetry abstraction. Server logs are prefix strings plus native errors, which is simple but not queryable.

## Trust boundary map

| Boundary | Direction | Inputs | Controls | Current risk |
|---|---|---|---|---|
| Browser local storage | browser -> app | v1-v4 JSON | try/catch, field checks/ranges | Client-authoritative economy; user-controlled. |
| Browser -> server function | network -> server | cookies/bearer, Sec-Fetch metadata, body | POST convention, same-site assertion, verified user | No active server functions; future handlers must use middleware. |
| Edge gate -> app | proxy -> server | `x-connector-access-token`, `x-grok-identity`, forwarded host | fixed hosts, JWT verification, env gating, POST-only | Proxy must strip/normalize spoofable headers. |
| App -> connector service | server -> external | tool/args, bearer, host | absolute URL check, fixed hosts, failure normalization | No fetch timeout; raw error leakage if exposed. |
| App -> auth broker | server -> external | OAuth client creds, provider ID | static endpoints, broker-held upstream secrets, trusted origins | Shared committed preview secret. |
| App -> DB | server -> database | SQL and parameters | tagged-template parameterization, server-only guard, scoped-user guidance | No active schema/callers; auth schema opt-in. |
| Preview host -> app | parent -> iframe | postMessage | source/origin/schema/path checks | Localhost parent allowance; no broader origin trust. |
| Peer -> P2P | remote browser -> browser | WebRTC JSON | roster vouching, known message envelope, isolated channels | Client-authoritative, absent relay, no TURN. |
| Platform -> HTML | server -> browser | host/env/site metadata | HTML escaping, fixed host scope | External script no SRI/CSP. |

## Compatibility constraints that must not be broken casually

1. `CONFIRMED` — Preserve save compatibility with `yolk-rush-v4` and fallback reads of v1-v3 (`src/game/store.ts:79-118`). A schema change needs a new key/normalizer, not an in-place rewrite.
2. `CONFIRMED` — Preserve `0.0.0.0:8080` dev binding and strict port (`vite.config.ts:145-158`).
3. `CONFIRMED` — Keep `/auth/popup` intercepted before TanStack during dev; do not create a React popup route (`vite.config.ts:54-75`, `160-169`).
4. `CONFIRMED` — Keep Nitro `serverDir: "./server"` for deployed PWA/install middleware (`vite.config.ts:169-180`; source test at `scripts/grok-pwa-plugin.test.mjs:483-499`).
5. `CONFIRMED` — Keep `*.server.ts` suffix/import boundaries for request-context modules; comments explain browser bundling breaks otherwise (`src/lib/auth/isolation.server.ts:4-10`; `src/lib/auth/middleware.ts:36-42`).
6. `CONFIRMED` — Keep `getSql()` behind server functions/routes; it deliberately throws in a browser (`src/lib/db.ts:170-180`).
7. `CONFIRMED` — Auth-disabled plus `DATABASE_URL` must remain fail-closed (`src/lib/auth/verify.server.ts:73-96`).
8. `CONFIRMED` — Preserve basename-keyed migration semantics and the opt-in auth subdirectory (`scripts/migration-plan.mjs:1-13`, `39-45`).
9. `CONFIRMED` — Preserve DB driver value normalization when returning JSON across preview/production (`src/lib/db.ts:53-68`).
10. `CONFIRMED` — `P2PRoom` is tied to the exact `/api/rtc` roster/signal wire contract and is client-authoritative (`src/lib/multiplayer/p2p.ts:1-18`).
11. `CONFIRMED` — Native entry bypasses web shell/server contracts; adding a feature that needs auth/server functions requires a separate native strategy (`src/native-entry.tsx:1-8`).
12. `CONFIRMED` — `.grok/app-env.json` is expected to be the shipped auth-off build flag, but is ignored and currently absent. Repackaging/cloning must restore it or explicitly choose auth-on.

## Highest-priority risk and debt register

1. **`CONFIRMED` — Auth environment is currently inconsistent.**
   File absent => auth-on default; tests expect auth-off; no login route/API mount; auth schema not copied. Future activation can fail or expose half-configured behavior.

2. **`CONFIRMED` — `/api/auth/*` is documented but not implemented/mounted.**
   Client and server comments assume it, while source route/import audit finds no handler. Auth libraries cannot form an end-to-end deployed flow from this repository alone.

3. **`CONFIRMED` — A preview OAuth client secret is committed.**
   Even if low-privilege and broker-constrained, its secrecy depends on publication scope and broker enforcement. This contradicts the repository’s own secret rule.

4. **`CONFIRMED` — P2P requires a nonexistent `/api/rtc`.**
   The client library is substantial but cannot join a room. No room authorization, persistence, TURN, or anti-abuse layer is present.

5. **`CONFIRMED` — No active server-side persistence/user-data ownership.**
   All actual progression and inventory are local. Server auth/query patterns are only examples/library contracts. Do not infer multi-user cloud persistence from the presence of `src/lib`.

6. **`CONFIRMED` — Auth schema is opt-in and currently not copied.**
   Enabling auth on the current tree risks missing Better Auth tables. Deployment tooling outside this repo may perform this copy, but that is unproven.

7. **`CONFIRMED` — External platform JavaScript is injected without local CSP/SRI.**
   The fixed origin is the trust anchor; application code does not add defense in depth.

8. **`CONFIRMED` — Connector proxy has no outbound timeout and exposes raw downstream error strings.**
   Future request handlers need bounded fetches and sanitized user-facing errors.

9. **`CONFIRMED` — Connector failure memo lacks a size cap.**
   TTL and write-time sweeping bound normal growth but not a burst of unique keys. This becomes more important once untrusted input reaches `callTool`.

10. **`CONFIRMED` — Forwarded host/header normalization is assumed rather than proven.**
   Auth base, connector host, gate issuer, and OG URLs rely on `Host`/`X-Forwarded-Host` being set by trusted infrastructure. The code does not itself validate proxy identity.

11. **`CONFIRMED` — Bearer token lives in sessionStorage for preview.**
   This trades HttpOnly isolation for partitioned-iframe usability; XSS therefore gains a session token. No CSP is locally enforced.

12. **`CONFIRMED` — Native shell is not fully offline and bypasses web auth/server features.**
   Google Fonts remains external; the direct `GameApp` entry cannot use router/server functions without additional architecture.

13. **`CONFIRMED` — Full test suite is currently red.**
   The failure set includes the missing auth-off environment and missing ignored platform skill files. Targeted data/security suites pass, but the repository’s top-level gate cannot claim green.

## Quality evidence

- `CONFIRMED` — App-data and gate identity contracts have strong focused tests: 32 tests pass. They cover failure memoization, auth classification, JWT issuer/audience/expiry/key/rotation, and gate-session account binding.
- `CONFIRMED` — Typecheck passes.
- `CONFIRMED` — Lint exits successfully but reports 17 warnings, mostly unused game UI symbols and one unnecessary auth eslint-disable.
- `CONFIRMED` — Top-level test failure includes missing `.grok/app-env.json` and `.grok/skills/og`, showing that ignored local platform assets are part of expected workspace state, not merely disposable cache.
- `UNKNOWN` — Production behavior of platform header normalization, deploy-time auth migration copying, external connector service, broker, and Vercel response headers cannot be validated from repository source alone.

## Caveats / Not Found

- No centralized security headers configuration was found. No CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy, or cookie CSP configuration is present in application source.
- No rate limiting, abuse control, CSRF middleware outside the isolation/Fetch-Metadata pattern, audit logging, or monitoring setup was found.
- No WebRTC signaling server, TURN configuration, or production multiplayer integration was found.
- No current server function or application SQL query was found, so per-user query enforcement cannot be verified beyond examples/middleware.
- No deploy pipeline/workflow was found in this checkout; only scripts and generated Vercel output describe deployment.
- No `.grok/app-env.json` exists in the current workspace despite tests treating it as the shipped template state.
- The documented Better Auth `/api/auth/*` route is not present. Whether an omitted external deployer mounts it is `UNKNOWN`.
- It is `UNKNOWN` whether the hardcoded preview secret is already public, rotated, or accepted only for the intended wildcard preview hosts.
- It is `UNKNOWN` whether platform proxies strip client-supplied `X-Forwarded-Host` and identity/connector headers before forwarding trusted values.
- Generated `.vercel/output` was inspected only as deployment evidence; no generated artifact was changed.

## Related Trellis specs

- `.trellis/spec/frontend/index.md` — frontend guide index; most data/security-specific guides are still placeholders.
- `.trellis/spec/guides/cross-layer-thinking-guide.md` — relevant boundary-mapping, contract ownership, decoder, and error-handling framework used for this audit.
- `.trellis/spec/guides/code-reuse-thinking-guide.md` — relevant to shared auth/data/migration patterns rather than duplicating contracts.
- `.trellis/spec/frontend/quality-guidelines.md` and `.trellis/spec/frontend/type-safety.md` — currently placeholders; no project-specific security rule contradicts this research.
