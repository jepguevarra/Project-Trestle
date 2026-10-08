# Phase 06 — The evidence spine

## Scope

Record where every finding came from. Elicitation sources — interviews, workshops, documents,
observation — with participants, attachments and tagged extracts, plus the elicitation log export.

**This phase comes before processes and impacts carry real data, deliberately.** It is a foreign key
on half the model. Added later, it leaves records whose provenance is permanently unknown.

## Tables

`elicitation_source`, `source_participant`, `source_attachment`, `source_extract` — `DATA-MODEL.md` §5.
The `extract_*` link tables arrive with their targets in phases 09–11.

## Work

1. Schema and RLS for all four. Supabase Storage bucket for attachments, org-scoped paths.
2. Source list per engagement, filterable by kind and date.
3. Create and edit a source: kind, title, date, channel, participants (from the stakeholder register
   once phase 07 exists; free text until then), notes, confidentiality.
4. Document upload against a `document` source.
5. Extract capture: select or type a passage, add a locator, save against the source.
6. Elicitation log view and export: sources, dates, participants, duration, and a count of what each
   produced.
7. A reusable `<SourcePicker>` component. Every later module that creates a record uses it, so
   citing a source is one control rather than a workflow.

## Acceptance criteria

- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean
- [ ] A consultant creates an interview source, adds participants and captures three extracts
- [ ] An uploaded document is stored, listed and downloadable only by members of the owning org —
      verified by requesting the storage path as a user from another org
- [ ] A `restricted` source is visible only to members assigned to that engagement
- [ ] The elicitation log exports with sources, dates and participants
- [ ] `<SourcePicker>` works standalone and is used by at least one create form
- [ ] RLS tests pass for all four tables

## Out of scope

Interview script running and live capture — that is the session runner, a later addition. Automated
transcription or extraction.
