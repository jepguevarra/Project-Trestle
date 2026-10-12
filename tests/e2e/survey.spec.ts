import { expect, test, type Page } from "@playwright/test";
import { createClient, createEngagement, signUp, smallInstrument, surveyLink, withDb } from "./fixtures";

// Phase 04 acceptance: distribution and response, on the real stack.

async function surveyFor(page: Page, label: string, anonymity: "anonymous" | "identified" = "anonymous") {
  const { slug } = await signUp(page, label);
  await createClient(page, slug, "Harbour Foods");
  const engagementId = await createEngagement(page, slug, { client: "Harbour Foods", name: "Odoo rollout", type: "packaged_software", system: "Odoo 18" });
  const instrumentId = await smallInstrument(engagementId, anonymity);
  return { slug, instrumentId, base: `/${slug}/engagements/${engagementId}/readiness/${instrumentId}` };
}

async function addPeople(page: Page, base: string, list: string) {
  await page.goto(`${base}/respondents/new`);
  await page.getByLabel("Paste a list").fill(list);
  await page.getByRole("button", { name: "Add these people" }).click();
  await expect(page).toHaveURL(new RegExp(`${base}/respondents$`));
}

async function openSurvey(page: Page, base: string) {
  await page.goto(base);
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await page.getByRole("button", { name: "Move to Open" }).click();
  await expect(page.locator('[aria-current="step"]')).toHaveText(/Open$/);
}

const stamp = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

/** Answers and submits through the API, as the page does. */
async function submitByApi(page: Page, link: string, instrumentId: string) {
  const ids = await withDb((sql) => sql<{ id: string; type: string; option: string | null }[]>`
    select q.id, q.type::text, (select o.id from question_option o where o.question_id = q.id order by sort_order limit 1) as option
    from question q where q.instrument_id = ${instrumentId}`);
  const answers = Object.fromEntries(ids.map((q) => [q.id, q.type === "likert_5" ? "4" : q.type === "single_choice" ? q.option! : "Fine."]));
  const res = await page.request.post(`/api/public/survey/${link.split("/").at(-1)}`, { data: { answers } });
  expect(res.status()).toBe(200);
}

test("a respondent with no account answers, leaves, returns, resumes and submits anonymously", async ({ page, browser }) => {
  const { instrumentId, base } = await surveyFor(page, "survey");
  const s = stamp();
  const ann = `ann.${s}@client.test`;

  // A duplicate is rejected, not merged; nothing is imported.
  await page.goto(`${base}/respondents/new`);
  await page.getByLabel("Paste a list").fill(`Ann Lee, ${ann}, Finance, AP clerk, Frontline\nAnn Again, ${ann.toUpperCase()}, Finance, , `);
  await page.getByRole("button", { name: "Add these people" }).click();
  await expect(page.getByText(`Line 2: ${ann} is already on line 1.`)).toBeVisible();

  await addPeople(page, base, `name\temail\tdepartment\trole\tseniority\nAnn Lee\t${ann}\tFinance\tAP clerk\tFrontline\nBen Ode\tben.${s}@client.test\tStores\tPicker\tfrontline`);
  await expect(page.getByText("0 of 2 have answered; 2 not invited yet.")).toBeVisible();

  await openSurvey(page, base);
  await expect(page.getByText("Invitations sent to 2 people.")).toBeVisible();

  // The respondent: a fresh browser with no session, at phone width.
  const ctx = await browser.newContext({ viewport: { width: 375, height: 740 }, hasTouch: true });
  let phone = await ctx.newPage();
  const link = await surveyLink(instrumentId, ann);
  await phone.goto(link);
  await expect(phone.getByText(/Hello Ann Lee\. Your answers are anonymous/)).toBeVisible();
  await expect(phone.getByText("Section 1 of 2")).toBeVisible();
  // One-handed: big targets, no sideways scrolling.
  const next = phone.getByRole("button", { name: "Next" });
  expect((await next.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect((await phone.getByText("Agree", { exact: true }).locator("..").boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await phone.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

  await phone.getByLabel("Agree", { exact: true }).check();
  await next.click();
  await expect(phone.getByText("Section 2 of 2")).toBeVisible();
  await phone.close();

  // Coming back with the same link resumes where they left off, with the answer kept.
  phone = await ctx.newPage();
  await phone.goto(link);
  await expect(phone.getByText("Section 2 of 2")).toBeVisible();
  await phone.getByRole("button", { name: "Back" }).click();
  await expect(phone.getByLabel("Agree", { exact: true })).toBeChecked();
  await phone.getByRole("button", { name: "Next" }).click();
  await phone.getByLabel("North").check();
  await phone.getByLabel(/Anything else/).fill("Month-end is my worry.");
  await phone.getByRole("button", { name: "Submit" }).click();
  await expect(phone.getByText("Your answers have been recorded.")).toBeVisible();
  await phone.screenshot({ path: "test-results/survey-375.png" });

  // The acceptance query: nothing links an answer to Ann.
  const [counts] = await withDb((sql) => sql<{ total: number; linked: number; timed: number }[]>`
    select count(*)::int as total, count(respondent_id)::int as linked, count(answered_at)::int as timed
    from response where instrument_id = ${instrumentId}`);
  expect(counts).toEqual({ total: 3, linked: 0, timed: 0 });
  const [r] = await withDb((sql) => sql<{ completed: boolean }[]>`select completed_at is not null as completed from respondent where email = ${ann}`);
  expect(r!.completed).toBe(true);

  await phone.reload();
  await expect(phone.getByText("You have already submitted your answers. Thank you.")).toBeVisible();

  await page.goto(`${base}/respondents`);
  await expect(page.getByText("1 of 2 have answered.")).toBeVisible();
  await ctx.close();
});

test("bad, revoked and closed links get a plain message; reminders go only to people who have not answered", async ({ page, browser }) => {
  const { instrumentId, base } = await surveyFor(page, "links");
  const s = stamp();
  const [done, waiting] = [`done.${s}@client.test`, `waiting.${s}@client.test`];
  await addPeople(page, base, `Done Person, ${done}\nWaiting Person, ${waiting}`);
  await openSurvey(page, base);

  const respondent = await browser.newPage();
  const doneLink = await surveyLink(instrumentId, done);
  await submitByApi(respondent, doneLink, instrumentId);

  // Tampered and expired links.
  await respondent.goto(doneLink.slice(0, -3) + "abc");
  await expect(respondent.getByText("This survey link is not valid. Check that you used the whole link from your email.")).toBeVisible();
  await respondent.goto(await surveyLink(instrumentId, waiting, { exp: Math.floor(Date.now() / 1000) - 60 }));
  await expect(respondent.getByText("This survey link has expired.")).toBeVisible();
  // A correctly signed link whose respondent is on another instrument.
  const other = await smallInstrument((await withDb((sql) => sql<{ e: string }[]>`select engagement_id as e from instrument where id = ${instrumentId}`))[0]!.e);
  const wrong = await surveyLink(instrumentId, waiting, { claimInstrument: other });
  await respondent.goto(wrong);
  await expect(respondent.getByText(/not valid/)).toBeVisible();

  // The nudge reaches only the person who has not answered.
  await page.goto(base);
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Send reminders" }).click();
  await expect(page.getByText("Reminders sent to 1 person.")).toBeVisible();
  const reminded = await withDb((sql) => sql<{ email: string }[]>`select email from respondent where instrument_id = ${instrumentId} and reminded_at is not null`);
  expect(reminded.map((r) => r.email)).toEqual([waiting]);

  // Revoking: every earlier link stops working; a new one works.
  const oldLink = await surveyLink(instrumentId, waiting);
  await page.getByRole("button", { name: "Revoke links" }).click();
  await expect(page.getByLabel("Changes").getByText(/Survey link version/)).toBeVisible();
  await respondent.goto(oldLink);
  await expect(respondent.getByText("This link has been replaced. Use the link in the most recent email you received.")).toBeVisible();
  const newLink = await surveyLink(instrumentId, waiting);
  await respondent.goto(newLink);
  await expect(respondent.getByText("Section 1 of 2")).toBeVisible();

  // Closing stops the survey.
  await page.getByRole("button", { name: "Closed", exact: true }).click();
  await page.getByRole("button", { name: "Move to Closed" }).click();
  await expect(page.locator('[aria-current="step"]')).toHaveText(/Closed$/);
  await respondent.goto(newLink);
  await expect(respondent.getByText("This survey has closed. Thank you for your interest.")).toBeVisible();
});

test("an identified survey keeps who answered", async ({ page }) => {
  const { instrumentId, base } = await surveyFor(page, "identified", "identified");
  const email = `named.${stamp()}@client.test`;
  await addPeople(page, base, `Named Person, ${email}`);
  await openSurvey(page, base);
  const link = await surveyLink(instrumentId, email);
  await page.goto(link);
  await expect(page.getByText(/Your answers are linked to your name/)).toBeVisible();
  await submitByApi(page, link, instrumentId);
  const rows = await withDb((sql) => sql<{ linked: number; total: number }[]>`
    select count(*)::int as total, count(r.id)::int as linked
    from response x left join respondent r on r.id = x.respondent_id and r.email = ${email}
    where x.instrument_id = ${instrumentId}`);
  expect(rows[0]).toEqual({ total: 3, linked: 3 });
});

test("a forged body cannot write outside the link's own respondent", async ({ page }) => {
  const { instrumentId, base } = await surveyFor(page, "forge");
  const s = stamp();
  const [me, them] = [`me.${s}@client.test`, `them.${s}@client.test`];
  await addPeople(page, base, `Me, ${me}\nThem, ${them}`);
  await openSurvey(page, base);
  const engagementId = (await withDb((sql) => sql<{ e: string }[]>`select engagement_id as e from instrument where id = ${instrumentId}`))[0]!.e;
  const otherInstrument = await smallInstrument(engagementId);
  const [otherQuestion] = await withDb((sql) => sql<{ id: string }[]>`select id from question where instrument_id = ${otherInstrument} limit 1`);
  const [ids] = await withDb((sql) => sql<{ them: string; q: string }[]>`
    select (select id from respondent where email = ${them}) as them,
           (select id from question where instrument_id = ${instrumentId} and type = 'likert_5') as q`);

  const token = (await surveyLink(instrumentId, me)).split("/").at(-1)!;
  const api = `/api/public/survey/${token}`;
  // Naming another respondent, or another instrument's question, is refused.
  for (const answers of [{ respondentId: ids!.them }, { [otherQuestion!.id]: "4" }, { [ids!.q]: "9" }]) {
    const res = await page.request.put(api, { data: { answers, respondentId: ids!.them, instrumentId: otherInstrument } });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe("Your answers could not be saved. Reload the page and try again.");
  }
  // A valid save with extra fields naming someone else writes only to the link's own respondent.
  const ok = await page.request.put(api, { data: { answers: { [ids!.q]: "2" }, respondentId: ids!.them } });
  expect(ok.status()).toBe(200);
  const drafts = await withDb((sql) => sql<{ email: string }[]>`
    select r.email from response_draft d join respondent r on r.id = d.respondent_id where d.instrument_id in (${instrumentId}, ${otherInstrument})`);
  expect(drafts.map((d) => d.email)).toEqual([me]);
});
