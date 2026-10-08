import { expect, test } from "@playwright/test";
import { PASSWORD, signUp } from "./fixtures";

// Phase 01 flows, per ARCHITECTURE.md's E2E list: sign up and create an org. Needs `supabase start`
// with email confirmation off (the local default) so sign-up signs the user straight in.

test("signing up creates an organisation and lands in it as owner", async ({ page }) => {
  const { email } = await signUp(page, "owner");
  await expect(page.getByText(`${email} · Owner`)).toBeVisible();
});

test("a signed-in non-member gets a 404 at another organisation", async ({ browser }) => {
  const a = await browser.newPage();
  const { slug } = await signUp(a, "tenant-a");

  const b = await browser.newPage();
  await signUp(b, "tenant-b");
  const response = await b.goto(`/${slug}`);
  expect(response?.status()).toBe(404);
  await expect(b.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("an owner invites a member and sees the invitation pending", async ({ page }) => {
  const { slug } = await signUp(page, "inviter");
  await page.goto(`/${slug}/settings/members`);
  const invitee = `invitee.${Date.now()}@e2e.test`;
  await page.getByLabel("Email").fill(invitee);
  await page.getByLabel("Role", { exact: true }).selectOption("viewer");
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expect(page.getByText(`Invitation sent to ${invitee}.`)).toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: "Pending invitations" }).getByText(invitee)).toBeVisible();
});

test("a failed sign-in keeps the email filled in, and the right password then works", async ({ page }) => {
  const { email, slug } = await signUp(page, "returning");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Email or password is incorrect.")).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue(email);
  await expect(page.getByLabel("Password")).toHaveValue("");

  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(new RegExp(`/${slug}$`));
});
