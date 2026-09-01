import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LEVELS,
  MEADOW_GAPS,
  platformGap,
  platformTop,
  type Platform,
} from "./levels.ts";

const meadow = LEVELS.meadow;

function byId(id: string): Platform {
  const p = meadow.platforms.find((item) => item.id === id);
  assert.ok(p, `missing platform ${id}`);
  return p;
}

describe("Level 1 meadow blockout", () => {
  it("keeps the safe line at x=0 so bots can compile it", () => {
    for (const id of [
      "start",
      "path",
      "step1",
      "land1",
      "path2",
      "rollLane",
      "boostLane",
      "fork",
      "safeLane",
      "plaza",
      "gapA",
      "landj",
      "final",
    ]) {
      const p = byId(id);
      assert.equal(p.pos[0], 0, id);
      assert.ok(platformTop(p) > -0.5, id);
    }
  });

  it("teaches jump with a pit walk cannot clear", () => {
    const gap = platformGap(byId("step1"), byId("land1"));
    assert.ok(gap > 3.2 && gap < 3.8, `jump gap ${gap}`);
    const mix = platformGap(byId("gapA"), byId("landj"));
    assert.ok(mix > 3.2 && mix < 3.8, `mix gap ${mix}`);
  });

  it("puts pounce shortcut off the bot line with a longer pit", () => {
    const a = byId("pounceA");
    const b = byId("pounceB");
    assert.ok(Math.abs(a.pos[0]) >= 4.2);
    assert.ok(Math.abs(b.pos[0]) >= 4.2);
    const gap = platformGap(a, b);
    assert.ok(gap > 5.8 && gap < 6.8, `pounce gap ${gap}`);
  });

  it("keeps recovery under the jump pits and out of compile", () => {
    for (const id of ["recJump", "recPounce", "recMix"]) {
      assert.ok(platformTop(byId(id)) < -0.5, id);
    }
    const recIds = new Set(
      meadow.platforms.filter((p) => p.id.startsWith("rec")).map((p) => p.id),
    );
    for (const wp of meadow.waypoints) {
      const hit = meadow.platforms.find(
        (p) => Math.abs(p.pos[0] - wp.x) < 0.2 && Math.abs(p.pos[2] - wp.z) < 0.2,
      );
      assert.ok(!hit || !recIds.has(hit.id), `waypoint on recovery ${hit?.id}`);
    }
  });

  it("does not put pounce or risk pads on bot waypoints", () => {
    const side = meadow.platforms.filter(
      (p) => p.id.startsWith("pounce") || p.id.startsWith("risk"),
    );
    for (const p of side) {
      assert.ok(
        !meadow.waypoints.some((wp) => Math.abs(wp.x - p.pos[0]) < 0.2 && Math.abs(wp.z - p.pos[2]) < 0.2),
        p.id,
      );
    }
  });

  it("marks jump on the two safe-line pits and never dash-only on the main line", () => {
    const jumps = meadow.waypoints.filter((wp) => wp.jump);
    assert.ok(jumps.length >= 2, `jump waypoints ${jumps.length}`);
    assert.equal(
      meadow.waypoints.filter((wp) => wp.dash).length,
      0,
      "safe line must not require dash/pounce",
    );
  });

  it("has roll gates, a shortcut, a recovery, and a dual route", () => {
    assert.equal(meadow.gates.length, 2);
    assert.ok(meadow.platforms.some((p) => p.id.startsWith("pounce")));
    assert.ok(meadow.platforms.some((p) => p.id.startsWith("risk")));
    assert.ok(meadow.platforms.some((p) => p.id.startsWith("rec")));
    assert.ok(meadow.checkpoints.length >= 3);
  });

  it("is a party-length course, not a 10-second strip", () => {
    const span = meadow.startZ - meadow.finishZ;
    assert.ok(span > 120, `span ${span}`);
    assert.ok(span < 200, `span ${span}`);
    assert.equal(MEADOW_GAPS.jump, 3.45);
    assert.equal(MEADOW_GAPS.pounce, 6.25);
    assert.ok(byId("start").size[0] >= 18, "start plaza");
    assert.ok(byId("plaza").size[0] >= 18, "mid arena");
    assert.ok(byId("final").size[0] >= 18, "finish plaza");
    assert.ok(byId("boostLane").size[0] >= 14, "boost is an overtake");
  });
});
