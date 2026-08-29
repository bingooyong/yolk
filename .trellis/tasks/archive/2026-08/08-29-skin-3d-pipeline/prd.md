# Skin 3D Asset Pipeline (Provider + GLB Runtime)

## Goal

为 Yolk Rush 建立**AI 3D 资产管线的基础设施**：让任何云端 3D Provider（Meshy / Rodin / 未来）能在不变更 Skin System 业务代码的前提下，把生成的 GLB 接入游戏。本任务只覆盖**第 1 阶段（基建）+ 第 2 阶段（占位 GLB 跑通闭环）**；第 3 阶段（接真实云端 API）由后续 Trellis 任务独立承载。

不追求：
- 本会话内"看到一只 AI 生成的 3D 小熊跑在游戏里"——环境与凭据都不允许；
- 用 primitive mesh 伪造 GLB；
- 把 API Key 写进前端 bundle 或 Git 历史。

## Confirmed Facts（来自仓库与本机）

- `src/game/skins.ts:5-12` — `Skin` 类型当前只支持 `hat / wings / cape / ears / halo / crown` 这类程序化 Skin，**没有任何 GLB / modelUrl 字段**。
- `src/game/EggMesh.tsx` — 蛋仔本身是 Three.js 程序化几何，**未使用 `GLTFLoader`**。
- `src/game/character-presentation.ts` — 已经是成熟的 transform-only 表现层（squash / lean / breath / contact shadow），新增 GLB 角色应直接复用。
- `src/game/store.ts` + `store-hydration.test.ts` — 持久化版本 `yolk-rush-v4`；CLAUDE.md 已要求升级到 `v5` 时**新增 v5 兼容旧 key**，不要原地改 `Persist` 类型。
- `package.json:55-58` — `three@0.185.1` + `@react-three/fiber@9.7.0` + `@react-three/rapier@2.2.0` 已就位；`playwright` 已安装，可用于 Preview 页面截图。
- `vite.config.ts` + `vite.native.config.ts` — 双构建路径；GLB 资产必须出现在两个 build 都能访问的位置。
- `.agents/skills/` 已有 13 个 Trellis Skill；`create-skin` Skill 不重复建设已有能力。
- `.grok/` 已存在；Grok 通道已预留。
- 本机 = `darwin arm64` (Apple M1 Pro / Metal 4)；**无 NVIDIA CUDA**，本会话无法本地跑 TRELLIS.2 / Hunyuan3D。
- 当前 Trellis 任务 `08-29-trellis-knowledge-baseline` 的 prd.md 明确 `Business code must remain read-only`；**本任务必须与之解耦**。
- 当前会话**没有任何** `MESHY_API_KEY` / `RODIN_API_KEY` 等云端凭据。

## Requirements

### R1 — Skin 类型扩展（不破坏现有 12 个程序化 Skin）

- `Skin` 类型新增 `kind: "procedural" | "model"`；现有 12 个 Skin 全部标记为 `"procedural"`，**字段保持不变**。
- 新增 model-only 字段：`modelUrl` / `lod0` / `lod1` / `lod2` / `animationProfile` / `presentationProfile` / `assetManifest`。
- `presentationProfile` 描述如何把 `CharacterPresentation` 的 transform 参数应用到 GLB 根节点（默认 = 蛋仔当前 transform）。
- 持久化从 `yolk-rush-v4` 升到 `yolk-rush-v5`，**保留 v4 兼容回退**（参考 CLAUDE.md "store.ts 的 SAVE_KEY 升级规则"）。
- `getSkin(id)` / `pullSkin(owned)` / `GACHA_COST` / `DUP_REFUND` / `STARTER_SKINS` 全部继续工作。

### R2 — Provider 接口（抽象层）

新增 `SkinAssetGenerationProvider` 接口（位置待定，见 design.md）：

```ts
interface SkinAssetGenerationProvider {
  readonly id: string;
  generateFromImage(req: GenerateFromImageRequest): Promise<GeneratedAsset>;
  generateFromPrompt(req: GenerateFromPromptRequest): Promise<GeneratedAsset>;
  getTaskStatus(taskId: string): Promise<GenerationTask>;
  downloadAsset(taskId: string): Promise<GeneratedAssetFiles>;
}
```

四个实现类占位：

| Provider | 阶段 | 本任务范围 |
|---|---|---|
| `MockProvider` | 第 1 阶段 | **必须真实可运行**，返回项目内合法开源 GLB |
| `MeshyProvider` | 第 1 阶段 | 只完成 HTTP client 骨架（接口 + 类型 + endpoint 文档引用）；无 key 时显式抛错 |
| `RodinProvider` | 第 1 阶段 | 同上 |
| `TrellisProvider` | 第 1 阶段 | 只定义接口；**禁止尝试本地跑**（无 CUDA） |

- Provider **不写死**到 Skin System；通过工厂注入。

### R3 — Server-side Provider Boundary（关键安全约束）

- API Key **只能从 environment variables 读取**：`MESHY_API_KEY` / `RODIN_API_KEY` / `TRELLIS_ENDPOINT`。
- **禁止**写入源码、Git、前端 bundle、`.env.local`（该文件已在 `.gitignore`，且 web bundle 不能 import server-only 代码）。
- 真实云端调用必须发生在 `server/middleware/`（Nitro 已配置 `serverDir: "./server"`，参考 `vite.config.ts`）。
- 前端 `SkinAssetGenerationProvider` 调用链必须经过自己的 Asset Generation API（如 `/api/skins/generate`），**不能直接 fetch Meshy/Rodin URL**。
- 本任务阶段（无凭据）：仅实现契约 + Mock；真实 server route **不实现**，但目录骨架与契约可建。

### R4 — Asset Contract（GLB 规格）

`docs/skins/character-asset-contract.md` 定义：

- 输入：PNG / JPG / WebP（角色概念图，单图、对称、正面、纯背景）。
- 输出：`GLB`（glTF 2.0 binary），必须支持：
  - Geometry（Triangle Count 报告）
  - PBR Material（baseColor / normal / metallic-roughness，至少一组）
  - Texture（最大 2048×2048）
  - UV
  - Skeleton（可选，但报告字段必填）
  - Animation（可选，但报告字段必填）
- 必须可被 Three.js `GLTFLoader` 加载并进入 `THREE.Scene`。
- 列出禁止项：不能是已加密 GLB、不能引用外部纹理 URL（必须内嵌）、不能使用过时 glTF 扩展。

`asset-manifest.json` schema：

```json
{
  "id": "string",
  "version": 1,
  "format": "glb",
  "model": "relative/path.glb",
  "thumbnail": "relative/path.webp",
  "triangleCount": 0,
  "textureResolution": 2048,
  "animations": [],
  "skeleton": false,
  "lod": { "lod0": "?", "lod1": "?", "lod2": "?" }
}
```

**所有数字字段必须从真实 GLB 读取，禁止虚构**（验收硬性约束）。

### R5 — Asset Validator

新增 `scripts/validate-skin-asset.mjs`（参考 `scripts/check-auth-invariant.mjs` 的 Node 测试风格），通过 `node --test` 暴露：

- GLB 存在性
- GLB 可被 `gltf-transform` 或等价库解析（避免引入重依赖；首选 `node:fs` + `@gltf-transform/core`，如未安装则在 implement.md 标记为后续依赖提案）
- Bounding Box（从 accessor min/max 读）
- Triangle Count（从 indices 累加）
- Materials / Textures 数
- Skeleton 关节数（若有 skin）
- Animations 列表（clip 名 + 时长）
- File Size（KB）

输出 `asset-report.json`，字段 schema 与 `asset-manifest.json` 对齐。所有数字必须真实读取。

#### R5.1 — Required / Optional 区分（防止验证步骤强制生产属性）

按生产阶段区分资产要求：

| 项目 | Runtime Integration Test（`egg-exported.glb`） | Production Character（未来 AI 角色） |
|---|---|---|
| GLB 可解析 | **Required** | **Required** |
| Mesh | **Required** | **Required** |
| Material | **Required** | **Required** |
| Triangle Count | **Required** | **Required** |
| Bounding Box | **Required** | **Required** |
| Texture | Optional | Recommended |
| PBR | Optional | **Required** |
| Skeleton | Optional | Recommended |
| Animation | Optional | Recommended |
| LOD | Deferred | **Required** |

`Validator` 在写 `asset-report.json` 时必须为每个字段标注 `requiredLevel: "required" | "optional" | "recommended" | "deferred" | "unknown"`；**严禁**为运行时测试 GLB 强加 PBR / Skeleton / Animation，否则会导致验证器伪造字段。

#### R5.2 — Test Asset vs Production Asset 标识

`public/assets/skins/_demo/egg-exported.glb` 在 `docs/skins/third-party-assets.md` 中标注：

```yaml
source: project-generated
license: project-internal
role: runtime-integration-test   # 不是生产角色
notFor: production-skin-pipeline
```

防止后续 Codex / Agent 误以为"`EggMesh → GLB`"是未来 AI 皮肤的生产流程；真正的生产流程是：

```
Grok Concept Art
   ↓
Meshy / Rodin
   ↓
GLB
   ↓
Validator + Quality Gate
   ↓
LOD
   ↓
Skin Registry
```

属于后续任务 `08-29-ai-skin-generation`（不在本任务范围）。

### R6 — SkinAssetLoader（GLB Runtime）

新增模块（位置待 design.md 确定，候选 `src/engine/skin-asset-loader.ts`）：

- `load(skinId, lod): Promise<THREE.Group>`
- `preload(skinId): Promise<void>`
- `cache.invalidate(skinId)`
- `dispose(skinId)`
- `fallback(skinId): Promise<THREE.Group>`（返回默认程序化蛋仔的 clone，确保 GLB 加载失败时游戏仍可玩）
- 使用 Three.js `GLTFLoader`；**不在 render 帧内重新加载**（缓存命中直接复用）。
- 不在 React render path 中 `await load()`——必须通过 `useGLTF` 或 `Suspense` 模式或显式预加载。

### R7 — CharacterVisual（Skin Runtime）

- 新增 `CharacterVisual.tsx`，封装 `Skin.kind` 分派：
  - `procedural` → 现有 `EggMesh.tsx` 路径
  - `model` → `SkinAssetLoader.load` + `presentationProfile` 应用
- **不重写 `character-presentation.ts`**；直接复用 `getCharacterPose` / `getContactShadowPose`。
- 静态展示（无 Animation）允许；但 UI 必须明确标注 "Static preview"。
- **硬约束（不接管 Gameplay）**：`CharacterVisual` **只负责 Visual Asset 的加载、挂载、动画和表现变换**。**不得**：
  - 修改角色物理碰撞体（capsule / collider 形状 / offset）
  - 修改移动参数（speed / acceleration / friction）
  - 修改跳跃 / 扑 / 滚 / 冲刺等 Gameplay 状态机的 timing / cooldown / 力度
  - 修改 `Rapier` 物理交互
  - 触发 / 拦截任何 Gameplay Event
  - 模型尺寸差异（如小熊比蛋仔大）必须通过 `presentationProfile.scale` 表达，**不修改** `sim.ts` / `EggRacer.tsx` 的物理参数
- 目的：未来接入小熊 / 兔子 / 盔甲等真实 AI 角色时，模型差异只影响视觉，不污染 Gameplay。

### R8 — Wardrobe + Gacha 集成（最小变更）

- 新增一个 Model Skin：`id: "egg_demo_model"` / `name: "光蛋 · GLB"`，对应 D1 导出的 `public/assets/skins/_demo/egg-exported.glb`。
- `SKINS` 数组扩展为支持 model 字段；`STARTER_SKINS` 不变；Gacha 权重 / 概率 / 重复返还**不变**。
- 现有 Hub（试衣间）增加 Demo Model 卡片；现有 Gacha 抽奖结果可能包含 model skin（概率与 procedural 一致，不特殊加权）。
- **不重写抽卡系统**；只保证 SkinRegistry 的 `getSkin(id)` 能正确返回 model 类型。

### R9 — GLB Preview 页面（开发者工具）

- 路径：`src/components/DeveloperSkinPreview.tsx`（仅 dev mode 可见）
- 输入：Skin ID（URL query 参数 `?skin=<id>`）
- 功能：
  - 360° 旋转（鼠标拖拽 + Auto Rotate toggle）
  - Zoom（wheel）
  - Animation List（dropdown 选择 clip）
  - Asset Info panel：triangleCount / textureResolution / boundingBox / fileSize / animations
- 路由：`/dev/skin-preview`（仅 `import.meta.env.DEV` 启用，生产 build 不打包）

### R10 — create-skin Skill（自动化入口）

- 路径：`.agents/skills/create-skin/SKILL.md`
- **复用**已有 Trellis Skill（不重复实现 validator / provider / Skin Registry）。
- Skill 工作流（8 步）：
  1. Skin Design（用户输入名称 / 类型 / 风格 / 主题 / 稀有度）
  2. Concept Prompt（生成 Grok 概念图 prompt）
  3. Asset Generation Request（调用 Provider）
  4. Asset Manifest（生成 asset-manifest.json）
  5. SkinDefinition（写入 SKINS 数组）
  6. Wardrobe Registration
  7. Gacha Registration
  8. QA Report
- **硬约束**：若无 API Key，必须在第 3 步停下，**明确报告**缺少 `MESHY_API_KEY` 或 `RODIN_API_KEY`，**禁止伪造 GLB**。

### R11 — 文档

- `docs/skins/character-asset-contract.md` — Asset Contract（GLB 规格 / Manifest schema / 禁止项）
- `docs/skins/asset-pipeline.md` — Provider 架构 / Server Boundary / Mock → 真实 Provider 切换流程
- `docs/skins/third-party-assets.md` — 占位 GLB 的来源 / 许可证 / 原始 URL / 下载时间
- `docs/skins/skin-generation.md` — Grok prompt 模板 + Meshy / Rodin API 用法摘要 + create-skin Skill 用法

### R12 — Trellis Spec 写入

只把**稳定工程规则**写入 `.trellis/spec/frontend/skin-system.md`：

- Skin 类型扩展后的兼容策略；
- Provider 接口契约；
- Server Boundary 规则；
- Asset Validator 调用入口。

**不写**：临时实验、占位 GLB 的具体路径、未验证的 API 调用示例。

### R13 — Asset Quality Gate（新增）

未来 `/create-skin` Skill 真正具备生产级资产流水线之前，必须有一道**质量闸门**：AI 每生成一个模型，Codex **不会**直接塞进游戏；任何不符合基线的资产会被拒绝并打回。

定位：**Runtime Integration Test** 与 **Production Character Asset** 都必须通过 Quality Gate，但 Gate 的阈值不同（参考 R5.1 区分）。

#### R13.1 — 检查项（首版）

```
GLB 可解析
   ↓
Mesh > 0
   ↓
Triangle Count > 0
   ↓
Bounding Box 合理（min < max，无退化）
   ↓
Material 数量合理（1 ≤ count ≤ 32）
   ↓
Texture 可加载（embedded，非外部 URL）
   ↓
模型尺寸合理（bounding box 体积在 [0.001, 100] 立方单位）
   ↓
没有 NaN / Infinity（顶点 / 法线 / UV）
   ↓
文件大小未超限（< 20 MB 第一版）
   ↓
动画 / 骨骼状态明确（declared 但 missing → 警告；declared 且 present → pass）
   ↓
通过 / 拒绝
```

#### R13.2 — 后续扩展点（不属本任务）

未来 Quality Gate 会逐步增加：

- Polygon Budget（per-LOD）
- Texture Budget（per-texture / 总计）
- Material Budget
- Draw Call Budget
- LOD Budget
- Mobile Performance Budget（按设备分级）

#### R13.3 — 失败处理

- 任一 **Required** 项失败 → Validator 写 `valid: false`，Asset Loader 抛错，Wardrobe 隐藏该 Skin。
- 任一 **Recommended** 项缺失 → Validator 写 `valid: true, warnings: [...]`，Skin 仍可显示但 Preview 页面顶部标注 "Production warning"。
- 任一 **Optional** 项缺失 → 静默通过。
- 任一 **Deferred** 项缺失 → 静默通过（不计入验收）。

#### R13.4 — 与 Asset Validator 关系

Quality Gate 是 Validator 之后的"业务级"门；Validator 输出 `asset-report.json`，Quality Gate 读取它并按 Skin 的 `role: "test" | "production"` 选择不同阈值；Quality Gate 输出 `quality-gate-report.json`，`valid: boolean` + 拒绝原因列表。

#### R13.5 — 与 Skin Loader 集成

- `loadSkinAsset(skinId)` 在返回前必须读 `quality-gate-report.json`；`valid: false` → 抛 `QualityGateRejectedError`。
- Skin Registry 的 `getSkin(id)` 必须能识别被拒绝的 Skin 并在 UI 隐藏。

### R14 — 测试

必须通过（在 PR / commit 前）：

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`

新增测试覆盖：

- `src/game/skins.test.ts` — 12 个现有 Skin 全部仍可被 `getSkin(id)` 找到且 `kind === "procedural"`
- `src/engine/skin-asset-loader.test.ts` — `MockProvider` 返回合法 GLB；`load` 缓存命中；`fallback` 不抛错；`QualityGateRejectedError` 在 `valid: false` 时抛出
- `scripts/validate-skin-asset.test.mjs` — Validator 输出字段 schema 正确、数字非虚构、每个字段标注 `requiredLevel`
- `scripts/quality-gate.test.mjs` — Quality Gate 在 `test` role 下只检查 Required；在 `production` role 下检查 Required + Recommended；所有 Rejected / Warning 路径覆盖
- `src/game/store-hydration.test.ts` 扩展 — v4 存档升 v5 不丢字段

## Acceptance Criteria

- [ ] `Skin` 类型增加 `kind` 字段，12 个现有 Skin 标记为 `procedural`，所有现有测试不需修改即通过。
- [ ] `SkinAssetGenerationProvider` 接口定义在独立文件（不与 skins.ts 耦合）；`MockProvider` / `MeshyProvider` / `RodinProvider` / `TrellisProvider` 四个实现类骨架完整。
- [ ] `MockProvider` 真实可调用：返回 `public/assets/skins/_demo/<file>.glb` 中的一个真实开源 GLB，并通过 Asset Validator 全部检查项。
- [ ] Asset Validator 输出的 `asset-report.json` 中 `triangleCount` 等数字与真实 GLB 一致（手工 spot check 至少 1 个），且每个字段标注 `requiredLevel`。
- [ ] Asset Quality Gate 输出 `quality-gate-report.json`：`test` role 下只检查 Required（demo GLB 通过），`production` role 下检查 Required + Recommended（demo GLB 在 production role 下产生 warnings 但不 reject）。
- [ ] `CharacterVisual` 组件能根据 `Skin.kind` 分派到 Procedural 或 Model 路径；Model 路径加载 Demo Model 后，蛋仔游戏可正常进入并跑两步。
- [ ] **`CharacterVisual` 不接管 Gameplay**：修改 `presentationProfile.scale` 不影响物理碰撞体 / 移动参数 / 跳跃扑滚冲刺 timing；单测覆盖（即使 presentationProfile 错配，物理参数保持不变）。
- [ ] `/dev/skin-preview?skin=<demo-id>` 在 dev mode 可见，支持旋转、zoom、Auto Rotate、Asset Info。
- [ ] Wardrobe / Gacha / Home / Victory / Gacha Ceremony 全部视觉与行为无回归。
- [ ] `npm run typecheck` / `npm run lint` / `npm run test` / `npm run build` 全部通过。
- [ ] `.agents/skills/create-skin/SKILL.md` 写完；不重复实现 validator / provider / Skin Registry。
- [ ] `docs/skins/` 下四个文档完成；`third-party-assets.md` 明确标注 demo GLB 的 `role: runtime-integration-test` 且引用 `R5.2` 防止后续 Agent 误判。
- [ ] `npm run dev` 启动后控制台无新增 error / warning。
- [ ] **零 API Key 提交**：`git grep -E "MESHY|RODIN|TRELLIS" -- ':!*.md' ':!*.lock' ':!.trellis/**'` 无匹配。
- [ ] **零伪造 GLB**：所有 `*.glb` 文件来自合法开源来源（Sketchfab CC0 / KhronosGroup glTF-Sample-Models / 自有 Blender 导出），并在 `docs/skins/third-party-assets.md` 记录许可证。

## Out of Scope（明确不做）

- 本地跑 TRELLIS.2 / Hunyuan3D / 其他 CUDA 依赖模型；
- 在本会话内生成"小熊探险家"真实 AI 3D 角色；
- 接通 Meshy / Rodin 真实云端 API（凭据缺失，留给后续任务）；
- 重写现有 12 个程序化 Skin 的渲染；
- 修改 `character-presentation.ts`（仅复用）；
- 修改 `08-29-trellis-knowledge-baseline` 任务目录；
- 引入除 `@gltf-transform/core` 之外的新 3D 处理依赖（候选须在 implement.md 评估）；
- 移动端 LOD 真实生成（仅建契约）；
- Collision Mesh 自动生成（Gameplay 继续使用现有统一 Character Collider）。

## Open Questions

_None blocking — D1/D2/D3 resolved._

## Deferred Items（延后到后续任务）

- **F1**：接通 Meshy / Rodin 真实云端 API（在凭据就位后启动独立 Trellis 任务；本任务仅建契约 + Mock）。
- **F2**：生成"小熊探险家"真实 AI 3D 角色（依赖 F1 完成；不属本任务）。
- **F3**：移动端 LOD 实际生成（仅建契约；真实减面 / remesh 留给美术 / Blender 工具链）。
- **F4**：GLB → Character Collider 自动推导（当前 Gameplay 继续用统一胶囊体；不引入 Per-Model Collider）。

## Key Decisions（用户已拍板）

### D1 — 占位 GLB 来源 = 导出当前蛋仔

用 `three/examples/jsm/exporters/GLTFExporter` 把当前 `EggMesh.tsx` 渲染出的 base 蛋仔（plain skin、无任何 hat/wings 附件、idle 状态）导出为 `public/assets/skins/_demo/egg-exported.glb`。

理由：
- 视觉与现有游戏一致，闭环验证最直接；
- 零外部许可证风险（自有代码生成）；
- 验证 "程序化 → GLB" 导出路径，未来可让设计师在游戏内导出变体。

实现要点（待 design.md 细化）：
- 导出脚本 `scripts/export-demo-glb.mjs`，在 Node 环境跑（用 jsdom + three 不可行；改为 R3F `<Canvas>` 内 `GLTFExporter.parse` 然后通过 `playwright` headless 渲染 + 抓 binary）；
- 备选：若 R3F + headless 跑不通，改为 `vite dev` 后用 `playwright` 打开隐藏页面触发导出并下载 binary；
- 导出仅一次，binary 进入 `public/assets/skins/_demo/`，并写 `docs/skins/third-party-assets.md` 标注 `source: project-generated / license: project-internal`。

### D2 — 单一任务，不拆 children

`08-29-skin-3d-pipeline` 单一任务承载全部范围；模块间依赖太强（Provider 决定 Validator 接口、Validator 决定 Preview 数据），拆分 child 任务会引入不必要的协调成本。

### D3 — 持久化 v4 → v5 兼容层 = 本次实现

按 CLAUDE.md 的 `SAVE_KEY` 升级规则，新增 `yolk-rush-v5` + 兼容 `v4` 解析路径，不原地改 `Persist` 类型。

理由：Model Skin 的 `modelUrl` 等字段必须能跨会话持久化；延后会埋 v5 升级窗口的兼容性债。

## Risks

- **R-A**：`@gltf-transform/core` 引入会改 `package.json` 依赖；必须评估 iOS build 体积影响。
- **R-B**：`CharacterVisual` 替换现有 EggMesh 路径时若 `presentationProfile` 默认值不对，会导致 model skin 与 procedural skin 视觉不一致。需在 design.md 中明确默认值，并新增回归测试。
- **R-C**：GLB Preview 页面如果用 URL query 注入，可能被外部 XSS 攻击（虽然只 dev mode）；需在 design.md 中明确 query 解析白名单。
- **R-D**：导出脚本路径复杂度。`three/examples/jsm/exporters/GLTFExporter` 在 Node 环境下无法直接用（依赖 DOM），必须经 R3F + Playwright headless 路径。备选方案：复用现有 `scripts/visual-smoke.mjs`（如适用），或新增 dev-only 隐藏页面 `/__export-glb`。

## Notes

- 本任务只覆盖用户原 prompt 的"第 1 阶段（基建）+ 第 2 阶段（占位 GLB）"；第 3 阶段（接 Meshy / Rodin）等后续 Trellis 任务。
- 资产简报（`concept-art/bear-explorer-brief.md`）已为未来 Meshy / Rodin 调用准备好"小熊探险家"输入包；本任务不调用，但调用入口已通过 `factory.create({ kind: 'meshy' })` 暴露。
- `prd.md` / `design.md` / `implement.md` 已完成；`implement.jsonl` / `check.jsonl` 已 curate。
- **未做** `task.py start`；等待用户对最终规划摘要的明确批准。
