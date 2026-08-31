import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Group } from "three";

/**
 * Thrown by `loadSkinAsset` when the Skin's Quality Gate report exists and
 * its `valid` field is `false`. The runtime catches this and falls back to
 * the procedural EggMesh so gameplay never blocks on a rejected asset.
 */
export class QualityGateRejectedError extends Error {
  readonly skinId: string;
  readonly url: string;
  readonly errors: string[];
  readonly warnings: string[];
  readonly role: string;
  constructor(args: {
    skinId: string;
    url: string;
    role: string;
    errors: string[];
    warnings: string[];
  }) {
    super(
      `Skin "${args.skinId}" failed Quality Gate (role=${args.role}): ${args.errors.join("; ")}`,
    );
    this.name = "QualityGateRejectedError";
    this.skinId = args.skinId;
    this.url = args.url;
    this.errors = args.errors;
    this.warnings = args.warnings;
    this.role = args.role;
  }
}

/**
 * SkinAssetLoader — fetch + parse a GLB URL into a ready-to-mount Three.js
 * `Group`. Cached per `skinId` so re-renders never re-fetch.
 *
 * Server boundary: this code is browser-only — Three.js GLTFLoader uses
 * `fetch()` and DOM APIs. Provider code (`server/routes/api/skins/*`)
 * MUST NOT call this; it deals in URL strings and ArrayBuffers.
 *
 * Quality Gate integration (R13.5): after the GLB parses successfully the
 * loader fetches `<url>.quality-gate-report.json`. If the report exists and
 * `valid === false` the loader throws `QualityGateRejectedError`. Callers
 * catch that and fall back to the procedural EggMesh so gameplay is never
 * blocked. A missing report is treated as "ungraded" — accepted silently —
 * so freshly-authored assets in dev can be previewed before the gate runs.
 *
 * Failure mode: any fetch / parse / network error returns `null` instead
 * of throwing (Quality Gate errors are the only exception). Callers treat
 * `null` as "fall back to the procedural EggMesh".
 */

const cache = new Map<string, Promise<Group | null>>();
const inflight = new Map<string, Promise<Group | null>>();

type QualityGateReport = {
  valid: boolean;
  role?: string;
  errors?: string[];
  warnings?: string[];
};

function stripUrlQuery(url: string): string {
  const q = url.indexOf("?");
  const h = url.indexOf("#");
  let end = url.length;
  if (q >= 0) end = Math.min(end, q);
  if (h >= 0) end = Math.min(end, h);
  return url.slice(0, end);
}

function gateUrlFor(glbUrl: string): string {
  const clean = stripUrlQuery(glbUrl);
  const lower = clean.toLowerCase();
  if (lower.endsWith(".glb")) {
    const stem = clean.slice(0, -4);
    return `${stem}.quality-gate-report.json`;
  }
  return `${clean}.quality-gate-report.json`;
}

/**
 * Public mirror of the internal `gateUrlFor` — the registry layer
 * (`gate-registry.ts`) needs the same URL convention to scan all Skins
 * for Quality Gate rejections before mounting them in the UI.
 */
export function gateReportUrlFor(glbUrl: string): string {
  return gateUrlFor(glbUrl);
}

async function fetchGate(gateUrl: string): Promise<QualityGateReport | null> {
  try {
    const res = await fetch(gateUrl, { credentials: "omit", cache: "no-store" });
    if (!res.ok) return null;
    const parsed = (await res.json()) as QualityGateReport;
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function fetchAndParse(
  skinId: string,
  url: string,
): Promise<Group | null> {
  let res: Response;
  try {
    res = await fetch(url, { credentials: "omit", cache: "force-cache" });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  let buf: ArrayBuffer;
  try {
    buf = await res.arrayBuffer();
  } catch {
    return null;
  }

  const loader = new GLTFLoader();
  const scene = await new Promise<Group | null>((resolve) => {
    try {
      loader.parse(
        buf,
        "",
        (gltf) => resolve(gltf.scene ?? null),
        () => resolve(null),
      );
    } catch {
      resolve(null);
    }
  });
  if (!scene) return null;

  // Quality Gate: read the report next to the GLB. Reject the load when
  // the gate ran and failed. Missing reports are tolerated (dev preview
  // path before the gate has been run).
  const gate = await fetchGate(gateUrlFor(url));
  if (gate && gate.valid === false) {
    throw new QualityGateRejectedError({
      skinId,
      url,
      role: gate.role ?? "unknown",
      errors: gate.errors ?? [],
      warnings: gate.warnings ?? [],
    });
  }

  return scene;
}

/**
 * Load a Skin's GLB and return its root `Group`. Returns `null` on any
 * non-Gate failure. Throws `QualityGateRejectedError` when the Skin's
 * Quality Gate report exists and reports `valid: false` — callers MUST
 * catch this and fall back to the procedural EggMesh.
 */
export function loadSkinAsset(skinId: string, url: string): Promise<Group | null> {
  if (cache.has(skinId)) return cache.get(skinId)!;
  if (inflight.has(skinId)) return inflight.get(skinId)!;

  const promise = fetchAndParse(skinId, url)
    .catch((err) => {
      if (err instanceof QualityGateRejectedError) throw err;
      return null;
    })
    .finally(() => {
      inflight.delete(skinId);
    });
  inflight.set(skinId, promise);
  // Cache even the null result so a hot loop with a broken URL doesn't
  // re-fetch on every frame.
  cache.set(skinId, promise);
  return promise;
}

/**
 * Drop cached entries for one Skin (or all). Call after a Skin swap so the
 * next mount re-fetches the new model.
 */
export function clearSkinAssetCache(skinId?: string): void {
  if (skinId) {
    cache.delete(skinId);
    inflight.delete(skinId);
    return;
  }
  cache.clear();
  inflight.clear();
}

/**
 * Kick off a load for `skinId` ahead of its first render. The returned
 * promise resolves with the same value `loadSkinAsset` would produce.
 */
export function preloadSkinAsset(skinId: string, url: string): Promise<Group | null> {
  return loadSkinAsset(skinId, url);
}

/**
 * Test seam — return the cache size without exposing internals.
 */
export function _skinAssetCacheSize(): number {
  return cache.size;
}
