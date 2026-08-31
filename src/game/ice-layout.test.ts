import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ICE_GAPS, LEVELS, platformGap, platformTop, type Platform } from "./levels.ts";

const ice = LEVELS.ice;

function byId(id: string): Platform {
  const p = ice.platforms.find((item) => item.id === id);
  assert.ok(p, `missing platform ${id}`);
  return p;
}

describe("Level 2 ice blockout", () => {
  it("keeps the safe line at x=0 so bots can compile it", () => {
    for (const id of [
      "start",
      "ice1",
      "gap",
      "ice2",
      "lane",
      "tongue",
      "mid",
      "water",
      "land",
      "slide",
      "land2",
      "final",
    ]) {
      const p = byId(id);
      assert.equal(p.pos[0], 0, id);
      assert.ok(platformTop(p) > -0.5, id);
    }
  });

  it("teaches jump on ice with a pit walk cannot clear", () => {
    const gap = platformGap(byId("gap"), byId("ice2"));
    assert.ok(Math.abs(gap - ICE_GAPS.jump) < 0.05, `ice jump ${gap}`);
    const water = platformGap(byId("water"), byId("land"));
    assert.ok(Math.abs(water - ICE_GAPS.jump) < 0.05, `water jump ${water}`);
  });

  it("puts crack risk and the floe off the bot line", () => {
    assert.ok(Math.abs(byId("crackR").pos[0]) >= 4.2);
    assert.ok(Math.abs(byId("crackR2").pos[0]) >= 4.2);
    for (const wp of ice.waypoints) {
      assert.ok(Math.abs(wp.x) < 4.2, `bot wp x=${wp.x}`);
    }
    assert.equal(ice.movers.length, 1);
    assert.ok(Math.abs((ice.movers[0].from[0] + ice.movers[0].to[0]) / 2) >= 4.2);
  });

  it("keeps recovery under the pits and out of compile", () => {
    for (const id of ["recIce", "crackL", "recWater"]) {
      assert.ok(platformTop(byId(id)) < -0.5, id);
    }
    const recIds = new Set(["recIce", "recIce2", "recIce3", "crackL", "recWater", "recWater2"]);
    for (const wp of ice.waypoints) {
      const hit = ice.platforms.find(
        (p) => Math.abs(p.pos[2] - wp.z) < 0.05 && Math.abs(p.pos[0] - wp.x) < 0.05,
      );
      if (hit) assert.equal(recIds.has(hit.id), false, hit.id);
    }
  });

  it("is a party-length ice course", () => {
    const span = ice.startZ - ice.finishZ;
    assert.ok(span >= 120, `span ${span}`);
    assert.ok(ice.theme.stars === 2);
  });
});
