# Data, Security, and Interface Boundaries

## Current authority model

The shipped game uses browser-local authority. Progression, coins, skins, XP, and unlocks live in localStorage. At the baseline, the DB/auth/app-data libraries exist but no non-test game call site or mounted route invokes `getSql`, `authMiddleware`, connector tools, or a server function; `AuthProvider` is a passthrough. A player can therefore alter local progression. This is an observed risk, not a server design recommendation. Changing authority requires a new product task; if progression ever becomes competitive or tradable, local authority is no longer an appropriate model.

## Server-only boundaries

- `src/lib/db.ts` and `getSql()` throw when imported/called in a browser.
- `src/lib/app-data/client.server.ts` throws in a browser and must be dynamically imported from a `createServerFn({ method: "POST" })` handler.
- Client-safe app-data types/helpers come from `src/lib/app-data/index.ts`.
- `authMiddleware` is the intended chokepoint for per-user server functions. It verifies the user and places `context.userId` on the server context.
- Do not bypass these boundaries with a browser fetch or direct import from React.

## Database contract

`src/lib/db.ts` selects one backend:

- non-empty `DATABASE_URL` → node-postgres pool for Neon;
- otherwise → one embedded PGLite instance for preview/local.

Both expose the same `Sql` interface through parameterized tagged templates and `.query()`. The Neon pool promise, PGLite instance, and PGLite migration chain live on `globalThis` so Vite HMR does not create duplicate pools or races.

The abstraction normalizes Postgres `int8`, date, and interval values so both backends return JSON-safe shapes. Preserve this parity when changing queries or parsers.

## Migrations

- `migrations/*.sql` is the schema source.
- `scripts/migrate.mjs` applies top-level migrations in ordered transactions when `DATABASE_URL` is set.
- PGLite applies the same top-level migrations automatically.
- `migrations/auth/0001_auth.sql` is generated Better Auth schema and is opt-in/non-recursive.
- Do not edit generated Better Auth columns by hand. Their camelCase names and double quotes are required.
- Add app schema in new ordered top-level files, not inside the auth migration.
- Prefer snake_case app tables and a text `user_id`; scope every query server-side.

## Auth and session modes

`VITE_AUTH_ENABLED` controls whether sign-in UI is active. The client treats every value except `"false"` as enabled, including a missing key; the important operational constraint is that dev/build/preview resolve the value through `scripts/with-app-env.mjs` so they agree.

`requireUserId` has three modes:

- auth enabled → verified session user, or `UnauthorizedError`;
- auth disabled and `DATABASE_URL` unset → shared `dev-user`;
- auth disabled and `DATABASE_URL` set → intentional fail-closed error, never a shared user over a real database.

Two authenticated contexts exist:

- deployed/browser: same-origin session cookies;
- embedded live preview: popup sign-in captures a bearer token in sessionStorage and forwards it through the auth client/server middleware because cookies are partitioned.

Use `signIn`/`signOut` wrappers from `src/lib/auth/client.ts`, not raw `authClient.signOut()`, because the wrapper clears preview bearer state.

Security controls already present:

- Better Auth trusted origins and CSRF checks;
- Fetch-Metadata `assertSameSiteRequest()` against scripted cross-site/sibling requests;
- signed gate identity/session binding for platform-injected identity;
- same-origin popup message checks;
- encrypted OAuth tokens at rest;
- broker Google/X identities treated as trusted first-party identities because X uses a synthetic/unverified email, while distinct Google/X identities remain separate;
- explicit `__Host-` cookie names with Secure/Path/no-Domain attributes despite Better Auth’s `useSecureCookies: false` setting — preserve both parts of this pairing.

The dedicated preview client credential in `src/lib/auth/preview.ts` is a shared low-privilege platform value that must match broker configuration. It is not permission to add arbitrary secrets to source.

## App-data connector flow

The server-only connector proxy:

1. blocks non-POST and cross-site requests;
2. derives a connector host from explicit URL or public host;
3. reads the connector token from the inbound header or non-production env;
4. proxies the tool call to the Grok connector/gate;
5. maps 401/403/tool failures to typed `CallToolResult`/error states;
6. memoizes failures briefly by token/tool/args identity.

This is dormant infrastructure in the current game. If activated, call it only from authenticated POST server functions and classify failures through `src/lib/app-data/errors.ts`.

## Error disclosure boundary

Connector failures can carry gateway/upstream text, and the router error component renders `error.message` directly. A future server function must map internal exception details to safe public messages before throwing to the router boundary. This is a current debt/risk, not permission to expose raw diagnostics.

## Multiplayer boundary

`src/lib/multiplayer/p2p.ts` implements full-mesh WebRTC with unreliable state and reliable channels, roster polling, ICE candidate buffering, glare handling, and recovery. It expects `/api/rtc` signaling.

No `/api/rtc` route and no current game instantiation were found. Treat this as dormant library code, not active multiplayer support. Do not assume matchmaking, persistence, or server authority exists. If activated, P2P messages remain client-authoritative `unknown` payloads: validate every application message and do not use this transport for authoritative scoring/economy.

## PWA, preview, and external services

- Nitro `serverDir: "./server"` is required so `server/middleware/grok-pwa.ts` provides manifest/install/head behavior.
- Do not create `src/routes/auth/popup.tsx`; the Vite middleware owns `/auth/popup` during development.
- PWA host parsing rejects loopback/IP-like/system hosts and escapes injected HTML.
- Preview postMessage accepts only the actual parent, an allowlisted/validated origin, constrained same-origin paths, and typed schemas.
- External dependencies include Google Fonts, Grok extensions JavaScript, OG service, and public STUN services. No repo-defined CSP/SRI protects the injected external script; this is a security gap/debt, not permission to weaken checks.

## Environment and error handling

Important keys include `DATABASE_URL`, `VITE_AUTH_ENABLED`, Better Auth/Grok auth values, connector URL/token, public hostname/project metadata, OG service URL, STUN URLs, and QA timeouts.

`.grok/app-env.json` and `.env*` are ignored. `with-app-env.mjs` only forwards string keys beginning with `VITE_`; process environment wins. Broad tests may fail in a clone because expected ignored `.grok` files are absent.

Current error style is boundary-specific rather than centrally logged:

- boundary modules throw typed/descriptive errors;
- scripts use prefixed console messages or JSON verdicts;
- connector failures are classified for UI;
- P2P transient failures are warned/retried.

Do not introduce scattered `console.log` in game render loops. Preserve fail-closed QA script behavior.

## Wrong vs correct

### Wrong

```tsx
const sql = await getSql();
const result = await callTool("tool", {}, { connectorType });
```

### Correct

```tsx
export const action = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql`select * from things where user_id = ${context.userId}`;
  });
```
