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

Phases are **run in the Order column**, not by number. The numbers are stable identifiers that other
docs cite; the OCM lifecycle (`OCM-MODULE.md`, October 2026) added 02b and 13–20 without renumbering.

| Order | # | Phase | Delivers | Depends on |
|---|---|---|---|---|
| 1 | 01 | Foundations ✓ | Next.js + Supabase + Drizzle, auth, orgs, membership, the RLS test harness, seed | — |
| 2 | 02 | Clients and engagements ✓ | Client and engagement records with `type`, assignment, the app shell | 01 |
| 3 | **02b** | **View kit and Project Essentials** ✓ | The Odoo-style shell: apps, control panel, list/kanban/form, statusbar, smart buttons, chatter; engagement stage and essentials | 02 |
| 4 | 03 | Instrument engine | Instruments, dimensions, sections, questions, templates; full `kind` enum and `wave` | 02b |
| 5 | 04 | Distribution and response | Respondents, signed tokens, the public survey page, nudges | 03 |
| 6 | 05 | Scoring and report | Scoring functions, dashboard, consensus, perception gap, alpha, export | 04 |
| 7 | **14** | **Checklist and RACI** | Task templates, the shipped OCM checklist, phase progress, RACI | 02b |
| 8 | 06 | The evidence spine | Elicitation sources, extracts, attachments, the elicitation log | 02 |
| 9 | 07 | **Audiences** and stakeholders | Org units, people, stakeholder assessment, sponsor and stakeholder risk, group readiness profiles | 02b |
| 10 | 08 | **Changes**, impacts **and change risk** | Changes × groups, No/Low/Mid/High, saturation, mitigations, change risk assessment | 07 |
| 11 | **15** | **Resistance** | Resistance register, hotspots | 07, 08 |
| 12 | **16** | **Communications and events** | Channels, message library, comms plan, briefings and town halls | 07, 08 |
| 13 | **17** | **Champions and training** | Champion network and coverage; courses, sessions, enrollment | 07, 08 |
| 14 | 09 | Processes and SOPs | Process capture, steps, pain points, SOP authoring and export | 06, 08 |
| 15 | 10 | Requirements and traceability | Requirements, fit-gap, link tables, coverage, quality checks, handover | 09 |
| 16 | **13** | **Overview, metrics, roadmap, reporting** | `DASHBOARD.md` plus the OCMS snapshot; milestones and gates; portfolio; saved views | 05, 08, 14 |
| 17 | **18** | **Go-live and adoption** | Go/no-go milestone, decision record, adoption instruments | 13, 16, 17 |
| 18 | **19** | **Status reports, playbook, transition, library** | 3×5 reports, generated playbook, lessons learned, final report, firm library | 13 |
| 19 | 11 | Data readiness | Data entities, field mapping, readiness scorecard | 06 |
| 20 | 12 | Plans and entitlements | Plan field, entitlements, the gate helper | 02 |
| 21 | **20** | **UAT** *(optional)* | Test cases linked to requirements, pass ratio for go/no-go | 10, 18 |

**Phase 05 is the first sellable point.** A readiness assessment that runs end to end and produces a
report is worth paying for on its own. If a deadline bites, stop there and sell it.

**Phases 01–05 are the capstone's minimum evaluation target.** With the OCM lifecycle the realistic
part-time capstone scope is through order 10 (… 07, 08 and 14), which reproduces the whole OCMS
*Assess* phase. Orders 11 onward are post-capstone; 12 is small enough to slot in anywhere after 02.

02b comes before 03 on purpose: every screen from 03 on is built from the view kit, and retrofitting
twenty screens later costs more than building the kit first.

## A note on detail

Phases 01–05 and 02b are specified in full because they are next. Phases 06–20 carry their scope,
their tables and their acceptance criteria, but deliberately less UI detail (the view kit and
`OCM-MODULE.md` already fix the shape of every screen) — by the time you reach them, five
phases of real use will have changed your mind about something, and detail written now would be
fiction. Expand a later phase into full detail when you start it, not before.

## Conventions used in every phase file

- **Scope** — what is in, in one paragraph.
- **Tables** — what this phase creates, with a pointer to `DATA-MODEL.md`.
- **Work** — the ordered task list.
- **Acceptance criteria** — checkable statements. Each one is verified by hand or by test before the
  phase is done.
- **Out of scope** — what belongs to a later phase, so it does not creep in here.
