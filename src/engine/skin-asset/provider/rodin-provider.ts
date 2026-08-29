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
 * RodinProvider — Hyper3D Rodin Image-to-3D stub. Same construction contract
 * as MeshyProvider: fails fast on missing key, method bodies deferred until
 * `RODIN_API_KEY` is provisioned (see PRD Deferred F2).
 *
 * Target API surface when implemented:
 *   POST https://api.hyper3d.com/rodin/v1/generate
 *   GET  https://api.hyper3d.com/rodin/v1/status/{task_id}
 */
export const RODIN_API_KEY = "RODIN_API_KEY";

export class RodinProvider implements SkinAssetGenerationProvider {
  readonly id = "rodin";
  readonly #apiKey: string;

  constructor(apiKey: string | undefined = readServerEnv(RODIN_API_KEY)) {
    if (!apiKey) {
      throw new MissingApiKeyError(RODIN_API_KEY);
    }
    this.#apiKey = apiKey;
    if (!this.#apiKey) {
      throw new ProviderNotConfiguredError("rodin");
    }
  }

  generateFromImage(_req: GenerateFromImageRequest): Promise<GeneratedAsset> {
    return Promise.reject(
      new Error("RodinProvider.generateFromImage: not implemented in P2"),
    );
  }

  generateFromPrompt(_req: GenerateFromPromptRequest): Promise<GeneratedAsset> {
    return Promise.reject(
      new Error("RodinProvider.generateFromPrompt: not implemented in P2"),
    );
  }

  getTaskStatus(_taskId: string): Promise<GenerationTask> {
    return Promise.reject(
      new Error("RodinProvider.getTaskStatus: not implemented in P2"),
    );
  }

  downloadAsset(_taskId: string): Promise<GeneratedAssetFiles> {
    return Promise.reject(
      new Error("RodinProvider.downloadAsset: not implemented in P2"),
    );
  }
}

function readServerEnv(name: string): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  const v = process.env[name];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}
