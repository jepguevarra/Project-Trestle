# Trestle — The Odoo Vertical

How to aim the product at Odoo implementation partners without forking it.

`POSITIONING.md` concluded: **domain-general product, ERP-first go-to-market.** This document is the
second half of that sentence, specified. It is not a reversal — nothing here narrows the schema.

**The test for everything below:** if you find yourself writing a migration that only makes sense for
Odoo, you have gone wrong. If you are writing seed data, a template, or a rule table, you are on
track. Odoo depth lives in **content and configuration**; the spine stays general.

---

## 1. The market, honestly sized

From Odoo's own partner directory, September 2026:

| Tier | Count | Who they are |
|---|---|---|
| Gold | 318 | Audited annually on enterprise user sales, consultants certified on the three latest versions, and retention |
| Silver | 900 | Established firms |
| Ready | 3,199 | Mostly one to five people |
| **Total** | **4,417** | |

United States: 273 partners (7 Gold, 29 Silver, 237 Ready). Odoo itself is growing fast — around
7,000 new clients a month and roughly 40% annual growth — so the partner count is rising, not static.

### The arithmetic, done honestly

**Silver + Gold = 1,218 firms** are the realistic Firm-tier buyers: big enough to have a methodology
problem and a budget. Ready partners are mostly too small for $249/month and belong on Solo or
Practice.

| Scenario | Firms | At | Annual |
|---|---|---|---|
| 2% of Silver+Gold | ~24 | $249/mo | ~$72k |
| 5% of Silver+Gold | ~61 | $249/mo | ~$182k |
| 1% of Ready | ~32 | $59/mo | ~$23k |

**Verdict: Odoo-only is a genuinely good side business and a thin company.** At 5% penetration of the
serviceable tier you have a six-figure business run alongside contract work. You do not have a
venture-scale company, and pretending otherwise in a pitch would be the kind of claim that invites a
hard question.

### The real argument for Odoo-first is not market size — it is reachability

This is the part that matters. Odoo partners are an unusually **addressable** market:

- A **public directory** of all 4,417 firms, filterable by tier and country. That is a prospect list,
  freely available, which almost no B2B market offers.
- **Odoo Experience**, the annual conference — a large share of the market in one building.
- The **OCA** (Odoo Community Association): 20,000+ open-source modules and over 1,100 active
  contributors, with public repositories. Contributing is a credibility channel.
- Active partner forums and a dense professional network where firms know each other.

Customer acquisition cost in a market like this is a fraction of what it is in a diffuse one. That,
not TAM, is why Odoo is the right wedge — and the general spine means the second vertical is a content
exercise rather than a rebuild.

---

### 1.1 The Philippine market specifically

Three figures, and one absence that matters more than any of them.

| Figure | Source |
|---|---|
| **39 Odoo partners in the Philippines** — 4 Gold, 10 Silver, 25 Ready | Odoo partner directory, via ERP Research, 2026 |
| **5,145 establishments** in Professional, Scientific and Technical Activities; **139,732** workers | PSA, 2022 Annual Survey of Philippine Business and Industry |
| **23,293 workers** in management consultancy activities — the third-largest employer in that section at 16.7% | Same survey |

**There is no published count of change management service providers in the Philippines**, because it
is not a thing that is counted. It has no PSIC code of its own, no registry and no trade body. PSA's
nearest category is management consultancy activities (PSIC 7020), which is overwhelmingly strategy,
finance, HR and operations work. The release gives that group's employment but not its establishment
count; dividing by the section average of 27 workers per establishment suggests **roughly 400–900
management consultancy establishments** — an estimate of mine, not a published figure, and the true
number skews lower because consultancies are larger than the photographers and legal practices that
dominate the section's establishment count.

**The absence:** ACMP, the global change management professional body, has **no Philippine chapter**.
Its entire Asia-Pacific presence is Australia/New Zealand, Hong Kong, Malaysia and Singapore. In the
Philippines, change management is sold as a workstream inside global advisory firms — Deloitte, KPMG,
EY, PwC, Accenture, YCP — or buried inside an ERP project. It is not a standalone local service line
with specialist firms behind it.

**What this means for Trestle, both ways.**

*Against a PH-only market:* the buyer population of "Philippine change management firms" is close to
empty. Silver and Gold Odoo partners here number **14**. That is a pilot group and a research
population, not a business. The Philippines is where you dogfood and where you recruit evaluators;
revenue has to come from the 1,200 Silver and Gold partners worldwide in §1.

*For the service, and for the capstone:* the same absence is the opportunity. NutKase's
pre-implementation offering has almost no specialist local competition, and the fact that the practice
is **informal in the Philippines — no chapter, no category, no registry** — is a citable, sourced
argument for the study's significance. The work this artifact structures is currently done, where it
is done at all, without method or tooling.

---

## 2. What makes Odoo work different, and what to build for it

### 2.1 Hosting choice constrains the available dispositions

This is the single most Odoo-native feature available, and it is one enum plus a small rule table.

| Hosting | Custom modules | Odoo Apps store | Studio |
|---|---|---|---|
| **Odoo Online** | **No** — core logic cannot be modified | **No** — standard apps only | Yes, and it is the *only* customisation route |
| **Odoo.sh** | Yes | Yes, no limitations | Yes |
| **On-premise** | Yes, including core | Yes | Yes |

So a client on Odoo Online **cannot** have a requirement resolved by a custom module. Trestle should
refuse that disposition — and the refusal is itself a finding: either the requirement gets a Studio or
process-change answer, or the hosting decision has to be revisited. That is a real consulting insight
encoded in software, and no generic requirements tool can produce it because none of them know what
the target platform permits.

Build it as a rule table (§3), not as `if` statements. A second product's constraints are then rows.

### 2.2 The Odoo disposition ladder

Replace the generic fit-gap dispositions from `REQUIREMENTS-MODULE.md` §3.1 with the ladder an Odoo
consultant actually climbs, **in cost order**:

1. `standard` — out of the box
2. `configuration` — settings, no code
3. `studio` — Studio customisation; available on every hosting option
4. `oca_module` — an existing OCA module, free and community-maintained
5. `third_party_app` — a paid app from the Odoo Apps store
6. `custom_module` — bespoke development
7. `process_change` — change the process instead of the software
8. `out_of_scope` / `deferred`

**The order is the feature.** Presenting the dropdown cheapest-first nudges toward the cheaper answer,
which is good consulting built into the UI rather than written in a methodology nobody reads.

**The OCA step is the one no generic tool knows about.** With 20,000+ community modules across
versions, "did you check OCA?" is a question that saves real money and gets skipped under deadline
pressure. Make `oca_checked` a required boolean before `custom_module` becomes selectable. It costs
one checkbox and it is the kind of detail that makes a practitioner trust the tool.

### 2.3 The upgrade tax, on Odoo's actual clock

Odoo's release and support policy makes customisation cost quantifiable in a way most ERPs do not:

- **Annual major release, every October.** Upgrade scripts typically arrive two to three months after
  launch, not on release day.
- **Support windows:** three years on Odoo Online; up to five on Odoo.sh by negotiation; on-premise is
  technically indefinite, but from **April 2026** a deployment more than three releases behind incurs
  a **25% annual subscription surcharge**.
- **Skipping versions compounds:** roughly **1.5× effort per version skipped** — a 100-hour
  one-version upgrade becomes about 150 hours if you skip one.

This turns the customisation register from a cost list into a **recurring annual liability on a known
clock**. Trestle can compute, at scoping time:

- Count of custom modules and third-party apps the proposed scope implies
- Estimated migration effort per annual version
- The carrying cost over a three-year horizon
- A warning when the count crosses the firm's own threshold

A line that reads *"these 14 customisations will cost roughly N hours every October, and about 1.5× that
if you skip a year"* is the most commercially valuable sentence the product can produce — and a client
sees it **before** agreeing to the customisations rather than three Octobers later. It exists only
because Odoo's cadence is predictable.

### 2.4 The Odoo app taxonomy as the fit-gap axis

Seed `target_module` with Odoo's real app list: Sales, CRM, Purchase, Inventory, Manufacturing,
Accounting, Invoicing, Employees, Recruitment, Payroll, Project, Timesheets, Field Service, Website,
eCommerce, Point of Sale, Subscriptions, Helpdesk, Quality, Maintenance, Rental, Marketing Automation,
Studio.

Fit ratio by Odoo app then becomes the headline table a partner reads first: *"Sales 85% standard,
Manufacturing 40%."* That single row tells them where the project's risk and margin sit.

### 2.5 The pattern library — your unfair advantage, and it needs no code

`REQUIREMENTS-MODULE.md` §3.3 specified the pattern library. For Odoo it is unusually powerful, because
the domain repeats hard: the same wholesale distributor requirements recur at every wholesale
distributor.

**Seed it from your own engagement history.** You spent two years as a functional analyst at a
Philippine Odoo partner. The forty requirements you saw most often — with their typical verdict,
typical disposition, the qualifying questions that confirm they apply, and the variations by industry —
are sitting in your memory and in old project files. Nobody else can write them.

This is the highest-value work available to you right now, it needs **zero code**, and it can be done
on paper before phase 05 ships. Do not wait for the feature to exist to start collecting the content.

### 2.6 Odoo-flavoured readiness items

The six dimensions in `PRD.md` hold unchanged — they come from general organisational change theory.
The **items** can be Odoo-specific without touching the engine, since phase 03 already ships one
template per engagement type. Things worth asking an Odoo-bound client that a generic instrument would
not: dependence on spreadsheets as systems of record, whether anyone has used an integrated system
before, data quality in the tools being replaced, and appetite for process standardisation — Odoo
rewards standardisation and punishes customisation harder than most platforms, so that last one is
genuinely predictive.

### 2.7 Edition and version as engagement attributes

Community versus Enterprise is a real pre-implementation decision with cost consequences, and some
requirements are satisfiable only on Enterprise. A `requires_enterprise` flag on a requirement turns
the edition decision into a derived output: *"these six requirements require Enterprise."*

---

## 3. What it costs in the schema — almost nothing

```
engagement
  target_product      odoo | other
  odoo_version        integer      (nullable)
  odoo_edition        community | enterprise | null
  odoo_hosting        online | odoo_sh | on_premise | null

requirement
  disposition         -- extended enum, §2.2
  oca_checked         bool not null default false
  requires_enterprise bool not null default false
  target_module       text         -- seeded from §2.4

disposition_rule      -- the constraint table from §2.1
  product, hosting, disposition, is_allowed
```

Four nullable columns on `engagement`, three on `requirement`, one small rule table. Everything else is
**seed content**: instrument templates, the module taxonomy, the disposition ladder's ordering, the
pattern library.

**Nothing here forks the product.** A CRM or NetSuite engagement uses the same tables with
`target_product = 'other'` and the generic disposition set from `REQUIREMENTS-MODULE.md`. A second
vertical later is rows, not migrations. That is the whole point of having held the general spine.

---

## 4. Go-to-market

| Channel | Why it works |
|---|---|
| **The partner directory** | A public, filterable list of all 4,417 firms by tier and country. Start with Silver and Gold in South-East Asia and Australia |
| **Odoo Experience** | The annual conference. A large share of the market, in person, once a year |
| **OCA contribution** | Publishing a module earns standing in the community that no advertising buys |
| **Partner forums and the Odoo professional network** | Dense, and firms talk to each other — which cuts both ways, so early support quality matters more than usual |
| **Your own credential** | You were a functional analyst at a Philippine Odoo partner. "Built by one of us" is close to the only marketing that works on consultancies |
| **The dogfood** | Run your NutKase engagements inside Trestle and publish the sanitised deliverables. A real readiness report from a real Odoo engagement beats any landing page |

---

## 5. The risks of narrowing — state them before a panel does

- **The ceiling is low.** 4,417 firms total, around 1,200 realistically payable at Firm pricing. Fine
  for a side business; thin for a company. Do not claim otherwise.
- **Platform dependency.** If Odoo changes partner economics or ships its own pre-implementation
  tooling, you are exposed. The general spine is the mitigation, and it is a real one — it is why
  §3 matters more than §2.
- **Ready partners mostly cannot pay much.** The buyer pool is Silver and Gold, not the headline 4,417.
- **Odoo's culture may cut against you.** Odoo's own implementation approach is comparatively
  lightweight and fast, and its community already believes in avoiding customisation. That belief helps
  you — fit-gap discipline is a value they hold — but it also means some partners will see a paid
  readiness phase as overhead their methodology does not call for. **This is the assumption most likely
  to be wrong, and it is cheap to test.** Put it directly to five to eight partners before building any
  of §2.

---

## 6. What this does for the capstone — more than you would expect

- **It fixes the sampling question.** "Philippine and South-East Asian Odoo implementation partners" is
  a real, enumerable population drawn from a public directory. That answers "your sample is arbitrary"
  with a sampling frame, which is a much better answer than a defence of small *n*.
- **It gives you expert evaluators.** Recruit the ISO 25010 panel from that same directory.
- **The hosting-constraint rule is a demonstrable design contribution** — a platform constraint model
  that changes which solution options the tool will accept. That is a concrete artifact behaviour, not
  a feature list.
- **The upgrade-tax computation is a quantitative output you can validate** against real engagement
  data, which most capstone artifacts cannot offer.

**Frame it as a vertical instance of a general design, not as the product's limit.** "The artifact is
domain-general; the evaluation instance is Odoo partners" is stronger than either claim alone — it
gives you breadth in the contribution and specificity in the method.

---

## 7. What to do, and in what order

1. **Do not build any of §2 yet.** It all sits on top of the spine. Phase 05 ships first.
2. **Start the pattern library this week, on paper.** Forty Odoo requirements from your own engagement
   history, with typical verdict, disposition and qualifying questions. No code, highest value, and
   only you can write it.
3. **Run the partner interviews** (`RESEARCH.md` §6.1, RQ2), and include the §5 question explicitly:
   would you sell a paid readiness phase, and has a client ever paid for one?
4. **Add the four `engagement` columns in phase 02**, nullable and unused. They are cheap now and
   annoying later — the same argument as `engagement.type`.
5. **Build §2.1 and §2.2 with phase 10**, when requirements and fit-gap arrive.
