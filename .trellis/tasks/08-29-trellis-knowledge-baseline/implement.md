# Implementation Plan — Trellis Knowledge Baseline

## Stage 0 — Planning baseline

- [x] PRD captures read-only constraints, evidence classification, spec/memory criteria, and reverse review.
- [x] Architecture/frontend research completed.
- [x] Data/security/interface research completed.
- [x] Build/test/operations/history research completed.
- [x] External concurrent skin workflow identified and excluded.

## Stage 1 — Durable specs

- [x] Create `project-architecture.md` with confirmed architecture, module boundaries, state/data flow, generated paths, compatibility constraints, and high-risk areas.
- [x] Create `data-security.md` with server-only boundaries, database/auth/connector/P2P contracts, trust boundaries, and environment rules.
- [x] Create `testing-operations.md` with command/test/build/QA/generated-path contracts and known gaps.
- [x] Link all three files from `.trellis/spec/frontend/index.md`.

## Stage 2 — Project memory

- [x] Create `project-memory.md` under the current developer workspace.
- [x] Record durable background, decisions, debt, risks, and unknowns without promoting them to style rules.
- [x] Link it from the developer workspace index.

## Stage 3 — Reverse quality review

- [x] Compare every new spec claim against the three research files and representative committed source.
- [x] Search for contradiction with existing visual-rendering spec.
- [x] Confirm current facts are not phrased as aspirational rules.
- [x] Confirm inferred/unknown items are labeled.
- [x] Confirm key modules/high-risk areas are covered.
- [x] Confirm no one-off issue became a permanent rule.
- [x] Confirm no business/config/dependency/test/generated file was changed by this task.

## Stage 4 — Validation

- [x] Validate Trellis context manifests.
- [x] Read all new specs end to end.
- [x] Run `git diff --check` on Trellis writes.
- [x] Inventory dirty paths and separate this task's writes from external concurrent work.
- [x] Produce final report sections A–G required by the PRD.
