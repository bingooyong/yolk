export type Rarity = "common" | "rare" | "epic" | "legendary";

export type SkinKind = "none" | "hat" | "wings" | "cape" | "ears" | "halo" | "crown";

export type Skin = {
  id: string;
  name: string;
  rarity: Rarity;
  kind: SkinKind;
  tint: string;
  hat?: "sprout" | "bow" | "star" | "leaf" | "antenna" | "tuft";
};

export const SKINS: Skin[] = [
  { id: "plain", name: "光蛋", rarity: "common", kind: "none", tint: "#FFF6EB" },
  { id: "sprout", name: "小芽", rarity: "common", kind: "hat", tint: "#2DB8A1", hat: "sprout" },
  { id: "bow", name: "蝴蝶结", rarity: "common", kind: "hat", tint: "#E08AA4", hat: "bow" },
  { id: "starlet", name: "小星", rarity: "common", kind: "hat", tint: "#E8C85A", hat: "star" },
  { id: "mint_wings", name: "薄荷翅", rarity: "rare", kind: "wings", tint: "#2DB8A1" },
  { id: "sky_wings", name: "晴空翅", rarity: "rare", kind: "wings", tint: "#5BAFE0" },
  { id: "star_cape", name: "星尘披风", rarity: "rare", kind: "cape", tint: "#A99AD6" },
  { id: "bunny", name: "兔耳", rarity: "rare", kind: "ears", tint: "#FFF6EB" },
  { id: "sunset_wings", name: "晚霞翅", rarity: "epic", kind: "wings", tint: "#E8614A" },
  { id: "cloud_wings", name: "云朵翅", rarity: "epic", kind: "wings", tint: "#FFF6EB" },
  { id: "halo", name: "蛋光圈", rarity: "epic", kind: "halo", tint: "#E8C85A" },
  { id: "crown", name: "金蛋冠", rarity: "legendary", kind: "crown", tint: "#E8C85A" },
];

export const STARTER_SKINS = ["plain", "sprout", "mint_wings"];
export const GACHA_COST = 80;
export const DUP_REFUND = 25;

const WEIGHT: Record<Rarity, number> = {
  common: 60,
  rare: 28,
  epic: 10,
  legendary: 2,
};

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
  const skin = pool[Math.floor(Math.random() * pool.length)] ?? SKINS[0];
  return { skin, duplicate: owned.includes(skin.id) };
}

export function placeReward(place: number, finished: boolean) {
  if (!finished) return 12;
  if (place === 1) return 90;
  if (place === 2) return 55;
  if (place === 3) return 40;
  return 22;
}

export function getSkin(id: string) {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}
