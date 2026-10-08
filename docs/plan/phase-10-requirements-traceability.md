# Phase 10 — Requirements and traceability

## Scope

The requirements register with fit-gap disposition, the trace links to everything upstream, the
coverage reports, the quality checks and the handover export. **The contribution.**

## Tables

`requirement`, `requirement_pattern`, and the link tables — `DATA-MODEL.md` §9. Explicit link tables
per pair; **not** a generic edge table.

## Work

1. Schema and RLS. Every link table carries `org_id`, a unique constraint on the pair and indexes on
   both sides.
2. Requirements register: ref, statement, type, format, priority, acceptance criteria, status.
3. **Fit-gap:** verdict, disposition, effort band, justification. Justification required when
   disposition is `customisation`. Fit-gap fields are hidden when `engagement.type` is `custom_build`
   (`POSITIONING.md` §4.3).
4. Trace links from a requirement to processes, pain points, impacts, stakeholders, sources and
   readiness dimensions, via `<SourcePicker>`-style controls.
5. Traceability matrix view.
6. **Forward coverage:** processes, pain points and impacts with no requirement.
   **Backward coverage:** requirements linked to nothing.
7. Quality checks as pure functions in `lib/quality/`, all seven from `DATA-MODEL.md` §9, including
   the two cross-module ones.
8. Derived views: customisation register, fit ratio by process or module.
9. Handover export: CSV and Jira/ADO-shaped JSON, each requirement carrying a **provenance line**;
   plus a PDF specification for client signature.
10. Scope baseline: snapshot the approved set at a point in time.

## Acceptance criteria

- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean
- [ ] A requirement traces to a pain point, an impact, a stakeholder and an interview, and the full
      chain renders on one screen
- [ ] Forward coverage lists a pain point that has no requirement; adding one removes it from the list
- [ ] Backward coverage lists a requirement with no links
- [ ] A `customisation` disposition cannot be saved without a justification
- [ ] The quality check flags a `must` requirement requested by an `opposed` stakeholder
- [ ] The quality check flags a requirement against a process in a low-scoring org unit
- [ ] Fit-gap fields do not appear on a `custom_build` engagement
- [ ] The CSV export imports into Jira with the provenance field populated
- [ ] Every link table has an RLS isolation test
- [ ] No generic `(from_type, from_id, to_type, to_id)` table exists anywhere in the schema

## Out of scope

The pattern library's promote-and-reuse flow — the table ships here, the workflow is later. Sprint
tracking, in any form, ever.
