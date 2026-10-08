# Phase 11 — Data readiness

## Scope

Map the old system's data onto the new one, score how ready it is, and produce the cleansing backlog.

## Tables

`data_entity`, `field_mapping` — `DATA-MODEL.md` §10.

## Work

1. Schema and RLS.
2. Data entity inventory: name, source system, record count, owner, criticality.
3. Field mapping grid — a dense, keyboard-navigable table, because this is data entry at volume:
   legacy field and type, sample values, target field and type, transformation rule, default,
   mandatory-in-target, quality issue, cleansing owner, status.
4. CSV import of legacy field lists.
5. **Data readiness scorecard** per entity: fields mapped, fields unmapped, open quality issues, and
   mandatory target fields with no source.
6. Cleansing backlog with owners and dates, feeding the engagement's open actions.
7. Link a mapping to the processes that use the data, and to its elicitation source.
8. Export the mapping workbook to XLSX — this replaces a spreadsheet, so it has to leave as one.

## Acceptance criteria

- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean
- [ ] 200 field mappings can be entered and edited without the grid becoming unusable
- [ ] A mandatory target field with no source appears on the scorecard as a blocking issue
- [ ] The scorecard recomputes as mappings change
- [ ] CSV import reports bad rows rather than silently dropping them
- [ ] The XLSX export opens in Excel with one sheet per data entity
- [ ] RLS tests pass for both tables

## Out of scope

Connecting to any real system to read its schema. Executing a migration. Data profiling.
