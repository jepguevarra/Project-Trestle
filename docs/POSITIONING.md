# Trestle — Positioning and Scope

Trestle is not ERP-specific. It supports any technology-driven change. This document settles **how
far** that goes, because "any digital transformation" has a boundary and the product dies without
one.

`CLAUDE.md` and `PRD.md` have been reconciled with the conclusion below. The ERP material in
`RESEARCH.md` and `TOOL-LANDSCAPE.md` is left as it stands: it is evidence, and ERP is the
best-evidenced instance of technology-driven organisational change — see §5.

---

## 1. Four possible widths

| | Covers | Fit-gap applies? | Who you compete with | Verdict |
|---|---|---|---|---|
| **L1** | ERP only | Yes | Nobody directly | Too narrow, and not what your capstone title claims |
| **L2** | Packaged software: ERP, CRM, HRIS, WMS, POS, accounting, e-commerce, most SaaS rollouts | Yes, fully | Nobody directly | **The default** |
| **L3** | L2 + custom builds, cloud migration, automation/RPA, AI adoption, digitalisation of paper processes | Partially — optional per engagement | Nobody directly | **The ceiling** |
| **L4** | Any organisational change: reorganisations, M&A, policy change, culture programmes | No | Prosci, The Change Compass, Changefirst, Culture Amp | **Never** |

**Recommendation: L3 as the ceiling, L2 as the default, never L4.**

## 2. The line, and why it is the right one

Trestle's modules all assume three things are true:

1. **A system or technology is being introduced** — so there is something to be ready *for*.
2. **There are existing processes it will change** — so there is something to document.
3. **There are requirements for what it must do** — so there is something to trace.

Reorganisations, M&A integrations and policy changes have none of these. Reach for them and you lose
the process module, the requirements module and the fit-gap field in one move — and what is left is a
survey tool with a stakeholder grid, competing directly with Prosci and The Change Compass on their
ground, with their brand recognition and their budgets. `RESEARCH.md` §3.1 already explains why that is
a losing position.

**The one-sentence scope statement**, for the PRD and for the defense:

> Trestle supports organisations preparing for a **technology-driven change** — one where a system is
> being introduced or replaced, existing ways of working will change, and someone has to specify what
> the new system must do.

That sentence is broad enough to be true to "digital transformation preparedness" and narrow enough
that a panel can tell what is out.

## 3. Domain-general product, ERP-first go-to-market

The cleanest resolution, and it costs almost nothing:

- **Build the product domain-general.** The data model, the readiness engine, the impact register and
  the process module carry no ERP assumptions. They already do not — the ERP framing is in the copy,
  not the schema.
- **Sell to ERP partners first.** They are your network, your dogfood case and the vertical where you
  can speak with authority. A wedge is a go-to-market decision, not an architectural one.

You get the broader claim for the capstone, the broader market for later, and the focus that makes an
early product sellable. The only thing this requires is that no ERP-specific assumption gets baked
into a table — and the one place that risk is real is §4.3.

## 4. What actually changes in the build

### 4.1 `engagement_type` — add it now, not later

One column on `engagement`, and it drives four things:

```
engagement.type
  packaged_software     ERP, CRM, HRIS, WMS, POS, accounting, e-commerce
  custom_build          bespoke software developed for the client
  platform_migration    cloud migration, re-platforming, consolidation
  automation            RPA, workflow automation, AI-assisted process change
  digitalisation        paper or spreadsheet processes moving to any system
```

Drives: which modules appear, which readiness instrument template is offered, which requirement
pattern library is in scope, and whether fit-gap applies at all.

Cheap now. Expensive later, because it changes which fields are required on records that already exist.

### 4.2 Readiness instrument templates keyed to type

Your instrument engine already supports templates, so this is content rather than code. The six
dimensions hold across all types — they come from general organisational change theory, not from ERP —
but the **items** differ. "Do you understand why we are replacing the accounting system?" and "Do you
understand why we are introducing AI-assisted document processing?" measure the same construct with
different words.

Ship one template per engagement type. This is also a clean, visible research contribution: a set of
type-specific instruments derived from a common dimensional framework.

### 4.3 Fit-gap becomes conditional

`REQUIREMENTS-MODULE.md` §3.1 makes fit-gap disposition the centrepiece differentiator. It survives
broadening, but it has to become conditional:

| Engagement type | Fit-gap |
|---|---|
| Packaged software | Full — the standard product either does it or it does not |
| Platform migration | Partial — usually configuration vs. rebuild |
| Automation | Partial — automate, redesign, or leave manual |
| Custom build | **None** — nothing is standard yet; requirements only |
| Digitalisation | Depends on what is being adopted |

Note what this means: fit-gap is not an *ERP* concept, it is a **packaged-software** concept. That
distinction is what lets you broaden without losing your strongest field. Most digital transformation
spending is on packaged software, so it still applies to the majority of engagements.

### 4.4 Pattern library scoped by type

A firm's reusable requirement library is scoped to `engagement_type` plus product. It compounds more
slowly across a wider domain — a firm doing ERP *and* CRM builds two libraries instead of one, each
more slowly. Accept it; it is the honest cost of breadth.

### 4.5 Vocabulary

In the product copy: "the new system", "the implementation", "the transformation". Not "the ERP". The
engagement knows what it is; the interface does not need to assume.

## 5. The literature base gets stronger, not weaker

Broadening gains you a second, currently-active research stream. Two papers to get.

**Michelotto, F., & Joia, L. A. (2024). Organizational digital transformation readiness: An
exploratory investigation. *Journal of Theoretical and Applied Electronic Commerce Research*, 19(4),
3283–3304.** A PRISMA systematic review (264 e-readiness papers, 72 on digital transformation, 8 on DT
readiness) producing an ODTR framework with five dimensions:

1. Technological Resources
2. Business Processes
3. Management Capability
4. Human Capability
5. Corporate Culture

**Silva, R. P., São Mamede, H., & Santos, V. (2025). A new proposed model to assess the digital
organizational readiness to maximize the results of the digital transformation in SMEs. *Journal of
Innovation & Knowledge*, 10(1), 100644.** DORAM — explicitly SME-targeted, which matches your
population. Five dimensions (Business Model, Market, Strategy, Organization, Processes) across 20
subcategories, a four-level readiness scale (Immature / Unstructured / Structured / Advanced), and
surveys of **both employees and senior management**.

The ERP CSF literature in `RESEARCH.md` §1.2 stays exactly as it is. Reframe it in one sentence: ERP is
the **best-evidenced instance** of technology-driven organisational change, which is why the evidence
base leans on it. That is true, and it converts an apparent narrowness into a deliberate choice.

### 5.1 A correction to `RESEARCH.md` §4.2 — read this one

`RESEARCH.md` §4.2 claims the Perception Gap Index — the leadership-versus-frontline delta — as a
differentiator "genuinely absent from the commercial tools."

**DORAM computes exactly this.** It surveys employees and senior management separately and reports a
perception gap as one of its named metrics. The claim as written would not survive a panel member who
knows this literature.

The corrected claim is narrower and better:

> Measuring the divergence between leadership and frontline perception is established in the research
> literature (Silva et al., 2025) and grounded in Weiner's (2009) account of readiness as a *shared*
> state. It is absent from the commercial tooling reviewed in §3.1. Trestle's contribution is
> operationalising it inside a working consultant workflow, linked to the stakeholders and processes it
> implicates — not the metric itself.

Academic precedent **helps** you. "This is a known-good measure that no product implements" is a much
stronger position than "I invented a metric," which invites the question of whether it is valid at all.
The same applies to DORAM's four-level colour scale: it is a precedent for reporting a readiness
*band* rather than a bare percentage, which `RESEARCH.md` §2.4 floated without a source.

I have amended §4.2 in `RESEARCH.md` accordingly.

### 5.2 Extend the crosswalk

Add a column to the `RESEARCH.md` §2.5 crosswalk mapping your six dimensions to ODTR's five. Rough fit:

| Trestle dimension | ODTR (Michelotto & Joia, 2024) |
|---|---|
| Leadership & Sponsorship | Management Capability |
| Awareness & Understanding | Corporate Culture |
| Capability & Skills | Human Capability |
| Culture & History of Change | Corporate Culture |
| Resources & Capacity | Technological Resources |
| Communication | Corporate Culture |
| *(Process readiness — currently implicit)* | **Business Processes** |

Two observations worth putting in the paper. ODTR has a **Business Processes** dimension that your six
do not — arguably a gap, since process readiness is something you measure everywhere else in the
product but not in the instrument. And three of your dimensions collapse into ODTR's Corporate Culture,
which is a defensible difference in granularity rather than a contradiction: say so rather than
forcing the mapping.

## 6. The costs — state them, do not hide them

Broadening is right, and it is not free.

| Gain | Cost |
|---|---|
| A market several times larger | "Digital transformation readiness" is a far more crowded phrase than "ERP readiness" — harder to be found, harder to be distinctive |
| A second live literature stream, and a truer fit to the capstone title | The ERP-vendor gap argument in `TOOL-LANDSCAPE.md` §5 is evidence from one vertical, not the whole case |
| Not hostage to one software category | Fit-gap, the strongest differentiator, now applies to a subset of engagements |
| The pattern library serves more kinds of work | It compounds more slowly across a wider domain |
| Broader capstone claim | A vaguer scope statement unless §2's sentence is used verbatim |

The deciding factor is §2: the three assumptions are a real boundary, they are defensible in one
sentence, and they keep every module intact. Hold that line and the gains outweigh the costs. Drift to
L4 and they do not.

## 7. Doc debt

What should change, and what should be left alone.

| Doc | Action |
|---|---|
| `CLAUDE.md` — "What Trestle is" | **Changed** — now reads as technology-driven change, ERP-first go-to-market |
| `RESEARCH.md` §4.2 | **Changed** — perception gap claim corrected per §5.1 |
| `PRD.md` — the problem, who buys it | **Your call.** The buyer paragraph and the opening still say ERP partner. Broadening it is a rewrite of your own product statement, so it is not mine to make |
| `RESEARCH.md` §1–2 (ERP CSF literature) | **Keep.** Evidence is evidence. Add the one-line reframe from §5 |
| `TOOL-LANDSCAPE.md` §5 (ERP vendors) | **Keep.** Still the sharpest single piece of competitive evidence you have — just label it as one vertical |
| `REQUIREMENTS-MODULE.md` §3.1 | Make fit-gap conditional per §4.3 |
| `BA-LAYER.md` | No change needed — BABOK is domain-general already |

## 8. The panel question this creates

> **"If it works for any digital transformation, what stops it being a generic change survey tool?"**

Three things, and they are all in the data model. It requires a system being introduced, so it holds
requirements and a fit-gap position that a survey tool has no concept of. It requires existing
processes, so it holds how the work is done today and what will break. And it links the two, so a
readiness finding connects to the process and the requirement it implicates. A generic change tool
measures sentiment about a change. Trestle measures readiness *for a specified system*, against the
processes that system will replace, and traces both into what the system must do.

Then concede the boundary out loud, because it makes the rest credible: for a reorganisation with no
system attached, Prosci's toolkit is the better fit, and Trestle does not compete for it.
