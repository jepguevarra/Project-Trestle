# Trestle — Product Requirements (v1)

## The problem

System implementations fail on people, not software. The partner scopes modules, configures, and
goes live; three months later adoption is 40%, the finance team is still in spreadsheets, and
the client blames the partner. The work that would have prevented it — readiness assessment,
impact analysis, stakeholder engagement, process documentation — is real consulting work, but
today it happens in a pile of Word templates and Excel trackers that never get reused, never
benchmark across engagements, and look amateurish next to the implementation deliverables.

Trestle turns that pile into a product.

## Scope of the work it supports

Trestle supports preparation for a **technology-driven change**: one where a system is being
introduced or replaced, existing ways of working will change, and someone has to specify what the
new system must do. That covers packaged software (ERP, CRM, HRIS, WMS, POS, accounting,
e-commerce), custom builds, platform migrations, automation, and digitalisation of manual
processes.

It does **not** cover change with no system attached — reorganisations, M&A integration, policy or
culture programmes. Those have no processes being replaced and no requirements to trace, and
reaching for them turns the product into a survey tool. See `POSITIONING.md` for the full argument
and for the `engagement.type` model that carries this distinction in the schema.

ERP is the first go-to-market, not the boundary of the product.

## Who buys it

**Primary: the implementation partner.** A 10–60 person firm implementing packaged software or
delivering custom systems — Odoo, SAP B1, NetSuite, Dynamics and their equivalents in other
categories. They want to sell a paid discovery or readiness phase before the build, and they want
it to look like a methodology rather than a favour. ERP partners are the first market because that
is where the founder's network is, not because the product is limited to them.

**Secondary: the independent functional consultant.** One to three people, sells readiness and
process documentation as a standalone engagement. Price-sensitive, wants to look bigger than
they are. (This is NutKase's own use case — dogfood it.) Pricing for this buyer is in
`BUSINESS-MODEL.md` §3.

**Not the buyer: the end client.** The client company is a *subject* of the data, and their
staff are respondents. They may be given read access to a report. They do not administer.

## Roles

| Role | Scope | Can do |
|---|---|---|
| Owner | Organisation | Billing, delete org, everything below |
| Admin | Organisation | Invite members, create clients & engagements, manage templates |
| Consultant | Assigned engagements | Run assessments, edit registers, author SOPs |
| Viewer | Assigned engagements | Read + export only. This is what a client sponsor gets. |
| Respondent | One instrument instance | Answer a survey via a tokenised link. No account. |

## The four v1 modules

### 1. Change Readiness Assessment

Measure whether an organisation can absorb the change, before committing to a go-live date.

- Build an instrument from a template (Trestle ships a default readiness instrument) or from
  scratch: sections, questions, question types, weights, and the readiness **dimension** each
  question scores into.
- Default dimensions: Leadership & Sponsorship, Awareness & Understanding, Capability & Skills,
  Culture & History of Change, Resources & Capacity, Communication.
- Distribute: upload or type a respondent list (name, email, department, role, seniority),
  send tokenised links by email, track completion, nudge non-responders.
- Respondents answer on a public page with no login. Anonymity is a per-instrument setting.
- Scoring: weighted dimension scores, an overall readiness index, and segment breakdowns by
  department / role / seniority — suppressed below 5 respondents.
- Output: a readiness dashboard and an exportable report with dimension scores, the lowest
  scoring items, open-text themes, and the consultant's own narrative blocks.

### 2. Stakeholder Mapping

Know who matters and whether they are with you.

- Stakeholder register per engagement: name, title, department, email, sponsor flag.
- Rate **influence** (1–5) and **interest** (1–5) → influence/interest grid with the four
  standard quadrants (Manage Closely, Keep Satisfied, Keep Informed, Monitor).
- Rate current **stance** (Opposed → Neutral → Supportive → Champion) and target stance; the gap
  is the engagement backlog.
- Engagement log: dated interactions, channel, notes, next action, owner, due date.
- Output: the grid, a stance heat strip by department, and an engagement plan export.

### 3. Change Impact Assessment

Say precisely who gets hurt, by what, and how much.

- Define the engagement's org units and in-scope processes.
- For each affected process × org unit, record an impact: type (Process / People / Technology /
  Policy / Data), description of as-is → to-be, severity (1–5), and the affected headcount.
- Mitigation per impact: action, owner, due date, status.
- Output: an impact register, a heatmap of org unit × impact type coloured by max severity, and
  a "top 10 impacts" view that drives the training and comms plan.
- Impacts can be linked to readiness findings and to stakeholders, so the story connects.

### 4. Process Documentation & SOP Builder

Capture what people actually do, before it's replaced.

- Process inventory per engagement: name, owner, org unit, frequency, systems used, criticality.
- Step capture: ordered steps with actor role, action, system, inputs, outputs, and pain points.
  Pain points feed the impact register.
- SOP authoring from a template: purpose, scope, roles, procedure (generated from the steps),
  exceptions, references. Draft → In Review → Approved, with versioning.
- Output: SOP export to PDF and DOCX with the consulting firm's logo and footer.

## The connective tissue

The modules are not four separate tools. What makes Trestle worth paying for is that they share
an engagement:

- A low readiness dimension **points at** the stakeholders in that department.
- A pain point captured during process documentation **becomes** a candidate impact.
- A high-severity impact **generates** a stakeholder engagement action.
- One engagement report pulls from all four.

Build the joins from the start even if the UI surfaces them late. See `docs/DATA-MODEL.md`.

## Explicitly out of scope for v1

- Billing and subscriptions (phase 08 — stub the org plan field and move on)
- Training plan builder, comms calendar, benefits realisation tracking
- Post-go-live adoption tracking
- Integration with any actual ERP (yes, including Odoo — resist this)
- Mobile apps; the respondent survey page must work well on a phone browser, that is all
- Custom scoring formulas per firm; v1 has weighted-average only
- White-label domains; logo + firm name on exports is enough
- Real-time collaborative editing
- AI-generated report narrative (tempting, deferred — the data has to be right first)

## Success criteria for v1

Jeff can run a complete paid readiness engagement for one real client entirely inside Trestle,
from creating the client to handing over a PDF report, without opening Word or Excel once.

This is also the capstone's primary field test — see `RESEARCH.md` §6.3.

## A note on scope

All four modules is a lot — realistically three to five months of part-time work, and the evidence
spine, requirements module and data readiness described in `BA-LAYER.md`, `REQUIREMENTS-MODULE.md`
and `DATA-MODEL.md` add more on top.

The phase order in `docs/plan/` is deliberately sequenced so that **after phase 05 you have
something sellable**: a readiness assessment that runs end to end and produces a report. If you
need to show a client something, stop there and sell it. Phases 06–12 add the rest, and the plan is
staged so a deadline truncates it rather than breaking it.
