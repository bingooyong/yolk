import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FACTORY_GAPS, LEVELS, platformGap, platformTop, type Platform } from "./levels.ts";

const factory = LEVELS.factory;

function byId(id: string): Platform {
  const p = factory.platforms.find((item) => item.id === id);
  assert.ok(p, `missing platform ${id}`);
  return p;
}

describe("Level 3 factory blockout", () => {
  it("keeps the safe line at x=0 so bots can compile it", () => {
    for (const id of [
      "start",
      "intro",
      "ham1",
      "safe1",
      "hall2",
      "ham2a",
      "ham2b",
      "mid",
      "gap",
      "land",
      "finale",
      "final",
    ]) {
      const p = byId(id);
      assert.equal(p.pos[0], 0, id);
      assert.ok(platformTop(p) > -0.5, id);
    }
  });

  it("teaches jump with a pit walk cannot clear", () => {
    const gap = platformGap(byId("gap"), byId("land"));
    assert.ok(Math.abs(gap - FACTORY_GAPS.jump) < 0.05, `factory jump ${gap}`);
  });

  it("puts the catwalk off the bot line", () => {
    assert.ok(Math.abs(byId("catA").pos[0]) >= 4.2);
    assert.ok(Math.abs(byId("catB").pos[0]) >= 4.2);
    const catGap = platformGap(byId("catA"), byId("catB"));
    assert.ok(Math.abs(catGap - FACTORY_GAPS.jump) < 0.05, `catwalk jump ${catGap}`);
    for (const wp of factory.waypoints) {
      assert.ok(Math.abs(wp.x) < 4.2, `bot wp x=${wp.x}`);
    }
  });

  it("keeps recovery under the halls and out of compile", () => {
    for (const id of ["recHam1", "recHam2", "recJump"]) {
      assert.ok(platformTop(byId(id)) < -0.5, id);
    }
    const recIds = new Set(
      factory.platforms.filter((p) => p.id.startsWith("rec")).map((p) => p.id),
    );
    for (const wp of factory.waypoints) {
      const hit = factory.platforms.find(
        (p) => Math.abs(p.pos[2] - wp.z) < 0.05 && Math.abs(p.pos[0] - wp.x) < 0.05,
      );
      if (hit) assert.equal(recIds.has(hit.id), false, hit.id);
    }
  });

  it("is hammers and a jump, not a gadget parade", () => {
    assert.equal(factory.hammers.length, 4);
    assert.equal(factory.spinners.length, 0);
    assert.equal(factory.pendulums.length, 0);
    assert.equal(factory.movers.length, 0);
    assert.ok(factory.platforms.every((p) => p.kind !== "conveyor" && p.kind !== "ice"));
    assert.ok(byId("ham1").size[0] <= 7.4, "hammer pad must be too narrow to walk around");
    assert.ok(byId("start").size[0] >= 18);
    assert.ok(byId("mid").size[0] >= 18);
    assert.ok(byId("final").size[0] >= 18);
  });

  it("is a party-length factory course", () => {
    const span = factory.startZ - factory.finishZ;
    assert.ok(span >= 120, `span ${span}`);
    assert.equal(factory.theme.stars, 3);
    assert.ok(factory.checkpoints.length >= 3);
  });
});
