# Phase 07 — Audiences and stakeholders

*Expanded October 2026 for the OCM lifecycle (`OCM-MODULE.md` §5.3–5.4, §5.6). `org_unit` moves here
from phase 08; stakeholders become assessments of people.*

## Scope

Who is in the client's organisation and how they stand. The impacted-group tree and the people in it
(OCMS's Audiences), the stakeholder register as an assessment of those people, sponsors, the
influence/interest grid, stance and receptiveness, stakeholder and sponsor risk, the engagement log,
and the consultant's group readiness profiles. Readiness gains per-audience breakdowns.

## Tables

`org_unit`, `person`, `stakeholder`, `stakeholder_interaction`, `org_unit_readiness_profile`;
`respondent.person_id`, `respondent.org_unit_id`, `response.org_unit_id` — `DATA-MODEL.md` §3, §6.

## Work

1. Schema and RLS for the five tables and the three new columns.
2. **Audiences** app: org unit tree (create, nest, headcount, external flag, location), list grouped
   by parent, with L1/L2/L3 columns. People: list, form, CSV import of people with org unit by path
   (`Finance / Accounting / Payroll`), with a row-level error report.
3. Impacted-individuals helper in `lib/scoring/`: leaf-level headcount, never parent plus children.
4. **Stakeholders** app: register as a list of people with an assessment; create from a person.
   Influence and interest 1–5, current and target stance, ADKAR, availability, sponsor flag with
   commitment and visibility.
5. Derived in `lib/scoring/` with unit tests: receptiveness, priority A–D (impact side returns
   "unknown" until phase 08), stakeholder risk, sponsor risk.
6. Influence/interest grid with the four standard quadrants; click through to the record.
7. Engagement backlog: stakeholders where `current_stance <> target_stance`, ranked by influence.
8. Interaction log as an inline list on the stakeholder form; channel includes `coaching`. Open
   interactions with due dates appear in the Checklist app as linked tasks (phase 14).
9. Stance heat strip by department; receptiveness High/Mid/Low counts.
10. Group readiness profile per org unit per wave, labelled *consultant assessment*.
11. Readiness: pick respondents from people (copies name, email, org unit). Submit copies
    `org_unit_id` onto `response`. Readiness per audience on the phase 05 dashboard, with n ≥ 5
    suppression on the org-unit segment.
12. Wire `source_participant` to stakeholder records (phase 06's free-text participants become
    references).
13. Engagement plan export.

## Acceptance criteria

- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean
- [ ] Two hundred people import from CSV with org units resolved by path, and bad rows reported
- [ ] Impacted individuals for a parent with impacted children equals the sum of the children, not
      parent plus children (unit test)
- [ ] The grid places each stakeholder in the correct quadrant and stays legible at phone width
- [ ] Receptiveness, priority and both risk rules have unit tests covering every branch
- [ ] The backlog lists only stakeholders with a stance gap, highest influence first
- [ ] A group readiness profile is never included in the readiness index (test)
- [ ] On an anonymous instrument, `response` carries `org_unit_id` and never `respondent_id`
- [ ] Readiness for an org unit with four respondents shows a suppression reason
- [ ] A stakeholder can be linked as a participant on an elicitation source
- [ ] RLS tests pass for all five tables

## Out of scope

The sponsor scorecard instrument (a later instrument template). Impacts on org units (08); the A–D
priority's impact side lights up then.
