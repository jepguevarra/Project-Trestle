import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { client, engagement, engagementAssignment, membership, recordMessage } from "@/lib/db/schema";
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

beforeAll(async () => {
  h = connect();
  t = await createTwoTenants(h.db);
});
afterAll(() => h.end());

async function addMember(orgId: string, role: "admin" | "consultant" | "viewer") {
  const user = await createUser(h.db, { email: uniqueEmail(role) });
  await h.db.insert(membership).values({ orgId, userId: user.id, role });
  return user;
}

async function setup(orgId: string) {
  const [c] = await h.db.insert(client).values({ orgId, name: "Client" }).returning();
  const [e] = await h.db
    .insert(engagement)
    .values({ orgId, clientId: c!.id, name: "Engagement", type: "packaged_software", targetSystem: "Odoo" })
    .returning();
  return { client: c!, engagement: e! };
}

const note = (orgId: string, resType: "client" | "engagement", resId: string, engagementId: string | null, author: string | null) => ({
  orgId,
  engagementId,
  resType,
  resId,
  kind: "note" as const,
  body: "A note",
  authorUserId: author,
});

async function addNote(...args: Parameters<typeof note>) {
  const [row] = await h.db.insert(recordMessage).values(note(...args)).returning();
  return row!;
}

const visible = (user: { id: string }, resId: string) =>
  asUser(h.db, user, (tx) => tx.select().from(recordMessage).where(eq(recordMessage.resId, resId)));

describe("record_message", () => {
  it("is isolated across orgs", async () => {
    const b = await setup(t.orgB.id);
    const target = await addNote(t.orgB.id, "engagement", b.engagement.id, b.engagement.id, t.userB.id);
    await expectCrossTenantDenied(h.db, {
      actor: t.userA,
      table: recordMessage,
      targetId: target.id,
      insertRow: note(t.orgB.id, "engagement", b.engagement.id, b.engagement.id, t.userA.id),
      updateSet: { body: "Rewritten by A" },
      appendOnly: true,
    });
  });

  it("a consultant cannot read messages on an engagement they are not assigned to", async () => {
    const a = await setup(t.orgA.id);
    const consultant = await addMember(t.orgA.id, "consultant");
    await addNote(t.orgA.id, "engagement", a.engagement.id, a.engagement.id, t.userA.id);
    expect(await visible(consultant, a.engagement.id)).toHaveLength(0);

    await h.db.insert(engagementAssignment).values({ orgId: t.orgA.id, engagementId: a.engagement.id, userId: consultant.id });
    expect(await visible(consultant, a.engagement.id)).toHaveLength(1);
  });

  it("a viewer cannot read notes on a client they cannot see", async () => {
    const theirs = await setup(t.orgA.id);
    const other = await setup(t.orgA.id);
    const viewer = await addMember(t.orgA.id, "viewer");
    await h.db
      .insert(engagementAssignment)
      .values({ orgId: t.orgA.id, engagementId: theirs.engagement.id, userId: viewer.id, access: "read" });
    await addNote(t.orgA.id, "client", theirs.client.id, null, t.userA.id);
    await addNote(t.orgA.id, "client", other.client.id, null, t.userA.id);

    expect(await visible(viewer, theirs.client.id)).toHaveLength(1);
    expect(await visible(viewer, other.client.id)).toHaveLength(0);
  });

  it("only someone who can edit the record can write on it", async () => {
    const a = await setup(t.orgA.id);
    const viewer = await addMember(t.orgA.id, "viewer");
    const consultant = await addMember(t.orgA.id, "consultant");
    await h.db.insert(engagementAssignment).values([
      { orgId: t.orgA.id, engagementId: a.engagement.id, userId: viewer.id, access: "edit" },
      { orgId: t.orgA.id, engagementId: a.engagement.id, userId: consultant.id, access: "edit" },
    ]);

    await expectPgError(
      asUser(h.db, viewer, (tx) => tx.insert(recordMessage).values(note(t.orgA.id, "engagement", a.engagement.id, a.engagement.id, viewer.id))),
      RLS_VIOLATION,
    );
    await asUser(h.db, consultant, (tx) =>
      tx.insert(recordMessage).values(note(t.orgA.id, "engagement", a.engagement.id, a.engagement.id, consultant.id)),
    );
    // Consultants cannot edit clients, so cannot note them either.
    await expectPgError(
      asUser(h.db, consultant, (tx) => tx.insert(recordMessage).values(note(t.orgA.id, "client", a.client.id, null, consultant.id))),
      RLS_VIOLATION,
    );
  });

  it("cannot be forged: wrong author, wrong engagement, or the system kind", async () => {
    const a = await setup(t.orgA.id);
    const other = await setup(t.orgA.id);
    const forged = [
      note(t.orgA.id, "engagement", a.engagement.id, a.engagement.id, t.userB.id),
      note(t.orgA.id, "engagement", a.engagement.id, other.engagement.id, t.userA.id),
      { ...note(t.orgA.id, "engagement", a.engagement.id, a.engagement.id, t.userA.id), kind: "system" as const },
    ];
    for (const row of forged) {
      await expectPgError(asUser(h.db, t.userA, (tx) => tx.insert(recordMessage).values(row)), RLS_VIOLATION);
    }
  });

  it("is append-only: nobody updates or deletes a message", async () => {
    const a = await setup(t.orgA.id);
    const m = await addNote(t.orgA.id, "engagement", a.engagement.id, a.engagement.id, t.userA.id);
    await expectPgError(
      asUser(h.db, t.userA, (tx) => tx.update(recordMessage).set({ body: "x" }).where(eq(recordMessage.id, m.id))),
      RLS_VIOLATION,
    );
    await expectPgError(asUser(h.db, t.userA, (tx) => tx.delete(recordMessage).where(eq(recordMessage.id, m.id))), RLS_VIOLATION);
  });

  it("rejects a res_type outside the registry", async () => {
    const a = await setup(t.orgA.id);
    await expectPgError(
      h.db.insert(recordMessage).values({ ...note(t.orgA.id, "client", a.client.id, null, null), resType: "invoice" as "client" }),
      "23514",
    );
  });

  it("deleting a client deletes its chatter, and its engagements' chatter", async () => {
    const a = await setup(t.orgA.id);
    await addNote(t.orgA.id, "client", a.client.id, null, t.userA.id);
    await addNote(t.orgA.id, "engagement", a.engagement.id, a.engagement.id, t.userA.id);
    await asUser(h.db, t.userA, (tx) => tx.delete(client).where(eq(client.id, a.client.id)));
    const left = await h.db.select().from(recordMessage).where(eq(recordMessage.orgId, t.orgA.id));
    expect(left.filter((m) => m.resId === a.client.id || m.resId === a.engagement.id)).toHaveLength(0);
  });
});
