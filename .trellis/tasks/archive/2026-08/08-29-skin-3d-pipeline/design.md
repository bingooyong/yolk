# Design — Skin 3D Asset Pipeline

## Architecture Overview

新增四条主要路径，全部围绕 **"Provider 接口 + GLB Runtime + 现有 Skin System 兼容"** 这个核心：

```
┌────────────────────────────────────────────────────────────────┐
│  React UI (Hub / Gameplay / Gacha / Preview)                   │
│                                                                │
│   ┌──────────────────────────────────────┐                     │
│   │  CharacterVisual.tsx                 │  按 Skin.kind 分派   │
│   │   ├─ procedural → EggMesh (现有)     │                     │
│   │   └─ model      → <primitive> GLB    │                     │
│   └──────────────────────────────────────┘                     │
│              │                                                  │
│              ↓                                                  │
│   ┌──────────────────────────────────────┐                     │
│   │  SkinAssetLoader (src/engine/)       │  load/cache/dispose │
│   │   - load(skinId, lod) → THREE.Group  │                     │
│   │   - preload(skinId)                  │                     │
│   │   - fallback(skinId) → EggMesh clone │                     │
│   └──────────────────────────────────────┘                     │
│              │                                                  │
│              ↓                                                  │
│   ┌──────────────────────────────────────┐                     │
│   │  SkinRegistry (src/game/skins.ts 扩) │  getSkin(id)        │
│   │   - 12 procedural (不变)             │                     │
│   │   - + Demo Model (kind=model)        │                     │
│   └──────────────────────────────────────┘                     │
└────────────────────────────────────────────────────────────────┘

                ↑                                  ↑
        public/assets/skins/_demo/           provider 抽象层
        (GLB + manifest + report)             (server-side)
                                               │
                  ┌────────────────────────────┴──┐
                  │                                │
         MockProvider (本任务)           Meshy/Rodin/Trellis
         - 返回本地 demo GLB            - 仅接口 + HTTP client 骨架
         - 无网络                       - 无 Key 时显式抛错
                                        - 第 3 阶段任务实现 server route
```

## Module Boundaries

| 模块 | 路径 | 职责 | 依赖 |
|---|---|---|---|
| **Skin 类型扩展** | `src/game/skins.ts` | 扩 `Skin` 类型 + 12 个现有 Skin 标 `procedural` + 新增 Demo Model | 无 |
| **持久化兼容** | `src/game/store.ts` + `src/game/store-hydration.test.ts` | `SAVE_KEY` 升 `v5` + 解析时兼容 `v4` 存档 | `zod`（可选） |
| **Provider 接口** | `src/engine/skin-asset/provider/types.ts` | `SkinAssetGenerationProvider` 接口 + Request / Response 类型 | 无 |
| **Provider 实现** | `src/engine/skin-asset/provider/{mock,meshy,rodin,trellis}-provider.ts` | 四个 Provider 类 | `types.ts` |
| **Provider 工厂** | `src/engine/skin-asset/provider/factory.ts` | 工厂函数 `createProvider(config): Provider`；根据环境变量 + Skin metadata 选择 | `types.ts` |
| **Asset Loader** | `src/engine/skin-asset/loader.ts` | `load` / `preload` / `cache` / `dispose` / `fallback`；使用 `three/examples/jsm/loaders/GLTFLoader` | `three`, `types.ts` |
| **Asset Validator** | `scripts/validate-skin-asset.mjs` + `scripts/validate-skin-asset.test.mjs` | `node --test` 单元；解析 GLB 写 `asset-report.json`（每个字段标注 `requiredLevel`） | `@gltf-transform/core`（提案依赖） |
| **Asset Quality Gate** | `scripts/quality-gate.mjs` + `scripts/quality-gate.test.mjs` | 读 `asset-report.json` → 按 `role: test \| production` 选择阈值 → 写 `quality-gate-report.json` | `validate-skin-asset.mjs` |
| **Character Visual** | `src/components/CharacterVisual.tsx` | 按 `Skin.kind` 分派；model 路径用 `presentationProfile` 应用 transform；**不修改** Gameplay 参数 | `loader.ts`, `quality-gate-report.json`, `character-presentation.ts`（复用） |
| **导出 Demo GLB** | `scripts/export-demo-glb.mjs` | Node 不可直接跑 GLTFExporter → 通过 Vite dev 隐藏页面 + Playwright 触发 → binary 落 `public/assets/skins/_demo/egg-exported.glb` | `playwright`（已有） |
| **Preview 页面** | `src/components/DeveloperSkinPreview.tsx` | dev-only `/dev/skin-preview?skin=<id>` | `loader.ts`, `CharacterVisual` |
| **Preview 路由** | `src/routes/dev/skin-preview.tsx`（TanStack Start 路由） | 仅 dev mode 渲染；生产 build tree-shake 掉 |  |
| **第三方资产清单** | `docs/skins/third-party-assets.md` | 列出 demo GLB 来源 / 许可证 / 校验和 |  |
| **Asset Contract** | `docs/skins/character-asset-contract.md` | GLB 规格 / Manifest schema / 禁止项 |  |
| **Pipeline 文档** | `docs/skins/asset-pipeline.md` | Provider 架构 / Server Boundary / Mock → 真实切换 |  |
| **生成指南** | `docs/skins/skin-generation.md` | Grok prompt 模板 + Meshy/Rodin 用法 + create-skin Skill 用法 |  |
| **Trellis Spec** | `.trellis/spec/frontend/skin-system.md` | 稳定工程规则（仅稳定部分） |  |
| **Skill** | `.agents/skills/create-skin/SKILL.md` | 8 步自动化流程 |  |
| **资产简报** | `.trellis/tasks/08-29-skin-3d-pipeline/concept-art/bear-explorer-brief.md` | 小熊探险家概念图 → AI 3D 输入包（已写完） |  |

## Data Flow

### A. SkinRegistry 查询路径（每次 render）

```
getSkin(id)
  → 返回 Skin（kind, modelUrl, presentationProfile, ...）
  → CharacterVisual 接收
  → kind === 'procedural' → <EggMesh /> (现有路径，零变化)
  → kind === 'model'      → <SkinAssetLoader skinId={id} />
       ↓
       loader.load(id, lod)
         ↓ cache hit → 直接返回 THREE.Group
         ↓ cache miss
            ↓ fetch(<modelUrl>)
            ↓ GLTFLoader.parse(buffer)
            ↓ cache.set(id, scene.clone())
            ↓ return scene
       ↓
       <primitive object={scene} scale={presentationProfile.scale} ... />
       ↓
       每帧应用 getCharacterPose(presentation, t) 的 transform
```

### B. Provider 抽象层（本任务仅 Mock 真实可调用）

```
Provider 工厂调用:
  factory.create({ kind: 'mock' })  → MockProvider (无 key, 无网络)
  factory.create({ kind: 'meshy' }) → MeshyProvider
    ↓ 构造时读 process.env.MESHY_API_KEY
    ↓ 缺失 → 抛 MissingApiKeyError('MESHY_API_KEY')
  factory.create({ kind: 'rodin' }) → RodinProvider (同)
  factory.create({ kind: 'trellis' }) → TrellisProvider (同)

MeshyProvider.generateFromImage(req):
  POST https://api.meshy.ai/openapi/v2/image-to-3d
  Headers: Authorization: Bearer ${env.MESHY_API_KEY}
  Body: { image_url, model_type, topology, target_polycount, ... }
  → 202 Accepted, { result: taskId }
  
  getTaskStatus(taskId):
    GET /image-to-3d/${taskId}
    → { status: 'PENDING'|'IN_PROGRESS'|'SUCCEEDED'|'FAILED' }
  
  downloadAsset(taskId):
    GET /image-to-3d/${taskId}
    → { model_urls: { glb: 'https://...' } }
    → fetch + return ArrayBuffer
```

> 本任务阶段：以上 HTTP client 骨架写完但**不发起任何真实请求**（无 key）。`factory.create({ kind: 'meshy' })` 在 `env` 为空时直接抛错，开发体验清晰。

### C. Asset Quality Gate 数据流（业务级门）

```
GLB binary (public/assets/skins/_demo/egg-exported.glb)
   ↓
scripts/validate-skin-asset.mjs
   ↓
asset-report.json
   { valid, triangleCount, materials, textures, animations, skeleton, boundingBox, ... 每个字段含 requiredLevel }
   ↓
scripts/quality-gate.mjs
   读 asset-report.json + 读 Skin.role ("test" | "production")
   ↓
quality-gate-report.json
   { valid: boolean, role, errors: [...], warnings: [...] }
   ↓
loadSkinAsset(skinId)
   1. 读 quality-gate-report.json
   2. valid: false → 抛 QualityGateRejectedError
   3. valid: true + warnings: [...] → load 成功，Preview 页面顶部标 "Production warning"
   4. valid: true + 0 warnings → 正常路径
```

**Quality Gate 阈值表**（与 R5.1 / R13 对齐）：

| 检查项 | test role | production role | 失败处理 |
|---|---|---|---|
| GLB 可解析 | Required | Required | reject |
| Mesh > 0 | Required | Required | reject |
| Triangle Count > 0 | Required | Required | reject |
| Bounding Box 合理 | Required | Required | reject |
| Material 数量 1-32 | Required | Required | reject |
| Texture embedded | Optional | Recommended | warning |
| PBR | Optional | Required | reject (production) |
| Skeleton 声明 | Optional | Recommended | warning |
| Animation 状态 | Optional | Recommended | warning |
| 模型尺寸 [0.001, 100] | Required | Required | reject |
| NaN / Infinity | Required | Required | reject |
| 文件大小 < 20 MB | Required | Required | reject |

`egg-exported.glb` 是 `role: "test"`，所以 PBR / Skeleton / Animation 缺失只是 warning，**不** reject；Preview 页面顶部显示 "Test asset — production characters would require PBR + Animation"。

## Contracts

### 1. `Skin` 扩展（`src/game/skins.ts`）

```ts
export type SkinKind = SkinKindLegacy | "procedural" | "model";
export type SkinKindLegacy = "none" | "hat" | "wings" | "cape" | "ears" | "halo" | "crown";

export type PresentationProfile = {
  // transform 适配 — 默认值来自现有蛋仔
  scale: number;          // 默认 1.0
  verticalOffset: number; // 默认 0
  rotationOffset: { x: 0, y: 0, z: 0 };
  contactShadowScale: number; // 默认 1.0
};

export type AssetManifestRef = {
  // asset-manifest.json 完整内容（schema 见 §3）
  id: string;
  version: number;
  format: "glb";
  model: string;          // 相对路径，如 "skins/_demo/egg-exported.glb"
  thumbnail?: string;
  triangleCount: number;
  textureResolution: number;
  animations: string[];
  skeleton: boolean;
  lod: { lod0?: string; lod1?: string; lod2?: string };
  license: string;        // e.g. "project-internal" | "CC0" | "CC-BY-3.0"
  source: string;         // e.g. "scripts/export-demo-glb.mjs"
  generatedAt: string;    // ISO date
  sha256: string;         // GLB binary sha256
};

export type AnimationProfile = {
  // 第一阶段：GLB 静态展示
  status: "static" | "embedded";
  // 若 status === 'embedded'
  defaultClip?: string;
  loop?: boolean;
};

export type Skin = {
  // 既有字段
  id: string;
  name: string;
  rarity: Rarity;
  kind: SkinKind;
  tint?: string;            // 可选：programmatic skin 可能没有 tint
  hat?: HatKind;
  // 新字段
  modelUrl?: string;        // 仅 kind === 'model' 必填
  lod0?: string;            // 模型 URL（可等于 modelUrl）
  lod1?: string;            // gameplay LOD
  lod2?: string;            // 远距离 LOD
  animationProfile?: AnimationProfile;
  presentationProfile?: PresentationProfile;
  assetManifest?: AssetManifestRef;
};
```

### 2. `Persist` v4 → v5（`src/game/store.ts`）

```ts
type PersistV5 = Persist & {
  // 新字段为可选，老存档没这些字段仍可读
  preferredLod?: "lod0" | "lod1" | "lod2";
  lastPreviewedSkinId?: string;
};

export const SAVE_KEY = "yolk-rush-v5"; // 升级
```

迁移策略：

- 读取时：先尝试 `localStorage["yolk-rush-v5"]`；若无，尝试 `localStorage["yolk-rush-v4"]` 并通过 `migrateV4ToV5(parsedV4)` 升级。
- 写入时：永远写 `v5`。
- 迁移函数：**纯函数**，单测覆盖（`store-hydration.test.ts` 扩展）。
- 注意 CLAUDE.md 警告："store.ts 的 SAVE_KEY 升级规则 — 改了 schema 要新增 v5 兼容旧 key，不要原地改 Persist 类型后丢失玩家存档"。

### 3. Asset Manifest / Report schema

`asset-manifest.json` 与 `asset-report.json` 同 schema：

```ts
type AssetReport = {
  valid: boolean;
  id: string;
  version: 1;
  format: "glb";
  model: string;
  thumbnail?: string;
  triangleCount: number;
  textureResolution: number;
  materials: number;
  textures: number;
  animations: { name: string; durationSec: number }[];
  skeleton: { joints: number } | false;
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
  };
  fileSizeKB: number;
  lod: { lod0?: string; lod1?: string; lod2?: string };
  license: string;
  source: string;
  generatedAt: string;
  sha256: string;
  errors?: string[];
};
```

**关键约束**：所有数字字段必须真实读取（参见 R5）。validator 拒绝写入 `triangleCount: 0` 的 GLB（视为加载失败或无效）。

### 4. Provider 接口（`src/engine/skin-asset/provider/types.ts`）

```ts
export type GenerateFromImageRequest = {
  imageUrl: string;          // 必须是 public 资产路径或 https URL（不接受 blob: / data:）
  modelType?: "standard" | "lowpoly";
  topology?: "quad" | "triangle";
  targetPolycount?: number;
  textureResolution?: 512 | 1024 | 2048;
  enablePbr?: boolean;
};

export type GenerateFromPromptRequest = {
  prompt: string;
  negativePrompt?: string;
  // 同上可选字段
};

export type GeneratedAsset = {
  taskId: string;
  status: "PENDING" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED";
  modelUrls?: { glb?: string; fbx?: string; obj?: string; usdz?: string };
  thumbnailUrl?: string;
  polycount?: number;
  createdAt: string;
  updatedAt: string;
  error?: string;
};

export type GenerationTask = {
  taskId: string;
  status: "PENDING" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED";
  progress?: number;
  error?: string;
};

export type GeneratedAssetFiles = {
  glb: ArrayBuffer;
  thumbnail?: ArrayBuffer;
  meta: { polycount: number; textureResolution: number; license: string };
};

export class MissingApiKeyError extends Error {
  constructor(public readonly key: string) {
    super(`Missing environment variable: ${key}`);
    this.name = "MissingApiKeyError";
  }
}

export interface SkinAssetGenerationProvider {
  readonly id: string;
  generateFromImage(req: GenerateFromImageRequest): Promise<GeneratedAsset>;
  generateFromPrompt(req: GenerateFromPromptRequest): Promise<GeneratedAsset>;
  getTaskStatus(taskId: string): Promise<GenerationTask>;
  downloadAsset(taskId: string): Promise<GeneratedAssetFiles>;
}
```

### 5. MockProvider（必须真实可运行）

```ts
// src/engine/skin-asset/provider/mock-provider.ts
const DEMO_MANIFEST = "public/assets/skins/_demo/egg-exported.asset-manifest.json";

export function createMockProvider(): SkinAssetGenerationProvider {
  return {
    id: "mock",
    async generateFromImage(req) {
      // 不调用网络；直接返回一个虚拟 GeneratedAsset 指向 demo GLB
      return {
        taskId: "mock-demo",
        status: "SUCCEEDED",
        modelUrls: { glb: "/assets/skins/_demo/egg-exported.glb" },
        thumbnailUrl: "/assets/skins/_demo/egg-exported.webp",
        polycount: 0, // 由 validator 实际读
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
    // 其他方法抛错（Mock 不模拟 async 任务）
    async getTaskStatus() { throw new Error("MockProvider 不模拟 async 任务"); },
    async downloadAsset() { throw new Error("MockProvider 不模拟下载"); },
  };
}
```

## Compatibility & Migration

### 现有 12 个 Skin 的兼容（关键）

| 现有 Skin | 修改 |
|---|---|
| `plain`, `sprout`, `bow`, `starlet`, `mint_wings`, `sky_wings`, `star_cape`, `bunny`, `sunset_wings`, `cloud_wings`, `halo`, `crown` | 显式添加 `kind: "procedural"`（值由 `hat`/`wings`/... 推断或显式补全） |

`getSkin(id)`、`pullSkin(owned)`、`placeReward`、`STARTER_SKINS`、`GACHA_COST`、`DUP_REFUND` **完全不改**——它们只依赖 `id` 和 `rarity`。

### 新增 Demo Model

```ts
{
  id: "egg_demo_model",
  name: "光蛋 · GLB",
  rarity: "rare",
  kind: "model",
  tint: "#FFF6EB", // 保持 tint 字段防止旧代码引用
  modelUrl: "/assets/skins/_demo/egg-exported.glb",
  lod0: "/assets/skins/_demo/egg-exported.glb",
  lod1: "/assets/skins/_demo/egg-exported.glb", // 第一阶段三档同源
  lod2: "/assets/skins/_demo/egg-exported.glb",
  animationProfile: { status: "static" },
  presentationProfile: {
    scale: 1.0,
    verticalOffset: 0,
    rotationOffset: { x: 0, y: 0, z: 0 },
    contactShadowScale: 1.0,
  },
  assetManifest: { /* 引用 manifest JSON */ },
}
```

### Server Boundary（契约但本任务不实现真实 route）

- 真实云端 Provider 调用必须发生在 `server/middleware/` 或 `server/routes/api/skins/`。
- 前端永远不直接 fetch `api.meshy.ai` / `hyper3d.ai`。
- 契约：`POST /api/skins/generate` 接受 `{ imageUrl }`，返回 `{ taskId }`；`GET /api/skins/:taskId` 返回 `{ status, modelUrls }`。
- 本任务阶段：仅写 `docs/skins/asset-pipeline.md` 文档约定 + server 目录骨架（空 stub 文件），不发起任何 HTTP。

## Operational & Rollback

### 回滚策略

| 失败点 | 回滚手段 |
|---|---|
| `Skin` 类型扩展破坏现有测试 | revert `skins.ts`；保留 v4 → v5 兼容层 |
| `CharacterVisual` 渲染 GLB 路径崩溃 | `fallback(skinId)` 返回 EggMesh clone，保证游戏可玩 |
| Validator 写入 `triangleCount: 0` 视为无效 | 改为 warning 而非 fail；保证 build 不挂 |
| Demo GLB 导出脚本在 macOS 上跑不通 | 改用 GLTFExporter 直接在 browser 端跑 + 浏览器手动 download（一次性） |
| v4 → v5 迁移丢字段 | 迁移函数用 `Partial<PersistV5>` 输入；保留所有未知字段 |

### 操作步骤（实施时按 implement.md 顺序）

1. 写 prd.md（已完成）
2. 写 design.md（本文）
3. 写 implement.md
4. 写 implement.jsonl + check.jsonl
5. 最终 review
6. `task.py start`
7. 按 implement.md 顺序实施

## Trade-offs

| 决策 | 选项 | 选择 | 理由 |
|---|---|---|---|
| Demo GLB 来源 | 4 候选 | **导出当前蛋仔**（用户拍板） | 视觉一致 / 零许可证 / 验证"程序化→GLB"导出路径 |
| 持久化兼容层时机 | 本次 / 延后 | **本次实现** | CLAUDE.md 已警告 v5 升级窗口；延后埋债 |
| Provider 接口位置 | `src/engine/` / `src/game/` / `src/lib/` | **`src/engine/skin-asset/`** | 与现有 `src/engine/` 工具层一致（`device.ts` / `haptics.ts` / `pipeline.ts`） |
| CharacterVisual 是否替换 EggMesh | 是 / 否 | **不替换** | `CharacterVisual` 只在 EggMesh 外层包装；EggMesh 内部不变 |
| CharacterVisual 是否修改 Gameplay 参数 | 允许 / 禁止 | **禁止** | `presentationProfile.scale` 只改 GLB 根节点的视觉 scale；物理碰撞体 / 移动参数 / 跳跃扑滚冲刺 timing 必须**保持不变** |
| Asset Quality Gate 位置 | Validator 之前 / 之后 / 与 Validator 合并 | **Validator 之后，独立模块** | Validator = "事实采集"（GLB 里有什么）；Quality Gate = "业务门"（按 role 决定是否接受） |
| `egg-exported.glb` 角色 | Production Character Asset / Runtime Integration Test | **Runtime Integration Test** | 防止后续 Agent 误把 EggMesh → GLB 当作生产流程 |
| Validator 依赖 | `@gltf-transform/core` / 手写 GLB parser | **`@gltf-transform/core`**（提案） | 手写 GLB binary parser 风险高；依赖成熟库 |
| Demo GLB 导出路径 | Node 直接跑 / Playwright headless | **Playwright headless + dev hidden page** | `three/examples/jsm/exporters/GLTFExporter` 依赖 DOM/Canvas API，Node 不可用 |
| Preview 路由位置 | 新建 TanStack Start 路由 / 单纯组件 | **TanStack Start 路由 + dev-only guard** | 与项目路由系统一致；生产 tree-shake |
| create-skin Skill 复用 vs 重建 | 复用 Trellis Skill / 完全新建 | **复用 + 编排** | Skill 内容只编排已存在的 validator/provider/SkinRegistry |
| 是否在 preview 页面接 Meshy | 是 / 否 | **否** | 本任务无 API Key；preview 仅展示已存在的 GLB |