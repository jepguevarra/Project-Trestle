# Trestle — working rules

> **Reconstructed.** The original `CLAUDE.md` was referenced by the docs but not in the repo. This
> version is assembled from the rules the other docs quote from it. Replace it with the original if
> you have it, and keep the definition of done below in sync.

## What Trestle is

A multi-tenant workspace for firms preparing a client for a **technology-driven change**: a system
is being introduced or replaced, existing ways of working will change, and someone has to specify
what the new system must do. It holds readiness assessment, stakeholder mapping, change impact,
process documentation and requirements in one linked engagement. ERP partners are the first market,
not the boundary (`docs/POSITIONING.md`).

The product is not an ERP, not a project-management tool, and not a generic survey platform. Every
feature must be defensible as "a consultant would bill for this."

## Read first

- `docs/PRD.md`: what v1 is, and what it is not
- `docs/ARCHITECTURE.md`: decisions already made, the directory layout, the request paths
- `docs/DATA-MODEL.md`: every table and policy
- `docs/plan/README.md`: the phase index, and how to run a phase

## Commands

```
pnpm dev                 # app on :3000 (needs .env.local; see .env.example)
pnpm build | lint | typecheck
pnpm test:unit
pnpm db:test:start       # throwaway Postgres for the RLS suite; export the URL it prints
pnpm test:rls            # needs TEST_DATABASE_URL; never skipped
pnpm db:generate         # after editing lib/db/schema/, then hand-write RLS into the new file
pnpm db:migrate | db:seed
```

`pnpm` only.

## Rules that are easy to break

1. **Every tenant-scoped table carries `org_id`**, even when it could be derived by joining.
2. **RLS is enabled on every table in `public`.** A table without a policy is a bug, not a default.
   Policies are hand-written into the same migration file as the table.
3. **Tenant queries run inside `withRls`** (`lib/db`), which drops to the `authenticated` role with
   the user's claims. `dbOwner` bypasses RLS; it is for migrations, the seed and documented
   exceptions only.
4. **`org_id` is never read from a request body.** The org comes from the URL slug, and membership is
   verified in `lib/auth`. Org-scoped Server Actions go through `orgAction`.
5. **The service role appears in exactly one place**: `app/api/public/survey/[token]/route.ts`
   (phase 04). Never in a Client Component, never in a `NEXT_PUBLIC_` variable. A unit test enforces
   this.
6. A non-member gets a **404, not a 403**, for anything under `/[orgSlug]`.
7. Names are `snake_case` in SQL; dates are `timestamptz`; there are no nullable booleans. Index every
   `org_id` and every foreign key.
8. Scoring lives in `lib/scoring/` as pure functions with no database access. Unanswered items are
   excluded, not zeroed. Segments under n = 5 are suppressed **on the filter intersection**, and the
   reason is rendered, never a blank.
9. Anonymity, n = 5 suppression and export of a client's own data are **never gated** by plan.
10. TypeScript is `strict`, with no `any`. Every form and every Server Action is validated by Zod.
11. Charts: one colour per series, no 3D, no rounded bars. Colour is always paired with a number.
12. Build the joins between modules from the start, even when the UI surfaces them late.
13. **Explicit link tables per pair**, never a generic `(from_type, from_id, to_type, to_id)` table.

## Definition of done (every phase)

- `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean
- Every new tenant-scoped table has an RLS isolation test (`tests/rls/harness.ts` →
  `expectCrossTenantDenied`), written in the same commit as the table
- Every acceptance criterion in the phase file is verified by hand or by test
- The phase file's "Out of scope" list has not been touched
- Anything the plan got wrong is written down in the phase file's build notes, not silently changed
