# Phase 08 — Impacts

## Scope

Org units, the change impact register, the severity heatmap and mitigations. Links impacts to the
readiness findings and stakeholders that explain them.

## Tables

`org_unit`, `impact`, `mitigation` — `DATA-MODEL.md` §8. `process` arrives in phase 09; until then an
impact's process reference is nullable.

## Work

1. Schema and RLS.
2. Org unit tree: create, nest, set headcount.
3. Impact register: type, as-is, to-be, severity 1–5, affected headcount, org unit.
4. Mitigations per impact: action, owner, due date, status.
5. Heatmap of org unit × impact type, cell coloured by **max** severity with the count carried
   alongside. Muted semantic colour, always paired with the number.
6. Top-10 impacts view, ranked by severity × affected headcount.
7. Link an impact to a readiness dimension finding and to stakeholders.
8. Impact register export.

## Acceptance criteria

- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean
- [ ] A cell containing severities 1, 1, 1 and 5 displays 5, not the mean
- [ ] Every heatmap cell shows a number as well as a colour
- [ ] The top-10 view ranks by severity × headcount and ties break deterministically
- [ ] An impact can cite an elicitation source
- [ ] Mitigations with due dates appear in the engagement's open actions alongside stakeholder actions
- [ ] RLS tests pass for all three tables

## Out of scope

Training and communications planning. Benefits tracking.
