#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { checkedOutputPath, checkedUrl } from "./browser-guard.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const args = parseArgs(process.argv.slice(2));
const url = checkedUrl(args.url);
const outputDir = checkedOutputPath(args.outDir, [projectRoot], "output directory");
const timeoutMs = Number(process.env.VISUAL_SMOKE_TIMEOUT_MS || 60_000);
const viewports = [
  {
    name: "desktop",
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
  {
    name: "mobile",
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
];

const savedPlayer = {
  bestTime: 42.5,
  wins: 3,
  coins: 80,
  playerName: "Saved Yolk",
  gamesPlayed: 7,
  xp: 99,
  gfx: "medium",
  levelId: "meadow",
};

mkdirSync(outputDir, { recursive: true });
let browser = null;
const results = {};

try {
  browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  for (const viewport of viewports) {
    const errors = { consoleErrors: [], pageErrors: [] };
    const { name: _name, width, height, ...capabilities } = viewport;
    const context = await browser.newContext({
      ...capabilities,
      viewport: { width, height },
      colorScheme: "dark",
      locale: "zh-CN",
      timezoneId: "Asia/Shanghai",
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") errors.consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => errors.pageErrors.push(String(error?.message || error)));
    await page.addInitScript(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), {
      key: "yolk-rush-v4",
      save: savedPlayer,
    });

    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    await page.getByRole("button", { name: "Play" }).waitFor({ timeout: timeoutMs });
    // Reload with the same seeded save so the check covers actual SSR hydration,
    // not merely a first visit before persistence exists.
    await page.reload({ waitUntil: "domcontentloaded", timeout: timeoutMs });
    await page.getByRole("button", { name: "Play" }).waitFor({ timeout: timeoutMs });
    await page.waitForFunction(
      () => document.body.innerText.includes("Saved Yolk · LV.1 · 币 80"),
      undefined,
      { timeout: timeoutMs },
    );
    await page.locator("canvas:not([aria-hidden])").first().waitFor({ timeout: timeoutMs });
    // The boot fallback is a 300×150 placeholder. Wait for the lazy R3F canvas
    // to resize to the real viewport before treating the title state as ready.
    await page.waitForFunction(
      (expected) =>
        Array.from(document.querySelectorAll("canvas:not([aria-hidden])")).some(
          (canvas) =>
            canvas.clientWidth === expected.width &&
            canvas.clientHeight === expected.height &&
            canvas.width > 500,
        ),
      { width: viewport.width, height: viewport.height },
      { timeout: timeoutMs },
    );
    const titleCanvas = await canvasEvidence(page);
    await page.screenshot({
      path: join(outputDir, `${viewport.name}-title.png`),
      fullPage: false,
    });

    await page.getByRole("button", { name: "Play" }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await page.getByRole("button", { name: "Pause" }).waitFor({ timeout: timeoutMs });
    await page.waitForTimeout(500);
    const raceCanvas = await canvasEvidence(page);
    await page.screenshot({
      path: join(outputDir, `${viewport.name}-race.png`),
      fullPage: false,
    });
    const horizontalOverflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth > root.clientWidth + 1;
    });
    const title = await page.title();

    results[viewport.name] = {
      viewport,
      status: response?.status() ?? 0,
      title,
      savedPlayerVisible: true,
      titleCanvas,
      raceCanvas,
      horizontalOverflow,
      consoleErrors: errors.consoleErrors,
      pageErrors: errors.pageErrors,
      screenshots: {
        title: join(outputDir, `${viewport.name}-title.png`),
        race: join(outputDir, `${viewport.name}-race.png`),
      },
    };
    await context.close();
  }

  const verdict = {
    ok: exitCode(results) === 0,
    url,
    outputDir,
    results,
  };
  writeFileSync(join(outputDir, "verdict.json"), JSON.stringify(verdict, null, 2));
  console.log(JSON.stringify(verdict, null, 2));
  process.exitCode = exitCode(results);
} catch (error) {
  const failure = {
    ok: false,
    url,
    outputDir,
    error: String(error?.message || error),
    results,
  };
  try {
    writeFileSync(join(outputDir, "verdict.json"), JSON.stringify(failure, null, 2));
  } catch {
    // Keep the original browser/QA failure as the reported error.
  }
  console.error(JSON.stringify(failure, null, 2));
  process.exitCode = 1;
} finally {
  await browser?.close();
}

function parseArgs(argv) {
  const values = { url: process.env.VISUAL_SMOKE_URL || "http://127.0.0.1:8080/" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--url") values.url = requireValue(argv, ++index, arg);
    else if (arg.startsWith("--url=")) values.url = arg.slice("--url=".length);
    else if (arg === "--out") values.outDir = requireValue(argv, ++index, arg);
    else if (arg.startsWith("--out=")) values.outDir = arg.slice("--out=".length);
    else if (!arg.startsWith("--")) values.url ??= arg;
    else throw new Error(`unknown flag: ${arg}`);
  }
  values.outDir ??= resolve(projectRoot, "output/visual-smoke");
  return values;
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

async function canvasEvidence(page) {
  return page.locator("canvas:not([aria-hidden])").evaluateAll((elements) =>
    elements.map((element) => {
      const canvas = element;
      return {
        width: canvas.width,
        height: canvas.height,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight,
      };
    }),
  );
}

function exitCode(results) {
  for (const result of Object.values(results)) {
    if ((result.status ?? 0) >= 400 || (result.status ?? 0) === 0) return 1;
    if (result.consoleErrors.length > 0 || result.pageErrors.length > 0) return 2;
    if (result.horizontalOverflow) return 3;
    if (result.titleCanvas.length === 0 || result.raceCanvas.length === 0) return 4;
    const hasRenderCanvas = (canvases) =>
      canvases.some(
        (canvas) =>
          canvas.width > 500 &&
          canvas.clientWidth === result.viewport.width &&
          canvas.clientHeight === result.viewport.height,
      );
    if (!hasRenderCanvas(result.titleCanvas) || !hasRenderCanvas(result.raceCanvas)) return 5;
    if (
      [...result.titleCanvas, ...result.raceCanvas].some(
        (canvas) => canvas.width === 0 || canvas.height === 0,
      )
    ) {
      return 4;
    }
  }
  return 0;
}
