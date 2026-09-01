import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LEVELS, PIRATE_GAPS, platformGap, platformTop, type Platform } from "./levels.ts";

const pirate = LEVELS.pirate;

function byId(id: string): Platform {
  const p = pirate.platforms.find((item) => item.id === id);
  assert.ok(p, `missing platform ${id}`);
  return p;
}

describe("Level 5 pirate blockout", () => {
  it("keeps the safe line at x=0 so bots can compile it", () => {
    for (const id of [
      "start",
      "intro",
      "land1",
      "lane",
      "safe1",
      "ship1",
      "ship2",
      "mid",
      "gap",
      "land2",
      "finale",
      "final",
    ]) {
      const p = byId(id);
      assert.equal(p.pos[0], 0, id);
      assert.ok(platformTop(p) > -0.5, id);
    }
  });

  it("teaches collapse then jump", () => {
    const first = platformGap(byId("intro"), byId("land1"));
    assert.ok(Math.abs(first - PIRATE_GAPS.drop) < 0.05, `drop teach ${first}`);
    const ships = platformGap(byId("ship1"), byId("ship2"));
    assert.ok(Math.abs(ships - PIRATE_GAPS.jump) < 0.05, `ship pit ${ships}`);
    const dock = platformGap(byId("gap"), byId("land2"));
    assert.ok(Math.abs(dock - PIRATE_GAPS.connect) < 0.05, `post-ship dock ${dock}`);
    const last = platformGap(byId("finale"), byId("final"));
    assert.ok(Math.abs(last - PIRATE_GAPS.jump) < 0.05, `finale pit ${last}`);
  });

  it("puts the left drop pier off the bot line", () => {
    const pier = pirate.traps.filter((t) => t.pos[0] <= -4.2);
    assert.ok(pier.length >= 12, `pier tiles ${pier.length}`);
    assert.ok(pier.every((t) => t.drops));
    assert.ok(pier.every((t) => t.delay >= 0.45), "run delay lets hold-W live");
    for (const wp of pirate.waypoints) {
      assert.ok(Math.abs(wp.x) < 4.2, `bot wp x=${wp.x}`);
    }
  });

  it("fills the first pit with fast-dropping stripes", () => {
    const introFront = byId("intro").pos[2] - byId("intro").size[2] / 2;
    const landBack = byId("land1").pos[2] + byId("land1").size[2] / 2;
    const teach = pirate.traps.filter(
      (t) =>
        Math.abs(t.pos[0]) < 4.2 && t.pos[2] < introFront && t.pos[2] > landBack && t.drops,
    );
    assert.ok(teach.length >= 3, `teach tiles ${teach.length}`);
    assert.ok(
      teach.every((t) => t.delay <= 0.02),
      "teach delay must drop a walker on the first frame",
    );
  });

  it("keeps recovery under the pits and out of compile", () => {
    for (const id of ["recPit1", "recShips", "recFin"]) {
      assert.ok(platformTop(byId(id)) < -0.5, id);
    }
    for (const id of ["recPit1b", "recShipsb", "recFin2"]) {
      assert.ok(Math.abs(byId(id).pos[0]) >= 4.2, id);
    }
    const recIds = new Set(
      pirate.platforms.filter((p) => p.id.startsWith("rec")).map((p) => p.id),
    );
    for (const wp of pirate.waypoints) {
      const hit = pirate.platforms.find(
        (p) => Math.abs(p.pos[2] - wp.z) < 0.05 && Math.abs(p.pos[0] - wp.x) < 0.05,
      );
      if (hit) assert.equal(recIds.has(hit.id), false, hit.id);
    }
  });

  it("is drop planks and jumps, not a gadget parade", () => {
    assert.equal(pirate.hammers.length, 0);
    assert.equal(pirate.spinners.length, 0);
    assert.equal(pirate.pendulums.length, 0);
    assert.equal(pirate.movers.length, 0);
    assert.equal(pirate.winds.length, 0);
    assert.equal(pirate.gates.length, 0);
    assert.ok(pirate.traps.length >= 18);
    assert.ok(pirate.traps.every((t) => t.drops));
    assert.ok(pirate.platforms.every((p) => p.kind !== "ice" && p.kind !== "conveyor" && p.kind !== "bounce"));
    const dashGaps = pirate.waypoints.filter((wp) => wp.dash);
    assert.equal(dashGaps.length, 0, "safe line must not force a bot dash");
  });

  it("is a party-length pirate course", () => {
    const span = pirate.startZ - pirate.finishZ;
    assert.ok(span >= 120, `span ${span}`);
    assert.equal(pirate.theme.stars, 4);
    assert.ok(pirate.checkpoints.length >= 3);
    assert.ok(byId("start").size[0] >= 18);
    assert.ok(byId("mid").size[0] >= 18);
    assert.ok(byId("final").size[0] >= 18);
    assert.ok(byId("lane").size[0] <= 6.3, "collapse lane stays the choke");
  });
});
