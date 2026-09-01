import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CLOUD_GAPS, LEVELS, platformGap, platformLane, platformTop, type Platform } from "./levels.ts";

const cloud = LEVELS.cloud;

function byId(id: string): Platform {
  const p = cloud.platforms.find((item) => item.id === id);
  assert.ok(p, `missing platform ${id}`);
  return p;
}

describe("Level 7 cloud blockout", () => {
  it("keeps the safe line at x=0 so bots can compile it", () => {
    for (const id of [
      "start",
      "intro",
      "cross1",
      "rest1",
      "land1",
      "mid",
      "stream",
      "land2",
      "cross2",
      "finale",
      "final",
    ]) {
      const p = byId(id);
      assert.equal(p.pos[0], 0, id);
      assert.equal(platformLane(p), "safe", id);
      assert.ok(platformTop(p) > -0.5, id);
    }
  });

  it("teaches jump with pits walk cannot clear", () => {
    const first = platformGap(byId("rest1"), byId("land1"));
    assert.ok(Math.abs(first - CLOUD_GAPS.jump) < 0.05, `first jump ${first}`);
    const last = platformGap(byId("stream"), byId("land2"));
    assert.ok(Math.abs(last - CLOUD_GAPS.jump) < 0.05, `stream jump ${last}`);
  });

  it("puts the jet stream off the bot line", () => {
    assert.ok(Math.abs(byId("jet").pos[0]) >= 4.2);
    assert.equal(platformLane(byId("jet")), "side");
    assert.ok(byId("jet").size[0] <= 6.4, "jet is a narrow greedy line");
    for (const wp of cloud.waypoints) {
      assert.ok(
        !cloud.platforms.some(
          (p) => p.id === "jet" && Math.abs(p.pos[2] - wp.z) < 0.05 && Math.abs(p.pos[0] - wp.x) < 0.05,
        ),
        "bot wp on jet",
      );
    }
  });

  it("keeps recovery under winds and pits, out of compile", () => {
    for (const id of ["recCross", "recJump", "recFin", "recCrossB"]) {
      assert.ok(platformTop(byId(id)) < -0.5, id);
    }
    const recIds = new Set(cloud.platforms.filter((p) => p.id.startsWith("rec")).map((p) => p.id));
    for (const wp of cloud.waypoints) {
      const hit = cloud.platforms.find(
        (p) => Math.abs(p.pos[2] - wp.z) < 0.05 && Math.abs(p.pos[0] - wp.x) < 0.05,
      );
      if (hit) assert.equal(recIds.has(hit.id), false, hit.id);
    }
  });

  it("is wind sprint, not a gadget parade", () => {
    assert.equal(cloud.hammers.length, 0);
    assert.equal(cloud.spinners.length, 0);
    assert.equal(cloud.pendulums.length, 0);
    assert.equal(cloud.movers.length, 0);
    assert.equal(cloud.gates.length, 0);
    assert.equal(cloud.traps.length, 0);
    assert.ok(cloud.platforms.every((p) => p.kind !== "ice" && p.kind !== "bounce" && p.kind !== "conveyor"));
    assert.equal(cloud.winds.length, 4);
    const cross = cloud.winds.find((w) => w.id === "wCross1");
    assert.ok(cross && cross.force[0] > 6, "first wind is a crosswind");
    const tail = cloud.winds.find((w) => w.id === "wStream");
    assert.ok(tail && tail.force[2] < -4, "stream is a tailwind");
    const dashGaps = cloud.waypoints.filter((wp) => wp.dash);
    assert.equal(dashGaps.length, 0);
  });

  it("is a party-length cloud course", () => {
    const span = cloud.startZ - cloud.finishZ;
    assert.ok(span >= 120, `span ${span}`);
    assert.equal(cloud.theme.stars, 4);
    assert.ok(cloud.checkpoints.length >= 3);
    assert.ok(byId("rest1").size[0] <= 8.2, "rest after crosswind does not catch a drifted walker");
    assert.ok(byId("mid").size[0] >= 18);
    assert.ok(byId("final").size[0] >= 18);
  });
});
