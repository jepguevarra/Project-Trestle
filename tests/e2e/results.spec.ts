import { deflateSync } from "node:zlib";
import { expect, test, type Page } from "@playwright/test";
import { createClient, createEngagement, pdfText, seedBaselineFor, signUp, withDb } from "./fixtures";

// Phase 05 acceptance: scoring and the report, on the real stack and the seed's own data generator.

async function baseline(page: Page, label: string) {
  const { slug, email } = await signUp(page, label);
  await createClient(page, slug, "Harbour Foods Distribution");
  const engagementId = await createEngagement(page, slug, { client: "Harbour Foods Distribution", name: "Odoo 18 rollout", type: "packaged_software", system: "Odoo 18" });
  const instrumentId = await seedBaselineFor(engagementId, email);
  return { slug, instrumentId, base: `/${slug}/engagements/${engagementId}/readiness/${instrumentId}/results` };
}

/** A 1×1 PNG, built by hand. */
function tinyPng() {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (b: Buffer) => {
    let c = 0xffffffff;
    for (const x of b) c = crcTable[(c ^ x) & 0xff]! ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const ihdr = Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.from([0, 0x2f, 0x5b, 0x73]))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

test("a hand-computed dimension score matches the dashboard, with spread and alpha beside every mean", async ({ page }) => {
  const { instrumentId, base } = await baseline(page, "results");

  // Worked independently of lib/scoring, in SQL: each answer to 0–100 (reverse-worded flipped),
  // each person's mean over the dimension's questions they answered, then the mean of those.
  const rows = await withDb((sql) => sql<{ name: string; score: string }[]>`
    with item as (
      select r.submission_id, q.dimension_id,
             case when q.is_reverse_scored then 100 - (r.value_numeric - 1) * 25 else (r.value_numeric - 1) * 25 end as s
      from response r join question q on q.id = r.question_id
      where r.instrument_id = ${instrumentId} and q.type = 'likert_5'
    ), person as (
      select submission_id, dimension_id, avg(s) as s from item group by submission_id, dimension_id
    )
    select d.name, to_char(round(avg(p.s), 1), 'FM990.0') as score
    from person p join dimension d on d.id = p.dimension_id group by d.name, d.sort_order order by d.sort_order`);
  expect(rows).toHaveLength(6);

  await page.goto(base);
  const table = page.getByRole("table").first();
  for (const r of rows) {
    const row = table.getByRole("row", { name: new RegExp(`^${r.name.replace(/[&]/g, "\\$&")}`) });
    const cells = row.getByRole("cell");
    await expect(cells.nth(1)).toHaveText(r.score);
    // Dispersion beside every mean, and alpha for every dimension.
    await expect(cells.nth(2)).toHaveText(/^\d+\.\d$/);
    await expect(cells.nth(4)).toHaveText(/^\d\.\d\d$/);
  }

  // Alpha is shown even below 0.70, with the reading in words.
  await page.goto(`${base}?tab=reliability`);
  await expect(page.getByRole("row", { name: /Leadership & Sponsorship .* Below 0\.70/ })).toBeVisible();
});

test("small groups show a reason, judged on the intersection of filters", async ({ page }) => {
  const { base } = await baseline(page, "segments");

  // Purchasing has four submissions: a reason, not a blank or a zero.
  await page.goto(`${base}?tab=segments`);
  await expect(page.getByRole("row", { name: /^Purchasing 4 Hidden to protect anonymity: this group has 4 responses/ })).toBeVisible();

  // Warehouse alone (8) and frontline alone (19) are both shown...
  await page.getByRole("combobox", { name: "Department" }).selectOption("Warehouse");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText(/Selected group: 8 responses/)).toBeVisible();
  await page.goto(`${base}?tab=segments&seniority=frontline`);
  await expect(page.getByText(/Selected group: 19 responses/)).toBeVisible();
  // ...but Warehouse frontline together is four people, so it is hidden.
  await page.getByRole("combobox", { name: "Department" }).selectOption("Warehouse");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText("Hidden to protect anonymity: the selected group has 4 responses, and results are shown only for groups of 5 or more.")).toBeVisible();
  await expect(page.getByText(/Selected group:/)).toHaveCount(0);
});

test("open answers, narrative and the PDF with the firm's logo: a full run with no Word or Excel", async ({ page }) => {
  const { slug, base, instrumentId } = await baseline(page, "report");

  // The logo, on the firm's branding page.
  await page.goto(`/${slug}/settings/branding`);
  await page.locator("#logo").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: tinyPng() });
  await page.getByRole("button", { name: "Upload" }).click();
  await expect(page.getByText("Logo saved. It appears on exported reports.")).toBeVisible();

  // Tag an open answer with a theme.
  await page.goto(`${base}?tab=text`);
  const first = page.getByRole("listitem").filter({ has: page.getByLabel("Add a theme") }).first();
  await first.getByLabel("Add a theme").fill("Training time");
  await first.getByRole("button", { name: "Tag" }).click();
  await expect(page.getByText(/Themes: Training time \(1\)/)).toBeVisible();

  // Narrative blocks.
  await page.goto(`${base}?tab=narrative`);
  await page.getByLabel("Summary").fill("Readiness is moderate; warehouse staff need the most support.");
  await page.getByRole("button", { name: "Save summary" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await page.getByLabel("Recommendations").fill("Release pickers for two practice sessions before go-live.");
  await page.getByRole("button", { name: "Save recommendations" }).click();
  await page.reload();
  await expect(page.getByLabel("Summary")).toHaveValue("Readiness is moderate; warehouse staff need the most support.");

  // The PDF: a real PDF, with an image (the logo), the dimension table, the lowest items and the narrative.
  const res = await page.request.get(`/api/exports/readiness/${instrumentId}`);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("application/pdf");
  const pdf = Buffer.from(await res.body());
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  expect(pdf.toString("latin1")).toContain("/Subtype /Image");
  const text = pdfText(pdf).replace(/\s+/g, "");
  for (const s of [
    "Readinessindex",
    "Dimensions",
    "Resources&Capacity",
    "Lowest-scoringquestions",
    "Readinessismoderate;warehousestaffneedthemostsupport.",
    "Releasepickersfortwopracticesessionsbeforego-live.",
  ]) {
    expect(text).toContain(s);
  }
});

test("an anonymous assessment with fewer than five submissions shows nothing but the reason", async ({ page }) => {
  const { base, instrumentId } = await baseline(page, "few");
  // Keep four submissions: delete the rest, as if only four people had answered.
  await withDb((sql) => sql`
    delete from response where instrument_id = ${instrumentId} and submission_id not in (
      select submission_id from response where instrument_id = ${instrumentId} group by submission_id order by submission_id limit 4)`);
  await page.goto(base);
  await expect(page.getByText("Hidden to protect anonymity: this assessment has 4 responses, and results are shown only for groups of 5 or more.")).toBeVisible();
  await expect(page.getByTestId("readiness-index")).toHaveText(/^—/);
  await page.goto(`${base}?tab=text`);
  await expect(page.getByText(/this assessment has 4 responses/)).toBeVisible();
});
