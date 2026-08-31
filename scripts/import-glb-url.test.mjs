import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { assertSafeImportUrl, assertSafeSkinId, MAX_IMPORT_BYTES } from "./import-glb-url.mjs";

describe("assertSafeImportUrl", () => {
  test("accepts https public hosts", () => {
    assert.equal(
      assertSafeImportUrl("https://github.com/user/repo/raw/main/a.glb"),
      "https://github.com/user/repo/raw/main/a.glb",
    );
  });

  test("rejects localhost and private nets", () => {
    assert.throws(() => assertSafeImportUrl("http://127.0.0.1/x.glb"), /private|host/);
    assert.throws(() => assertSafeImportUrl("http://localhost/x.glb"), /host/);
    assert.throws(() => assertSafeImportUrl("http://192.168.1.4/x.glb"), /private|host/);
    assert.throws(() => assertSafeImportUrl("http://10.0.0.2/x.glb"), /private|host/);
  });

  test("rejects non-http schemes", () => {
    assert.throws(() => assertSafeImportUrl("file:///tmp/a.glb"), /http/);
    assert.throws(() => assertSafeImportUrl("javascript:alert(1)"), /invalid|http/);
  });
});

describe("assertSafeSkinId", () => {
  test("accepts lab ids", () => {
    assert.equal(assertSafeSkinId("lab_user_import"), "lab_user_import");
  });
  test("rejects path traversal", () => {
    assert.throws(() => assertSafeSkinId("../etc"), /invalid/);
    assert.throws(() => assertSafeSkinId("a/b"), /invalid/);
  });
});

test("import cap matches quality-gate 20 MB", () => {
  assert.equal(MAX_IMPORT_BYTES, 20 * 1024 * 1024);
});
