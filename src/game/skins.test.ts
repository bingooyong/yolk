import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { getSkin, listSkins, SKINS, unlockLabel, VISUAL_IDS } from "./skins.ts";

test("catalog includes yolk knight bear", () => {
  const ids = SKINS.map((s) => s.id);
  assert.ok(ids.includes("plain"));
  assert.ok(ids.includes("knight"));
  assert.ok(ids.includes("bear"));
  assert.equal(getSkin("knight").modelType, "full_character");
  assert.equal(getSkin("bear").visualId, "bear");
  assert.equal(getSkin("knight").animationProfile, "hero");
  assert.equal(getSkin("bear").animationProfile, "bouncy");
  assert.equal(getSkin("missing-id").id, "plain");
});

test("every visualId is registered", () => {
  for (const skin of SKINS) {
    assert.ok(VISUAL_IDS.includes(skin.visualId), skin.id);
  }
});

test("fantasy category includes knight", () => {
  assert.ok(listSkins("fantasy").some((s) => s.id === "knight"));
  assert.ok(listSkins("animal").some((s) => s.id === "bear"));
});

test("unlock copy is data-driven", () => {
  assert.equal(unlockLabel("starter"), "起始解锁");
  assert.equal(unlockLabel("gacha"), "高级盲盒");
  assert.equal(getSkin("knight").unlock, "gacha");
  assert.equal(getSkin("plain").unlock, "starter");
});

test("EggRacer does not branch on full character ids", () => {
  const src = readFileSync(new URL("./EggRacer.tsx", import.meta.url), "utf8");
  assert.equal(/skin(?:Id)? === ["']bear["']/.test(src), false);
  assert.equal(/skin(?:Id)? === ["']knight["']/.test(src), false);
  assert.ok(src.includes("CharacterVisual"));
});
