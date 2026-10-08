# Phase 04 — Distribution and response

## Scope

Get the instrument to people and their answers back. Respondent lists, signed tokenised links, the
public survey page for people with no account, completion tracking and reminders. This phase contains
the only service-role code path in the product and the anonymity mechanism — both get more care than
their size suggests.

## Tables

`respondent`, `response` — `DATA-MODEL.md` §3.

## Work

1. Schema and RLS. `response` carries `department`, `role_title` and `seniority` denormalised, and a
   **nullable** `respondent_id`.
2. `lib/tokens/` — mint and verify. Claims: `respondent_id`, `instrument_id`, `token_version`, `exp`.
   Unit-tested for expiry, tampering, wrong instrument and stale `token_version`.
3. Respondent list: type in, or paste/upload CSV with name, email, department, role, seniority.
   Duplicate emails per instrument are rejected, not silently merged.
4. Open an instrument: validate, freeze the question set, send invitations via Resend.
5. `app/api/public/survey/[token]/route.ts` — the only place the service role appears. Implements the
   five steps in `DATA-MODEL.md` §12 exactly.
6. The public survey page: no login, no Supabase client in the browser, saves partial answers,
   resumable, works well on a phone. States an anonymity notice that matches the instrument's actual
   setting.
7. **The anonymity transaction**: on final submit, write responses with segment attributes, set
   `completed_at`, and null `respondent_id` on those rows when the instrument is `anonymous`.
8. Completion tracking and a nudge action that emails only non-responders.
9. Close an instrument; rotate its token secret to revoke outstanding links. Phase 03 left
   `token_secret` off `instrument`, which every engagement member can read: store it where only the
   service-role route handler can (`DATA-MODEL.md` §2).

## Acceptance criteria

- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean
- [ ] A respondent opens their link with no account, answers, leaves mid-way, returns and resumes
- [ ] A tampered, expired or wrong-instrument token is rejected with a plain message, not a stack trace
- [ ] Rotating the token secret invalidates every previously sent link
- [ ] **On an anonymous instrument, no row in `response` has a non-null `respondent_id` after submit**,
      verified by a direct database query in a test
- [ ] On an anonymous instrument, `respondent.completed_at` is still set and nudges still work
- [ ] On an identified instrument, `respondent_id` is retained
- [ ] The survey page is usable one-handed at 375px wide
- [ ] The public route writes nothing outside the token's own respondent — proven by a test that
      forges a body targeting another respondent
- [ ] The service role appears only in this route handler
- [ ] RLS tests pass for `respondent` and `response`

## Out of scope

Any scoring or reporting. Reminders on a schedule — the nudge is a button a consultant presses.

## Build notes

1. **No service role.** The public route runs as a new Postgres role, `trestle_survey`, not with
   Supabase's service-role key. After verifying the link's signature it sets the link's respondent
   and instrument as transaction-local settings and switches role; that role's policies read those
   settings, so "read only this instrument, write only this respondent" is enforced by Postgres as
   well as by the route. Column grants keep scoring out of its reach (no dimensions, weights,
   reverse flags, item sources, option scores, emails). The boundary test proves only the route
   enters the role and nothing else touches the owner connection. CLAUDE.md security rule 4,
   `ARCHITECTURE.md` and `DATA-MODEL.md` §12 are updated.
2. **Link signing key in the environment, link version on the instrument.** Tokens are HMAC-SHA256
   with `SURVEY_TOKEN_SECRET` (optional; derived from `DATABASE_URL` when unset, so nothing breaks
   on an existing deploy). "Revoke links" bumps `instrument.token_epoch`; correcting a respondent's
   email bumps their `token_version` (trigger) and clears `invited_at`, so the next invitation round
   sends them a fresh link. Links expire at the close date, or 90 days out when there is none.
3. **Drafts are a separate table**, `response_draft`, unreadable to signed-in users. `response`
   holds only submitted answers, so consultants never see partial answers.
4. **The anonymity transaction is one SQL function**, `private.submit_survey()`. On an anonymous
   instrument it never writes `respondent_id` (rather than writing then clearing it) and also leaves
   `answered_at` null, because a per-answer timestamp could be matched to `completed_at`. A
   `submission_id` groups one person's answers without naming them; phase 05 needs it for
   reliability and straight-lining checks.
5. **Choice answers are one row per selected option** (`option_id`, `value_numeric` = the option's
   score). Answers are validated twice: by the route against the instrument's questions (anything
   foreign rejects the whole save), and by the submit function, where an invalid answer counts as
   unanswered.
6. **Opening sends the invitations** to everyone not yet invited; adding people later and pressing
   Send invitations reaches only them. Reminders go to people invited and not completed. Each round
   is logged in the instrument's chatter. Emails are sent one by one inside the transaction, so a
   delivery failure marks nobody as sent; fine for mid-market headcounts, batch it if lists grow
   into the thousands.
7. **Respondents can be added while draft or open**, not once closed; someone who has submitted
   cannot be removed. Imports are all-or-nothing: an invalid line or a duplicate email (within the
   list or already on the survey) rejects the list with line numbers.
8. **The survey page** saves each section as the respondent moves on, and once more when the page is
   hidden (closing the tab, switching apps); a returning respondent resumes at the first section
   with an unanswered required question. Middleware skips `/survey/` and `/api/public/`, so a
   respondent's visit never calls Supabase. The page sends no referrer and is not indexed.
9. **Email is required** for every respondent. Frontline staff without company email (common in
   warehouses and on shop floors) would need another way to get a link; that is an open product
   question, not built.

## Acceptance status

| Criterion | Status |
|---|---|
| `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean | Verified |
| A respondent opens their link with no account, answers, leaves mid-way, returns and resumes | Verified: e2e (fresh browser at 375px; resumes on section 2 with section 1's answer kept) |
| A tampered, expired or wrong-instrument token is rejected with a plain message | Verified: e2e (all three) and unit tests (tampering, expiry, wrong instrument, stale versions) |
| Rotating the token secret invalidates every previously sent link | Verified: e2e ("Revoke links": the old link is refused, a new one works) |
| On an anonymous instrument, no row in `response` has a non-null `respondent_id` after submit | Verified: RLS suite and e2e, both by direct query (and mutation-checked) |
| On an anonymous instrument, `completed_at` is still set and nudges still work | Verified: RLS suite and e2e (reminder reaches only the non-responder) |
| On an identified instrument, `respondent_id` is retained | Verified: RLS suite and e2e |
| The survey page is usable one-handed at 375px wide | Verified: e2e (44px targets, full-width buttons, no sideways scroll) |
| The public route writes nothing outside the token's own respondent | Verified: e2e with forged bodies, and the RLS suite against the role directly |
| The service role appears only in this route handler | Exceeded: it appears nowhere. The survey role is entered only by this route (boundary test) |
| RLS tests pass for `respondent` and `response` | Verified, plus `response_draft` and the survey role |
| Seed covers the new tables | Done: eight respondents on the Odoo rollout's draft assessment |
