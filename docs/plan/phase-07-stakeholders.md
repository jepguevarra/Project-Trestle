# Phase 07 — Stakeholders

## Scope

The stakeholder register, the influence/interest grid, stance tracking and the engagement log.

## Tables

`stakeholder`, `stakeholder_interaction` — `DATA-MODEL.md` §6.

## Work

1. Schema and RLS.
2. Register: list, create, edit, import from CSV. Name, title, department, email, sponsor flag.
3. Influence and interest ratings, 1–5.
4. Influence/interest grid with the four standard quadrants. Plot points, click through to the record.
5. Current and target stance; ADKAR state as an optional field.
6. The engagement backlog: every stakeholder where `current_stance <> target_stance`, ranked by
   influence.
7. Interaction log: dated entries with channel, notes, next action, owner and due date.
8. Stance heat strip by department.
9. Engagement plan export.
10. Wire `source_participant` to real stakeholder records — phase 06's free-text participants become
    references.

## Acceptance criteria

- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean
- [ ] Twenty stakeholders import from CSV with a clear error report on bad rows
- [ ] The grid places each stakeholder in the correct quadrant and stays legible at phone width
- [ ] The backlog lists only stakeholders with a stance gap, highest influence first
- [ ] An interaction with a due date appears in the engagement's open actions
- [ ] A stakeholder can be linked as a participant on an elicitation source
- [ ] RLS tests pass for both tables

## Out of scope

The sponsor scorecard instrument — it reuses the phase 03 engine and is a later addition.
