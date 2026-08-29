# Trellis Knowledge Base Cold Start

## Goal

Initialize Trellis's durable project knowledge from the existing Yolk Rush codebase so future sessions inherit confirmed architecture, module boundaries, data flow, testing, deployment, security, compatibility, technical-debt, and high-risk constraints.

This is a knowledge-baseline task, not a product-change task.

## Hard Constraints

- Business code must remain read-only.
- Do not modify runtime configuration, dependencies, package manifests, tests, generated artifacts, or build scripts.
- Permitted writes are limited to this Trellis task directory, `.trellis/spec/`, and Trellis project memory/journal files.
- Every durable claim must cite repository evidence or be explicitly labeled `INFERRED` or `UNKNOWN`.
- Do not turn technical debt or one-off findings into prescriptive style rules.
- Do not copy unverified general architecture assumptions into project specs.

## Requirements

### R1 — Comprehensive repository audit

Inspect and correlate:

1. directory structure and module layout;
2. `README.md`, `AGENTS.md`, `CLAUDE.md`, existing docs, and Trellis material;
3. dependency manifests and lockfiles;
4. build, run, migration, native-build, preview, deployment, and CI/CD configuration;
5. core game/engine/UI/routing/state modules;
6. module dependencies and ownership boundaries;
7. core domain models and simulation/UI persistence flows;
8. HTTP/server, database, authentication, multiplayer, audio, native bridge, and external interfaces;
9. test structure, frameworks, execution commands, known failures, browser smoke, and visual QA;
10. frontend architecture and E2E/UI automation;
11. auth, security, isolation, logging, error handling, haptics/audio, and other cross-cutting behavior;
12. generated, temporary, native payload, and third-party directories;
13. implicit engineering constraints;
14. historical compatibility logic and technical debt;
15. frequently modified and high-risk modules.

### R2 — Evidence classification

For every material finding, classify as:

- `CONFIRMED`: directly supported by current code/config/tests/docs;
- `INFERRED`: supported by multiple indirect evidence points but not directly declared;
- `UNKNOWN`: cannot be established from the repository.

Durable specs should prefer `CONFIRMED` knowledge. `INFERRED` knowledge may be included only with its confidence and evidence. `UNKNOWN` belongs in the final report and memory gaps, not prescriptive spec.

### R3 — Durable Trellis specs

Update `.trellis/spec/` with only long-lived, actionable knowledge that meets at least one of:

- mandatory future-development rule;
- stable architecture or module constraint;
- long-term coding convention;
- historical compatibility requirement;
- validated engineering lesson;
- knowledge that prevents a repeat mistake.

Avoid one-off investigation notes and ordinary code explanations.

### R4 — Project memory

Record durable project background, decisions, debt, pitfalls, high-risk areas, and unresolved questions in the appropriate Trellis memory/journal mechanism without polluting prescriptive specs.

### R5 — Reverse quality review

Before claiming completion, verify:

1. facts are not accidentally presented as ideals;
2. conclusions have evidence;
3. key modules are covered;
4. high-risk areas are covered;
5. one-off findings are not promoted to permanent rules;
6. specs do not contradict each other;
7. historical debt is not misrepresented as design guidance.

## Baseline Isolation

The audit source of truth is committed `4ce0ce90b37f83db55094b1716d23f01e5c0b7fb`. A concurrent skin-pipeline workflow may dirty business files; those changes are external to this knowledge task, must not be reverted or overwritten, and must not be promoted into this baseline.

## Acceptance Criteria

- [x] A task research audit records the repository's architecture, data flow, interfaces, tests, deployment, implicit constraints, debt, and risks with evidence.
- [x] Findings are classified `CONFIRMED`, `INFERRED`, or `UNKNOWN`.
- [x] Durable specs are updated without changing business code, runtime config, dependencies, tests, or generated artifacts.
- [x] Project memory records background, decisions, debt, risks, and open gaps.
- [x] A reverse review checks evidence, completeness, contradiction, and fact-versus-debt confusion.
- [x] Final report provides architecture overview, created/updated specs, memory, unknowns, historical constraints, high-risk areas, and recommended follow-up knowledge.
- [x] A dirty-path inventory proves this task changed only Trellis knowledge files; all non-Trellis dirty files are explicitly classified as external parallel or pre-existing work.

## Out of Scope

- Fixing bugs or lint/test failures.
- Refactoring code.
- Changing dependencies.
- Updating runtime configuration.
- Adding tests.
- Producing a generic architecture essay not grounded in this repository.
