import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LEVELS, SKY_GAPS, platformGap, platformTop, type Platform } from "./levels.ts";

const sky = LEVELS.sky;

function byId(id: string): Platform {
  const p = sky.platforms.find((item) => item.id === id);
  assert.ok(p, `missing platform ${id}`);
  return p;
}

describe("Level 4 sky blockout", () => {
  it("keeps the safe line at x=0 so bots can compile it", () => {
    for (const id of [
      "start",
      "intro",
      "land1",
      "jelly",
      "isle2",
      "mid",
      "hopA",
      "hopB",
      "hopC",
      "jelly2",
      "land2",
      "final",
    ]) {
      const p = byId(id);
      assert.equal(p.pos[0], 0, id);
      assert.ok(platformTop(p) > -0.5, id);
    }
  });

  it("teaches jump with pits walk cannot clear", () => {
    const first = platformGap(byId("intro"), byId("land1"));
    assert.ok(Math.abs(first - SKY_GAPS.jump) < 0.05, `first jump ${first}`);
    const hops = platformGap(byId("hopA"), byId("hopB"));
    assert.ok(Math.abs(hops - SKY_GAPS.jump) < 0.05, `hop jump ${hops}`);
    const hop2 = platformGap(byId("hopB"), byId("hopC"));
    assert.ok(Math.abs(hop2 - SKY_GAPS.jump) < 0.05, `hop2 jump ${hop2}`);
  });

  it("puts high islands off the bot line", () => {
    for (const id of ["highA", "highB", "highFin"]) {
      assert.ok(Math.abs(byId(id).pos[0]) >= 4.2, id);
      assert.ok(platformTop(byId(id)) > 1.5, id);
    }
    for (const wp of sky.waypoints) {
      assert.ok(Math.abs(wp.x) < 4.2, `bot wp x=${wp.x}`);
    }
  });

  it("keeps recovery under the pits and out of compile", () => {
    for (const id of ["recJump", "recJelly", "recHop", "recFin"]) {
      assert.ok(platformTop(byId(id)) < -0.5, id);
    }
    const recIds = new Set(
      sky.platforms.filter((p) => p.id.startsWith("rec")).map((p) => p.id),
    );
    for (const wp of sky.waypoints) {
      const hit = sky.platforms.find(
        (p) => Math.abs(p.pos[2] - wp.z) < 0.05 && Math.abs(p.pos[0] - wp.x) < 0.05,
      );
      if (hit) assert.equal(recIds.has(hit.id), false, hit.id);
    }
  });

  it("is bounce and island jumps, not a gadget parade", () => {
    assert.equal(sky.hammers.length, 0);
    assert.equal(sky.spinners.length, 0);
    assert.equal(sky.pendulums.length, 0);
    assert.equal(sky.movers.length, 0);
    assert.equal(sky.winds.length, 0);
    assert.equal(sky.gates.length, 0);
    assert.equal(byId("jelly").kind, "bounce");
    assert.equal(byId("jelly2").kind, "bounce");
    assert.ok(sky.platforms.every((p) => p.kind !== "ice" && p.kind !== "conveyor"));
    const bounceGap = platformGap(byId("jelly"), byId("isle2"));
    assert.ok(Math.abs(bounceGap - SKY_GAPS.jump) < 0.05, `bounce gap ${bounceGap}`);
    assert.ok(bounceGap <= 4.4, `bounce gap must not force a bot dash ${bounceGap}`);
  });

  it("is a party-length sky course", () => {
    const span = sky.startZ - sky.finishZ;
    assert.ok(span >= 120, `span ${span}`);
    assert.equal(sky.theme.stars, 3);
    assert.ok(sky.checkpoints.length >= 3);
  });
});
