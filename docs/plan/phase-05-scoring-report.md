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
