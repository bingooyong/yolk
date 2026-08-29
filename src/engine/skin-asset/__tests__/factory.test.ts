import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";

import {
  MissingApiKeyError,
  createProvider,
  listAvailableProviders,
  providerErrorCode,
  type ProviderKind,
  type SkinAssetGenerationProvider,
} from "../provider/index.ts";

/**
 * Snapshot of the env vars the factory reads. We mutate the real env vars
 * (and restore them in `afterEach`) rather than mocking `process.env`
 * because the Provider constructors reach into it at construction time and
 * Node's `process.env` is the only reliable seam across `tsx` / `vite-node`
 * / `vite ssrLoadModule`.
 */
const ENV_VARS = ["MESHY_API_KEY", "RODIN_API_KEY", "TRELLIS_API_KEY"] as const;
type EnvName = (typeof ENV_VARS)[number];

const saved: Partial<Record<EnvName, string | undefined>> = {};

function clearAll(): void {
  for (const k of ENV_VARS) delete process.env[k];
}

beforeEach(() => {
  for (const k of ENV_VARS) saved[k] = process.env[k];
  clearAll();
});

afterEach(() => {
  clearAll();
  for (const k of ENV_VARS) {
    if (saved[k] !== undefined) process.env[k] = saved[k];
  }
});

describe("createProvider", () => {
  test("returns a mock provider when kind='mock'", () => {
    const p = createProvider("mock");
    assert.equal(p.id, "mock");
    assertSatisfiesInterface(p);
  });

  test("throws MissingApiKeyError when meshy key is absent", () => {
    assert.throws(
      () => createProvider("meshy"),
      (err: unknown) =>
        err instanceof MissingApiKeyError && err.key === "MESHY_API_KEY",
    );
  });

  test("throws MissingApiKeyError when rodin key is absent", () => {
    assert.throws(
      () => createProvider("rodin"),
      (err: unknown) =>
        err instanceof MissingApiKeyError && err.key === "RODIN_API_KEY",
    );
  });

  test("throws MissingApiKeyError when trellis key is absent", () => {
    assert.throws(
      () => createProvider("trellis"),
      (err: unknown) =>
        err instanceof MissingApiKeyError && err.key === "TRELLIS_API_KEY",
    );
  });

  test("constructs MeshyProvider successfully when key is set", () => {
    process.env.MESHY_API_KEY = "test-key";
    const p = createProvider("meshy");
    assert.equal(p.id, "meshy");
    assertSatisfiesInterface(p);
  });

  test("rejects unknown provider kinds with a stable error", () => {
    const unknown = "trellis-v2" as unknown as ProviderKind;
    assert.throws(
      () => createProvider(unknown),
      /Unknown provider kind/,
    );
  });
});

describe("listAvailableProviders", () => {
  test("returns only mock when no real keys are set", () => {
    clearAll();
    const available = listAvailableProviders();
    assert.deepEqual(available, ["mock"]);
  });

  test("includes every provider whose key is set", () => {
    process.env.MESHY_API_KEY = "k";
    process.env.RODIN_API_KEY = "k";
    const available = listAvailableProviders();
    assert.deepEqual(available, ["mock", "meshy", "rodin"]);
  });

  test("ignores keys whose value is empty string", () => {
    process.env.MESHY_API_KEY = "";
    process.env.RODIN_API_KEY = "valid";
    const available = listAvailableProviders();
    assert.deepEqual(available, ["mock", "rodin"]);
  });
});

describe("providerErrorCode", () => {
  test("returns 'missing_api_key' for MissingApiKeyError", () => {
    const err = new MissingApiKeyError("MESHY_API_KEY");
    assert.equal(providerErrorCode(err), "missing_api_key");
  });

  test("returns 'unknown' for arbitrary errors", () => {
    assert.equal(providerErrorCode(new Error("nope")), "unknown");
    assert.equal(providerErrorCode("a string"), "unknown");
    assert.equal(providerErrorCode(null), "unknown");
  });
});

/**
 * Smoke check: the returned object really is a SkinAssetGenerationProvider.
 * We don't call every method here — the real behaviour is covered in the
 * dedicated per-provider suites (mock-provider.test.ts + integration tests).
 */
function assertSatisfiesInterface(p: SkinAssetGenerationProvider): void {
  assert.equal(typeof p.id, "string");
  assert.equal(typeof p.generateFromImage, "function");
  assert.equal(typeof p.generateFromPrompt, "function");
  assert.equal(typeof p.getTaskStatus, "function");
  assert.equal(typeof p.downloadAsset, "function");
}
