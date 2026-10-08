# Trestle — The Business Analysis Layer

Scope decision record. Companion to `PRD.md`, which it does not override — where this document
proposes a change to v1 scope, §7 says exactly what would have to change and you make the call.

**The question:** should Trestle add user story monitoring, a requirements traceability matrix,
document analysis, field mapping (with OCR), interviews, process mapping, and broader BABOK
technique coverage?

**The short answer:** five of the seven, but as **one new primitive and one new view** rather than
six new modules — and one of them gets cut outright. The reason the cut matters is in §1.

---

## 1. Two tests, applied before anything else

### Test 1 — the phase test

`RESEARCH.md` §1.1 positions Trestle in Markus & Tanis's **chartering** phase: the work before the
build. That position is the entire defensibility argument. It is what makes the product ERP-neutral,
what keeps it out of Jira's way, and what makes the capstone a contribution rather than a clone.

So: **does this feature produce a deliverable before configuration starts, or after?**

| Proposed feature | Phase | Verdict from this test alone |
|---|---|---|
| Interviews | Chartering — elicitation | Passes |
| Document Analysis | Chartering — elicitation | Passes |
| Process Mapping | Chartering — as-is capture | Passes (already module 4) |
| Field Mapping | Chartering — data readiness | Passes |
| Requirements Traceability Matrix | Chartering *if rooted in business need*; Project if rooted in stories | Passes **conditionally** — see §4.2 |
| **User Story Monitoring** | **Project — backlog and sprint execution** | **Fails** |

### Test 2 — your own rule

`CLAUDE.md`: *"The product is not an ERP, not a project-management tool, and not a generic survey
platform. Every feature must be defensible as 'a consultant would bill for this.'"*

User story monitoring is the definition of a project-management tool. A consultant bills for
*writing* the stories; the client's Jira tracks them afterwards. You wrote the rule that excludes it.

### The honest reason this is hard

You have felt the pain of untracked user stories as a functional consultant, so it feels like the
most obviously useful thing on the list. It is useful — to the *implementation* team, during the
build, which is a different product with different buyers and four well-funded incumbents. Adding it
does not extend Trestle; it relocates it into a fight it loses.

---

## 2. Verdicts

| # | Idea | Verdict | Where it lives |
|---|---|---|---|
| 1 | **Elicitation sources** (interviews, workshops, documents, observation) | **Build — new primitive** | New `elicitation_source` table, cross-cutting |
| 2 | **Requirements register + RTM** | **Build — the spine** | New cross-module view, rooted in business need |
| 3 | **Field / data mapping** | **Build — small module** | New module, ~one register |
| 4 | **Document Analysis** | **Build — as a source type, not a parser** | Folds into #1 |
| 5 | **Process Mapping** | Already scoped | Module 4, unchanged |
| 6 | **OCR / automated extraction** | **Defer** | v2 at the earliest; §4.5 |
| 7 | **User Story Monitoring** | **Cut** | Replaced by story *authoring* + export; §4.1 |

Net effect on scope: **one table, one register, one view, one small module.** Not six modules. That
is a genuinely affordable addition, and it is roughly a third of the work of what you proposed.

---

## 3. The reframe — one primitive, one view

### 3.1 The missing primitive: the elicitation source

Your data model currently has readiness responses, stakeholders, org units, processes, impacts and
SOPs. What it does not have is a record of **where any of it came from**. Every one of your new ideas
needs that record, and BABOK is built on it — Interviews, Workshops, Document Analysis and Observation
are all *elicitation* techniques whose output has to land somewhere citable.

```
elicitation_source
  id, org_id, engagement_id
  kind            interview | workshop | document | observation | survey | system_export
  title
  conducted_at
  participants    (stakeholder refs)
  location/channel
  notes           (the raw capture)
  attachment      (storage ref, for documents)
  confidentiality
```

Then everything else in the system can cite one. A process step, a pain point, an impact, a
requirement, a field mapping — each carries one or more source references.

This is a small table with a polymorphic link table, and it is the highest-leverage thing in this
document. It turns Trestle from a system that holds *findings* into a system that holds **evidence**.
Every consultant has been asked "where did this come from?" in front of a client; right now the
answer is a memory and a notebook.

It also produces a deliverable nobody else has: an **elicitation log** — who was interviewed, when,
for how long, and what came out of each session. Consultants bill for discovery days. This is the
artifact that proves the days happened.

### 3.2 The view: a requirements register rooted in business need

BABOK's Requirements Life Cycle Management knowledge area opens with **Trace Requirements (5.1)** —
maintaining relationships between requirements, designs, solution components and, critically, the
business needs they satisfy. A traceability matrix whose left-hand column is `REQ-001` traces nothing;
it is a list with a border. A real RTM traces *back*.

Trestle can build the version with the good left-hand column, because it already holds what everyone
else's RTM is missing:

```
requirement
  id, org_id, engagement_id
  ref              REQ-001
  statement
  type             functional | non-functional | business rule | data | reporting | integration
  format           user story | use case | plain statement
  priority         MoSCoW
  acceptance_criteria
  status           draft | reviewed | approved | deferred | descoped
  → traces to:  process step(s), pain point(s), impact(s), stakeholder(s),
                readiness finding(s), elicitation source(s), field mapping(s)
```

The RTM view is then a matrix over those links, and the three reports that fall out of it are all
things a consultant is asked for and cannot currently produce without a weekend in Excel:

- **Coverage** — which requirements have no traced source (invented requirements), and which processes
  or impacts have produced no requirement (unaddressed findings). Both directions. Both are findings.
- **Orphans** — requirements traced to nothing, and pain points that nobody turned into a requirement.
- **Provenance** — for any single requirement, the full path back to the interview that produced it.

### 3.3 What this does to the novelty claim

`RESEARCH.md` §4.1 named the evidence chain as the strongest contribution. This extends it by two
nodes and closes it at both ends:

```
elicitation source (interview with the Finance Manager, 14 Mar)
      ↓
readiness finding (Capability dimension, Finance, 2.1/5)
      ↓
stakeholder (Finance Manager, high influence, Opposed)
      ↓
process (Month-end close — 14 steps, 3 pain points)
      ↓
impact (Process + People, severity 4, 12 people affected)
      ↓
requirement (REQ-014, automated accrual schedule, Must)
      ↓
field mapping (legacy GL.ACCRUAL_CD → target account.move.line)
      ↓
handover pack → whatever the build team uses
```

Now the claim is sharper than it was: **every requirement handed to the build team is traceable to a
measured organisational condition and a named source, and every measured condition is traceable
forward to the requirement that addresses it or flagged as unaddressed.**

Nothing in the landscape in `RESEARCH.md` §3.1 does this. Jira starts at the story. Jama starts at the
requirement. Readiness tools stop at the score. Trestle owns the span between them, which is exactly
the span a functional consultant is hired to work in.

---

## 4. The specific ideas

### 4.1 User Story Monitoring — cut, and the version that survives

Split the verb. **Authoring** a user story is discovery work; **monitoring** it is delivery work.

- **In:** writing requirements in user-story format (`As a <role>, I want <capability>, so that
  <outcome>`), with acceptance criteria — BABOK's **User Stories** and **Acceptance and Evaluation
  Criteria** techniques. Priority, status up to `approved`, and traceability.
- **Out:** sprints, story points, burndown, assignment, workflow states past approval, comments,
  boards. All of it.
- **The bridge:** an export — CSV or Jira/Azure DevOps-shaped JSON — carrying the story, its
  acceptance criteria, its priority, and **its trace links as a provenance field**. The build team
  imports into whatever they use, and each story arrives with a line saying which process, impact and
  interview produced it.

That export is feature #17 in `RESEARCH.md` §5, the handover pack, and it is the acceptable version
of integrating with the build. It ends Trestle's responsibility at exactly the right boundary: you
hand over the requirements, you do not manage their delivery.

If a client insists Trestle track delivery too, that is a different product and it is not this one.

### 4.2 The RTM — build it, with one condition

The condition is in §3.2: the matrix must be rooted in business need, not in the requirement list.
Build it the other way and you have written a worse Jama, you have moved into the project phase, and
you have handed the panel an easy question.

Rooted correctly, it is simultaneously your best consultant feature, your BABOK compliance story, and
your academic contribution. It is rare for one feature to be all three. Prioritise it accordingly.

### 4.3 Document Analysis — yes, but it is a human technique

BABOK's **Document Analysis** means the analyst reads existing documentation — org charts, current
SOPs, forms, reports, system documentation, policies — and extracts what is relevant. The technique is
the reading. Software cannot do the technique; it can make the output **structured and traceable**.

So what Trestle builds is:

- Upload a document against an engagement; it becomes an `elicitation_source` of kind `document`.
- The consultant creates **extracts**: a highlighted passage or a typed note, tagged to a process, a
  pain point, a requirement or a field.
- Every extract keeps its document reference and page/section.
- The document inventory itself becomes a deliverable: what existed, what was current, what was
  missing. *"The client had no documented approval matrix"* is a finding, and a billable one.

That is a couple of days of work and it delivers most of the value. What it does **not** need is a
parser.

### 4.4 Field Mapping — the most underrated idea on your list

You mentioned this almost in passing. It is the strongest genuinely-new module you proposed, for four
reasons:

1. **The evidence backs it.** Panorama's 2021 report: data reconciliation was cited by **37.5%** of
   over-budget projects and data integrity by **20%** of late ones (`RESEARCH.md` §1.3.1). Data
   readiness is also a standing item in the ERP CSF literature.
2. **It is unambiguously pre-build.** You map legacy fields before you configure, not after.
3. **It is billable and it is currently done in Excel.** Every ERP implementation produces a mapping
   workbook. Every one of them is a spreadsheet that goes stale.
4. **It is cheap.** One register, no algorithms.

```
data_entity          customer, product, GL account, open AR, BOM, employee…
  source_system, record_count, owner, criticality
field_mapping
  data_entity_id
  legacy_field, legacy_type, sample_values
  target_field, target_type
  transformation_rule     (free text or expression)
  default_value
  mandatory_in_target     bool
  quality_issue           (nulls, duplicates, format drift, orphan references)
  cleansing_owner, status
  → traces to: process(es), elicitation source(s), requirement(s)
```

The derived views are the deliverable: a **data readiness scorecard** per entity (fields mapped,
fields unmapped, open quality issues, mandatory-target fields with no source) and a **cleansing
backlog** with owners and dates. That scorecard is a number a client will pay to see before they
commit to a go-live date, and it is the second quantitative output in the product alongside the
readiness index.

This is also BABOK's **Data Dictionary** technique, which is a free box ticked.

### 4.5 OCR — the honest engineering answer

**Defer it.** Not because it is a bad idea, but because of where the difficulty actually sits.

Character recognition on a clean scan is close to solved. The hard part is **layout and table
structure** — knowing that this number belongs in that column under that header — and business
documents are almost entirely tables and forms. That is where OCR projects go to die, and accuracy on
real client documents (photocopies, stamps, handwriting in the margin, merged cells) is poor enough
that the consultant re-keys everything anyway. You will have built a feature that adds a verification
step rather than removing a typing step.

Three things to weigh:

- **Cost/benefit against the capstone.** OCR is not your contribution. Weeks spent on an extraction
  pipeline are weeks not spent on the traceability spine, which is. A panel will not award marks for
  Tesseract.
- **The 90% version is free.** Upload, store, tag extracts by hand (§4.3). The consultant was going to
  read the document regardless; that is the technique.
- **If you want the automation later, do extraction, not OCR.** Sending a document to a
  vision-capable model and asking for structured fields, with a mandatory human confirm step, is far
  more tractable in 2026 than building an OCR and table-parsing pipeline — and it fails visibly rather
  than silently. Note this is a *different* use of AI from the report narrative your PRD defers: the
  narrative asserts a finding, extraction proposes a value that a human accepts or rejects. The
  second is much easier to defend. Still v2.

### 4.6 Interviews — the capture mode

Idea #11 in `RESEARCH.md` §5, now with a home: an interview is an `elicitation_source` of kind
`interview`, and interview mode is a capture UI over it.

What makes it worth building rather than "just use a notebook":

- A **question script** per engagement, reusable, versioned — so a junior consultant runs the same
  discovery as you do. That is the actual product for a firm with juniors, and you have supervised
  juniors; you know what inconsistent discovery costs.
- Capture that **writes directly into the structures**: a pain point typed during the interview lands
  on the process step, already sourced, rather than in a notes file nobody transcribes.
- Participants linked to the stakeholder register, so the engagement log fills itself.
- An **elicitation log** export — the billable-days artifact from §3.1.

BABOK's **Interviews** and **Workshops** are the same primitive with a different participant count.
Build one, get both.

### 4.7 Process Mapping — already yours

Module 4 covers it. Hold the line from `RESEARCH.md` §5 #14: **do not build a BPMN modeller.**
Lucid and Signavio are better at it and it is not where your value is. Structured step capture with a
generated swimlane or flow *view* is enough, and it has the advantage that steps are queryable data
while a diagram is a picture.

---

## 5. BABOK coverage map

You asked to incorporate the most-used BABOK techniques. BABOK v3 defines **50**. You should support
roughly twenty of them, and you already support more than you think — a technique is "supported" when
the tool holds its output in structured form, not when there is a menu item with its name.

### Tier 1 — already covered by the current scope

| BABOK technique | Where it lives in Trestle |
|---|---|
| Survey or Questionnaire | Readiness Assessment |
| Stakeholder List, Map, or Personas | Stakeholder Mapping (influence/interest grid) |
| Process Modelling | Process Documentation |
| Process Analysis | Process Documentation (pain points) |
| Organizational Modelling | Org units |
| Risk Analysis and Management | Impact register + mitigations |
| Item Tracking | Mitigation and engagement logs |
| Prioritization | Impact severity, stakeholder stance gap |
| Business Rules Analysis | Process steps (capture rules as a step attribute) |

### Tier 2 — unlocked cheaply by this document's additions

| BABOK technique | Unlocked by |
|---|---|
| Interviews | `elicitation_source` |
| Workshops | `elicitation_source` |
| Document Analysis | `elicitation_source` + extracts |
| Observation | `elicitation_source` |
| Data Dictionary | Field mapping |
| User Stories | Requirements register |
| Use Cases and Scenarios | Requirements register (alternate format) |
| Acceptance and Evaluation Criteria | Requirements register |
| Non-Functional Requirements Analysis | Requirement `type` |
| Glossary | One table. Do it — every ERP engagement has a terminology fight |
| Functional Decomposition | Process hierarchy (parent/child) |
| Root Cause Analysis | Pain points, with a `why` chain field |
| Interface Analysis | Systems register (which systems a process touches — you already collect this) |

### Tier 3 — the hidden gem

**Roles and Permissions Matrix.** BABOK lists it; ERP implementations require it; nobody enjoys
building it; it is always late. Role × function × permission, derived partly from your process step
actors. This is a genuinely billable pre-build deliverable that no readiness tool offers and that maps
onto data you are already capturing. If you want one more module after field mapping, this is it —
ahead of anything else on the list.

### Tier 4 — explicitly not, and say so in the paper

Backlog Management, Prototyping, Sequence Diagrams, State Modelling, Concept Modelling, Data Flow
Diagrams, Decision Modelling, Data Mining, Financial Analysis, Balanced Scorecard, Business Model
Canvas, Collaborative Games, Mind Mapping, Estimation, Vendor Assessment, SWOT Analysis, Benchmarking
and Market Analysis, Business Cases, Business Capability Analysis, Lessons Learned, Reviews, Decision
Analysis, Focus Groups, Brainstorming, Metrics and KPIs, Scope Modelling, Concept Modelling.

Two notes. **Vendor Assessment** looks tempting because ERP selection is pre-implementation — but your
buyer is the implementation partner, who has already been selected. It is a different product for a
different buyer. **Metrics and KPIs** is a real gap (benefits baselining) but your PRD already defers
benefits realisation; leave it deferred.

A stated exclusion list is worth marks. "We support 20 of 50 BABOK techniques, selected by phase
relevance, and here is the list we excluded and why" is a scoping argument. "We support BABOK" is a
claim the panel will test and you will fail.

---

## 6. Revised scope, staged

Ordered so that each stage is independently sellable and independently defensible.

| Stage | Contents | Why here |
|---|---|---|
| **v1 — unchanged** | The four PRD modules | Your PRD is right: after readiness runs end to end you have something to sell. Do not disturb this. |
| **v1 + spine** | `elicitation_source` table and links; interview capture; document upload + extracts | Small, and it retro-fits evidence onto everything already built. The table has to exist before the data does — adding it later means backfilling sources that nobody remembers. |
| **v1.5** | Requirements register + RTM view + coverage/orphan reports | The contribution. Needs the spine underneath it. |
| **v1.5** | Field mapping + data readiness scorecard | Independent of everything else; can slot in wherever there is room |
| **v2** | Handover pack export (stories + acceptance criteria + provenance) | Ends the boundary cleanly |
| **v2** | Roles and permissions matrix | Best remaining billable deliverable |
| **v2+** | AI-assisted document extraction with human confirm | Only once the data model is settled |
| **Never** | Sprint/backlog tracking, BPMN modeller, ERP integration | §1, §4.1, §4.7 |

**The sequencing point that matters most:** `elicitation_source` should be in the schema from the
first migration that touches processes, even if no UI uses it for months. It is a foreign key on
half your tables. Adding it in month four means a migration across live engagement data and a set of
records whose provenance is permanently unknown.

---

## 7. What this changes in the other docs

Your call, not mine — but these are the edits this document implies.

- **`PRD.md`** — the four v1 modules become four modules plus a cross-cutting evidence spine. The
  out-of-scope list gains an explicit line for sprint/backlog tracking, because "we deliberately
  excluded it" reads very differently from silence.
- **`docs/DATA-MODEL.md`** (not written yet) — `elicitation_source`, the polymorphic source link,
  `requirement`, the trace link table, `data_entity`, `field_mapping`. All tenant-scoped, all carrying
  `org_id` per your rule. The trace link table is the one to design carefully; a generic
  `(from_type, from_id, to_type, to_id, relationship)` edge table is tempting and will fight RLS.
  Consider explicit link tables per pair instead.
- **`docs/plan/`** (not written yet) — the spine needs a phase, placed before the requirements
  register rather than after.
- **`RESEARCH.md` §5** — feature #17 (handover pack) is promoted and specified here; #11 (interview
  mode) is absorbed into the spine; #9 (derived RACI) now connects to the roles and permissions matrix.

---

## 8. The panel question this creates

Adding requirements tooling invites a question you did not previously have to answer. Rehearse it.

> **"You have a requirements traceability matrix. Isn't this just Jira, or Jama?"**

Jira starts at the story and tracks it to done. Jama starts at the requirement and traces it to test
cases. Both begin at the point where somebody has already decided what to build. Trestle traces in the
other direction — from the requirement back to the impact, the process, the stakeholder, the readiness
finding and the interview that produced it. The matrix answers "why does this requirement exist and
what organisational condition does it address," which is a question neither tool holds the data to
answer. And Trestle stops at approval and hands over; it does not manage delivery.

> **"Why not just add sprint tracking so it's one tool end to end?"**

Because the buyer is the implementation partner, who already has a delivery tool and will not migrate
it, and because the phase boundary is the product's defensibility. One tool end to end is a bigger
product with worse odds against four incumbents.
