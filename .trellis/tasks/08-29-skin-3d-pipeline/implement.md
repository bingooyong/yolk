# Implement — Skin 3D Asset Pipeline

> 执行顺序按依赖关系排序。每阶段完成后跑对应验证命令，全部通过后才进入下一阶段。
> 任意阶段失败 → 立即停止，回滚到上一阶段已合并状态。

## 阶段总览

```
P0 — 前置准备（必须先做）
  ↓
P1 — 类型扩展 + 持久化兼容（地基）
  ↓
P2 — Provider 接口 + 4 个 Provider 类（抽象层）
  ↓
P3 — Demo GLB 导出 + Asset Validator（GLB 来源与质控）
  ↓
P4 — SkinAssetLoader + CharacterVisual（运行时）
  ↓
P5 — Wardrobe / Gacha / Preview / 文档（集成与展示）
  ↓
P6 — Skill + Trellis Spec + 最终验证（交付物）
```

---

## P0 — 前置准备

### 操作

1. 确认当前分支：`git status --short --branch`，期望在 `main` 且无未提交修改（CLAUDE.md "已知约束与陷阱" 7）。
2. 创建工作分支：`git checkout -b feat/skin-3d-pipeline`。
3. 拉取最新 spec 索引：`cat .trellis/spec/frontend/index.md` 确认无重名 spec 文件。
4. 验证当前测试基线：

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

5. 验证 dev server 启动契约：

```bash
npm run dev   # 必须监听 0.0.0.0:8080（CLAUDE.md 硬约束）
```

### 回滚

不涉及修改，直接下一阶段。

---

## P1 — 类型扩展 + 持久化兼容

### 前置

P0 通过。

### 新增文件

无（全部为修改既有文件）。

### 修改文件

| 文件 | 修改 |
|---|---|
| `src/game/skins.ts` | `Skin` 类型加 `kind` + model-only 字段；12 个现有 Skin 标 `kind: "procedural"`；新增 `Demo Model` |
| `src/game/store.ts` | `SAVE_KEY` 升 `yolk-rush-v5`；`Persist` 扩 `PersistV5`；新增 `migrateV4ToV5()` |
| `src/game/store-hydration.test.ts` | 加 v4 → v5 迁移测试 |

### 详细步骤

1. **`src/game/skins.ts`**:
   - 扩 `SkinKind`：从 `"none" | "hat" | ... | "crown"` 改为 `"none" | "hat" | ... | "crown" | "procedural" | "model"`。
   - 加 `PresentationProfile` / `AnimationProfile` / `AssetManifestRef` 类型。
   - 加 `Skin.modelUrl` / `lod0-2` / `animationProfile` / `presentationProfile` / `assetManifest` 可选字段。
   - 12 个现有 Skin 显式 `kind: "procedural"`（注意：旧 `kind` 值是 `hat`/`wings` 等；不要破坏它们——这是 `legacyKind`，新增 `kind: "procedural"` 顶层字段）。可选方案：把现有 Skin 的 `kind` 值直接改为 `"procedural"`，然后用 `legacyKind` 字段保留旧值。

   **建议方案**：保留 `kind` 旧值不动（兼容所有 `if (skin.kind === "hat")` 之类的检查），加 `kind: "procedural"` 为新顶层字段会冲突。最终决定：
   - 新增字段 `renderKind: "procedural" | "model"`；`kind` 旧值保留作为 legacy。
   - `getSkin(id)` 增加 `getRenderKind(id)` 帮助函数。
   - 这样 `Hub.tsx` / `GachaCeremony.tsx` / `GameUI.tsx` 不用改。

   简化：直接在现有 `kind` 上叠加 `"procedural" | "model"`，让旧值 (`"hat"`/`"wings"`/...) 视为 `procedural` 的子分类。CharacterVisual 根据 `kind === "model"` 判断，其余视为 `procedural`。

2. **`src/game/store.ts`**:
   - `SAVE_KEY` 改 `"yolk-rush-v5"`。
   - `Persist` 类型加 `preferredLod?: ...; lastPreviewedSkinId?: ...`。
   - 新增 `migrateV4ToV5(p: Persist): PersistV5` 纯函数（默认字段全填）。
   - 持久化读取逻辑：

   ```ts
   const raw = localStorage.getItem(SAVE_KEY);
   if (raw) {
     return JSON.parse(raw) as PersistV5;
   }
   const legacyRaw = localStorage.getItem("yolk-rush-v4");
   if (legacyRaw) {
     const migrated = migrateV4ToV5(JSON.parse(legacyRaw));
     // 写回 v5 key，下次直接命中
     localStorage.setItem(SAVE_KEY, JSON.stringify(migrated));
     return migrated;
   }
   return defaultPersist();
   ```

3. **`src/game/store-hydration.test.ts`**:
   - 加 test：`migrateV4ToV5(v4存档) === 字段全填的 v5存档`。
   - 加 test：v4 key 升级读取后 `SAVE_KEY` 切换到 v5。
   - 加 test：v5 key 直接读，无 v4 副本也能工作。

### 验证命令

```bash
npm run typecheck    # 必须 0 错误
npm run lint         # 必须 0 错误
npm run test         # skins / store-hydration 全部 pass
```

### 回滚

```bash
git checkout -- src/game/skins.ts src/game/store.ts src/game/store-hydration.test.ts
```

---

## P2 — Provider 接口 + 4 个 Provider 类

### 前置

P1 通过（类型已扩）。

### 新增文件

```
src/engine/skin-asset/provider/types.ts
src/engine/skin-asset/provider/mock-provider.ts
src/engine/skin-asset/provider/meshy-provider.ts
src/engine/skin-asset/provider/rodin-provider.ts
src/engine/skin-asset/provider/trellis-provider.ts
src/engine/skin-asset/provider/factory.ts
src/engine/skin-asset/provider/index.ts          # barrel
src/engine/skin-asset/__tests__/factory.test.ts
src/engine/skin-asset/__tests__/mock-provider.test.ts
```

### 修改文件

无（纯新增）。

### 详细步骤

1. **`types.ts`** — 复制 design.md §4 中的接口定义。
2. **`mock-provider.ts`** — 按 design.md §5 实现。`generateFromImage` 返回指向 demo GLB 的 `GeneratedAsset`。
3. **`meshy-provider.ts`** — 构造时 `const key = process.env.MESHY_API_KEY; if (!key) throw new MissingApiKeyError("MESHY_API_KEY")`。HTTP client 骨架完整但**本任务不发起任何请求**。
4. **`rodin-provider.ts`** / **`trellis-provider.ts`** — 同模式。
5. **`factory.ts`**:

   ```ts
   export function createProvider(kind: ProviderKind): SkinAssetGenerationProvider {
     switch (kind) {
       case "mock": return createMockProvider();
       case "meshy": return new MeshyProvider();
       case "rodin": return new RodinProvider();
       case "trellis": return new TrellisProvider();
       default: throw new Error(`Unknown provider kind: ${kind}`);
     }
   }
   ```

6. **测试**:
   - `factory.test.ts`：`createProvider("mock")` 返回实现 `SkinAssetGenerationProvider` 接口的对象；`createProvider("meshy")` 在 `MESHY_API_KEY` 缺失时抛 `MissingApiKeyError`。
   - `mock-provider.test.ts`：`generateFromImage({ imageUrl: "test.png" })` 返回 `taskId: "mock-demo"`，`status: "SUCCEEDED"`，`modelUrls.glb` 指向 `/assets/skins/_demo/egg-exported.glb`。

### 验证命令

```bash
npm run typecheck
npm run test
```

### 回滚

新增文件直接删除，不影响现有代码。

---

## P3 — Demo GLB 导出 + Asset Validator

### 前置

P2 通过（MockProvider 已能返回 demo GLB URL）。

### 新增文件

```
public/assets/skins/_demo/.gitkeep                  # 目录占位
scripts/export-demo-glb.mjs                          # Node 脚本入口
src/routes/__export-glb.tsx                          # dev-only 隐藏页面，触发 GLTFExporter
scripts/validate-skin-asset.mjs                      # validator 脚本
scripts/validate-skin-asset.test.mjs                 # 单测
public/assets/skins/_demo/egg-exported.asset-manifest.json   # validator 输出
```

### 修改文件

`package.json` — 加依赖 `@gltf-transform/core`（先评估体积，见 design.md trade-offs）。

### 详细步骤

#### 3a — 导出 Demo GLB

1. `src/routes/__export-glb.tsx`（dev-only 路由）:
   - 检查 `import.meta.env.DEV`；否则返回 404。
   - 在 `useEffect` 中：实例化 `EggMesh`（plain skin），挂到一个隐藏的 `<Canvas>` 渲染一次帧，调用 `GLTFExporter.parse()`，POST 结果到 `/__export-glb/upload`（dev server middleware 接收）。
   - 服务端 middleware 把 binary 写到 `public/assets/skins/_demo/egg-exported.glb`。
   - 触发完成后从 URL 移除 `/__export-glb`，避免被 Playwright 反复访问。

2. `scripts/export-demo-glb.mjs`:
   - `node --import tsx scripts/export-demo-glb.mjs`：启动 `vite dev`，用 Playwright 打开 `http://localhost:8080/__export-glb`，等待下载完成 binary。

3. **备选路径**：若 R3F + Playwright 跑不通（DOM 渲染异常），改为手工：用户在自己的 Mac 上手动跑一次 `npm run dev`，访问 `/__export-glb`，浏览器触发下载，把 `.glb` 放到 `public/assets/skins/_demo/`。这一步骤在实施时再决定。

#### 3b — Asset Validator

1. `scripts/validate-skin-asset.mjs`:
   - 输入：GLB 路径
   - 用 `@gltf-transform/core` `WebIO` 读取 → `Document`
   - 提取 triangle count / textures / materials / bounding box / animations / skeleton
   - 写 `public/assets/skins/_demo/egg-exported.asset-manifest.json`
   - 计算 GLB binary sha256

2. `scripts/validate-skin-asset.test.mjs`:
   - fixture：mock 一个最小 GLB binary（用 `@gltf-transform/extensions` 构建）或读 `public/assets/skins/_demo/egg-exported.glb`
   - assert：输出 schema 完整；`triangleCount > 0`；`materials >= 1`；`fileSizeKB > 0`；**每个字段含 `requiredLevel`**

#### 3c — Asset Quality Gate（业务级门，PR13）

1. `scripts/quality-gate.mjs`:
   - 读 `public/assets/skins/_demo/egg-exported.asset-manifest.json` + Skin `role` (`test` | `production`)
   - 按 design.md §C 阈值表检查：
     - Required 失败 → `valid: false` + `errors: [...]`
     - Recommended 失败 → `valid: true` + `warnings: [...]`
     - Optional / Deferred 缺失 → 静默
   - 写 `public/assets/skins/_demo/egg-exported.quality-gate-report.json`
   - 命令：`node scripts/quality-gate.mjs <glb-path> --role <test|production>`

2. `scripts/quality-gate.test.mjs`:
   - 用 `role: test` 跑 demo GLB → 期望 `valid: true`、warnings 可能非空（demo 是 test asset，缺 PBR/Skeleton/Animation 是 OK 的）
   - 用 `role: production` 跑 demo GLB → 期望 `valid: false` 或 `valid: true` + `warnings: [...]`（具体由阈值决定，**Demo 在 production role 下应产生 warnings**）
   - 用 mock GLB 触发 NaN / 文件大小超限 → 期望 `valid: false` + 对应 error
   - 用 mock GLB 触发 `Mesh == 0` → 期望 reject
   - 用 mock GLB 触发 `bounding box 退化` → 期望 reject

3. **Demo GLB 在 `docs/skins/third-party-assets.md` 中标注** `role: runtime-integration-test`，并引用 R5.2 / R13 防止后续 Agent 误判。

### 验证命令

```bash
node scripts/validate-skin-asset.mjs public/assets/skins/_demo/egg-exported.glb
cat public/assets/skins/_demo/egg-exported.asset-manifest.json
node scripts/quality-gate.mjs public/assets/skins/_demo/egg-exported.glb --role test
cat public/assets/skins/_demo/egg-exported.quality-gate-report.json
npm run test
```

### 回滚

删除新增文件 + binary + manifest + quality-gate-report。

---

## P4 — SkinAssetLoader + CharacterVisual

### 前置

P3 通过（demo GLB + manifest 已存在）。

### 新增文件

```
src/engine/skin-asset/loader.ts
src/engine/skin-asset/__tests__/loader.test.ts
src/components/CharacterVisual.tsx
src/components/__tests__/character-visual.test.tsx   # 视觉快照测试（playwright？）
```

### 修改文件

```
src/components/EggMesh.tsx          # 不改实现，只确认 export 的接口名稳定
src/components/CharacterVisual.tsx  # 新增
src/game/character-presentation.ts  # 不改（仅复用）
```

### 详细步骤

1. **`loader.ts`**:

   ```ts
   import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
   import type { Group } from "three";
   
   const cache = new Map<string, Promise<Group>>();
   
   export async function loadSkinAsset(skinId: string, url: string): Promise<Group> {
     if (cache.has(skinId)) return cache.get(skinId)!;
     const promise = (async () => {
       const res = await fetch(url);
       if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
       const buf = await res.arrayBuffer();
       const loader = new GLTFLoader();
       return new Promise<Group>((resolve, reject) => {
         loader.parse(buf, "", (gltf) => resolve(gltf.scene), reject);
       });
     })();
     cache.set(skinId, promise);
     return promise;
   }
   
   export function clearSkinAssetCache(skinId?: string) { ... }
   export function preloadSkinAsset(skinId: string, url: string): void { ... }
   ```

2. **测试**:
   - `loader.test.ts`：mock `fetch`，传入 ArrayBuffer；断言 cache 命中（第二次调用不调用 fetch）。
   - `loader.test.ts`：fallback 路径（404）抛错。

3. **`CharacterVisual.tsx`**:

   ```tsx
   export function CharacterVisual({ skinId, presentation, time }: Props) {
     const skin = getSkin(skinId);
     if (skin.kind === "model" && skin.modelUrl) {
       return <ModelVisual skin={skin} presentation={presentation} time={time} />;
     }
     return <EggMesh /* 现有 props */ />;
   }
   
   function ModelVisual({ skin, presentation, time }) {
     const { scene, error } = useSkinAsset(skin.id, skin.modelUrl!);
     if (error || !scene) return <EggMesh />; // fallback
     const pose = getCharacterPose(presentation, time);
     const profile = skin.presentationProfile ?? defaultPresentationProfile;
     return (
       <group scale={profile.scale} position-y={profile.verticalOffset + pose.lift}>
         <primitive object={scene.clone()} />
         <ContactShadow pose={getContactShadowPose(presentation)} />
       </group>
     );
   }
   ```

### 验证命令

```bash
npm run typecheck
npm run lint
npm run test
npm run dev    # 浏览器打开 → 进入 gameplay → 确认蛋仔正常显示
```

### 回滚

`CharacterVisual` 是新文件，不替换现有 `EggMesh` 调用点；删除即可完全回滚。

---

## P5 — Wardrobe / Gacha / Preview / 文档

### 前置

P4 通过。

### 修改文件

```
src/components/Hub.tsx          # Wardrobe 卡片增加 "光蛋 · GLB" 选项
src/components/GameUI.tsx        # Title 页面（若有 skin 选择）
src/components/GachaCeremony.tsx # 抽到 model skin 时的展示
src/routes/dev/skin-preview.tsx  # 新增 dev-only 路由
```

### 新增文件

```
src/components/DeveloperSkinPreview.tsx
src/routes/dev/skin-preview.tsx
docs/skins/character-asset-contract.md
docs/skins/asset-pipeline.md
docs/skins/third-party-assets.md
docs/skins/skin-generation.md
```

### 详细步骤

1. **Hub.tsx Wardrobe**: 在现有 12 个 skin 卡片下方加 Demo Model 卡片，使用 `presentationProfile` 应用 transform。
2. **GachaCeremony.tsx**: 抽到 `kind === "model"` 时，ceremony 末尾展示 CharacterVisual 静态版本。
3. **Preview 页面**:
   - `src/routes/dev/skin-preview.tsx`：dev-only 路由，URL `?skin=<id>` 加载。
   - `DeveloperSkinPreview.tsx`：360° 旋转 / Zoom / Auto Rotate / Asset Info panel。
   - `vite.config.ts` 加 `if (import.meta.env.DEV)` guard 把这个路由 tree-shake 掉。
4. **文档**（四个 docs）:
   - `character-asset-contract.md`：写 GLB 规格 / Manifest schema / 禁止项。
   - `asset-pipeline.md`：Provider 架构图 / Server Boundary / Mock → 真实切换步骤。
   - `third-party-assets.md`：`egg-exported.glb` 来源（`scripts/export-demo-glb.mjs`） + 许可证（project-internal）。
   - `skin-generation.md`：Grok prompt 模板 + Meshy/Rodin API 摘要 + `create-skin` Skill 用法 + 引用 `concept-art/bear-explorer-brief.md`。

### 验证命令

```bash
npm run dev
# 浏览器打开 http://localhost:8080/dev/skin-preview?skin=egg_demo_model
# 确认 360° 旋转 + zoom + asset info 正常
# 浏览器进入 gameplay，确认蛋仔跑跳正常
# Wardrobe 切换 Demo Model，确认 visual 一致
npm run typecheck
npm run lint
npm run test
npm run build
```

### 回滚

新增文件直接删除；Hub/Gacha 改动 revert 即可。

---

## P6 — Skill + Trellis Spec + 最终验证

### 前置

P5 通过。

### 新增文件

```
.agents/skills/create-skin/SKILL.md
.trellis/spec/frontend/skin-system.md
```

### 详细步骤

1. **`create-skin/SKILL.md`** — 8 步流程，引用本任务所有新增模块：

   ```markdown
   ---
   name: create-skin
   description: ...
   ---
   
   # create-skin
   
   ## Workflow
   1. Skin Design — 收集用户输入
   2. Concept Prompt — 调用 .grok/ 通道生成概念图 prompt
   3. Asset Generation Request — 调用 factory.create(providerKind).generateFromImage(...)
      ⚠️ 若 MissingApiKeyError：停止，明确报告缺少 MESHY_API_KEY / RODIN_API_KEY
      ⚠️ 禁止伪造 GLB
   4. Asset Manifest — node scripts/validate-skin-asset.mjs <glb>
   5. SkinDefinition — 写入 src/game/skins.ts 的 SKINS 数组
   6. Wardrobe Registration — 确认 Hub.tsx 卡片可见
   7. Gacha Registration — 确认抽卡池覆盖（可不在 GACHA_COST 计算中）
   8. QA Report — 输出 .trellis/tasks/<task>/qa-report.md
   ```

2. **`.trellis/spec/frontend/skin-system.md`** — 只写稳定规则：

   - Skin 类型扩展后兼容性策略（参考 R1）
   - Provider 接口契约（参考 design.md §4）
   - Server Boundary 规则（API Key 不进前端 bundle）
   - Asset Validator 调用入口（`node scripts/validate-skin-asset.mjs <path>`）
   - 持久化 v5 升级规则（参考 CLAUDE.md）

   **不写**：占位 GLB 路径、临时实验、未验证 API 示例。

### 验证命令

```bash
npm run typecheck
npm run lint
npm run test
npm run build
node scripts/validate-skin-asset.mjs public/assets/skins/_demo/egg-exported.glb
# 应该输出 valid: true

# 验收硬性 grep
git grep -E "MESHY|RODIN|TRELLIS" -- ':!*.md' ':!*.lock' ':!.trellis/**'   # 必须 0 匹配
```

### 验收清单（最终）

- [ ] 12 个现有 Skin 全部仍可被 `getSkin(id)` 找到
- [ ] `pullSkin(owned)` 输出格式未变
- [ ] Home / Gameplay / Wardrobe / Gacha / Victory / Gacha Ceremony 视觉无回归
- [ ] `Demo Model` 在 Wardrobe 可见
- [ ] `/dev/skin-preview?skin=egg_demo_model` 在 dev mode 可见，360° 旋转 + zoom 工作
- [ ] `asset-report.json` 中 triangleCount > 0
- [ ] 4 个 Provider 类骨架完整，MockProvider 真实可调用
- [ ] 4 篇 docs 完成
- [ ] `.agents/skills/create-skin/SKILL.md` 完成
- [ ] `.trellis/spec/frontend/skin-system.md` 只含稳定规则
- [ ] `npm run typecheck` / `npm run lint` / `npm run test` / `npm run build` 全 pass
- [ ] `git grep -E "MESHY|RODIN|TRELLIS"` 在源码 + 非 md/lock/trellis 路径下 0 匹配

### 回滚

Skill + Spec 是新增内容；删除即可。Spec 路径需谨慎（已有 `.trellis/spec/frontend/` 内容），回滚时只删 `skin-system.md`。

---

## Validation Commands 速查

```bash
# 每阶段必跑
npm run typecheck
npm run lint
npm run test

# P3 必跑
node scripts/validate-skin-asset.mjs public/assets/skins/_demo/egg-exported.glb
node scripts/quality-gate.mjs public/assets/skins/_demo/egg-exported.glb --role test
# 期望 quality-gate-report.valid: true

# P5 必跑
npm run build

# 最终验收
npm run typecheck && npm run lint && npm run test && npm run build
git grep -E "MESHY|RODIN|TRELLIS" -- ':!*.md' ':!*.lock' ':!.trellis/**'
```

## Follow-up Before `task.py start`

- [x] prd.md / design.md / implement.md 已写完（含 R13 Quality Gate + 4 点微调）
- [x] 用户对最终规划摘要已批准（含 4 点微调）
- [ ] `task.py start` 启动任务
- [ ] 子代理 manifest 已 curate（`implement.jsonl` + `check.jsonl`）

## Risky Files / Rollback Points

| 文件 / 路径 | 风险 | 回滚手段 |
|---|---|---|
| `src/game/skins.ts` | 类型扩展破坏 12 个现有 skin | revert；保留 v4→v5 兼容层 |
| `src/game/store.ts` | v5 升级丢字段 | migrate 函数用 `Partial<PersistV5>` 输入；revert |
| `src/components/CharacterVisual.tsx` | model 路径渲染崩溃 | fallback 回 EggMesh clone |
| `src/components/CharacterVisual.tsx` | `presentationProfile.scale` 错配污染 Gameplay | 单测覆盖：`scale` 错配时 `sim.ts` / `EggRacer.tsx` 物理参数零变化 |
| `scripts/quality-gate.mjs` | test role 与 production role 阈值混淆 | 单测覆盖两条路径；`QualityGateRejectedError` 抛错；`quality-gate-report.json` schema 锁定 |
| `public/assets/skins/_demo/egg-exported.glb` | 后续 Agent 误以为是生产资产 | `third-party-assets.md` 显式标注 `role: runtime-integration-test`，引用 R5.2 / R13 |
| `scripts/export-demo-glb.mjs` + `src/routes/__export-glb.tsx` | R3F + Playwright 跑不通 | 改为浏览器手工导出 |
| `src/routes/dev/skin-preview.tsx` | dev-only guard 漏 → 进生产 build | 用 `import.meta.env.DEV` ternary 把整个文件包起来 |
| `package.json` 加 `@gltf-transform/core` | 体积影响 iOS build | 评估 + 备选手写 GLB parser（高风险） |