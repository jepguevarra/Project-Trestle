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
