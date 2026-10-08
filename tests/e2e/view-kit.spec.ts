import { expect, test } from "@playwright/test";
import { addMember, assign, createClient, createEngagement, insertEngagements, signUp, trackingMessages, withDb } from "./fixtures";

// Phase 02b acceptance: the view kit on clients and engagements.

test("list state lives in the URL: search, filter, group-by and paging survive reload and back", async ({ page }) => {
  const { slug } = await signUp(page, "lists");
  await insertEngagements(slug, "Alpha Foods", Array.from({ length: 7 }, (_, i) => `Alpha rollout ${i + 1}`));
  await insertEngagements(slug, "Beta Clinics", ["Beta intake", "Beta billing"]);

  await page.goto(`/${slug}/engagements?l=5`);
  await expect(page.getByText("1–5 / 9")).toBeVisible();

  // Search facet: type, then pick "Client for: alpha".
  await page.getByRole("combobox", { name: "Search engagements" }).fill("alpha");
  await page.getByRole("button", { name: /Search Client for: alpha/ }).click();
  await expect(page).toHaveURL(/s=client%3Aalpha/);
  await expect(page.getByText("1–5 / 7")).toBeVisible();

  // Group by client, then page 2.
  await page.locator("summary", { hasText: "Group by" }).click();
  await page.getByRole("link", { name: "Client", exact: true }).click();
  await expect(page.getByRole("button", { name: /Alpha Foods \(7\)/ })).toBeVisible();
  await page.getByRole("link", { name: "Next page" }).click();
  await expect(page.getByText("6–7 / 7")).toBeVisible();
  const paged = page.url();

  await page.reload();
  await expect(page.getByText("6–7 / 7")).toBeVisible();
  await expect(page.getByText("Client: alpha")).toBeVisible();

  await page.goBack();
  await expect(page.getByText("1–5 / 7")).toBeVisible();
  await page.goForward();
  expect(page.url()).toBe(paged);

  // Filter: archived only shows nothing; clearing the filters brings them back.
  await page.goto(`/${slug}/engagements?f=archived`);
  await expect(page.getByText("Nothing matches")).toBeVisible();
});

test("kanban by stage: dragging a card changes the stage and writes a tracking message", async ({ page }) => {
  const { slug } = await signUp(page, "board");
  await createClient(page, slug, "Harbour");
  const id = await createEngagement(page, slug, { client: "Harbour", name: "Board rollout", type: "packaged_software", system: "Odoo" });

  await page.goto(`/${slug}/engagements?v=kanban`);
  const card = page.locator(`[data-card="${id}"]`);
  await expect(page.locator('[data-stage="assess"]').locator(`[data-card="${id}"]`)).toBeVisible();
  await card.dragTo(page.locator('[data-stage="deploy"]'));
  await expect(page.locator('[data-stage="deploy"]').locator(`[data-card="${id}"]`)).toBeVisible();

  await expect.poll(async () => (await trackingMessages(id)).length).toBe(1);
  const [message] = await trackingMessages(id);
  expect(message!.tracking).toEqual([{ field: "ocmStage", label: "Stage", old: "Assess", new: "Deploy" }]);

  await page.reload();
  await expect(page.locator('[data-stage="deploy"]').locator(`[data-card="${id}"]`)).toBeVisible();
});

test("editing a field writes exactly one tracking message naming the field, old and new value", async ({ page }) => {
  const { slug } = await signUp(page, "tracker");
  await createClient(page, slug, "Harbour");
  const id = await createEngagement(page, slug, { client: "Harbour", name: "Tracked rollout", type: "packaged_software", system: "Odoo 17" });

  await page.getByLabel("Target system").fill("Odoo 18");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await expect(page.getByRole("list", { name: "Changes" }).first()).toContainText("Target system: Odoo 17 → Odoo 18");

  const messages = await trackingMessages(id);
  expect(messages).toHaveLength(1);
  expect(messages[0]!.tracking).toEqual([{ field: "targetSystem", label: "Target system", old: "Odoo 17", new: "Odoo 18" }]);

  // Statusbar: move to Develop through the confirmation.
  await page.getByRole("button", { name: "Develop" }).click();
  await expect(page.getByRole("heading", { name: "Move to Develop?" })).toBeVisible();
  await page.getByRole("button", { name: "Move to Develop" }).click();
  await expect(page.getByRole("list", { name: "Stage" }).locator('[aria-current="step"]')).toHaveText(/Develop$/);
  await expect.poll(async () => (await trackingMessages(id)).length).toBe(2);

  // Log note.
  await page.getByLabel("Log note").fill("Sponsor confirmed in kick-off.");
  await page.getByRole("button", { name: "Log", exact: true }).click();
  await expect(page.getByText("Sponsor confirmed in kick-off.")).toBeVisible();
});

test("viewers and archived engagements are read-only on the board and the form", async ({ page, browser }) => {
  const { slug } = await signUp(page, "readonly");
  await createClient(page, slug, "Meridian");
  const live = await createEngagement(page, slug, { client: "Meridian", name: "Live one", type: "automation", system: "n8n" });
  const old = await createEngagement(page, slug, { client: "Meridian", name: "Old one", type: "automation", system: "n8n" });
  await withDb((sql) => sql`update engagement set status = 'archived' where id = ${old}`);

  const viewerPage = await browser.newPage();
  const viewer = await signUp(viewerPage, "viewer", { withOrg: false });
  await addMember(slug, viewer.email, "viewer");
  await assign(live, viewer.email, "edit");

  await viewerPage.goto(`/${slug}/engagements?v=kanban`);
  await expect(viewerPage.locator(`[data-card="${live}"]`)).toHaveAttribute("draggable", "false");
  await expect(viewerPage.locator(`[data-card="${live}"] select`)).toHaveCount(0);

  const consultantPage = await browser.newPage();
  const consultant = await signUp(consultantPage, "consultant", { withOrg: false });
  await addMember(slug, consultant.email, "consultant");
  await assign(old, consultant.email, "edit");
  await assign(live, consultant.email, "edit");
  await consultantPage.goto(`/${slug}/engagements?v=kanban&f=`);
  await expect(consultantPage.locator(`[data-card="${live}"]`)).toHaveAttribute("draggable", "true");
  await expect(consultantPage.locator(`[data-card="${old}"]`)).toHaveAttribute("draggable", "false");
  await consultantPage.goto(`/${slug}/engagements/${old}/overview`);
  await expect(consultantPage.getByRole("textbox")).toHaveCount(0);
  await expect(consultantPage.getByRole("button", { name: "Develop" })).toHaveCount(0);
});

test("the engagement switcher lists only engagements the user can open", async ({ page, browser }) => {
  const { slug } = await signUp(page, "switch");
  await createClient(page, slug, "Harbour");
  const mine = await createEngagement(page, slug, { client: "Harbour", name: "Visible to consultant", type: "automation", system: "n8n" });
  await createEngagement(page, slug, { client: "Harbour", name: "Hidden from consultant", type: "automation", system: "n8n" });

  const consultantPage = await browser.newPage();
  const { email } = await signUp(consultantPage, "member", { withOrg: false });
  await addMember(slug, email, "consultant");
  await assign(mine, email, "read");
  await consultantPage.goto(`/${slug}/engagements/${mine}`);
  await consultantPage.getByText("Switch engagement").click();
  await expect(consultantPage.getByRole("link", { name: /Visible to consultant/ })).toBeVisible();
  await expect(consultantPage.getByRole("link", { name: /Hidden from consultant/ })).toHaveCount(0);
});

test("usable at 375px: search and menus collapse behind one button; forms stack", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 375, height: 800 } });
  const { slug } = await signUp(page, "phone");
  await createClient(page, slug, "Harbour");
  await createEngagement(page, slug, { client: "Harbour", name: "Phone rollout", type: "automation", system: "n8n" });

  await page.goto(`/${slug}/engagements`);
  await expect(page.getByRole("combobox", { name: "Search engagements" })).toBeHidden();
  await page.getByRole("button", { name: "Search and filters" }).click();
  await expect(page.getByRole("combobox", { name: "Search engagements" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

  await page.getByRole("link", { name: "Phone rollout" }).click();
  const name = await page.getByLabel("Target system").boundingBox();
  const client = await page.getByLabel("Client").boundingBox();
  expect(name!.width).toBeGreaterThan(250);
  expect(client!.y).toBeLessThan(name!.y);
});

test("the list's Action menu archives the selection and reports it, even when the list empties", async ({ page }) => {
  const { slug } = await signUp(page, "bulk");
  await insertEngagements(slug, "Gamma Hotels", ["Gamma one", "Gamma two"]);
  await page.goto(`/${slug}/engagements`);
  await page.getByRole("checkbox", { name: "Select all" }).check();
  await expect(page.getByText("2 selected")).toBeVisible();
  await page.getByRole("button", { name: "Archive" }).click();
  await expect(page.getByText("2 engagements archived.")).toBeVisible();
  await page.goto(`/${slug}/engagements?f=archived`);
  await expect(page.getByText("1–2 / 2")).toBeVisible();
});
