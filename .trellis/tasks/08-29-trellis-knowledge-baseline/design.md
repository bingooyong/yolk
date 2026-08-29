# Design — Trellis Knowledge Baseline

## Source of truth

The baseline is anchored to committed `4ce0ce90b37f83db55094b1716d23f01e5c0b7fb`. A concurrent skin-pipeline workflow has dirty business files and `.trellis/spec/frontend/visual-rendering.md`; those are external to this task and must not be read as baseline facts, reverted, or overwritten.

## Knowledge synthesis

Three research files are the evidence layer:

1. `research/architecture-frontend.md`
2. `research/data-security-interfaces.md`
3. `research/build-test-operations.md`

Each distinguishes `CONFIRMED`, `INFERRED`, and `UNKNOWN`. Specs may contain confirmed contracts and explicit inferred caveats. Unknowns remain in memory/final reporting, not prescriptive rules.

## Long-lived spec design

Add three focused frontend-layer specs because Trellis currently exposes this single-repo project through the frontend layer:

1. `project-architecture.md`
   - product/runtime shape;
   - dual web/native entries;
   - module ownership map;
   - simulation/state/persistence flow;
   - generated paths;
   - historical compatibility rules;
   - high-risk modules and debt boundaries.

2. `data-security.md`
   - browser-local game authority;
   - server-only DB/app-data boundaries;
   - PGLite/Neon selection and result parity;
   - migration rules;
   - auth middleware and session modes;
   - connector/P2P dormant contracts;
   - preview/PWA trust boundaries;
   - environment and secret handling.

3. `testing-operations.md`
   - command matrix;
   - focused versus broad test paths;
   - browser/visual QA contracts;
   - web/native build boundaries;
   - generated/ignored path policy;
   - no-CI gap and deployment unknowns;
   - validation selection by change type.

Update `frontend/index.md` only to link these files. Do not alter the concurrently modified `visual-rendering.md`.

## Project memory design

Create `.trellis/workspace/bingooyong/project-memory.md` as durable context rather than prescriptive spec. Record:

- current architecture state;
- major historical decisions;
- technical debt;
- high-risk modules;
- why apparently dormant infrastructure exists;
- native build snapshot issue;
- physical-device and CI gaps;
- external parallel-work caution;
- recommended follow-up investigations.

Link it from the developer workspace index.

## Fact-versus-debt policy

- A current bug/debt item is described as debt, never as a desired convention.
- Existing intentional compatibility behavior is a constraint.
- Missing capability is an unknown/gap, not an instruction to invent one.
- No one-off test failure or local environment condition becomes a broad coding rule.
- Specs cite representative source anchors so future agents can verify current truth.

## Write and rollback boundary

Permitted writes:

- `.trellis/tasks/08-29-trellis-knowledge-baseline/**`
- `.trellis/spec/frontend/project-architecture.md`
- `.trellis/spec/frontend/data-security.md`
- `.trellis/spec/frontend/testing-operations.md`
- `.trellis/spec/frontend/index.md`
- `.trellis/workspace/bingooyong/project-memory.md`
- `.trellis/workspace/bingooyong/index.md`

No business/config/dependency/test/generated file may be touched. Rollback is a direct deletion of the new spec/memory files and index rows.
