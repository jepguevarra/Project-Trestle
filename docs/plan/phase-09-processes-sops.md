# Phase 09 — Processes and SOPs

## Scope

Capture how the work is done today — processes, steps, pain points, systems touched, business rules —
and turn that into written procedures the client keeps.

## Tables

`process`, `process_system`, `process_step`, `pain_point`, `business_rule`, `sop_document`,
`sop_version` — `DATA-MODEL.md` §7 and §10.

## Work

1. Schema and RLS.
2. Process inventory: name, org unit, owner, frequency, criticality, in-scope flag.
3. `process.parent_id` gives the decomposition tree; the same view marks scope in and out.
4. Step capture: ordered rows with actor role, action, system, inputs, outputs. Keyboard-first — a
   consultant types these during an interview, not after.
5. Pain points against a process or a specific step, with severity and a root-cause field.
6. Systems touched per process; business rules per process.
7. A generated read-only flow or swimlane view from the steps. **Not** an editable diagram.
8. SOP authoring: purpose, scope, roles, procedure generated from the steps, exceptions, references.
9. Draft → in review → approved, with versioning and an approval record.
10. SOP export to PDF and DOCX with the firm's logo and footer.
11. Every process, step and pain point can cite an elicitation source.

## Acceptance criteria

- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck` pass clean
- [ ] A 14-step process is captured without reaching for the mouse
- [ ] Reordering steps renumbers them correctly and persists
- [ ] The generated procedure in an SOP reflects the current steps and updates when they change
- [ ] Approving an SOP creates an immutable version; later edits produce a new version
- [ ] DOCX opens in Word with the logo and footer intact; PDF matches it
- [ ] A pain point captured on a step is visible from the process view and cites its source
- [ ] The decomposition tree renders a three-level hierarchy and marks out-of-scope branches
- [ ] RLS tests pass for all seven tables

## Out of scope

A BPMN editor. Process mining. Real-time collaborative editing.
