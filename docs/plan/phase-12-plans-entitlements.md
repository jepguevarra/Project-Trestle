# Phase 12 — Plans and entitlements

## Scope

The plan field, the entitlement table and one gate helper. **Not billing.** This phase makes tiering
enforceable and makes adding a payment provider later a self-contained job instead of a retrofit
across forty call sites.

Small enough to slot in any time after phase 02.

## Tables

`organization.plan` (column), `entitlement` — `DATA-MODEL.md` §11.

## Work

1. Add `organization.plan`; add the `entitlement` table with RLS.
2. Seed default entitlement rows per plan, from the tiers in `BUSINESS-MODEL.md` §3.
3. `assertEntitlement(orgId, key, currentCount)` in `lib/auth/`, called inside the **same** server
   action wrapper that already resolves org membership.
4. Enforce three limits: active engagements, consultant seats, respondents per instrument.
5. Gate branded exports on `branded_exports`.
6. A plain upgrade prompt when a limit is hit: what the limit is, what the plan allows, who to
   contact. No pricing page, no checkout.
7. An org settings page showing the current plan and usage against each limit.

## Acceptance criteria

- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean
- [ ] Creating an engagement past the limit fails with a clear message, server-side
- [ ] **Archiving an engagement frees a slot; the archived engagement stays fully readable**
- [ ] Inviting a member past the seat limit fails server-side
- [ ] Adding respondents past the per-instrument cap fails server-side
- [ ] Every limit is enforced in a server action — a crafted request cannot bypass any of them
- [ ] `instrument.anonymity` and the n=5 suppression rule are reachable on **every** plan, including
      the lowest, verified by a test
- [ ] An engagement's own data can be exported on every plan
- [ ] RLS tests pass for `entitlement`

## Out of scope

Stripe, checkout, dunning, proration, invoices, tax, self-serve upgrade. Manual invoicing is correct
for the first twenty customers — `BUSINESS-MODEL.md` §8.
