# Phase 14 — Checklist and RACI

## Scope

The OCM method as a list: phased tasks from a reusable template, the shipped checklist covering the
full Assess → Exit sequence in Trestle's own words, phase progress on the engagement statusbar, tasks
scheduled from any record's chatter, and the RACI matrix (`OCM-MODULE.md` §4.2–4.3). Runs straight
after the first sellable point because it gives every later app somewhere to land its follow-ups.

## Tables

`task_template`, `task_template_line`, `task`, `raci_role`, `raci_entry` — `DATA-MODEL.md` §15.1.

## Work

1. Schema and RLS. `task.res_type/res_id` validated against the registry; the delete trigger from
   02b attached to every model with chatter.
2. Write the shipped system template: roughly fifty tasks across the five phases, each with a
   `tool_key`. Own wording, informed by the OCMS sequence; nothing copied.
3. Template management in Settings: copy the system template, edit lines, reorder, set phase and
   tool.
4. "Start from template" on a new or existing engagement; re-applying never duplicates lines already
   created from the same template line.
5. **Checklist** app: list grouped by phase (default), kanban by status, and the **timeline view**
   (first use: built into the kit here). Filters: mine, overdue, current stage.
6. The task form: phase, assignee (member or free-text), dates, status statusbar, the "Open" button
   that deep-links to `tool_key`, and the linked record when `res_type` is set.
7. **Schedule task** in chatter: creates a task linked to that record; shown in the record's chatter
   and in the Checklist.
8. Phase progress on the engagement statusbar (`Assess 14/21`); the stage-change confirmation lists
   open tasks in the earlier phase.
9. Pending tasks panel for the Overview: open tasks assigned to me, by due date.
10. RACI: roles per engagement, matrix editor (deliverables × roles), the exactly-one-A check, export.

## Acceptance criteria

- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean
- [ ] Applying the system template to a new engagement creates every line once, in order, by phase;
      applying it again creates nothing
- [ ] Phase progress excludes cancelled tasks
- [ ] Moving the engagement to Develop with open Assess tasks shows them in the confirmation and
      still allows the move
- [ ] A task scheduled from a stakeholder's chatter appears in the Checklist with a link back
- [ ] Deleting a record deletes the tasks linked to it through `res_type/res_id` (trigger test)
- [ ] The timeline view renders dated tasks per phase and is legible at 375px as a list fallback
- [ ] A RACI deliverable with zero or two As is flagged
- [ ] RLS tests pass for all five tables

## Out of scope

Dependencies, effort, resourcing, critical path: the checklist is not a project plan (`CLAUDE.md`).
Email reminders for due tasks.
