#!/usr/bin/env node
/**
 * Fetch or copy a GLB (Hunyuan3D Space download / catbox / GitHub raw / local file)
 * into public/assets/skins/<id>/lod0.glb, repair missing PBR/normals, then run
 * validator + quality gate.
 *
 * Usage:
 *   node scripts/import-glb-url.mjs <https-url> <skin-id> [--role test|production]
 *   node scripts/import-glb-url.mjs --file <glb-path> <skin-id> [--role test|production]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
export const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

export function assertSafeImportUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("invalid url");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    throw new Error("only http(s) urls are allowed");
  }
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  ) {
    throw new Error("host not allowed");
  }
  if (
    /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)
  ) {
    throw new Error("private address not allowed");
  }
  if (host.includes(":") && (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80"))) {
    throw new Error("private address not allowed");
  }
  return u.href;
}

export function assertSafeSkinId(id) {
  if (typeof id !== "string" || !/^[a-z0-9][a-z0-9_-]{1,62}$/.test(id)) {
    throw new Error("invalid skin id");
  }
  return id;
}

function computeSmoothNormals(posArr, idxArr) {
  const n = new Float32Array(posArr.length);
  const triCount = idxArr ? idxArr.length / 3 : posArr.length / 9;
  const readIndex = idxArr ? (i) => idxArr[i] : (i) => i;
  for (let t = 0; t < triCount; t += 1) {
    const ia = readIndex(t * 3) * 3;
    const ib = readIndex(t * 3 + 1) * 3;
    const ic = readIndex(t * 3 + 2) * 3;
    const ax = posArr[ia];
    const ay = posArr[ia + 1];
    const az = posArr[ia + 2];
    const ux = posArr[ib] - ax;
    const uy = posArr[ib + 1] - ay;
    const uz = posArr[ib + 2] - az;
    const vx = posArr[ic] - ax;
    const vy = posArr[ic + 1] - ay;
    const vz = posArr[ic + 2] - az;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    n[ia] += nx;
    n[ia + 1] += ny;
    n[ia + 2] += nz;
    n[ib] += nx;
    n[ib + 1] += ny;
    n[ib + 2] += nz;
    n[ic] += nx;
    n[ic + 1] += ny;
    n[ic + 2] += nz;
  }
  for (let i = 0; i < n.length; i += 3) {
    const len = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
    n[i] /= len;
    n[i + 1] /= len;
    n[i + 2] /= len;
  }
  return n;
}

export async function repairGlb(glbPath, { targetHeight = 1 } = {}) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.read(glbPath);
  const root = doc.getRoot();
  const buffer = root.listBuffers()[0] ?? doc.createBuffer();

  let minY = Infinity;
  let maxY = -Infinity;
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION");
      if (!pos) continue;
      const arr = pos.getArray();
      for (let i = 1; i < arr.length; i += 3) {
        if (arr[i] < minY) minY = arr[i];
        if (arr[i] > maxY) maxY = arr[i];
      }
    }
  }
  const height = Number.isFinite(minY) && Number.isFinite(maxY) ? maxY - minY : 0;
  const scale = height > 0.001 ? targetHeight / height : 1;

  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION");
      if (pos && scale !== 1) {
        const arr = pos.getArray();
        const next = arr.constructor === Float32Array ? arr : new Float32Array(arr);
        for (let i = 0; i < next.length; i += 1) next[i] *= scale;
        pos.setArray(next);
      }
      if (!prim.getAttribute("NORMAL")) {
        const p = prim.getAttribute("POSITION");
        if (p) {
          const idx = prim.getIndices();
          const normals = computeSmoothNormals(
            p.getArray(),
            idx ? idx.getArray() : null,
          );
          const acc = doc
            .createAccessor("normal")
            .setType("VEC3")
            .setArray(normals)
            .setBuffer(buffer);
          prim.setAttribute("NORMAL", acc);
        }
      }
    }
  }

  if (root.listMaterials().length === 0) {
    const mat = doc
      .createMaterial("LabPBR")
      .setBaseColorFactor([0.98, 0.94, 0.86, 1])
      .setMetallicFactor(0.04)
      .setRoughnessFactor(0.48);
    for (const mesh of root.listMeshes()) {
      for (const prim of mesh.listPrimitives()) {
        if (!prim.getMaterial()) prim.setMaterial(mat);
      }
    }
  }

  await io.write(glbPath, doc);
}

async function fetchGlb(url) {
  const safe = assertSafeImportUrl(url);
  const res = await fetch(safe, {
    redirect: "follow",
    signal: AbortSignal.timeout(30000),
    headers: { accept: "model/gltf-binary,application/octet-stream,*/*" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_IMPORT_BYTES) throw new Error("file exceeds 20 MB");
  if (buf.length < 12 || buf.toString("ascii", 0, 4) !== "glTF") {
    throw new Error("response is not a GLB");
  }
  return buf;
}

function run(script, args) {
  const r = spawnSync("node", [resolve(root, script), ...args], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 2);
}

async function main(argv) {
  const fileFlag = argv.indexOf("--file");
  const roleFlag = argv.indexOf("--role");
  const role = roleFlag >= 0 ? argv[roleFlag + 1] : "test";
  const cleaned = argv.filter((_, i) => {
    if (i === fileFlag || (fileFlag >= 0 && i === fileFlag + 1)) return false;
    if (i === roleFlag || (roleFlag >= 0 && i === roleFlag + 1)) return false;
    return true;
  });

  let skinId;
  let buf;
  if (fileFlag >= 0) {
    const filePath = resolve(argv[fileFlag + 1] ?? "");
    skinId = assertSafeSkinId(cleaned[0]);
    buf = readFileSync(filePath);
    if (buf.length < 12 || buf.toString("ascii", 0, 4) !== "glTF") {
      throw new Error("file is not a GLB");
    }
    if (buf.length > MAX_IMPORT_BYTES) throw new Error("file exceeds 20 MB");
  } else {
    const url = cleaned[0];
    skinId = assertSafeSkinId(cleaned[1]);
    if (!url || !skinId) {
      console.error("Usage: node scripts/import-glb-url.mjs <https-url> <skin-id> [--role test|production]");
      console.error("       node scripts/import-glb-url.mjs --file <glb-path> <skin-id> [--role test|production]");
      process.exit(1);
    }
    buf = await fetchGlb(url);
  }

  const dir = resolve(root, "public/assets/skins", skinId);
  const glbPath = resolve(dir, "lod0.glb");
  mkdirSync(dir, { recursive: true });
  writeFileSync(glbPath, buf);
  console.log(`[import-glb-url] wrote ${glbPath} (${buf.length} bytes)`);
  await repairGlb(glbPath);
  console.log("[import-glb-url] repaired PBR/normals/height");
  run("scripts/validate-skin-asset.mjs", [glbPath]);
  run("scripts/quality-gate.mjs", [
    resolve(dir, "lod0.asset-manifest.json"),
    "--role",
    role,
    "--out",
    resolve(dir, "lod0.quality-gate-report.json"),
  ]);
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isCli) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(`[import-glb-url] ${err instanceof Error ? err.message : err}`);
    process.exit(2);
  });
}
