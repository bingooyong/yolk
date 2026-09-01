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
    const ontoJelly = platformGap(byId("hopC"), byId("jelly2"));
    assert.ok(Math.abs(ontoJelly - SKY_GAPS.jump) < 0.05, `onto jelly2 ${ontoJelly}`);
  });

  it("puts high islands off the bot line", () => {
    for (const id of ["highA", "highB", "highFin", "highFin2"]) {
      assert.ok(Math.abs(byId(id).pos[0]) >= 4.2, id);
      assert.ok(platformTop(byId(id)) > 1.4, id);
    }
    for (const wp of sky.waypoints) {
      assert.ok(Math.abs(wp.x) < 4.2, `bot wp x=${wp.x}`);
    }
  });

  it("makes the high chain a pounce problem, not a walk", () => {
    const a = platformGap(byId("highA"), byId("highB"));
    const b = platformGap(byId("highFin"), byId("highFin2"));
    assert.ok(Math.abs(a - SKY_GAPS.pounce) < 0.05, `high pounce ${a}`);
    assert.ok(Math.abs(b - SKY_GAPS.pounce) < 0.05, `finale pounce ${b}`);
    assert.ok(byId("hopB").size[0] < byId("hopA").size[0], "hopB is the commit");
    assert.ok(byId("hopC").size[0] > byId("hopA").size[0], "hopC is relief");
    assert.ok(byId("hopB").size[0] <= 6.4, "hopB is the narrow choke");
    assert.ok(byId("start").size[0] >= 18, "start is an arena spawn");
    assert.ok(byId("mid").size[0] >= 18, "mid is the sky arena");
    assert.ok(byId("final").size[0] >= 18, "finish is a celebrate plaza");
    assert.ok(byId("jelly").size[0] >= 12, "jelly is an overtake / run-right pad");
    assert.ok(byId("land1").size[0] >= 12, "land1 matches the approach");
    assert.ok(Math.abs(byId("highA").pos[0]) >= 7, "high islands are a room, not a shoulder");
    assert.ok(byId("hopC").size[2] >= 13, "hopC must fit a roll without dumping off the lip");
    const land2 = byId("land2");
    const recFin = byId("recFin");
    const recFront = recFin.pos[2] - recFin.size[2] / 2;
    const land2Front = land2.pos[2] - land2.size[2] / 2;
    assert.ok(recFront < land2Front - 2, "finale recovery continues under the finish plaza");
    const gate = sky.gates[0];
    assert.ok(gate, "roll cloud");
    const hopC = byId("hopC");
    const hopCBack = hopC.pos[2] + hopC.size[2] / 2;
    const hopCFront = hopC.pos[2] - hopC.size[2] / 2;
    assert.ok(gate.pos[2] < hopCBack - 4, "gate is after the landing");
    assert.ok(gate.pos[2] > hopCFront + 6, "roll ends before the next jump lip");
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
    assert.equal(sky.gates.length, 1, "one roll cloud after the hop relief");
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
