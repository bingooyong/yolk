import { useEffect, useState } from "react";
import { SKINS, type Skin } from "../../game/skins.ts";
import { gateReportUrlFor } from "./loader.ts";

/**
 * gate-registry — scan every Model Skin's Quality Gate report and return
 * the set of `skinId`s the Quality Gate has rejected. Used by the UI to
 * hide rejected Skins from the wardrobe / inventory (R13.5 second
 * clause: "Skin Registry 的 getSkin(id) 必须能识别被拒绝的 Skin 并在 UI
 * 隐藏").
 *
 * Reports that are missing (HTTP 404) or that fail to parse are treated
 * as "ungraded" and the corresponding Skin is NOT marked rejected — that
 * way a freshly-authored dev asset is still previewable before its first
 * Gate run.
 */

export type GateReport = {
  valid: boolean;
  role?: string;
  errors?: string[];
  warnings?: string[];
};

/**
 * Public URL helper: derive the Quality Gate report URL for a GLB URL.
 * Re-exported so tests + downstream consumers can stay in lockstep with
 * the Loader's URL convention.
 */
export { gateReportUrlFor };

/**
 * Fetch the Quality Gate report for one model URL. Returns `null` when
 * the report is missing or unparseable (= ungraded).
 */
export async function fetchGateReport(modelUrl: string): Promise<GateReport | null> {
  const url = gateReportUrlFor(modelUrl);
  try {
    const res = await fetch(url, { credentials: "omit", cache: "no-store" });
    if (!res.ok) return null;
    const parsed = (await res.json()) as GateReport;
    if (typeof parsed !== "object" || parsed === null) return null;
    if (typeof parsed.valid !== "boolean") return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Return the set of Skin ids the Quality Gate has rejected. Procedural
 * Skins (renderKind === "procedural") are excluded — they never have a
 * Quality Gate report and are never subject to rejection.
 */
export async function loadRejectedSkinIds(): Promise<Set<string>> {
  const modelSkins = SKINS.filter((s): s is Skin & { modelUrl: string } => {
    if (s.renderKind !== "model") return false;
    return typeof s.modelUrl === "string" && s.modelUrl.length > 0;
  });

  const rejected = new Set<string>();
  await Promise.all(
    modelSkins.map(async (s) => {
      const report = await fetchGateReport(s.modelUrl);
      if (report && report.valid === false) rejected.add(s.id);
    }),
  );
  return rejected;
}

/**
 * Sync helper for components that already hold a preloaded report set
 * (e.g. via `useRejectedSkinIds`). Returns true iff the Skin has been
 * rejected by the Quality Gate. Procedural Skins are always accepted.
 */
export function isRejectedSkin(skinId: string, rejectedIds: ReadonlySet<string>): boolean {
  return rejectedIds.has(skinId);
}

/**
 * React hook — fetches the rejected-skin set on mount and caches it for
 * the lifetime of the component. The first render returns an empty set so
 * the UI can render synchronously; once the scan completes (typically
 * within one network round-trip) the rejected ids become hidden.
 *
 * Cache lifetime matches the component's lifetime — re-mounting the
 * Hub / wardrobe re-fetches. For session-spanning caching, lift the
 * state into a parent or wrap the call in your own store.
 */
export function useRejectedSkinIds(): ReadonlySet<string> {
  const [rejected, setRejected] = useState<ReadonlySet<string>>(() => new Set());
  useEffect(() => {
    let cancelled = false;
    loadRejectedSkinIds().then((ids) => {
      if (!cancelled) setRejected(ids);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return rejected;
}