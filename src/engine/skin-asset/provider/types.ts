/**
 * Provider interface contract — mirrors `.trellis/tasks/08-29-skin-3d-pipeline`
 * design.md §4. Server-only: real cloud providers (Meshy / Rodin / Trellis)
 * must NEVER be constructed or invoked from browser bundles. The factory
 * guard `createProvider(kind)` enforces this at the call-site boundary.
 */

export type GenerateFromImageRequest = {
  /** Public asset path or https URL — `blob:` / `data:` are rejected. */
  imageUrl: string;
  modelType?: "standard" | "lowpoly";
  topology?: "quad" | "triangle";
  targetPolycount?: number;
  textureResolution?: 512 | 1024 | 2048;
  enablePbr?: boolean;
};

export type GenerateFromPromptRequest = {
  prompt: string;
  negativePrompt?: string;
  modelType?: "standard" | "lowpoly";
  topology?: "quad" | "triangle";
  targetPolycount?: number;
  textureResolution?: 512 | 1024 | 2048;
  enablePbr?: boolean;
};

export type GenerationStatus = "PENDING" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED";

export type GeneratedAsset = {
  taskId: string;
  status: GenerationStatus;
  modelUrls?: { glb?: string; fbx?: string; obj?: string; usdz?: string };
  thumbnailUrl?: string;
  /** Filled by validator after a real GLB read. Mock returns 0. */
  polycount?: number;
  createdAt: string;
  updatedAt: string;
  error?: string;
};

export type GenerationTask = {
  taskId: string;
  status: GenerationStatus;
  progress?: number;
  error?: string;
};

export type GeneratedAssetFiles = {
  glb: ArrayBuffer;
  thumbnail?: ArrayBuffer;
  meta: { polycount: number; textureResolution: number; license: string };
};

export class MissingApiKeyError extends Error {
  readonly key: string;
  constructor(key: string) {
    super(`Missing environment variable: ${key}`);
    this.name = "MissingApiKeyError";
    this.key = key;
  }
}

export class ProviderNotConfiguredError extends Error {
  readonly kind: ProviderKind;
  constructor(kind: ProviderKind) {
    super(`Provider "${kind}" is not configured for this environment`);
    this.name = "ProviderNotConfiguredError";
    this.kind = kind;
  }
}

/**
 * Skin asset generation Provider. All implementations must:
 * - Read API keys only from server-only env vars (never accept them in
 *   arguments or read from `localStorage` / cookies / browser globals).
 * - Surface network / parse errors as `error: string` on the returned
 *   `GeneratedAsset` rather than throwing — callers (`/api/skins/generate`)
 *   convert them into HTTP responses with status 502 / 504.
 * - Never embed real API keys in any log line or telemetry payload.
 */
export interface SkinAssetGenerationProvider {
  /** Stable identifier, e.g. `"mock"`, `"meshy"`, `"rodin"`, `"trellis"`. */
  readonly id: string;
  generateFromImage(req: GenerateFromImageRequest): Promise<GeneratedAsset>;
  generateFromPrompt(req: GenerateFromPromptRequest): Promise<GeneratedAsset>;
  getTaskStatus(taskId: string): Promise<GenerationTask>;
  downloadAsset(taskId: string): Promise<GeneratedAssetFiles>;
}

export type ProviderKind = "mock" | "meshy" | "rodin" | "trellis";

const ALLOWED_IMAGE_PREFIXES = ["https://", "http://", "/"] as const;

/**
 * Validate `imageUrl` against provider contract — rejects `blob:` and `data:`
 * URIs that would leak binary payloads into log/telemetry paths.
 */
export function assertValidImageUrl(imageUrl: string): void {
  if (typeof imageUrl !== "string" || !imageUrl) {
    throw new Error("imageUrl must be a non-empty string");
  }
  if (imageUrl.startsWith("blob:") || imageUrl.startsWith("data:")) {
    throw new Error("imageUrl must be a public URL — blob:/data: not allowed");
  }
  if (!ALLOWED_IMAGE_PREFIXES.some((p) => imageUrl.startsWith(p))) {
    throw new Error(
      `imageUrl must start with one of: ${ALLOWED_IMAGE_PREFIXES.join(", ")}`,
    );
  }
}
