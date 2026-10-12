# Phase 05 — Scoring and report

## Scope

Turn responses into the numbers a consultant defends in front of a client, and the report they hand
over. **This is the first sellable point.** After this phase a readiness assessment runs end to end.

## Tables

None. Everything here is derived — `DATA-MODEL.md` §4.

## Work

1. `lib/scoring/` as pure functions over plain arrays. No database access in this directory.
   - Item normalisation to 0–100, reverse-scoring applied, unanswered **excluded not zeroed**
   - Weighted dimension scores; weighted overall readiness index
   - Segment breakdown with n=5 suppression **on the filter intersection**, returning
     `{ suppressed, reason, n }` rather than null
   - Consensus: standard deviation per dimension
   - Perception gap: manager/executive mean minus frontline/supervisor mean, per dimension
   - Cronbach's alpha per dimension
   - Straight-lining and speeding flags
2. Unit tests for every function above, including: all-unanswered, a single respondent, a dimension
   with one item (alpha undefined — return null with a reason, do not divide by zero), and a
   reverse-scored item.
3. Readiness dashboard: overall index, dimension scores **with dispersion shown beside each mean**,
   lowest-scoring items, response rate, completion by department.
4. Segment view with department, role and seniority filters; suppression reasons rendered as text,
   never as a blank cell.
5. Perception gap view.
6. Reliability panel: alpha per dimension, item-total correlations, flagged weak items.
7. Response quality panel: flagged respondents, with a note that flags are advisory — the consultant
   decides, the system never auto-excludes.
8. Open-text review: read responses per question, tag themes by hand.
9. Consultant narrative blocks: free text saved against the report.
10. Report export to PDF via React-PDF, with the firm's name and logo.
11. Charts via Recharts, house style per `CLAUDE.md`: one colour per series, no 3D, no rounded bars.

## Acceptance criteria

- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean
- [ ] Every function in `lib/scoring/` has unit tests, including the edge cases listed above
- [ ] A hand-computed dimension score from seeded data matches the dashboard exactly
- [ ] An unanswered question changes the denominator, not the numerator
- [ ] A segment with four respondents shows a suppression **reason**, not a blank or a zero
- [ ] Filtering department **and** seniority together suppresses when the intersection is under five,
      even though each filter alone is over five
- [ ] Every dimension mean is displayed with its dispersion
- [ ] Alpha is displayed per dimension, including when it is below 0.70
- [ ] The PDF export opens in Preview and Acrobat, carries the firm's logo, and contains the
      dimension table, the lowest-scoring items and the narrative blocks
- [ ] A full engagement can be run start to finish on seed data without opening Word or Excel

## Out of scope

Benchmarking across engagements. Re-assessment waves. AI-generated narrative — deferred, per `PRD.md`.

## Build notes

1. **"No tables" was not quite true.** Scores are derived, but three things the consultant adds are
   stored: `report_narrative` (summary, findings, recommendations), `response_theme` (hand-tagged
   themes on open answers) and `org_branding` (the logo, on its own table so organisation reads
   never carry image bytes). Speeding needs a duration, so `private.submit_survey()` now writes
   `response.duration_seconds`: how long, never when. All with RLS and isolation tests.
2. **Anonymous instruments show nothing until five people have submitted.** The respondent list
   already says who has answered, so with one submission the "average" would be that person's
   answers. Breakdowns and filters need five on every instrument, judged on the intersection.
   Identified instruments show the overall figures at any n. Open answers are listed in random
   order without segment attributes.
3. **Scoring choices, so the numbers are reproducible** (`DATA-MODEL.md` §4): a dimension score is
   the mean of each person's weighted mean on the questions they answered, with the standard
   deviation of the same per-person scores; choice questions are scored between their lowest and
   highest option, multiple choice averaging the picks; open text and numbers are not scored.
4. **Quality flags are advisory only.** There is no "exclude this submission" control: the
   consultant decides what to say about a flagged submission. If excluding one from the scores is
   wanted, it is a small follow-up (a table of excluded submission ids that `buildReport` skips).
5. **No readiness bands.** Nothing in the docs defines what score counts as low or high, so the
   screen shows the number and its spread, not a coloured band. Bands are a product decision.
6. **The results screen is bespoke.** The view kit lists and edits records, and this is a report.
   Charts are Recharts in the house style (point and whisker for dimensions, a dumbbell for the
   perception gap), each with a table holding the same values. The dimension whisker is a thin
   stacked bar rather than Recharts' error bar, which misaligned rows on a category axis.
7. **The PDF** is React-PDF rendered in `app/api/exports/readiness/[instrumentId]` under the user's
   own session, so RLS decides what may be exported. Built-in Helvetica only, so it opens anywhere
   without embedded fonts; characters outside that font (a true minus sign, ≥) are avoided.
8. **Found while building: slow read policies.** Tagging an open answer took six seconds: the
   per-row read function ran for every question on every one of 800 answers. Read policies on the
   instrument and survey tables now use an uncorrelated `private.readable_engagement_ids()` subquery,
   the same rule, evaluated once per statement (2.7 s to 18 ms). `DATA-MODEL.md` §12 says to use this
   form for new tables.
9. **The seed submits thirty anonymous answers through the real survey path** (drafts, then
   `private.submit_survey()` as the survey role), with deterministic pseudo-random answers shaped so
   the warehouse is least ready, leaders feel readier than staff, Purchasing (four people) is
   suppressed, and one person straight-lines and one rushes. The same generator seeds the e2e tests.
10. **Settings now has two tabs**, Members and Branding; the top navigation's "Members" link became
    "Settings".

## Acceptance status

| Criterion | Status |
|---|---|
| `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean | Verified |
| Every function in `lib/scoring/` has unit tests, including the edge cases listed | Verified: all-unanswered, a single respondent, a one-item dimension (alpha null with a reason), a reverse-scored item, plus choice scoring, weights and a hand-worked alpha |
| A hand-computed dimension score from seeded data matches the dashboard exactly | Verified: e2e computes every dimension independently in SQL and checks the screen |
| An unanswered question changes the denominator, not the numerator | Verified: unit test |
| A segment with four respondents shows a suppression reason | Verified: e2e (Purchasing, four) and unit test |
| Filtering department and seniority together suppresses when the intersection is under five | Verified: e2e (Warehouse 8 and frontline 19 shown; Warehouse frontline 4 hidden) and unit test |
| Every dimension mean is displayed with its dispersion | Verified: e2e (screen) and by reading the PDF |
| Alpha is displayed per dimension, including below 0.70 | Verified: e2e (Leadership 0.56, "Below 0.70") |
| The PDF opens, carries the firm's logo, the dimension table, the lowest items and the narrative | Verified: e2e checks it is a PDF with an image and decodes its text for the table, the lowest items and both narrative blocks; read page by page by hand. Opening in Preview and Acrobat specifically is still to be done by a person |
| A full engagement can be run start to finish on seed data without Word or Excel | Verified: e2e runs results, open-answer tagging, narrative, logo and export on the seed's baseline; phases 03–04 cover authoring and distribution |
