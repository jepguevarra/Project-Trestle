# Phase 08 — Changes, impacts and change risk

*Expanded October 2026 for the OCM lifecycle (`OCM-MODULE.md` §5.2, §5.5). Org units now arrive in
phase 07; changes are split from impacts; severity is No/Low/Mid/High.*

## Scope

What is changing, which groups it hits and how hard, what is being done about it, and how much
change-management effort the engagement needs overall. Links impacts to the readiness findings and
stakeholders that explain them.

## Tables

`change`, `impact`, `mitigation`, `change_risk_assessment` — `DATA-MODEL.md` §8. `process` arrives in
phase 09; until then a change's process reference is nullable.

## Work

1. Schema and RLS.
2. **Impacts** app, menu *Changes · Impacts · Change risk*. Change list and form: ref, title, as-is,
   to-be, category, status (Draft → Confirmed statusbar).
3. On the change form, an inline list of impacts: one row per org unit with level, headcount,
   description, needs-training, needs-communication. Adding an org unit already present is rejected.
4. Impact list across changes, groupable by org unit, level and change.
5. Mitigations per impact: action, owner, due date, status.
6. Heatmap of org unit × change category, cell = **max** level with the count beside it. Three steps
   of the muted ramp, always paired with the word.
7. Change saturation: confirmed changes per org unit at `low` or above.
8. Top impacts ranked by level weight × affected headcount, ties broken by change ref.
9. Change risk assessment form: six factors, score, band and service tier, with the
   breadth/depth suggestion from the impact data shown beside the consultant's rating.
10. Stakeholder priority A–D now uses the impact side (phase 07 helper).
11. Link an impact to a readiness dimension finding and to stakeholders; an impact can cite an
    elicitation source.
12. Change and impact register export.

## Acceptance criteria

- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean
- [ ] A cell containing levels low, low, low and high displays **High (4)**, not an average
- [ ] Every heatmap cell shows a word and a count as well as a colour
- [ ] One change can impact several org units; the same org unit twice on one change is rejected
- [ ] A `none` impact counts as assessed and does not count toward saturation or impacted individuals
- [ ] The top-impacts view ranks by level weight × headcount and ties break deterministically
- [ ] Change risk: the six-factor mean, the reversed factors and the band boundaries (1.67, 2.34)
      have unit tests
- [ ] Mitigations with due dates appear in the Checklist alongside stakeholder actions
- [ ] RLS tests pass for all four tables

## Out of scope

Communications and training plans that respond to impacts (16, 17). Benefits tracking.
