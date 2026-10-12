# Phase 20 — UAT (optional)

## Scope

A light user-acceptance test log whose value in Trestle is the link to requirements: each test case
can cite the requirement it proves, and the pass ratio feeds the go/no-go gate (`OCM-MODULE.md`
§5.17). Defect management stays in the client's tracker. Build only if real engagements ask for it.

## Tables

`uat_case` — `DATA-MODEL.md` §15.7.

## Work

1. Schema and RLS.
2. **UAT** app: list grouped by requirement or assignee, kanban by status, form with steps, expected
   result, tester notes, defect link.
3. Generate draft cases from approved requirements' acceptance criteria (one per criterion).
4. Requirement form smart button: UAT cases, with pass/fail counts.
5. `uat_pass_ratio` metric key; add it to the go/no-go gate set.
6. Instrument-free UAT comms: the UAT purposes in the message library (phase 16).

## Acceptance criteria

- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean
- [ ] Generating cases twice from the same requirement creates no duplicates
- [ ] Pass ratio excludes `not_run`, and the gate reports it with the failing cases listed
- [ ] RLS tests pass

## Out of scope

Defect workflow, test automation, test environments.
