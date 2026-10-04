# Phase 02 — Clients and engagements

## Scope

The records everything else hangs off: the client companies a firm works with, and the engagements
inside them. Introduces engagement-level access scoping, which is the second half of the tenancy
model and is easier to get right now than to retrofit.

## Tables

`client`, `engagement`, `engagement_assignment` — `DATA-MODEL.md` §1.

## Work

1. Schema for all three, with `engagement.type` and `engagement.status` present from this first
   migration. Both are load-bearing later (`POSITIONING.md` §4.1, `BUSINESS-MODEL.md` §5) and
   backfilling either across live records is painful.
2. RLS: the org predicate on all three, plus the `engagement_scope` policy from `DATA-MODEL.md` §12 on
   `engagement` and `engagement_assignment`.
3. `lib/auth/` gains `requireEngagementAccess(engagementId, level)`.
4. Client list, create, edit. Industry and size band are plain selects.
5. Engagement list, create, edit. Creating one asks for type and target system.
6. Assignment UI: add a member to an engagement as edit or read.
7. Archive and re-activate an engagement. Archived engagements are read-only in the UI and excluded
   from the active list by default.
8. Engagement shell at `app/(app)/[orgSlug]/engagements/[id]/layout.tsx` — the nav that later phases
   hang their modules off. Module links for unbuilt phases are simply absent, not disabled.
9. Seed extends: two clients and two engagements of different `type` per org.

## Acceptance criteria

- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean
- [ ] An admin sees every engagement in the org; a consultant sees only assigned ones
- [ ] A consultant who is not assigned gets a 404 at that engagement's URL
- [ ] A `viewer` can open an assigned engagement and cannot save any change
- [ ] Archiving an engagement removes it from the default list and leaves it fully readable
- [ ] `engagement.type` is required at creation and cannot be null in the database
- [ ] RLS tests pass for `client`, `engagement` and `engagement_assignment`
- [ ] `orgId` is never read from a request body anywhere in this phase

## Out of scope

Instruments, stakeholders, processes. Any count or limit on engagements — that is phase 12.

## Build notes

Where the build departed from the plan or the docs, and why.

1. **The `engagement_scope` policy as sketched in `DATA-MODEL.md` §12 would have widened access.**
   Postgres ORs permissive policies, so adding it next to an org-wide `tenant_isolation` policy lets
   every member see every engagement. Each table has one policy per verb carrying both the org
   predicate and the engagement scope. A test fails if the org-wide policy is reintroduced.
   `DATA-MODEL.md` §12 updated.
2. **Viewer read-only is enforced in RLS, not only by the action wrapper.** Supabase's Data API
   would otherwise let a viewer write directly. A viewer's effective access is read whatever their
   assignment row says.
3. **Composite foreign keys on `(id, org_id)`.** FK checks ignore RLS, so a plain `client_id` FK
   would let an engagement in org A point at org B's client. `engagement → client`,
   `engagement_assignment → engagement` and `engagement_assignment → membership(org_id, user_id)`
   are all composite; the last also removes a member's assignments when they leave the org.
4. **Who may do what**, decided while building (the plan was silent):
   - Admins and owners create and edit clients, create engagements, archive and re-activate,
     and manage assignments.
   - A consultant assigned with `edit` may change an active engagement's name, target system and
     go-live. A trigger stops anyone but an admin changing its client, type or status.
   - Viewers see only the clients of the engagements they are assigned to; a viewer is usually the
     client's own sponsor and must not see the firm's other clients. Consultants see all clients.
   - Engagements have no delete. Archiving is the mechanism.
5. **Archived engagements are read-only in the database too**: the update policy only lets a
   non-admin change an active engagement. Later phases should make every engagement-scoped table
   do the same (use `private.engagement_access` plus the status).
6. **Industry** is stored as text from a fixed list in `lib/validation/engagements.ts`, so the list
   can change without a migration. **Size bands** show headcount ranges (1–9, 10–49, 50–249, 250+).
7. **`target_go_live` is a `date`**, not a `timestamptz`: a go-live is a day in the client's
   calendar, not an instant.
8. **Selects lost their value after a failed submit.** React 19 resets the form after an action,
   and a mounted `<select>` resets to its first default. `SelectField` remounts when its default
   changes. Found by the e2e suite.

New building blocks for later phases: `requireEngagementAccess` and `engagementAction`
(`lib/auth/engagement.ts`), the `private.engagement_access` / `assigned_engagement_ids` /
`editable_engagement_ids` helpers, `Table` / `SelectField` / `ActionButton` components, and the
e2e fixtures in `tests/e2e/fixtures.ts`.

## Acceptance status

| Criterion | Status |
|---|---|
| `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean | Verified |
| An admin sees every engagement; a consultant sees only assigned ones | Verified: RLS suite and e2e |
| An unassigned consultant gets a 404 at that engagement's URL | Verified: e2e (status 404) |
| A viewer can open an assigned engagement and cannot save any change | Verified: e2e (no save controls rendered) and RLS suite (direct updates affect no rows, even with an `edit` assignment) |
| Archiving removes it from the default list and leaves it fully readable | Verified: e2e (archive, find under Archived, open, re-activate) |
| `engagement.type` is required at creation and cannot be null in the database | Verified: e2e (server rejects a missing type) and RLS suite (`not null`) |
| RLS tests pass for `client`, `engagement`, `engagement_assignment` | Verified: cross-tenant and in-org scope tests; mutation-checked |
| `orgId` is never read from a request body | Verified by review: every action resolves the org from the URL slug; related ids are checked by RLS and composite FKs |
| Seed: two clients and two engagements of different `type` per org | Verified against real Supabase Auth; re-running is safe |
