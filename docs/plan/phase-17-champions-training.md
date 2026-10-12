# Phase 17 — Champions and training

## Scope

The change champion network as a pipeline with coverage per impacted group, and training: courses
per audience, sessions, enrollment, completion and feedback (`OCM-MODULE.md` §5.10–5.11).

## Tables

`champion`, `training_course`, `training_course_org_unit`, `training_session`, `training_enrollment`,
`organization_setting` — `DATA-MODEL.md` §15.4.

## Work

1. Schema and RLS. `organization_setting` with `champion_ratio` defaulting to 25.
2. **Champions** app: kanban by status (Identified → Nominated → Committed → Onboarded → Active) as
   the default view, list, form. Champion meetings are events (phase 16) linked from the form.
3. Coverage in `lib/scoring/`: suggested champions per impacted org unit vs active champions; groups
   below coverage as suggestions.
4. **Training** app: courses (list, form with audiences and an inline sessions list), sessions on the
   timeline and calendar, enrollment as an inline list on the session form; bulk-enroll the people
   of an org unit.
5. Training completion, training timeline, courses count; coverage against `needs_training`, with
   suggestions for uncovered groups.
6. Instrument templates: training feedback, champion, coaching. Coaching sessions are stakeholder
   interactions with channel `coaching`.

## Acceptance criteria

- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean
- [ ] Changing `champion_ratio` changes coverage immediately (derived, not stored)
- [ ] A person cannot be a champion twice on one engagement
- [ ] Bulk-enrolling an org unit enrolls each of its people once, including people in child units,
      and re-running it adds only new people
- [ ] Training completion excludes cancelled sessions and counts `completed` only
- [ ] An impact with `needs_training` and no course covering its org unit shows as a gap
- [ ] RLS tests pass for all six tables

## Out of scope

An LMS: content hosting, quizzes, certificates. Champion rewards and gift cards.
