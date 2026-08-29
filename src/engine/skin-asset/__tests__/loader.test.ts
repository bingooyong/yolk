import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";

import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

import {
  QualityGateRejectedError,
  _skinAssetCacheSize,
  clearSkinAssetCache,
  loadSkinAsset,
  preloadSkinAsset,
} from "../loader.ts";

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

async function buildMinimalGlb(): Promise<ArrayBuffer> {
  const doc = new Document();
  doc.createBuffer();
  const positions = new Float32Array([
    -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5,
  ]);
  const indices = new Uint32Array([0, 1, 2]);
  const buf = doc.getRoot().listBuffers()[0];
  const pos = doc.createAccessor().setType("VEC3").setArray(positions).setBuffer(buf);
  const idx = doc.createAccessor().setType("SCALAR").setArray(indices).setBuffer(buf);
  const prim = doc.createPrimitive().setAttribute("POSITION", pos).setIndices(idx);
  doc.createMesh("m").addPrimitive(prim);
  doc.createMaterial("mat");
  prim.setMaterial(doc.getRoot().listMaterials()[0]);
  doc.createNode("n").setMesh(doc.getRoot().listMeshes()[0]);
  doc.createScene("s").addChild(doc.getRoot().listNodes()[0]);
  const u8 = await io.writeBinary(doc);
  // Copy into a fresh ArrayBuffer so the Response BodyInit type accepts it
  // (Node 24 / @types/node 22 narrowed BodyInit — Uint8Array<ArrayBufferLike>
  // is rejected; a plain ArrayBuffer slice is the safe path).
  const out = new ArrayBuffer(u8.byteLength);
  new Uint8Array(out).set(u8);
  return out;
}

type FetchFn = typeof globalThis.fetch;

const originalFetch: FetchFn | undefined = globalThis.fetch;

beforeEach(() => {
  clearSkinAssetCache();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  clearSkinAssetCache();
});

function setFetch(handler: FetchFn) {
  globalThis.fetch = handler;
}

describe("SkinAssetLoader", () => {
  /**
   * Tests below mock `fetch` to return the same binary blob for every URL.
   * The loader now makes 2 calls per successful load: one for the GLB, one
   * for the sibling Quality Gate report. The mock's binary body fails to
   * parse as JSON, so `fetchGate` returns null and the load succeeds
   * normally. Tests below assert the resulting call count (2 for success,
   * 1 for the early-exit failure paths).
   */

  test("returns the parsed Group on a successful fetch + parse", async () => {
    const buffer = await buildMinimalGlb();
    let calls = 0;
    setFetch(async () => {
      calls += 1;
      return new Response(buffer, {
        status: 200,
        headers: { "content-type": "model/gltf-binary" },
      });
    });

    const g = await loadSkinAsset("skin-1", "/assets/test.glb");
    assert.ok(g, "expected a Group, got null");
    assert.equal(g.type, "Group");
    assert.equal(calls, 2, "first call should hit GLB + Quality Gate URL");
  });

  test("caches by skinId — second call does not re-fetch", async () => {
    const buffer = await buildMinimalGlb();
    let calls = 0;
    setFetch(async () => {
      calls += 1;
      return new Response(buffer, {
        status: 200,
        headers: { "content-type": "model/gltf-binary" },
      });
    });

    const a = await loadSkinAsset("skin-1", "/assets/test.glb");
    const b = await loadSkinAsset("skin-1", "/assets/test.glb");
    assert.equal(calls, 2, "second call must be served from cache (no extra fetch)");
    assert.ok(a === b, "cached promise must resolve to the same Group");
  });

  test("returns null on a 404 — no throw", async () => {
    setFetch(async () => new Response("not found", { status: 404 }));
    const g = await loadSkinAsset("skin-bad", "/assets/missing.glb");
    assert.equal(g, null);
  });

  test("returns null on a network error", async () => {
    setFetch(async () => {
      throw new Error("network down");
    });
    const g = await loadSkinAsset("skin-net-fail", "/assets/x.glb");
    assert.equal(g, null);
  });

  test("returns null when the response is not a valid GLB", async () => {
    setFetch(
      async () =>
        new Response("not a glb at all", {
          status: 200,
          headers: { "content-type": "model/gltf-binary" },
        }),
    );
    const g = await loadSkinAsset("skin-junk", "/assets/junk.glb");
    assert.equal(g, null);
  });

  test("deduplicates concurrent fetches for the same skinId", async () => {
    const buffer = await buildMinimalGlb();
    let calls = 0;
    setFetch(async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 10));
      return new Response(buffer, {
        status: 200,
        headers: { "content-type": "model/gltf-binary" },
      });
    });

    const [a, b] = await Promise.all([
      loadSkinAsset("skin-concurrent", "/assets/concurrent.glb"),
      loadSkinAsset("skin-concurrent", "/assets/concurrent.glb"),
    ]);
    assert.equal(
      calls,
      2,
      "concurrent calls must share one in-flight fetch (GLB + Gate)",
    );
    assert.ok(a === b, "both promises resolve to the same Group");
  });

  test("clearSkinAssetCache(skinId) drops one entry", async () => {
    const buffer = await buildMinimalGlb();
    setFetch(async () => new Response(buffer));
    await loadSkinAsset("skin-a", "/assets/a.glb");
    assert.equal(_skinAssetCacheSize(), 1);
    clearSkinAssetCache("skin-a");
    assert.equal(_skinAssetCacheSize(), 0);
  });

  test("clearSkinAssetCache() with no arg drops all entries", async () => {
    const buffer = await buildMinimalGlb();
    setFetch(async () => new Response(buffer));
    await loadSkinAsset("skin-a", "/assets/a.glb");
    await loadSkinAsset("skin-b", "/assets/b.glb");
    assert.equal(_skinAssetCacheSize(), 2);
    clearSkinAssetCache();
    assert.equal(_skinAssetCacheSize(), 0);
  });

  test("preloadSkinAsset is equivalent to loadSkinAsset (warms the cache)", async () => {
    const buffer = await buildMinimalGlb();
    let calls = 0;
    setFetch(async () => {
      calls += 1;
      return new Response(buffer);
    });
    await preloadSkinAsset("skin-preload", "/assets/preload.glb");
    assert.equal(calls, 2);
    // Second call hits cache.
    await loadSkinAsset("skin-preload", "/assets/preload.glb");
    assert.equal(calls, 2);
  });

  describe("Quality Gate integration", () => {
    function mockGateResponse(report: unknown) {
      return new Response(JSON.stringify(report), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    test("throws QualityGateRejectedError when gate reports valid=false", async () => {
      const buffer = await buildMinimalGlb();
      setFetch(async (input) => {
        const url = typeof input === "string" ? input : (input as URL).toString();
        if (url.endsWith(".quality-gate-report.json")) {
          return mockGateResponse({
            valid: false,
            role: "production",
            errors: ["Missing PBR"],
            warnings: [],
          });
        }
        return new Response(buffer, { status: 200 });
      });
      await assert.rejects(
        loadSkinAsset("skin-rejected", "/assets/rejected.glb"),
        (err: unknown) => {
          assert.ok(err instanceof QualityGateRejectedError);
          assert.equal((err as QualityGateRejectedError).skinId, "skin-rejected");
          assert.deepEqual((err as QualityGateRejectedError).errors, ["Missing PBR"]);
          assert.equal((err as QualityGateRejectedError).role, "production");
          return true;
        },
      );
    });

    test("returns the Group when gate reports valid=true", async () => {
      const buffer = await buildMinimalGlb();
      setFetch(async (input) => {
        const url = typeof input === "string" ? input : (input as URL).toString();
        if (url.endsWith(".quality-gate-report.json")) {
          return mockGateResponse({ valid: true, role: "production", errors: [], warnings: [] });
        }
        return new Response(buffer, { status: 200 });
      });
      const g = await loadSkinAsset("skin-passed", "/assets/passed.glb");
      assert.ok(g, "expected a Group when the gate approves");
    });

    test("returns the Group when gate report is missing (404)", async () => {
      const buffer = await buildMinimalGlb();
      setFetch(async (input) => {
        const url = typeof input === "string" ? input : (input as URL).toString();
        if (url.endsWith(".quality-gate-report.json")) {
          return new Response("not found", { status: 404 });
        }
        return new Response(buffer, { status: 200 });
      });
      const g = await loadSkinAsset("skin-ungraded", "/assets/ungraded.glb");
      assert.ok(g, "missing gate report must not block the load");
    });

    test("does not fetch the gate report when the GLB fetch fails", async () => {
      let gateCalls = 0;
      setFetch(async (input) => {
        const url = typeof input === "string" ? input : (input as URL).toString();
        if (url.endsWith(".quality-gate-report.json")) {
          gateCalls += 1;
          return mockGateResponse({ valid: true });
        }
        return new Response("nope", { status: 404 });
      });
      const g = await loadSkinAsset("skin-glb-missing", "/assets/missing.glb");
      assert.equal(g, null);
      assert.equal(gateCalls, 0, "no gate fetch when the GLB itself is unreachable");
    });
  });
});
