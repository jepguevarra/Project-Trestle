# Phase 18 — Go-live and adoption

## Scope

The go/no-go: a milestone with computed gates over people-side and scope-side evidence, a recorded
human decision with its conditions, and the adoption instruments before and after go-live
(`OCM-MODULE.md` §5.12).

## Tables

`go_live_decision` — `DATA-MODEL.md` §15.5. Uses `milestone` (kind `go_no_go`) from phase 13.

## Work

1. Schema and RLS.
2. Seed the go/no-go gate set: readiness index ≥ 65 on the latest wave, training completion ≥ 90%,
   no open `high` resistance, champion coverage met, no communication coverage gaps, and UAT pass
   ratio ≥ 95% when phase 20 is present. Editable per firm.
3. **Go-Live** app: the go/no-go milestone with live gate status and blocking records; the decision
   form (Go / No-go / Conditional statusbar, conditions, decided by, date); "Announce" creates a
   draft communication from the GO or NO-GO template.
4. Instrument templates: go-live adoption (pre) and post-go-live adoption, written for Trestle.
5. Adoption score overall and per audience; average adoption score on Overview.
6. Normalize-phase support: drop-in support events and support communications are suggested once
   the engagement reaches Normalize.

## Acceptance criteria

- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean
- [ ] Gate status is computed on read; changing training completion changes the gate without any
      write to the milestone
- [ ] A `go` decision with failing gates requires conditions to be entered (validation and the
      quality check in `DATA-MODEL.md` §9)
- [ ] Adoption per audience respects n ≥ 5
- [ ] RLS tests pass

## Out of scope

Usage analytics from the new system (that is a digital adoption platform's job). Hypercare ticketing.
