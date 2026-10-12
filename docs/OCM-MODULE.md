# Trestle — The OCM Lifecycle Module

What Trestle takes from the OCM Solution portal (OCMS), what it leaves, how the data flows across
the five change phases, and how every screen behaves the way Odoo handles records and modules.

Sources reviewed (October 2026): 13 screenshots of the OCMS portal (dashboard, the five phase tool
tabs, free/paid tools, surveys, portfolio and change-metrics reports) and the OCMS template library
in `Change Management Resources/` (~170 Word, Excel, PowerPoint and PDF files across 20 folders).

> **Functionality, not content.** The OCMS templates are OCM Solution's copyrighted material. Trestle
> takes the *functions, fields and flow*. Every shipped template, checklist item, survey item, channel
> description and message body is written fresh. The folder is reference material only: it is
> git-ignored and never shipped, seeded or quoted. Survey items follow the existing rule in
> `RESEARCH.md` §2: adapt from published scales, do not copy vendor items.

Decided with Jeff, 7 October 2026:

1. **All five OCM phases are in scope**: Assess → Develop → Deploy → Normalize → Exit (§2).
2. **The UI is Odoo-shaped inside the existing Next.js app**: apps, list/kanban/form views, control
   panel, statusbar, smart buttons, chatter (§7). It is not an Odoo addon; the stack in `CLAUDE.md`
   does not change.
3. **Spec first.** This document, `DATA-MODEL.md` and the phase plan change. No code yet.

---

## 1. What OCMS is, read from the screens

One **project** runs through **five phases**, each a coloured circle on the dashboard. Selecting a
phase filters a row of **tool tabs** to the ones that matter in that phase:

| Phase | Tools shown |
|---|---|
| **1 Assess** | Tasks checklist · Project Essentials · Target Audience List · Change Risk Assessment · Change Impacts · Stakeholders · Resistance · Communications · Readiness · Change Champions · Training · Sponsor |
| **2 Develop** | Tasks checklist · OCM Strategic Playbook · OCM Plan |
| **3 Deploy** | Manage Stakeholders · Assess Resistance · Deploy & Track Communications · Track & Assess Readiness · Manage Change Champions · Deploy & Track Training · Go-Live Assessment · Continue Change Risk Assessment |
| **4 Normalize** | Deploy & Track Communications · Go-Live Assessment · Deploy Additional Training · Complete Change Risk Assessment |
| **5 Exit** | Implement Transition Plan |

Around the tools:

- **Main dashboard**: projects and regions, pending tasks (task, assignee, phase, due date), and a
  project snapshot: number of changes, number of individuals, number of training courses, and
  average stakeholder risk, readiness level and adoption score.
- **Audiences**: impacted groups (three organisation levels) and individuals, uploadable, each
  individual carrying stakeholder types.
- **Surveys**: templates (Change Champions, Coaching, Communication Engagement, Go-Live Adoption,
  Project Assessment) that are created and sent; "My Surveys" lists the live ones.
- **Reports**: a *portfolio overview* across projects (impacts by severity, individuals,
  stakeholder impact, readiness and receptiveness per project) and *change metrics* per project:
  a project risk/effort gauge; counts of top-level groups, individuals, champions and impacted
  groups/individuals; high/mid/low impact changes; change saturation (impacted audience by number of
  changes); readiness per audience; stakeholder receptiveness high/mid/low; training timeline and
  completion; overall readiness; communications by type; adoption score per audience.
- **Free resources / change library / OCM training**: downloadable templates and guides.

### 1.1 What the template library adds

The screenshots show the tools; the templates show their fields. The fields that shape §5:

| Template | What it contributes |
|---|---|
| Change Management Project Checklist | **The spine.** 49 tasks across Onboarding, Assess, Develop, Deploy, Normalize and Exit, each pointing at the tool that does it |
| Change Impact Assessment (basic, comprehensive) | *What is changing* is separate from *which groups it hits*. One change hits many groups at L1/L2/L3, each with its own severity (No/Low/Mid/High), headcount, and follow-up task |
| Tool to Determine What OCM Service to Offer | The **change risk assessment**: six 1–3 factors, two reverse-scored, averaged into a band that maps to a service tier |
| Readiness Survey Questions | Awareness, acceptance, capacity, knowledge, proficiency, go-live readiness, and scheduling preferences |
| Readiness Planning Itinerary (data sheet) | A **consultant-rated group profile**: awareness, buy-in, manager style, culture, skill, proficiency, past change experience, documentation updates needed |
| Communication Plan and Roadmap; Communication Channels | A comms plan line: phase, objective, audience, channel, message theme, owner, timing, dates, status. A channel library with frequency and who delivers |
| ~40 communication templates | A **message library** keyed by purpose: awareness, impacts, progress update, timeline change, FAQ, countdown 1–3, go / no-go, go-live, post go-live, support calls, training, champions, closure. Internal and external variants |
| Engagement Channels; Sponsor Engagement Strategy | Event types: kick-off, roadshow, town hall, briefing, workshop, feedback session, drop-in support, Q&A, champion meeting, stakeholder roundtable. Sponsor activities and cadence |
| Change Champion Strategic Plan and Network Itinerary | A champion lifecycle (identify need → request nominations → commit → kick off → engage → track → recognise) and how many champions each impacted group needs |
| Stakeholder and Sponsor guides | Internal/external, direct/indirect stakeholders; influence × impact prioritisation (A–D); sponsor availability, commitment and visibility |
| Resistance guides and checklist | 15 observable **signs**, 10 **causes**, 10 **strategies**; a resistance register with owner and status |
| Strategic Training Plan; Training guides | Needs assessment → curriculum → sessions by audience (employees, managers, leaders) → feedback → reinforcement → evaluation |
| OCM RACI (two variants) | Deliverables × roles (R/A/C/I), or deliverables × named reviewers |
| OCM Strategic Playbook Guide | Ten playbook sections, from executive summary to closure |
| OCM Status Update (1-slide, 3×5) | Accomplishments · Risks and challenges · On the horizon |
| OCM Metrics Strategic Plan | Pulse checks, comms KPIs, post-training survey, engagement, focus groups, stakeholder support, resistance metrics |
| Exit Transition Guide & Checklist | Handover to a permanent owner, closing temporary tools, final report, post-mortem and lessons learned |
| UAT Testing Script | Test case, steps, expected result, assignee, status, tester notes, defect link |

### 1.2 The data flow OCMS implies

```
Project Essentials ──► Change Risk Assessment ──► service tier / effort
        │
Audiences (groups L1–L3, individuals) ◄─────────────── upload
        │
        ├──► Changes × Groups = Impacts ──► impacted headcount, saturation, training & comms needs
        ├──► Stakeholders (+ sponsors) ──► receptiveness, stakeholder risk
        ├──► Readiness surveys (waves) ──► readiness per audience
        │
        └──► Resistance hotspots  ◄── high impact + low readiness + low receptiveness
                    │
   Plans: Communications · Events · Champions · Training   (audiences come from impacts)
                    │
           Go-live assessment ──► go / no-go ──► adoption surveys (pre and post)
                    │
            Change metrics & portfolio ──► status reports ──► transition, final report
```

The checklist runs alongside the whole flow: each task belongs to a phase and points at the tool
that completes it.

---

## 2. Scope: all five phases, and what that does to positioning

`POSITIONING.md` sets the product's **width**: technology-driven change only (L2 default, L3
ceiling, never L4). That does not change. This module changes the product's **depth**: Trestle now
stays with the client's people through go-live and exit, not just to approved scope.

The sentence that keeps it coherent, and keeps `BA-LAYER.md` §4.1 intact:

> Trestle hands the **requirements** to the build team at the scope baseline. It stays with the
> **people** through go-live and exit.

What stays out: delivery tracking of the build (sprints, story monitoring, defect management beyond
the UAT log in §5.17) and change with no system attached. The ITIL change-control templates, the
post-merger checklist, the McKinsey 7S overview and the culture questionnaire in the folder are L4
or project-management material and are not taken (§8).

The cost, stated in `POSITIONING.md` §9: Trestle now overlaps OCMS, Prosci tooling and The Change
Compass on OCM delivery. The defensible difference is the same as before, and more important now:
the readiness, impact and stakeholder data are joined to the processes and requirements of a
specified system.

---

## 3. The feature map

Every OCMS tool, the Trestle app that replaces it, its tables (`DATA-MODEL.md`), and the phase that
builds it (`plan/README.md`).

| OCMS tool / page | Trestle app | Tables | Phase |
|---|---|---|---|
| Projects | Engagements (exists) | `engagement` | 02 ✓ |
| Regions | *Not taken*: client + engagement already group the portfolio | — | — |
| Project Essentials | Engagement form, *Essentials* tab | `engagement` (new columns) | 02b |
| Phase circles | Engagement **statusbar**: Assess → Develop → Deploy → Normalize → Exit | `engagement.ocm_stage` | 02b |
| Tasks checklist | **Checklist** app | `task`, `task_template`, `task_template_line` | 14 |
| RACI templates | Checklist → *RACI* | `raci_role`, `raci_entry` | 14 |
| Readiness tool, Surveys | **Readiness** app (the instrument engine) | `instrument` … `response` | 03–05 |
| Survey templates (champion, coaching, comms, go-live, project) | Instrument templates by `kind` | `instrument_template` | 03, 16–18 |
| Readiness data sheet (group profile) | Readiness → *Group profiles* | `org_unit_readiness_profile` | 07 |
| Target Audience List | **Audiences** app: groups and people | `org_unit`, `person` | 07 |
| Stakeholders, Sponsor tool | **Stakeholders** app | `stakeholder`, `stakeholder_interaction` | 07 |
| Change Impacts | **Impacts** app: changes and their impacts | `change`, `impact`, `mitigation` | 08 |
| Change Risk Assessment | Impacts → *Change risk* | `change_risk_assessment` | 08 |
| Resistance | **Resistance** app | `resistance` | 15 |
| Communications, OCM Plan (comms) | **Communications** app | `communication`, `communication_template`, `channel` | 16 |
| Engagements & briefings, sponsor activities | **Events** app | `event`, `event_org_unit`, `event_attendee` | 16 |
| Change Champions | **Champions** app | `champion` | 17 |
| Training, Coaching | **Training** app | `training_course`, `training_session`, `training_enrollment` | 17 |
| Main dashboard, Change metrics, Portfolio | **Overview** app and **Reporting** | derived (`lib/scoring/`) | 13 |
| Roadmaps | Overview → *Roadmap* (`DASHBOARD.md` §2, section 5) | `milestone`, `milestone_gate` | 13 |
| Go-Live Assessment | **Go-Live** app | `milestone` (kind `go_no_go`), `go_live_decision` | 18 |
| Adoption score | Go-live and post-go-live adoption instruments | `instrument` | 18 |
| OCM Strategic Playbook, OCM Plan | **Playbook** export | `playbook_section` | 19 |
| Status updates (1-slide, 3×5) | **Status reports** | `status_report` | 19 |
| Transition and exit | **Transition** app | `lesson_learned` + Exit-phase tasks | 19 |
| UAT script | **UAT** (optional) | `uat_case` | 20 |
| Free resources, change library | Org **Library**: firm-owned files tagged by phase and app | `library_item` | 19 |
| Free vs paid tools | The entitlement layer, if ever (`BUSINESS-MODEL.md`) | `entitlement` | 12 |

---

## 4. The lifecycle: stage, checklist, gates

### 4.1 The engagement statusbar

`engagement.ocm_stage`: `assess | develop | deploy | normalize | exit`, shown as the Odoo statusbar
on the engagement form and in the navbar of every app. It replaces OCMS's phase circles.

- The stage is **set by the consultant**, never computed. Moving forward shows a confirmation that
  lists what is incomplete: open tasks in the earlier phase, plus the computed gates of any milestone
  in that phase (`DASHBOARD.md` §1). It warns; it does not block. Same principle as the gates: the
  evidence is shown, the human decides.
- `engagement.status` (`active | archived`) is unchanged and remains the pricing meter. Reaching
  `exit` does not archive; archiving stays an explicit act.
- Every app's default search filter is "current stage", one click away from "all stages". That is
  what OCMS's phase tabs do.

### 4.2 The checklist

A **task template** is a reusable list of tasks, each with a phase, an order, and the app that does
the work (`tool_key`). Trestle ships one system template that covers the 49-item OCMS sequence in
its own wording. A firm can copy it and edit its own. Creating an engagement offers "start from
template", which writes `task` rows.

- Task fields: phase, name, description, assignee (a member, or free-text for client-side people),
  start and due dates, status (`todo | in_progress | done | blocked | cancelled`), `tool_key`, and an
  optional link to the record it is about.
- Views: list grouped by phase (the OCMS view), kanban by status, and a timeline of dated tasks
  (OCMS "Timeline View").
- Progress per phase = done ÷ (total − cancelled), shown on the statusbar as `Assess 14/21`.
- The **Pending tasks** panel on Overview is this table, filtered to open and assigned to me, sorted
  by due date.
- A task's "Open" button deep-links to `tool_key` (task "Assess change impacts" opens Impacts).

The checklist is **not** a project-management tool: no dependencies, no effort, no resourcing, no
critical path. It is the OCM method as a list, and that line keeps `CLAUDE.md`'s "not a PM tool" true.

### 4.3 RACI

Roles per engagement (Change Lead, Change Analyst, Change Owner, Impacted Leaders, Comms, Training,
plus any added) and a matrix of deliverables × roles with R, A, C or I. A deliverable is a task or a
free-text line. One quality check: **exactly one A per deliverable**.

---

## 5. The apps

Each subsection lists the fields, what is derived, and the views. All views follow §7.

### 5.1 Project Essentials (engagement form)

New engagement columns: `start_date`, `end_date`, `ocm_stage`, `objectives`, `scope_summary`,
`success_criteria`. Existing: `target_system`, `target_go_live`, `type`. The sponsor is a smart
button to the stakeholder flagged `is_sponsor` (phase 07), not a column.

Form layout: statusbar (stage) · smart buttons (Tasks 14/49, Impacts, Stakeholders, Readiness
index, Open resistance, Comms sent/planned, Champions, Training completion) · sheet with
*Essentials*, *Dates* and *Team* (assignments) tabs · chatter.

### 5.2 Change risk assessment

How much change-management effort the engagement needs. One current row per engagement, history in
chatter.

| Factor | Question | Scale |
|---|---|---|
| `impact_breadth` | How many groups and people are impacted? | 1 Low · 2 Mid · 3 High |
| `impact_depth` | On average, how severe are the impacts? | 1 · 2 · 3 |
| `visibility` | How high-profile is the programme with leadership? | 1 · 2 · 3 |
| `strategic_risk` | How likely is failure without effective change management? | 1 · 2 · 3 |
| `pm_ocm_experience` | How experienced in OCM is the project team? | **reversed**: High = 1 |
| `pm_ocm_bandwidth` | How much capacity does the project team have for OCM? | **reversed**: High = 1 |

- Score = mean of the six. Band: **Low** < 1.67 ≤ **Mid** < 2.34 ≤ **High**. Service tier: Low →
  *Self-service*, Mid → *Advisory*, High → *Full service*. The thresholds are equal thirds of the
  1–3 range, Trestle's own choice; OCMS publishes the tiers but not the cut-points.
- `impact_breadth` and `impact_depth` are **suggested from the impact register** once it has data
  (share of org units impacted; mean impact level), and shown beside the consultant's rating. The
  consultant's value is stored; the suggestion is derived.
- Rendered as a plain semicircle meter with the band label and score (OCMS's gauge, in the house
  style), not a three-colour dial.

### 5.3 Audiences: groups and people

- **`org_unit`** moves to phase 07 (from 08). It is the impacted-group tree: unlimited depth, and
  the report columns L1/L2/L3 are the first three levels. New: `is_external` (customers, vendors,
  an outsourced partner), `location`, `headcount`.
- **`person`** is new: an individual in the client's organisation, Trestle's `res.partner`. Name,
  email, job title, org unit, manager (self-reference), location, stakeholder category
  (`internal | external`) and `is_direct`. CSV import with a row-level error report.
- People feed everything else: stakeholders are assessments *of* a person, champions are people,
  training enrolls people, and respondents can be picked from people (§5.6).

Headcount rule: a group's impacted individuals = its `headcount` when no children are impacted,
otherwise the sum of its impacted children. Never parent plus children, which double-counts.

### 5.4 Stakeholders and sponsors

`stakeholder` becomes an assessment of a `person` (name, title, department and email move to
`person`). It keeps influence, interest, current and target stance, and ADKAR state, and adds:

| Field | Values | From |
|---|---|---|
| `availability` | low · mid · high | OCMS "capacity" |
| `is_sponsor` | boolean (exists) | — |
| `sponsor_commitment` | low · mid · high, sponsors only | Sponsor guide |
| `sponsor_visibility` | low · mid · high, sponsors only | Sponsor guide |

Derived, in `lib/scoring/`, never stored:

- **Receptiveness**: opposed → Low, neutral → Mid, supportive or champion → High. This is OCMS's
  high/mid/low receptiveness report, computed from the stance Trestle already records.
- **Priority (A–D)**: influence ≥ 4 is "high influence"; the person's org unit at impact level
  `high` is "high impact". A = both, B = influence only, C = impact only, D = neither.
- **Stakeholder risk** (1 Low · 2 Mid · 3 High):
  - High: influence ≥ 4 **and** receptiveness Low; or influence ≥ 4, receptiveness Mid and impact `high`.
  - Low: receptiveness High.
  - Mid: everything else.
  - "Average stakeholder risk" on Overview = mean of the bands, labelled with the band it rounds to.
- **Sponsor risk**: High if commitment or availability is Low; Low if both are High; else Mid.

This is a starting rule, stated so it can be argued with, and unit-tested like the readiness
scoring. The engagement log (`stakeholder_interaction`) gains channel `coaching`, which is where
OCMS's manager coaching lands (§5.11).

### 5.5 Changes and impacts

OCMS's comprehensive template separates *what is changing* from *who it hits*. The model follows.

- **`change`**: one thing that is changing. Ref (`CHG-001`), title, as-is, to-be, category
  (`process | people | technology | policy | data`), optional process link, status
  (`draft | confirmed`). "# of changes" on Overview counts confirmed changes.
- **`impact`**: one change × one org unit. Level (`none | low | mid | high`), affected headcount,
  group-specific description, `needs_training`, `needs_communication`. Unique per change and org
  unit. Mitigations are unchanged.

**The severity scale changes from 1–5 to No/Low/Mid/High.** It is what the templates, the OCMS
reports (high/mid/low impact changes) and workshop practice use, and a 3-point rating is easier to
agree in a room than a 5-point one. Consequences: the heatmap uses three steps of the existing ramp;
"top impacts" ranks by level weight (1, 2, 3) × headcount; a `none` row records that a group was
assessed and is unaffected, which is a finding in its own right.

Derived:

- **Change saturation** per org unit: count of confirmed changes impacting it at `low` or above.
  Shown as a bar per group, which is the OCMS chart. It is the miniaturised saturation check in
  `RESEARCH.md` §5, item 8.
- Impacted groups, impacted individuals, high/mid/low impact counts.
- **Training need** and **comms need**: impacts flagged `needs_training` / `needs_communication`
  with no course or communication covering that org unit. These feed suggestions (§5.18).

### 5.6 Readiness and surveys

The phase 03–05 instrument engine is the survey tool. There is no second one. Additions:

- **`instrument.kind`** widens to: `readiness · sponsor · pulse · go_live_adoption ·
  post_go_live_adoption · training_feedback · champion · coaching · communication_feedback ·
  custom`. Each kind gets a shipped template, written for Trestle, so the OCMS "Survey templates"
  carousel becomes "New → from template".
- **Waves.** `instrument.wave` (1, 2, 3 …) with a label: *Baseline*, *Readiness #2*, *Pre-go-live*.
  The OCMS checklist runs readiness at least twice. Overview shows the trend across waves for the
  same kind.
- **Readiness per audience** is the existing segment breakdown, keyed on org unit.
  `respondent.org_unit_id` and `respondent.person_id` are added (nullable). `response` gains a
  denormalised `org_unit_id` alongside department, role and seniority, so the anonymous case stays
  structurally safe (`DATA-MODEL.md` §3). n ≥ 5 suppression applies, as everywhere.
- **Picking respondents from Audiences** copies name, email and org unit onto `respondent`. An
  anonymous instrument still severs response from respondent on submit; `person_id` lives only on
  `respondent`, exactly like `email` does today.
- **Group readiness profile** (`org_unit_readiness_profile`): the consultant's own rating of a group
  per wave on awareness, buy-in, knowledge, proficiency, capacity, past change experience
  (negative / none / positive), manager style, culture, and documentation updates needed. It is
  labelled *consultant assessment* everywhere and **never blended into the readiness index**, which
  stays survey-only and defensible (`RESEARCH.md` §2).

### 5.7 Resistance

`resistance`: one observed or expected point of resistance.

| Field | Values |
|---|---|
| Where | org unit **or** stakeholder (at least one) |
| `level` | low · mid · high |
| `signs` | multi-select from 15 fixed keys: disengagement, negative feedback, missed deadlines, conflict, scope churn, rumours, silos, low morale, turnover/absence, avoidance, key-stakeholder scepticism, resource withholding, sponsor change, low transparency, change-request churn |
| `causes` | multi-select from 10 keys: uncertainty, loss of control, comfort zone, competence fear, threatened interests, attachment to old ways, overload, ripple effects, past resentment, economic fear |
| `strategies` | multi-select from 10 keys: communicate, involve early, leader support, education, pilot, resources, feedback channel, address directly, change agents, celebrate wins |
| `action_plan`, owner, due date | — |
| `status` | identified · mitigating · resolved · escalated |
| `source` | observed · survey · interview · champion report, with an optional elicitation source |

Key labels are Trestle's own wording. **Hotspot suggestions**: org units with a `high` impact, a
readiness index under 50 (where n ≥ 5), or a high-influence stakeholder with Low receptiveness, and
no open resistance record. Overview reports open resistance by level and the resolution rate.

### 5.8 Communications

- **`channel`**: org-level library of `kind` *communication* or *engagement*, with description,
  default frequency and who delivers. Trestle seeds its own list (email, intranet page, newsletter,
  leader message, manager cascade, town hall, roadshow, briefing, drop-in support …).
- **`communication_template`**: org-level or system message library. Purpose
  (`awareness · impacts · progress_update · timeline_change · faq · countdown · go_decision ·
  no_go_decision · go_live · post_go_live · support · training · champions · uat · closure ·
  other`), direction (`internal | external`), subject and body with merge fields:
  `{{client.name}}`, `{{engagement.target_system}}`, `{{engagement.target_go_live}}`,
  `{{sender.name}}` and so on. System templates are written for Trestle.
- **`communication`**: one line of the comms plan and the message itself. Ref, purpose, direction,
  objective, audiences (org units), channel, message theme, sender (person), owner, planned date,
  sent date, status, subject, body, recipient count, and optional manual reach metrics (opened,
  clicked, attended).

Statusbar: **Draft → In review → Approved → Scheduled → Sent** (Cancelled off the bar). "New from
template" merges fields at creation; the body is then the consultant's.

**v1 does not send email to the client's staff.** It composes, exports (.docx, .eml, copy) and
records the send. Sending from Trestle's domain to another company's workforce raises
deliverability, consent and branding problems no partner wants on day one. Open and click rates
therefore exist only when someone enters them.

The communications calendar is the timeline view of this table; the plan export is the list view
grouped by purpose.

### 5.9 Events and briefings

`event`: kick-off, roadshow, town hall, briefing, workshop, feedback session, drop-in support,
Q&A, champion meeting, stakeholder roundtable, sponsor activity. Fields: title, kind, start and
end, location or link, audiences (org units), presenter (person), invited and attended counts or an
attendee list (`event_attendee`: person, invited, attended), status (`planned | done | cancelled`),
notes. Calendar and list views. Attendance rate is an Overview metric.

Sponsor engagement is not a separate table. It is events where a sponsor presents, plus sponsor
interactions in the stakeholder log.

### 5.10 Change champions

`champion`: a person in the network. Org unit, nominated by (person), status (**Identified →
Nominated → Committed → Onboarded → Active**, plus Inactive and Exited), hours per week committed,
kick-off attended, recognised on, notes. Kanban by status is the default view: it is the OCMS
network itinerary as a pipeline.

Derived **coverage**: suggested champions per impacted org unit = ⌈impacted individuals ÷ ratio⌉,
with the ratio an org setting (default 1 : 25, a heuristic). Overview shows groups below coverage.
Champion meetings are events, and attendance there is the champion engagement measure.

### 5.11 Training (and coaching)

- **`training_course`**: name, level (`basic | intermediate | advanced`), method (`classroom |
  workshop | elearning | on_the_job | webinar | briefing`), audiences (org units), target role,
  duration, owner, materials status (`not_started | drafting | ready`), status.
- **`training_session`**: course, start and end, trainer, location or link, capacity, status.
- **`training_enrollment`**: person, session (or course for self-paced), status (`invited →
  registered → attended → completed`, or `no_show`), completed at, feedback score.

Derived: **training completion** = completed ÷ required enrollments; the **training timeline**
(sessions on the timeline view); **# of training courses**; training coverage against
`impact.needs_training`. Post-training feedback is the `training_feedback` instrument.

Coaching of managers is not its own table: a coaching session is a stakeholder interaction with
channel `coaching`, and the coaching survey is an instrument kind.

### 5.12 Go-live assessment and adoption

- **Go / no-go** is a milestone of kind `go_no_go` with computed gates (`DASHBOARD.md` §1). Shipped
  gate set, editable per firm: readiness index ≥ 65 on the latest wave, training completion ≥ 90%,
  no open `high` resistance, champion coverage met, every `needs_communication` impact covered by a
  sent communication, and (with phase 20) UAT pass ratio ≥ 95%.
- **`go_live_decision`**: the human decision beside the computed gates. Decision (`go | no_go |
  conditional`), conditions, decided by (person), decided on, and the communication that announced
  it (the GO and NO-GO templates).
- **Adoption score** = the index of the `go_live_adoption` (pre) or `post_go_live_adoption`
  instrument, overall and per audience. "Average adoption score" on Overview is the latest such
  instrument.

### 5.13 Overview and reporting

Overview is `DASHBOARD.md`'s working view, extended with the OCMS project snapshot. Every number
is derived.

| Tile / chart | Source |
|---|---|
| Changes · individuals · training courses · champions | counts |
| Average stakeholder risk · readiness (latest wave) · adoption score | §5.4, §5.6, §5.12 |
| Change risk meter | §5.2 |
| Impacts by level; change saturation by group | §5.5 |
| Readiness per audience (by wave) | §5.6 |
| Stakeholder receptiveness High/Mid/Low | §5.4, a count table, not a chart |
| Communications by purpose and status | §5.8 |
| Training timeline and completion | §5.11 |
| Pending tasks | §4.2 |

New metric keys for milestone gates: `training_completion_ratio`, `comms_coverage_gaps`,
`open_high_resistance`, `champion_coverage_gaps`, `adoption_score`, `uat_pass_ratio`,
`stage_open_tasks`.

**Reporting** (org-level, owner and admin) is the OCMS portfolio overview and `DASHBOARD.md` §4.5:
engagements × stage, change risk band, impacts by level, readiness, receptiveness, overdue tasks.
The sponsor view rules in `DASHBOARD.md` §4.2 apply unchanged: no named stance, no internal
quality flags, no free filtering of survey segments.

### 5.14 Playbook and OCM plan

OCMS "autogenerates" a strategic playbook. Trestle generates an export from the data, with a
narrative block per section (`playbook_section`):

1. Executive summary · 2. Vision and objectives (Essentials) · 3. Stakeholder analysis · 4. Change
impacts · 5. Readiness · 6. Communication plan · 7. Resistance management · 8. Champion network ·
9. Training plan · 10. Roadmap and milestones · 11. Metrics · 12. Contingency · 13. Closure and
evaluation.

Data sections render from the registers as of the export date; narrative is the consultant's. PDF
and DOCX, firm branding, the same pipeline as the readiness report.

### 5.15 Status reports

`status_report`: period, *accomplishments*, *risks and challenges*, *on the horizon* (each a list),
status (`draft | published`). On publish, a **metrics snapshot is frozen** into the row: a status
report is a historical statement, so this is the one place a derived number is stored on purpose.
Export as a one-slide PDF (the 3×5 format).

### 5.16 Transition and exit

The Exit phase of the shipped task template carries the handover checklist (support contacts
communicated, temporary tools closed, files archived, knowledge transferred to the permanent owner,
final report delivered, post-mortem held). Added:

- `engagement.transition_owner`: the group taking permanent ownership (text).
- **`lesson_learned`**: category (`went_well | improve | risk_realised`), description,
  recommendation, phase.
- **Final OCM report** export: adoption analytics, readiness trend across waves, training and
  comms delivery, resistance resolved, lessons learned.

Lessons are org-searchable across engagements, so the firm's next proposal starts from them.

### 5.17 UAT (optional, phase 20)

`uat_case`: ref, title, steps, expected result, requirement (optional link; that is the reason to
have it in Trestle at all), assignee (person), status (`not_run | passed | failed | blocked`),
tester notes, defect link, target date. Pass ratio feeds the go/no-go gate. Defect management stays
in the client's tracker.

### 5.18 Suggestions, Trestle's "autogenerated plans"

OCMS autogenerates plans. Trestle **proposes records the consultant accepts**, as pure functions in
`lib/ocm/suggest.ts`, so every proposal can be explained:

| Trigger | Proposal |
|---|---|
| Impact at `mid`/`high` with `needs_communication` and no communication to that group | Draft an *impacts* communication to that group |
| Impact with `needs_training` and no course covering the group | Draft a training course for that group |
| Impacted group below champion coverage | Champion slots to fill |
| Hotspot rule in §5.7 | A resistance record |
| Stakeholder in priority A with a stance gap and no interaction in 14 days | An interaction task |
| Go-live date within 21, 14 and 7 days | The three countdown communications |

Each appears as a *Suggestions (n)* smart button on the related app. Accepting creates the record
in `draft`; dismissing records who dismissed it and why, in chatter. No AI; `PRD.md` defers that.

---

## 6. How it joins the rest of Trestle

The OCM records sit in the same engagement as the BA spine, which is the point:

- A **process** (09) is the anchor of a **change**; its pain points explain the impact.
- An **impact** traces to **requirements** (10) through `requirement_impact`, as before.
- A **UAT case** tests a **requirement** (20).
- A **resistance** or **stakeholder** finding can cite an **elicitation source** (06).
- Readiness **per org unit** sits beside the **impacts** on the same unit, which makes the
  hotspot rule possible at all.

The quality checks in `DATA-MODEL.md` §9 gain three cross-module checks that only this model can
compute: *a high impact with no communication and no training*, *a must-have requirement on a
process whose org unit has open high resistance*, and *a go-live decision of `go` with failing
gates and no recorded conditions*.

---

## 7. The Odoo-style UI

The structure is Odoo's; the skin is `CLAUDE.md`'s. Where the two conflict, `CLAUDE.md` wins:
Odoo's coloured tags, icons on smart buttons and purple chrome are not taken.

### 7.1 Apps and the navbar

- **Home menu** (engagement level): a plain grid of the engagement's apps, grouped under the five
  phase headings, with the apps for the current stage first. Text tiles with a 1px border, no
  icons.
- **Navbar**, on every page: Trestle mark · apps button · current app name · the app's menus
  (e.g. Impacts: *Changes · Impacts · Change risk · Reporting · Configuration*) · *right:* stage
  indicator · **engagement switcher** (Odoo's company switcher, scoped by assignment) · user menu.
- App list: Overview · Checklist · Audiences · Stakeholders · Impacts · Readiness · Resistance ·
  Communications · Events · Champions · Training · Go-Live · Status reports · Transition, plus the
  BA apps (Sources, Processes, Requirements, Data). `engagement.type` hides apps that do not apply,
  as `POSITIONING.md` §4.1 already requires.

### 7.2 The control panel (list, kanban, calendar, timeline)

Two rows above every collection view:

1. **Breadcrumbs** (`Acme ERP / Impacts / CHG-004`) · primary **New** · gear menu (import CSV,
   export, archive where the model has a status for it).
2. **Search box with facets**: typing offers "Search *Name* for …", "*Org unit* for …"; chosen
   facets render as removable chips. **Filters**, **Group by** and **Favorites** menus.
   **View switcher** (list · kanban · calendar · timeline · graph, only the ones the model defines).
   **Pager** (`1–80 / 214`).

All of it is URL state (`?view=kanban&filter=high,open&groupby=org_unit&q=…&page=2`), so every
view is linkable, reloadable and back-button safe. Favorites are saved views (`saved_view`:
user, model, name, params), phase 13.

### 7.3 List view

Dense rows, left-aligned text, right-aligned numbers, no zebra striping. Checkbox selection with
an **Action** menu (export, delete, change stage, assign). Group-by renders collapsible group
headers with counts and sums of numeric columns (headcount, sessions). An optional-columns toggle
at the right. Click a row to open the form. One-to-many children inside a form (an impact's
mitigations, a course's sessions) are **inline-editable lists**.

### 7.4 Kanban view

Columns are stage values (task status, champion status, communication status). Dragging a card
calls the same server action as the statusbar, so validation and tracking are identical. Cards are
plain: title, two or three fields, assignee initials, due date. Overdue is the word *Overdue*, not
a colour.

### 7.5 Form view

```
┌ Breadcrumbs ─────────────────────────────────────────── 3 / 27  ‹ › ┐
│ [Approve] [Mark sent]          Draft › In review › APPROVED › Sent   │  header: buttons + statusbar
├──────────────────────────────────────────────────────────────────────┤
│               ┌─────────┐┌─────────┐┌─────────┐                      │  smart buttons:
│               │ 4       ││ 212     ││ 2       │                      │  count + label,
│               │ Groups  ││ People  ││ Events  │                      │  click → filtered list
│ COM-012  Awareness: why we are replacing the system                  │  title
│ Purpose   Awareness       Channel   Leader message                   │  two-column field groups
│ Owner     J. Guevarra     Planned   14 Nov 2026                      │
│ ┌ Message ┬ Audiences ┬ Reach ┐                                      │  notebook
│ │ …                                                                  │
├──────────────────────────────────────────────────────────────────────┤
│ Chatter: Log note · Schedule task · history of field changes         │
└──────────────────────────────────────────────────────────────────────┘
```

- **Statusbar**: text steps, current one in the accent colour, clickable where moving is allowed.
  Every status enum in `DATA-MODEL.md` that is a lifecycle renders this way; none renders as a
  coloured pill.
- **Header buttons**: the verbs of that record (Approve, Mark sent, Accept suggestion).
- **Smart buttons**: bordered tiles of number + label, each a filtered list of related records.
- **Edit in place**: the form is editable when the user has `edit` access, with Save and Discard
  appearing on first change, like Odoo 17. Read-only for viewers and archived engagements, enforced
  in RLS and in the action wrapper as today.
- **Record pager** (`3 / 27 ‹ ›`) walks the list the user came from.

### 7.6 Chatter

Every form has chatter at the bottom (the right side on wide screens):

- **Log note**: free text, author, time.
- **Tracking**: field changes written automatically, e.g. "Level: Mid → High", "Status: Draft →
  Approved". Each model declares its tracked fields.
- **Schedule task**: a `task` linked to this record, which is Odoo's *activity*. It shows in chatter
  and in the Checklist app, so there is one task system, not two.

Storage: `record_message` (`DATA-MODEL.md` §16), written by the engagement action wrapper, which
diffs the declared tracked fields inside the same transaction as the write.

### 7.7 Building it: one view kit, a registry per model

About 25 models need list, form and usually kanban views. Building 25 bespoke screens would be the
expensive way, so the kit is generic and each model declares itself, the way an Odoo module
declares views in XML:

```
components/views/        app-shell, home-menu, navbar, control-panel, search-facets,
                         list-view, kanban-view, form-view, statusbar, smart-buttons,
                         notebook, inline-list, chatter, timeline-view, calendar-view
lib/views/<model>.ts     typed config: fields, list columns, filters, group-bys,
                         stages, tracked fields, smart buttons, default view
```

The registry is configuration over shadcn primitives, not a framework. Data still loads through
`lib/db/queries`, writes still go through `engagementAction`, and Server Components stay the
default with client leaves only for drag, inline edit and the search box. `CLAUDE.md`'s "prefer
deleting code over adding an abstraction" is honoured by having exactly one abstraction, justified
by the model count.

Routes extend the current tree:
`/[orgSlug]/engagements/[id]` (home menu) · `/[orgSlug]/engagements/[id]/[app]` (default
collection view) · `/[orgSlug]/engagements/[id]/[app]/[recordId]` (form) · `…/[app]/new`.

---

## 8. What is deliberately not taken

| In the folder | Why not |
|---|---|
| ITIL change-control set (CR log, CCB, change control plan/policy/process, incident report) | IT service management and project change control: the PM tool space, not OCM. Requirements already have a baseline |
| Post-merger integration checklist, McKinsey 7S, culture questionnaire | L4 change with no system attached (`POSITIONING.md` §1) |
| Benefits realisation plan | Post-programme value tracking; revisit after the product has real users |
| Comms KPIs: open rate, click-through, podcast views, page views | Only measurable if Trestle sends or hosts content. Manual entry fields exist; nothing more in v1 |
| Regions | Client and engagement already group the portfolio |
| Per-tool paywall (free vs paid tools) | Gating is `BUSINESS-MODEL.md`'s decision, through entitlements, never by hiding a tool mid-workflow |
| Tutorial videos, "quick demos" | Not product |
| Template wording, survey items, deck content | Copyright; Trestle writes its own (header note) |

---

## 9. Decisions this document makes

Each changes an existing doc. Veto any of them before phase 02b starts.

| # | Decision | Changes |
|---|---|---|
| D1 | All five OCM phases are in scope; requirements still end at baseline | `PRD.md` out-of-scope list; `POSITIONING.md` §9; `DASHBOARD.md` §0 |
| D2 | Odoo-shaped UI via one view kit + per-model registry | `CLAUDE.md` design rules; `ARCHITECTURE.md` layout |
| D3 | `org_unit` moves from phase 08 to 07; new `person` table; `stakeholder` references `person` | `DATA-MODEL.md` §6–7; phases 07, 08 |
| D4 | Impact severity becomes `none/low/mid/high`; `change` is split from `impact` | `DATA-MODEL.md` §8; phase 08; `DASHBOARD.md` §2–3 |
| D5 | One sanctioned polymorphic table, `record_message`, plus `task.res_type/res_id` for display links | `DATA-MODEL.md` §16 |
| D6 | Communications are composed and exported, not sent, in v1 | §5.8 |
| D7 | Status reports freeze a metrics snapshot on publish | §5.15 |
| D8 | Consultant-rated group readiness never enters the readiness index | §5.6 |
| D9 | Threshold choices (risk thirds, champion ratio 1:25, gate defaults) are stated defaults, editable per firm | §5.2, §5.10, §5.12 |

---

## 10. Build order

See `plan/README.md` for the full index. In short:

| Order | Phase | Adds |
|---|---|---|
| next | **02b** View kit and Project Essentials | The Odoo-style shell, retrofitted onto clients and engagements; stage statusbar; chatter |
| | 03 → 05 | Readiness end to end. **Still the first sellable point** |
| | **14** Checklist and RACI | Task templates, the shipped OCM checklist, kanban and timeline |
| | 06 → 08 (expanded) | Sources; audiences and stakeholders; changes, impacts and change risk |
| | **15** Resistance · **16** Communications and events · **17** Champions and training | The Deploy-phase apps |
| | 09 → 10 | Processes, requirements |
| | **13** Overview, metrics, roadmap, reporting | `DASHBOARD.md` plus the OCMS snapshot |
| | **18** Go-live and adoption · **19** Status reports, playbook, transition, library | Normalize and Exit |
| | 11, 12, **20** UAT | As before; UAT optional |

The scope cost is honest: this roughly doubles the build from ten feature phases to eighteen. The
capstone minimum (01–05) does not move. A realistic part-time capstone now ends after 08 + 14,
which already reproduces the OCMS Assess phase end to end.
