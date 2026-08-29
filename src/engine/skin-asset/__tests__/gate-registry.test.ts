import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";

import { SKINS } from "../../../game/skins.ts";
import {
  fetchGateReport,
  gateReportUrlFor,
  isRejectedSkin,
  loadRejectedSkinIds,
} from "../gate-registry.ts";

type FetchFn = typeof globalThis.fetch;

const originalFetch: FetchFn | undefined = globalThis.fetch;

beforeEach(() => {
  // Each test installs its own fetch; reset to the real one in afterEach.
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function setFetch(handler: FetchFn) {
  globalThis.fetch = handler;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("gate-registry.fetchGateReport", () => {
  test("returns null when the report 404s", async () => {
    setFetch(async () => new Response("nope", { status: 404 }));
    const r = await fetchGateReport("/assets/skins/foo.glb");
    assert.equal(r, null);
  });

  test("returns null when the JSON body has no `valid` field", async () => {
    setFetch(async () => jsonResponse(200, { role: "test" }));
    const r = await fetchGateReport("/assets/skins/foo.glb");
    assert.equal(r, null);
  });

  test("returns the parsed report when valid: false", async () => {
    setFetch(async () =>
      jsonResponse(200, {
        valid: false,
        role: "production",
        errors: ["Missing PBR"],
        warnings: [],
      }),
    );
    const r = await fetchGateReport("/assets/skins/foo.glb");
    assert.deepEqual(r, {
      valid: false,
      role: "production",
      errors: ["Missing PBR"],
      warnings: [],
    });
  });

  test("returns the parsed report when valid: true", async () => {
    setFetch(async () =>
      jsonResponse(200, { valid: true, role: "production", errors: [], warnings: [] }),
    );
    const r = await fetchGateReport("/assets/skins/foo.glb");
    assert.equal(r?.valid, true);
    assert.equal(r?.role, "production");
  });

  test("returns null on network error", async () => {
    setFetch(async () => {
      throw new Error("network down");
    });
    const r = await fetchGateReport("/assets/skins/foo.glb");
    assert.equal(r, null);
  });
});

describe("gate-registry.loadRejectedSkinIds", () => {
  test("returns the set of Model Skin ids whose reports report valid: false", async () => {
    const modelSkins = SKINS.filter(
      (s) => s.renderKind === "model" && typeof s.modelUrl === "string",
    );
    assert.ok(modelSkins.length > 0, "registry must have at least one Model Skin");

    // Mark the FIRST Model Skin as rejected, all others as approved. The
    // Skin id and the GLB URL don't share a substring, so we compute the
    // exact gate URL via the same helper the runtime uses.
    const rejectedId = modelSkins[0].id;
    const rejectedGateUrl = gateReportUrlFor(modelSkins[0].modelUrl!);
    setFetch(async (input) => {
      const url = typeof input === "string" ? input : (input as URL).toString();
      if (url === rejectedGateUrl) {
        return jsonResponse(200, { valid: false, role: "production", errors: ["bad"], warnings: [] });
      }
      if (url.endsWith(".quality-gate-report.json")) {
        return jsonResponse(200, { valid: true, role: "production", errors: [], warnings: [] });
      }
      return new Response("nope", { status: 404 });
    });

    const ids = await loadRejectedSkinIds();
    assert.ok(ids.has(rejectedId), `expected ${rejectedId} in rejected set`);
    for (const s of modelSkins.slice(1)) {
      assert.ok(!ids.has(s.id), `did not expect ${s.id} in rejected set`);
    }
  });

  test("treats missing reports as ungraded — does not flag the Skin", async () => {
    setFetch(async () => new Response("nope", { status: 404 }));
    const ids = await loadRejectedSkinIds();
    assert.equal(ids.size, 0);
  });

  test("excludes procedural Skins from the scan (they have no reports)", async () => {
    let calls = 0;
    setFetch(async (input) => {
      calls += 1;
      const url = typeof input === "string" ? input : (input as URL).toString();
      // Only Model URLs include a quality-gate-report.json suffix.
      assert.ok(
        url.includes(".quality-gate-report.json"),
        `unexpected URL: ${url}`,
      );
      return jsonResponse(200, { valid: true, role: "production", errors: [], warnings: [] });
    });
    await loadRejectedSkinIds();
    // Each Model Skin makes exactly one fetch — there must be NO fetch for
    // procedural Skin ids.
    const modelCount = SKINS.filter(
      (s) => s.renderKind === "model" && typeof s.modelUrl === "string",
    ).length;
    assert.equal(calls, modelCount);
  });
});

describe("gate-registry.isRejectedSkin", () => {
  test("true when the id is in the rejected set", () => {
    assert.equal(isRejectedSkin("egg_demo_model", new Set(["egg_demo_model"])), true);
  });

  test("false when the id is not in the rejected set", () => {
    assert.equal(isRejectedSkin("plain", new Set(["egg_demo_model"])), false);
  });

  test("false when the rejected set is empty", () => {
    assert.equal(isRejectedSkin("egg_demo_model", new Set()), false);
  });
});