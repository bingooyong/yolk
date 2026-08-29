/**
 * Env-aware test guards.
 *
 * Some tests authored for the Grok app-builder pipeline (see grok's
 * `a2a9e28 Export from Grok` commit) pin to docs that only live in the
 * `.grok/` directory of a fully-built Grok project. `.grok/` is gitignored,
 * so on a bare clone those files are absent and the tests cannot run.
 *
 * `describeIfExists` / `testIfExists` return `describe` / `test` when the
 * given path is present and `describe.skip` / `test.skip` otherwise, so the
 * suite passes in both Grok-equipped and other environments.
 */

import { describe, test } from "node:test";
import { existsSync } from "node:fs";

export function describeIfExists(path, name, fn) {
  return (existsSync(path) ? describe : describe.skip)(name, fn);
}

export function testIfExists(path, name, fn) {
  return (existsSync(path) ? test : test.skip)(name, fn);
}

export { existsSync };