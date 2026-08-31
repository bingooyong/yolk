import { createFileRoute } from "@tanstack/react-router";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const SKIN_ID = "lab_user_import";

function assertSafeUrl(raw: string): string {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("链接无效");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    throw new Error("只接受 http(s) 公开链接");
  }
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)
  ) {
    throw new Error("不能导入内网地址");
  }
  return u.href;
}

function runImport(url: string): Promise<{ code: number; output: string }> {
  return new Promise((resolveP) => {
    const child = spawn(
      "node",
      [resolve(process.cwd(), "scripts/import-glb-url.mjs"), url, SKIN_ID, "--role", "test"],
      { cwd: process.cwd() },
    );
    let output = "";
    child.stdout.on("data", (d: Buffer) => {
      output += d.toString();
    });
    child.stderr.on("data", (d: Buffer) => {
      output += d.toString();
    });
    const t = setTimeout(() => {
      child.kill("SIGKILL");
    }, 45000);
    child.on("close", (code) => {
      clearTimeout(t);
      resolveP({ code: code ?? 2, output });
    });
  });
}

export const Route = createFileRoute("/api/skins/import-url")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ ok: false, error: "请贴公开 GLB 链接" }, { status: 400 });
        }
        const url = typeof body === "object" && body && "url" in body ? String((body as { url: unknown }).url).trim() : "";
        if (!url) {
          return Response.json({ ok: false, error: "请贴公开 GLB 链接" }, { status: 400 });
        }
        try {
          assertSafeUrl(url);
        } catch (err) {
          return Response.json(
            { ok: false, error: err instanceof Error ? err.message : "链接无效" },
            { status: 400 },
          );
        }
        try {
          const result = await runImport(url);
          if (result.code !== 0) {
            const hint = result.output.split("\n").filter(Boolean).at(-1) ?? "导入失败";
            return Response.json({ ok: false, error: hint.slice(0, 240) }, { status: 422 });
          }
          return Response.json({
            ok: true,
            skinId: SKIN_ID,
            modelUrl: `/assets/skins/${SKIN_ID}/lod0.glb`,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "导入失败";
          const previewOnly = /erofs|read-only|ENOENT|spawn/i.test(message);
          return Response.json(
            {
              ok: false,
              error: previewOnly ? "导入只在预览里可用，部署后请把 GLB 发给我替换" : message,
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
