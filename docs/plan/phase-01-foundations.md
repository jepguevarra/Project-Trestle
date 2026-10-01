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

1. **Drizzle bypasses RLS unless told otherwise.** Drizzle connects as the database owner, which
   ignores every policy. All tenant queries run inside `withRls` (`lib/db/rls.ts`), which sets
   `request.jwt.claims` and `SET LOCAL ROLE authenticated` per transaction. The RLS suite calls the
   same function, so the tests exercise the app's real path. `ARCHITECTURE.md` updated.
2. **The canonical policy recurses on `membership`.** Policies use a `SECURITY DEFINER` helper,
   `private.user_org_ids()`, with the same predicate. `DATA-MODEL.md` §12 updated.
3. **Write policies check role on the three tenancy tables**, because Supabase's Data API exposes
   them: with a plain org predicate a viewer could promote themselves to owner. Members read; admins
   manage; only owners touch owners; an org always keeps one owner (trigger).
4. **Org creation and invitation acceptance are `SECURITY DEFINER` functions.** A new user has no
   membership to satisfy RLS with, and an invitee cannot see the invitation. Sign-up creates the
   org and owner membership in a trigger on `auth.users`, in the same transaction as the user.
5. **Org slugs never take a top-level route's name** (`login`, `welcome`, `invite`…), because those
   routes shadow `/[orgSlug]`.
6. **`EMAIL_DELIVERY=console`** lets local development run without a Resend key. It is refused on
   a Vercel production deploy (`VERCEL_ENV=production`), not on `NODE_ENV=production`, because
   `next build` always sets the latter.
7. **Failed form submissions echo their values back** (never passwords or tokens). React 19 resets
   a form after its action runs, so without this a mistyped password also wiped the email field.
   Found by driving sign-in against real Supabase Auth; covered by an e2e test.
8. **A pending invitation is checked before insert, not caught on conflict.** Catching the
   unique violation inside the transaction does not work: the transaction is already aborted and
   the commit re-throws. An expired, unaccepted invitation is cleared so the address can be
   re-invited.

## Product decisions made during the build: confirm or change

- Invitations expire after **7 days**.
- Only owners can grant, change or remove the owner role; admins manage everyone else.
- A signed-in user with no org lands on `/welcome` to create one; the org switcher links there too.
- Re-inviting an existing member is refused; accepting an invitation when already a member keeps
  the existing role.

## Acceptance status

| Criterion | Status |
|---|---|
| `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean | Verified |
| New user signs up and lands in their own org as `owner` | Verified end to end against Supabase Auth (GoTrue built from current source) and Postgres 16 (`tests/e2e`) |
| Owner invites by email; invitee accepts with the right role | Verified: e2e for the invite; invitee sign-up through the invite link and acceptance driven in a browser against real Auth |
| Non-member gets 404, not 403, at `/[orgSlug]` | Verified (`tests/e2e`): 404 status and the not-found page |
| RLS: A cannot select/insert/update/delete B's `organization`, `membership`, `invitation` | Verified (`pnpm test`); the suite fails when a policy is weakened |
| Service-role key in no Client Component or `NEXT_PUBLIC_` var | Enforced by `tests/unit/secrets-boundary.test.ts` |
| A missing env var fails `pnpm build` | Verified |
| `pnpm db:seed` produces a working two-org dataset | Verified against real Auth: two orgs, three users, a cross-org member and a pending invitation; re-running is safe |
| Deploy to Vercel with a preview per PR | Not done: needs the Vercel and Supabase projects connected |

Not verified: the password-reset email round trip. It needs an SMTP catcher (`supabase start`
provides Inbucket); the request and update-password pages render and validate.
