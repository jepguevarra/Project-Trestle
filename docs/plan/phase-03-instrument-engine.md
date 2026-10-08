# Phase 03 — Instrument engine

## Scope

Build and edit an assessment instrument: dimensions, sections, questions, options and weights, from a
template or from scratch. One engine, used by every instrument kind Trestle will ever have. No
distribution and no scoring yet — this phase ends with a consultant able to author an instrument and
preview it exactly as a respondent will see it.

## Tables

`instrument_template`, `instrument`, `dimension`, `section`, `question`, `question_option` —
`DATA-MODEL.md` §2.

## Work

1. Schema and RLS for all six tables. `instrument.kind` ships with its **full enum** and
   `instrument.wave` / `wave_label` ship now (`DATA-MODEL.md` §2, §14 constraint 3), even though only
   `readiness` gets a template in this phase.
2. Ship the **default readiness instrument** as a system template (`org_id` null, `is_system` true),
   with the six dimensions from `PRD.md` and items derived from the sources in `RESEARCH.md` §2. Adapt
   from the published scales; do not invent items.
3. Ship one template per `engagement_type` (`POSITIONING.md` §4.2). Same dimensions, different item
   wording. Content work, not code.
4. The **Readiness** app on the view kit (phase 02b): instrument list and kanban by status; create
   from template or blank; the instrument form has a statusbar (Draft → Open → Closed) and smart
   buttons for questions and respondents. The builder in step 5 is the one bespoke screen, because
   the kit cannot express drag-ordered nested sections.
5. Instrument builder: reorder sections and questions, edit text and help text, set question type,
   weight, required, reverse-scored, and the dimension a question scores into.
6. Dimension editor: name, weight, order.
7. Per-instrument settings: name, kind, wave and wave label, anonymity, opens at, closes at.
8. Respondent preview — the real respondent component, rendered with no token.
9. Validation: a `likert_*` or choice question must have a dimension; a choice question must have at
   least two options; an instrument cannot open with zero questions.
10. Seed a drafted instrument on one seeded engagement.

## Acceptance criteria

- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean
- [ ] A consultant creates an instrument from the shipped readiness template and sees six dimensions
      and all its questions
- [ ] Every question type renders correctly in preview and on a phone-width viewport
- [ ] Reordering persists and survives a reload
- [ ] `is_reverse_scored` is settable per question and stored
- [ ] Changing a dimension's weight does not alter any question's dimension assignment
- [ ] An instrument with no questions cannot be moved to `open`
- [ ] Zod schemas validate every form and every server action; no `any` anywhere
- [ ] RLS tests pass for all six tables

## Out of scope

Respondents, tokens, sending, any score. Templates for the other kinds: sponsor and pulse later,
champion, coaching, communication feedback and training feedback with phases 16–17, go-live and
post-go-live adoption with phase 18. The `kind` enum carries them all now; this phase builds only
`readiness`.

## Build notes

1. **Item wording is Trestle's own, drafted for review.** `lib/instruments/readiness-templates.ts`
   holds six templates (generic plus one per engagement type) with the same six dimensions and 26–27
   items: four five-point agreement items per dimension (one reverse-worded in each) and two open
   questions. Each item records the construct and source it operationalises (`question.source`,
   shown to consultants only). `pnpm instruments:doc` writes `docs/READINESS-INSTRUMENT.md` for
   review, and a unit test fails if it is stale. Open questions are listed there: personal valence
   as a seventh dimension, and business process readiness.
2. **`token_secret` is not on `instrument`.** Every engagement member, client-side viewers included,
   can read `instrument`, so a signing secret there would let any viewer mint respondent links.
   Phase 04 stores it elsewhere. `DATA-MODEL.md` §2 and the phase 04 plan are updated.
3. **`engagement_id` is denormalised onto every child** (dimension, section, question,
   question_option), with a composite FK to `instrument (id, engagement_id, org_id)`. The policies
   are then the plain engagement-scope predicate with no join.
4. **The freeze is in the database.** Children are writable only while the instrument is a draft.
   A trigger refuses open with zero questions (TR422), a return to draft or draft → closed (TR423),
   and an anonymity change once opened (TR424, added because respondents are told whether they are
   anonymous). The builder turns read-only once open; a new wave is the way to change questions.
5. **Templates sync on migrate.** `pnpm db:migrate` inserts shipped templates for the current
   `TEMPLATE_VERSION` and never edits an existing one. An instrument copies its definition.
6. **Instruments have chatter** (`res_type` `instrument`); status and settings changes are tracked.
7. **Opens/closes are entered and shown in UTC** and labelled so. Per-org time zones are later work.
8. **The builder is the bespoke screen** (`components/instruments/builder.tsx`). Up/Down buttons
   on every dimension, section and question, plus drag for questions (within and across sections).
   Reordering is applied locally and rolled back if the server refuses.
9. **The preview is the real respondent component** (`components/survey/respondent-form.tsx`), one
   section per page. The page strips dimensions, weights, reverse scoring and sources before the
   data reaches the client, which phase 04's public page must do too.
10. **Found while building:** the client list's engagement count was always 0 (phase 02b). A
    correlated subquery written as `${client.id}` renders as a bare `"id"` inside a single-table
    select and resolves to the subquery's own table. The instrument question count had the same bug.
    Both are now written out in full, with a regression test in the RLS suite.

## Acceptance status

| Criterion | Status |
|---|---|
| `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean | Verified |
| A consultant creates an instrument from the shipped template and sees six dimensions and all its questions | Verified: e2e (database checked; the engagement type's template is preselected) |
| Every question type renders correctly in preview and on a phone-width viewport | Verified: e2e at 375px, all six types, no horizontal scroll; required-answer check and "nothing saved" |
| Reordering persists and survives a reload | Verified: e2e (question up/down, section up/down, drag across sections) |
| `is_reverse_scored` is settable per question and stored | Verified: e2e (database checked) |
| Changing a dimension's weight does not alter any question's dimension assignment | Verified: e2e and RLS suite |
| An instrument with no questions cannot be moved to `open` | Verified: e2e (statusbar) and RLS suite (trigger, TR422) |
| Zod schemas validate every form and every server action; no `any` anywhere | Done: `lib/validation/instruments.ts`, unit tests for the question rules |
| RLS tests pass for all six tables | Verified: RLS suite (cross-tenant for all six, scope, freeze, archived engagements) |
| Seed covers the new tables | Done: a drafted assessment on the Odoo rollout, from the packaged-software template |
