# Trestle — Tool Landscape

What already exists for business analysis, requirements capture and requirements monitoring.
Companion to `RESEARCH.md` §3, which covers the *change management* side; this covers the *BA* side.

Doubles as the source material for the capstone's Related Systems chapter — see §9.

**The summary:** requirements monitoring is a crowded, mature, enterprise-priced category, and you
should stay out of it. But the primitive you actually want — evidence traced from a recorded
conversation to a conclusion — is a proven product category in an adjacent industry, which is useful
news. §6 is the section to read if you only read one.

---

## 1. Requirements management tools

The closest match to "requirements monitoring." All of them do a traceability matrix.

| Product | Vendor | Shape | Pricing |
|---|---|---|---|
| **Jama Connect** | Jama Software | The category benchmark. End-to-end traceability, live impact analysis, requirements-based testing, review and approval workflows | On request; 30-day trial |
| **IBM DOORS / DOORS Next** | IBM | The incumbent in defence and aerospace. Extremely powerful, extremely heavy, decades of installed base | Enterprise |
| **Visure Requirements ALM** | Visure Solutions | Highly customisable, industry templates keyed to ISO/IEC standards, AI quality analysis, imports from DOORS/Jira/Word | On request; 30-day trial |
| **Modern Requirements4DevOps** | Modern Requirements | Lives inside Azure DevOps. Trace matrices, baselines, e-signature approvals, an AI copilot | On request; 30-day trial |
| **Polarion ALM** | Siemens | Full ALM, strong in automotive and regulated manufacturing | Enterprise |
| **codebeamer** | PTC (formerly Intland) | Full-stack ALM, "gapless traceability", change control, industry templates | On request; 30-day trial |
| **ReqView** | ReqView | Lightweight, desktop-first, versioned in Git or Subversion, ReqIF import/export | From **$520/user/year** |
| **reqSuite rm** | OSSENO Software | Aimed at mid-sized firms, two-way sync with Jira and Azure DevOps, AI quality checks | On request |
| **Matrix Requirements** | MatrixOne Health | Medical devices — FDA and EU MDR compliance, design controls, risk module | On request |
| **ReqTest** | ReqTest | Agile-leaning, requirements plus test and bug tracking | On request |
| **SpiraTeam** | Inflectra | Requirements, tests and defects in one, mid-market pricing | Published, mid-market |
| **Requirements Portal** | Altium | Electronics-focused, unlimited collaborators | From **$1,990/year** |

### What the table actually tells you

**They were built for regulated engineering, not for consulting.** Medical devices, automotive,
aerospace, defence. In those industries traceability is a *legal obligation* — you must be able to
prove which requirement a test covers. That origin shapes everything: the data model starts at the
requirement, the customer is a 500-person engineering organisation, and the sales motion is
enterprise.

**Pricing is the tell.** Almost every row says "on request." That means a sales call, a quote, and a
seat count. A 15-person Odoo partner running three engagements a year is not in that market, which is
precisely why they are using Excel. Your buyer has been priced out of this entire category, and that
is a market position, not an accident.

**None of them look upstream.** Every one begins at "here is a requirement." Where the requirement
came from — which interview, which measured organisational weakness, which process pain point — is
outside the model. Ask any of these tools *why* REQ-014 exists and the answer is a free-text
description field.

---

## 2. Work trackers — where user stories actually live

| Product | Vendor | Why it matters to you |
|---|---|---|
| **Jira** | Atlassian | The default. Whatever your client's build team uses, assume this |
| **Azure DevOps** | Microsoft | The default in Microsoft-stack shops; Microsoft's own fit-gap guidance now points here (§5) |
| **Aha!**, **Productboard** | — | Product management: roadmaps and idea-to-feature |
| **Rally**, **Shortcut**, **Linear** | — | Agile delivery tracking |

This is the category "User Story Monitoring" belongs to, and `BA-LAYER.md` §4.1 is the argument for
staying out of it. Nothing here is a gap. It is a settled market with entrenched incumbents and free
tiers.

---

## 3. Process modelling and documentation

| Product | Shape |
|---|---|
| **Lucidchart / Lucid** | General diagramming, huge install base, cheap |
| **Miro** | Whiteboard-first, workshop-friendly |
| **Microsoft Visio** | The legacy default |
| **Bizagi Modeler** | Free BPMN modeller, genuinely good |
| **SAP Signavio Process Manager** | Enterprise BPM, process repository and governance |
| **Software AG ARIS** | The heavyweight enterprise process repository |
| **IBM Blueworks Live** | Cloud process discovery and documentation |
| **Mavim** | Dutch BPM/transformation platform — named by Microsoft in its Dynamics fit-gap guidance (§5) |
| **Creately** | Lightweight visual collaboration |

Bizagi Modeler is free and Lucid is cheap. This is why `RESEARCH.md` §5 #14 says do not build a BPMN
modeller: you would be competing with a free product on its home ground, and losing the argument
about what your value actually is.

---

## 4. Process mining — discovering the as-is from data

| Product | Vendor |
|---|---|
| **Celonis** | Celonis |
| **SAP Signavio Process Insights** | SAP |
| **UiPath Process Mining** | UiPath |
| **KYP.ai** | KYP.ai |

Covered in `RESEARCH.md` §3.1. The structural barrier stands: these reconstruct a process from event
logs, and your clients' current processes run on spreadsheets, paper and habit. There are no logs to
mine. A person has to go and ask — which is §6's subject, and yours.

---

## 5. ERP-vendor pre-implementation tooling — the most relevant category, and the biggest surprise

Each major ERP vendor ships some version of what you are building. All of it is locked to their own
ERP, and the most advanced example is being dismantled.

### Microsoft — the closest anyone has come

- **Business Process Modeler (BPM)** inside **Lifecycle Services (LCS)**: process libraries,
  hierarchies, fit-gap against the standard process catalogue, requirements as work items.
- **Success by Design** — Microsoft's implementation methodology, with a phase-by-phase review model.
- **Business Process Catalog** — a maintained catalogue of standard processes to run fit-to-standard
  analysis against, updated several times a year.

And then: **Microsoft froze new cloud implementation project creation in LCS on 16 February 2026**
for new Dynamics 365 Finance, Supply Chain Management and Project Operations customers, following a
code freeze in January 2026. New customers are directed to the Power Platform admin center. Existing
LCS projects continue. (The freeze notice does not state BPM's own fate — verify before asserting
anything about the tool specifically.)

More telling than the freeze: Microsoft's **current** fit-to-standard and fit-gap guidance names only
two tools for capturing processes and gaps — **Azure DevOps** (the catalogue imported as work items)
and **Mavim** (a third-party BPM product). The largest ERP vendor on earth, writing its own
implementation methodology, points partners at a work-item tracker and somebody else's software.

That is your market gap, documented by the incumbent.

### The others

| Vendor | What they ship | Limit |
|---|---|---|
| **SAP** | Solution Manager / Focused Build, SAP Activate methodology, Signavio Process Insights | SAP only; enterprise scale; implementation phase, not readiness |
| **Oracle** | Oracle Unified Method, Cloud Success Navigator | Oracle only |
| **NetSuite** | SuiteSuccess — pre-configured industry processes | NetSuite only; a configuration accelerator, not an assessment tool |
| **Odoo** | Nothing comparable | — |

### Three things this category proves for you

1. **The workflow is real.** Vendors do not build fit-gap tooling for fun. The work you are tooling is
   work the industry already recognises and funds.
2. **Every one of them is single-ERP.** A partner implementing Odoo *and* NetSuite cannot standardise
   on any of them. ERP-neutrality is not a nice-to-have in your positioning — it is the only way one
   tool covers a partner's whole book of business.
3. **None of them measure readiness.** All of it is fit-gap, process and configuration. Whether the
   client's people can absorb the change is not in scope for any vendor tool, because it is not a
   question about the vendor's software.

---

## 6. Evidence repositories — the category to actually learn from

This is the section worth your time. It is not an ERP category at all.

| Product | What it does |
|---|---|
| **Dovetail** | The market leader. Import interview recordings and transcripts, highlight passages, tag them, and build insights that link back to every clip supporting them |
| **Condens** | Same shape, research-team focused |
| **Marvin** | Interview repository with automated transcription and analysis |
| **Great Question** | Participant recruiting plus repository |
| **Koji**, **Perspective AI** | Newer AI-native entrants in the same space |

These are **UX research repositories**. They exist so a product team can answer "what is the evidence
for this decision?" and get back the actual interview clips.

Which is exactly the primitive `BA-LAYER.md` §3.1 proposes: the `elicitation_source`, the extract, and
the trace from a conclusion back to the conversation that produced it.

**Why this matters more than any other section here:**

- **It de-risks your central design bet.** The evidence chain is not an untested idea you invented for
  a capstone. It is a product category with paying customers and multiple funded competitors. It works;
  it has just never been pointed at ERP discovery.
- **It gives you an information architecture to study.** Look at how Dovetail models a project, a
  source, a highlight, a tag and an insight, and how it handles the many-to-many between highlights and
  insights. That is the hard modelling problem in your spine, already solved well by people who had
  years to iterate on it.
- **It is not a competitor.** Dovetail has no concept of an engagement, a client organisation, a
  readiness score, a process or an ERP. A consultant could use it as a notes tool and would still have
  nothing that links a quote to an impact severity.
- **It sharpens your defense.** When a panel asks whether the evidence chain is realistic, "this is how
  the UX research tooling market works, applied to ERP discovery" is a much stronger answer than a
  diagram.

**Do this:** spend an hour in Dovetail's free tier or its documentation before you design the
`elicitation_source` schema. Copy the primitive, not the product.

---

## 7. Change management platforms

Covered in `RESEARCH.md` §3.1 — WalkMe, Whatfix and Pendo (adoption, post-go-live); The Change
Compass, ChangeScout and Changefirst (enterprise change portfolios); Prosci and OCM Solution
(methodology and templates). Nothing changes here.

---

## 8. What the whole landscape tells you

1. **Requirements monitoring is solved and crowded.** Twelve serious products, entrenched, built for
   regulated engineering. Do not enter.
2. **The traceability matrix is a commodity feature — with a uniform blind spot.** Everyone has one;
   every one of them starts at the requirement. Rooting it in a measured organisational condition is
   still unoccupied ground.
3. **Your buyer is priced out of the category.** "On request" pricing is why a small partner works in
   Excel. That exclusion is the market.
4. **ERP vendors own fit-gap, but only inside their own ERP** — and Microsoft, the one that built the
   best version, has frozen new projects in the product that housed it and now points partners at
   Azure DevOps and a third-party tool.
5. **The evidence chain is proven, just not here.** An entire product category does it for UX research.
   Applying it to ERP discovery is a transfer, which is a much easier thing to defend than an invention.
6. **The gap holds.** Nothing found in this review measures pre-implementation readiness, works across
   ERPs, is sold to the implementation partner, and links findings to requirements. Still empty.

---

## 9. For the Related Systems chapter

Local capstone format usually wants a Related Systems / Related Literature review with a comparison
matrix. Structure it as one table with a column per capability and a row per system, so the empty
column is visually obvious:

| System | Developer | Readiness measurement | Stakeholder analysis | Impact analysis | Process capture | Requirements + RTM | ERP-neutral | Sold to the partner |
|---|---|---|---|---|---|---|---|---|
| Jama Connect | Jama Software | ✗ | ✗ | Impact of a requirement change only | ✗ | ✓ | n/a | ✗ |
| Modern Requirements | Modern Requirements | ✗ | ✗ | ✗ | ✗ | ✓ | n/a | ✗ |
| Dynamics LCS / BPM | Microsoft | ✗ | ✗ | ✗ | ✓ | Partial | ✗ | Partner-facing |
| SAP Solution Manager | SAP | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ | Partner-facing |
| Celonis | Celonis | ✗ | ✗ | ✗ | ✓ automated | ✗ | ✓ | ✗ |
| Dovetail | Dovetail | ✗ | ✗ | ✗ | ✗ | ✗ | n/a | ✗ |
| Prosci toolkit | Prosci | ✓ templates | ✓ templates | ✓ templates | ✗ | ✗ | ✓ | ✗ |
| The Change Compass | The Change Compass | Partial | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ |
| **Trestle** | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

Two rules for keeping this honest, because a panel will test it:

- **Do not invent limitations.** Every ✗ above should be something you can point at a product page or
  a documentation link to support. Reviewers who know these tools will catch an unfair mark, and one
  unfair mark discredits the whole table.
- **Give each competitor its due in the prose.** "Jama Connect is the stronger tool for managing
  requirements once a build is underway; it is not designed for the phase before one exists" is more
  credible than implying it is deficient. You are claiming a different position, not superiority.
