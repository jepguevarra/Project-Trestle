# Phase 02b — View kit and Project Essentials

## Scope

Build the Odoo-shaped shell every later screen is made from (`OCM-MODULE.md` §7), and prove it by
retrofitting the two models that already exist: clients and engagements. Add the engagement's OCM
stage and Project Essentials fields, and the chatter. No new business modules. This phase ends with a
consultant opening an engagement, seeing its app grid, moving its stage along the statusbar, editing
its essentials in place, and reading the history of every change in chatter.

## Tables

`engagement` gains `start_date`, `end_date`, `ocm_stage`, `objectives`, `scope_summary`,
`success_criteria`, `transition_owner` (`DATA-MODEL.md` §1). New: `record_message` (§16).

## Work

1. Migration: the engagement columns, with `ocm_stage` defaulting to `assess` for existing rows.
   `record_message` with RLS (org predicate plus engagement scope when `engagement_id` is set) and
   the generic `private.delete_record_messages()` trigger, attached to `client` and `engagement`.
2. `lib/views/registry.ts`: the closed list of `res_type` values and the typed model-config shape
   (fields, list columns, filters, group-bys, stage field and steps, tracked fields, smart buttons,
   default view). Configs for `client` and `engagement`.
3. `components/views/`:
   - **App shell and navbar**: Trestle mark, apps button, app name, app menus, stage indicator,
     **engagement switcher** (only engagements the user can access), user menu.
   - **Home menu**: the engagement's apps as a plain text grid grouped by phase. In this phase the
     only live apps are Overview (the engagement form) and Settings; the others render as disabled
     tiles saying which phase delivers them.
   - **Control panel**: breadcrumbs, **New**, gear menu, search box with facets, Filters / Group by
     menus, view switcher, pager. All state in URL search params, parsed with Zod.
   - **List view**: columns from config, sort, selection with Action menu, group-by with counts and
     numeric sums, optional-columns toggle.
   - **Kanban view**: columns from the stage field; drag calls the same server action as the
     statusbar. Shipped now so 14 and 16–17 only configure it.
   - **Form view**: header buttons, **statusbar**, smart buttons, sheet, field groups, notebook tabs,
     inline one-to-many list, edit-in-place with Save/Discard on first change, record pager.
   - **Chatter**: log note, timeline of notes and tracking messages. ("Schedule task" arrives with 14.)
4. Tracking: `engagementAction` and `orgAction` diff the model's declared tracked fields inside the
   write transaction and insert one `tracking` message per write.
5. Retrofit `/clients` and `/engagements` lists and the engagement page onto the kit. Delete the
   bespoke table and form components they replace (`components/engagements/*-table.tsx` and so on)
   rather than keeping both.
6. Engagement form: statusbar on `ocm_stage` with a confirmation listing what is incomplete (empty
   for now; phase 14 and 13 fill it); tabs *Essentials*, *Dates*, *Team*; smart buttons rendered
   for the modules that exist.
7. Seed: stages and essentials on the seeded engagements; a few notes and tracking rows.
8. Design pass against `CLAUDE.md`: no icons on smart buttons, no coloured tags, statusbar as text.

## Acceptance criteria

- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean
- [ ] The engagements list supports search facets, a filter, group-by client with counts, and
      pagination, and every one of those survives a reload and the back button (URL state)
- [ ] The same list renders as kanban grouped by stage; dragging a card changes `ocm_stage` and
      writes a tracking message
- [ ] Editing an engagement field in the form writes exactly one tracking message naming the field,
      old value and new value
- [ ] A viewer sees the form read-only, cannot drag kanban cards, and a crafted server action call
      from a viewer is rejected
- [ ] An archived engagement is read-only in the form and the kanban for non-admins
- [ ] The engagement switcher lists only engagements the user can access
- [ ] Deleting a client deletes its chatter (trigger), proven by a test
- [ ] `record_message` passes the cross-org RLS test, and a consultant cannot read messages on an
      engagement they are not assigned to
- [ ] `res_type` values outside the registry are rejected by Zod
- [ ] Usable at 375px: the control panel collapses search and menus behind one button; forms stack
      to one column
- [ ] No bespoke client/engagement table or form components remain

## Out of scope

Tasks and "Schedule task" (14). Calendar, timeline and graph views (built when the first model needs
them: 14 for timeline, 16 for calendar, 13 for graph). Saved views / Favorites (13). Attachments in
chatter.
