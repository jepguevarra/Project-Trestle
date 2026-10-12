# Phase 15 — Resistance

## Scope

A register of observed and expected resistance, the fixed lists of signs, causes and strategies, and
hotspot suggestions computed from impacts, readiness and stakeholders (`OCM-MODULE.md` §5.7, §5.18).

## Tables

`resistance` — `DATA-MODEL.md` §15.2.

## Work

1. Schema and RLS, with the org-unit-or-stakeholder check constraint.
2. `lib/ocm/resistance.ts`: the three closed key lists with Trestle's own labels; Zod enums.
3. **Resistance** app: list grouped by level, kanban by status (Identified → Mitigating → Resolved;
   Escalated), form with multi-select signs/causes/strategies, action plan, owner, due date, source.
4. Hotspot rule in `lib/ocm/suggest.ts` (unit-tested): org units with a `high` impact, readiness
   under 50 at n ≥ 5, or a high-influence stakeholder with Low receptiveness, and no open resistance.
   Shown as *Suggestions (n)*; accept creates a draft record, dismiss logs who and why in chatter.
5. Metrics: open by level, resolution rate, departments with open resistance.
6. Smart buttons: Resistance on the org unit and stakeholder forms.

## Acceptance criteria

- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean
- [ ] A record with neither org unit nor stakeholder is rejected by the database, not just the form
- [ ] An unknown sign key is rejected by Zod
- [ ] The hotspot rule has a unit test per trigger and does not fire where an open record exists
- [ ] A readiness-based hotspot never fires from a segment under five respondents
- [ ] Dismissing a suggestion records the reason and it does not reappear until the data changes
- [ ] RLS tests pass

## Out of scope

Resistance surveys as a separate instrument (use pulse). Automatic escalation emails.
