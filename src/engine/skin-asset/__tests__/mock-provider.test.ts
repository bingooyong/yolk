import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createMockProvider } from "../provider/mock-provider.ts";
import type { GenerateFromImageRequest, GenerateFromPromptRequest } from "../provider/types.ts";

describe("MockProvider", () => {
  test("id is 'mock'", () => {
    const p = createMockProvider();
    assert.equal(p.id, "mock");
  });

  describe("generateFromImage", () => {
    test("returns SUCCEEDED task pointing at the demo GLB", async () => {
      const p = createMockProvider();
      const req: GenerateFromImageRequest = {
        imageUrl: "/assets/concept/bear-explorer.png",
        modelType: "standard",
        topology: "triangle",
        textureResolution: 1024,
        enablePbr: true,
      };

      const res = await p.generateFromImage(req);
      assert.equal(res.taskId, "mock-demo");
      assert.equal(res.status, "SUCCEEDED");
      assert.equal(res.modelUrls?.glb, "/assets/skins/_demo/egg-exported.glb");
      assert.equal(res.thumbnailUrl, "/assets/skins/_demo/egg-exported.webp");
      assert.equal(res.polycount, 0); // validator overwrites after real GLB read
      assert.ok(res.createdAt && res.updatedAt, "timestamps must be populated");
      assert.equal(
        new Date(res.createdAt).toISOString(),
        res.createdAt,
        "createdAt must be a valid ISO timestamp",
      );
    });

    test("accepts https URLs", async () => {
      const p = createMockProvider();
      const res = await p.generateFromImage({
        imageUrl: "https://example.com/sketch.png",
      });
      assert.equal(res.status, "SUCCEEDED");
    });

    test("rejects blob: URLs", async () => {
      const p = createMockProvider();
      await assert.rejects(
        () => p.generateFromImage({ imageUrl: "blob:http://x/y" }),
        /blob:.*not allowed/,
      );
    });

    test("rejects data: URLs", async () => {
      const p = createMockProvider();
      await assert.rejects(
        () => p.generateFromImage({ imageUrl: "data:image/png;base64,AAAA" }),
        /blob:.*not allowed/,
      );
    });

    test("rejects empty imageUrl", async () => {
      const p = createMockProvider();
      await assert.rejects(
        () => p.generateFromImage({ imageUrl: "" }),
        /non-empty string/,
      );
    });

    test("rejects imageUrl with unsupported scheme", async () => {
      const p = createMockProvider();
      await assert.rejects(
        () => p.generateFromImage({ imageUrl: "ftp://example.com/x.png" }),
        /must start with one of/,
      );
    });
  });

  describe("generateFromPrompt", () => {
    test("returns SUCCEEDED task for a non-empty prompt", async () => {
      const p = createMockProvider();
      const req: GenerateFromPromptRequest = {
        prompt: "cute bear explorer with backpack",
        negativePrompt: "no humans, no weapons",
      };
      const res = await p.generateFromPrompt(req);
      assert.equal(res.taskId, "mock-demo");
      assert.equal(res.status, "SUCCEEDED");
      assert.equal(res.modelUrls?.glb, "/assets/skins/_demo/egg-exported.glb");
    });

    test("rejects empty prompt", async () => {
      const p = createMockProvider();
      await assert.rejects(
        () => p.generateFromPrompt({ prompt: "   " }),
        /non-empty prompt/,
      );
    });

    test("rejects missing prompt", async () => {
      const p = createMockProvider();
      await assert.rejects(
        // @ts-expect-error -- intentional runtime guard
        () => p.generateFromPrompt({}),
        /non-empty prompt/,
      );
    });
  });

  describe("getTaskStatus", () => {
    test("returns SUCCEEDED for the canonical mock-demo taskId", async () => {
      const p = createMockProvider();
      const status = await p.getTaskStatus("mock-demo");
      assert.equal(status.taskId, "mock-demo");
      assert.equal(status.status, "SUCCEEDED");
    });

    test("rejects unknown taskId", async () => {
      const p = createMockProvider();
      await assert.rejects(
        () => p.getTaskStatus("not-a-real-task"),
        /unknown taskId/,
      );
    });
  });

  describe("downloadAsset", () => {
    test("always rejects — callers must fetch the GLB URL directly", async () => {
      const p = createMockProvider();
      await assert.rejects(
        () => p.downloadAsset("mock-demo"),
        /does not serve GLB binaries/,
      );
    });
  });
});
