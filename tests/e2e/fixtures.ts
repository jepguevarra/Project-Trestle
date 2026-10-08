import { expect, type Page } from "@playwright/test";
import { config } from "dotenv";
import postgres from "postgres";
import { deriveSurveyKey, mintSurveyToken } from "../../lib/tokens/survey";

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

/** Creates a client through the New form; returns its id from the URL it lands on. */
export async function createClient(page: Page, slug: string, name: string) {
  await page.goto(`/${slug}/clients/new`);
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Industry").selectOption("Manufacturing");
  await page.getByLabel("Size").selectOption("small");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(new RegExp(`/${slug}/clients/[0-9a-f-]{36}$`));
  return page.url().split("/").at(-1)!;
}

/** Creates an engagement through the New form; returns its id from the URL it lands on. */
export async function createEngagement(
  page: Page,
  slug: string,
  e: { client: string; name: string; type: string; system: string },
) {
  await page.goto(`/${slug}/engagements/new`);
  await page.getByLabel("Engagement name").fill(e.name);
  await page.getByLabel("Client").selectOption({ label: e.client });
  await page.getByLabel("Type of change").selectOption(e.type);
  await page.getByLabel("Target system").fill(e.system);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/engagements\/[0-9a-f-]{36}\/overview$/);
  return page.url().split("/").at(-2)!;
}

/** Inserts engagements straight into the database (for paging and grouping tests). */
export function insertEngagements(slug: string, clientName: string, names: string[]) {
  return withDb(async (sql) => {
    const [c] = await sql<{ id: string; org_id: string }[]>`
      insert into client (org_id, name) select o.id, ${clientName} from organization o where o.slug = ${slug}
      returning id, org_id`;
    for (const name of names) {
      await sql`insert into engagement (org_id, client_id, name, type, target_system)
                values (${c!.org_id}, ${c!.id}, ${name}, 'automation', 'n8n')`;
    }
    return c!.id;
  });
}

export function trackingMessages(engagementId: string) {
  return withDb((sql) => sql<{ tracking: { field: string; label: string; old: string | null; new: string | null }[] }[]>`
    select tracking from record_message where res_id = ${engagementId} and kind = 'tracking' order by created_at`);
}

/**
 * A small instrument straight in the database: two sections, a required agreement question, a
 * required single choice (North/South) and an optional open question. Returns its id.
 */
export function smallInstrument(engagementId: string, anonymity: "anonymous" | "identified" = "anonymous") {
  return withDb(async (sql) => {
    const [i] = await sql<{ id: string; org_id: string }[]>`
      insert into instrument (org_id, engagement_id, name, kind, anonymity)
      select org_id, id, 'Pulse check', 'readiness', ${anonymity} from engagement where id = ${engagementId}
      returning id, org_id`;
    const scope = { org: i!.org_id, inst: i!.id };
    const [d] = await sql<{ id: string }[]>`insert into dimension (org_id, engagement_id, instrument_id, name)
      values (${scope.org}, ${engagementId}, ${scope.inst}, 'Leadership') returning id`;
    const [s1, s2] = await sql<{ id: string }[]>`insert into section (org_id, engagement_id, instrument_id, title, sort_order)
      values (${scope.org}, ${engagementId}, ${scope.inst}, 'About leadership', 0), (${scope.org}, ${engagementId}, ${scope.inst}, 'About you', 1)
      returning id`;
    await sql`insert into question (org_id, engagement_id, instrument_id, section_id, dimension_id, text, type, sort_order)
      values (${scope.org}, ${engagementId}, ${scope.inst}, ${s1!.id}, ${d!.id}, 'Leaders are committed to this change.', 'likert_5', 0)`;
    const [choice] = await sql<{ id: string }[]>`insert into question (org_id, engagement_id, instrument_id, section_id, dimension_id, text, type, sort_order)
      values (${scope.org}, ${engagementId}, ${scope.inst}, ${s2!.id}, ${d!.id}, 'Which site do you work at?', 'single_choice', 1) returning id`;
    await sql`insert into question_option (org_id, engagement_id, instrument_id, question_id, label, value, sort_order)
      values (${scope.org}, ${engagementId}, ${scope.inst}, ${choice!.id}, 'North', 1, 0), (${scope.org}, ${engagementId}, ${scope.inst}, ${choice!.id}, 'South', 2, 1)`;
    await sql`insert into question (org_id, engagement_id, instrument_id, section_id, text, type, is_required, sort_order)
      values (${scope.org}, ${engagementId}, ${scope.inst}, ${s2!.id}, 'Anything else?', 'open_text', false, 2)`;
    return i!.id;
  });
}

/** A respondent's link, minted exactly as the server does (same key, current versions). */
export async function surveyLink(instrumentId: string, email: string, opts: { exp?: number; claimInstrument?: string } = {}) {
  const row = await withDb(
    (sql) => sql<{ r: string; v: number; e: number }[]>`
      select r.id as r, r.token_version as v, i.token_epoch as e
      from respondent r join instrument i on i.id = r.instrument_id
      where r.instrument_id = ${instrumentId} and r.email = ${email.toLowerCase()}`,
  );
  const { r, v, e } = row[0]!;
  const key = deriveSurveyKey(process.env.SURVEY_TOKEN_SECRET || undefined, process.env.DATABASE_URL!);
  const token = mintSurveyToken({ r, i: opts.claimInstrument ?? instrumentId, v, e, exp: opts.exp ?? Math.floor(Date.now() / 1000) + 3600 }, key);
  return `/survey/${token}`;
}
