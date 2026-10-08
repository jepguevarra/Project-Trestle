# Project Trestle

A workspace for implementation partners and functional consultants: readiness assessment,
stakeholder mapping, change impact and process documentation for a client preparing for a new
system, linked in one engagement. See [`docs/PRD.md`](docs/PRD.md).

**Status:** phases 01, 02, 02b, 03 and 04 of [`docs/plan/`](docs/plan/README.md): auth and
organisations, clients and engagements, the Odoo-style view kit, and the instrument engine (readiness
assessments built from templates, with a builder and a respondent preview), and distribution (respondent lists, emailed survey links, a public survey page that works on a phone, reminders, anonymous submission).

## Stack

Next.js 15 (App Router) · Supabase (Postgres, Auth) · Drizzle · Tailwind + shadcn/ui-style
components · Resend · Vitest. The reasoning is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Getting started

Requires Node 20.18+, pnpm 10, and the [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
pnpm install
supabase start                       # local Postgres, Auth and Inbucket (email catcher)
cp .env.example .env.local           # paste the anon key `supabase start` printed
pnpm db:migrate
pnpm db:seed                         # alice@acme.test / bob@beacon.test / carol@freelance.test
pnpm dev
```

The seed users' password is `trestle-dev-password`. With `EMAIL_DELIVERY=console`, invitation
emails are printed to the dev server's log.

## Checks

```bash
pnpm lint && pnpm typecheck && pnpm build
pnpm db:test:start                   # or point TEST_DATABASE_URL at supabase's :54322
export TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:54329/postgres
pnpm test                            # unit + RLS isolation (Vitest)
pnpm test:e2e                        # Playwright; needs `supabase start` and `pnpm db:migrate`
```

The RLS suite creates and drops its own database. It never skips: without `TEST_DATABASE_URL` it
fails.

## Deploying

Vercel + Supabase, with a preview per PR: see [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Branches

- `main`: stable, production-ready code
- `staging`: pre-production integration branch

## Working in this repo

Read [`CLAUDE.md`](CLAUDE.md) first: it is the working agreement for this repo.
