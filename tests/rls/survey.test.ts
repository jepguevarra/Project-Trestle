import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createInstrumentFromDefinition } from "@/lib/db/mutations/instruments";
import { saveDrafts, submitSurvey } from "@/lib/db/mutations/survey";
import { loadDrafts, loadSurveyLink, loadSurveyQuestions } from "@/lib/db/queries/survey";
import { withSurveyOn } from "@/lib/db/survey-role";
import type { InstrumentDefinition } from "@/lib/instruments/definition";
import {
  client,
  engagement,
  instrument,
  membership,
  question,
  questionOption,
  respondent,
  response,
  responseDraft,
} from "@/lib/db/schema";
import { asUser, connect, createTwoTenants, createUser, expectCrossTenantDenied, expectPgError, RLS_VIOLATION, uniqueEmail, type Harness } from "./harness";

// Phase 04: respondents, responses and drafts, and the survey role the public route runs as.

let h: Harness;
let t: Awaited<ReturnType<typeof createTwoTenants>>;

const definition = {
  dimensions: [{ key: "lead", name: "Leadership", weight: 1 }],
  sections: [
    {
      title: "One",
      questions: [
        { text: "Leaders are committed.", type: "likert_5", dimension: "lead", weight: 1, required: true, reverse: false },
        {
          text: "Which modules?",
          type: "multi_choice",
          dimension: "lead",
          weight: 1,
          required: false,
          reverse: false,
          options: [
            { label: "Sales", value: 1 },
            { label: "Stock", value: 2 },
          ],
        },
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

/** An open instrument with two respondents (both invited), in a fresh engagement. */
async function setup(orgId: string, opts: { anonymity?: "anonymous" | "identified" } = {}) {
  const [c] = await h.db.insert(client).values({ orgId, name: "Client" }).returning();
  const [e] = await h.db
    .insert(engagement)
    .values({ orgId, clientId: c!.id, name: "Engagement", type: "packaged_software", targetSystem: "Odoo" })
    .returning();
  const inst = await h.db.transaction((tx) =>
    createInstrumentFromDefinition(tx, { orgId, engagementId: e!.id }, { name: "Survey", kind: "readiness", templateId: null, createdBy: t.userA.id }, definition),
  );
  await h.db.update(instrument).set({ status: "open", anonymity: opts.anonymity ?? "anonymous" }).where(eq(instrument.id, inst.id));
  const scope = { orgId, engagementId: e!.id, instrumentId: inst.id };
  const [r1, r2] = await h.db
    .insert(respondent)
    .values([
      { ...scope, name: "Ann", email: uniqueEmail("ann"), department: "Finance", roleTitle: "Clerk", seniority: "frontline", invitedAt: new Date() },
      { ...scope, name: "Ben", email: uniqueEmail("ben"), department: "Stores", roleTitle: "Lead", seniority: "supervisor", invitedAt: new Date() },
    ])
    .returning();
  const qs = await h.db.select().from(question).where(eq(question.instrumentId, inst.id)).orderBy(question.sortOrder);
  const opts_ = await h.db.select().from(questionOption).where(eq(questionOption.instrumentId, inst.id)).orderBy(questionOption.sortOrder);
  return { scope, engagement: e!, instrumentId: inst.id, r1: r1!, r2: r2!, likert: qs[0]!, multi: qs[1]!, text: qs[2]!, options: opts_ };
}

const as = <T,>(r: { id: string; instrumentId: string }, fn: Parameters<typeof withSurveyOn<T>>[2]) =>
  withSurveyOn(h.db, { respondentId: r.id, instrumentId: r.instrumentId }, fn);

const linkOf = (s: Awaited<ReturnType<typeof setup>>, r: { id: string }) => ({ ...s.scope, respondentId: r.id });

describe("cross-tenant isolation: user in org A against org B", () => {
  it("respondent", async () => {
    const b = await setup(t.orgB.id);
    await expectCrossTenantDenied(h.db, {
      actor: t.userA,
      table: respondent,
      targetId: b.r1.id,
      insertRow: { ...b.scope, email: uniqueEmail("forged") },
      updateSet: { name: "Renamed by A" },
    });
  });

  it("response (read-only to signed-in users)", async () => {
    const b = await setup(t.orgB.id);
    await as(b.r1, async (tx) => {
      await saveDrafts(tx, linkOf(b, b.r1), [{ questionId: b.likert.id, valueNumeric: 4, valueText: null, optionIds: null }], []);
      await submitSurvey(tx);
    });
    const [row] = await h.db.select().from(response).where(eq(response.instrumentId, b.instrumentId));
    await expectCrossTenantDenied(h.db, {
      actor: t.userA,
      table: response,
      targetId: row!.id,
      insertRow: { ...b.scope, questionId: b.likert.id, submissionId: row!.submissionId, valueNumeric: 1 },
      updateSet: { valueNumeric: 1 },
      appendOnly: true,
    });
  });

  it("response_draft is unreadable to every signed-in user, own org included", async () => {
    const a = await setup(t.orgA.id);
    await as(a.r1, (tx) => saveDrafts(tx, linkOf(a, a.r1), [{ questionId: a.likert.id, valueNumeric: 2, valueText: null, optionIds: null }], []));
    await expectPgError(asUser(h.db, t.userA, (tx) => tx.select().from(responseDraft)), RLS_VIOLATION);
  });

  it("signed-in users cannot write responses, even in their own org", async () => {
    const a = await setup(t.orgA.id);
    await expectPgError(
      asUser(h.db, t.userA, (tx) =>
        tx.insert(response).values({ ...a.scope, questionId: a.likert.id, submissionId: a.r1.id, valueNumeric: 5 }),
      ),
      RLS_VIOLATION,
    );
  });
});

describe("the survey role sees only what the link names", () => {
  it("its own respondent, its own instrument's questions, and nothing about scoring", async () => {
    const a = await setup(t.orgA.id);
    const other = await setup(t.orgA.id);
    await as(a.r1, async (tx) => {
      expect(await loadSurveyLink(tx, { respondentId: a.r1.id, instrumentId: a.instrumentId })).not.toBeNull();
      // Another respondent on the same instrument, and one on another instrument: invisible.
      expect(await loadSurveyLink(tx, { respondentId: a.r2.id, instrumentId: a.instrumentId })).toBeNull();
      expect(await loadSurveyLink(tx, { respondentId: other.r1.id, instrumentId: other.instrumentId })).toBeNull();
      expect((await loadSurveyQuestions(tx, a.instrumentId)).flatMap((s) => s.questions)).toHaveLength(3);
      expect(await loadSurveyQuestions(tx, other.instrumentId)).toHaveLength(0);
    });
    // No dimensions, weights, reverse flags, item sources, option scores, emails or responses.
    for (const query of [
      sql`select id from public.dimension`,
      sql`select weight from public.question`,
      sql`select is_reverse_scored from public.question`,
      sql`select source from public.question`,
      sql`select value from public.question_option`,
      sql`select email from public.respondent`,
      sql`select id from public.response`,
      sql`select id from public.engagement`,
    ]) {
      await expectPgError(as(a.r1, (tx) => tx.execute(query)), RLS_VIOLATION);
    }
  });

  it("writes only its own drafts: a forged row for another respondent or question is refused", async () => {
    const a = await setup(t.orgA.id);
    const other = await setup(t.orgA.id);
    // Another respondent on the same instrument.
    await expectPgError(
      as(a.r1, (tx) => saveDrafts(tx, linkOf(a, a.r2), [{ questionId: a.likert.id, valueNumeric: 1, valueText: null, optionIds: null }], [])),
      RLS_VIOLATION,
    );
    // Another instrument's respondent and question.
    await expectPgError(
      as(a.r1, (tx) => saveDrafts(tx, linkOf(other, other.r1), [{ questionId: other.likert.id, valueNumeric: 1, valueText: null, optionIds: null }], [])),
      RLS_VIOLATION,
    );
    // Its own link, but a question from another instrument: the composite foreign key refuses it.
    await expectPgError(
      as(a.r1, (tx) => saveDrafts(tx, linkOf(a, a.r1), [{ questionId: other.likert.id, valueNumeric: 1, valueText: null, optionIds: null }], [])),
      "23503",
    );
    // Updating or deleting someone else's draft touches nothing.
    await as(a.r2, (tx) => saveDrafts(tx, linkOf(a, a.r2), [{ questionId: a.likert.id, valueNumeric: 3, valueText: null, optionIds: null }], []));
    await as(a.r1, async (tx) => {
      await tx.update(responseDraft).set({ valueNumeric: 1 }).where(eq(responseDraft.respondentId, a.r2.id));
      await tx.delete(responseDraft).where(eq(responseDraft.respondentId, a.r2.id));
      expect(await loadDrafts(tx, a.r2.id)).toHaveLength(0);
    });
    const [kept] = await h.db.select().from(responseDraft).where(eq(responseDraft.respondentId, a.r2.id));
    expect(kept?.valueNumeric).toBe(3);
  });

  it("saving is refused once the survey closes or the respondent has submitted", async () => {
    const a = await setup(t.orgA.id);
    const answer = [{ questionId: a.likert.id, valueNumeric: 4, valueText: null, optionIds: null }];
    await as(a.r1, async (tx) => {
      await saveDrafts(tx, linkOf(a, a.r1), answer, []);
      await submitSurvey(tx);
    });
    await expectPgError(as(a.r1, (tx) => saveDrafts(tx, linkOf(a, a.r1), answer, [])), RLS_VIOLATION);
    await expectPgError(as(a.r1, (tx) => submitSurvey(tx)), "TR411");

    await h.db.update(instrument).set({ status: "closed" }).where(eq(instrument.id, a.instrumentId));
    await expectPgError(as(a.r2, (tx) => saveDrafts(tx, linkOf(a, a.r2), answer, [])), RLS_VIOLATION);
    await expectPgError(as(a.r2, (tx) => submitSurvey(tx)), "TR410");
  });

  it("submit refuses a missing required answer", async () => {
    const a = await setup(t.orgA.id);
    await as(a.r1, (tx) => saveDrafts(tx, linkOf(a, a.r1), [{ questionId: a.text.id, valueNumeric: null, valueText: "Hi", optionIds: null }], []));
    await expectPgError(as(a.r1, (tx) => submitSurvey(tx)), "TR412");
  });
});

describe("the anonymity transaction", () => {
  async function submitAll(a: Awaited<ReturnType<typeof setup>>, r: typeof a.r1) {
    await as(r, async (tx) => {
      await saveDrafts(
        tx,
        linkOf(a, r),
        [
          { questionId: a.likert.id, valueNumeric: 4, valueText: null, optionIds: null },
          { questionId: a.multi.id, valueNumeric: null, valueText: null, optionIds: a.options.map((o) => o.id) },
          { questionId: a.text.id, valueNumeric: null, valueText: "  Month-end worries me. ", optionIds: null },
        ],
        [],
      );
      await submitSurvey(tx);
    });
  }

  it("anonymous: no response row has a respondent_id or a timestamp; completion and segments are kept", async () => {
    const a = await setup(t.orgA.id, { anonymity: "anonymous" });
    await submitAll(a, a.r1);

    const rows = await h.db.select().from(response).where(eq(response.instrumentId, a.instrumentId));
    expect(rows).toHaveLength(4); // likert, two options, text
    expect(rows.every((r) => r.respondentId === null)).toBe(true);
    expect(rows.every((r) => r.answeredAt === null)).toBe(true);
    expect(new Set(rows.map((r) => r.submissionId)).size).toBe(1);
    expect(rows.every((r) => r.department === "Finance" && r.seniority === "frontline" && r.roleTitle === "Clerk")).toBe(true);
    expect(rows.filter((r) => r.optionId).map((r) => r.valueNumeric).sort()).toEqual([1, 2]);
    expect(rows.find((r) => r.questionId === a.text.id)?.valueText).toBe("Month-end worries me.");

    // The direct query the acceptance criterion names.
    const [{ n }] = (await h.db.execute(
      sql`select count(*)::int as n from response where instrument_id = ${a.instrumentId} and respondent_id is not null`,
    )) as unknown as [{ n: number }];
    expect(n).toBe(0);

    const [r1] = await h.db.select().from(respondent).where(eq(respondent.id, a.r1.id));
    expect(r1?.completedAt).not.toBeNull();
    expect(await h.db.select().from(responseDraft).where(eq(responseDraft.respondentId, a.r1.id))).toHaveLength(0);
  });

  it("identified: respondent_id and answered_at are kept", async () => {
    const a = await setup(t.orgA.id, { anonymity: "identified" });
    await submitAll(a, a.r1);
    const rows = await h.db.select().from(response).where(eq(response.instrumentId, a.instrumentId));
    expect(rows.every((r) => r.respondentId === a.r1.id && r.answeredAt !== null)).toBe(true);
  });

  it("an option from another question, or a scale value out of range, does not count as an answer", async () => {
    const a = await setup(t.orgA.id, { anonymity: "identified" });
    const other = await setup(t.orgA.id);
    await as(a.r1, async (tx) => {
      await saveDrafts(
        tx,
        linkOf(a, a.r1),
        [
          { questionId: a.likert.id, valueNumeric: 4, valueText: null, optionIds: null },
          { questionId: a.multi.id, valueNumeric: null, valueText: null, optionIds: [other.options[0]!.id] },
        ],
        [],
      );
      await tx.execute(sql`update public.response_draft set value_numeric = 9 where question_id = ${a.likert.id}`);
    });
    await expectPgError(as(a.r1, (tx) => submitSurvey(tx)), "TR412");

    // Fix the scale answer: the foreign option is still dropped, the rest is recorded.
    await as(a.r1, async (tx) => {
      await tx.execute(sql`update public.response_draft set value_numeric = 3 where question_id = ${a.likert.id}`);
      await submitSurvey(tx);
    });
    const rows = await h.db.select().from(response).where(eq(response.instrumentId, a.instrumentId));
    expect(rows.map((r) => r.questionId)).toEqual([a.likert.id]);
  });
});

describe("respondents, as consultants manage them", () => {
  it("completion is recorded only by the survey; a new email revokes the old link; a submitted respondent stays", async () => {
    const a = await setup(t.orgA.id);
    await expectPgError(
      asUser(h.db, t.userA, (tx) => tx.update(respondent).set({ completedAt: new Date() }).where(eq(respondent.id, a.r1.id))),
      "TR400",
    );
    await asUser(h.db, t.userA, (tx) => tx.update(respondent).set({ email: uniqueEmail("corrected") }).where(eq(respondent.id, a.r1.id)));
    const [changed] = await h.db.select().from(respondent).where(eq(respondent.id, a.r1.id));
    expect(changed?.tokenVersion).toBe(a.r1.tokenVersion + 1);

    await as(a.r2, async (tx) => {
      await saveDrafts(tx, linkOf(a, a.r2), [{ questionId: a.likert.id, valueNumeric: 4, valueText: null, optionIds: null }], []);
      await submitSurvey(tx);
    });
    const deleted = await asUser(h.db, t.userA, (tx) => tx.delete(respondent).where(eq(respondent.id, a.r2.id)).returning());
    expect(deleted).toHaveLength(0);
  });

  it("no respondents can be added once closed, and viewers cannot add any", async () => {
    const a = await setup(t.orgA.id);
    const viewer = await createUser(h.db, { email: uniqueEmail("viewer") });
    await h.db.insert(membership).values({ orgId: t.orgA.id, userId: viewer.id, role: "viewer" });
    await expectPgError(asUser(h.db, viewer, (tx) => tx.insert(respondent).values({ ...a.scope, email: uniqueEmail("x") })), RLS_VIOLATION);

    await h.db.update(instrument).set({ status: "closed" }).where(eq(instrument.id, a.instrumentId));
    await expectPgError(asUser(h.db, t.userA, (tx) => tx.insert(respondent).values({ ...a.scope, email: uniqueEmail("late") })), RLS_VIOLATION);
  });

  it("the survey link version only moves forward", async () => {
    const a = await setup(t.orgA.id);
    await asUser(h.db, t.userA, (tx) => tx.update(instrument).set({ tokenEpoch: 2 }).where(eq(instrument.id, a.instrumentId)));
    await expectPgError(
      asUser(h.db, t.userA, (tx) => tx.update(instrument).set({ tokenEpoch: 1 }).where(eq(instrument.id, a.instrumentId))),
      "TR400",
    );
  });
});
