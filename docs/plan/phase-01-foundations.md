# Phase 01 — Foundations

## Scope

A deployable Next.js application on Supabase with authentication, organisations, membership and
working Row Level Security, plus the test harness that proves the isolation holds. Nothing
user-facing beyond sign-up, an org shell and a members page. This phase exists so that every phase
after it inherits a correct tenancy model rather than retrofitting one.

## Tables

`organization`, `membership`, `invitation` — `DATA-MODEL.md` §1.

## Work

1. Scaffold Next.js 15 (App Router, TypeScript `strict: true`), Tailwind, shadcn/ui. `pnpm` only.
2. `lib/env.ts` — Zod schema validating every env var at boot. A missing var fails the build.
3. Supabase project, local stack running via `supabase start`.
4. Drizzle set up; `lib/db/schema/` with `organization`, `membership`, `invitation`.
5. First migration, with RLS policies hand-written into the same file.
6. Auth: sign up, sign in, sign out, password reset. Supabase Auth, no third-party provider.
7. Sign-up creates an organisation and an `owner` membership in one transaction.
8. `lib/auth/` — session resolution, `resolveOrgFromSlug`, `requireMembership(orgSlug, minRole)`.
9. The org shell at `app/(app)/[orgSlug]/layout.tsx`: nav, org switcher, membership guard.
10. Members page: list, invite by email, change role, remove. Invitations via Resend.
11. **The RLS test harness** — a Vitest setup that runs against a test Postgres, creates two orgs and
    a user in each, and exposes a helper to assert cross-tenant denial for any table.
12. `lib/db/seed.ts` — two orgs, three users, so a fresh clone is usable in one command.
13. Deploy to Vercel; preview deploy per PR confirmed working.

## Acceptance criteria

- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean
- [ ] A new user can sign up and lands in their own organisation as `owner`
- [ ] An owner can invite a user by email; the invited user accepts and appears with the right role
- [ ] A user who is not a member of an org gets a 404 — **not** a 403 — at `/[orgSlug]`
- [ ] RLS test: a user in org A cannot `select`, `insert`, `update` or `delete` rows in `organization`,
      `membership` or `invitation` belonging to org B
- [ ] The service-role key appears in no Client Component and no `NEXT_PUBLIC_` variable
- [ ] A missing env var fails `pnpm build`, not the first request
- [ ] `pnpm db:seed` on a fresh database produces a working two-org dataset

## Out of scope

Clients, engagements, billing, anything with `engagement_id` on it. Org settings beyond members.

## Build notes

Where the build departed from the plan or the docs, and why. Per `README.md` step 2.

1. **Drizzle bypasses RLS unless told otherwise.** `ARCHITECTURE.md` routes app queries through "a
   Supabase client carrying the user's JWT", but Drizzle connects as the database owner, which
   ignores every policy. All tenant queries therefore run inside `withRls` (`lib/db/rls.ts`), which
   sets `request.jwt.claims` and `SET LOCAL ROLE authenticated` per transaction. The RLS suite calls
   the same function, so the tests exercise the app's real path.
2. **The canonical policy recurses on `membership`.** A policy on `membership` that selects from
   `membership` fails with "infinite recursion detected in policy". Policies use a
   `SECURITY DEFINER` helper, `private.user_org_ids()`, instead. The predicate is the same, and so is
   the index it uses.
3. **Write policies check role on these three tables**, not only org membership. Supabase exposes
   `public` through its Data API, so with a plain `for all` org predicate a viewer could promote
   themselves to owner. Rule: members read; admins manage; only owners touch owners. An org also
   always keeps at least one owner, enforced by a trigger.
4. **Org creation and invitation acceptance are `SECURITY DEFINER` functions.** A new user has no
   membership to satisfy RLS with, and an invitee cannot see the invitation. Sign-up creates the
   org and the owner membership in a trigger on `auth.users`, in the same transaction as the user.
   `public.accept_invitation(token)` checks the hash, expiry, single use and that the address matches
   the signed-in user's.
5. **Org slugs never take a top-level route's name** (`login`, `welcome`, `invite`…), because those
   routes shadow `/[orgSlug]`.
6. **`EMAIL_DELIVERY=console`** was added so local development does not need a Resend key. It is
   refused on a Vercel production deploy (`VERCEL_ENV=production`), not on `NODE_ENV=production`,
   because `next build` always sets the latter.
7. **The seed creates users through Supabase Auth's normal sign-up**, so it needs the Supabase stack
   running. It uses the anon key, not the service role.

## Acceptance status

| Criterion | Status |
|---|---|
| `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean | Verified |
| New user signs up and lands in their own org as `owner` | DB side verified (sign-up trigger, RLS suite). Not yet run against live Supabase Auth |
| Owner invites by email; invitee accepts with the right role | Verified in a browser against the built app and Postgres, with a stubbed Auth endpoint |
| Non-member gets 404, not 403, at `/[orgSlug]` | Verified (same stubbed-Auth run): member 200, non-member 404, unknown org 404 |
| RLS: A cannot select/insert/update/delete B's `organization`, `membership`, `invitation` | Verified (`pnpm test:rls`); the suite fails when a policy is weakened |
| Service-role key in no Client Component or `NEXT_PUBLIC_` var | Enforced by `tests/unit/secrets-boundary.test.ts` |
| A missing env var fails `pnpm build` | Verified |
| `pnpm db:seed` produces a working two-org dataset | Written; needs `supabase start` to run |
| Deploy to Vercel with a preview per PR | Not done: needs the Vercel and Supabase projects to be connected |
