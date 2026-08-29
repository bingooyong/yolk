import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  SKINS,
  STARTER_SKINS,
  getSkin,
  isModelSkin,
} from "./skins.ts";

/**
 * R14 — the 12 procedural Skins are the project's hard baseline (CLAUDE.md
 * "12 个程序化 Skin 必须全部继续工作"). Every procedural entry must:
 *  - exist in the SKINS registry,
 *  - resolve via getSkin(id) without falling through to the default,
 *  - declare renderKind === "procedural" so CharacterVisual never tries
 *    to load a model for it.
 *
 * The Model Skin (`egg_demo_model`) is verified separately — it must be a
 * Model entry and is filtered out of the gacha pool by `assetRole: "test"`.
 */

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

describe("SKINS — procedural baseline (R14)", () => {
  test("there are exactly 12 procedural Skins in the registry", () => {
    const procedural = SKINS.filter((s) => s.renderKind === "procedural");
    assert.equal(
      procedural.length,
      12,
      `expected 12 procedural Skins, got ${procedural.length}: ${procedural.map((s) => s.id).join(", ")}`,
    );
  });

  test("every expected procedural id is registered with renderKind=procedural", () => {
    for (const id of PROCEDURAL_IDS) {
      const skin = SKINS.find((s) => s.id === id);
      assert.ok(skin, `procedural Skin "${id}" is missing from SKINS`);
      assert.equal(
        skin.renderKind,
        "procedural",
        `Skin "${id}" must stay procedural`,
      );
    }
  });

  test("getSkin(id) resolves every procedural Skin without falling through to the default", () => {
    for (const id of PROCEDURAL_IDS) {
      const skin = getSkin(id);
      assert.equal(skin.id, id, `getSkin("${id}") returned a different Skin`);
      assert.equal(
        skin.renderKind,
        "procedural",
        `getSkin("${id}") must return a procedural Skin`,
      );
      assert.equal(
        isModelSkin(id),
        false,
        `isModelSkin("${id}") must be false for procedural Skins`,
      );
    }
  });

  test("getSkin returns the default ('plain') when the id is unknown", () => {
    const skin = getSkin("does-not-exist");
    assert.equal(skin.id, "plain");
    assert.equal(skin.renderKind, "procedural");
  });

  test("STARTER_SKINS includes 'plain' so new players have a usable Skin", () => {
    assert.ok(
      STARTER_SKINS.includes("plain"),
      "STARTER_SKINS must include 'plain'",
    );
  });

  test("the model Skin 'egg_demo_model' is registered separately", () => {
    const skin = getSkin("egg_demo_model");
    assert.equal(skin.id, "egg_demo_model");
    assert.equal(
      skin.renderKind,
      "model",
      "egg_demo_model must remain a Model Skin",
    );
    assert.equal(isModelSkin("egg_demo_model"), true);
  });

  test("the model Skin is filtered out of the gacha pool (assetRole: test)", () => {
    const skin = getSkin("egg_demo_model");
    assert.equal(
      skin.assetRole,
      "test",
      "egg_demo_model must stay assetRole:'test' so pullSkin() filters it out",
    );
  });
});