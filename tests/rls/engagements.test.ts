import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { client, engagement, engagementAssignment, membership } from "@/lib/db/schema";
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

type Role = "owner" | "admin" | "consultant" | "viewer";

beforeAll(async () => {
  h = connect();
  t = await createTwoTenants(h.db);
});
afterAll(() => h.end());

async function addMember(orgId: string, role: Role) {
  const user = await createUser(h.db, { email: uniqueEmail(role) });
  await h.db.insert(membership).values({ orgId, userId: user.id, role });
  return user;
}

async function addClient(orgId: string, name = "Client") {
  const [row] = await h.db.insert(client).values({ orgId, name }).returning();
  return row!;
}

async function addEngagement(orgId: string, clientId: string, overrides: Partial<typeof engagement.$inferInsert> = {}) {
  const [row] = await h.db
    .insert(engagement)
    .values({ orgId, clientId, name: "Engagement", type: "packaged_software", targetSystem: "Odoo 18", ...overrides })
    .returning();
  return row!;
}

async function assign(orgId: string, engagementId: string, userId: string, access: "edit" | "read") {
  const [row] = await h.db.insert(engagementAssignment).values({ orgId, engagementId, userId, access }).returning();
  return row!;
}

const visibleEngagements = (user: { id: string }, orgId: string) =>
  asUser(h.db, user, (tx) => tx.select({ id: engagement.id }).from(engagement).where(eq(engagement.orgId, orgId)));

describe("cross-tenant isolation: user in org A against org B", () => {
  it("client", async () => {
    const target = await addClient(t.orgB.id);
    await expectCrossTenantDenied(h.db, {
      actor: t.userA,
      table: client,
      targetId: target.id,
      insertRow: { orgId: t.orgB.id, name: "Forged" },
      updateSet: { name: "Renamed by A" },
    });
  });

  it("engagement", async () => {
    const c = await addClient(t.orgB.id);
    const target = await addEngagement(t.orgB.id, c.id);
    await expectCrossTenantDenied(h.db, {
      actor: t.userA,
      table: engagement,
      targetId: target.id,
      insertRow: { orgId: t.orgB.id, clientId: c.id, name: "Forged", type: "automation", targetSystem: "x" },
      updateSet: { name: "Renamed by A" },
    });
  });

  it("engagement_assignment", async () => {
    const c = await addClient(t.orgB.id);
    const e = await addEngagement(t.orgB.id, c.id);
    const target = await assign(t.orgB.id, e.id, t.userB.id, "edit");
    await expectCrossTenantDenied(h.db, {
      actor: t.userA,
      table: engagementAssignment,
      targetId: target.id,
      insertRow: { orgId: t.orgB.id, engagementId: e.id, userId: t.userB.id, access: "read" },
      updateSet: { access: "read" },
    });
  });

  it("an engagement in org A cannot reference org B's client", async () => {
    const foreignClient = await addClient(t.orgB.id);
    await expectPgError(
      asUser(h.db, t.userA, (tx) =>
        tx.insert(engagement).values({
          orgId: t.orgA.id,
          clientId: foreignClient.id,
          name: "Cross-org",
          type: "automation",
          targetSystem: "x",
        }),
      ),
      "23503",
    );
  });

  it("org A cannot assign a user who is not a member of org A", async () => {
    const c = await addClient(t.orgA.id);
    const e = await addEngagement(t.orgA.id, c.id);
    await expectPgError(
      asUser(h.db, t.userA, (tx) =>
        tx.insert(engagementAssignment).values({ orgId: t.orgA.id, engagementId: e.id, userId: t.userB.id }),
      ),
      "23503",
    );
  });
});

describe("engagement scope inside one org", () => {
  it("admins see every engagement; consultants and viewers only assigned ones", async () => {
    const admin = await addMember(t.orgA.id, "admin");
    const consultant = await addMember(t.orgA.id, "consultant");
    const viewer = await addMember(t.orgA.id, "viewer");
    const c = await addClient(t.orgA.id);
    const assigned = await addEngagement(t.orgA.id, c.id, { name: "Assigned" });
    const other = await addEngagement(t.orgA.id, c.id, { name: "Other" });
    await assign(t.orgA.id, assigned.id, consultant.id, "edit");
    await assign(t.orgA.id, assigned.id, viewer.id, "read");

    const adminIds = (await visibleEngagements(admin, t.orgA.id)).map((r) => r.id);
    expect(adminIds).toEqual(expect.arrayContaining([assigned.id, other.id]));
    expect((await visibleEngagements(consultant, t.orgA.id)).map((r) => r.id)).toEqual([assigned.id]);
    expect((await visibleEngagements(viewer, t.orgA.id)).map((r) => r.id)).toEqual([assigned.id]);
  });

  it("an unassigned consultant sees no engagements and cannot create one", async () => {
    const consultant = await addMember(t.orgA.id, "consultant");
    const c = await addClient(t.orgA.id);
    await addEngagement(t.orgA.id, c.id);
    expect(await visibleEngagements(consultant, t.orgA.id)).toEqual([]);
    await expectPgError(
      asUser(h.db, consultant, (tx) =>
        tx.insert(engagement).values({ orgId: t.orgA.id, clientId: c.id, name: "x", type: "automation", targetSystem: "x" }),
      ),
      RLS_VIOLATION,
    );
  });

  it("a viewer cannot change an assigned engagement, even with an `edit` assignment", async () => {
    const viewer = await addMember(t.orgA.id, "viewer");
    const c = await addClient(t.orgA.id);
    const e = await addEngagement(t.orgA.id, c.id);
    await assign(t.orgA.id, e.id, viewer.id, "edit");
    const updated = await asUser(h.db, viewer, (tx) =>
      tx.update(engagement).set({ name: "Viewer edit" }).where(eq(engagement.id, e.id)).returning(),
    );
    expect(updated).toHaveLength(0);
  });

  it("a consultant with read access cannot change the engagement", async () => {
    const consultant = await addMember(t.orgA.id, "consultant");
    const c = await addClient(t.orgA.id);
    const e = await addEngagement(t.orgA.id, c.id);
    await assign(t.orgA.id, e.id, consultant.id, "read");
    const updated = await asUser(h.db, consultant, (tx) =>
      tx.update(engagement).set({ name: "Read-only edit" }).where(eq(engagement.id, e.id)).returning(),
    );
    expect(updated).toHaveLength(0);
  });

  it("a consultant with edit access changes details, but not type, client or status", async () => {
    const consultant = await addMember(t.orgA.id, "consultant");
    const c = await addClient(t.orgA.id);
    const c2 = await addClient(t.orgA.id);
    const e = await addEngagement(t.orgA.id, c.id);
    await assign(t.orgA.id, e.id, consultant.id, "edit");

    const updated = await asUser(h.db, consultant, (tx) =>
      tx.update(engagement).set({ name: "Renamed", targetSystem: "SAP B1" }).where(eq(engagement.id, e.id)).returning(),
    );
    expect(updated[0]?.name).toBe("Renamed");

    for (const change of [{ type: "custom_build" as const }, { clientId: c2.id }, { status: "archived" as const }]) {
      await expectPgError(
        asUser(h.db, consultant, (tx) => tx.update(engagement).set(change).where(eq(engagement.id, e.id))),
        "TR405",
      );
    }
  });

  it("a consultant cannot edit an archived engagement; an admin can re-activate it", async () => {
    const admin = await addMember(t.orgA.id, "admin");
    const consultant = await addMember(t.orgA.id, "consultant");
    const c = await addClient(t.orgA.id);
    const e = await addEngagement(t.orgA.id, c.id, { status: "archived" });
    await assign(t.orgA.id, e.id, consultant.id, "edit");

    expect(await visibleEngagements(consultant, t.orgA.id)).toHaveLength(1);
    const blocked = await asUser(h.db, consultant, (tx) =>
      tx.update(engagement).set({ name: "x" }).where(eq(engagement.id, e.id)).returning(),
    );
    expect(blocked).toHaveLength(0);

    const reactivated = await asUser(h.db, admin, (tx) =>
      tx.update(engagement).set({ status: "active" }).where(eq(engagement.id, e.id)).returning(),
    );
    expect(reactivated[0]?.status).toBe("active");
  });

  it("nobody deletes an engagement through RLS; archiving is the mechanism", async () => {
    const c = await addClient(t.orgA.id);
    const e = await addEngagement(t.orgA.id, c.id);
    const deleted = await asUser(h.db, t.userA, (tx) => tx.delete(engagement).where(eq(engagement.id, e.id)).returning());
    expect(deleted).toHaveLength(0);
  });

  it("engagement.type cannot be null", async () => {
    const c = await addClient(t.orgA.id);
    await expectPgError(
      h.db.insert(engagement).values({ orgId: t.orgA.id, clientId: c.id, name: "x", targetSystem: "x", type: null as never }),
      "23502",
    );
  });

  it("only admins manage assignments; the team is visible to the people on it", async () => {
    const consultant = await addMember(t.orgA.id, "consultant");
    const colleague = await addMember(t.orgA.id, "consultant");
    const outsider = await addMember(t.orgA.id, "consultant");
    const c = await addClient(t.orgA.id);
    const e = await addEngagement(t.orgA.id, c.id);
    await assign(t.orgA.id, e.id, consultant.id, "edit");
    await assign(t.orgA.id, e.id, colleague.id, "read");

    const team = await asUser(h.db, consultant, (tx) =>
      tx.select().from(engagementAssignment).where(eq(engagementAssignment.engagementId, e.id)),
    );
    expect(team).toHaveLength(2);
    expect(
      await asUser(h.db, outsider, (tx) =>
        tx.select().from(engagementAssignment).where(eq(engagementAssignment.engagementId, e.id)),
      ),
    ).toHaveLength(0);

    await expectPgError(
      asUser(h.db, consultant, (tx) =>
        tx.insert(engagementAssignment).values({ orgId: t.orgA.id, engagementId: e.id, userId: outsider.id }),
      ),
      RLS_VIOLATION,
    );
  });

  it("removing a member removes their assignments", async () => {
    const consultant = await addMember(t.orgA.id, "consultant");
    const c = await addClient(t.orgA.id);
    const e = await addEngagement(t.orgA.id, c.id);
    await assign(t.orgA.id, e.id, consultant.id, "edit");
    await h.db.delete(membership).where(and(eq(membership.orgId, t.orgA.id), eq(membership.userId, consultant.id)));
    const left = await h.db.select().from(engagementAssignment).where(eq(engagementAssignment.userId, consultant.id));
    expect(left).toHaveLength(0);
  });
});

describe("client visibility", () => {
  it("consultants see the client list; viewers see only their engagements' clients", async () => {
    const consultant = await addMember(t.orgA.id, "consultant");
    const viewer = await addMember(t.orgA.id, "viewer");
    const theirs = await addClient(t.orgA.id, "Viewer's company");
    const another = await addClient(t.orgA.id, "Another client");
    const e = await addEngagement(t.orgA.id, theirs.id);
    await assign(t.orgA.id, e.id, viewer.id, "read");

    const consultantSees = await asUser(h.db, consultant, (tx) =>
      tx.select({ id: client.id }).from(client).where(eq(client.orgId, t.orgA.id)),
    );
    expect(consultantSees.map((r) => r.id)).toEqual(expect.arrayContaining([theirs.id, another.id]));

    const viewerSees = await asUser(h.db, viewer, (tx) =>
      tx.select({ id: client.id }).from(client).where(eq(client.orgId, t.orgA.id)),
    );
    expect(viewerSees.map((r) => r.id)).toEqual([theirs.id]);
  });

  it("only admins create or change clients", async () => {
    const consultant = await addMember(t.orgA.id, "consultant");
    await expectPgError(
      asUser(h.db, consultant, (tx) => tx.insert(client).values({ orgId: t.orgA.id, name: "Nope" })),
      RLS_VIOLATION,
    );
    const target = await addClient(t.orgA.id);
    const updated = await asUser(h.db, consultant, (tx) =>
      tx.update(client).set({ name: "Changed" }).where(eq(client.id, target.id)).returning(),
    );
    expect(updated).toHaveLength(0);
  });
});
