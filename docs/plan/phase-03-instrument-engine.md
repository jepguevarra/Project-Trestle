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
