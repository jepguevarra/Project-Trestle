import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createInstrumentFromDefinition } from "@/lib/db/mutations/instruments";
import { saveDrafts, submitSurvey } from "@/lib/db/mutations/survey";
import { withSurveyOn } from "@/lib/db/survey-role";
import type { InstrumentDefinition } from "@/lib/instruments/definition";
import { client, engagement, instrument, membership, orgBranding, question, reportNarrative, respondent, response, responseDraft, responseTheme } from "@/lib/db/schema";
import { asUser, connect, createTwoTenants, createUser, expectCrossTenantDenied, expectPgError, RLS_VIOLATION, uniqueEmail, type Harness } from "./harness";

// Phase 05: report narrative, open-text themes, the firm's logo, and submission duration.

let h: Harness;
let t: Awaited<ReturnType<typeof createTwoTenants>>;

const definition = {
  dimensions: [{ key: "lead", name: "Leadership", weight: 1 }],
  sections: [
    {
      title: "One",
      questions: [
        { text: "Leaders are committed.", type: "likert_5", dimension: "lead", weight: 1, required: true, reverse: false },
        { text: "Anything else?", type: "open_text", weight: 1, required: false, reverse: false },
      ],
    },
  ],
} as InstrumentDefinition;

beforeAll(async () => {
  h = connect();
  t = await createTwoTenants(h.db);
});
afterAll(() => h.end());

/** An open instrument with one submitted answer set, including an open-text answer. */
async function setup(orgId: string) {
  const [c] = await h.db.insert(client).values({ orgId, name: "Client" }).returning();
  const [e] = await h.db.insert(engagement).values({ orgId, clientId: c!.id, name: "E", type: "packaged_software", targetSystem: "Odoo" }).returning();
  const inst = await h.db.transaction((tx) =>
    createInstrumentFromDefinition(tx, { orgId, engagementId: e!.id }, { name: "Survey", kind: "readiness", templateId: null, createdBy: t.userA.id }, definition),
  );
  await h.db.update(instrument).set({ status: "open" }).where(eq(instrument.id, inst.id));
  const scope = { orgId, engagementId: e!.id, instrumentId: inst.id };
  const [r] = await h.db.insert(respondent).values({ ...scope, email: uniqueEmail("r") }).returning();
  const qs = await h.db.select().from(question).where(eq(question.instrumentId, inst.id)).orderBy(question.sortOrder);
  await withSurveyOn(h.db, { respondentId: r!.id, instrumentId: inst.id }, async (tx) => {
    await saveDrafts(
      tx,
      { ...scope, respondentId: r!.id },
      [
        { questionId: qs[0]!.id, valueNumeric: 4, valueText: null, optionIds: null },
        { questionId: qs[1]!.id, valueNumeric: null, valueText: "Training time worries me.", optionIds: null },
      ],
      [],
    );
    // Pretend they started four minutes ago.
    await tx.execute(sql`update public.response_draft set created_at = now() - interval '4 minutes'`);
    await submitSurvey(tx);
  });
  const [text] = await h.db.select().from(response).where(eq(response.questionId, qs[1]!.id));
  return { scope, respondentId: r!.id, textResponse: text! };
}

describe("cross-tenant isolation: user in org A against org B", () => {
  it("report_narrative", async () => {
    const b = await setup(t.orgB.id);
    const [row] = await h.db.insert(reportNarrative).values({ ...b.scope, key: "summary", body: "B's summary" }).returning();
    await expectCrossTenantDenied(h.db, {
      actor: t.userA,
      table: reportNarrative,
      targetId: row!.id,
      insertRow: { ...b.scope, key: "findings", body: "Forged" },
      updateSet: { body: "Edited by A" },
    });
  });

  it("response_theme", async () => {
    const b = await setup(t.orgB.id);
    const [row] = await h.db.insert(responseTheme).values({ ...b.scope, responseId: b.textResponse.id, theme: "Training" }).returning();
    await expectCrossTenantDenied(h.db, {
      actor: t.userA,
      table: responseTheme,
      targetId: row!.id,
      insertRow: { ...b.scope, responseId: b.textResponse.id, theme: "Forged" },
      updateSet: { theme: "Edited" },
    });
  });

  it("org_branding", async () => {
    await h.db.insert(orgBranding).values({ orgId: t.orgB.id, logo: Buffer.from("png"), logoType: "image/png" }).onConflictDoNothing();
    expect(await asUser(h.db, t.userA, (tx) => tx.select().from(orgBranding).where(eq(orgBranding.orgId, t.orgB.id)))).toHaveLength(0);
    await expectPgError(
      asUser(h.db, t.userA, (tx) => tx.insert(orgBranding).values({ orgId: t.orgB.id, logo: Buffer.from("x"), logoType: "image/png" })),
      RLS_VIOLATION,
    );
    const changed = await asUser(h.db, t.userA, (tx) =>
      tx.update(orgBranding).set({ logoType: "image/jpeg" }).where(eq(orgBranding.orgId, t.orgB.id)).returning(),
    );
    expect(changed).toHaveLength(0);
    const deleted = await asUser(h.db, t.userA, (tx) => tx.delete(orgBranding).where(eq(orgBranding.orgId, t.orgB.id)).returning());
    expect(deleted).toHaveLength(0);
  });
});

describe("within an org", () => {
  it("a theme cannot point at another instrument's answer", async () => {
    const a = await setup(t.orgA.id);
    const other = await setup(t.orgA.id);
    await expectPgError(
      asUser(h.db, t.userA, (tx) => tx.insert(responseTheme).values({ ...a.scope, responseId: other.textResponse.id, theme: "Mixed" })),
      "23503",
    );
  });

  it("viewers read the report but cannot write it; only admins change the logo", async () => {
    const a = await setup(t.orgA.id);
    const viewer = await createUser(h.db, { email: uniqueEmail("viewer") });
    const consultant = await createUser(h.db, { email: uniqueEmail("consultant") });
    await h.db.insert(membership).values([
      { orgId: t.orgA.id, userId: viewer.id, role: "viewer" },
      { orgId: t.orgA.id, userId: consultant.id, role: "consultant" },
    ]);
    await expectPgError(asUser(h.db, viewer, (tx) => tx.insert(reportNarrative).values({ ...a.scope, key: "summary", body: "No" })), RLS_VIOLATION);
    await expectPgError(
      asUser(h.db, consultant, (tx) => tx.insert(orgBranding).values({ orgId: t.orgA.id, logo: Buffer.from("x"), logoType: "image/png" })),
      RLS_VIOLATION,
    );
    await asUser(h.db, t.userA, (tx) =>
      tx.insert(orgBranding).values({ orgId: t.orgA.id, logo: Buffer.from("png"), logoType: "image/png" }).onConflictDoNothing(),
    );
    expect(await asUser(h.db, consultant, (tx) => tx.select().from(orgBranding).where(eq(orgBranding.orgId, t.orgA.id)))).toHaveLength(1);
  });

  it("submit records how long the respondent took, the same on every row", async () => {
    const a = await setup(t.orgA.id);
    const rows = await h.db.select().from(response).where(eq(response.instrumentId, a.scope.instrumentId));
    expect(new Set(rows.map((r) => r.durationSeconds)).size).toBe(1);
    expect(rows[0]!.durationSeconds).toBeGreaterThanOrEqual(239);
    expect(rows[0]!.durationSeconds).toBeLessThanOrEqual(260);
    expect(await h.db.select().from(responseDraft).where(eq(responseDraft.respondentId, a.respondentId))).toHaveLength(0);
  });
});
