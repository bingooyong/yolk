#!/usr/bin/env node
/**
 * Asset Quality Gate — apply business-level thresholds to a Validator report.
 *
 * The Quality Gate is the seam between "what the GLB contains" (Validator)
 * and "what we are willing to ship" (this script). Thresholds depend on the
 * Skin's `assetRole`:
 *
 *   test        — only Required failures reject. Warnings are tolerated.
 *   production  — Required AND Recommended failures reject. Optional misses
 *                  still produce warnings for the operator dashboard.
 *
 * Per design.md §C threshold table:
 *
 *   | Check                | test        | production  | failure action   |
 *   | -------------------- | ----------- | ----------- | ---------------- |
 *   | GLB parseable        | Required    | Required    | reject           |
 *   | Mesh > 0             | Required    | Required    | reject           |
 *   | Triangle count > 0   | Required    | Required    | reject           |
 *   | Bounding box valid   | Required    | Required    | reject           |
 *   | Material count 1-32  | Required    | Required    | reject           |
 *   | Texture embedded     | Optional    | Recommended | warning          |
 *   | PBR                  | Optional    | Required    | reject (prod)    |
 *   | Skeleton declared    | Optional    | Recommended | warning          |
 *   | Animation status     | Optional    | Recommended | warning          |
 *   | Model size [0.001, 100] | Required | Required    | reject           |
 *   | NaN / Infinity       | Required    | Required    | reject           |
 *   | File size < 20 MB    | Required    | Required    | reject           |
 *
 * Usage:
 *   node scripts/quality-gate.mjs <report-path> --role test|production
 *
 * Exit codes:
 *   0  — gate passed (warnings allowed)
 *   1  — usage error
 *   2  — gate failed (errors present)
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";

export const ROLES = ["test", "production"];

function parseArgs(argv) {
  const args = { reportPath: null, role: "test", outPath: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--role") {
      args.role = argv[i + 1];
      i += 1;
    } else if (a === "--out") {
      args.outPath = argv[i + 1];
      i += 1;
    } else if (!args.reportPath) {
      args.reportPath = a;
    }
  }
  return args;
}

/**
 * For each check, decide whether the failure is an `error` (reject) or
 * `warning` (allow with operator flag) based on the active role.
 *
 * Returns `{ errors: string[], warnings: string[], checks: [...] }`.
 * `checks` is a per-rule trace for the Preview-page "asset info" panel.
 */
export function gradeReport(report, role) {
  const errors = [];
  const warnings = [];
  const checks = [];

  function record(level, name, message) {
    checks.push({ name, level, role, message });
    if (level === "error") errors.push(message);
    else warnings.push(message);
  }

  function requiredFor(checkName) {
    // Per design.md §C threshold table:
    //   test role        — texture / pbr / skeleton / animation are Optional
    //   production role  — pbr is Required, the others are Recommended
    if (role === "test") {
      if (
        checkName === "textureEmbedded" ||
        checkName === "pbr" ||
        checkName === "skeleton" ||
        checkName === "animation"
      ) {
        return "Optional";
      }
      return "Required";
    }
    if (role === "production") {
      if (checkName === "pbr") return "Required";
      if (
        checkName === "textureEmbedded" ||
        checkName === "skeleton" ||
        checkName === "animation"
      ) {
        return "Recommended";
      }
    }
    return "Required";
  }

  // 1. Validator-level failures: any report.errors[] entries are Required
  //    failures (parseable, mesh, triangle, bounding box, materials, etc).
  if (Array.isArray(report.errors) && report.errors.length > 0) {
    for (const e of report.errors) {
      record("error", "validator", e);
    }
  }

  if (report.valid === false && errors.length === 0) {
    record("error", "validator", "Report.valid is false");
  }

  // 2. PBR — Required for production, Optional for test.
  if (!report.pbr) {
    const lvl = requiredFor("pbr");
    if (lvl === "Required") record("error", "pbr", "PBR material missing");
    else if (lvl === "Recommended") record("warning", "pbr", "PBR recommended for production");
    // Optional → no message
  }

  // 3. Texture — Recommended for production, Optional for test.
  if (!report.textures || report.textures === 0) {
    const lvl = requiredFor("textureEmbedded");
    if (lvl === "Required") record("error", "textureEmbedded", "Texture required");
    else if (lvl === "Recommended")
      record("warning", "textureEmbedded", "Texture recommended for production");
  }

  // 4. Skeleton — Recommended for production, Optional for test.
  if (!report.skeleton || report.skeleton === false) {
    const lvl = requiredFor("skeleton");
    if (lvl === "Required") record("error", "skeleton", "Skeleton required");
    else if (lvl === "Recommended")
      record("warning", "skeleton", "Skeleton recommended for production");
  }

  // 5. Animation — Recommended for production, Optional for test.
  if (!report.animations || report.animations.length === 0) {
    const lvl = requiredFor("animation");
    if (lvl === "Required") record("error", "animation", "Animation required");
    else if (lvl === "Recommended")
      record("warning", "animation", "Animation recommended for production");
  }

  // 6. File size — explicit guard (Validator already errors at >= 20MB,
  //    but gate reviewers should see a clear message even when the
  //    Validator's Required flag was somehow bypassed).
  if (report.fileSizeBytes >= 20 * 1024 * 1024) {
    record("error", "fileSize", `File size ${report.fileSizeKB} KB exceeds 20 MB limit`);
  }

  return {
    valid: errors.length === 0,
    role,
    errors,
    warnings,
    checks,
  };
}

/**
 * Resolve the output path next to the input report unless `--out` given.
 */
function resolveOutPath(reportPath, outPath) {
  if (outPath) return resolve(outPath);
  const dir = dirname(reportPath);
  const base = basename(reportPath, extname(reportPath));
  return resolve(dir, `${base}.quality-gate-report.json`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.reportPath) {
    console.error(
      "Usage: node scripts/quality-gate.mjs <report-path> --role test|production [--out <out-path>]",
    );
    process.exit(1);
  }
  if (!ROLES.includes(args.role)) {
    console.error(`[quality-gate] invalid role "${args.role}". Allowed: ${ROLES.join(", ")}`);
    process.exit(1);
  }

  const reportPath = resolve(args.reportPath);
  let report;
  try {
    const raw = readFileSync(reportPath, "utf8");
    report = JSON.parse(raw);
  } catch (err) {
    console.error(`[quality-gate] failed to read report ${reportPath}: ${err.message}`);
    process.exit(1);
  }

  const result = gradeReport(report, args.role);
  const outPath = resolveOutPath(reportPath, args.outPath);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify({ ...result, reportPath }, null, 2) + "\n");

  console.log(
    `[quality-gate] ${result.valid ? "PASS" : "FAIL"} (role=${args.role}): ${reportPath} → ${outPath}`,
  );
  console.log(
    `[quality-gate]   ${result.errors.length} errors, ${result.warnings.length} warnings`,
  );
  if (!result.valid) process.exit(2);
}

const isMainModule =
  typeof process !== "undefined" &&
  process.argv[1] &&
  import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch((err) => {
    console.error("[quality-gate] unexpected failure:", err);
    process.exit(2);
  });
}
