# Phase 16 — Communications and events

## Scope

The communications plan and the messages themselves, a channel library, a message-template library
with merge fields, and the events (briefings, roadshows, town halls, drop-in support) that carry the
change to people (`OCM-MODULE.md` §5.8–5.9). Messages are composed and exported, not sent.

## Tables

`channel`, `communication_template`, `communication`, `communication_org_unit`, `event`,
`event_org_unit`, `event_attendee` — `DATA-MODEL.md` §15.3.

## Work

1. Schema and RLS.
2. Seed system channels and system message templates, one per purpose and direction, written for
   Trestle. Merge-field renderer in `lib/ocm/merge.ts` with a fixed field list and a unit test per
   field; unknown fields render visibly as `[unknown: …]`, never silently empty.
3. **Communications** app: list grouped by purpose, kanban and statusbar Draft → In review →
   Approved → Scheduled → Sent (Cancelled off the bar), **calendar view** (first use), form with
   *Message*, *Audiences* and *Reach* tabs. "New from template" merges at creation.
4. Export a message as .docx and .eml, and copy-to-clipboard. "Mark sent" records `sent_at`.
5. Comms plan export: the list grouped by purpose, with audiences, channel, owner and dates.
6. **Events** app: list, calendar, form with audiences, presenter, attendee inline list or typed
   counts, status. Attendance rate metric.
7. Suggestions (`lib/ocm/suggest.ts`): uncovered `needs_communication` impacts → draft *impacts*
   communication; go-live in 21/14/7 days → the three countdown drafts.
8. Settings: firm channels and firm templates (copy a system template to edit).
9. Instrument template: communication feedback survey.

## Acceptance criteria

- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean
- [ ] A communication created from a template has the client name, system and go-live date merged,
      and later edits to the engagement do not rewrite the stored body
- [ ] Nothing in this phase sends email to anyone outside the firm (test asserts no Resend call)
- [ ] An impact flagged `needs_communication` with no sent communication to its org unit shows as a
      gap, and disappears once one is marked sent
- [ ] Attendance counts come from attendees when attendee rows exist, otherwise from the typed counts
- [ ] The calendar view shows communications and events by date and degrades to a list at 375px
- [ ] RLS tests pass for all seven tables; system templates are readable by every org and writable
      by none

## Out of scope

Sending, open and click tracking, newsletters and hosted change portals. Sponsor activity as a
separate model (it is an event kind).
