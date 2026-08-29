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
 * TrellisProvider — internal Trellis2 Image-to-3D stub. Mirrors the
 * MeshyProvider/RodinProvider construction contract. Real implementation is
 * blocked on `TRELLIS_API_KEY` provisioning (see PRD Deferred F3).
 *
 * When implemented, expected surface:
 *   POST https://api.trellis.example/v2/image-to-3d
 *   GET  https://api.trellis.example/v2/tasks/{task_id}
 */
export const TRELLIS_API_KEY = "TRELLIS_API_KEY";

export class TrellisProvider implements SkinAssetGenerationProvider {
  readonly id = "trellis";
  readonly #apiKey: string;

  constructor(apiKey: string | undefined = readServerEnv(TRELLIS_API_KEY)) {
    if (!apiKey) {
      throw new MissingApiKeyError(TRELLIS_API_KEY);
    }
    this.#apiKey = apiKey;
    if (!this.#apiKey) {
      throw new ProviderNotConfiguredError("trellis");
    }
  }

  generateFromImage(_req: GenerateFromImageRequest): Promise<GeneratedAsset> {
    return Promise.reject(
      new Error("TrellisProvider.generateFromImage: not implemented in P2"),
    );
  }

  generateFromPrompt(_req: GenerateFromPromptRequest): Promise<GeneratedAsset> {
    return Promise.reject(
      new Error("TrellisProvider.generateFromPrompt: not implemented in P2"),
    );
  }

  getTaskStatus(_taskId: string): Promise<GenerationTask> {
    return Promise.reject(
      new Error("TrellisProvider.getTaskStatus: not implemented in P2"),
    );
  }

  downloadAsset(_taskId: string): Promise<GeneratedAssetFiles> {
    return Promise.reject(
      new Error("TrellisProvider.downloadAsset: not implemented in P2"),
    );
  }
}

function readServerEnv(name: string): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  const v = process.env[name];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}
