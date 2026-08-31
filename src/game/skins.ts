export type Rarity = "common" | "rare" | "epic" | "legendary";

/**
 * Visual category for procedural skins. Kept for wardrobe categorization.
 * For runtime path choice use `renderKind`.
 *
 * `"full"` is reserved for full-character silhouettes (KnightMesh, BearMesh)
 * that REPLACE the yolk visually.
 */
export type SkinKind = "none" | "hat" | "wings" | "cape" | "ears" | "halo" | "crown" | "full";

export type SkinCategory = "yolk" | "animal" | "mecha" | "fantasy" | "festival" | "limited";

export type SkinListFilter = SkinCategory | "all" | "lab";

export type ModelType = "base" | "modular" | "full_character";

/**
 * Design-level visual identity. Routes procedural full-character meshes
 * (KnightMesh, BearMesh) through `SKIN_VISUALS`. Does NOT drive GLB loading.
 * For Model Skins use `renderKind: "model"`.
 */
export type VisualId = "yolk" | "knight" | "bear" | "rabbit" | "robot";

/**
 * Procedural-animation profile string. Used by procedural full-character
 * meshes (KnightMesh, BearMesh). Independent of the structured
 * `AnimationProfile` below used by Model Skin manifests.
 */
export type AnimationStyle = "default" | "bouncy" | "hero";

export type SkinUnlock = "starter" | "gacha";

/**
 * Render-time discriminator. Drives CharacterVisual routing:
 *   procedural → EggMesh (current path)
 *   model      → SkinAssetLoader.load + presentationProfile
 *
 * SkinSystem addition per `08-29-skin-3d-pipeline`. Adding the field does not
 * break any existing reader because the field defaults to "procedural" when
 * absent and the loader / registry only consults it for Model-path.
 */
export type RenderKind = "procedural" | "model";

export type HatKind = "sprout" | "bow" | "star" | "leaf" | "antenna" | "tuft";

/**
 * Per-skin transform-only profile. Applied by CharacterVisual on top of the
 * render asset — must never affect physics / movement / ability timing.
 *
 * Defaults (scale 1.0, offsets 0) match the existing procedural EggMesh so a
 * freshly authored Skin slots in without surprises.
 */
export type PresentationProfile = {
  scale: number;
  verticalOffset: number;
  rotationOffset: { x: number; y: number; z: number };
  contactShadowScale: number;
};

export type AssetRole = "test" | "production";

/**
 * Animation contract for Model Skins. The first Model Skin ships as a static
 * GLB; once AI pipelines (Meshy / Rodin) produce animations, this struct grows.
 */
export type AnimationProfile = {
  status: "static" | "embedded";
  defaultClip?: string;
  loop?: boolean;
};

/**
 * Reference to the asset-manifest.json that ships next to the GLB. Validator
 * + Quality Gate write the report; CharacterVisual only reads the references.
 *
 * Numbers MUST come from real GLB inspection (see Asset Validator contract) —
 * `0` in any numeric field is treated as an invalid asset.
 */
export type AssetManifestRef = {
  id: string;
  version: number;
  format: "glb";
  model: string;
  thumbnail?: string;
  triangleCount: number;
  textureResolution: number;
  animations: string[];
  skeleton: boolean;
  lod: { lod0?: string; lod1?: string; lod2?: string };
  license: string;
  source: string;
  generatedAt: string;
  sha256: string;
};

export type Skin = {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  kind: SkinKind;
  category: SkinCategory;
  tint: string;
  hat?: HatKind;

  /** Design-level visual identity for procedural full-character meshes. */
  modelType: ModelType;
  visualId: VisualId;
  /**
   * Procedural-animation style (`default | bouncy | hero`) consumed by
   * procedural full-character meshes. NOT the structured AnimationProfile
   * used by Model Skin manifests — that one lives under `animationProfile`
   * alongside `modelUrl`.
   */
  proceduralAnimation: AnimationStyle;
  /** How the player unlocks this Skin (starter kit vs gacha). */
  unlock: SkinUnlock;
  /** Free-form tags for UI grouping. */
  tags: string[];

  /** Discriminates render path. Defaults to "procedural" for legacy entries. */
  renderKind: RenderKind;

  /** Required when renderKind === "model". */
  modelUrl?: string;
  lod0?: string;
  lod1?: string;
  lod2?: string;
  /** Structured animation metadata for Model Skins (GLB-side). */
  animationProfile?: AnimationProfile;
  presentationProfile?: PresentationProfile;
  assetManifest?: AssetManifestRef;

  /** Marks this Model Skin as test asset vs production asset for Quality Gate thresholds. */
  assetRole?: AssetRole;
};

function entry(
  partial: Partial<Skin> & {
    id: string;
    name: string;
    rarity: Rarity;
    kind: SkinKind;
    tint: string;
    renderKind?: RenderKind;
  },
): Skin {
  const modular = partial.kind !== "none" && partial.kind !== "full";
  const renderKind: RenderKind = partial.renderKind ?? "procedural";
  return {
    description: partial.description ?? "",
    category:
      partial.category ?? (partial.kind === "ears" ? "animal" : partial.kind === "full" ? "fantasy" : "yolk"),
    modelType:
      partial.modelType ?? (partial.kind === "full" ? "full_character" : modular ? "modular" : "base"),
    visualId: partial.visualId ?? "yolk",
    proceduralAnimation: partial.proceduralAnimation ?? "default",
    unlock: partial.unlock ?? "gacha",
    tags: partial.tags ?? [partial.kind],
    renderKind,
    ...partial,
  };
}

export const SKINS: Skin[] = [
  entry({ id: "plain", name: "光蛋", description: "最初的蛋黄。", rarity: "common", kind: "none", tint: "#FFF6EB", unlock: "starter", tags: ["yolk", "base"], renderKind: "procedural" }),
  entry({ id: "sprout", name: "小芽", rarity: "common", kind: "hat", tint: "#2DB8A1", hat: "sprout", unlock: "starter", renderKind: "procedural" }),
  entry({ id: "bow", name: "蝴蝶结", rarity: "common", kind: "hat", tint: "#E08AA4", hat: "bow", renderKind: "procedural" }),
  entry({ id: "starlet", name: "小星", rarity: "common", kind: "hat", tint: "#E8C85A", hat: "star", renderKind: "procedural" }),
  entry({ id: "mint_wings", name: "薄荷翅", rarity: "rare", kind: "wings", tint: "#2DB8A1", unlock: "starter", renderKind: "procedural" }),
  entry({ id: "sky_wings", name: "晴空翅", rarity: "rare", kind: "wings", tint: "#5BAFE0", renderKind: "procedural" }),
  entry({ id: "star_cape", name: "星尘披风", rarity: "rare", kind: "cape", tint: "#A99AD6", renderKind: "procedural" }),
  entry({ id: "bunny", name: "兔耳", rarity: "rare", kind: "ears", tint: "#FFF6EB", category: "animal", renderKind: "procedural" }),
  entry({ id: "sunset_wings", name: "晚霞翅", rarity: "epic", kind: "wings", tint: "#E8614A", renderKind: "procedural" }),
  entry({ id: "cloud_wings", name: "云朵翅", rarity: "epic", kind: "wings", tint: "#FFF6EB", renderKind: "procedural" }),
  entry({ id: "halo", name: "蛋光圈", rarity: "epic", kind: "halo", tint: "#E8C85A", category: "fantasy", renderKind: "procedural" }),
  entry({ id: "crown", name: "金蛋冠", rarity: "legendary", kind: "crown", tint: "#E8C85A", category: "fantasy", renderKind: "procedural" }),
  // Full-character procedural silhouettes routed through visualId.
  entry({
    id: "knight",
    name: "黄金骑士",
    description: "远古竞技场的守护者。",
    rarity: "legendary",
    kind: "full",
    category: "fantasy",
    tint: "#C9A227",
    visualId: "knight",
    proceduralAnimation: "hero",
    tags: ["knight", "armor", "full"],
    renderKind: "procedural",
  }),
  entry({
    id: "bear",
    name: "蜜糖小熊",
    description: "圆滚滚的森林朋友。",
    rarity: "epic",
    kind: "full",
    category: "animal",
    tint: "#C47A3A",
    visualId: "bear",
    proceduralAnimation: "bouncy",
    tags: ["bear", "animal", "full"],
    renderKind: "procedural",
  }),
  entry({
    id: "rabbit",
    name: "绒绒兔",
    description: "爱蹦爱跳的月下朋友。",
    rarity: "epic",
    kind: "full",
    category: "animal",
    tint: "#F4E4D4",
    visualId: "rabbit",
    proceduralAnimation: "bouncy",
    tags: ["rabbit", "animal", "full"],
    renderKind: "procedural",
  }),
  entry({
    id: "robot",
    name: "闪光机甲",
    description: "会发光的赛场护卫。",
    rarity: "legendary",
    kind: "full",
    category: "mecha",
    tint: "#7A90A8",
    visualId: "robot",
    proceduralAnimation: "hero",
    tags: ["robot", "mecha", "full"],
    renderKind: "procedural",
  }),
  // Demo Model — runtime integration test asset. NOT a production character.
  // Generated by scripts/export-demo-glb.mjs. See docs/skins/third-party-assets.md.
  entry({
    id: "egg_demo_model",
    name: "光蛋 · GLB",
    rarity: "rare",
    kind: "none",
    tint: "#FFF6EB",
    renderKind: "model",
    modelUrl: "/assets/skins/_demo/egg-exported.glb",
    lod0: "/assets/skins/_demo/egg-exported.glb",
    lod1: "/assets/skins/_demo/egg-exported.glb",
    lod2: "/assets/skins/_demo/egg-exported.glb",
    animationProfile: { status: "static" },
    presentationProfile: {
      scale: 1.0,
      verticalOffset: 0,
      rotationOffset: { x: 0, y: 0, z: 0 },
      contactShadowScale: 1.0,
    },
    assetRole: "test",
    unlock: "starter",
  }),
  // Free Image-to-3D lab pilot. NOT a production character, excluded from gacha.
  // Mesh from tencent/Hunyuan3D-2 (Turbo shape_generation) + PBR/normal repair.
  // See docs/skins/third-party-assets.md.
  entry({
    id: "lab_img3d_pilot",
    name: "实验室 · 蛋冠",
    description: "Hunyuan3D-2 免费试作。不进抽卡。",
    rarity: "rare",
    kind: "full",
    category: "fantasy",
    tint: "#F2C14E",
    renderKind: "model",
    modelUrl: "/assets/skins/lab_img3d_pilot/lod0.glb",
    lod0: "/assets/skins/lab_img3d_pilot/lod0.glb",
    lod1: "/assets/skins/lab_img3d_pilot/lod0.glb",
    lod2: "/assets/skins/lab_img3d_pilot/lod0.glb",
    animationProfile: { status: "static" },
    presentationProfile: {
      scale: 1.28,
      verticalOffset: 0.02,
      rotationOffset: { x: 0, y: 0, z: 0 },
      contactShadowScale: 1.15,
    },
    assetManifest: {
      id: "lab_img3d_pilot",
      version: 1,
      format: "glb",
      model: "/assets/skins/lab_img3d_pilot/lod0.glb",
      triangleCount: 139412,
      textureResolution: 0,
      animations: [],
      skeleton: false,
      lod: {
        lod0: "/assets/skins/lab_img3d_pilot/lod0.glb",
        lod1: "/assets/skins/lab_img3d_pilot/lod0.glb",
        lod2: "/assets/skins/lab_img3d_pilot/lod0.glb",
      },
      license: "Tencent Hunyuan 3D Community License + project concept art",
      source: "tencent/Hunyuan3D-2 Hugging Face Space",
      generatedAt: "2026-08-31T08:29:57.667Z",
      sha256: "a6984dd6499abdd08011a7f45ff4571de0e9ab6bceb4229d7d4e28277c5eaa57",
    },
    assetRole: "test",
    unlock: "starter",
    tags: ["lab", "img3d", "full", "hunyuan"],
  }),
  entry({
    id: "lab_user_import",
    name: "实验室 · 导入",
    description: "粘贴 Hunyuan GLB 公开链接即可预览。不进抽卡。",
    rarity: "rare",
    kind: "full",
    category: "fantasy",
    tint: "#F2C14E",
    renderKind: "model",
    modelUrl: "/assets/skins/lab_user_import/lod0.glb",
    lod0: "/assets/skins/lab_user_import/lod0.glb",
    lod1: "/assets/skins/lab_user_import/lod0.glb",
    lod2: "/assets/skins/lab_user_import/lod0.glb",
    animationProfile: { status: "static" },
    presentationProfile: {
      scale: 1.28,
      verticalOffset: 0.02,
      rotationOffset: { x: 0, y: 0, z: 0 },
      contactShadowScale: 1.15,
    },
    assetRole: "test",
    unlock: "starter",
    tags: ["lab", "img3d", "import"],
  }),
];

export const STARTER_SKINS = [
  "plain",
  "sprout",
  "mint_wings",
  "egg_demo_model",
  "lab_img3d_pilot",
  "lab_user_import",
];
export const GACHA_COST = 80;
export const DUP_REFUND = 25;
export const VISUAL_IDS: VisualId[] = ["yolk", "knight", "bear", "rabbit", "robot"];
/** Featured character on the gacha panel. Cosmetic copy only — pull weights stay unchanged. */
export const FEATURED_GACHA_SKIN_ID = "knight";

const WEIGHT: Record<Rarity, number> = {
  common: 60,
  rare: 28,
  epic: 10,
  legendary: 2,
};

const FALLBACK: Skin = SKINS[0];

export function rarityLabel(r: Rarity) {
  return { common: "普通", rare: "稀有", epic: "史诗", legendary: "传说" }[r];
}

export function rarityColor(r: Rarity) {
  return {
    common: "#C4B8AA",
    rare: "#5BAFE0",
    epic: "#A99AD6",
    legendary: "#E8C85A",
  }[r];
}

export function unlockLabel(kind: SkinUnlock) {
  return kind === "starter" ? "起始解锁" : "高级盲盒";
}

export function listSkins(category: SkinListFilter = "all") {
  if (category === "lab") return SKINS.filter((s) => s.assetRole === "test");
  const list = category === "all" ? SKINS : SKINS.filter((s) => s.category === category);
  return list.filter((s) => s.assetRole !== "test");
}

export function getSkin(id: string): Skin {
  return SKINS.find((s) => s.id === id) ?? FALLBACK;
}

/**
 * Convenience helper. Equivalent to `getSkin(id).renderKind === "model"`.
 * Falls back to `"procedural"` when the Skin is missing so callers can use
 * it without an existence check.
 */
export function getRenderKind(id: string): RenderKind {
  return getSkin(id).renderKind;
}

/**
 * True iff this Skin must be loaded through SkinAssetLoader.
 */
export function isModelSkin(id: string): boolean {
  return getRenderKind(id) === "model";
}

export const DEFAULT_PRESENTATION_PROFILE: PresentationProfile = {
  scale: 1.0,
  verticalOffset: 0,
  rotationOffset: { x: 0, y: 0, z: 0 },
  contactShadowScale: 1.0,
};

export function pullSkin(owned: string[]): { skin: Skin; duplicate: boolean } {
  const roll = Math.random() * 100;
  let acc = 0;
  let rarity: Rarity = "common";
  (Object.keys(WEIGHT) as Rarity[]).some((r) => {
    acc += WEIGHT[r];
    if (roll < acc) {
      rarity = r;
      return true;
    }
    return false;
  });
  // Gacha must never hand out a runtime-integration-test asset — players
  // can only obtain `egg_demo_model` (and any future `assetRole: "test"`
  // skins) through the starter list or operator tooling. See R5.2.
  const pool = SKINS.filter(
    (s) => s.rarity === rarity && s.assetRole !== "test",
  );
  const skin = pool[Math.floor(Math.random() * pool.length)] ?? FALLBACK;
  return { skin, duplicate: owned.includes(skin.id) };
}

export function placeReward(place: number, finished: boolean) {
  if (!finished) return 12;
  if (place === 1) return 90;
  if (place === 2) return 55;
  if (place === 3) return 40;
  return 22;
}
