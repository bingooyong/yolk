import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  FEATURED_GACHA_SKIN_ID,
  SKINS,
  STARTER_SKINS,
  VISUAL_IDS,
  getSkin,
  isModelSkin,
  listSkins,
  pullSkin,
  unlockLabel,
} from "./skins.ts";

/* ────────────────────────────────────────────────────────────────────────
 * R14 — the 12 procedural Skins are the project's hard baseline (CLAUDE.md
 * "12 个程序化 Skin 必须全部继续工作"). Every procedural entry must:
 *   - exist in the SKINS registry,
 *   - resolve via getSkin(id) without falling through to the default,
 *   - declare renderKind === "procedural" so CharacterVisual never tries
 *     to load a model for it.
 *
 * The Model Skin (`egg_demo_model`) is verified separately — it must be a
 * Model entry and is filtered out of the gacha pool by `assetRole: "test"`.
 * ──────────────────────────────────────────────────────────────────────── */

const PROCEDURAL_IDS = [
  "plain",
  "sprout",
  "bow",
  "starlet",
  "mint_wings",
  "sky_wings",
  "star_cape",
  "bunny",
  "sunset_wings",
  "cloud_wings",
  "halo",
  "crown",
];

describe("SKINS — catalog", () => {
  test("catalog includes yolk knight bear rabbit robot", () => {
    const ids = SKINS.map((s) => s.id);
    assert.ok(ids.includes("plain"));
    assert.ok(ids.includes("knight"));
    assert.ok(ids.includes("bear"));
    assert.ok(ids.includes("rabbit"));
    assert.ok(ids.includes("robot"));
    assert.equal(getSkin("knight").modelType, "full_character");
    assert.equal(getSkin("bear").visualId, "bear");
    assert.equal(getSkin("rabbit").visualId, "rabbit");
    assert.equal(getSkin("robot").category, "mecha");
    assert.equal(getSkin("knight").proceduralAnimation, "hero");
    assert.equal(getSkin("bear").proceduralAnimation, "bouncy");
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
    assert.ok(listSkins("animal").some((s) => s.id === "rabbit"));
    assert.ok(listSkins("mecha").some((s) => s.id === "robot"));
    assert.equal(listSkins("all").some((s) => s.assetRole === "test"), false);
    assert.equal(getSkin(FEATURED_GACHA_SKIN_ID).id, "knight");
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
    assert.equal(/skin(?:Id)? === ["']rabbit["']/.test(src), false);
    assert.equal(/skin(?:Id)? === ["']robot["']/.test(src), false);
    assert.ok(src.includes("CharacterVisual"));
  });
});

describe("SKINS — procedural baseline (R14)", () => {
  test("the 12 procedural baseline Skins are all present in the registry", () => {
    // CLAUDE.md: "12 个程序化 Skin 必须全部继续工作". Additional procedural
    // entries (e.g. `knight`, `bear` — full-character silhouettes) are
    // allowed; the invariant is that the 12 canonical procedural Skins stay
    // intact and continue to render procedurally.
    const proceduralIds = SKINS.filter((s) => s.renderKind === "procedural").map((s) => s.id);
    assert.equal(
      proceduralIds.length,
      PROCEDURAL_IDS.length + 4,
      `expected ${PROCEDURAL_IDS.length + 4} procedural Skins (12 baseline + knight/bear/rabbit/robot), got ${proceduralIds.length}: ${proceduralIds.join(", ")}`,
    );
    for (const id of PROCEDURAL_IDS) {
      assert.ok(
        proceduralIds.includes(id),
        `procedural baseline Skin "${id}" must stay in SKINS`,
      );
    }
  });

  test("every expected procedural id is registered with renderKind=procedural", () => {
    for (const id of PROCEDURAL_IDS) {
      const skin = SKINS.find((s) => s.id === id);
      assert.ok(skin, `procedural Skin "${id}" is missing from SKINS`);
      assert.equal(skin.renderKind, "procedural", `Skin "${id}" must stay procedural`);
    }
  });

  test("getSkin(id) resolves every procedural Skin without falling through to the default", () => {
    for (const id of PROCEDURAL_IDS) {
      const skin = getSkin(id);
      assert.equal(skin.id, id, `getSkin("${id}") returned a different Skin`);
      assert.equal(skin.renderKind, "procedural", `getSkin("${id}") must return a procedural Skin`);
      assert.equal(isModelSkin(id), false, `isModelSkin("${id}") must be false for procedural Skins`);
    }
  });

  test("getSkin returns the default ('plain') when the id is unknown", () => {
    const skin = getSkin("does-not-exist");
    assert.equal(skin.id, "plain");
    assert.equal(skin.renderKind, "procedural");
  });

  test("STARTER_SKINS includes 'plain' so new players have a usable Skin", () => {
    assert.ok(STARTER_SKINS.includes("plain"), "STARTER_SKINS must include 'plain'");
  });

  test("the model Skin 'egg_demo_model' is registered separately", () => {
    const skin = getSkin("egg_demo_model");
    assert.equal(skin.id, "egg_demo_model");
    assert.equal(skin.renderKind, "model", "egg_demo_model must remain a Model Skin");
    assert.equal(isModelSkin("egg_demo_model"), true);
  });

  test("the model Skin is filtered out of the gacha pool (assetRole: test)", () => {
    const skin = getSkin("egg_demo_model");
    assert.equal(skin.assetRole, "test", "egg_demo_model must stay assetRole:'test' so pullSkin() filters it out");
    // Roll the gacha many times and assert we never see a test asset.
    for (let i = 0; i < 200; i++) {
      const { skin: pulled } = pullSkin([]);
      assert.notEqual(pulled.assetRole, "test", `pullSkin() leaked a test asset on iteration ${i}: ${pulled.id}`);
    }
  });

  test("lab Image-to-3D pilot is a test Model Skin, hidden from default wardrobe", () => {
    const skin = getSkin("lab_img3d_pilot");
    assert.equal(skin.id, "lab_img3d_pilot");
    assert.equal(skin.renderKind, "model");
    assert.equal(skin.assetRole, "test");
    assert.equal(isModelSkin("lab_img3d_pilot"), true);
    assert.ok(STARTER_SKINS.includes("lab_img3d_pilot"));
    assert.equal(listSkins("all").some((s) => s.id === "lab_img3d_pilot"), false);
    assert.equal(listSkins("lab").some((s) => s.id === "lab_img3d_pilot"), true);
    assert.match(skin.assetManifest?.source ?? "", /Hunyuan3D-2/);
  });

  test("lab URL import slot is starter-owned, excluded from gacha", () => {
    const skin = getSkin("lab_user_import");
    assert.equal(skin.renderKind, "model");
    assert.equal(skin.assetRole, "test");
    assert.ok(STARTER_SKINS.includes("lab_user_import"));
    assert.equal(listSkins("lab").some((s) => s.id === "lab_user_import"), true);
    assert.equal(listSkins("all").some((s) => s.id === "lab_user_import"), false);
  });
});
