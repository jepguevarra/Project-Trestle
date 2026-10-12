# Phase 19 — Status reports, playbook, transition and library

## Scope

The Develop- and Exit-phase deliverables: the generated OCM playbook, 3×5 status reports with a
frozen metrics snapshot, lessons learned, the final OCM report, and the firm's own resource library
(`OCM-MODULE.md` §5.14–5.16).

## Tables

`playbook_section`, `status_report`, `lesson_learned`, `library_item` — `DATA-MODEL.md` §15.6.

## Work

1. Schema and RLS. `library_item` files in Supabase Storage under the org's prefix, with storage
   policies matching the table.
2. **Playbook**: thirteen sections; data sections render from the registers at export time, each
   with a narrative block. PDF and DOCX through the phase 05 export pipeline, firm-branded.
3. **Status reports**: list and form (accomplishments, risks and challenges, on the horizon), Draft
   → Published statusbar; publishing freezes `metrics_snapshot`; one-slide PDF export.
4. **Transition** app: the Exit tasks from the checklist, `transition_owner`, lessons learned
   (list grouped by category, org-wide search across engagements).
5. Final OCM report export: readiness trend across waves, adoption, training and comms delivery,
   resistance resolved, lessons learned.
6. **Library** in Settings: the firm's own files tagged by phase and app; shown as a *Resources*
   smart button on the matching app.

## Acceptance criteria

- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean
- [ ] A published status report's numbers do not change when the registers change; a draft's do
- [ ] The playbook exports with every section present, and empty data sections say so in words
- [ ] Lessons learned are searchable across the firm's engagements by owner and admin, and
      consultants see only lessons from engagements they can access
- [ ] A library file is unreachable from another org, by URL and by table (storage policy test)
- [ ] RLS tests pass for all four tables

## Out of scope

Benefits realisation tracking. AI-written narrative (`PRD.md`).
