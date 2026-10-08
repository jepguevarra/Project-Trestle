# Phase 13 — Overview, metrics, roadmap and reporting

## Scope

The engagement command centre from `DASHBOARD.md` (milestones with computed gates, readiness, risk,
scope and the change roadmap) extended with the OCMS project snapshot and change-metrics page, plus
the org-level portfolio view and saved views (`OCM-MODULE.md` §5.13, §7.2).

Apply `DASHBOARD.md`'s §0 amendment from `POSITIONING.md` §9.4 at the start of this phase.

## Tables

`milestone`, `milestone_gate`, `saved_view` — `DATA-MODEL.md` §15.5–15.6.

## Work

1. Schema and RLS. Seed the gate sets from `DASHBOARD.md` §1.
2. Metric-key functions in `lib/scoring/`, one per key in `DASHBOARD.md` §1 plus the OCM keys in
   `DATA-MODEL.md` §15.5, each unit-tested and each returning the blocking records, not just a value.
3. **Overview** app: snapshot tiles (changes, individuals, training courses, champions, average
   stakeholder risk, latest readiness, adoption score), change risk meter, milestone cards,
   readiness section, impacts by level and saturation, receptiveness counts, comms by purpose and
   status, training timeline and completion, pending tasks.
4. Readiness trend across waves for the same instrument kind.
5. **Roadmap**: workstream rows (assessment, stakeholders, mitigations, communications, events,
   training, tasks, milestones) on a week axis from engagement start to go-live and beyond.
6. **Graph view** in the kit (first use): bar and line over a model's group-by, house style.
7. **Reporting** (owner, admin): portfolio across engagements: stage, change risk band, impacts by
   level, readiness, receptiveness, overdue tasks, no activity in 14 days.
8. Sponsor view per `DASHBOARD.md` §4.2: no named stance, no internal quality flags, pre-approved
   segments only.
9. Favorites: save, set default, and delete a view's URL state per user.

## Acceptance criteria

- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean
- [ ] Every Overview number matches a hand computation from seed data
- [ ] Every gate shows a word and a count, and its blocking records are clickable
- [ ] Every chart has a table toggle
- [ ] A viewer never sees a named stakeholder stance or an internal quality flag (test)
- [ ] Portfolio is reachable by owner and admin only
- [ ] A saved favourite restores filters, group-by and view exactly
- [ ] RLS tests pass for all three tables

## Out of scope

Benchmarking across firms. Cached or materialised metrics, until a real dashboard is slow.
