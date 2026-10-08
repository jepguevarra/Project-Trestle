# Deploying Trestle

Vercel hosts the app; Supabase hosts Postgres and Auth. Two environments:

| | Supabase project | Vercel | Git branch |
|---|---|---|---|
| **Staging** | `trestle-staging` | every preview deploy (each PR, and `staging`) | `staging` |
| **Production** | `trestle-production` | production deploy | `main` |

Start with staging only. Production can wait until there is something on `main` to ship.

## 1. Supabase project (once per environment)

1. Create a project at supabase.com. Pick the region closest to your users (Singapore for PH/SEA).
2. **Project Settings → API**: copy the project URL and the anon (or publishable) key.
3. **Connect**: copy two connection strings, with the database password filled in:
   - **Transaction pooler** (port 6543), for the app (`DATABASE_URL` in Vercel).
   - **Session pooler** (port 5432), for migrations (the `DATABASE_URL` secret in GitHub).
4. **Authentication → URL Configuration**:
   - Site URL: the environment's main URL (for staging, the `staging` branch URL Vercel gives you).
   - Redirect URLs: `https://*-<your-vercel-team>.vercel.app/**` (all previews) and
     `http://localhost:3000/**`.
5. **Authentication → Sign In / Providers → Email**: for staging, turn **Confirm email** off, so test
   sign-ups and the seed users can sign in straight away. Leave it on for production.

## 2. Schema

Either run it once from your machine with the session-pooler string:

```bash
DATABASE_URL='postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres' pnpm db:migrate
```

or let `.github/workflows/migrate.yml` do it: in GitHub, **Settings → Environments**, create
`staging` (and later `production`) and add a `DATABASE_URL` secret with the session-pooler string.
Pushes to `staging`/`main` then migrate automatically, and **Actions → Migrate → Run workflow**
migrates on demand.

A PR that adds a migration needs it applied to staging before its preview works. Run the workflow
by hand for that.

Optional demo data on staging:

```bash
NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=… DATABASE_URL='<session pooler>' \
APP_URL='https://<staging url>' pnpm db:seed
```

## 3. Vercel project

1. vercel.com → **Add New → Project** → import `jepguevarra/Project-Trestle`. Framework, pnpm and the
   build command are detected; leave them as they are.
2. **Settings → Git**: production branch `main`.
3. **Settings → Environment Variables**:

| Variable | Preview (staging Supabase) | Production |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | staging project URL | production project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | staging anon key | production anon key |
| `DATABASE_URL` | staging **transaction pooler** string | production transaction pooler string |
| `EMAIL_FROM` | `Trestle <no-reply@your-domain>` | same |
| `EMAIL_DELIVERY` | `console` (links appear in Vercel's runtime logs) or `resend` | `resend` (required) |
| `RESEND_API_KEY` | only if `resend` | required |
| `APP_URL` | leave unset: derived from the preview's branch URL | `https://<production domain>` |
| `SURVEY_TOKEN_SECRET` | optional | recommended: `openssl rand -base64 32`. Signs survey links; changing it revokes every link already sent. Unset, it is derived from `DATABASE_URL` |

Keep **Automatically expose System Environment Variables** on (the default); previews read
`VERCEL_BRANCH_URL` from it.

Every variable is validated at build time, so a missing one fails the deploy with a message naming
it, rather than failing at runtime.

4. Redeploy the PR (or push a commit). The Vercel bot comments the preview URL on the PR.

## What runs where

- The app never uses the service-role key. Do not add it to Vercel until phase 04 needs it, and
  then only server-side (no `NEXT_PUBLIC_` prefix).
- RLS isolation tests run in CI against a throwaway Postgres, never against a hosted database.
