# Trestle — Data Model

Every table, every RLS policy, and the two mechanisms that need care: the shared instrument engine
and the anonymous respondent path.

Rules from `CLAUDE.md` that this document obeys throughout, restated because they are easy to break:

1. **Every tenant-scoped table carries `org_id`**, even when it could be derived by joining.
2. **RLS is enabled on every table in `public`.** No policy is a bug, not a default.
3. Table and column names are `snake_case`. Dates are `timestamptz`. No nullable booleans.
4. Every `org_id` and every foreign key is indexed.

Conventions: `id uuid primary key default gen_random_uuid()`, `created_at timestamptz not null
default now()`, `updated_at timestamptz not null default now()`. `created_by uuid references
auth.users` on anything a consultant authors. Soft delete is **not** used — deletes cascade, and
archival is an explicit status where it matters.

---

## 1. Tenancy

```
organization            the consulting firm — the tenant boundary
  id, name, slug (unique), plan, created_at

membership              user ↔ org
  id, org_id, user_id, role, created_at
  role: owner | admin | consultant | viewer
  unique (org_id, user_id)

invitation
  id, org_id, email, role, token_hash, expires_at, accepted_at, invited_by

client                  the company being implemented at
  id, org_id, name, industry, size_band, notes
  size_band: micro | small | medium | large

engagement              one change programme — everything hangs off this
  id, org_id, client_id, name, type, target_system, target_go_live (date),
  status, created_by
  type:   packaged_software | custom_build | platform_migration | automation | digitalisation
  status: active | archived
  index (org_id, status)

engagement_assignment   consultant/viewer scoping
  id, org_id, engagement_id, user_id, access
  access: edit | read
  unique (engagement_id, user_id)
```

**`engagement.type` drives four things** and must exist from the first migration that creates
`engagement`: which modules appear, which instrument template is offered, which pattern library is in
scope, and whether fit-gap applies (see `POSITIONING.md` §4). Adding it later means backfilling live
records.

**`engagement.status`** is the pricing meter. `active` counts against the plan's limit; `archived` is
free, unlimited, and permanently readable — see §11 and `BUSINESS-MODEL.md` §5.

---

## 2. The instrument engine

One engine serves the readiness assessment and any later instrument (sponsor scorecard, pulse
re-assessment). Do not build a second one.

```
instrument_template     reusable definition, not tied to an engagement
  id, org_id (null = shipped with Trestle), name, engagement_type, version,
  is_system, definition (jsonb)

instrument              a live run inside one engagement
  id, org_id, engagement_id, template_id (nullable), name, kind,
  anonymity, opens_at, closes_at, status, token_secret, created_by
  kind:      readiness | sponsor | pulse | custom
  anonymity: identified | anonymous
  status:    draft | open | closed
  token_secret: random bytes — rotating it revokes every outstanding link

dimension               what a question scores into
  id, org_id, instrument_id, name, weight (numeric), sort_order
  unique (instrument_id, name)

section
  id, org_id, instrument_id, title, description, sort_order

question
  id, org_id, instrument_id, section_id, dimension_id (nullable for open text),
  text, help_text, type, weight, is_required, is_reverse_scored, sort_order
  type: likert_5 | likert_7 | single_choice | multi_choice | open_text | numeric

question_option         for choice types
  id, org_id, question_id, label, value (numeric), sort_order
```

`dimension.weight` and `question.weight` are both `numeric` and both default to 1. Scoring normalises;
weights never have to sum to anything.

`is_reverse_scored` matters more than it looks — a reverse-worded item that is not flagged silently
inverts a dimension score, and reverse-worded items are how straight-lining is detected (§4).

---

## 3. Respondents and responses

```
respondent
  id, org_id, instrument_id, name, email, department, role_title, seniority,
  invited_at, reminded_at, completed_at, token_version
  seniority: frontline | supervisor | manager | executive
  unique (instrument_id, email)

response
  id, org_id, instrument_id, question_id,
  respondent_id (nullable — see below),
  department, role_title, seniority,          -- denormalised at submit time
  value_numeric, value_text, answered_at
  index (instrument_id, question_id)
  index (org_id)
```

### Why segment attributes are copied onto `response`

Breakdowns by department, role and seniority must work **without joining back to `respondent`**,
because on an anonymous instrument that join is exactly what must be impossible. Copying the three
attributes at submit time makes the anonymous case structurally safe rather than safe-by-convention.

### The anonymity mechanism

| Instrument | `response.respondent_id` | `respondent.completed_at` |
|---|---|---|
| `identified` | set, kept | set |
| `anonymous` | set during submit, **nulled in the same transaction once all rows are written** | set |

Completion tracking and reminders keep working, because they read `respondent.completed_at`. The link
from an answer to a person is gone from the database — not hidden by a query, not filtered by a
policy, gone. This is the only design that survives someone later writing a careless report query.

Write it as a single transaction in the public route handler: insert all responses, set
`completed_at`, then `update response set respondent_id = null where respondent_id = $1` when the
instrument is anonymous.

### Small-n suppression

Minimum segment size is **5**. Enforced in `lib/scoring/`, not in SQL, and applied to the
**intersection** of every active filter, not to a single attribute — filtering department = Finance
*and* seniority = executive can isolate one person even when each alone has twenty. The scoring
function returns `{ suppressed: true, reason, n }` rather than null, and the UI renders the reason.

---

## 4. Scoring — derived, not stored

Nothing in this section is a table. All of it lives in `lib/scoring/` as pure functions over plain
arrays, per `ARCHITECTURE.md`, so the numbers are unit-testable and auditable.

| Output | Rule |
|---|---|
| Item score | Normalise to 0–100. Reverse-scored items invert before normalising. Unanswered is **excluded, never zeroed** |
| Dimension score | Weighted mean of its items' scores |
| Readiness index | Weighted mean of dimension scores |
| Segment breakdown | Same, filtered; suppressed below n=5 on the filter intersection |
| **Consensus** | Standard deviation per dimension, reported beside every mean |
| **Perception gap** | Mean of `seniority in (manager, executive)` minus mean of `seniority in (frontline, supervisor)`, per dimension |
| **Cronbach's alpha** | Per dimension, over its items, on collected responses. Reported even when below 0.70 |
| Straight-lining flag | Identical value across all items **including reverse-scored ones**, or completion under 90 seconds |

Compute on read for v1. Cache only when a real dashboard feels slow.

---

## 5. The evidence spine

The primitive every other module cites. It must exist before processes, impacts or requirements carry
data, or their provenance is permanently unknown.

```
elicitation_source
  id, org_id, engagement_id, kind, title, conducted_at, channel,
  notes, confidentiality, created_by
  kind:            interview | workshop | document | observation | survey | system_export
  confidentiality: normal | restricted

source_participant
  id, org_id, source_id, stakeholder_id
  unique (source_id, stakeholder_id)

source_attachment       uploaded documents
  id, org_id, source_id, storage_path, filename, mime_type, byte_size

source_extract          a tagged passage or note
  id, org_id, source_id, body, locator, created_by
  locator: free text — "p. 4", "§2.1", timestamp
```

Extracts link outward through explicit link tables (§9). An extract with no link is not an error; it
is a note not yet used.

**The elicitation log** — the deliverable that proves the discovery days a firm billed for — is a view
over `elicitation_source` joined to its participants, with counts of what each source produced.

---

## 6. Stakeholders

```
stakeholder
  id, org_id, engagement_id, name, title, department, email, is_sponsor,
  influence (1-5), interest (1-5), current_stance, target_stance, adkar_state, notes
  stance:      opposed | neutral | supportive | champion
  adkar_state: awareness | desire | knowledge | ability | reinforcement | null

stakeholder_interaction
  id, org_id, stakeholder_id, occurred_at, channel, notes,
  next_action, owner_user_id, due_date, status
  status: open | done | cancelled
```

The influence/interest grid, the stance heat strip and the engagement backlog (where
`current_stance <> target_stance`) are all derived. No stored quadrant.

---

## 7. Org units, processes, steps

```
org_unit
  id, org_id, engagement_id, name, parent_id (self-ref), headcount

process
  id, org_id, engagement_id, name, org_unit_id, owner_stakeholder_id,
  parent_id (self-ref — functional decomposition), frequency, criticality (1-5),
  is_in_scope
  frequency: continuous | daily | weekly | monthly | quarterly | annual | ad_hoc

process_system          interface analysis
  id, org_id, process_id, system_name, direction, notes
  direction: reads | writes | both

process_step
  id, org_id, process_id, sort_order, actor_role, action, system,
  inputs, outputs

pain_point
  id, org_id, process_id, process_step_id (nullable), description,
  severity (1-5), root_cause (text), created_by

business_rule
  id, org_id, process_id, statement, source_extract_id (nullable)
```

`process.parent_id` gives the decomposition tree and the scope in/out marking in one structure — the
functional decomposition tool and scope modelling are the same table viewed two ways.

`pain_point` is the hinge: it is produced during process capture and becomes a candidate impact and a
candidate requirement. Do not let it become a free-text field on `process_step`.

---

## 8. Impacts and mitigations

```
impact
  id, org_id, engagement_id, process_id (nullable), org_unit_id,
  type, as_is, to_be, severity (1-5), affected_headcount
  type: process | people | technology | policy | data

mitigation
  id, org_id, impact_id, action, owner_user_id, owner_name, due_date, status
  status: not_started | in_progress | done | blocked
```

Heatmap cell = **max** severity in the cell, with the count carried alongside. A mean would hide the
one severity-5 impact behind four severity-1s.

---

## 9. Requirements, fit-gap and traceability

```
requirement
  id, org_id, engagement_id, ref (unique per engagement), statement,
  type, format, priority, acceptance_criteria, status,
  verdict, disposition, effort_band, justification, pattern_id (nullable)
  type:        functional | non_functional | business_rule | data | reporting | integration
  format:      user_story | use_case | statement
  priority:    must | should | could | wont
  status:      draft | reviewed | approved | deferred | descoped
  verdict:     fit | gap | partial | null
  disposition: configuration | workaround | extension | customisation
               | third_party | out_of_scope | deferred | null
  effort_band: s | m | l | xl | null

requirement_pattern     the firm's reusable library
  id, org_id, name, target_category, industry_tags (text[]),
  statement_skeleton, typical_verdict, typical_disposition,
  typical_acceptance_criteria, qualifying_questions, common_variations,
  source_engagement_id, times_used, times_a_gap
```

### Traceability: explicit link tables, not a generic edge table

A single `(from_type, from_id, to_type, to_id)` table is elegant and is the wrong choice here. It
cannot carry a foreign key, cannot be type-checked, and forces every RLS policy into a polymorphic
predicate that no index helps. Use one narrow table per pair:

```
requirement_process      org_id, requirement_id, process_id
requirement_pain_point   org_id, requirement_id, pain_point_id
requirement_impact       org_id, requirement_id, impact_id
requirement_stakeholder  org_id, requirement_id, stakeholder_id, relation
requirement_source       org_id, requirement_id, source_id
requirement_dimension    org_id, requirement_id, dimension_id   -- readiness finding
extract_process_step     org_id, source_extract_id, process_step_id
extract_pain_point       org_id, source_extract_id, pain_point_id
extract_requirement      org_id, source_extract_id, requirement_id
extract_field_mapping    org_id, source_extract_id, field_mapping_id
```

Each carries `org_id`, a unique constraint on the pair, and indexes on both sides. Dull, fast, safe.

### Derived views

| View | Definition |
|---|---|
| Traceability matrix | The link tables, pivoted |
| Forward coverage | Processes, pain points and impacts with **no** requirement linked |
| Backward coverage | Requirements with no link to anything |
| Customisation register | `disposition = 'customisation'`, with justification and effort |
| Fit ratio | Count by `verdict`, grouped by process or target module |

### Quality checks (pure functions, `lib/scoring/` or `lib/quality/`)

Requirement with no traced source · gap with no disposition · customisation with no justification ·
**must-have requested by a stakeholder whose `current_stance = 'opposed'`** · **requirement against a
process in an org unit scoring low on readiness** · acceptance criterion with no observable outcome ·
two requirements with conflicting dispositions on one process.

The two bolded checks are only computable because readiness, stakeholders, processes and requirements
share this model. They are the concrete proof the modules are one product.

---

## 10. Data readiness, SOPs, and the supporting registers

```
data_entity
  id, org_id, engagement_id, name, source_system, record_count,
  owner_stakeholder_id, criticality (1-5)

field_mapping
  id, org_id, data_entity_id, legacy_field, legacy_type, sample_values,
  target_field, target_type, transformation_rule, default_value,
  is_mandatory_in_target, quality_issue, cleansing_owner_id, status
  quality_issue: none | nulls | duplicates | format_drift | orphan_refs | unknown
  status:        unmapped | mapped | in_cleansing | verified

sop_document
  id, org_id, engagement_id, process_id, title, purpose, scope,
  roles, exceptions, references, status, current_version
  status: draft | in_review | approved

sop_version
  id, org_id, sop_document_id, version, body (jsonb snapshot),
  approved_by, approved_at

glossary_term
  id, org_id, engagement_id (nullable = org-wide), term, definition
  unique (org_id, coalesce(engagement_id, '...'), lower(term))

role_permission          roles and permissions matrix
  id, org_id, engagement_id, role_name, function_name, permission
  permission: none | read | create | update | approve | admin

technique_application    the technique ledger
  id, org_id, engagement_id, technique, applied_at, applied_by,
  subject_type, subject_id
```

`technique_application` is what generates the methodology page in the final report
(`REQUIREMENTS-MODULE.md` §4.5). It is written by the tools, never by hand.

---

## 11. Plans and entitlements

```
-- organization.plan: solo | practice | firm | enterprise

entitlement
  id, org_id, key, limit_value (integer — -1 = unlimited), bool_value
  key: active_engagements | consultant_seats | respondents_per_engagement
     | branded_exports | pattern_library | benchmarking
  unique (org_id, key)
```

One helper, `assertEntitlement(orgId, key, currentCount)`, called inside the same server-action
wrapper that already resolves org membership. Seed default rows per plan.

**Never gated, on any plan including free:** `instrument.anonymity`, the n=5 suppression rule, and
export of an engagement's own data. See `BUSINESS-MODEL.md` §4.

---

## 12. Row Level Security

RLS is enabled on **every** table above. The canonical policy:

```sql
alter table <table> enable row level security;

create policy tenant_isolation on <table>
  for all
  using      (org_id in (select org_id from membership where user_id = auth.uid()))
  with check (org_id in (select org_id from membership where user_id = auth.uid()));
```

Engagement-level scoping for `consultant` and `viewer` roles layers **on top of**, never instead of,
the org predicate:

```sql
create policy engagement_scope on <engagement_scoped_table>
  for all
  using (
    exists (
      select 1 from membership m
      where m.user_id = auth.uid()
        and m.org_id = <table>.org_id
        and (
          m.role in ('owner','admin')
          or exists (
            select 1 from engagement_assignment ea
            where ea.user_id = auth.uid()
              and ea.engagement_id = <table>.engagement_id
          )
        )
    )
  );
```

`viewer` is additionally denied writes by the server action wrapper, not by RLS alone — RLS protects
rows, the wrapper protects verbs.

### The anonymous respondent path

The only place the service role appears. `app/api/public/survey/[token]/route.ts`:

1. Verify the signed token. Claims: `respondent_id`, `instrument_id`, `token_version`, `exp`.
2. Reject if `instrument.status <> 'open'`, if `now() > closes_at`, or if the token's
   `token_version` does not match the respondent's current one.
3. Read **only** that instrument's questions and that respondent's own draft answers.
4. Write **only** rows whose `respondent_id` matches the token claim.
5. On final submit, in one transaction: write responses with segment attributes denormalised, set
   `respondent.completed_at`, and null `respondent_id` on those responses when the instrument is
   anonymous.

Tokens are single-instrument and expire at the instrument's close date. Rotating
`instrument.token_secret` revokes every outstanding link at once.

### The test that must never be skipped

For **every** tenant-scoped table, an integration test proving a user in org A cannot `select`,
`insert`, `update` or `delete` a row belonging to org B. A new table without this test is not done.

---

## 13. Index checklist

- `org_id` on every table
- Every foreign key
- `engagement(org_id, status)` — the plan meter reads this
- `response(instrument_id, question_id)` — every score reads this
- `respondent(instrument_id, completed_at)` — completion tracking and nudges
- `requirement(engagement_id, ref)` unique
- Both columns of every link table in §9

---

## 14. Build order

The schema arrives in phases — see `plan/README.md`. Two ordering constraints that are expensive to
get wrong:

1. **`engagement.type` ships with `engagement`** (phase 02). It changes which fields are required on
   records that already exist.
2. **`elicitation_source` ships before `process` carries real data** (phase 06, ahead of phase 09). It
   is a foreign key on half the model, and retrofitting it leaves records whose provenance is
   permanently unknown.
