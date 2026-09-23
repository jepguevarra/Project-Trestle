# Trestle — The Requirements Module

Design spec. Answers: what would it take to match reqSuite® rm, beat it, and hang a set of BA
technique tools off it. Extends `BA-LAYER.md` §3.2, which specified the register at one paragraph's
depth. Read `TOOL-LANDSCAPE.md` §1 first for why the category looks the way it does.

---

## 0. The tension, resolved before anything else

`TOOL-LANDSCAPE.md` says stay out of requirements management. This document specs a requirements
module. That is not a reversal, but the line has to be drawn precisely or scope will eat the project.

**reqSuite is a general-purpose requirements management tool for product development.** Its customers
build medical devices and cars. Competing with it on its own ground means matching variant handling,
V-model support, ISO 26262 and FDA 820.30 templates, and test execution — years of work against an
established vendor, for buyers you do not have.

**What Trestle builds is an ERP discovery requirements module.** Three things separate it, and all
three are structurally unavailable to reqSuite:

1. **Requirements are rooted in measured evidence** — a readiness score, an impact, a process pain
   point, a named interview. reqSuite's requirements begin as text someone typed.
2. **Every requirement carries a fit-gap disposition.** The central question in packaged-software
   work — does the standard product already do this, and if not, what do we do about it — is
   meaningless in bespoke product development, so no general RM tool models it. This is §3.1 and it is
   the most important thing in this document.
3. **It stops at approval and hands over.** No delivery tracking, ever.

**The test, when a feature is in doubt:** if you find yourself building test execution, variant
management, V-model traceability or a compliance template, you have crossed into reqSuite's market
and you will lose there. Turn back.

---

## 1. What reqSuite rm actually does

Accurate inventory, so the comparison in §2 is fair.

| Area | Capability |
|---|---|
| **Core artifacts** | Requirements, test cases, risks in one model; fully customisable artifact types and attributes; variant handling; V-model support |
| **Quality (built in, no external data)** | **Quality check** — flags incomplete attributes, broken relationships, linguistic and structural problems. **Similarity analysis** — detects overlapping content and duplicates. **Work suggestions** — finds incomplete structures and missing refinements. **Term proposals** — flags unclear terminology and suggests glossary entries. **Link proposals** — suggests relationships between requirements, risks and test cases. **Data reconciliation** — compares new requirements against previous projects so proven solutions can be reused |
| **Extended AI (language models)** | Automated rewording, translation, generated refinements and test cases, consistency checking across hierarchies, semantic merge analysis, a project chatbot, natural-language-to-query generation, an AI variable in the rule engine |
| **Process** | Review and approval workflows, change management, version control, baselines |
| **Integration** | Bidirectional sync with Jira, Azure DevOps and GitLab; WebAPI; Word and Excel; ReqIF import/export |
| **Compliance** | ISO 26262, FDA 820.30 |
| **Delivery** | Web-based, mobile-accessible, free trial, pricing on request |

It is a good product. The quality-assistance set in particular is well thought through and worth
studying — most of §2's "copy" column comes from it.

---

## 2. Copy, skip, beat

### Copy — they got these right

| reqSuite capability | Trestle version |
|---|---|
| Quality check | Keep, and extend with ERP-specific rules (§3.4) |
| Similarity / duplicate detection | Straight copy. Two consultants on one engagement will write the same requirement twice |
| Term proposals → glossary | Straight copy. Every ERP engagement has a terminology fight ("what counts as an order?") |
| Link proposals | Keep, but point it at a harder target (§3.2) |
| **Data reconciliation / reuse from past projects** | The single best idea in their product, and worth more in your domain than theirs (§3.3) |
| Customisable attributes | Yes — but bounded. "100% customisable" is how a product becomes unlearnable |
| Review and approval, versioning, baselines | Keep. A consultant needs a client signature on a scope baseline |

### Skip — right feature, wrong domain

| reqSuite capability | Why not |
|---|---|
| Test case management and execution | That is the build team's job, after handover. Acceptance *criteria* stay; test *runs* go |
| Risk module (safety engineering sense) | You already have impact severity and mitigations, framed for organisational change rather than hazard analysis |
| Variant handling, V-model | Product-line engineering concepts. No ERP engagement needs them |
| ISO 26262 / FDA templates | Not your industries |
| **Bidirectional Jira / ADO sync** | One-way export only. See §3.5 — this is a product principle, not a technical shortcut |
| Translation, chatbot, NL-to-query | Fine features, not your contribution, and each is a maintenance commitment |

### Beat — the five upgrades

§3. This is the substance.

---

## 3. The five upgrades

### 3.1 Fit-gap disposition — the field that makes it an ERP tool

In packaged software the work is not "write the requirement." It is "decide whether the product
already does this, and if not, what it costs to close the gap." Every functional consultant does this
every day, in a spreadsheet, and no requirements tool on the market models it.

```
requirement
  …
  verdict            fit | gap | partial
  disposition        (when not a fit)
                     configuration        — settings, no code
                     workaround           — change the process instead
                     extension            — build alongside the standard
                     customisation        — modify standard behaviour
                     third_party          — buy an add-on
                     out_of_scope         — declined, with a reason
                     deferred             — phase 2
  effort_band        S | M | L | XL
  justification      required when disposition is customisation
  → traces to the impact or process that justifies it
```

Four derived views fall straight out, and each is something a consultant is asked for:

- **The customisation register.** Every requirement resolved by customisation, with its justification
  and effort. This is the list a CFO asks to see and the one that determines whether the project is
  affordable. Practitioners call the accumulated maintenance burden the "upgrade tax" — each
  customisation has to be re-tested and often re-built at every upgrade — and having it enumerated,
  justified and costed *before* the build is exactly the pre-implementation deliverable Trestle exists
  to produce.
- **Fit ratio by ERP module.** "Sales is 85% standard; Manufacturing is 40%." That single table tells
  a partner where the project's risk and margin actually sit, at scoping time.
- **Gap cost roll-up.** Effort bands summed by disposition. Not a quote, but the shape of one.
- **The scope baseline.** The approved set at a point in time, so change requests can be measured
  against something.

One caution, and it is the one a panel will find: a fit-gap verdict is **ERP-specific**, and Trestle
is deliberately ERP-neutral. Resolve it by scoping the verdict to the engagement — the engagement
records which ERP is being implemented, and the verdict is a judgement the consultant records, not
one Trestle computes. Trestle never claims to know what Odoo does out of the box. It structures,
stores, totals and traces the consultant's judgement. Say this explicitly in the paper; it is the
difference between a defensible claim and an indefensible one.

### 3.2 Evidence rooting, and coverage in both directions

reqSuite's link proposals suggest relationships between requirements, risks and test cases — all
artifacts of the same kind. Trestle's version suggests a link between a requirement and a **pain
point, impact or readiness finding**: a harder suggestion, and a far more useful one, because it
answers *why* rather than *what else*.

The two coverage reports matter more than the matrix itself:

- **Forward:** which processes, pain points and impacts produced no requirement. Findings that went
  nowhere. Every one is either an oversight or a deliberate decision, and either way it should be
  visible before sign-off.
- **Backward:** which requirements trace to nothing. Requirements somebody invented. In ERP work these
  are usually the expensive customisations that nobody can later justify.

Neither report is possible in any tool from `TOOL-LANDSCAPE.md` §1, because none of them hold the
left-hand side.

### 3.3 The ERP requirement pattern library — the compounding asset

reqSuite's "data reconciliation" compares new requirements against previous projects. Good idea,
limited payoff in product development, where every project is genuinely different.

**In ERP consulting the domain repeats.** An Odoo partner implementing a wholesale distributor writes
substantially the same sixty requirements they wrote for the last wholesale distributor, with
variations. Requirements reuse is a studied field — Volere's reuse work and the software requirement
patterns literature (Franch et al.) — and the ERP-partner case is close to the ideal instance of it.

```
requirement_pattern
  org_id                          (the firm's own library — not shared across tenants)
  name
  erp_module                      sales | purchase | inventory | accounting | manufacturing | hr
  industry_tags
  statement_skeleton              with {placeholders}
  typical_verdict / typical_disposition
  typical_acceptance_criteria
  common_variations
  qualifying_questions            what to ask a client to confirm it applies
  source_engagement_id            where it was promoted from
  times_used, times_a_gap
```

Three mechanics make it compound:

1. **Seed it.** Ship a starter library per ERP module so the first engagement is not an empty screen.
2. **Promote from real work.** "Promote this requirement to a pattern" after an engagement. The
   library grows from work already done and paid for.
3. **Report back.** "This pattern was a gap in 7 of your last 9 wholesale clients." A firm that knows
   this scopes more accurately than one that does not — and only a multi-tenant product that stores
   many engagements can compute it.

This is the same compounding logic as the readiness benchmark in `RESEARCH.md` §4.4, applied to
requirements, and it arrives sooner because a firm generates patterns from its own engagements
without needing cross-tenant data.

For a small firm this is also the answer to a real business problem: a junior consultant running
discovery from a seeded pattern library asks the questions the senior would have asked. You have
supervised juniors; you know what inconsistent discovery costs.

### 3.4 Quality checks that mean something in ERP

reqSuite's checks are linguistic and structural. Keep those, add these — all cheap, all pure
functions over data you already hold, and all genuinely unavailable to a single-purpose RM tool:

| Check | Why it matters |
|---|---|
| Requirement with no traced source | An invented requirement |
| Gap with no disposition | An undecided scope item pretending to be decided |
| Customisation with no justification traced to an impact | The expensive ones, unjustified |
| **Must-have requested by a stakeholder currently rated Opposed** | A scope commitment with no political backing. Cross-module, and nobody else can compute it |
| **Requirement against a process in a department scoring low on readiness** | Deliverable into an area that cannot absorb it |
| Acceptance criterion that is not observable | Fails at UAT, four months later |
| Two requirements with conflicting dispositions on one process | An internal contradiction in the scope |

The last three are the interesting ones, because they only exist when readiness, stakeholders,
processes and requirements live in one model. They are the concrete proof that the modules are not
four separate tools.

### 3.5 Stop at approval — the handover pack

Status runs `draft → reviewed → approved → descoped`. There is no "in progress", no "done".

The export carries, per requirement: the statement, acceptance criteria, priority, fit-gap verdict and
disposition, and a **provenance line** — the process, impact, stakeholder and elicitation source it
came from. Formats: CSV and Jira/ADO-shaped JSON for the build team's tool, plus a PDF or DOCX
specification for the client's signature.

**Why one-way, and why that is a principle rather than a limitation:** bidirectional sync makes
Trestle responsible for delivery state. It drags the product into the project phase, creates a support
burden every time Atlassian changes an API, and dissolves the boundary that makes the product
defensible. One-way export says: here is the scope, signed, with its reasoning attached. What you do
with it is yours.

---

## 4. The BA technique tools

### 4.1 The trap to avoid

BABOK names 50 techniques. A menu of 50 shallow tools is worse than none: each one is a screen to
build, document, test and maintain, and a consultant who tries three and finds them thin stops trusting
the product. **Build six properly.**

### 4.2 Field, template, or tool?

A technique earns a *tool* only when it has **state and interaction a form cannot carry** — something
to arrange, drag, branch or step through. Otherwise it is a template (a starting structure) or a field
(an attribute on something that already exists). Most techniques are fields.

### 4.3 The six to build

| # | Technique | What the tool is | What it writes back |
|---|---|---|---|
| 1 | **Interviews / Workshops** | Session runner: reusable question script, participants from the stakeholder register, live capture, timer | `elicitation_source` + pain points, requirements, stakeholder notes, all pre-sourced |
| 2 | **Document Analysis** | Extract tagger: upload, select a passage, tag it to a process, requirement or field | `elicitation_source` of kind `document` + extracts |
| 3 | **Prioritization** | MoSCoW board, drag between columns, with a guard that flags it when Must exceeds a share of the total | `requirement.priority` |
| 4 | **Root Cause Analysis** | 5 Whys chain from a pain point, branching where causes diverge | Root causes on the pain point, feeding candidate requirements |
| 5 | **Functional Decomposition** | Process hierarchy tree with in-scope / out-of-scope marking, which doubles as Scope Modelling | Process parent/child + engagement scope |
| 6 | **Roles and Permissions Matrix** | Role × function grid, seeded from the actors already captured in process steps | The ERP security matrix — a billable deliverable nobody enjoys building |

Numbers 1, 2 and 6 are the ones that save a consultant real hours. Numbers 3, 4 and 5 are cheap and
make the product feel like it knows the craft.

### 4.4 The ones that are fields or templates, not tools

Acceptance and Evaluation Criteria (a structured field, Given/When/Then), Non-Functional Requirements
Analysis (a prompted checklist by category), Business Rules Analysis (a catalogue linked to steps),
Glossary (a table), Interface Analysis (the systems register you already collect on processes),
Estimation (an effort band), Organizational Modelling (org units), Item Tracking (the action logs you
already have). Each is an hour of work, not a screen.

### 4.5 The technique ledger — the cheapest high-value idea here

Record which technique was applied, when, by whom, to what. It is a derived view over the elicitation
log and the register, so it costs almost nothing.

The output is a **methodology page in the final report**: *"This engagement applied 11 BABOK techniques
across 14 sessions with 23 participants over 6 weeks: 9 interviews, 3 workshops, 14 documents analysed,
2 observation sessions…"*

Your PRD says the buyer wants their preparation work "to look like a methodology rather than a favour."
This is that sentence, generated from data rather than written by hand — and it is simultaneously a
sales artifact for the firm and evidence of rigour for your capstone. It also gives your paper a clean
way to state technique coverage as a measured fact rather than a claim.

---

## 5. Data model additions

Beyond `BA-LAYER.md` §7. All tenant-scoped, all carrying `org_id`.

```
requirement                 (+ verdict, disposition, effort_band, justification)
requirement_pattern         the firm's reusable library
requirement_trace           links to process / impact / stakeholder / readiness / source
technique_application       engagement_id, technique, applied_at, by, subject ref
business_rule               statement, process_id, source
glossary_term               term, definition, engagement or org scope
system_interface            system, direction, data, criticality
role_permission             role × function × permission
```

Design note carried forward from `BA-LAYER.md` §7: resist the single generic
`(from_type, from_id, to_type, to_id)` edge table. It is elegant, and it fights RLS, indexing and type
safety at once. Explicit link tables per pair are duller and will be faster and safer.

---

## 6. What this does to scope — honestly

This is more than `BA-LAYER.md` estimated. That document called the requirements register "one view";
with fit-gap, a pattern library, ERP quality checks and six technique tools it is a module comparable
in size to Readiness. Do not pretend otherwise when planning.

**Minimum defensible version** — enough for the capstone contribution, roughly a third of the above:

1. `requirement` with verdict + disposition + effort band
2. Traceability links and both coverage reports
3. Four quality checks, including the two cross-module ones
4. Handover export with provenance
5. Two technique tools: the session runner and the document extract tagger

**Everything else is v2:** pattern library, MoSCoW board, 5 Whys, decomposition tree, roles matrix,
similarity detection, glossary proposals.

The minimum version still beats every tool in `TOOL-LANDSCAPE.md` on the thing you are claiming,
because the claim is evidence-rooted fit-gap traceability, not feature count. Feature count is an
argument you cannot win against a funded vendor and do not need to.

---

## 7. For the capstone

**Grounding.** Requirements reuse is an established research area — Volere's reuse work, the software
requirement patterns literature (Franch and colleagues), and interview-based studies of industrial
reuse practice. Cite it for §3.3 rather than presenting the pattern library as a product idea. Pair it
with BABOK's Trace Requirements task (5.1) for §3.2.

**The novelty sentence.** Not "a requirements management tool." Rather: *requirements traceability
rooted in measured organisational readiness, with fit-gap disposition as a first-class attribute and a
reusable pattern library that compounds across engagements.* Three claims, each checkable, none held by
any product in the landscape review.

**The question you will get:**

> "This is reqSuite. What is new?"

reqSuite manages requirements for teams building a product from scratch; it starts when someone has
already decided what to build, and it has no concept of whether a packaged system already does the
thing. Trestle starts one step earlier — the requirement is derived from a measured organisational
condition and a named conversation — and it carries the question that defines packaged-software work:
does the standard product do this, and if not, what does closing the gap cost. Neither of those exists
in reqSuite, and neither could, because its customers are not implementing packaged software.

Then add the honest half, because it earns more than it costs: reqSuite is the better tool for managing
requirements through a long engineering build, and Trestle does not try to be.
