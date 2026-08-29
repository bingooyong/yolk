import {
  MissingApiKeyError,
  ProviderNotConfiguredError,
  type GeneratedAsset,
  type GeneratedAssetFiles,
  type GenerationTask,
  type GenerateFromImageRequest,
  type GenerateFromPromptRequest,
  type SkinAssetGenerationProvider,
} from "./types.ts";

/**
 * MeshyProvider — interface stub only. The full Meshy Image-to-3D API
 * integration is deferred until a real `MESHY_API_KEY` is provisioned (see
 * `.trellis/tasks/08-29-skin-3d-pipeline/prd.md` Deferred F1).
 *
 * This task (P2) only establishes:
 *   1. Construction fails fast when the API key is missing.
 *   2. Method signatures exist so the factory and route layer can wire up.
 *   3. No outbound HTTP traffic happens in this phase.
 *
 * When the key becomes available, the implementation should hit:
 *   POST https://api.meshy.ai/openapi/v2/image-to-3d
 *   GET  https://api.meshy.ai/openapi/v2/image-to-3d/{task_id}
 * and stream the resulting GLB to `GeneratedAsset.modelUrls.glb`.
 */
export const MESHY_API_KEY = "MESHY_API_KEY";

export class MeshyProvider implements SkinAssetGenerationProvider {
  readonly id = "meshy";
  readonly #apiKey: string;

  constructor(apiKey: string | undefined = readServerEnv(MESHY_API_KEY)) {
    if (!apiKey) {
      // Server boundary: the factory is the only caller and runs in Nitro
      // server context. We surface the missing key to the route so it can
      // return a clear 503 instead of a generic 500.
      throw new MissingApiKeyError(MESHY_API_KEY);
    }
    this.#apiKey = apiKey;
    if (!this.#apiKey) {
      throw new ProviderNotConfiguredError("meshy");
    }
  }

  generateFromImage(_req: GenerateFromImageRequest): Promise<GeneratedAsset> {
    return Promise.reject(
      new Error("MeshyProvider.generateFromImage: not implemented in P2"),
    );
  }

  generateFromPrompt(_req: GenerateFromPromptRequest): Promise<GeneratedAsset> {
    return Promise.reject(
      new Error("MeshyProvider.generateFromPrompt: not implemented in P2"),
    );
  }

  getTaskStatus(_taskId: string): Promise<GenerationTask> {
    return Promise.reject(
      new Error("MeshyProvider.getTaskStatus: not implemented in P2"),
    );
  }

  downloadAsset(_taskId: string): Promise<GeneratedAssetFiles> {
    return Promise.reject(
      new Error("MeshyProvider.downloadAsset: not implemented in P2"),
    );
  }
}

/**
 * Read a server-only env var. Vite exposes `process.env` to both server and
 * client bundles by default, but Nitro's `server/middleware/*` runs in
 * Node — and only those entrypoints should ever instantiate MeshyProvider.
 * We re-check the key on read so a stale import does not silently leak it.
 */
function readServerEnv(name: string): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  const v = process.env[name];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}
