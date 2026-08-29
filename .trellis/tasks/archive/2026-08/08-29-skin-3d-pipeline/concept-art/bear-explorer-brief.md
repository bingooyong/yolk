# 小熊探险家 — Asset Brief

> 本文件由用户在规划阶段提供概念图后整理，作为后续 Meshy / Rodin Image-to-3D 调用的输入包。
> 当前任务 `08-29-skin-3d-pipeline` 不实际执行 AI 3D 生成（无 API Key），但本 brief 准备好后，**第 3 阶段 Trellis 任务可一键调用**。

---

## Source Art

- 来源：用户提供 / Grok 生成的概念图
- 计划存放路径：`.trellis/tasks/08-29-skin-3d-pipeline/concept-art/bear-explorer.png`
- 许可证：自有项目素材（无外部 IP）
- 用途：Yolk Rush 原创角色，无商业 IP 风险

## Subject

- **身份**：圆滚滚的 Q 版小熊
- **姿态**：自然站立，双手自然下垂，双脚分开，正面朝向镜头
- **头部**：略大于身体比例（Q 版）
- **表情**：眼睛大而闪亮（深棕色虹膜 + 高光），黑色椭圆鼻头，嘴部为简单弧线微笑
- **四肢**：短而有力，毛绒质感
- **镜头**：正面全身，能完整看到从帽顶到靴底的所有结构

## Outfit

| 部位 | 描述 | 颜色（近似） | 材质 |
|---|---|---|---|
| 探险家帽 | 宽檐软帽、皮革帽带、金属扣 | 帽体 `#6B4A2E`、皮革 `#3E2A1A`、金属扣 `#C9A14A` | 毛毡 + 真皮 + 黄铜 |
| 围巾 | 三角折叠、围绕颈部 | `#5B7048`（深森林绿） | 棉麻织物，可见编织纹 |
| 黄色背包 | 圆顶、双肩带、带侧袋 | 主体 `#C99A3A`、皮革扣带 `#5B3A1F` | 帆布 + 真皮 |
| 腰带 | 中等宽度、方扣 | 皮革 `#5B3A1F`、扣 `#C9A14A` | 真皮 + 黄铜 |
| 短靴 | 中筒、鞋面有扣带 | 靴体 `#6B4A2E`、扣 `#C9A14A` | 真皮 + 橡胶底 |
| 腰包（小） | 挂腰带右侧 | `#5B3A1F` | 真皮 |

## Props

挂在腰带右侧、探险工具用途：

1. **银色登山扣**（Karabiner）— `#A8B0B5`
2. **黄铜怀表**（圆盘表面 + 刻度）— `#C9A14A`
3. **小型罗盘 / 望远镜**（圆柱状）— 暗银 `#7A8086`

## Color Palette（主导）

```
毛绒棕   #8B5A38   主体
深棕     #5B3A1F   皮革
森林绿   #5B7048   围巾
芥末黄   #C99A3A   背包
黄铜     #C9A14A   金属扣件
背景灰   #BFBFBF
眼睛棕   #5A3416   虹膜
```

## Materials

- **毛绒（fur）**：高密度短毛，柔和粗糙度变化，避免塑料感
- **皮革（leather）**：哑光、有表面划痕
- **布料（cotton/canvas）**：可见编织纹
- **金属（brass）**：高光、反射环境

## Lighting & Background

- 背景：纯色浅灰 `#BFBFBF`
- 光照：柔和 studio lighting，主光来自右上前方
- 阴影：地面接触阴影清晰
- 无文字 / 无 Logo / 无场景元素

## Silhouette & Symmetry

- **轮廓**：清晰独立，毛绒轮廓有自然的颗粒感
- **左右对称**：基本对称；右侧多挂怀表 / 罗盘 / 登山扣，左侧干净（轻微非对称，识别度更高）
- **遮挡**：帽子未遮挡脸部；围巾未遮挡下巴；背包肩带清晰可见

## Second-Level Detail（关键，避免被 AI 3D 简化丢失）

- 帽檐皮革带上的针脚
- 背包金属扣件的阴影
- 围巾褶皱层次
- 腰带皮革表面的微弱纹理
- 怀表刻度盘细节
- 靴子鞋面缝线
- 毛绒边缘的"飞毛"质感

## 3D Generation Suitability

| 维度 | 评估 | 备注 |
|---|---|---|
| 单角色 | ✅ 合格 | 无场景元素干扰 |
| 正面全身 | ✅ 合格 | 完整轮廓 |
| 对称姿态 | ✅ 合格 | 双手自然下垂 |
| 纯背景 | ✅ 合格 | 浅灰无纹理 |
| 遮挡控制 | ✅ 合格 | 帽子不挡脸 |
| 漂浮元素 | ✅ 合格 | 无 |
| 道具复杂度 | ⚠️ 中等 | 怀表 / 罗盘 / 登山扣——GLB 后处理可能需要简化 |
| 纹理复杂度 | ⚠️ 中等 | 毛绒纹理对 PBR 解算有挑战，可能需要降采样 |

**建议**：
- Meshy 调用时使用 `topology: quad` + `target_polycount: 30000` 作为第一轮
- 若毛绒 / 皮革质感丢失，第二轮切换 `texture: high` + 手动 PBR 增强
- 道具（怀表 / 罗盘）若生成失败，作为后续手工追加子件（不进本任务范围）

## Meshy 调用草稿（未来第 3 阶段使用）

```json
{
  "image_url": "<concept-art/bear-explorer.png>",
  "model_type": "standard",
  "topology": "quad",
  "target_polycount": 30000,
  "texture_resolution": 2048,
  "enable_pbr": true,
  "output_format": ["glb"]
}
```

## Rodin 调用草稿（备用）

```json
{
  "input_images": ["<concept-art/bear-explorer.png>"],
  "geometry_file_format": "glb",
  "material": "PBR",
  "quality": "high",
  "preview_render": true
}
```

## Deferred（不在本任务）

- 真实 Meshy / Rodin 调用（依赖 API Key）
- 道具简化 / 二次 PBR 增强
- 与 EggMesh 同台对比验证