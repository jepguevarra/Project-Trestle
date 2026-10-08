import { expect, test, type Page } from "@playwright/test";
import { addMember, assign, createClient, createEngagement, signUp, withDb } from "./fixtures";

// Phase 03 acceptance: the instrument engine, on the real stack.

async function engagementFor(page: Page, label: string) {
  const { slug } = await signUp(page, label);
  await createClient(page, slug, "Harbour Foods");
  const engagementId = await createEngagement(page, slug, { client: "Harbour Foods", name: "Odoo rollout", type: "packaged_software", system: "Odoo 18" });
  return { slug, engagementId, base: `/${slug}/engagements/${engagementId}/readiness` };
}

async function createInstrument(page: Page, base: string, opts: { name: string; template?: string }) {
  await page.goto(`${base}/new`);
  await page.getByLabel("Name").fill(opts.name);
  if (opts.template) await page.getByLabel("Start from").selectOption({ label: opts.template });
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/readiness\/[0-9a-f-]{36}$/);
  return page.url().split("/").at(-1)!;
}

/** Runs a UI step and waits for the server action it triggers to answer (the UI updates optimistically). */
const act = async (page: Page, step: () => Promise<void>) => {
  await Promise.all([page.waitForResponse((r) => r.request().method() === "POST"), step()]);
};

/** Question texts in display order, without their position number. */
const questionTexts = async (page: Page) =>
  (await page.locator("[data-question-id] p.text-sm:first-child").allTextContents()).map((t) => t.replace(/^\d+\.\s*/, ""));

test("a consultant creates an assessment from the shipped template and sees six dimensions and all its questions", async ({ page, browser }) => {
  const { slug, engagementId, base } = await engagementFor(page, "readiness");
  const consultant = await browser.newPage();
  const { email } = await signUp(consultant, "consultant", { withOrg: false });
  await addMember(slug, email, "consultant");
  await assign(engagementId, email, "edit");

  // The engagement's type comes first in the template picker.
  await consultant.goto(`${base}/new`);
  await expect(consultant.getByLabel("Start from").locator("option:checked")).toHaveText("Readiness assessment: packaged software");
  const id = await createInstrument(consultant, base, { name: "Baseline readiness" });

  const [counts] = await withDb(
    (sql) => sql<{ dims: number; qs: number }[]>`
      select (select count(*)::int from dimension where instrument_id = ${id}) as dims,
             (select count(*)::int from question where instrument_id = ${id}) as qs`,
  );
  const { dims, qs } = counts!;
  expect(dims).toBe(6);
  expect(qs).toBeGreaterThanOrEqual(26);

  await expect(consultant.getByRole("link", { name: /6\s*Dimensions/ })).toBeVisible();
  await expect(consultant.getByRole("link", { name: new RegExp(`${qs}\\s*Questions`) })).toBeVisible();
  await consultant.getByRole("link", { name: "Edit questions" }).first().click();
  await expect(consultant.locator("#dimensions li")).toHaveCount(6);
  await expect(consultant.locator("[data-question-id]")).toHaveCount(qs);
});

test("reordering persists across a reload: up/down, sections, and a drag into another section", async ({ page }) => {
  const { base } = await engagementFor(page, "reorder");
  const id = await createInstrument(page, base, { name: "Reorder me" });
  await page.goto(`${base}/${id}/builder`);

  const before = await questionTexts(page);
  await act(page, () => page.getByRole("button", { name: "Move question 1 down" }).click());
  await expect.poll(() => questionTexts(page)).toEqual([before[1], before[0], ...before.slice(2)]);
  await page.reload();
  expect(await questionTexts(page)).toEqual([before[1], before[0], ...before.slice(2)]);

  const sectionTitles = () => page.locator("section[data-section-id] h2").allTextContents();
  const sections = await sectionTitles();
  await act(page, () => page.getByRole("button", { name: /^Move section .* down$/ }).first().click());
  await expect.poll(sectionTitles).toEqual([sections[1]!.replace(/^2\./, "1."), sections[0]!.replace(/^1\./, "2."), ...sections.slice(2)]);
  await page.reload();
  expect(await sectionTitles()).toEqual([sections[1]!.replace(/^2\./, "1."), sections[0]!.replace(/^1\./, "2."), ...sections.slice(2)]);

  // Drag the first question of section 1 onto the first question of section 2. Both must be on
  // screen: a drag that has to scroll is cancelled in headless Chromium.
  await page.setViewportSize({ width: 1280, height: 4000 });
  const first = page.locator("section[data-section-id]").nth(0).locator("[data-question-id]").first();
  const target = page.locator("section[data-section-id]").nth(1).locator("[data-question-id]").first();
  const movedId = await first.getAttribute("data-question-id");
  await act(page, () => first.dragTo(target));
  await expect(page.locator("section[data-section-id]").nth(1).locator("[data-question-id]").first()).toHaveAttribute("data-question-id", movedId!);
  await page.reload();
  await expect(page.locator("section[data-section-id]").nth(1).locator("[data-question-id]").first()).toHaveAttribute("data-question-id", movedId!);
});

test("reverse scoring is settable, and a dimension's weight change keeps every assignment", async ({ page }) => {
  const { base } = await engagementFor(page, "reverse");
  const id = await createInstrument(page, base, { name: "Reverse" });
  await page.goto(`${base}/${id}/builder`);

  const firstId = await page.locator("[data-question-id]").first().getAttribute("data-question-id");
  const reversedNow = async () => (await withDb((sql) => sql<{ r: boolean }[]>`select is_reverse_scored as r from question where id = ${firstId}`))[0]!.r;
  const was = await reversedNow();
  await page.getByRole("button", { name: "Edit question 1", exact: true }).click();
  const box = page.getByLabel("Reverse-scored");
  if (was) await box.uncheck();
  else await box.check();
  await act(page, () => page.getByRole("button", { name: "Save question" }).click());
  await expect(page.getByRole("group", { name: "Edit question" })).toHaveCount(0);
  await page.reload();
  expect(await reversedNow()).toBe(!was);
  await expect(page.locator(`[data-question-id="${firstId}"]`)).toContainText(was ? "Agreement, 5 points" : "reverse-scored");

  const assignments = () => withDb((sql) => sql`select id, dimension_id from question where instrument_id = ${id} order by id`);
  const beforeAssign = await assignments();
  const weight = page.locator("#dimensions li").first().getByLabel("Weight");
  await weight.fill("2.5");
  await page.locator("#dimensions li").first().getByRole("button", { name: "Save" }).click();
  await expect.poll(async () => (await withDb((sql) => sql<{ w: number }[]>`select min(weight)::float as w from dimension where instrument_id = ${id} and weight > 1`))[0]!.w).toBe(2.5);
  expect(await assignments()).toEqual(beforeAssign);
});

test("every question type renders in the preview at phone width, and nothing is saved", async ({ page }) => {
  const { base } = await engagementFor(page, "types");
  const id = await createInstrument(page, base, { name: "All types", template: "Blank: no questions yet" });

  // A blank instrument cannot open.
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page.getByText("Add at least one question.")).toBeVisible();
  await page.getByRole("button", { name: "Move to Open" }).click();
  await expect(page.getByText("An instrument needs at least one question before it can open.")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();

  await page.goto(`${base}/${id}/builder`);
  await page.getByLabel("New dimension").fill("Leadership");
  await page.getByRole("button", { name: "Add dimension" }).click();
  await expect(page.locator("#dimensions li")).toHaveCount(1);

  const add = async (type: string, text: string, options?: string[]) => {
    await page.getByRole("button", { name: "Add question" }).click();
    const editor = page.getByRole("group", { name: "New question" });
    await editor.getByLabel("Question text").fill(text);
    await editor.getByLabel("Type").selectOption(type);
    if (options) {
      for (const [i, label] of options.entries()) {
        if (i >= 2) await editor.getByRole("button", { name: "Add option" }).click();
        await editor.getByLabel(`Option ${i + 1} label`).fill(label);
      }
    }
    await editor.getByRole("button", { name: "Add question" }).click();
    await expect(page.getByText(text)).toBeVisible();
  };
  await add("likert_5", "Leaders explain why we are changing.");
  await add("likert_7", "I know what will change in my job.");
  await add("single_choice", "Which site do you work at?", ["North", "South"]);
  await add("multi_choice", "Which modules will you use?", ["Sales", "Inventory", "Accounting"]);
  await add("open_text", "What worries you most?");
  await add("numeric", "How many years have you worked here?");

  // A choice question with one option is refused.
  await page.getByRole("button", { name: "Add question" }).click();
  const editor = page.getByRole("group", { name: "New question" });
  await editor.getByLabel("Question text").fill("Broken choice");
  await editor.getByLabel("Type").selectOption("single_choice");
  await editor.getByLabel("Option 1 label").fill("Only one");
  await editor.getByRole("button", { name: "Remove option 2" }).click();
  await editor.getByRole("button", { name: "Add question" }).click();
  await expect(page.getByText("A choice question needs at least two options.")).toBeVisible();

  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(`${base}/${id}/preview`);
  for (const type of ["likert_5", "likert_7", "single_choice", "multi_choice", "open_text", "numeric"]) {
    await expect(page.locator(`[data-question-type="${type}"]`)).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.screenshot({ path: "test-results/preview-375.png", fullPage: true });

  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("6 required questions are unanswered.")).toBeVisible();
  await page.getByLabel("Agree", { exact: true }).first().check();
  await page.getByLabel("Somewhat agree").check();
  await page.getByLabel("North").check();
  await page.getByLabel("Sales").check();
  await page.getByLabel("Inventory").check();
  await page.getByLabel(/What worries you most/).fill("Month-end.");
  await page.getByLabel(/How many years/).fill("4");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Preview only: nothing was saved.")).toBeVisible();
});

test("once open, the questions and anonymity are fixed and it never returns to draft", async ({ page }) => {
  const { base } = await engagementFor(page, "freeze");
  const id = await createInstrument(page, base, { name: "Freeze" });
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await page.getByRole("button", { name: "Move to Open" }).click();
  await expect(page.locator('[aria-current="step"]')).toHaveText(/Open$/);
  await expect(page.getByText(/Its questions and anonymity are fixed/)).toBeVisible();
  await expect(page.getByLabel("Anonymity")).toHaveCount(0);

  await page.getByRole("button", { name: "Draft", exact: true }).click();
  await page.getByRole("button", { name: "Move to Draft" }).click();
  await expect(page.getByText(/never goes back to draft/)).toBeVisible();

  await page.goto(`${base}/${id}/builder`);
  await expect(page.getByText(/its questions are fixed/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Add question" })).toHaveCount(0);

  // Tracked in the chatter.
  await page.goto(`${base}/${id}`);
  await expect(page.getByLabel("Changes").getByText(/Status/)).toBeVisible();
});
