import { expect, test } from "@playwright/test";
import { addMember, assign, createClient, createEngagement, signUp } from "./fixtures";

// Phase 02: clients, engagements, assignment scope, viewer read-only, archive.

test("an admin creates a client and an engagement, and the type is required", async ({ page }) => {
  const { slug } = await signUp(page, "admin");
  await createClient(page, slug, "Harbour Foods");

  await page.goto(`/${slug}/engagements`);
  await page.getByLabel("Client").selectOption({ label: "Harbour Foods" });
  await page.getByLabel("Engagement name").fill("Odoo rollout");
  await page.getByLabel("Target system").fill("Odoo 18");
  // Bypass the browser's own `required` check to prove the server enforces it too.
  await page.locator("form:has(#type)").evaluate((f) => f.setAttribute("novalidate", ""));
  await page.getByRole("button", { name: "Create engagement" }).click();
  await expect(page.getByText("Pick the type of change.")).toBeVisible();
  await expect(page.getByLabel("Engagement name")).toHaveValue("Odoo rollout");

  await page.getByLabel("Type of change").selectOption("packaged_software");
  await page.getByRole("button", { name: "Create engagement" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Odoo rollout" })).toBeVisible();
  await expect(page.getByText("Packaged software · Odoo 18")).toBeVisible();
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

  const response = await consultantPage.goto(`/${slug}/engagements/${other}`);
  expect(response?.status()).toBe(404);

  // Edit access: the consultant can save the details of their own engagement.
  await consultantPage.goto(`/${slug}/engagements/${assigned}`);
  await consultantPage.getByLabel("Target system").fill("n8n cloud");
  await consultantPage.getByRole("button", { name: "Save details" }).click();
  await expect(consultantPage.getByText("Saved.")).toBeVisible();
});

test("a viewer can open an assigned engagement and has nothing to save", async ({ page, browser }) => {
  const { slug } = await signUp(page, "owner");
  await createClient(page, slug, "Meridian");
  const id = await createEngagement(page, slug, { client: "Meridian", name: "Intake automation", type: "automation", system: "Power Automate" });

  const viewerPage = await browser.newPage();
  const { email } = await signUp(viewerPage, "viewer", { withOrg: false });
  await addMember(slug, email, "viewer");
  await assign(id, email, "edit"); // even an `edit` assignment leaves a viewer read-only

  const response = await viewerPage.goto(`/${slug}/engagements/${id}`);
  expect(response?.status()).toBe(200);
  await expect(viewerPage.getByRole("heading", { level: 1, name: "Intake automation" })).toBeVisible();
  await expect(viewerPage.getByText("Read only").first()).toBeVisible();
  await expect(viewerPage.getByRole("button")).toHaveText(["Sign out"]);

  // The viewer's client list shows only the client of their engagement.
  await viewerPage.goto(`/${slug}/clients`);
  await expect(viewerPage.getByRole("link", { name: "Meridian" })).toBeVisible();
  await expect(viewerPage.getByRole("button", { name: "Add client" })).toHaveCount(0);
});

test("archiving removes an engagement from the active list and leaves it readable", async ({ page }) => {
  const { slug } = await signUp(page, "archiver");
  await createClient(page, slug, "Cebu Coastal");
  const id = await createEngagement(page, slug, { client: "Cebu Coastal", name: "NetSuite migration", type: "platform_migration", system: "NetSuite" });

  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Archive engagement" }).click();
  await expect(page.getByText("Archived. Everything here is read-only")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save details" })).toHaveCount(0);

  await page.goto(`/${slug}/engagements`);
  await expect(page.getByRole("link", { name: "NetSuite migration" })).toHaveCount(0);
  await page.getByRole("link", { name: "Archived" }).click();
  await page.getByRole("link", { name: "NetSuite migration" }).click();
  await expect(page).toHaveURL(new RegExp(`/engagements/${id}$`));
  await expect(page.getByText("NetSuite", { exact: false }).first()).toBeVisible();

  await page.getByRole("button", { name: "Re-activate engagement" }).click();
  await expect(page.getByRole("button", { name: "Save details" })).toBeVisible();
});
