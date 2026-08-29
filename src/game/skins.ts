export type Rarity = "common" | "rare" | "epic" | "legendary";

export type SkinKind = "none" | "hat" | "wings" | "cape" | "ears" | "halo" | "crown" | "full";

export type SkinCategory = "yolk" | "animal" | "mecha" | "fantasy" | "festival" | "limited";

export type ModelType = "base" | "modular" | "full_character";

export type VisualId = "yolk" | "knight" | "bear";

export type AnimationProfile = "default" | "bouncy" | "hero";

export type SkinUnlock = "starter" | "gacha";

export type Skin = {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  kind: SkinKind;
  category: SkinCategory;
  tint: string;
  hat?: "sprout" | "bow" | "star" | "leaf" | "antenna" | "tuft";
  modelType: ModelType;
  visualId: VisualId;
  animationProfile: AnimationProfile;
  unlock: SkinUnlock;
  tags: string[];
};

function entry(
  partial: Omit<Skin, "description" | "category" | "modelType" | "visualId" | "animationProfile" | "unlock" | "tags"> &
    Partial<Skin>,
): Skin {
  const modular = partial.kind !== "none" && partial.kind !== "full";
  return {
    description: partial.description ?? "",
    category: partial.category ?? (partial.kind === "ears" ? "animal" : "yolk"),
    modelType: partial.modelType ?? (partial.kind === "full" ? "full_character" : modular ? "modular" : "base"),
    visualId: partial.visualId ?? "yolk",
    animationProfile: partial.animationProfile ?? "default",
    unlock: partial.unlock ?? "gacha",
    tags: partial.tags ?? [partial.kind],
    ...partial,
  } as Skin;
}

export const SKINS: Skin[] = [
  entry({
    id: "plain",
    name: "光蛋",
    description: "最初的蛋黄。",
    rarity: "common",
    kind: "none",
    tint: "#FFF6EB",
    unlock: "starter",
    tags: ["yolk", "base"],
  }),
  entry({ id: "sprout", name: "小芽", rarity: "common", kind: "hat", tint: "#2DB8A1", hat: "sprout", unlock: "starter" }),
  entry({ id: "bow", name: "蝴蝶结", rarity: "common", kind: "hat", tint: "#E08AA4", hat: "bow" }),
  entry({ id: "starlet", name: "小星", rarity: "common", kind: "hat", tint: "#E8C85A", hat: "star" }),
  entry({ id: "mint_wings", name: "薄荷翅", rarity: "rare", kind: "wings", tint: "#2DB8A1", unlock: "starter" }),
  entry({ id: "sky_wings", name: "晴空翅", rarity: "rare", kind: "wings", tint: "#5BAFE0" }),
  entry({ id: "star_cape", name: "星尘披风", rarity: "rare", kind: "cape", tint: "#A99AD6" }),
  entry({ id: "bunny", name: "兔耳", rarity: "rare", kind: "ears", tint: "#FFF6EB", category: "animal" }),
  entry({ id: "sunset_wings", name: "晚霞翅", rarity: "epic", kind: "wings", tint: "#E8614A" }),
  entry({ id: "cloud_wings", name: "云朵翅", rarity: "epic", kind: "wings", tint: "#FFF6EB" }),
  entry({ id: "halo", name: "蛋光圈", rarity: "epic", kind: "halo", tint: "#E8C85A", category: "fantasy" }),
  entry({ id: "crown", name: "金蛋冠", rarity: "legendary", kind: "crown", tint: "#E8C85A", category: "fantasy" }),
  entry({
    id: "knight",
    name: "黄金骑士",
    description: "远古竞技场的守护者。",
    rarity: "legendary",
    kind: "full",
    category: "fantasy",
    tint: "#C9A227",
    modelType: "full_character",
    visualId: "knight",
    animationProfile: "hero",
    tags: ["knight", "armor", "full"],
  }),
  entry({
    id: "bear",
    name: "蜜糖小熊",
    description: "圆滚滚的森林朋友。",
    rarity: "epic",
    kind: "full",
    category: "animal",
    tint: "#C47A3A",
    modelType: "full_character",
    visualId: "bear",
    animationProfile: "bouncy",
    tags: ["bear", "animal", "full"],
  }),
];

export const STARTER_SKINS = ["plain", "sprout", "mint_wings"];
export const GACHA_COST = 80;
export const DUP_REFUND = 25;
export const VISUAL_IDS: VisualId[] = ["yolk", "knight", "bear"];

const WEIGHT: Record<Rarity, number> = {
  common: 60,
  rare: 28,
  epic: 10,
  legendary: 2,
};

const FALLBACK = SKINS[0];

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

export function listSkins(category: SkinCategory | "all" = "all") {
  if (category === "all") return SKINS;
  return SKINS.filter((s) => s.category === category);
}

export function getSkin(id: string) {
  return SKINS.find((s) => s.id === id) ?? FALLBACK;
}

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
  const pool = SKINS.filter((s) => s.rarity === rarity);
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
