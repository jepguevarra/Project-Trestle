# Trestle — The Engagement Dashboard and Change Roadmap

The view that makes the modules one product: a command centre whose every number is derived from the
registers, and a roadmap whose milestones are **gated on computed criteria** rather than on somebody
ticking a box.

Depends on `DATA-MODEL.md` for every source field and `REQUIREMENTS-MODULE.md` for the fit-gap data
this leans on. A working prototype of the layout exists — ask for the link.

---

## 0. What a roadmap means in a product that stops at handover

Trestle ends at approved scope (`BA-LAYER.md` §4.1). So the roadmap here is **not** a project plan —
MS Project and Jira own that, and building one would cross the phase boundary that makes the product
defensible.

It is the **change preparation roadmap**: the sequence of assessment, engagement, documentation,
mitigation and data work that has to complete *before* the build can safely start, ending at the
handover and the client's go-live date.

That distinction is worth stating in the product itself, because a partner will otherwise expect
sprint tracking and be disappointed.

### The roadmap already exists in the data

Almost nothing new is needed. Every workstream below is a query over dated rows the registers already
hold:

| Workstream | Dated source |
|---|---|
| Assessment | `instrument.opens_at`, `instrument.closes_at` |
| Stakeholder engagement | `stakeholder_interaction.due_date`, `next_action` |
| Impact mitigation | `mitigation.due_date`, `status` |
| Process documentation | `sop_document.status` transitions, `sop_version.approved_at` |
| Scope | `requirement.status` transitions, the baseline snapshot date |
| Data readiness | `field_mapping.status`, cleansing owner and date |

**The roadmap has never been drawn, not because the data is missing, but because it lives in six
tables nobody joins.** That is the whole feature.

---

## 1. The one genuinely new idea: computed milestone gates

A milestone carries **entry criteria evaluated against the registers**. The dashboard shows whether a
milestone is *achievable on current data*, not whether someone declared it done.

```
milestone
  id, org_id, engagement_id, name, kind, target_date, sort_order
  kind: discovery_complete | scope_baseline | readiness_gate
      | data_ready | handover | go_live | custom

milestone_gate
  id, org_id, milestone_id, metric_key, comparator, threshold, label
  comparator: gte | lte | eq
```

### The metric keys

Each is a pure function over the registers, in `lib/scoring/` or `lib/quality/` — no stored values, so
a gate can never go stale.

| `metric_key` | Computed from |
|---|---|
| `readiness_index` | Weighted dimension scores (`DATA-MODEL.md` §4) |
| `readiness_dimension_min` | The lowest single dimension score |
| `readiness_consensus_max_sd` | The largest per-dimension standard deviation |
| `perception_gap_max` | The largest leadership-minus-frontline delta |
| `instrument_response_rate` | `respondent.completed_at` over total respondents |
| `gaps_without_disposition` | `requirement` where `verdict='gap'` and `disposition is null` |
| `customisations_unjustified` | `disposition='customisation'` and `justification is null` |
| `requirement_orphans` | Requirements with no trace link |
| `findings_uncovered` | Pain points and impacts with no requirement linked |
| `oca_unchecked_customisations` | Odoo only — `custom_module` with `oca_checked = false` |
| `mandatory_fields_unmapped` | `field_mapping` where `is_mandatory_in_target` and `status='unmapped'` |
| `open_quality_issues` | `field_mapping.quality_issue <> 'none'` and status not `verified` |
| `high_influence_stance_gaps` | Stakeholders with `influence >= 4` and `current_stance <> target_stance` |
| `sop_approved_ratio` | Approved SOPs over in-scope processes |
| `overdue_actions` | Mitigations and interactions past `due_date`, not done |

### Shipped gate sets by milestone kind

Seed these; let a firm edit thresholds.

**Discovery complete** — `instrument_response_rate >= 70%` · `findings_uncovered = 0` ·
`sop_approved_ratio >= 80%`

**Scope baseline signed** — `gaps_without_disposition = 0` · `customisations_unjustified = 0` ·
`requirement_orphans = 0` · (Odoo) `oca_unchecked_customisations = 0`

**Readiness gate** — `readiness_index >= 65` · `readiness_dimension_min >= 50` ·
`high_influence_stance_gaps = 0`

**Data ready** — `mandatory_fields_unmapped = 0` · `open_quality_issues = 0`

### Why this is the differentiator

A project tool asks a human whether a milestone is met. Trestle computes it from the evidence, so the
answer cannot be optimistic. "Scope baseline cannot be signed: 4 gaps have no disposition and 2
customisations have no justification" is a sentence no other tool in `TOOL-LANDSCAPE.md` can produce,
because none of them hold both sides.

It is also the honest version of a traffic light. The colour is derived; the blocking records are
listed and clickable.

---

## 2. The dashboard

One screen answering: *are they ready, what is blocking, and will the dates hold?*

**Audience: the consultant working the engagement.** Section 4 covers the sponsor and portfolio views,
which are different pages, not permission variants of this one.

### Filter row

Engagement, as-of date, and an optional org-unit filter. **One filter row above everything it
scopes** — never a filter inside a chart card. Free filtering is a working-view privilege; see §4.3.

### Section 1 — Milestone gates

A row of milestone cards, each showing: name, target date, criteria met over total, and the blocking
records when not met. Status is a **text label plus a count**; the muted colour is a secondary cue
only, never the sole signal.

### Section 2 — Readiness

| Element | Form | Why |
|---|---|---|
| Readiness index | **Hero figure** | One number the engagement leads with — not a one-bar chart |
| Dimension scores | **Point + whisker per dimension**, point = mean, whisker = ±1 SD | A mean with a band has two edges, so one point plus a whisker. Shows dispersion beside every mean, per `RESEARCH.md` §4.2 |
| Perception gap | **Dumbbell per dimension** — leadership vs frontline, one hue in two shades | Before/after per item is a dumbbell; two shades of one hue keeps it inside the single-accent rule |
| Response rate | **Meter** against the gate threshold | A single ratio against a limit |

### Section 3 — Risk

| Element | Form |
|---|---|
| Impact severity | **Heatmap**, org unit × impact type, cell = **max** severity with the count beside it, sequential single-hue ramp |
| Top impacts | Table, ranked by severity × affected headcount |
| Stakeholder stance | Table of high-influence gaps. Not a chart — fewer than seven rows that get read individually |

### Section 4 — Scope

| Element | Form |
|---|---|
| Requirements by disposition | **Ordinal bar** along the cost ladder (standard → configuration → Studio → OCA → third-party → custom). Ordered scale, so the ordinal ramp is legitimate here and not a value-ramp on nominal categories |
| Fit ratio by module | Table with a share column |
| Coverage | Two stat tiles: findings with no requirement, requirements with no source |
| Carrying cost | Stat tile — customisation count and estimated annual migration effort (`ODOO-VERTICAL.md` §2.3) |

### Section 5 — The roadmap

Workstream rows against a week axis, from engagement start to go-live. Dated items from §0 as bars;
milestones as vertical posts with their gate status. Overdue items marked with a label, not colour
alone.

### Every chart ships

- A hover tooltip — and a **table view toggle**, because a tooltip must never be the only way to read
  a value.
- `tabular-nums` in table columns and axis ticks; proportional figures on the hero and stat tiles.
- Hairline solid gridlines, never dashed. No rounded bar ends, per `CLAUDE.md`.

---

## 3. Palette

Derived from the `CLAUDE.md` design rules — neutral surfaces, one muted accent, semantic colour only
where it carries meaning and never alone. **Both ramps were run through a validator** and pass
lightness monotonicity, adjacent-step separation, light-end contrast against the actual surface, and
single-hue spread in light and dark.

| Role | Light | Dark |
|---|---|---|
| Accent / single series | `#2f5b73` | `#81b2ca` |
| Severity ramp 1→5 | `#93b4c6` `#74a0b5` `#5589a1` `#38728e` `#255269` | `#36525f` `#497689` `#6694a8` `#8bb0c2` `#b2cbd7` |
| Status — met | `#2f7d32` | `#5aa95e` |
| Status — at risk | `#9a6b14` | `#c9972f` |
| Status — blocked | `#a33a34` | `#c96a62` |

The light ramp's lightest step clears 2.19:1 against white; the dark ramp's clears 2.21:1 against the
dark surface. The three status hues each clear 3:1 in both modes but sit close together under
simulated colour-vision deficiency — which is **acceptable only because status never carries meaning
alone here**: every gate shows a word and a number. Do not reuse these three for chart series.

---

## 4. Who the dashboard is for

**The prototype is the consultant's working view.** Everything in §2 above assumes a consultant with
edit access to the engagement. That needs saying explicitly, because there are three audiences and
they cannot share one screen.

| View | Role | The question it answers |
|---|---|---|
| **Working view** | `consultant`, `admin`, `owner` | What do I do next, and what is incomplete? |
| **Sponsor view** | `viewer` — the client's project sponsor | Is my project in trouble, and what do I have to decide? |
| **Portfolio view** | `owner`, `admin` | Across all engagements: which are slipping? |
| *(none)* | `respondent` | Answers a survey and leaves. See §4.4 |

### 4.1 The distinction that matters: your incomplete work vs. the client's problem

Look at the milestone gates in the prototype. They mix two things that must not be mixed:

| Gate criterion | Whose problem |
|---|---|
| 4 gaps with no disposition | **Yours.** The consultant has not finished dispositioning |
| 2 customisations unjustified | **Yours** |
| 3 requirements trace to nothing | **Yours** |
| Finance Manager is opposed | **The client's** |
| 7 mandatory fields unmapped | **The client's** — their data, their cleansing |
| Readiness index 56, below 65 | **The client's** |

Showing the first group to a client sponsor means invoicing someone while displaying a screen that
says you are behind on your own work. That is not a permissions bug, it is a positioning disaster, and
it is the reason the sponsor view cannot be built by hiding fields from the working view.

**The two views are editorially different, not permission-different.** The working view asks "what is
unfinished?" The sponsor view asks "what did we find, and what must you decide?" Same data, different
question, different page.

### 4.2 What the sponsor view shows and withholds

**Shows:** the readiness index and dimension scores with their spread; the perception gap; the impact
heatmap and top impacts; the stakeholder stance summary *in aggregate*; the client's own open actions
with owners and dates; the preparation roadmap and target dates; the gates that depend on client
decisions or client work.

**Withholds:** every internal quality flag; counts of the consultant's unfinished register work; effort
bands, cost roll-ups and anything revealing the firm's commercials; the technique ledger; response
quality flags on individual respondents; named stakeholder stance ratings — a sponsor seeing "Finance
Manager: Opposed" attributed by name is a personnel problem the consultant has just created.

Stance goes to the sponsor as a department-level summary or as a count, never as a named list. The
named list is a working artifact.

### 4.3 Anonymity: the threat model changes with the viewer

The n ≥ 5 suppression rule in `DATA-MODEL.md` §3 applies to every view. But the person employees were
worried about when they answered is usually **on the client's side**, and the sponsor view is the one
they can see. Two additional constraints there:

- **No arbitrary filtering.** The working view may filter freely on department × role × seniority. The
  sponsor view offers only pre-set segments the consultant has approved for release — free filtering is
  how a determined viewer differences their way to an individual.
- **Consider a higher floor.** n ≥ 5 is defensible for the consultant, who is the data controller's
  agent and bound professionally. For the sponsor view, a floor of 8 or 10 costs little and removes the
  argument entirely. Make it a per-instrument setting with a sensible default rather than a constant.

If anonymity was promised and a sponsor can reverse it, the product has done real harm to real people
and every future instrument at that client is worthless. This is the highest-stakes decision in the
dashboard.

### 4.4 The respondent gets no dashboard — but there is a case for a feedback page

Respondents answer through a tokenised link with no account, and that is correct. They do not get a
dashboard.

There is, however, a genuine argument for an optional **aggregate feedback page**: a short, read-only
summary of what the organisation said, published to respondents after an instrument closes.
Armenakis, Harris & Mossholder's account of readiness (`RESEARCH.md` §2.1) makes establishing
*discrepancy* and *appropriateness* part of the intervention — showing people the data is itself one
of the mechanisms that creates readiness, not just a courtesy. It also raises response rates on the
next wave, which matters if pulse re-assessment ever ships.

Two conditions: publishing is **the client's decision, not the consultant's**, and the page carries
only organisation-level aggregates with no segment breakdowns at all. v2 at the earliest.

### 4.5 The portfolio view is a different product surface

Not one engagement — all of them. Engagements by gate status, overdue actions by engagement,
instruments closing this week, engagements with no activity in 14 days. It belongs to the firm's
owner and admin, and it is the screen that makes a multi-engagement subscription feel worth paying
for (`BUSINESS-MODEL.md` §6, on churn between engagements).

Build it after the working view, and only once a firm plausibly runs more than two engagements at a
time.

---

## 5. Build order

This is a **phase 13**, after requirements land, because most of its numbers come from them. Two
exceptions worth pulling earlier:

- The **readiness section** can ship inside phase 05, since all its inputs exist there. It is most of
  the readiness dashboard that phase already requires.
- The **milestone table** is cheap and can land in phase 02 alongside `engagement`, so dates exist to
  draw against before anything is drawn.

Do not build the roadmap before phase 09. With only instruments and stakeholders in the data, it draws
two rows and looks broken — which is a worse first impression than not having it.
