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

## Build notes

Where the build departed from the plan or the docs, and why.

1. **Chatter is visible exactly when its record is.** `DATA-MODEL.md` §16 said the policy would
   check only `org_id` and `engagement_id` and never look at `res_type`. That lets a viewer read the
   notes on every client in the org (a client's messages have no `engagement_id`), though RLS hides
   the clients themselves. The read policy now checks that the parent record is visible, by running
   an `EXISTS` on the parent table under its own RLS, per `res_type`. A test fails if the original
   policy is restored. §16 updated.
2. **Who may write chatter = who may edit the record**, enforced in RLS by
   `private.can_write_record_message`. Clients: admins. Engagements: admins, or consultants with edit
   access while active. Viewers write nothing. Messages are append-only (no UPDATE or DELETE grant),
   `system` messages cannot be inserted through the API, and the author must be the caller.
3. **`res_type` is checked twice**: Zod in `lib/views/registry.ts` and a database `CHECK` constraint
   with the same list. A new model with chatter changes both in the same commit.
4. **Tracking is a helper, not wrapper magic.** The doc had `engagementAction` and `orgAction` diff
   tracked fields themselves; the wrappers do not know which row a handler writes. Writes go through
   `updateEngagementTracked` / `updateClientTracked` (`lib/db/mutations`), which read the row, update,
   diff the model's declared tracked fields (`lib/views/<model>.ts`) and insert one tracking message,
   all inside the action's transaction.
5. **Kanban drag calls the statusbar's own action** (`setEngagementStage`), as the doc requires. Each
   movable card also has a "Move to" select, because HTML drag and drop does not exist on phones or
   for keyboard users.
6. **Routes are explicit for now**: `/engagements/[id]` (home menu), `/overview` (the engagement
   form) and `/settings` (team). The generic `[app]` route in `ARCHITECTURE.md` arrives with the first
   phase that adds an app. Settings is the "Settings" tile; the form's Team tab links to it.
7. **The gear menu is not built.** Its items (import, export, archive) belong to later phases; the
   list's selection already offers Archive and Re-activate.
8. **Disabled tiles for unbuilt apps** reverse phase 02's "absent, not disabled" rule, as this phase
   asks. Each tile names the phase that delivers it (`lib/views/apps.ts`).
9. **Found while building:** the org navbar overflowed by 2px at 375px once it had four links (a
   phase 02 regression), and the list lost its confirmation message when an action emptied it. Both
   fixed and covered by e2e tests.

## Acceptance status

| Criterion | Status |
|---|---|
| `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean | Verified |
| Engagements list: search facets, a filter, group-by client with counts, pagination; all survive reload and back (URL state) | Verified: e2e |
| Kanban by stage; dragging a card changes `ocm_stage` and writes a tracking message | Verified: e2e (database checked) |
| Editing a field writes exactly one tracking message naming field, old and new value | Verified: e2e (database checked) and unit tests for the diff |
| A viewer sees the form read-only, cannot drag cards, and a crafted call is rejected | Verified: e2e (no inputs, cards not draggable); a crafted write is refused by `engagementAction` and by RLS (RLS suite) |
| An archived engagement is read-only in the form and the kanban for non-admins | Verified: e2e |
| The engagement switcher lists only engagements the user can access | Verified: e2e |
| Deleting a client deletes its chatter (trigger), proven by a test | Verified: RLS suite |
| `record_message` cross-org RLS test; a consultant cannot read messages on an unassigned engagement | Verified: RLS suite, plus the viewer-and-client case, forging, and append-only |
| `res_type` values outside the registry are rejected by Zod | Verified: unit test (and by the database `CHECK`, RLS suite) |
| Usable at 375px: search and menus behind one button; forms stack | Verified: e2e, including no horizontal scroll |
| No bespoke client/engagement table or form components remain | Done: `engagement-table`, `create-engagement-form`, `engagement-details-form` and `client-form` deleted; the dashboard uses the list view |
