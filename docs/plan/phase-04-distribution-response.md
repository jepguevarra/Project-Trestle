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
9. Close an instrument; rotate `token_secret` to revoke outstanding links.

## Acceptance criteria

- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean
- [ ] A respondent opens their link with no account, answers, leaves mid-way, returns and resumes
- [ ] A tampered, expired or wrong-instrument token is rejected with a plain message, not a stack trace
- [ ] Rotating `token_secret` invalidates every previously sent link
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
