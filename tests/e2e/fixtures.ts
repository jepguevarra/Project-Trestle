import { expect, type Page } from "@playwright/test";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: [".env.local", ".env"], quiet: true });

export const PASSWORD = "e2e-password-123";

/** Signs up through the real UI; sign-up creates the org. Returns the address and the org slug. */
export async function signUp(page: Page, label: string, opts: { withOrg?: boolean } = {}) {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const email = `${label}.${stamp}@e2e.test`;
  const withOrg = opts.withOrg ?? true;
  await page.goto(withOrg ? "/signup" : "/signup?invite=e2e");
  if (withOrg) await page.getByLabel("Firm name").fill(`E2E ${label} ${stamp}`);
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  if (withOrg) await expect(page).toHaveURL(new RegExp(`/e2e-${label}-${stamp}$`));
  else await expect(page).toHaveURL(/\/invite\/e2e$/);
  return { email, slug: withOrg ? new URL(page.url()).pathname.slice(1) : "" };
}

/**
 * Arranges data the UI under test does not own (membership, assignment) straight in the database,
 * as the seed does. Uses DATABASE_URL from .env.local.
 */
export async function withDb<T>(fn: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set for the e2e fixtures");
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    return await fn(sql);
  } finally {
    await sql.end();
  }
}

export function addMember(slug: string, email: string, role: "admin" | "consultant" | "viewer") {
  return withDb(
    (sql) => sql`
      insert into membership (org_id, user_id, role)
      select o.id, u.id, ${role} from organization o, auth.users u where o.slug = ${slug} and u.email = ${email}
    `,
  );
}

export function assign(engagementId: string, email: string, access: "edit" | "read") {
  return withDb(
    (sql) => sql`
      insert into engagement_assignment (org_id, engagement_id, user_id, access)
      select e.org_id, e.id, u.id, ${access} from engagement e, auth.users u where e.id = ${engagementId} and u.email = ${email}
    `,
  );
}

/** Creates a client through the UI and returns to wherever the create form redirects. */
export async function createClient(page: Page, slug: string, name: string) {
  await page.goto(`/${slug}/clients`);
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Industry").selectOption("Manufacturing");
  await page.getByLabel("Size").selectOption("small");
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

/** Creates an engagement through the UI; returns its id from the URL it lands on. */
export async function createEngagement(
  page: Page,
  slug: string,
  e: { client: string; name: string; type: string; system: string },
) {
  await page.goto(`/${slug}/engagements`);
  await page.getByLabel("Client").selectOption({ label: e.client });
  await page.getByLabel("Engagement name").fill(e.name);
  await page.getByLabel("Type of change").selectOption(e.type);
  await page.getByLabel("Target system").fill(e.system);
  await page.getByRole("button", { name: "Create engagement" }).click();
  await expect(page.getByRole("heading", { level: 1, name: e.name })).toBeVisible();
  return page.url().split("/").at(-1)!;
}
