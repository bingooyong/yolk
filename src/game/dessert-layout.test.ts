import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DESSERT_GAPS, LEVELS, platformGap, platformLane, platformTop, type Platform } from "./levels.ts";

const dessert = LEVELS.dessert;

function byId(id: string): Platform {
  const p = dessert.platforms.find((item) => item.id === id);
  assert.ok(p, `missing platform ${id}`);
  return p;
}

describe("Level 6 dessert blockout", () => {
  it("keeps the safe line at x=0 so bots can compile it", () => {
    for (const id of [
      "start",
      "intro",
      "choco1",
      "cake1",
      "land1",
      "mid",
      "choco2",
      "cake2",
      "finale",
      "final",
    ]) {
      const p = byId(id);
      assert.equal(p.pos[0], 0, id);
      assert.equal(platformLane(p), "safe", id);
      assert.ok(platformTop(p) > -0.5, id);
    }
  });

  it("teaches jump on cake with a pit walk cannot clear", () => {
    const first = platformGap(byId("cake1"), byId("land1"));
    assert.ok(Math.abs(first - DESSERT_GAPS.jump) < 0.05, `cake jump ${first}`);
    const last = platformGap(byId("cake2"), byId("finale"));
    assert.ok(Math.abs(last - DESSERT_GAPS.jump) < 0.05, `finale jump ${last}`);
  });

  it("puts chocolate on the safe line and the highway off it", () => {
    assert.equal(byId("choco1").kind, "ice");
    assert.equal(byId("choco2").kind, "ice");
    assert.ok(byId("choco1").size[2] >= 13, "first chocolate fits a roll");
    assert.ok(byId("choco2").size[2] > byId("choco1").size[2], "second chocolate is the harder repeat");
    assert.ok(Math.abs(byId("syrup").pos[0]) >= 4.2);
    assert.equal(platformLane(byId("syrup")), "side");
    assert.equal(byId("syrup").kind, "ice");
    for (const wp of dessert.waypoints) {
      assert.ok(
        !dessert.platforms.some(
          (p) => p.id === "syrup" && Math.abs(p.pos[2] - wp.z) < 0.05 && Math.abs(p.pos[0] - wp.x) < 0.05,
        ),
        "bot wp on syrup highway",
      );
    }
  });

  it("keeps recovery under the cake pits and out of compile", () => {
    for (const id of ["recJump", "recFin"]) {
      assert.ok(platformTop(byId(id)) < -0.5, id);
    }
    const recIds = new Set(dessert.platforms.filter((p) => p.id.startsWith("rec")).map((p) => p.id));
    for (const wp of dessert.waypoints) {
      const hit = dessert.platforms.find(
        (p) => Math.abs(p.pos[2] - wp.z) < 0.05 && Math.abs(p.pos[0] - wp.x) < 0.05,
      );
      if (hit) assert.equal(recIds.has(hit.id), false, hit.id);
    }
  });

  it("is chocolate roll+boost, not a gadget parade", () => {
    assert.equal(dessert.hammers.length, 0);
    assert.equal(dessert.spinners.length, 0);
    assert.equal(dessert.pendulums.length, 0);
    assert.equal(dessert.movers.length, 0);
    assert.equal(dessert.winds.length, 0);
    assert.equal(dessert.traps.length, 0);
    assert.equal(dessert.gates.length, 2);
    assert.ok(dessert.platforms.every((p) => p.kind !== "bounce" && p.kind !== "conveyor"));
    assert.ok(dessert.platforms.filter((p) => p.kind === "ice").length >= 3);
    const dashGaps = dessert.waypoints.filter((wp) => wp.dash);
    assert.equal(dashGaps.length, 0, "safe line must not force a bot dash");
  });

  it("is a party-length dessert course", () => {
    const span = dessert.startZ - dessert.finishZ;
    assert.ok(span >= 120, `span ${span}`);
    assert.equal(dessert.theme.stars, 4);
    assert.ok(dessert.checkpoints.length >= 3);
    assert.ok(byId("start").size[0] >= 18);
    assert.ok(byId("mid").size[0] >= 18);
    assert.ok(byId("final").size[0] >= 18);
  });
});
