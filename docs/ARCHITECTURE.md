# Trestle — Architecture

## Decisions already made

These were settled before the first line of code. Revisit them only with a reason written down.

| Decision | Choice | Why |
|---|---|---|
| Framework | Next.js 15, App Router | Server Components keep tenant data server-side by default; one deploy target |
| Database & auth | Supabase | Postgres with RLS is the cheapest correct multi-tenancy; auth, storage and email come with it |
| ORM | Drizzle | Schema as TypeScript, generated migrations, no runtime magic. RLS policies stay as raw SQL in the same migration files |
| Mutations | Server Actions | No API layer to keep in sync for a first-party-only client |
| Tenancy | Shared schema, `org_id` column, RLS | Schema-per-tenant is operationally miserable at this scale |
| Styling | Tailwind + shadcn/ui | Components are copied in and owned, not wrapped |
| Charts | Recharts | Composable, enough for grids, bars, heatmaps |
| Email | Resend | Survey invitations and nudges |
| Exports | React-PDF for PDF, docx (npm) for Word | Rendered server-side in a route handler |
| Hosting | Vercel + Supabase cloud | Preview deploy per PR |

## Tenancy model

```
organization  (the consulting firm — the tenant boundary)
  └── membership (user ↔ org, with role)
  └── client     (the company being implemented at)
        └── engagement  (one change programme; everything else hangs off this)
              ├── instrument_instance   (a readiness or impact survey run)
              ├── stakeholder
              ├── org_unit / process / impact
              └── sop_document
```

`org_id` is denormalised onto **every** tenant-scoped table — including deep children like
`response` — so that every RLS policy is a single indexed predicate with no joins.

The canonical policy shape:

```sql
create policy tenant_isolation on <table>
  for all
  using  (org_id in (select org_id from membership where user_id = auth.uid()))
  with check (org_id in (select org_id from membership where user_id = auth.uid()));
```

Engagement-level scoping (Consultant and Viewer roles see only assigned engagements) is layered
on top of, not instead of, the org predicate.

## Directory layout

```
app/
  (marketing)/                 public site, pricing, login
  (app)/
    [orgSlug]/
      layout.tsx               org shell: nav, org switcher, membership guard
      page.tsx                 org dashboard
      clients/
      engagements/[id]/
        readiness/
        stakeholders/
        impacts/
        processes/
        report/
      settings/                members, invitations, templates, branding
  api/
    public/
      survey/[token]/route.ts  anonymous respondent read + submit (service role)
    exports/[kind]/route.ts    PDF / DOCX generation
    webhooks/
components/
  ui/                          shadcn primitives, unmodified
  charts/                      recharts wrappers with the house style baked in
  <feature>/                   feature components, colocated by module
lib/
  auth/                        session, membership resolution, role guards
  db/
    schema/                    drizzle table definitions, one file per domain
    queries/                   read functions, always take an explicit orgId
    mutations/                 write functions
    seed.ts
  scoring/                     readiness + impact scoring, pure functions, unit tested
  tokens/                      signed respondent token mint + verify
  validation/                  zod schemas shared by forms and actions
drizzle/                       generated migrations + hand-written RLS SQL
docs/
tests/
  e2e/
```

## Request paths

**Authenticated app.** Browser → Server Component / Server Action → Supabase client carrying the
user's JWT → RLS enforces isolation. The app never sets `org_id` from a request body; it resolves
the org from the URL slug and verifies membership in `lib/auth`.

**Anonymous respondent.** Browser → `app/api/public/survey/[token]` → verify signed token →
service-role Supabase client → write scoped strictly to that respondent's row. RLS is bypassed
here by necessity, which is exactly why this is the only place the service role appears and why
every write in it is narrowed by the token's claims. Token claims: `respondent_id`,
`instance_id`, `exp`. Tokens are single-instrument, expire at the instrument close date, and are
revoked by rotating a per-instance secret.

**Exports.** Server-rendered in a route handler under the user's session, so RLS still applies.
Generated files stream back directly; nothing is persisted to storage in v1 unless a phase says
it should be.

## Scoring

All scoring lives in `lib/scoring/` as pure functions over plain arrays — no database access.
This makes it unit-testable and makes the numbers auditable, which matters because a consultant
will be asked "where did 62% come from?" in front of a client.

- Readiness: normalise each answer to 0–100, weight by question weight, average within dimension,
  weight dimensions to an overall index. Unanswered questions are excluded, not zeroed.
- Segment breakdown returns `null` with a reason when `n < 5`, and the UI must render that reason
  rather than a blank.
- Impact heatmap cell = max severity in the cell, with count carried alongside.

## Environments

- **Local** — Supabase local stack (`supabase start`) or a personal cloud project. Seeded.
- **Preview** — Vercel preview per PR, pointed at a shared staging Supabase project.
- **Production** — Vercel production + its own Supabase project.

Env vars are validated at boot by a Zod schema in `lib/env.ts`; a missing var fails the build,
not the first request.

## Testing strategy

- **Unit (Vitest):** everything in `lib/scoring/`, `lib/tokens/`, and every Zod schema.
- **Integration (Vitest + a test Postgres):** RLS. For each tenant-scoped table there is a test
  that user A cannot select, insert, update, or delete a row belonging to org B. This suite is
  the one that must never be skipped.
- **E2E (Playwright):** three flows — sign up and create an org; run an assessment end to end
  (create instrument → invite → answer as anonymous respondent → see the score); author and
  export an SOP.

## Performance notes

Nothing here is high-traffic — a big engagement is 300 respondents. Do not pre-optimise. The two
things that will actually bite: index every `org_id` and every foreign key, and compute scores on
read for v1, caching only when a real dashboard feels slow.
