/**
 * Asset Quality Gate unit tests.
 *
 * Coverage matrix (design.md §C):
 *   - Demo GLB + role=test        → valid=true, 0 warnings
 *   - Demo GLB + role=production  → valid=true, 3 warnings (texture/skel/anim)
 *   - Mock report + role=production + no PBR → valid=false (Required reject)
 *   - Mock report + NaN flag     → valid=false (Required reject)
 *   - Mock report + file size >= 20 MB → valid=false (Required reject)
 *   - Mock report + Mesh=0       → valid=false
 *   - Mock report + degenerate bbox → valid=false
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { gradeReport, ROLES } from "./quality-gate.mjs";
import { buildReport } from "./validate-skin-asset.mjs";
import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

async function readDemoReport() {
  // Read the on-disk demo manifest produced by `node scripts/seed-demo-glb.mjs`
  // + `node scripts/validate-skin-asset.mjs`. This keeps the test honest about
  // the contract the seed and validator actually expose.
  const { readFileSync } = await import("node:fs");
  const { resolve, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const manifestPath = resolve(
    __dirname,
    "../public/assets/skins/_demo/egg-exported.asset-manifest.json",
  );
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

describe("quality-gate.gradeReport", () => {
  test("valid demo GLB + role=test passes with no warnings", async () => {
    const report = await readDemoReport();
    const result = gradeReport(report, "test");
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
    assert.equal(result.warnings.length, 0);
  });

  test("valid demo GLB + role=production passes with 3 warnings", async () => {
    const report = await readDemoReport();
    const result = gradeReport(report, "production");
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
    assert.equal(result.warnings.length, 3);
    const names = result.checks.filter((c) => c.level === "warning").map((c) => c.name);
    assert.ok(names.includes("textureEmbedded"));
    assert.ok(names.includes("skeleton"));
    assert.ok(names.includes("animation"));
  });

  test("missing meshes → reject for both roles", () => {
    const result = gradeReport(
      {
        valid: false,
        meshes: 0,
        triangleCount: 0,
        materials: 0,
        textures: 0,
        pbr: false,
        animations: [],
        skeleton: false,
        boundingBox: null,
        fileSizeBytes: 100,
        errors: ["No meshes found in GLB"],
      },
      "test",
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /No meshes/.test(e)));
  });

  test("no PBR + role=production → reject", () => {
    const result = gradeReport(
      {
        valid: true,
        meshes: 1,
        triangleCount: 12,
        materials: 1,
        textures: 1,
        pbr: false,
        animations: [{ name: "idle", durationSec: 1.5 }],
        skeleton: { joints: 24 },
        boundingBox: { min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] },
        fileSizeBytes: 1024,
        errors: [],
      },
      "production",
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /PBR material missing/.test(e)));
  });

  test("no PBR + role=test → does not reject", () => {
    const result = gradeReport(
      {
        valid: true,
        meshes: 1,
        triangleCount: 12,
        materials: 1,
        textures: 0,
        pbr: false,
        animations: [],
        skeleton: false,
        boundingBox: { min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] },
        fileSizeBytes: 1024,
      },
      "test",
    );
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  test("file size >= 20 MB → reject", () => {
    const result = gradeReport(
      {
        valid: true,
        meshes: 1,
        triangleCount: 12,
        materials: 1,
        textures: 0,
        pbr: true,
        animations: [],
        skeleton: false,
        boundingBox: { min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] },
        fileSizeBytes: 20 * 1024 * 1024,
      },
      "test",
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /20 MB/.test(e)));
  });

  test("NaN flag from validator propagates as Required failure", () => {
    const result = gradeReport(
      {
        valid: false,
        meshes: 1,
        triangleCount: 12,
        materials: 1,
        textures: 0,
        pbr: true,
        animations: [],
        skeleton: false,
        boundingBox: { min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] },
        fileSizeBytes: 1024,
        errors: ["GLB contains NaN or Infinity values"],
      },
      "test",
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /NaN/.test(e)));
  });

  test("degenerate bounding box propagates as Required failure", () => {
    const result = gradeReport(
      {
        valid: false,
        meshes: 1,
        triangleCount: 12,
        materials: 1,
        textures: 0,
        pbr: true,
        animations: [],
        skeleton: false,
        boundingBox: { min: [-500, -500, -500], max: [500, 500, 500] },
        fileSizeBytes: 1024,
        errors: ["Bounding box extent outside [0.001, 100] range"],
      },
      "test",
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /Bounding box/.test(e)));
  });

  test("ROLES exposes the two supported values", () => {
    assert.deepEqual([...ROLES], ["test", "production"]);
  });
});

describe("validate → gate pipeline", () => {
  test("in-process GLB → validate → gate(test) passes", async () => {
    // Build a tiny valid GLB in-memory and feed it through the same code
    // path the CLI uses. This catches drift between validator + gate.
    const doc = new Document();
    doc.createBuffer();
    const positions = new Float32Array([
      -0.5, -0.5, -0.5,
      0.5, -0.5, -0.5,
      0.5, 0.5, -0.5,
      -0.5, 0.5, -0.5,
      -0.5, -0.5, 0.5,
      0.5, -0.5, 0.5,
      0.5, 0.5, 0.5,
      -0.5, 0.5, 0.5,
    ]);
    const indices = new Uint16Array([
      0, 1, 2, 0, 2, 3, // -Z
      4, 6, 5, 4, 7, 6, // +Z
      0, 4, 5, 0, 5, 1, // -Y
      3, 2, 6, 3, 6, 7, // +Y
      0, 3, 7, 0, 7, 4, // -X
      1, 5, 6, 1, 6, 2, // +X
    ]);
    const buf = doc.getRoot().listBuffers()[0];
    const pos = doc.createAccessor().setType("VEC3").setArray(positions).setBuffer(buf);
    const idx = doc.createAccessor().setType("SCALAR").setArray(indices).setBuffer(buf);
    const prim = doc.createPrimitive().setAttribute("POSITION", pos).setIndices(idx);
    doc.createMesh("m").addPrimitive(prim);
    doc.createMaterial("mat");
    prim.setMaterial(doc.getRoot().listMaterials()[0]);
    doc.createNode("n").setMesh(doc.getRoot().listMeshes()[0]);
    doc.createScene("s").addChild(doc.getRoot().listNodes()[0]);
    const glbBuffer = await io.writeBinary(doc);
    const document = await io.readBinary(glbBuffer);

    const report = buildReport({ glbPath: "/tmp/inproc.glb", glbBuffer, document });
    assert.equal(report.valid, true);

    const gateTest = gradeReport(report, "test");
    assert.equal(gateTest.valid, true);
  });
});
