# Trestle — Claude Code Working Agreement

Read this file first, every session. It is the contract for how work happens in this repo.

## What Trestle is

A multi-tenant SaaS for **pre-implementation change readiness** on technology-driven change.
Consulting firms use it to run the assessment and documentation work that should happen *before* a
new system goes live: measuring whether an organisation is ready to change, mapping who is affected
and how badly, capturing the processes that are about to be rebuilt, and specifying what the new
system must do.

Scope is any engagement where a system is being introduced or replaced, existing ways of working
will change, and someone has to specify what the new system must do — packaged software (ERP, CRM,
HRIS, WMS, POS), custom builds, platform migrations, automation, and digitalisation of manual
processes. It is **not** for change with no system attached (reorganisations, M&A, policy); see
`docs/POSITIONING.md`.

Buyers are implementation partners and independent functional consultants. The product is
domain-general; the go-to-market is ERP-first, because that is where the founder's network and
credibility are. Their clients are mid-market companies implementing Odoo, SAP B1, NetSuite,
Dynamics and their equivalents in other software categories.

The product is **not** an ERP, not a project-management tool, and not a generic survey platform.
Every feature must be defensible as "a consultant would bill for this."

## Current state

Phase 01 (foundations) is built: auth, organisations, membership, invitations, RLS and the RLS test
harness. Its build notes and acceptance status are at the end of
`docs/plan/phase-01-foundations.md`. `docs/plan/` holds the phase-by-phase build order, phases
01–12. **Do not skip ahead.** Each phase depends on the schema and primitives of the ones before it.

Next is `docs/plan/phase-02-clients-engagements.md`. Phase 05 is the first sellable point. Phases
01–05 are the capstone's minimum evaluation target.

Tenant queries run inside `withRls` (`lib/db`), which switches to Supabase's `authenticated` role
with the user's claims so RLS applies. Drizzle's owner connection bypasses RLS. RLS tests run
against a real Postgres: `pnpm db:test:start`, export the URL it prints as `TEST_DATABASE_URL`, then
`pnpm test`.

Two ordering constraints are expensive to get wrong and are called out where they bite:
`engagement.type` ships with `engagement` in phase 02, and `elicitation_source` (phase 06) ships
before processes carry real data in phase 09.

## Documents

| File | What it answers |
|---|---|
| `docs/PRD.md` | Who it's for, the core modules, what is explicitly out of scope |
| `docs/RESEARCH.md` | Literature base for the readiness instrument, the competitive gap, capstone framing and evaluation plan |
| `docs/BA-LAYER.md` | Which BA/BABOK features to build, what was cut and why, the elicitation + traceability spine |
| `docs/TOOL-LANDSCAPE.md` | Existing BA, requirements and ERP-vendor tools; the comparison matrix for the Related Systems chapter |
| `docs/REQUIREMENTS-MODULE.md` | Fit-gap disposition, the pattern library, ERP quality checks, and which BA techniques become tools |
| `docs/POSITIONING.md` | How wide the product's scope is, the engagement-type model, and the digital-transformation literature base |
| `docs/BUSINESS-MODEL.md` | The value metric, the tier structure, what may never be gated, and the entitlement layer to build now |
| `docs/ARCHITECTURE.md` | Stack, app structure, auth, tenancy, the decisions already made |
| `docs/DATA-MODEL.md` | Every table, every RLS policy, the instrument engine, the anonymity mechanism |
| `docs/plan/README.md` | Phase index and how to run a phase |
| `docs/plan/phase-NN-*.md` | The actual work, with acceptance criteria |

If reality diverges from a doc, **update the doc in the same commit as the code**. A stale
architecture doc is worse than none.

## Stack (decided — do not substitute)

- **Next.js 15**, App Router, TypeScript `strict: true`
- **Supabase** — Postgres, Auth, Storage, Row Level Security
- **Drizzle ORM** for schema-as-code; `drizzle-kit` generates migrations; RLS policies live in
  hand-written SQL inside the same migration files
- **Tailwind CSS** + **shadcn/ui** (copy components in, don't wrap them in another layer)
- **Zod** for every boundary (form input, route handler body, env vars)
- **Server Actions** for mutations, validated with Zod. No REST API layer unless a phase says so.
- **Recharts** for charts
- **Resend** for transactional email
- **Vitest** for unit/integration, **Playwright** for end-to-end
- **Vercel** for hosting; preview deploy per PR

Do not add a state library, a UI kit, an ORM, or an auth provider that isn't on this list without
asking. Adding a dependency is a decision, not an implementation detail.

## Commands

```bash
pnpm dev              # local dev server
pnpm build            # production build — must pass before any phase is "done"
pnpm lint             # eslint
pnpm typecheck        # tsc --noEmit
pnpm test             # vitest
pnpm test:e2e         # playwright
pnpm db:generate      # drizzle-kit generate — after editing schema
pnpm db:migrate       # apply migrations to the linked Supabase project
pnpm db:studio        # drizzle studio
```

`pnpm` only. Not npm, not yarn.

## Code conventions

- Directory layout is in `docs/ARCHITECTURE.md`. Follow it; don't invent parallel structures.
- Server Components by default. `"use client"` only when there is interactivity, and push it to
  the smallest leaf component that needs it.
- Data access lives in `lib/db/queries/` and `lib/db/mutations/`. Components never build SQL and
  never import the Drizzle client directly.
- Every mutation is a Server Action in `app/**/actions.ts`, wrapped so it: validates input with
  Zod → checks the caller's org membership → performs the write → `revalidatePath`.
- Never trust `orgId` from the client. Derive it server-side from the session and the resource
  being touched.
- Dates are `timestamptz`. Money, if it ever appears, is integer minor units.
- Table and column names: `snake_case`. TypeScript: `camelCase`. Files: `kebab-case`.
- No `any`. No `@ts-ignore` without a comment explaining the specific reason.

## Security rules (non-negotiable)

1. **Every tenant-scoped table carries `org_id`**, even when it could be derived by joining. RLS
   policies are simple and fast only because of this denormalisation.
2. **RLS is enabled on every table in `public`.** A table without a policy is a bug, not a default.
3. The **service-role key never reaches the browser** and never appears in a Client Component.
   It is used only inside route handlers under `app/api/public/**`.
4. Anonymous survey respondents **never talk to Supabase directly.** They hit a Next.js route
   handler that validates a signed, single-purpose token and then writes with the service role.
   See `docs/DATA-MODEL.md` § Anonymous respondent path.
5. Assessment responses are the most sensitive data in the product — employees saying their
   leadership is unprepared. Respect the per-instrument anonymity setting everywhere, including
   in exports and in any aggregate that could be de-anonymised by small-n filtering. Minimum
   segment size for showing a breakdown is **5 respondents**.

## Design rules

The look is **plain, restrained, and professional** — this is software a consultant opens in
front of a CFO.

- Neutral palette: near-black text, white/very light grey surfaces, one muted accent.
- **No gradients, no glows, no glassmorphism, no colour-washed cards, no pill badges in five
  different colours, no decorative icons.**
- Separation by 1px borders and whitespace, not drop shadows.
- Semantic colour only where it carries meaning (a risk severity, a readiness band) — and even
  then, muted, and never as the only signal; pair with a number or a label.
- Data tables: dense, left-aligned text, right-aligned numbers, no zebra striping.
- Charts: one colour per series, no 3D, no rounded bars, direct labels over legends where it fits.
- Typography: one sans face (Inter or system stack), two weights, three sizes. That's enough.

If a screen looks like an AI generated it, it's wrong. Boring and legible beats impressive.

## Definition of done (per phase)

A phase is not complete until all of these are true:

- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck` all pass clean
- [ ] Every new table has RLS enabled and at least one policy, with a test proving a user in
      org A cannot read org B's rows
- [ ] The phase's acceptance criteria are each verified, by hand or by test
- [ ] Docs updated if the implementation diverged from the plan
- [ ] Seed data covers the new tables so a fresh clone is usable in one command

## How to work

- **One phase per branch**, `phase-NN-slug`. Small commits.
- At the start of a phase, restate the plan in your own words and flag anything that looks wrong
  before writing code. The plan was written up front; it will be wrong in places.
- When something is ambiguous, ask. Don't invent product decisions and bury them in code.
- Prefer deleting code over adding an abstraction. There is no legacy here to protect.
