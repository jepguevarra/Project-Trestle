import { expect, test } from "@playwright/test";
import { addMember, assign, createClient, createEngagement, signUp } from "./fixtures";

// Phase 02 behaviour on the phase 02b screens: clients, engagements, assignment scope, viewer
// read-only, archive, and the getting-started checklist.

test("an admin creates a client and an engagement, and the type is required", async ({ page }) => {
  const { slug } = await signUp(page, "admin");
  await createClient(page, slug, "Harbour Foods");

  await page.goto(`/${slug}/engagements/new`);
  await page.getByLabel("Engagement name").fill("Odoo rollout");
  await page.getByLabel("Client").selectOption({ label: "Harbour Foods" });
  await page.getByLabel("Target system").fill("Odoo 18");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Pick the type of change.")).toBeVisible();
  await expect(page.getByLabel("Engagement name")).toHaveValue("Odoo rollout");

  await page.getByLabel("Type of change").selectOption("packaged_software");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/overview$/);
  await expect(page.getByLabel("Name")).toHaveValue("Odoo rollout");
  await expect(page.getByLabel("Type of change")).toHaveValue("packaged_software");
});

test("a consultant sees only assigned engagements and gets a 404 on the rest", async ({ page, browser }) => {
  const { slug } = await signUp(page, "firm");
  await createClient(page, slug, "Northline");
  const assigned = await createEngagement(page, slug, { client: "Northline", name: "Assigned one", type: "automation", system: "n8n" });
  const other = await createEngagement(page, slug, { client: "Northline", name: "Not theirs", type: "custom_build", system: "Web app" });

  const consultantPage = await browser.newPage();
  const { email } = await signUp(consultantPage, "consultant", { withOrg: false });
  await addMember(slug, email, "consultant");
  await assign(assigned, email, "edit");

  await consultantPage.goto(`/${slug}/engagements`);
  await expect(consultantPage.getByRole("link", { name: "Assigned one" })).toBeVisible();
  await expect(consultantPage.getByRole("link", { name: "Not theirs" })).toHaveCount(0);

  const response = await consultantPage.goto(`/${slug}/engagements/${other}/overview`);
  expect(response?.status()).toBe(404);

  // Edit access: Save appears on the first change and saves.
  await consultantPage.goto(`/${slug}/engagements/${assigned}/overview`);
  await expect(consultantPage.getByRole("button", { name: "Save" })).toHaveCount(0);
  await consultantPage.getByLabel("Target system").fill("n8n cloud");
  await consultantPage.getByRole("button", { name: "Save" }).click();
  await expect(consultantPage.getByText("Saved.")).toBeVisible();
  // The client and type are admin decisions: read-only for the consultant.
  await expect(consultantPage.getByRole("combobox", { name: "Type of change" })).toHaveCount(0);
});

test("a viewer can open an assigned engagement and has nothing to save", async ({ page, browser }) => {
  const { slug } = await signUp(page, "owner");
  await createClient(page, slug, "Meridian");
  const id = await createEngagement(page, slug, { client: "Meridian", name: "Intake automation", type: "automation", system: "Power Automate" });

  const viewerPage = await browser.newPage();
  const { email } = await signUp(viewerPage, "viewer", { withOrg: false });
  await addMember(slug, email, "viewer");
  await assign(id, email, "edit"); // even an `edit` assignment leaves a viewer read-only

  const response = await viewerPage.goto(`/${slug}/engagements/${id}/overview`);
  expect(response?.status()).toBe(200);
  await expect(viewerPage.getByRole("heading", { level: 1, name: "Intake automation" })).toBeVisible();
  await expect(viewerPage.getByRole("textbox")).toHaveCount(0);
  await expect(viewerPage.getByRole("button", { name: /Save|Log|Archive|Develop/ })).toHaveCount(0);

  // The viewer's client list shows only the client of their engagement, with no New button.
  await viewerPage.goto(`/${slug}/clients`);
  await expect(viewerPage.getByRole("link", { name: "Meridian" })).toBeVisible();
  await expect(viewerPage.getByRole("link", { name: "New" })).toHaveCount(0);
});

test("archiving removes an engagement from the active list and leaves it readable", async ({ page }) => {
  const { slug } = await signUp(page, "archiver");
  await createClient(page, slug, "Cebu Coastal");
  const id = await createEngagement(page, slug, { client: "Cebu Coastal", name: "NetSuite migration", type: "platform_migration", system: "NetSuite" });

  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Archive" }).click();
  await expect(page.getByText("Archived. Everything here is read-only")).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);

  await page.goto(`/${slug}/engagements`);
  await expect(page.getByRole("link", { name: "NetSuite migration" })).toHaveCount(0);
  await page.goto(`/${slug}/engagements?f=archived`);
  await page.getByRole("link", { name: "NetSuite migration" }).click();
  await expect(page).toHaveURL(new RegExp(`/engagements/${id}/overview`));

  await page.getByRole("button", { name: "Re-activate" }).click();
  await expect(page.getByLabel("Target system")).toBeEditable();
});

test("a new admin gets a getting-started checklist that tracks progress", async ({ page }) => {
  const { slug } = await signUp(page, "newcomer");
  await expect(page.getByRole("heading", { name: "Getting started" })).toBeVisible();
  await expect(page.getByText("0 of 4 done")).toBeVisible();

  await page.getByRole("link", { name: "Add a client" }).click();
  await expect(page).toHaveURL(new RegExp(`/${slug}/clients/new$`));
  await page.getByLabel("Name").fill("First client");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(new RegExp(`/${slug}/clients/[0-9a-f-]{36}$`));

  await page.goto(`/${slug}`);
  await expect(page.getByText("1 of 4 done")).toBeVisible();
  await expect(page.getByRole("link", { name: "Create an engagement" })).toBeVisible();
});
