import { createMockProvider } from "./mock-provider.ts";
import { MeshyProvider } from "./meshy-provider.ts";
import { RodinProvider } from "./rodin-provider.ts";
import { TrellisProvider } from "./trellis-provider.ts";
import {
  MissingApiKeyError,
  type ProviderKind,
  type SkinAssetGenerationProvider,
} from "./types.ts";

/**
 * Single entry point used by `server/routes/api/skins/generate.ts` and any
 * other server middleware that needs an asset-generation Provider.
 *
 * Server-only: this file imports the real providers (Meshy / Rodin /
 * Trellis) which read `process.env`. The Vite native bundle excludes
 * `server/` so the browser side never sees this code path.
 *
 * `kind === "mock"` always succeeds — it is the deterministic dev /
 * CI path. The three real providers throw `MissingApiKeyError` on
 * construction when their key is absent; the route layer translates that
 * to HTTP 503 with a stable error code.
 */
export function createProvider(kind: ProviderKind): SkinAssetGenerationProvider {
  switch (kind) {
    case "mock":
      return createMockProvider();
    case "meshy":
      return new MeshyProvider();
    case "rodin":
      return new RodinProvider();
    case "trellis":
      return new TrellisProvider();
    default: {
      // Exhaustiveness check — TS narrows `kind` to `never` here so adding
      // a new ProviderKind forces us to handle it.
      const exhaustive: never = kind;
      throw new Error(`Unknown provider kind: ${String(exhaustive)}`);
    }
  }
}

/**
 * Helper: enumerate the providers that are usable in this environment,
 * based purely on env-var presence. Used by `/api/skins/providers` to
 * drive the operator-facing UI (no secrets are returned).
 */
export function listAvailableProviders(): ProviderKind[] {
  const available: ProviderKind[] = ["mock"];
  if (hasEnv("MESHY_API_KEY")) available.push("meshy");
  if (hasEnv("RODIN_API_KEY")) available.push("rodin");
  if (hasEnv("TRELLIS_API_KEY")) available.push("trellis");
  return available;
}

/**
 * Map an error thrown by `createProvider` to a stable HTTP-friendly code.
 * Server route handler uses this to decide between 503 (missing key) and
 * 500 (misconfiguration).
 */
export function providerErrorCode(err: unknown): "missing_api_key" | "unknown" {
  if (err instanceof MissingApiKeyError) return "missing_api_key";
  return "unknown";
}

function hasEnv(name: string): boolean {
  if (typeof process === "undefined" || !process.env) return false;
  const v = process.env[name];
  return typeof v === "string" && v.length > 0;
}
