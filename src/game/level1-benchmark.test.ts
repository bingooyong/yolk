import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LEVELS } from "./levels.ts";
import { createLevel1BenchmarkLayout } from "./level1-benchmark.ts";

const level = LEVELS.meadow;

describe("Level 1 benchmark art layout", () => {
  it("is deterministic without random scattering", () => {
    const first = createLevel1BenchmarkLayout(level.platforms, level.finishZ);
    const second = createLevel1BenchmarkLayout([...level.platforms], level.finishZ);

    assert.deepEqual(first, second);
  });

  it("keeps foreground, midground, and background in separate depth bands", () => {
    const layout = createLevel1BenchmarkLayout(level.platforms, level.finishZ);

    for (const item of [...layout.grassTufts, ...layout.flowers, ...layout.rocks]) {
      assert.ok(Math.abs(item.position[0]) >= 10.5, `foreground x: ${item.position[0]}`);
      assert.ok(Math.abs(item.position[0]) <= 15.5, `foreground x: ${item.position[0]}`);
    }
    for (const item of [...layout.candyCanes, ...layout.gumdrops]) {
      assert.ok(Math.abs(item.position[0]) >= 14.5, `midground x: ${item.position[0]}`);
      assert.ok(Math.abs(item.position[0]) <= 23.5, `midground x: ${item.position[0]}`);
    }
    for (const item of [...layout.hills, ...layout.clouds]) {
      assert.ok(Math.abs(item.position[0]) >= 24, `background x: ${item.position[0]}`);
    }
  });

  it("places route guidance on platform surfaces rather than floating over gaps", () => {
    const layout = createLevel1BenchmarkLayout(level.platforms, level.finishZ);
    const surfaces = level.platforms.map((platform) => ({
      left: platform.pos[0] - platform.size[0] / 2,
      right: platform.pos[0] + platform.size[0] / 2,
      back: platform.pos[2] - platform.size[2] / 2,
      front: platform.pos[2] + platform.size[2] / 2,
      top: platform.pos[1] + platform.size[1] / 2,
    }));

    assert.ok(layout.routeChevrons.length >= 12);
    assert.ok(layout.edgeLightStrips.length >= 40);
    for (const chevron of layout.routeChevrons) {
      const [x, y, z] = chevron.position;
      const surface = surfaces.find(
        (item) =>
          x >= item.left &&
          x <= item.right &&
          z >= item.back &&
          z <= item.front &&
          Math.abs(y - item.top) < 0.04,
      );
      assert.ok(surface, `chevron not on a surface: ${x}, ${y}, ${z}`);
    }
  });

  it("aligns the celebratory finish flags with the gameplay finish plane", () => {
    const layout = createLevel1BenchmarkLayout(level.platforms, level.finishZ);
    const finishFlags = layout.edgeFlags.filter(
      (item) => Math.abs(item.position[1] - 4.35) < 0.001,
    );

    assert.equal(finishFlags.length, 7);
    for (const flag of finishFlags) {
      assert.ok(Math.abs(flag.position[2] - level.finishZ) <= 0.001);
    }
  });

  it("uses compact instanced batches instead of one mesh per repeated prop", () => {
    const layout = createLevel1BenchmarkLayout(level.platforms, level.finishZ);
    const counts = [
      layout.grassTufts.length,
      layout.flowers.length,
      layout.rocks.length,
      layout.candyCanes.length,
      layout.gumdrops.length,
      layout.hills.length,
      layout.clouds.length,
      layout.routeChevrons.length,
      layout.edgeLightStrips.length,
      layout.edgeFlags.length,
    ];

    assert.deepEqual(
      counts.map((count) => count > 0),
      Array.from({ length: counts.length }, () => true),
    );
    assert.equal(
      counts.reduce((total, count) => total + count, 0) <= 800,
      true,
      `benchmark instance count is too high: ${counts.reduce((total, count) => total + count, 0)}`,
    );
  });
});
