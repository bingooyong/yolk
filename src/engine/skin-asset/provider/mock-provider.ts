import {
  type GeneratedAsset,
  type GeneratedAssetFiles,
  type GenerationTask,
  type GenerateFromImageRequest,
  type GenerateFromPromptRequest,
  type SkinAssetGenerationProvider,
  assertValidImageUrl,
} from "./types.ts";

/**
 * MockProvider — synchronous, no network. Returns a virtual `GeneratedAsset`
 * pointing at the demo GLB shipped under `public/assets/skins/_demo/`.
 *
 * Intended use: local development, CI, integration tests for SkinAssetLoader
 * and Quality Gate without burning real API credits. The `polycount` field
 * is left at 0 — the Asset Validator overwrites it after a real GLB read.
 *
 * NOT a fake production asset — the demo GLB is marked `assetRole: "test"`
 * and must not be rolled out to players (see Quality Gate §C).
 */
const DEMO_GLB_URL = "/assets/skins/_demo/egg-exported.glb";
const DEMO_THUMBNAIL_URL = "/assets/skins/_demo/egg-exported.webp";
const MOCK_TASK_ID = "mock-demo";

export function createMockProvider(): SkinAssetGenerationProvider {
  return {
    id: "mock",

    async generateFromImage(req: GenerateFromImageRequest): Promise<GeneratedAsset> {
      assertValidImageUrl(req.imageUrl);
      const now = new Date().toISOString();
      return {
        taskId: MOCK_TASK_ID,
        status: "SUCCEEDED",
        modelUrls: { glb: DEMO_GLB_URL },
        thumbnailUrl: DEMO_THUMBNAIL_URL,
        polycount: 0,
        createdAt: now,
        updatedAt: now,
      };
    },

    async generateFromPrompt(req: GenerateFromPromptRequest): Promise<GeneratedAsset> {
      if (!req.prompt || typeof req.prompt !== "string" || !req.prompt.trim()) {
        throw new Error("generateFromPrompt requires a non-empty prompt");
      }
      const now = new Date().toISOString();
      return {
        taskId: MOCK_TASK_ID,
        status: "SUCCEEDED",
        modelUrls: { glb: DEMO_GLB_URL },
        thumbnailUrl: DEMO_THUMBNAIL_URL,
        polycount: 0,
        createdAt: now,
        updatedAt: now,
      };
    },

    async getTaskStatus(taskId: string): Promise<GenerationTask> {
      if (taskId === MOCK_TASK_ID) {
        return { taskId, status: "SUCCEEDED" };
      }
      throw new Error(`MockProvider: unknown taskId "${taskId}"`);
    },

    async downloadAsset(_taskId: string): Promise<GeneratedAssetFiles> {
      // Mock doesn't simulate binary download. Real callers should fetch the
      // URL from `GeneratedAsset.modelUrls.glb` via HTTP — see
      // `src/routes/api/skins/download/+server.ts` for the server-side helper.
      throw new Error(
        "MockProvider does not serve GLB binaries — fetch modelUrls.glb via HTTP",
      );
    },
  };
}
