# Trestle — Research Foundation

Companion to `PRD.md`. The PRD says *what* to build. This says *why it is defensible* — to a
capstone panel, to a buyer, and to yourself in month four when the scope starts drifting.

Three jobs:

1. Give the capstone a literature base, so the readiness dimensions are derived rather than invented.
2. Locate the product in the existing tool landscape and name the gap precisely.
3. Pre-empt the questions a panel will ask, and the ones a buyer will ask, which are not the same.

**Citation discipline:** every source below is real, but pull the actual PDF before you put it in a
reference list. Page numbers and volume/issue are from memory and search results, not from the
papers in hand. Anything marked ⚠ needs you to read the original before citing it.

---

## 1. The problem, with evidence

### 1.1 The failure mode is human, and it is located before the build

The received framing — "ERP projects fail" — is too blunt to design against. The useful framing
comes from **Markus & Tanis (2000)**, who split the enterprise system experience into four phases:

| Phase | What happens | Who owns it today |
|---|---|---|
| **Chartering** | Decision, business case, scoping, vendor selection | Client execs + advisers |
| Project | Configuration, data migration, testing, training | Implementation partner |
| Shakedown | Go-live and the period until operations normalise | Everyone, unhappily |
| Onward and upward | Benefits realisation, continuous improvement | Nobody, usually |

Trestle lives in **chartering and the first weeks of project** — the phase where the decisions that
determine shakedown pain are made, and the phase with the *least* tooling. That is the whole thesis
in one sentence, and it is the sentence to open the defense with.

Cite: Markus, M. L., & Tanis, C. (2000). *The enterprise system experience — from adoption to
success.* In R. W. Zmud (Ed.), Framing the Domains of IT Management. Pinnaflex. ⚠ verify page range.

### 1.2 What the CSF literature says gets skipped

Twenty-five years of ERP critical success factor studies converge on a stable top tier. Across
**Somers & Nelson (2001)**, **Umble, Haft & Umble (2003)**, **Finney & Corbett (2007)** and
**Ngai, Law & Wat (2008)**, the factors that recur are:

1. Top management support / sponsorship
2. Clear goals and objectives
3. Business process reengineering and readiness to change processes
4. Change management programme and culture
5. Project team competence
6. User training and education
7. Communication
8. Data accuracy and migration readiness

Note what that list is made of. Seven of eight are organisational, not technical. And every one of
them is *assessable before a line of configuration is written*. That is the mapping that turns
Trestle's readiness dimensions from a product opinion into a literature-derived instrument — see
§2.5 for the actual crosswalk.

Somers & Nelson also make the phase-specific point directly: the CSFs that matter are not constant
across the implementation lifecycle. Sponsorship and readiness dominate early; training and support
dominate late. Another argument for a phase-specific tool.

### 1.3 The numbers — which ones survive scrutiny

You need a figure for "implementations fail because of inadequate preparation." Most of the figures
in circulation will not survive a panel. These will.

**The one to lead with.** Panorama Consulting Group's **2021 ERP Report** (n = 112, data collected
January–November 2020) asked organisations that had completed an implementation how difficult each
aspect was:

| Aspect of the implementation | Found it difficult or very difficult |
|---|---|
| **Organisational change** | **83.4%** |
| **Process change** | **66.7%** |
| **Technical work** | **8.3%** |

That is a **10:1 ratio between the human and the technical difficulty of an ERP project**, from a
survey with a stated sample and a stated period. It is the single best number in this document.
It does not claim a failure rate — it claims where the difficulty sits, which is the claim you
actually need and the one you can defend.

**The one that quantifies the mismatch.** Prosci's **2025 *Unlocking ERP Implementations* study**:

- **92% of ERP budgets** are allocated to technology — while the people side accounts for **36% of
  what leaders say they would do differently.**
- Human factors are reported to matter **6× more than technical factors** in improving ERP benefits.
- Roughly **1 in 5** implementations underperform expectations (range 11–31% depending on conditions).

The 92/36 split is the investment-allocation argument for Trestle in one line: nearly all the money
goes to the half of the problem that is easiest.

**The one that shows what is missing.** Panorama's **2026 ERP Report** (n = 170, January 2025 –
January 2026) — the current edition:

- **23%** of projects ran over schedule, and the leading cause among those was **organisational
  issues**, defined as *governance, resistance to change, and process redesign*.
- **26%** ran over budget (leading cause: unexpected additional technology).
- **Fewer than 25%** of organisations reported an intense focus on organisational change management.
- The report attributes part of this to organisations underestimating the **cumulative impact of
  concurrent digital initiatives** — which is change saturation, and is feature idea #8 in §5.

### 1.3.1 "What is lacking" — the preparation gap, itemised

The 2021 Panorama report is the most granular public source on what specifically is absent. Among
organisations that had completed an ERP implementation:

| What was lacking | Evidence |
|---|---|
| **Change management effort at all** | Only **23.1%** had an intense OCM focus; **53.8%** moderate; **23.1%** very little or none |
| **Outside change expertise** | Only **33%** sought change management consulting guidance |
| **Sponsor preparation** | A leader coaching plan was the **least common** activity performed — **15.4%** |
| **Early communication** | **56%** communicated with employees before selection, and only **71% of those** had a strategic communication plan (≈40% overall) |
| **Training design** | Customised training performed by **53.8%** |
| **Process readiness** | **66.7%** found process change difficult or very difficult |
| **Data readiness** | Data reconciliation cited by **37.5%** of over-budget projects; data integrity by **20%** of late ones |

And the finding that is effectively Trestle's business case, from the same report:

> Of organisations that received change management consulting guidance, only **33%** found
> organisational change difficult or very difficult — against **67%** of the full sample.

Guidance roughly **halved** the reported difficulty. Practitioner research with a small sample, so
frame it as association rather than causation — but it is the closest thing to direct evidence that
the intervention Trestle tools actually moves the outcome.

### 1.3.2 Numbers to avoid, and why

A panel member who knows the field will recognise these. Using them costs you more than having no
number at all.

| Claim | Why not |
|---|---|
| **"70% of ERP implementations fail"** | No traceable primary source. Repeated between vendor blogs, each citing another. |
| **"70% of change programmes fail"** | Usually attributed to McKinsey. The attribution has been repeatedly challenged in the change-management literature as lacking an empirical basis. |
| **"68% ERP failure rate, per Panorama's 2026 report"** | Circulating on vendor sites. Panorama's own reports do not state this — the 2021 edition recorded **0%** self-reported failure and 91.7% self-reported success. Someone invented it and attached a real name to it. |
| **Vendor "root cause" breakdowns** (e.g. "42% inadequate change management, 38% poor data migration") | Frequently attributed only to the vendor's own unpublished "analysis", with no sample size or method. If you cannot find the n, do not cite it. |

Note the self-reported-success problem in that last row: Panorama's 2021 respondents reported 0%
failure while 83.4% said organisational change was difficult. **Organisations do not describe their
own projects as failures.** This is worth a paragraph of its own in the paper — it explains why
failure-rate statistics are unreliable in principle, and it justifies measuring *difficulty and
readiness* instead of *failure*, which is exactly what Trestle does.

### 1.3.3 How to phrase it in Chapter 1

> The rate at which ERP implementations fail is contested and poorly evidenced; the *locus* of the
> difficulty is not. Organisations completing ERP implementations report organisational change as
> difficult or very difficult roughly ten times as often as they report the technical work as
> difficult (83.4% versus 8.3%; Panorama Consulting Group, 2021), while 92% of implementation budgets
> are directed at the technology (Prosci, 2025). The preparation work that addresses the harder half
> is performed with intense focus by fewer than one organisation in four.

Three sentences, three sourced figures, no contested failure rate, and it sets up the entire study.

### 1.4 Local relevance (worth one section, not more)

Philippine MSMEs are a documented low-digital-maturity population, and the DTI's MSME Development
Plan 2023–2028 makes digitalisation an explicit national priority. Several local studies measure
MSME digital transformation readiness directly. Use this for the "significance of the study"
section — it grounds the work in a real local population rather than a generic enterprise abstraction.
Keep it to a page; the panel will care, the buyer will not.

---

## 2. Theory base — Chapter 2 material

### 2.1 Readiness for change: the core construct

This is the spine of the capstone. Three papers, in order of importance to you.

**Armenakis, Harris & Mossholder (1993), "Creating readiness for organizational change,"
*Human Relations*, 46(6), 681–703.**

The foundational paper. Readiness is a *cognitive precursor* to resistance or support — it exists in
people's beliefs before the change happens, and it can be deliberately created. They specify five
beliefs that a change message must establish:

| Belief | The question in the employee's head |
|---|---|
| **Discrepancy** | Is change actually needed? Is there a real gap? |
| **Appropriateness** | Is *this* change the right answer to that gap? |
| **Efficacy** | Can we actually pull it off? |
| **Principal support** | Are the leaders genuinely behind it, or is this theatre? |
| **Personal valence** | What happens to *me*? |

Learn these five. They are the most quotable thing in your entire literature review, they map
one-to-one onto survey items, and they give you a ready answer to "where did your questions come
from?"

**Holt, Armenakis, Feild & Harris (2007), "Readiness for Organizational Change: The Systematic
Development of a Scale," *Journal of Applied Behavioral Science*, 43(2), 232–255.**

The instrument version of the above. Four factors, individual level:

| Factor | Reported α |
|---|---|
| Appropriateness | .94 |
| Management support | .87 |
| Change-specific efficacy | .82 |
| Personal valence | .66 |

Two things to notice. First, this is a *validated* scale you can adapt rather than invent — that
alone is worth a paragraph in your methodology. Second, personal valence came in at .66, below the
conventional .70 threshold, and the authors said so. Reporting your own weak subscale honestly is
what separates a research artifact from a product demo. Build the reliability reporting *into
Trestle* (§4.3) and this becomes a feature, not a confession.

**Weiner (2009), "A theory of organizational readiness for change," *Implementation Science*, 4:67.**

The level shift that makes Trestle a B2B product rather than an HR survey. Weiner argues readiness
is an **organisation-level, shared** state with two components:

- **Change commitment** — shared *resolve* to implement
- **Change efficacy** — shared *belief in collective capability*

Readiness = commitment × efficacy, and it is **shared**. The operational consequence is large and
most tools miss it: if half the finance team scores 5 and half scores 1, the mean of 3 is a lie.
**Low agreement is itself a finding** — it means there is no shared resolve, which under Weiner's
theory means there is no readiness, regardless of the average. This is the theoretical licence for
the variance/divergence analytics in §4.2, and it is a genuinely defensible novelty claim.

**Shea, Jacobs, Esserman, Bruce & Weiner (2014), "Organizational readiness for implementing change:
a psychometric assessment of a new measure," *Implementation Science*, 9:7.**

ORIC — the operationalisation of Weiner. **12 items, 5-point Likert, two subscales**: change
commitment (5 items) and change efficacy (7 items). Open access, widely reused, culturally adapted
and revalidated many times over. Ship a Trestle template instrument that is an ORIC adaptation and
say so in the UI. "Adapted from a validated scale (Shea et al., 2014)" is a sentence a consultant can
say in front of a CFO, and it costs you nothing to earn.

### 2.2 Technology adoption and acceptance

You need these for two reasons: the readiness instrument borrows constructs from them, and your own
evaluation of Trestle (§6.3) may use one.

| Theory | Source | Core constructs | Use in Trestle |
|---|---|---|---|
| **TAM** | Davis (1989), *MIS Quarterly* 13(3) | Perceived usefulness, perceived ease of use → intention | Evaluating Trestle itself with consultant users |
| **UTAUT** | Venkatesh, Morris, Davis & Davis (2003), *MIS Quarterly* 27(3) | Performance expectancy, effort expectancy, social influence, facilitating conditions | Better than TAM for an org-mandated ERP; readiness items can borrow these |
| **TOE** | Tornatzky & Fleischer (1990) | Technological, Organisational, Environmental context | Firm-level readiness framing; maps onto your dimensions |
| **DOI** | Rogers, *Diffusion of Innovations* | Relative advantage, compatibility, complexity, trialability, observability | Why some departments adopt and some don't |

TOE is the most useful of the four for Trestle, because it is *firm-level* and your unit of analysis
is a company, not a user. Several recent papers build digital maturity models directly on TOE, which
is a good precedent if you want to claim a maturity model rather than just a score.

### 2.3 Practice frameworks (what consultants actually use)

Academic panels want theory; buyers want a name they recognise. Cover both.

| Framework | Source | What Trestle borrows |
|---|---|---|
| **Lewin** | Lewin (1947) | Unfreeze–change–refreeze. Trestle is unfreeze tooling. One line, then move on. |
| **Kotter's 8 steps** | Kotter (1996), *Leading Change* | Steps 1–4 (urgency, coalition, vision, communication) are all pre-build. Map your modules to them. |
| **ADKAR** | Hiatt (2006) / Prosci | Awareness, Desire, Knowledge, Ability, Reinforcement. A per-stakeholder ADKAR state is a cheap, high-credibility addition to the Stakeholder module. |
| **Bridges' Transition Model** | Bridges (1991) | Change vs. transition — the psychological side. Good for the discussion chapter. |

ADKAR is the one to actually implement. Every ERP consultant's client has heard of it, it is a
five-state enum per stakeholder, and it slots directly into your existing stance field.

### 2.4 Maturity models and process documentation

- **CMMI** and **BPMM** — the five-level maturity idea. If you want to report a readiness *level*
  rather than a percentage, this is the precedent to cite.
- **BABOK v3** (IIBA) — the business analysis body of knowledge. Your Process Documentation module
  is essentially BABOK's elicitation and requirements-analysis knowledge areas made into software.
  Citing BABOK positions Trestle as BA tooling, which is exactly the framing your capstone title uses.
- **BPMN 2.0** (OMG) — the process notation standard. You are *not* building a BPMN modeller (good;
  see §5), but naming the standard and explaining why structured step capture beats free-form
  diagramming for this use case is a strong scoping argument.
- **SIPOC** and **RACI** — lightweight artifacts a consultant already produces. RACI in particular can
  be *derived* from your step capture (actor role + action), which is a nice "the tool does the work"
  demo moment.

### 2.5 The crosswalk — the single most important table in your paper

This is what turns your six dimensions from product intuition into derived constructs. Build it out,
put it in Chapter 2, and put it on a slide.

| Trestle dimension | Armenakis et al. (1993) | Holt et al. (2007) | Weiner (2009) / ORIC | ERP CSF literature |
|---|---|---|---|---|
| Leadership & Sponsorship | Principal support | Management support | Change commitment | Top management support |
| Awareness & Understanding | Discrepancy, Appropriateness | Appropriateness | Change commitment | Clear goals & objectives |
| Capability & Skills | Efficacy | Change efficacy | Change efficacy | Project team competence; training |
| Culture & History of Change | (Contextual antecedent) | — | Change efficacy (contextual) | Change management programme & culture |
| Resources & Capacity | Efficacy | Change efficacy | Change efficacy | Resource allocation; BPR readiness |
| Communication | Principal support; Discrepancy | Management support | Change commitment | Communication |

Two honest gaps to disclose rather than paper over:

1. **Personal valence has no home in your six dimensions.** It is one of the five original beliefs
   and the one that predicts individual resistance most directly ("what happens to my job?"). Either
   add it as a seventh dimension or state explicitly that you scoped it out and why. A panel will
   spot the omission if they read Holt.
2. **Culture & History of Change is a contextual antecedent, not a belief.** It sits at a different
   conceptual level from the other five. Defensible — history of failed change genuinely predicts
   readiness — but say so rather than letting it sit silently alongside the others.

Handling both explicitly is worth more marks than a clean table would have been.

---

## 3. The landscape, and the gap

### 3.1 What exists

| Category | Examples | What they do | Why they don't cover you |
|---|---|---|---|
| **Digital adoption platforms** | WalkMe, Whatfix, Pendo | In-app guidance, walkthroughs, usage analytics | Require the system to *exist*. Post-go-live by definition. Opposite end of the timeline. |
| **Enterprise OCM platforms** | The Change Compass, ChangeScout (Deloitte), Changefirst | Change portfolio heat maps, saturation, impact across many initiatives | Built for large enterprises managing a portfolio *in-house*. Priced and scoped for the client, not the partner. Not engagement-shaped. |
| **Methodology + templates** | Prosci, OCM Solution, Changefirst | Certified methodology, Excel/Word toolkits, assessments | This *is* the Word-and-Excel pile your PRD describes. Sold as content and training, not software. No multi-client tenancy, no reuse across engagements, no aggregate. |
| **Process mining / intelligence** | Celonis, SAP Signavio, KYP.ai | Discover as-is processes from event logs | Needs an existing digital system emitting logs. Your clients are on spreadsheets and paper. Enterprise pricing. Solves the technical half of discovery; ignores the human half entirely. |
| **BA / requirements tools** | Jama, Modern Requirements, Blueworks Live, Lucid | Requirements traceability, process modelling | Assume the project has started and the requirements are the artifact. No readiness, no stakeholders, no people risk. |
| **Survey platforms** | Qualtrics, SurveyMonkey, Culture Amp | Distribute questionnaires, analyse results | Generic. No instrument grounded in change theory, no engagement structure, no link from a score to a stakeholder to a process. Culture Amp is engagement, not change readiness. |
| **ERP readiness "assessments"** | NetSuite, vendor and partner sites | 10–20 question checklists, PDF or web quiz | Marketing lead-gen. Unvalidated, ungrounded, single-respondent, no scoring model, no deliverable. The thing you are replacing. |

### 3.2 The gap, stated precisely

Nothing in that table is **(a) pre-implementation, (b) sold to the implementation partner as a
multi-client workspace, (c) theory-grounded in its instrument, and (d) connected across readiness,
stakeholders, impacts and processes in one data model.**

Each of the four alone is unremarkable. The intersection is empty, and that is the claim to make.
Say it as a sentence, not a Venn diagram:

> Existing tools either measure change in organisations that have already started changing, or hand
> consultants a folder of templates. Nothing gives the implementation partner an instrumented,
> reusable, evidence-linked workspace for the assessment work that happens before the build.

### 3.3 The competitive risks — put these in Chapter 5, not under the rug

1. **Prosci or OCM Solution ships proper software.** They have the methodology, the brand and the
   customer list. Your advantage is that they sell to enterprises and certifications, not to 15-person
   Odoo partners, and a company built on selling training has poor incentives to productise it away.
2. **A survey platform adds a change-readiness template.** Cheap for them. But the template is the
   least valuable part of Trestle; the engagement data model and the cross-module joins are the moat.
3. **An ERP vendor bundles it.** Odoo or NetSuite could ship a readiness questionnaire. It would be
   single-ERP and client-facing, not partner-facing and ERP-neutral. Your neutrality is a feature.
4. **AI makes instrument authoring trivial.** Likely. Which is another argument that the defensible
   part is the *structured, linked evidence*, not the question text.

---

## 4. Where the novelty actually is

If a panel asks "what is new here?" — and they will — do not answer "a system for change readiness
assessment." Answer with one of these three. They are ordered by how well they survive scrutiny.

### 4.1 The evidence chain (the strongest claim)

Your PRD already describes this under "the connective tissue," but it is buried as a design note when
it is the contribution. Give it a name and put it on a slide.

```
readiness item (low score, Finance, Capability dimension)
      ↓
stakeholder (Finance Manager, high influence, Opposed stance)
      ↓
process (Month-end close, 14 steps, 3 pain points)
      ↓
impact (Process + People, severity 4, 12 people affected)
      ↓
mitigation (Owner, due date, status)
      ↓
report paragraph that a CFO can follow end to end
```

The claim: **every recommendation in the final report is traceable to a measured datum.** No other
tool in §3.1 does this, because each of them owns only one link in the chain. Consultants today
assemble this chain by hand in Word, and the chain breaks the moment anything changes.

This is also the answer to "isn't this just Google Forms?" Google Forms owns one node. Trestle owns
the edges.

### 4.2 Divergence as a first-class signal (the most interesting claim)

Straight from Weiner: readiness is a **shared** state, so disagreement is not noise to average away —
it is the finding.

Three analytics that fall out of this, all cheap to build as pure functions in `lib/scoring/`:

- **Perception Gap Index** — the delta between leadership and frontline scores on the same dimension.
  A large positive gap (leaders confident, staff not) is invisible to any tool that reports a single
  mean. **Note the precedent:** DORAM (Silva, Sao Mamede & Santos, 2025) surveys employees and senior
  management separately and reports a perception gap as a named metric, so this is an established
  measure rather than a new one — claim the *operationalisation inside a consultant workflow*, not the
  metric. See `POSITIONING.md` Section 5.1.
- **Consensus score** — per-dimension dispersion (standard deviation, or an agreement index such as
  rWG or the ADM average deviation). Report it *next to* every mean. A 3.8 with high agreement and a
  3.8 with a bimodal split are different organisations.
- **Segment divergence flag** — automatically surface the department × dimension cells that deviate
  most from the organisation mean, subject to your n≥5 suppression rule.

Theoretically grounded, computationally trivial, visually striking in a report, and absent from the
commercial tools reviewed in Section 3.1 — though the perception gap itself has academic precedent
(see the note above). If you only add one thing from this document, add this.

### 4.3 Psychometrics inside the product (the most academic claim)

Compute and display **Cronbach's α per dimension** on the responses actually collected, plus item-total
correlations and a flag for items that reduce α. Pure function, ~40 lines, unit-testable — and it fits
your architecture's "scoring is auditable" principle exactly.

Why it is worth it:

- No commercial change-readiness tool does this. It is a real, checkable differentiator.
- It gives the consultant an answer to "is this questionnaire any good?"
- It turns instrument quality into a product surface, which sets up the benchmark feature later.
- For the capstone it is nearly free marks: your artifact evaluates its own measurement reliability.

Add a straight-lining / response-quality check while you are in there (respondent gave the same answer
to every item, or finished in under 90 seconds). Flag, don't auto-exclude — the consultant decides.

### 4.4 Benchmarking (the long-term moat, not a v1 feature)

Once N engagements exist, "your Sponsorship score is in the 31st percentile of manufacturing clients"
is worth more than the raw score, and only a multi-tenant product can compute it. Build the schema so
it is possible (anonymised, opt-in, industry + size + ERP tagged), and *do not build the feature in
v1*. For the defense, demonstrate it against seeded synthetic data and label the data as synthetic —
that is honest and it still shows the architecture supports it.

---

## 5. Feature ideas, ranked

Measured against your existing scope. **Respect the PRD's out-of-scope list** — where an idea conflicts
with it, that is flagged.

| # | Idea | What it is | Why it's defensible | Effort | Verdict |
|---|---|---|---|---|---|
| 1 | **Consensus + Perception Gap** | SD and leadership-vs-frontline delta on every dimension | Weiner: readiness is shared. Absent from competitors. | S | **v1 — do it** |
| 2 | **Reliability panel** | Cronbach's α, item-total correlation, weak-item flags | Academic credibility as a product surface | S | **v1 — do it** |
| 3 | **Response-quality flags** | Straight-lining, speeding, low completion | Protects every downstream number | S | **v1 — do it** |
| 4 | **ADKAR state per stakeholder** | Five-state enum + gap vs. target, alongside existing stance | Name recognition with buyers; one column | XS | **v1 — do it** |
| 5 | **Go-live risk composite** | Single index = f(readiness, impact severity × headcount, stakeholder opposition) | The number an exec actually asks for; the strongest cross-module demo | M | **v1 if time — strong defense moment** |
| 6 | **Sponsor scorecard** | Sponsor-specific assessment: visibility, coalition-building, communication | Prosci: 79% vs 27% on sponsor effectiveness. Best-evidenced feature in the product. | M | **v1.5** |
| 7 | **Pulse re-assessment / waves** | Re-run an instrument at T1, T2; show dimension deltas | Turns a snapshot into a longitudinal design — big for the research chapter | M | **v1.5 — high research value** |
| 8 | **Change saturation check** | Inventory of concurrent initiatives per org unit; capacity heat overlay | Change-fatigue literature; The Change Compass's core enterprise feature, miniaturised | M | **v2** |
| 9 | **Derived RACI** | Generate a RACI matrix from captured process steps | "The tool does the work" demo; near-free given your step model | S | **v1.5** |
| 10 | **Readiness→impact auto-suggestion** | Low dimension in a unit proposes candidate impacts; pain points propose impacts | Makes the evidence chain visible in the UI, not just the schema | M | **v1.5** |
| 11 | **Interview mode** | Guided script for capturing a process live, with a consultant timer and prompts | The actual field workflow; nobody tools it | M | **v2** |
| 12 | **Instrument template library + versioning** | Ship ORIC-adapted and CSF-derived templates; version them | Directly supports the "grounded instrument" claim | S | **v1 (PRD has templates — add versioning)** |
| 13 | **Anonymised benchmarking** | Cross-engagement percentiles | The moat — needs volume | L | **v2, schema-ready in v1** |
| 14 | **BPMN modeller** | Draw process diagrams | Lucid and Signavio do this better. Structured steps + generated swimlane view is enough. | L | **Cut** |
| 15 | **AI report narrative** | Generate the consultant's prose | PRD already defers it. Correct call: the numbers must be right first, and a panel will ask whether the AI or the research produced the finding. | M | **Deferred — keep it deferred** |
| 16 | **ERP integration (Odoo)** | Pull config/master data | PRD says resist. Agreed — it breaks ERP-neutrality and doubles scope. | L | **Cut** |
| 17 | **Handover pack export** | Structured export of processes, impacts and requirements for the build team | Bridges to implementation *without* integrating with any ERP. Genuine workflow value. | S | **v2 — the acceptable version of #16** |

### On #5, the go-live risk composite

This is the feature that makes a five-minute demo land, and it is also the one most likely to draw
fire ("how do you know the weights are right?"). Handle it by being explicit: it is a **transparent,
consultant-adjustable composite**, not a trained predictive model. Show the formula in the UI. Let the
consultant change the weights and see the number move. Then say in the defense: validating this as a
*predictor* requires longitudinal post-go-live data, which is outside this study's scope and is stated
as future work. That answer is airtight. Claiming prediction is not.

---

## 6. Capstone framing

### 6.1 Research questions

Structure as one general problem and specific sub-problems (the standard local format).

**General:** How can a web-based platform support business analysts and functional consultants in
conducting structured, theory-grounded pre-implementation change readiness and digital transformation
preparedness assessments for organisations adopting ERP systems?

**Specific:**

1. What assessment dimensions and instruments does the change-management and ERP implementation
   literature support for measuring pre-implementation readiness?
2. What features are required by practising consultants to conduct readiness, stakeholder, impact and
   process documentation work within a single engagement?
3. How can the platform be designed to link readiness findings, stakeholder positions, process pain
   points and change impacts into a traceable chain of evidence?
4. How does the developed system evaluate against ISO/IEC 25010 software quality characteristics as
   assessed by IT experts and practising consultants?
5. What is the perceived usability and usefulness of the system among its intended users?

RQ1 is your literature review. RQ2 is requirements elicitation — **actually interview 5–8 consultants
and report it**; it is the cheapest credibility in the whole project. RQ3 is the design contribution.
RQ4 and RQ5 are the evaluation. Clean, and each maps to a chapter.

### 6.2 Methodology: Design Science Research

Use **Peffers, Tuunanen, Rothenberger & Chatterjee (2007)**, *Journal of Management Information
Systems*, 24(3), 45–77 — the six-step DSRM process model. Underpin it with **Hevner, March, Park &
Ram (2004)**, *MIS Quarterly*, 28(1), 75–105 and its seven guidelines.

DSR is the right choice because your output is an *artifact*, not a hypothesis test. It gives you a
defensible answer to "what is your methodology?" that isn't "I built an app."

| DSRM step | In Trestle | Evidence you produce |
|---|---|---|
| 1. Problem identification & motivation | §1 of this doc; consultant interviews | Literature synthesis; interview findings |
| 2. Define objectives of a solution | PRD's four modules; the dimension crosswalk (§2.5) | Requirements matrix traced to literature |
| 3. Design & development | `docs/plan/` phases 01–08 | The system; architecture doc; schema |
| 4. Demonstration | The pilot engagement in your success criterion | Case documentation, screenshots, exported report |
| 5. Evaluation | ISO 25010 expert evaluation + SUS + pilot outcomes | Scored instruments, weighted means, interpretation |
| 6. Communication | The paper and the defense | This document, the manuscript |

Your phase plan and the DSRM cycle line up almost exactly. Say so explicitly in Chapter 3 — it makes
the engineering look like method rather than the method look like decoration.

### 6.3 Evaluation plan

Four instruments, each answering a different question.

**a) ISO/IEC 25010 expert evaluation — "is the software any good?"**

Note the version. **ISO/IEC 25010:2023** has *nine* product quality characteristics: Functional
Suitability, Performance Efficiency, Compatibility, **Interaction Capability** (was Usability),
Reliability, Security, Maintainability, **Flexibility** (was Portability), and **Safety** (new). The
2011 version has eight. Many local capstone templates still use 2011. Pick one, state which, and be
ready to explain the difference — knowing there *was* a revision is an easy point in your favour.

Panel of 10–15: mix IT professionals (developers, QA) with practising ERP consultants and BAs. 4- or
5-point Likert, weighted mean per characteristic, standard verbal interpretation ranges. Report per
characteristic, not just an overall figure.

**b) System Usability Scale — "can they actually use it?"**

Brooke (1996). 10 items, alternating positive/negative, scored 0–100. The widely cited benchmark
average is **≈68**; Bangor et al. and Sauro's adjective ratings let you say "good" or "excellent"
rather than just a number. Cheap, standard, comparable, and it takes a respondent two minutes.
Administer it to consultants after a realistic task, not after a tour.

**c) Instrument validation — "is the questionnaire itself sound?"**

This is the part most capstones skip and the part that fits your project best, because your artifact
*contains* a measurement instrument.

- **Content validity** — expert review of items by change-management practitioners; compute a Content
  Validity Index (Polit & Beck) or Lawshe's CVR. Small panel, big credibility.
- **Reliability** — **Cronbach's α per dimension** on real pilot responses. You are building this into
  the product anyway (§4.3), so the paper gets it for free. Report it even if a dimension comes in
  weak — Holt et al. reported .66 and published.
- **Construct validity** — with enough responses, an exploratory factor analysis. Ambitious for a
  capstone n; mention as future work unless the pilot is unusually large.

**d) Pilot engagement — "does it work in the field?"**

Your PRD's success criterion is already the right one: run a complete engagement for one real client
end to end without opening Word or Excel. Document it as a case study — time spent per module,
response rate, what broke, what the client said. One real engagement beats twenty simulated users.

### 6.4 Scope and limitations — write these before the panel does

- The system is evaluated on quality and usability, **not** on whether higher readiness scores
  actually predict better ERP outcomes. That requires post-go-live longitudinal data beyond the study
  period. State it in Chapter 1, restate it in Chapter 5 as future work.
- The readiness instrument is *adapted from* validated scales, not itself fully validated. Report the
  reliability you obtain and be precise about the difference.
- Pilot n is small and from one geography and firm size band. Not generalisable; say so.
- Benchmarking is demonstrated on synthetic data. Label every synthetic figure in the manuscript.
- No integration with any ERP is in scope, by design (see PRD).

### 6.5 Questions the panel will ask

Rehearse these. The weak answers are the ones given for the first time in the room.

| Question | Your answer |
|---|---|
| "Isn't this just Google Forms with a dashboard?" | Forms owns one node. Trestle owns the edges — readiness → stakeholder → process → impact → mitigation, traceable in one data model. Show the chain diagram (§4.1). |
| "Where did your six dimensions come from?" | The crosswalk table (§2.5). Armenakis's five beliefs, Holt's four factors, Weiner's two components, the ERP CSF consensus. Have it on a slide. |
| "How do you know readiness predicts success?" | The literature associates these factors with outcomes; this study does not test prediction. Explicitly scoped out, explicitly future work. Do not overclaim. |
| "Why not just use Prosci?" | Prosci is methodology and training delivered as templates. Trestle is the software the methodology has never had, sold to the partner rather than the enterprise. |
| "Your sample is too small." | Agreed and disclosed. DSR evaluates an artifact, not a population. Depth of the pilot engagement plus expert evaluation is the design, and the limitation is stated. |
| "Is 5-respondent suppression enough for anonymity?" | Explain small-n suppression, then note the residual risk from *combinations* of filters — and that you suppress on the intersection, not just the single segment. Knowing about differencing attacks scores well. |
| "Why not integrate with Odoo — you're an Odoo consultant?" | ERP-neutrality is the market position; the buyer implements several ERPs. Integration also moves the product from pre-implementation into implementation, which is a different problem. Offer the handover pack (#17) as the bridge. |
| "What happens when AI can generate all of this?" | The question text is the cheap part. The value is structured, linked, comparable evidence across engagements — which is a data asset, not a generation problem. |
| "What's your contribution, in one sentence?" | Have it memorised. Suggestion: *a theory-grounded, multi-tenant assessment platform that makes pre-implementation change readiness traceable from measured belief to recommended action.* |

---

## 7. Reading list, prioritised

Read the first four properly. Skim the rest for citations.

| Priority | Source | Why |
|---|---|---|
| 1 | Weiner (2009), *Implementation Science* 4:67 | Open access. The theory your divergence analytics rest on. Short. |
| 1 | Shea et al. (2014), *Implementation Science* 9:7 | Open access. ORIC — the instrument to adapt. |
| 1 | Holt et al. (2007), *JABS* 43(2) | The scale-development method you are imitating. |
| 1 | Peffers et al. (2007), *JMIS* 24(3) | Your Chapter 3 methodology, verbatim. |
| 2 | Armenakis, Harris & Mossholder (1993), *Human Relations* 46(6) | The five beliefs. Most quotable paper in the review. |
| 2 | Markus & Tanis (2000), chapter | Positions your work in the ERP lifecycle. ⚠ verify citation details. |
| 2 | Finney & Corbett (2007), *BPMJ* 13(3), 329–347 | Compact CSF compilation — one cite covers a lot of ground. |
| 3 | Hevner et al. (2004), *MIS Quarterly* 28(1) | DSR guidelines; cite alongside Peffers. |
| 3 | Somers & Nelson (2001), HICSS-34 | CSFs vary by implementation phase — supports your scoping. |
| 3 | Venkatesh et al. (2003), *MIS Quarterly* 27(3) | UTAUT, if you use it for your own evaluation. |
| 3 | Umble, Haft & Umble (2003), *EJOR* 146(2) | Widely cited ERP CSF paper; easy to obtain. |
| 4 | Ngai, Law & Wat (2008), *Computers in Industry* 59(6) | Cross-country CSF review; good for the local-context section. |
| 4 | Brooke (1996) + Sauro/Bangor benchmarks | SUS scoring and interpretation. |
| 4 | ISO/IEC 25010:2023 | Read the characteristic definitions before writing the evaluation instrument. |
| 4 | Tornatzky & Fleischer (1990) | TOE. Usually cited secondhand; fine, but know what it says. |
| 5 | BABOK v3 (IIBA) | Frames the process documentation module as BA practice. |
| 5 | DTI MSME Development Plan 2023–2028 | Local significance section. |

Open-access first: Weiner, Shea, and most *Implementation Science* material. ERIC and PMC will cover
several more. Chase the rest through your school's library before paying a publisher.

---

## 8. Open items

Decisions this document surfaces but does not make.

1. **Personal valence** — add a seventh readiness dimension, or scope it out explicitly in the paper?
   (§2.5). Leaning: add it. It is one Likert section and it closes the most obvious hole.
2. **ISO 25010 version** — 2023 (nine characteristics) or 2011 (eight)? Check what your department's
   template expects before building the evaluation instrument.
3. **Consensus/divergence metric** — plain standard deviation, or a proper agreement index (rWG, ADM)?
   SD ships this week; an agreement index reads better in the paper. Possibly both: SD in the UI,
   agreement index in the analysis.
4. **Benchmarking schema in v1** — carry the industry/size/ERP tags on `engagement` now even though
   the feature is v2? Cheap now, painful to backfill later. Recommend yes.
5. **Consultant interviews for RQ2** — scheduled? This is the input with the shortest lead time and the
   longest calendar dependency. Start it before the next build phase, not after.
6. **`docs/DATA-MODEL.md` and `docs/plan/`** — both are referenced by `CLAUDE.md` and neither exists yet.
   The data model in particular gates everything in §4, since the divergence analytics and the
   reliability panel both need the response schema settled first.
