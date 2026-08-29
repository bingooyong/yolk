# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目

**Yolk Rush / 蛋黄冲刺** — 3D 蛋仔障碍赛跑。玩家操控蛋形角色跑过主题关卡（草甸、雪原等），可冲、跳、收集蛋币和护盾糖；蛋币用于抽糖果盲盒换皮肤（皮肤只改外观）。目标平台 iPhone / iPad，通过 `native/ios/` 中的 Xcode 工程以 WKWebView 加载打包好的 web 资源运行。

UI 文案为中文（带 ASCII 英文标签如 `Start · 开始比赛`）。

## 常用命令

```bash
npm install                    # 安装依赖
npm run dev                    # 启动开发服务器（监听 0.0.0.0:8080）
npm run build                  # 生产构建（Vercel preset）+ 运行数据库迁移
npm run build:dev              # 开发模式构建
npm run build:ios              # 打包到 native/ios/YolkRush/www/，供 Xcode 使用
npm run preview                # 预览生产构建（127.0.0.1:8081）
npm run preview:restart        # 重启 preview 守护
npm run preview:stop          # 停止 preview 守护

npm run typecheck              # tsc --noEmit
npm run lint                   # eslint .
npm run format                 # prettier --write .
npm run test                   # node --test，涵盖 scripts/**/*.test.mjs
                               #   以及 src/lib/app-data 和 src/lib/auth 的 .test.ts
npm run check:auth             # 检查 auth 不变量（见 scripts/check-auth-invariant.mjs）
npm run db:migrate             # 单独跑迁移
npm run audio:bgm              # Python 生成 BGM（scripts/generate_bgm.py）
```

**开发服务器硬约束**：`host: "0.0.0.0"` 和 `port: 8080` 是实时预览的契约，不要改（`vite.config.ts` 注释明确说明）。

## 架构概览

项目是 **TanStack Start** 应用骨架 + 一个独立的 **iOS native shell**。两条构建路径从同一个 `src/` 出发展开。

### 双构建路径

| 目标 | 入口 | 配置 | 输出 |
|---|---|---|---|
| Web | `src/router.tsx` → `src/routes/__root.tsx` | `vite.config.ts`（TanStack Start + Nitro + Vercel preset + PWA） | `.output/`（部署到 Vercel） |
| iOS | `src/native-entry.tsx` | `vite.native.config.ts`（独立 root = `native/`） | `native/ios/YolkRush/www/` |

Web 路径通过 `vite.config.ts` 把 `src/native-entry.tsx` 排除，外壳路径完全跳过 TanStack Start。两个入口最终都挂载 `<GameApp />` 并启动同一个 React 应用。

### 核心模块（`src/`）

- **`components/`** — React 外壳层
  - `GameApp.tsx` — 顶层组件，安装输入、阻止手势缩放/右键、按可见性暂停音频；挂载 `<GameCanvas>` + `<MusicDirector>` + `<GameUI>` + `<TouchControls>`
  - `GameUI.tsx` — HUD、标题页（比赛/抽卡 Tab）、关卡选择、暂停、结算页
  - `TouchControls.tsx` — iOS 触屏手柄
  - `GachaCeremony.tsx` — 抽卡动画
  - `ui/` — Radix 包装的 Button、Card 等基础控件
- **`game/`** — 引擎（自研 + R3F）
  - `sim.ts` — 物理与逻辑模拟的纯数据层（player + AI racers、关卡进度、撞陷阱/掉落检测）
  - `levels.ts` — 关卡定义（surface / mover / hammer / spinner / pickup / wind zone / trap tile）
  - `store.ts` — **Zustand 单一 store**：游戏阶段（title/countdown/playing/paused/results）、HUD、抽卡、皮肤、关卡进度；持久化到 `localStorage` key `yolk-rush-v4`（带 v3/v2/v1 兼容回退）
  - `EggRacer.tsx` / `EggMesh.tsx` / `Track.tsx` — R3F 场景组件
  - `CameraRig.tsx` — 第三人称跟随相机（位置跟、不跟旋转 — 见 `GameUI.tsx` 玩法说明）
  - `input.ts` — 键盘 + 触屏动作收集（每帧消费 `actions` / `touch` 命名空间）
  - `audio.ts` + `MusicDirector.tsx` — 音乐 + 音效
  - `skins.ts` — 皮肤数据 + 抽卡概率 + 重复返还 `DUP_REFUND`
  - `config.ts` — 全局常量（`EGG_COLORS`、`DASH` 等）
- **`engine/`** — 跨场景工具：`device.ts`、`haptics.ts`、`pipeline.ts`
- **`lib/`**
  - `auth/` — Better Auth 集成，含 client/server/popup/gate-session/gate-identity/pglite-dialect；**`src/lib/db.ts` 是 server-only**，从浏览器调用会抛错
  - `app-data/` — server-only 数据访问层（含 `.test.ts`）
  - `db.ts` — 双数据库后端抽象
  - `multiplayer/` — P2P 多人
  - `og/` — Open Graph 静态资源
- **`routes/`** — TanStack Start 文件路由（当前只有 `/` = 游戏页）

### 数据库后端（`src/lib/db.ts`）

- 生产 / 配置了 `DATABASE_URL` → **Neon**（node-postgres pool）
- 没设 `DATABASE_URL` → **PGLite**（Postgres-on-WASM，进程内嵌内存数据库）
- 两个后端统一通过 `Sql` 接口暴露（tagged-template + `.query()`），并在解析层对齐 int8/date/interval 返回类型
- schema 在 `migrations/*.sql`（注意非递归：可选 `migrations/auth/` 不会自动应用）
- PGLite 启动后自动应用未执行的迁移；Vite dev server 通过 `pgliteBootstrapPlugin` 在 `configureServer` 中提前 `ensureDbReady()`

### 关键 Vite 插件链（`vite.config.ts`）

顺序很关键：
1. `pgliteBootstrapPlugin()` — dev 期预先打开 PGLite
2. `authPopupPlugin()` — **必须排在 `tanstackStart()` 之前**，拦截 `/auth/popup` 走 Better Auth，否则会被 SPA 路由吞掉
3. `appEnvPlugin()` — dev-only `/__app-env` 端点
4. `grokPwaPlugin()` — PWA head 与 `?install=1` 安装引导页
5. `tailwindcss()`
6. `tanstackStart()`
7. `nitro({ preset: "vercel", serverDir: "./server" })` — 仅 `build` / `preview` 启用，自动加载 `server/middleware/*`
8. `viteReact()`

## 测试

```bash
npm run test
```

测试用 **Node 内置 `node --test`**（不依赖 vitest/jest）：
- `scripts/**/*.test.mjs` — 构建脚本、迁移计划、预览脚本、原子写入等
- `src/lib/app-data/app-data.test.ts` — 数据层
- `src/lib/auth/gate-identity.test.ts` — 身份门控
- 其它 `*.test.ts` 暂未列入 npm script（保持 npm run test 启动开销小）

新加测试文件时，把 `.mjs` 测试放进 `scripts/`，把 `.ts` 测试放进对应 lib 模块并视情况扩 `npm run test` 脚本。

## 路径别名

`@/*` 映射 `src/*`（`tsconfig.json` + `vite.config.ts` 的 `tsconfigPaths: true`）。在 `vite.native.config.ts` 里手动配 `resolve.alias`。

## 持久化

- **游戏存档**：`localStorage` key `yolk-rush-v4`（`src/game/store.ts`）
- **Auth session**：Better Auth 默认 cookie 存储
- **不要**把 secret 写进代码或提交

## iOS 打包

```bash
npm run build:ios    # 输出到 native/ios/YolkRush/www/
```

然后用 Xcode 打开 `native/ios/YolkRush.xcodeproj`，Signing 选你的 Apple ID，连接设备点 Run。WKWebView 会从本地 `www/` 加载打包后的 web 应用。

## TypeScript

- `strict: true` + `isolatedModules: true`
- `allowJs` / `checkJs` 为 true — `src/lib/db.ts` 导入 `scripts/migration-plan.mjs`，类型由 checkJs 提供
- 路径 `@/*` → `src/*`

## ESLint / Prettier

- Flat config（`eslint.config.mjs`），关闭了 `no-explicit-any`，unused vars 用 `^_` 前缀豁免
- `react-refresh/only-export-components` 警告级，常量导出允许
- Prettier：单引号禁用、尾随逗号全部、行宽 100

## 已知约束与陷阱

1. **不要改 `0.0.0.0:8080`** — 实时预览契约依赖此端口
2. **不要新建 `src/routes/auth/popup.tsx`** — 该路径被 `authPopupPlugin` 抢占，写 React 路由会被 SPA 接管导致登录弹窗坏掉
3. **`getSql()` 不能在客户端调用** — 会在浏览器抛错（"server-only"）
4. **不要绕过 Nitro 的 `serverDir: "./server"`** — 删掉会让 `server/middleware/grok-pwa.ts` 失联，PWA 安装页 `/?install=1` 失效
5. **store.ts 的 `SAVE_KEY` 升级规则** — 改了 schema 要新增 `v5` 兼容旧 key，不要原地改 `Persist` 类型后丢失玩家存档
7. **PGLite 实例挂在 `globalThis` 上** — HMR 多模块实例会共享同一池，不要在模块顶层 new `PGlite()`