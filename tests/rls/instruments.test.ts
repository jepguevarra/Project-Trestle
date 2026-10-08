import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { READINESS_TEMPLATES } from "@/lib/instruments/readiness-templates";
import { createInstrumentFromDefinition } from "@/lib/db/mutations/instruments";
import {
  client,
  dimension,
  engagement,
  engagementAssignment,
  instrument,
  instrumentTemplate,
  membership,
  question,
  questionOption,
  recordMessage,
  section,
} from "@/lib/db/schema";
import {
  asUser,
  connect,
  createTwoTenants,
  createUser,
  expectCrossTenantDenied,
  expectPgError,
  RLS_VIOLATION,
  uniqueEmail,
  type Harness,
} from "./harness";

let h: Harness;
let t: Awaited<ReturnType<typeof createTwoTenants>>;
const definition = READINESS_TEMPLATES[0]!.definition;

beforeAll(async () => {
  h = connect();
  t = await createTwoTenants(h.db);
});
afterAll(() => h.end());

async function setup(orgId: string, opts: { status?: "active" | "archived" } = {}) {
  const [c] = await h.db.insert(client).values({ orgId, name: "Client" }).returning();
  const [e] = await h.db
    .insert(engagement)
    .values({ orgId, clientId: c!.id, name: "Engagement", type: "packaged_software", targetSystem: "Odoo", status: opts.status ?? "active" })
    .returning();
  const inst = await h.db.transaction((tx) =>
    createInstrumentFromDefinition(tx, { orgId, engagementId: e!.id }, { name: "Readiness", kind: "readiness", templateId: null, createdBy: t.userA.id }, definition),
  );
  const [q] = await h.db.select().from(question).where(eq(question.instrumentId, inst.id)).limit(1);
  const [s] = await h.db.select().from(section).where(eq(section.instrumentId, inst.id)).limit(1);
  const [d] = await h.db.select().from(dimension).where(eq(dimension.instrumentId, inst.id)).limit(1);
  return { engagement: e!, instrumentId: inst.id, question: q!, section: s!, dimension: d! };
}

async function addMember(orgId: string, role: "admin" | "consultant" | "viewer") {
  const user = await createUser(h.db, { email: uniqueEmail(role) });
  await h.db.insert(membership).values({ orgId, userId: user.id, role });
  return user;
}

describe("cross-tenant isolation: user in org A against org B", () => {
  it("instrument, dimension, section, question and question_option", async () => {
    const b = await setup(t.orgB.id);
    const scope = { orgId: t.orgB.id, engagementId: b.engagement.id, instrumentId: b.instrumentId };
    const [opt] = await h.db
      .insert(questionOption)
      .values({ ...scope, questionId: b.question.id, label: "Yes", value: 1 })
      .returning();

    await expectCrossTenantDenied(h.db, {
      actor: t.userA,
      table: instrument,
      targetId: b.instrumentId,
      insertRow: { orgId: t.orgB.id, engagementId: b.engagement.id, name: "Forged", kind: "readiness" },
      updateSet: { name: "Renamed by A" },
    });
    await expectCrossTenantDenied(h.db, {
      actor: t.userA,
      table: dimension,
      targetId: b.dimension.id,
      insertRow: { ...scope, name: "Forged" },
      updateSet: { weight: 9 },
    });
    await expectCrossTenantDenied(h.db, {
      actor: t.userA,
      table: section,
      targetId: b.section.id,
      insertRow: { ...scope, title: "Forged" },
      updateSet: { title: "Renamed by A" },
    });
    await expectCrossTenantDenied(h.db, {
      actor: t.userA,
      table: question,
      targetId: b.question.id,
      insertRow: { ...scope, sectionId: b.section.id, dimensionId: b.dimension.id, text: "Forged", type: "likert_5" },
      updateSet: { text: "Rewritten by A" },
    });
    await expectCrossTenantDenied(h.db, {
      actor: t.userA,
      table: questionOption,
      targetId: opt!.id,
      insertRow: { ...scope, questionId: b.question.id, label: "Forged", value: 2 },
      updateSet: { label: "Rewritten by A" },
    });
  });

  it("instrument_template: a firm's own templates are private to it", async () => {
    const [own] = await h.db
      .insert(instrumentTemplate)
      .values({ orgId: t.orgB.id, name: "B's template", definition, isSystem: false })
      .returning();
    await expectCrossTenantDenied(h.db, {
      actor: t.userA,
      table: instrumentTemplate,
      targetId: own!.id,
      insertRow: { orgId: t.orgB.id, name: "Forged", definition, isSystem: false },
      updateSet: { name: "Renamed by A" },
    });
  });
});

describe("shipped templates", () => {
  it("are readable by every signed-in user and writable by nobody through the API", async () => {
    const shipped = await asUser(h.db, t.userA, (tx) => tx.select().from(instrumentTemplate).where(isNull(instrumentTemplate.orgId)));
    expect(shipped.length).toBe(READINESS_TEMPLATES.length);
    const updated = await asUser(h.db, t.userA, (tx) =>
      tx.update(instrumentTemplate).set({ name: "Hijacked" }).where(isNull(instrumentTemplate.orgId)).returning(),
    );
    expect(updated).toHaveLength(0);
    await expectPgError(
      asUser(h.db, t.userA, (tx) => tx.insert(instrumentTemplate).values({ orgId: null, name: "Fake system", definition, isSystem: true })),
      RLS_VIOLATION,
    );
  });
});

describe("engagement scope and the draft freeze", () => {
  it("an unassigned consultant sees no instrument; an assigned viewer reads but cannot write", async () => {
    const a = await setup(t.orgA.id);
    const consultant = await addMember(t.orgA.id, "consultant");
    const viewer = await addMember(t.orgA.id, "viewer");
    await h.db.insert(engagementAssignment).values({ orgId: t.orgA.id, engagementId: a.engagement.id, userId: viewer.id, access: "edit" });

    const unseen = await asUser(h.db, consultant, (tx) => tx.select().from(question).where(eq(question.instrumentId, a.instrumentId)));
    expect(unseen).toHaveLength(0);
    const seen = await asUser(h.db, viewer, (tx) => tx.select().from(question).where(eq(question.instrumentId, a.instrumentId)));
    expect(seen.length).toBeGreaterThan(20);

    const changed = await asUser(h.db, viewer, (tx) =>
      tx.update(question).set({ text: "Viewer edit" }).where(eq(question.id, a.question.id)).returning(),
    );
    expect(changed).toHaveLength(0);
  });

  it("an edit consultant changes a draft, and nobody changes questions once it is open", async () => {
    const a = await setup(t.orgA.id);
    const consultant = await addMember(t.orgA.id, "consultant");
    await h.db.insert(engagementAssignment).values({ orgId: t.orgA.id, engagementId: a.engagement.id, userId: consultant.id, access: "edit" });

    const edited = await asUser(h.db, consultant, (tx) =>
      tx.update(question).set({ isReverseScored: true }).where(eq(question.id, a.question.id)).returning(),
    );
    expect(edited[0]?.isReverseScored).toBe(true);

    await asUser(h.db, consultant, (tx) => tx.update(instrument).set({ status: "open" }).where(eq(instrument.id, a.instrumentId)));
    const frozen = await asUser(h.db, t.userA, (tx) =>
      tx.update(question).set({ text: "After opening" }).where(eq(question.id, a.question.id)).returning(),
    );
    expect(frozen).toHaveLength(0);
    await expectPgError(
      asUser(h.db, t.userA, (tx) =>
        tx.insert(section).values({ orgId: t.orgA.id, engagementId: a.engagement.id, instrumentId: a.instrumentId, title: "Late" }),
      ),
      RLS_VIOLATION,
    );
  });

  it("an archived engagement's instruments are read-only, even to an admin", async () => {
    const a = await setup(t.orgA.id, { status: "archived" });
    const changed = await asUser(h.db, t.userA, (tx) =>
      tx.update(instrument).set({ name: "Edited" }).where(eq(instrument.id, a.instrumentId)).returning(),
    );
    expect(changed).toHaveLength(0);
  });
});

describe("integrity", () => {
  it("cannot open with no questions, never goes back to draft, and keeps its anonymity once open", async () => {
    const a = await setup(t.orgA.id);
    const [empty] = await h.db
      .insert(instrument)
      .values({ orgId: t.orgA.id, engagementId: a.engagement.id, name: "Empty", kind: "readiness" })
      .returning();
    await expectPgError(asUser(h.db, t.userA, (tx) => tx.update(instrument).set({ status: "open" }).where(eq(instrument.id, empty!.id))), "TR422");

    await asUser(h.db, t.userA, (tx) => tx.update(instrument).set({ status: "open" }).where(eq(instrument.id, a.instrumentId)));
    await expectPgError(asUser(h.db, t.userA, (tx) => tx.update(instrument).set({ status: "draft" }).where(eq(instrument.id, a.instrumentId))), "TR423");
    await expectPgError(
      asUser(h.db, t.userA, (tx) => tx.update(instrument).set({ anonymity: "identified" }).where(eq(instrument.id, a.instrumentId))),
      "TR424",
    );
  });

  it("a scored question must have a dimension, and a dimension in use cannot be deleted", async () => {
    const a = await setup(t.orgA.id);
    await expectPgError(
      h.db.update(question).set({ dimensionId: null }).where(eq(question.id, a.question.id)),
      "23514",
    );
    await expectPgError(h.db.delete(dimension).where(eq(dimension.id, a.question.dimensionId!)), "23503");
  });

  it("changing a dimension's weight leaves every question's dimension alone", async () => {
    const a = await setup(t.orgA.id);
    const before = await h.db.select({ id: question.id, d: question.dimensionId }).from(question).where(eq(question.instrumentId, a.instrumentId));
    await asUser(h.db, t.userA, (tx) => tx.update(dimension).set({ weight: 2.5 }).where(eq(dimension.id, a.dimension.id)));
    const after = await h.db.select({ id: question.id, d: question.dimensionId }).from(question).where(eq(question.instrumentId, a.instrumentId));
    expect(after).toEqual(before);
  });

  it("a question cannot point at another instrument's section", async () => {
    const a = await setup(t.orgA.id);
    const other = await setup(t.orgA.id);
    await expectPgError(
      h.db.insert(question).values({
        orgId: t.orgA.id,
        engagementId: a.engagement.id,
        instrumentId: a.instrumentId,
        sectionId: other.section.id,
        text: "Cross",
        type: "open_text",
      }),
      "23503",
    );
  });

  it("instrument chatter: readable on the engagement, written only by editors, gone with the instrument", async () => {
    const a = await setup(t.orgA.id);
    const viewer = await addMember(t.orgA.id, "viewer");
    await h.db.insert(engagementAssignment).values({ orgId: t.orgA.id, engagementId: a.engagement.id, userId: viewer.id, access: "read" });
    const note = { orgId: t.orgA.id, engagementId: a.engagement.id, resType: "instrument", resId: a.instrumentId, kind: "note" as const, body: "Draft ready" };
    await asUser(h.db, t.userA, (tx) => tx.insert(recordMessage).values({ ...note, authorUserId: t.userA.id }));
    const read = await asUser(h.db, viewer, (tx) => tx.select().from(recordMessage).where(eq(recordMessage.resId, a.instrumentId)));
    expect(read).toHaveLength(1);
    await expectPgError(asUser(h.db, viewer, (tx) => tx.insert(recordMessage).values({ ...note, authorUserId: viewer.id })), RLS_VIOLATION);

    await asUser(h.db, t.userA, (tx) => tx.delete(instrument).where(and(eq(instrument.id, a.instrumentId), eq(instrument.status, "draft"))));
    expect(await h.db.select().from(recordMessage).where(eq(recordMessage.resId, a.instrumentId))).toHaveLength(0);
  });
});
