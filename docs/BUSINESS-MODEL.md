# Trestle — Business Model and Pricing

How Trestle becomes a SaaS with tiers. Companion to `PRD.md`, which correctly defers billing to a
later phase — this settles the *design* so that phase is mechanical when it arrives.

Prices below are proposals, not findings. The comparables in §1 are sourced; everything in §3 is a
recommendation to test.

---

## 0. The decision everything else follows from

**Price on the engagement, not on the seat.**

Your buyer is a 10–60 person firm in which perhaps three to six people ever run an engagement. Per-seat
pricing caps you at three seats forever and grows only if the firm hires — which is the wrong thing to
tax. Worse, it makes Trestle an overhead line in their P&L, which is the line firms cut.

Per-engagement pricing does the opposite. Consultancies bill per engagement, so a per-engagement cost
becomes a **pass-through** — a cost of delivery they quote into the project, not overhead they absorb.
That is the easiest sale in B2B software. And it grows when they succeed: a firm going from four
engagements a year to twelve triples your revenue while being happier, not poorer.

OCM Solution already validates the metric in this exact category: their base plan is one user and
**two project licences**, with extra projects sold at $10/month each.

---

## 1. What the comparables actually charge

| Product | Model | Published price |
|---|---|---|
| **OCM Solution** | Base + add-ons, metered on **projects** | $75/mo for 1 user + 2 projects. Extra user $30/mo, view-only guest $5/mo, **extra project $10/mo**, OCM library $10/mo, **rebranding $20/mo**. Setup and training $69 one-time |
| **The Change Compass** | Flat tiers by user band | **$995/mo** SMB (3 users); Business (50 users) and Enterprise (100+) on quote. Their FAQ also states "$795 per user per month" — the two figures on their own site conflict, so treat either as indicative |
| **Dovetail** | Free tier → Enterprise quote | Free: 1 channel, 1 project, 1 dashboard. Enterprise: custom. Roles split Manager / **Contributor** / Viewer |
| **Requirements tools** (Jama, Visure, codebeamer, reqSuite) | Enterprise sales | Almost all "on request." ReqView $520/user/year is the rare published figure |
| **Employee survey platforms** (Culture Amp, Qualtrics) | Per employee per year, annual contracts | Enterprise; priced against the client's headcount, not the consultancy's |

**The corridor this leaves you.** Below roughly $50/month there is no business. Above roughly $400/month
your buyer stops being a small partner firm. The Change Compass sits at $995 and sells to large
enterprises; the requirements vendors sit above that and sell to regulated engineering. **Between $50
and $400 a month there is almost nothing**, and that is precisely the band a 10–60 person implementation
partner can approve without a procurement process.

Three things worth stealing directly from OCM Solution, because they have already been tested on
adjacent buyers:

- **Project licences as the meter.** Confirms the instinct in §0.
- **Charging for rebranding.** $20/month for putting the firm's logo on exports. Small firms pay for
  looking bigger — which your PRD already identified as the independent consultant's core motivation.
- **A paid setup fee.** $69 one-time. Real revenue, and a setup call is the single best predictor of
  whether a small-firm account survives its first month.

---

## 2. Choosing the value metric

| Candidate | Aligns with value? | Predictable for buyer? | Grows with their success? | Gameable? | Verdict |
|---|---|---|---|---|---|
| Per seat | Weakly | Yes | Only if they hire | They share logins | No |
| **Per active engagement** | **Strongly** | **Yes** | **Yes** | Mildly — see §4 | **Primary meter** |
| Per respondent | Moderately | No — it varies per client | Yes | No | Secondary, as a tier cap |
| Per client organisation | Moderately | Yes | Partly | Multiple projects under one client | No |

**Primary meter: concurrent active engagements.** **Secondary: respondents per engagement**, expressed
as a generous cap per tier rather than metered billing. Small firms hate variable invoices more than
they hate higher prices, and an unpredictable bill is a renewal conversation you do not want.

---

## 3. Proposed tiers

| | **Solo** | **Practice** | **Firm** | **Enterprise** |
|---|---|---|---|---|
| Price | Free | ~$59/mo | ~$249/mo | Quote |
| Active engagements | 1 | 3 | 10 | Unlimited |
| Consultant seats | 1 | 3 | 10 | Unlimited |
| Client viewer seats | 1 | 5 | Unlimited | Unlimited |
| Respondents per engagement | 40 | 200 | 600 | Unlimited |
| Exports | Trestle-branded | **Firm-branded** | Firm-branded | White-label |
| Requirement pattern library | — | Read seeded only | **Full, promote + reuse** | Full |
| Cross-engagement benchmarking | — | — | — | **Yes** |
| SSO, audit log, data residency | — | — | — | Yes |
| Support | Docs | Email | Priority | Named contact |

**Add-ons, priced to be trivially approvable:** extra active engagement ~$20/mo; extra consultant seat
~$25/mo; onboarding and instrument-setup session ~$150 one-time.

**Who each tier is for.** Solo is the funnel and the honest home for an independent consultant running
one engagement at a time — Dovetail's free tier does the same job. Practice is the two-to-three person
shop, and the branded export is the whole reason they upgrade. **Firm is the target**; everything else
exists to feed it. Enterprise is for a large partner or an in-house transformation office and should be
quoted, not listed.

**Annual.** Two months free on annual, standard. But also offer a **90-day engagement pass** — a one-off
licence for a single engagement at roughly two months of the Practice price. Many partners run two or
three engagements a year and will never hold a subscription; a pass converts them from nothing to
something, and a firm that buys three passes in a year is an easy upgrade conversation.

---

## 4. What to gate — and what must never be gated

Gating is the product decision inside pricing, and two of these are not negotiable.

**Never gate, at any tier:**

- **Anonymity settings.** Charging for respondent privacy is indefensible, and a firm that downgrades
  to a tier without it silently exposes employees who answered honestly on the assumption they were
  anonymous.
- **The five-respondent suppression rule.** Same reasoning. A de-anonymising breakdown must be
  impossible on every plan, including the free one.
- **Export of a client's own data.** Never hold engagement data hostage. It is both wrong and, as §6
  explains, commercially counter-productive.

**Gate freely:**

Concurrent engagements, consultant seats, respondents per engagement, firm branding on exports, the
pattern library, benchmarking, retention depth, API access, SSO and audit logs.

**Watch the respondent cap.** It is the one limit that can damage the product's integrity. Set it so
low that a firm surveys 40 of 300 staff and the readiness score becomes meaningless — and your
research claim goes with it. The Solo cap of 40 is deliberately small enough to be a real engagement
for a micro-client and too small to abuse; if pilot data shows firms sampling badly to stay under a
cap, raise the cap rather than defending the revenue.

---

## 5. The mechanics that decide whether this works

**Define "active" precisely, or the meter is arguable.** An engagement is active from creation until it
is archived. Archiving is free, permanent and reversible only by re-activating into an available slot.

**Archived engagements stay readable forever, on every plan, including free.** This is the single most
important mechanic in this document. It removes the fear that makes small firms refuse subscriptions
("what happens to my client's data when I stop paying?"), it makes downgrades safe rather than
catastrophic, and it means the cap is on *concurrent work*, which is what a firm actually consumes.

**Implement entitlements now, billing later.** Your PRD defers billing correctly. What should exist
before then is the entitlement layer:

```
organization.plan              solo | practice | firm | enterprise
entitlement                    org_id, key, limit_value
  active_engagements, consultant_seats, respondents_per_engagement,
  branded_exports, pattern_library, benchmarking
```

One `assertEntitlement(orgId, key)` helper, called inside the same server-action wrapper that already
checks org membership. A day's work. It means adding Stripe later touches the billing module and
nothing else — instead of retrofitting a limit check into forty call sites.

**Regional pricing.** Your likely first buyers are Philippine and South-East Asian partners who cannot
pay US rates, while an Australian, US or EU partner can pay $249 without blinking. Start USD-only and
let geography sort itself into tiers — PH firms land on Practice, Western firms on Firm. Add explicit
regional pricing only once there is enough volume to justify the arbitrage and support complexity it
creates. Naming this as a deliberate sequencing decision is better than discovering it.

---

## 6. The churn problem, which is specific and serious

**Engagements end.** A firm finishes its projects, has nothing running, and cancels. This is a sharper
version of ordinary SaaS churn because the product's usage is inherently episodic, and it is the
biggest single risk to the business model.

Three responses, in order of strength:

1. **Make the pattern library the reason to stay.** A firm's accumulated requirement patterns,
   instrument templates and question scripts are worth more every year and are lost value on the day
   they leave. This is why the library sits on the Firm tier rather than being a nice-to-have feature:
   it is the retention mechanism. The same logic applies to benchmarking at Enterprise.
2. **Offer a dormant tier.** Roughly $15/month: archives stay readable and editable, the library stays
   intact, no active engagements. A firm between projects stays on the books instead of cancelling, and
   reactivates in one click rather than re-evaluating the purchase.
3. **Sell the pass, not the subscription, to episodic buyers.** §3. Do not fight a firm's usage pattern;
   price for it.

**Do not** respond by locking archives behind payment. It converts a lapsed customer into an angry one,
and in a market this small — ERP partners all know each other — reputation is the distribution channel.

---

## 7. Unit economics, roughly

Costs are low and mostly fixed: Supabase, Vercel, and transactional email for survey invitations. A
300-respondent engagement sends a few hundred emails and stores a few megabytes.

At **20 firms averaging $180/month**, that is roughly **$3,600 MRR** against infrastructure in the low
hundreds. For a side business run alongside contract work, that is a real outcome, and it needs twenty
customers rather than two thousand — which is achievable through a professional network in a way that a
consumer product never is.

The number to watch is not MRR but **engagements started per firm per quarter**. It predicts both
expansion revenue and churn earlier than anything on the invoice.

---

## 8. What to build now — and what not to

**Build:** the `plan` field, the entitlement table, and the single gate helper (§5). Enough to
demonstrate tiering, enforce limits and make the architecture honest.

**Do not build for the capstone:** Stripe integration, dunning, proration, invoice generation, tax
handling, or a self-serve upgrade flow. None of it is your contribution, a panel awards nothing for it,
and it will consume weeks that belong to the evidence chain. Manual invoicing works fine for the first
twenty customers, and doing it by hand teaches you what to automate.

---

## 9. For the capstone

Many programmes expect a commercialisation or cost-benefit section. If yours does, this document is
its source, and three things make it stronger than the usual treatment:

- **Sourced comparables** (§1) rather than invented price points. Show the corridor and the empty band.
- **A named value metric with a justification** (§2) rather than "we will charge per user." Being able to
  explain why per-seat is wrong for this buyer is the kind of answer that reads as understanding rather
  than filling in a template.
- **The ethical gating boundary** (§4). Deciding in advance that anonymity and small-n suppression can
  never be monetised, and saying why, is a genuinely good answer to a question about research ethics in
  a commercial product.

Do not claim the prices are validated. They are not. The honest framing: a pricing structure derived
from published comparables and the buyer's own billing model, to be tested with the pilot firms.
