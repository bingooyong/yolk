/**
 * Asset Validator unit tests.
 *
 * Strategy: build tiny synthetic GLBs in-process via `@gltf-transform/core`
 * and assert on the produced AssetReport. No fixtures on disk, no Playwright.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

import {
  REPORT_VERSION,
  buildReport,
  toPublicUrl,
} from "./validate-skin-asset.mjs";

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

async function buildValidBox() {
  const doc = new Document();
  doc.createBuffer();

  const positions = new Float32Array([
    -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
    -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
  ]);
  const indices = new Uint32Array([
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
  const mesh = doc.createMesh("box").addPrimitive(prim);
  const mat = doc.createMaterial("box-mat").setBaseColorFactor([1, 1, 1, 1]);
  prim.setMaterial(mat);
  doc.createNode("box-node").setMesh(mesh);
  doc.createScene("box-scene").addChild(doc.getRoot().listNodes()[0]);

  const glbBuffer = await io.writeBinary(doc);
  return { document: await io.readBinary(glbBuffer), glbBuffer };
}

async function buildEmptyScene() {
  const doc = new Document();
  doc.createBuffer();
  const glbBuffer = await io.writeBinary(doc);
  return { document: await io.readBinary(glbBuffer), glbBuffer };
}

async function buildWithNan() {
  const doc = new Document();
  doc.createBuffer();
  const positions = new Float32Array([
    Number.NaN,
    0,
    0,
    1,
    0,
    0,
    0,
    1,
    0,
  ]);
  const indices = new Uint32Array([0, 1, 2]);
  const buf = doc.getRoot().listBuffers()[0];
  const pos = doc.createAccessor().setType("VEC3").setArray(positions).setBuffer(buf);
  const idx = doc.createAccessor().setType("SCALAR").setArray(indices).setBuffer(buf);
  const prim = doc.createPrimitive().setAttribute("POSITION", pos).setIndices(idx);
  const mesh = doc.createMesh("nan-mesh").addPrimitive(prim);
  const mat = doc.createMaterial("nan-mat");
  prim.setMaterial(mat);
  doc.createNode("nan-node").setMesh(mesh);
  doc.createScene().addChild(doc.getRoot().listNodes()[0]);
  const glbBuffer = await io.writeBinary(doc);
  return { document: await io.readBinary(glbBuffer), glbBuffer };
}

async function buildWithTooManyMaterials() {
  const { document } = await buildValidBox();
  for (let i = 0; i < 35; i += 1) {
    document.createMaterial(`extra-mat-${i}`);
  }
  const regenerated = await io.writeBinary(document);
  return {
    document: await io.readBinary(regenerated),
    glbBuffer: regenerated,
  };
}

describe("validate-skin-asset.buildReport", () => {
  test("valid box → report is valid with required fields populated", async () => {
    const { document, glbBuffer } = await buildValidBox();
    const report = buildReport({
      glbPath: "/tmp/box.glb",
      glbBuffer,
      document,
    });

    assert.equal(report.valid, true);
    assert.equal(report.version, REPORT_VERSION);
    assert.equal(report.format, "glb");
    assert.equal(report.meshes, 1);
    assert.equal(report.materials, 1);
    assert.equal(report.textures, 0);
    assert.equal(report.triangleCount, 12);
    assert.equal(report.fileSizeBytes, glbBuffer.byteLength);
    assert.equal(report.skeleton, false);
    assert.deepEqual(report.animations, []);
    assert.deepEqual(report.boundingBox.min, [-0.5, -0.5, -0.5]);
    assert.deepEqual(report.boundingBox.max, [0.5, 0.5, 0.5]);
    assert.match(report.sha256, /^[a-f0-9]{64}$/);
    assert.ok(report.requiredLevels);
    assert.equal(report.requiredLevels.triangleCount, "Required");
    assert.equal(report.requiredLevels.pbr, "Recommended");
    assert.equal(report.requiredLevels.skeleton, "Recommended");
    assert.equal(report.requiredLevels.animation, "Recommended");
    assert.equal(report.requiredLevels.textureEmbedded, "Optional");
    assert.equal(report.errors, undefined);
  });

  test("empty scene → valid=false with explicit errors", async () => {
    const { document, glbBuffer } = await buildEmptyScene();
    const report = buildReport({
      glbPath: "/tmp/empty.glb",
      glbBuffer,
      document,
    });
    assert.equal(report.valid, false);
    assert.ok(Array.isArray(report.errors));
    assert.ok(report.errors.includes("No meshes found in GLB"));
  });

  test("NaN vertex → valid=false with non-finite error", async () => {
    const { document, glbBuffer } = await buildWithNan();
    const report = buildReport({
      glbPath: "/tmp/nan.glb",
      glbBuffer,
      document,
    });
    assert.equal(report.valid, false);
    assert.ok(report.errors.some((e) => /NaN|Infinity/.test(e)));
  });

  test("too many materials → valid=false", async () => {
    const { document, glbBuffer } = await buildWithTooManyMaterials();
    const report = buildReport({
      glbPath: "/tmp/many-mat.glb",
      glbBuffer,
      document,
    });
    assert.equal(report.valid, false);
    assert.ok(
      report.errors.some((e) => /Material count \d+ is outside the \[1, 32\] range/.test(e)),
      `expected material count error, got: ${JSON.stringify(report.errors)}`,
    );
  });

  test("sha256 is stable across calls for the same input", async () => {
    const { document, glbBuffer } = await buildValidBox();
    const a = buildReport({ glbPath: "/tmp/box.glb", glbBuffer, document });
    const b = buildReport({ glbPath: "/tmp/box.glb", glbBuffer, document });
    assert.equal(a.sha256, b.sha256);
  });

  test("requiredLevels map covers every Quality Gate check", async () => {
    const { document, glbBuffer } = await buildValidBox();
    const report = buildReport({ glbPath: "/tmp/box.glb", glbBuffer, document });
    const expected = [
      "glbParseable",
      "meshes",
      "triangleCount",
      "boundingBox",
      "materials",
      "textureEmbedded",
      "pbr",
      "skeleton",
      "animation",
      "modelSize",
      "nonFinite",
      "fileSize",
    ];
    for (const k of expected) {
      assert.ok(report.requiredLevels[k], `requiredLevels missing key: ${k}`);
      assert.ok(
        ["Required", "Optional", "Recommended", "Deferred"].includes(
          report.requiredLevels[k],
        ),
        `unexpected level for ${k}: ${report.requiredLevels[k]}`,
      );
    }
  });

  test("paths under publicRoot are normalized to public URL paths", async () => {
    const { document, glbBuffer } = await buildValidBox();
    const publicRoot = "/repo/public";
    const glbPath = "/repo/public/assets/skins/foo/box.glb";
    const report = buildReport({ glbPath, glbBuffer, document, publicRoot });
    assert.equal(report.model, "/assets/skins/foo/box.glb");
    assert.equal(report.lod.lod0, "/assets/skins/foo/box.glb");
    assert.equal(report.lod.lod1, "/assets/skins/foo/box.glb");
    assert.equal(report.lod.lod2, "/assets/skins/foo/box.glb");
    assert.equal(report.source, "/assets/skins/foo");
    // The id is just the basename, unaffected by path normalization.
    assert.equal(report.id, "box");
  });

  test("paths outside publicRoot are preserved as absolute", async () => {
    const { document, glbBuffer } = await buildValidBox();
    const publicRoot = "/repo/public";
    const glbPath = "/repo/elsewhere/box.glb";
    const report = buildReport({ glbPath, glbBuffer, document, publicRoot });
    assert.equal(report.model, "/repo/elsewhere/box.glb");
    assert.equal(report.lod.lod0, "/repo/elsewhere/box.glb");
    assert.equal(report.source, "/repo/elsewhere");
  });

  test("paths are absolute when publicRoot is not supplied", async () => {
    const { document, glbBuffer } = await buildValidBox();
    const report = buildReport({ glbPath: "/tmp/box.glb", glbBuffer, document });
    assert.equal(report.model, "/tmp/box.glb");
    assert.equal(report.lod.lod0, "/tmp/box.glb");
    assert.equal(report.source, "/tmp");
  });

  test("toPublicUrl handles cross-platform separators", () => {
    assert.equal(toPublicUrl("/repo/public/assets/x.glb", "/repo/public"), "/assets/x.glb");
    assert.equal(toPublicUrl("/repo/public/assets/x.glb", "/repo/public/"), "/assets/x.glb");
    assert.equal(toPublicUrl("/repo/elsewhere/x.glb", "/repo/public"), "/repo/elsewhere/x.glb");
    assert.equal(toPublicUrl("/repo/public/assets/x.glb", null), "/repo/public/assets/x.glb");
    assert.equal(toPublicUrl("", "/repo/public"), "");
  });
});
