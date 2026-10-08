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
  status, created_by,
  -- phase 02b, Project Essentials (OCM-MODULE.md §5.1):
  start_date (date), end_date (date), ocm_stage, objectives, scope_summary,
  success_criteria, transition_owner
  type:      packaged_software | custom_build | platform_migration | automation | digitalisation
  status:    active | archived
  ocm_stage: assess | develop | deploy | normalize | exit     default assess
  index (org_id, status)

engagement_assignment   consultant/viewer scoping
  id, org_id, engagement_id, user_id, access
  access: edit | read
  unique (engagement_id, user_id)
```

References between tenant tables are composite `(id, org_id)` foreign keys (as built, phase 02):
FK checks ignore RLS, so a single-column FK would let a row in org A point at org B's row.

**`engagement.type` drives four things** and must exist from the first migration that creates
`engagement`: which modules appear, which instrument template is offered, which pattern library is in
scope, and whether fit-gap applies (see `POSITIONING.md` §4). Adding it later means backfilling live
records.

**`engagement.status`** is the pricing meter. `active` counts against the plan's limit; `archived` is
free, unlimited, and permanently readable — see §11 and `BUSINESS-MODEL.md` §5.

**`engagement.ocm_stage`** is the OCM phase, shown as the statusbar (`OCM-MODULE.md` §4.1). It is set
by the consultant, never computed, and is independent of `status`: reaching `exit` does not archive.

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
  wave (smallint, default 1), wave_label,
  anonymity, opens_at, closes_at, status, token_secret, created_by
  kind:      readiness | sponsor | pulse | go_live_adoption | post_go_live_adoption
           | training_feedback | champion | coaching | communication_feedback | custom
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

`wave` numbers repeated runs of the same kind in one engagement (Baseline, Readiness #2,
Pre-go-live) so scores trend across waves. The full `kind` enum ships with the table in phase 03 even
though most kinds get their templates later — see `OCM-MODULE.md` §5.6.

`is_reverse_scored` matters more than it looks — a reverse-worded item that is not flagged silently
inverts a dimension score, and reverse-worded items are how straight-lining is detected (§4).

---

## 3. Respondents and responses

```
respondent
  id, org_id, instrument_id, name, email, department, role_title, seniority,
  person_id (nullable), org_unit_id (nullable),            -- phase 07
  invited_at, reminded_at, completed_at, token_version
  seniority: frontline | supervisor | manager | executive
  unique (instrument_id, email)

response
  id, org_id, instrument_id, question_id,
  respondent_id (nullable — see below),
  department, role_title, seniority, org_unit_id,          -- denormalised at submit time
  value_numeric, value_text, answered_at
  index (instrument_id, question_id)
  index (org_id)
```

### Why segment attributes are copied onto `response`

Breakdowns by department, role and seniority must work **without joining back to `respondent`**,
because on an anonymous instrument that join is exactly what must be impossible. Copying the three
attributes at submit time makes the anonymous case structurally safe rather than safe-by-convention.

`org_unit_id` (phase 07) is copied the same way, for readiness per audience. `person_id` lives only
on `respondent`, exactly like `email`: it is identity, and an anonymous instrument severs it from the
answers on submit. Readiness per org unit is a segment like any other, so n ≥ 5 applies.

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

### 4.1 OCM metrics, also derived

Same rules: pure functions in `lib/scoring/`, unit-tested, nothing stored. Definitions are in
`OCM-MODULE.md`; this is the index.

| Output | Rule | Spec |
|---|---|---|
| Change risk score and band | Mean of six 1–3 factors, two reversed; Low < 1.67 ≤ Mid < 2.34 ≤ High | §5.2 |
| Receptiveness | From `current_stance`: opposed Low, neutral Mid, supportive/champion High | §5.4 |
| Stakeholder priority A–D | Influence ≥ 4 × org unit at impact level `high` | §5.4 |
| Stakeholder and sponsor risk | Banded rules, averaged for the Overview tile | §5.4 |
| Impacted individuals | Leaf-level headcount; never parent plus children | §5.3 |
| Change saturation | Confirmed changes per org unit at level `low` or above | §5.5 |
| Readiness per audience | Segment breakdown on `response.org_unit_id`, n ≥ 5 | §5.6 |
| Champion coverage | ⌈impacted individuals ÷ org ratio⌉ per org unit vs active champions | §5.10 |
| Training completion | Completed ÷ required enrollments | §5.11 |
| Adoption score | Index of the latest `go_live_adoption` / `post_go_live_adoption` instrument | §5.12 |
| Phase progress | Done ÷ (tasks − cancelled) per `ocm_stage` | §4.2 |

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

## 6. Audiences and stakeholders

Revised for the OCM module (`OCM-MODULE.md` §5.3–5.4): `org_unit` arrives here in phase 07 rather
than with impacts, and a stakeholder is an assessment **of a person** rather than a free-standing
name. Phase 07 is not built, so this costs nothing yet.

```
org_unit                the impacted-group tree (OCMS "audiences", levels L1/L2/L3…)
  id, org_id, engagement_id, name, parent_id (self-ref), headcount,
  is_external, location

person                  an individual in the client's organisation (Trestle's res.partner)
  id, org_id, engagement_id, name, email, job_title, org_unit_id (nullable),
  manager_id (self-ref, nullable), location, category, is_direct, notes
  category: internal | external
  unique (engagement_id, lower(email)) where email is not null

stakeholder             an assessment of one person
  id, org_id, engagement_id, person_id, is_sponsor,
  influence (1-5), interest (1-5), current_stance, target_stance, adkar_state,
  availability, sponsor_commitment, sponsor_visibility, notes
  stance:       opposed | neutral | supportive | champion
  adkar_state:  awareness | desire | knowledge | ability | reinforcement | null
  availability, sponsor_commitment, sponsor_visibility: low | mid | high | null
  unique (engagement_id, person_id)

stakeholder_interaction
  id, org_id, stakeholder_id, occurred_at, channel, notes,
  next_action, owner_user_id, due_date, status
  channel: meeting | call | email | workshop | coaching | other
  status:  open | done | cancelled

org_unit_readiness_profile    consultant-rated, never blended into the readiness index
  id, org_id, engagement_id, org_unit_id, wave,
  awareness, buy_in, knowledge, proficiency, capacity,          -- low | mid | high
  past_change_experience,     -- negative | none | positive
  manager_style,              -- consensus | bureaucratic | concentrated
  culture,                    -- community | competitive | entrepreneurial
  documentation_updates,      -- low | mid | high
  notes
  unique (org_unit_id, wave)
```

The influence/interest grid, the stance heat strip, the engagement backlog (where
`current_stance <> target_stance`), receptiveness, priority A–D and stakeholder risk are all derived
(§4.1). No stored quadrant, no stored risk.

---

## 7. Processes, steps

```
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

## 8. Changes, impacts, mitigations, change risk

Revised for the OCM module (`OCM-MODULE.md` §5.2, §5.5): *what is changing* is split from *which
groups it hits*, and severity moves from 1–5 to the four-level scale the OCM practice uses.

```
change                  one thing that is changing
  id, org_id, engagement_id, ref (unique per engagement), title,
  as_is, to_be, category, process_id (nullable), status
  category: process | people | technology | policy | data
  status:   draft | confirmed

impact                  one change × one org unit
  id, org_id, engagement_id, change_id, org_unit_id,
  level, affected_headcount, description, needs_training, needs_communication
  level: none | low | mid | high
  unique (change_id, org_unit_id)

mitigation
  id, org_id, impact_id, action, owner_user_id, owner_name, due_date, status
  status: not_started | in_progress | done | blocked

change_risk_assessment  one current row per engagement; history in chatter
  id, org_id, engagement_id,
  impact_breadth, impact_depth, visibility, strategic_risk,      -- 1-3
  pm_ocm_experience, pm_ocm_bandwidth,                            -- 1-3, reverse-scored
  notes, assessed_at, assessed_by
  unique (engagement_id)
```

Heatmap cell = **max** level in the cell, with the count carried alongside. A mean would hide the one
`high` impact behind four `low`s. A `none` row is a finding (assessed, unaffected), not a gap.
Ranking weight is `low` 1, `mid` 2, `high` 3.

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

The OCM module adds three more of the same kind (`OCM-MODULE.md` §6): **a `high` impact with no
communication and no training covering its org unit** · **a must-have requirement on a process whose
org unit has open `high` resistance** · **a `go` decision with failing gates and no recorded
conditions**. Plus one local check: a RACI deliverable without exactly one `A`.

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

**As built (phase 01).** Written literally, this policy fails on `membership` itself: a policy that
selects from the table it protects recurses ("infinite recursion detected in policy"). The
membership lookup therefore lives in a `SECURITY DEFINER` helper, and policies read
`org_id in (select private.user_org_ids())`, which is the same predicate. And because Supabase
exposes `public` through its Data API, the tenancy tables also check role on writes:

| Table | Read | Write |
|---|---|---|
| `organization` | members | update: admin+; delete: owner; insert: none (created by `create_org_with_owner`) |
| `membership` | members | admin+, and only owners may grant, change or remove an owner |
| `invitation` | admin+ | admin+, and only owners may invite an owner |

A trigger keeps at least one owner per org. Sign-up creates the org and owner membership in a
trigger on `auth.users`; invitations are accepted through `public.accept_invitation(token)`. See
`drizzle/0000_foundations.sql` and the build notes in `plan/phase-01-foundations.md`.

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

**As built (phase 02).** The sketch above, added as a second permissive policy next to
`tenant_isolation`, would *widen* access: Postgres ORs permissive policies. Engagement-scoped tables
instead carry one policy per verb that includes both predicates, using helpers from
`drizzle/0001_clients_engagements.sql`:

| Helper | Returns |
|---|---|
| `private.assigned_engagement_ids()` | Engagements the user is assigned to |
| `private.editable_engagement_ids()` | Engagements a consultant is assigned to with `edit` |
| `private.engagement_access(id)` | `'edit'`, `'read'` or null; admins always `'edit'`, viewers never |

`viewer` is denied writes in RLS as well as by the server action wrapper, because the Data API
reaches the tables directly. RLS protects rows; the wrapper also protects verbs. Archived
engagements are read-only to non-admins in RLS too.

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
- `change(engagement_id, ref)` unique; `impact(change_id, org_unit_id)` unique
- `task(engagement_id, phase, status)` — the checklist and phase progress read this
- `record_message(res_type, res_id, created_at)` — every chatter read
- Both columns of every OCM link table in §15 (`*_org_unit`, `event_attendee`)

---

## 14. Build order

The schema arrives in phases — see `plan/README.md`. Two ordering constraints that are expensive to
get wrong:

1. **`engagement.type` ships with `engagement`** (phase 02). It changes which fields are required on
   records that already exist.
2. **`elicitation_source` ships before `process` carries real data** (phase 06, ahead of phase 09). It
   is a foreign key on half the model, and retrofitting it leaves records whose provenance is
   permanently unknown.

Two more from the OCM module:

3. **`instrument.kind` ships with its full enum and `wave` in phase 03.** Cheap now; adding them
   after instruments carry responses means backfilling waves on live data.
4. **`org_unit` and `person` ship in phase 07, before impacts (08) and every OCM plan table (15–17).**
   Impacts, communications, events, champions and training all target org units or people.

---

## 15. The OCM lifecycle tables

Phases 14–20. Fields and behaviour are specified in `OCM-MODULE.md`; this is the schema. Every table
carries `org_id` and `engagement_id` (except org-level libraries), gets the engagement-scoped policies
in §12, and gets the cross-org RLS test.

### 15.1 Checklist and RACI (phase 14)

```
task_template           a reusable checklist; org_id null = shipped with Trestle
  id, org_id (nullable), name, is_system

task_template_line
  id, org_id (nullable), task_template_id, phase, sort_order, name, description, tool_key

task
  id, org_id, engagement_id, task_template_line_id (nullable), phase, sort_order,
  name, description, tool_key, assignee_user_id (nullable), assignee_name,
  start_date, due_date, status, completed_at,
  res_type (nullable), res_id (nullable)          -- the record this task is about; see §16
  phase:  assess | develop | deploy | normalize | exit
  status: todo | in_progress | done | blocked | cancelled

raci_role
  id, org_id, engagement_id, name, person_id (nullable), sort_order

raci_entry
  id, org_id, engagement_id, deliverable, task_id (nullable), raci_role_id, letter
  letter: R | A | C | I
  unique (raci_role_id, coalesce(task_id::text, deliverable))
```

### 15.2 Resistance (phase 15)

```
resistance
  id, org_id, engagement_id, org_unit_id (nullable), stakeholder_id (nullable),
  level, signs (text[]), causes (text[]), strategies (text[]),
  description, action_plan, owner_user_id, due_date, status, source, source_id (nullable)
  level:  low | mid | high
  status: identified | mitigating | resolved | escalated
  source: observed | survey | interview | champion_report
  check (org_unit_id is not null or stakeholder_id is not null)
```

`signs`, `causes` and `strategies` hold keys from fixed lists in `lib/ocm/resistance.ts`, validated
by Zod. Arrays rather than link tables because the lists are closed and never joined.

### 15.3 Communications and events (phase 16)

```
channel                 org-level library; org_id null = shipped
  id, org_id (nullable), kind, name, description, default_frequency, delivered_by
  kind: communication | engagement

communication_template  org-level message library; org_id null = shipped
  id, org_id (nullable), purpose, direction, name, subject, body
  direction: internal | external

communication
  id, org_id, engagement_id, ref, purpose, direction, objective, channel_id (nullable),
  message_theme, sender_person_id (nullable), owner_user_id, planned_date, sent_at,
  status, template_id (nullable), subject, body, recipients_count,
  opened_count, clicked_count                     -- manual, optional
  purpose: awareness | impacts | progress_update | timeline_change | faq | countdown
         | go_decision | no_go_decision | go_live | post_go_live | support | training
         | champions | uat | closure | other
  status:  draft | in_review | approved | scheduled | sent | cancelled

communication_org_unit  org_id, communication_id, org_unit_id

event
  id, org_id, engagement_id, kind, title, starts_at, ends_at, location,
  presenter_person_id (nullable), invited_count, attended_count, status, notes
  kind:   kickoff | roadshow | town_hall | briefing | workshop | feedback_session
        | drop_in_support | qa_session | champion_meeting | stakeholder_roundtable
        | sponsor_activity
  status: planned | done | cancelled

event_org_unit          org_id, event_id, org_unit_id
event_attendee          org_id, event_id, person_id, invited, attended
```

When `event_attendee` rows exist they are the source of the counts; otherwise the typed counts are.

### 15.4 Champions and training (phase 17)

```
champion
  id, org_id, engagement_id, person_id, org_unit_id, nominated_by_person_id (nullable),
  status, hours_per_week, kickoff_attended, recognised_on, notes
  status: identified | nominated | committed | onboarded | active | inactive | exited
  unique (engagement_id, person_id)

training_course
  id, org_id, engagement_id, name, level, method, target_role, duration_minutes,
  owner_user_id, materials_status, status
  level:            basic | intermediate | advanced
  method:           classroom | workshop | elearning | on_the_job | webinar | briefing
  materials_status: not_started | drafting | ready
  status:           planned | active | completed | cancelled

training_course_org_unit  org_id, training_course_id, org_unit_id

training_session
  id, org_id, engagement_id, training_course_id, starts_at, ends_at, trainer,
  location, capacity, status
  status: planned | done | cancelled

training_enrollment
  id, org_id, engagement_id, training_course_id, training_session_id (nullable),
  person_id, status, completed_at, feedback_score
  status: invited | registered | attended | completed | no_show
  unique (training_course_id, person_id)
```

```
organization_setting    small per-firm settings; admin+ writes
  id, org_id, key, value (jsonb)
  key: champion_ratio
  unique (org_id, key)
```

The champion ratio for coverage is `champion_ratio`, default 25 when no row exists.

### 15.5 Milestones, go-live and adoption (phases 13 and 18)

```
milestone               DASHBOARD.md §1, plus kind go_no_go
  id, org_id, engagement_id, name, kind, target_date, sort_order
  kind: discovery_complete | scope_baseline | readiness_gate | data_ready
      | go_no_go | handover | go_live | custom

milestone_gate
  id, org_id, milestone_id, metric_key, comparator, threshold, label
  comparator: gte | lte | eq

go_live_decision
  id, org_id, engagement_id, milestone_id, decision, conditions,
  decided_by_person_id, decided_on, communication_id (nullable)
  decision: go | no_go | conditional
```

New `metric_key` values: `training_completion_ratio`, `comms_coverage_gaps`, `open_high_resistance`,
`champion_coverage_gaps`, `adoption_score`, `uat_pass_ratio`, `stage_open_tasks`.

### 15.6 Reporting, playbook, transition, library (phases 13 and 19)

```
saved_view              Favorites in the control panel (OCM-MODULE.md §7.2)
  id, org_id, user_id, model, name, params (jsonb), is_default

status_report
  id, org_id, engagement_id, period_start, period_end,
  accomplishments (text[]), risks (text[]), horizon (text[]),
  status, metrics_snapshot (jsonb, written once on publish), published_at
  status: draft | published

playbook_section
  id, org_id, engagement_id, section_key, body
  unique (engagement_id, section_key)

lesson_learned
  id, org_id, engagement_id, phase, category, description, recommendation, created_by
  category: went_well | improve | risk_realised

library_item            the firm's own resource library, tagged by phase and app
  id, org_id, title, description, phase (nullable), tool_key (nullable),
  storage_path, filename, mime_type, byte_size
```

`status_report.metrics_snapshot` is the one deliberate stored copy of derived numbers: a published
status report is a historical statement and must not change when the registers do.

### 15.7 UAT (phase 20, optional)

```
uat_case
  id, org_id, engagement_id, ref, title, steps, expected_result,
  requirement_id (nullable), assignee_person_id (nullable), status,
  tester_notes, defect_link, target_date
  status: not_run | passed | failed | blocked
```

---

## 16. Chatter: the one polymorphic table

§9 rejects a generic `(from_type, from_id, to_type, to_id)` edge table for traceability, and that
stands. The Odoo-style chatter (`OCM-MODULE.md` §7.6) needs a message log on every model, and a
narrow table per model would be thirty identical tables. The reasons against polymorphism in §9 do
not apply here:

- **RLS** reads as "a message is visible exactly when its record is": the org predicate plus an
  `EXISTS` on the parent table (chosen by `res_type`), which runs under the parent's own RLS. *As
  built (phase 02b):* the first sketch here checked only `org_id`/`engagement_id`, which let a viewer
  read notes on every client in the org. Writes need `private.can_write_record_message`: whoever may
  edit the record, with `org_id`/`engagement_id` matching it and the caller as author. Messages are
  append-only, and `system` messages cannot be inserted through the API.
- **Integrity** matters less: a message is a display log, not evidence. Nothing is computed from it
  and no report traces through it.
- **Orphans** are prevented by one generic `after delete` trigger, `private.delete_record_messages()`,
  attached to every model that has chatter.

```
record_message
  id, org_id, engagement_id (nullable for org-level records), res_type, res_id,
  kind, body, tracking (jsonb), author_user_id, created_at
  kind: note | tracking | system
  tracking: [{ field, label, old, new }]
  index (res_type, res_id, created_at)
```

Tracking rows are written by `engagementAction`, which diffs each model's declared tracked fields in
the same transaction as the write. `task.res_type/res_id` (§15.1) follows the same reasoning and the
same trigger: it is how "Schedule task" in chatter links a task to its record.

Allowed `res_type` values are a closed list in `lib/views/registry.ts`, validated by Zod on every
write and mirrored by a `CHECK` constraint. A polymorphic column that accepts any string is how this
pattern goes wrong. Adding a model with chatter means: the registry, the `CHECK`, the `CASE` in the
read policy and in `can_write_record_message`, and the delete trigger on the model's table.
