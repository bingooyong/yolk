#!/usr/bin/env node
/**
 * Asset Validator — read a GLB file and write `asset-report.json`.
 *
 * The Validator is the "fact gatherer": it inspects the GLB byte-for-byte
 * and writes down every observable property. It does NOT enforce any
 * thresholds. Threshold enforcement lives in `quality-gate.mjs` so a single
 * validator output can be re-graded against multiple roles (test / production)
 * without re-parsing the binary.
 *
 * Per design.md §3 / R5.1: every numeric field is annotated with a
 * `requiredLevel` so Quality Gate knows how to react when the field is
 * missing or out of range.
 *
 * Usage:
 *   node scripts/validate-skin-asset.mjs <glb-path> [--out <report-path>]
 *   node scripts/validate-skin-asset.mjs public/assets/skins/_demo/egg-exported.glb
 *
 * Exit codes:
 *   0  — report written successfully
 *   1  — usage error (missing arg)
 *   2  — GLB could not be parsed (report still written with errors[])
 */

import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Convert an absolute filesystem path to a public-relative URL path when it
 * lives under `publicRoot`. Outside `publicRoot` the absolute path is
 * preserved so the manifest is still informative.
 *
 * Examples:
 *   toPublicUrl("/repo/public/assets/skins/foo.glb", "/repo/public")
 *     → "/assets/skins/foo.glb"
 *   toPublicUrl("/repo/elsewhere/foo.glb", "/repo/public")
 *     → "/repo/elsewhere/foo.glb"
 *   toPublicUrl("/repo/public/assets/skins/foo.glb", null)
 *     → "/repo/public/assets/skins/foo.glb"
 */
export function toPublicUrl(absPath, publicRoot) {
  if (!absPath) return absPath;
  if (!publicRoot) return absPath;
  const normRoot = publicRoot.endsWith(sep) ? publicRoot : publicRoot + sep;
  if (absPath.startsWith(normRoot)) {
    const rel = relative(publicRoot, absPath).split(sep).join("/");
    return `/${rel}`;
  }
  return absPath;
}

/**
 * RequiredLevel — the seam between Validator and Quality Gate.
 * - Required : Quality Gate `reject` when failing (test + production)
 * - Optional : ignored when missing/failing
 * - Recommended: Quality Gate `warning` when failing (production); ignored (test)
 * - Deferred : not graded in P3; recorded but never raises errors
 */
export const REQUIRED_LEVELS = {
  REQUIRED: "Required",
  OPTIONAL: "Optional",
  RECOMMENDED: "Recommended",
  DEFERRED: "Deferred",
};

/** Schema version — bump only on breaking shape changes. */
export const REPORT_VERSION = 1;

function parseArgs(argv) {
  const args = { glbPath: null, outPath: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--out") {
      args.outPath = argv[i + 1];
      i += 1;
    } else if (!args.glbPath) {
      args.glbPath = a;
    }
  }
  return args;
}

/**
 * Detect PBR presence. glTF materials are metallic-roughness by default, so
 * we check whether any material deviates from the glTF defaults (1.0 metallic,
 * 1.0 roughness) OR uses textures. This avoids flagging every empty material
 * as "PBR" while still catching the realistic case where a real PBR
 * material has been authored.
 */
function hasPbr(document) {
  for (const material of document.getRoot().listMaterials()) {
    const metallic = material.getMetallicFactor?.();
    const roughness = material.getRoughnessFactor?.();
    const baseColorTex = material.getBaseColorTexture?.();
    const metallicRoughTex = material.getMetallicRoughnessTexture?.();
    const nonDefault =
      (typeof metallic === "number" && metallic !== 1) ||
      (typeof roughness === "number" && roughness !== 1) ||
      baseColorTex ||
      metallicRoughTex;
    if (nonDefault) return true;
  }
  return false;
}

/**
 * Compute the union AABB over all POSITION accessors. Returns
 * `{ min, max }` or `null` if no POSITION accessors exist.
 */
function computeBoundingBox(document) {
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  let found = false;
  for (const mesh of document.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION");
      if (!pos) continue;
      const arr = pos.getArray();
      if (!arr) continue;
      for (let i = 0; i < arr.length; i += 3) {
        const x = arr[i];
        const y = arr[i + 1];
        const z = arr[i + 2];
        if (x < min[0]) min[0] = x;
        if (y < min[1]) min[1] = y;
        if (z < min[2]) min[2] = z;
        if (x > max[0]) max[0] = x;
        if (y > max[1]) max[1] = y;
        if (z > max[2]) max[2] = z;
      }
      found = true;
    }
  }
  if (!found) return null;
  return { min, max };
}

/**
 * Scan POSITION/NORMAL/TEXCOORD arrays for NaN / Infinity. The validator
 * surfaces these as a boolean — the Quality Gate rejects on truth.
 */
function hasNonFinite(document) {
  for (const mesh of document.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      for (const semantic of ["POSITION", "NORMAL", "TEXCOORD_0"]) {
        const accessor = prim.getAttribute(semantic);
        if (!accessor) continue;
        const arr = accessor.getArray();
        if (!arr) continue;
        for (let i = 0; i < arr.length; i += 1) {
          const v = arr[i];
          if (!Number.isFinite(v)) return true;
        }
      }
      const idx = prim.getIndices();
      if (idx) {
        const arr = idx.getArray();
        if (arr) {
          for (let i = 0; i < arr.length; i += 1) {
            if (!Number.isFinite(arr[i])) return true;
          }
        }
      }
    }
  }
  return false;
}

function countTriangles(document) {
  let total = 0;
  for (const mesh of document.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const mode = prim.getMode(); // 4 = TRIANGLE
      if (mode !== 4) {
        // Non-triangle primitive (POINTS=0, LINES=1, TRIANGLE_STRIP=5, etc.).
        // Approximate: count vertices / 3. The Quality Gate doesn't grade
        // triangle-strip models yet (Deferred).
        const pos = prim.getAttribute("POSITION");
        if (pos) total += Math.floor((pos.getCount() ?? 0) / 3);
        continue;
      }
      const idx = prim.getIndices();
      if (idx) {
        total += idx.getCount() / 3;
      } else {
        const pos = prim.getAttribute("POSITION");
        if (pos) total += pos.getCount() / 3;
      }
    }
  }
  return Math.floor(total);
}

function listAnimations(document) {
  return document.getRoot().listAnimations().map((a) => ({
    name: a.getName() || "(unnamed)",
    durationSec: 0, // @gltf-transform/core's Accessor.getMax() requires typed arrays we don't read here.
  }));
}

function skeletonFromDocument(document) {
  const skins = document.getRoot().listSkins();
  if (skins.length === 0) return false;
  const joints = skins.reduce((n, s) => n + s.listJoints().length, 0);
  return { joints };
}

function listTextureResolutions(document) {
  const sizes = [];
  for (const texture of document.getRoot().listTextures()) {
    const image = texture.getImage();
    if (!image) continue;
    sizes.push(Math.max(image.width ?? 0, image.height ?? 0));
  }
  return sizes;
}

/**
 * Build the AssetReport from a parsed GLB buffer. Pure function — no I/O —
 * so it can be exercised directly from the test suite.
 *
 * `publicRoot` (optional): when supplied, absolute paths under it are
 * normalized to public-relative URLs (`/assets/skins/foo.glb`) so the
 * manifest is directly consumable by the runtime `Skin.modelUrl` schema.
 */
export function buildReport({ glbPath, glbBuffer, document, publicRoot = null }) {
  const errors = [];
  const sha256 = createHash("sha256").update(glbBuffer).digest("hex");
  const fileSizeKB = Math.round((glbBuffer.byteLength / 1024) * 100) / 100;

  const meshes = document.getRoot().listMeshes().length;
  const materials = document.getRoot().listMaterials().length;
  const textures = document.getRoot().listTextures().length;
  const textureSizes = listTextureResolutions(document);
  const textureResolution =
    textureSizes.length === 0 ? 0 : Math.max(...textureSizes);
  const animations = listAnimations(document);
  const skeleton = skeletonFromDocument(document);
  const boundingBox = computeBoundingBox(document);
  const triangleCount = countTriangles(document);
  const pbr = hasPbr(document);
  const nonFinite = hasNonFinite(document);

  if (meshes === 0) errors.push("No meshes found in GLB");
  if (triangleCount === 0) errors.push("Triangle count is zero");
  if (!boundingBox) errors.push("No POSITION accessors — cannot compute bounding box");
  if (materials < 1 || materials > 32)
    errors.push(`Material count ${materials} is outside the [1, 32] range`);
  if (nonFinite) errors.push("GLB contains NaN or Infinity values");

  const fileSizeBytes = glbBuffer.byteLength;
  if (fileSizeBytes >= 20 * 1024 * 1024) {
    errors.push(`File size ${fileSizeBytes} bytes exceeds 20 MB limit`);
  }

  if (boundingBox) {
    const [mn, mx] = [boundingBox.min, boundingBox.max];
    const extent = [
      Math.abs(mx[0] - mn[0]),
      Math.abs(mx[1] - mn[1]),
      Math.abs(mx[2] - mn[2]),
    ];
    const maxExtent = Math.max(...extent);
    const minExtent = Math.min(...extent);
    if (maxExtent > 100 || minExtent < 0.001) {
      errors.push(
        `Bounding box extent [${extent.map((v) => v.toFixed(3)).join(", ")}] outside [0.001, 100] range`,
      );
    }
  }

  // Sidecar metadata defaults — overridable by callers (CLI passes them in).
  const id = basename(glbPath, extname(glbPath));
  const baseDir = dirname(glbPath);
  const modelUrl = toPublicUrl(glbPath, publicRoot);
  const baseDirUrl = toPublicUrl(baseDir, publicRoot);
  const lod = {
    lod0: modelUrl,
    lod1: modelUrl,
    lod2: modelUrl,
  };

  const requiredLevels = {
    glbParseable: REQUIRED_LEVELS.REQUIRED,
    meshes: REQUIRED_LEVELS.REQUIRED,
    triangleCount: REQUIRED_LEVELS.REQUIRED,
    boundingBox: REQUIRED_LEVELS.REQUIRED,
    materials: REQUIRED_LEVELS.REQUIRED,
    textureEmbedded: REQUIRED_LEVELS.OPTIONAL,
    pbr: REQUIRED_LEVELS.RECOMMENDED,
    skeleton: REQUIRED_LEVELS.RECOMMENDED,
    animation: REQUIRED_LEVELS.RECOMMENDED,
    modelSize: REQUIRED_LEVELS.REQUIRED,
    nonFinite: REQUIRED_LEVELS.REQUIRED,
    fileSize: REQUIRED_LEVELS.REQUIRED,
  };

  const report = {
    valid: errors.length === 0,
    id,
    version: REPORT_VERSION,
    format: "glb",
    model: modelUrl,
    thumbnail: undefined,
    triangleCount,
    textureResolution,
    materials,
    textures,
    meshes,
    pbr,
    animations,
    skeleton,
    boundingBox,
    fileSizeKB,
    fileSizeBytes,
    lod,
    license: "project-internal",
    source: baseDirUrl,
    generatedAt: new Date().toISOString(),
    sha256,
    requiredLevels,
    errors: errors.length === 0 ? undefined : errors,
  };

  return report;
}

/**
 * CLI entry: read GLB, parse via @gltf-transform/core, write report.
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.glbPath) {
    console.error("Usage: node scripts/validate-skin-asset.mjs <glb-path> [--out <report-path>]");
    process.exit(1);
  }

  const glbPath = resolve(args.glbPath);
  const outPath = args.outPath
    ? resolve(args.outPath)
    : resolve(dirname(glbPath), `${basename(glbPath, extname(glbPath))}.asset-manifest.json`);

  // When the GLB lives under the project's public/ directory, normalize
  // paths in the report to public-relative URLs so they can be consumed
  // directly by `Skin.modelUrl` at runtime.
  const publicRoot = resolve(process.cwd(), "public");

  let glbBuffer;
  try {
    glbBuffer = readFileSync(glbPath);
  } catch (err) {
    console.error(`[validate-skin-asset] failed to read ${glbPath}: ${err.message}`);
    process.exit(2);
  }

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  let document;
  try {
    document = await io.readBinary(glbBuffer);
  } catch (err) {
    // Write a partial report so the caller can see the failure shape.
    const modelUrl = toPublicUrl(glbPath, publicRoot);
    const baseDirUrl = toPublicUrl(dirname(glbPath), publicRoot);
    const report = {
      valid: false,
      id: basename(glbPath, extname(glbPath)),
      version: REPORT_VERSION,
      format: "glb",
      model: modelUrl,
      triangleCount: 0,
      textureResolution: 0,
      materials: 0,
      textures: 0,
      meshes: 0,
      pbr: false,
      animations: [],
      skeleton: false,
      boundingBox: null,
      fileSizeKB: Math.round((glbBuffer.byteLength / 1024) * 100) / 100,
      fileSizeBytes: glbBuffer.byteLength,
      lod: {},
      license: "project-internal",
      source: baseDirUrl,
      generatedAt: new Date().toISOString(),
      sha256: createHash("sha256").update(glbBuffer).digest("hex"),
      requiredLevels: {},
      errors: [`GLB parse failed: ${err.message}`],
    };
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");
    console.error(`[validate-skin-asset] ${err.message} — partial report at ${outPath}`);
    process.exit(2);
  }

  const report = buildReport({ glbPath, glbBuffer, document, publicRoot });
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");

  console.log(
    `[validate-skin-asset] ${report.valid ? "OK" : "FAIL"}: ${glbPath} → ${outPath} (${report.errors?.length ?? 0} errors)`,
  );
  if (!report.valid) process.exit(2);
}

const isMainModule =
  typeof process !== "undefined" &&
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMainModule) {
  main().catch((err) => {
    console.error("[validate-skin-asset] unexpected failure:", err);
    process.exit(2);
  });
}
