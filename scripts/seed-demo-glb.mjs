#!/usr/bin/env node
/**
 * Seed the demo GLB that MockProvider + SkinAssetLoader reference.
 *
 * Why this script exists
 * ----------------------
 * The full pipeline (EggMesh → GLTFExporter → browser download → middleware)
 * documented in `implement.md` §3a is the long-term path. Until that runs
 * end-to-end on a workstation with Playwright, we ship a deterministic
 * programmatically-built GLB that satisfies the Quality Gate Required
 * checks for `role: "test"`.
 *
 * What the seed contains
 * ----------------------
 * - 1 mesh (a 12-triangle box, vertex normals included)
 * - 1 PBR material (metallic-roughness base color)
 * - 0 textures, 0 skins, 0 animations
 * - Sensible bounding box (unit-ish size)
 *
 * Provenance
 * ----------
 *   Source : `scripts/seed-demo-glb.mjs` (this file)
 *   License: project-internal (NOT a third-party asset)
 *   Role   : runtime-integration-test asset (see docs/skins/third-party-assets.md)
 *
 * Do NOT replace this with hand-edited bytes. Re-run the seed script whenever
 * you change the box / material / bounding box — Validator + Quality Gate
 * re-read the GLB and will catch any drift from the documented shape.
 */

import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const outPath = resolve(
  repoRoot,
  "public/assets/skins/_demo/egg-exported.glb",
);

function buildDocument() {
  const doc = new Document();
  doc.createBuffer();

  // 1. Mesh: a single box (12 triangles), vertex normals included.
  //    Positions are 8 unique vertices, indices form 12 triangles (2 per face).
  const positions = new Float32Array([
    // -X face
    -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5,
    // +X face
    0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5,
    // -Y face
    -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
    // +Y face
    -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5,
    // -Z face
    -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
    // +Z face
    -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5,
  ]);

  const normals = new Float32Array([
    // -X
    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
    // +X
    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
    // -Y
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
    // +Y
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
    // -Z
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
    // +Z
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
  ]);

  const indices = new Uint32Array([
    // -X
    0, 1, 2, 0, 2, 3,
    // +X
    4, 5, 6, 4, 6, 7,
    // -Y
    8, 9, 10, 8, 10, 11,
    // +Y
    12, 13, 14, 12, 14, 15,
    // -Z
    16, 17, 18, 16, 18, 19,
    // +Z
    20, 21, 22, 20, 22, 23,
  ]);

  const positionAccessor = doc
    .createAccessor("box-position")
    .setType("VEC3")
    .setArray(positions)
    .setBuffer(doc.getRoot().listBuffers()[0]);

  const normalAccessor = doc
    .createAccessor("box-normal")
    .setType("VEC3")
    .setArray(normals)
    .setBuffer(doc.getRoot().listBuffers()[0]);

  const indexAccessor = doc
    .createAccessor("box-index")
    .setType("SCALAR")
    .setArray(indices)
    .setBuffer(doc.getRoot().listBuffers()[0]);

  const prim = doc
    .createPrimitive()
    .setAttribute("POSITION", positionAccessor)
    .setAttribute("NORMAL", normalAccessor)
    .setIndices(indexAccessor);

  const mesh = doc.createMesh("egg-box").addPrimitive(prim);

  // 2. Material — PBR metallic-roughness with a non-white base color so
  //    PBR detection (KHR_materials_pbrSpecularGlossiness / metallic-roughness
  //    usage) succeeds for both `test` and `production` roles.
  const material = doc
    .createMaterial("egg-pbr")
    .setBaseColorFactor([0.95, 0.92, 0.88, 1.0])
    .setMetallicFactor(0.05)
    .setRoughnessFactor(0.4);

  prim.setMaterial(material);

  // 3. Node + scene.
  const node = doc.createNode("egg-root").setMesh(mesh);
  doc.createScene("egg-scene").addChild(node);

  return doc;
}

async function main() {
  mkdirSync(dirname(outPath), { recursive: true });

  const doc = buildDocument();
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const glb = await io.writeBinary(doc);

  writeFileSync(outPath, glb);
  const stats = glb.byteLength;
  console.log(
    `[seed-demo-glb] wrote ${outPath} (${stats} bytes, ${(stats / 1024).toFixed(2)} KB)`,
  );
}

main().catch((err) => {
  console.error("[seed-demo-glb] failed:", err);
  process.exit(1);
});
