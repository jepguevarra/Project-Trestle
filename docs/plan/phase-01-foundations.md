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
