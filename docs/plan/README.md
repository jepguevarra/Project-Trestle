# Trestle — Build Plan

Phase index and how to run one. Read `CLAUDE.md` first, every session.

## How to run a phase

1. **Branch.** `phase-NN-slug`, one phase per branch, small commits.
2. **Restate the plan in your own words** and flag anything that looks wrong *before* writing code.
   These files were written up front; they will be wrong in places. Saying so is the job, not a
   detour.
3. **Schema first.** Edit `lib/db/schema/`, run `pnpm db:generate`, then hand-write the RLS policies
   into the same migration file. Never a migration without its policies.
4. **Build inward-out:** queries and mutations in `lib/db/`, then server actions, then components.
5. **Test as you go.** The RLS isolation test for each new table is written in the same commit as the
   table.
6. **Definition of done** is in `CLAUDE.md`. All of it, every phase.

## Phase index

| # | Phase | Delivers | Depends on |
|---|---|---|---|
| 01 | Foundations | Next.js + Supabase + Drizzle, auth, orgs, membership, the RLS test harness, seed | — |
| 02 | Clients and engagements | Client and engagement records with `type`, assignment, the app shell | 01 |
| 03 | Instrument engine | Instruments, dimensions, sections, questions, templates | 02 |
| 04 | Distribution and response | Respondents, signed tokens, the public survey page, nudges | 03 |
| 05 | Scoring and report | Scoring functions, dashboard, consensus, perception gap, alpha, export | 04 |
| 06 | The evidence spine | Elicitation sources, extracts, attachments, the elicitation log | 02 |
| 07 | Stakeholders | Register, influence/interest grid, stance, engagement log | 02 |
| 08 | Impacts | Org units, impact register, heatmap, mitigations | 07 |
| 09 | Processes and SOPs | Process capture, steps, pain points, SOP authoring and export | 06, 08 |
| 10 | Requirements and traceability | Requirements, fit-gap, link tables, coverage, quality checks, handover | 09 |
| 11 | Data readiness | Data entities, field mapping, readiness scorecard | 06 |
| 12 | Plans and entitlements | Plan field, entitlements, the gate helper | 02 |

**Phase 05 is the first sellable point.** A readiness assessment that runs end to end and produces a
report is worth paying for on its own. If a deadline bites, stop there and sell it.

**Phases 01–05 are the capstone's minimum evaluation target.** 01–10 is a realistic full scope for
part-time work over several months. 11–12 are post-capstone, though 12 is small enough to slot in
anywhere after 02.

## A note on detail

Phases 01–05 are specified in full because they are next. Phases 06–12 carry their scope, their tables
and their acceptance criteria, but deliberately less UI detail — by the time you reach them, five
phases of real use will have changed your mind about something, and detail written now would be
fiction. Expand a later phase into full detail when you start it, not before.

## Conventions used in every phase file

- **Scope** — what is in, in one paragraph.
- **Tables** — what this phase creates, with a pointer to `DATA-MODEL.md`.
- **Work** — the ordered task list.
- **Acceptance criteria** — checkable statements. Each one is verified by hand or by test before the
  phase is done.
- **Out of scope** — what belongs to a later phase, so it does not creep in here.
