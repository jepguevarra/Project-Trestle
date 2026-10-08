import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { invitation, membership, organization } from "@/lib/db/schema";
import { hashInvitationToken } from "@/lib/tokens/invitation";
import {
  asUser,
  connect,
  createTwoTenants,
  createUser,
  expectCrossTenantDenied,
  expectPgError,
  orgOf,
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

async function addMember(orgId: string, role: "owner" | "admin" | "consultant" | "viewer") {
  const user = await createUser(h.db, { email: uniqueEmail(role) });
  const [m] = await h.db.insert(membership).values({ orgId, userId: user.id, role }).returning();
  return { ...user, membershipId: m!.id };
}

async function addInvitation(orgId: string, overrides: Partial<typeof invitation.$inferInsert> = {}) {
  const token = crypto.randomUUID();
  const [row] = await h.db
    .insert(invitation)
    .values({
      orgId,
      email: uniqueEmail("invitee"),
      role: "consultant",
      tokenHash: hashInvitationToken(token),
      expiresAt: new Date(Date.now() + 86_400_000),
      ...overrides,
    })
    .returning();
  return { token, row: row! };
}

describe("sign-up", () => {
  it("creates an organisation and an owner membership in one step", async () => {
    const user = await createUser(h.db, { orgName: "Northwind Advisory" });
    const org = await orgOf(h.db, user.id);
    expect(org.name).toBe("Northwind Advisory");
    expect(org.slug).toMatch(/^northwind-advisory(-[0-9a-f]{6})?$/);
    const [m] = await h.db.select().from(membership).where(eq(membership.userId, user.id));
    expect(m?.role).toBe("owner");
  });

  it("gives a colliding name a distinct slug", async () => {
    const a = await createUser(h.db, { orgName: "Same Name Ltd" });
    const b = await createUser(h.db, { orgName: "Same Name Ltd" });
    expect((await orgOf(h.db, a.id)).slug).not.toBe((await orgOf(h.db, b.id)).slug);
  });

  it("never gives an organisation a slug that a top-level route owns", async () => {
    const user = await createUser(h.db, { orgName: "Welcome" });
    expect((await orgOf(h.db, user.id)).slug).toMatch(/^welcome-[0-9a-f]{6}$/);
  });

  it("creates no organisation for a user signing up to accept an invitation", async () => {
    const user = await createUser(h.db);
    const rows = await h.db.select().from(membership).where(eq(membership.userId, user.id));
    expect(rows).toHaveLength(0);
  });

  it("lets a signed-in user create another organisation they own", async () => {
    const [row] = await asUser(h.db, t.userA, (tx) =>
      tx.execute<{ slug: string }>(sql`select public.create_organization('Second Firm') as slug`),
    );
    const orgs = await asUser(h.db, t.userA, (tx) => tx.select().from(organization));
    expect(orgs.map((o) => o.slug).sort()).toEqual([t.orgA.slug, row!.slug].sort());
  });
});

describe("cross-tenant isolation: user in org A against org B", () => {
  it("organization", async () => {
    await expectCrossTenantDenied(h.db, {
      actor: t.userA,
      table: organization,
      targetId: t.orgB.id,
      insertRow: { name: "Forged", slug: `forged-${Date.now()}` },
      updateSet: { name: "Renamed by A" },
    });
  });

  it("membership", async () => {
    const [target] = await h.db.select().from(membership).where(eq(membership.orgId, t.orgB.id));
    await expectCrossTenantDenied(h.db, {
      actor: t.userA,
      table: membership,
      targetId: target!.id,
      insertRow: { orgId: t.orgB.id, userId: t.userA.id, role: "owner" },
      updateSet: { role: "viewer" },
    });
  });

  it("invitation", async () => {
    const { row } = await addInvitation(t.orgB.id);
    await expectCrossTenantDenied(h.db, {
      actor: t.userA,
      table: invitation,
      targetId: row.id,
      insertRow: {
        orgId: t.orgB.id,
        email: uniqueEmail("forged"),
        role: "admin",
        tokenHash: hashInvitationToken(crypto.randomUUID()),
        expiresAt: new Date(Date.now() + 86_400_000),
      },
      updateSet: { role: "owner" },
    });
  });

  it("org_members() returns nothing for an org the caller is not in", async () => {
    const rows = await asUser(h.db, t.userA, (tx) =>
      tx.execute(sql`select * from public.org_members(${t.orgB.id})`),
    );
    expect(rows).toHaveLength(0);
  });

  it("the anon role cannot read tenant tables at all", async () => {
    await expectPgError(
      h.db.transaction(async (tx) => {
        await tx.execute(sql`set local role anon`);
        await tx.select().from(organization);
      }),
      RLS_VIOLATION,
    );
  });
});

describe("roles inside one org", () => {
  it("a viewer cannot promote themselves", async () => {
    const viewer = await addMember(t.orgA.id, "viewer");
    const updated = await asUser(h.db, viewer, (tx) =>
      tx.update(membership).set({ role: "owner" }).where(eq(membership.id, viewer.membershipId)).returning(),
    );
    expect(updated).toHaveLength(0);
  });

  it("a consultant can read the roster but cannot invite", async () => {
    const consultant = await addMember(t.orgA.id, "consultant");
    const roster = await asUser(h.db, consultant, (tx) =>
      tx.select().from(membership).where(eq(membership.orgId, t.orgA.id)),
    );
    expect(roster.length).toBeGreaterThan(1);
    await expectPgError(
      asUser(h.db, consultant, (tx) =>
        tx.insert(invitation).values({
          orgId: t.orgA.id,
          email: uniqueEmail("x"),
          role: "viewer",
          tokenHash: hashInvitationToken(crypto.randomUUID()),
          expiresAt: new Date(Date.now() + 86_400_000),
        }),
      ),
      RLS_VIOLATION,
    );
  });

  it("an admin can invite and manage non-owners, but cannot create or touch owners", async () => {
    const admin = await addMember(t.orgA.id, "admin");
    const consultant = await addMember(t.orgA.id, "consultant");

    await asUser(h.db, admin, (tx) =>
      tx.insert(invitation).values({
        orgId: t.orgA.id,
        email: uniqueEmail("ok"),
        role: "consultant",
        tokenHash: hashInvitationToken(crypto.randomUUID()),
        expiresAt: new Date(Date.now() + 86_400_000),
      }),
    );

    const promoted = await asUser(h.db, admin, (tx) =>
      tx.update(membership).set({ role: "admin" }).where(eq(membership.id, consultant.membershipId)).returning(),
    );
    expect(promoted).toHaveLength(1);

    await expectPgError(
      asUser(h.db, admin, (tx) =>
        tx.update(membership).set({ role: "owner" }).where(eq(membership.id, consultant.membershipId)),
      ),
      RLS_VIOLATION,
    );
    await expectPgError(
      asUser(h.db, admin, (tx) =>
        tx.insert(invitation).values({
          orgId: t.orgA.id,
          email: uniqueEmail("owner"),
          role: "owner",
          tokenHash: hashInvitationToken(crypto.randomUUID()),
          expiresAt: new Date(Date.now() + 86_400_000),
        }),
      ),
      RLS_VIOLATION,
    );

    const ownerRemoved = await asUser(h.db, admin, (tx) =>
      tx
        .delete(membership)
        .where(and(eq(membership.orgId, t.orgA.id), eq(membership.userId, t.userA.id)))
        .returning(),
    );
    expect(ownerRemoved).toHaveLength(0);
  });

  it("the last owner cannot be demoted or removed; a second owner makes it possible", async () => {
    const solo = await createUser(h.db, { orgName: "Solo Practice" });
    const org = await orgOf(h.db, solo.id);
    const [own] = await h.db.select().from(membership).where(eq(membership.userId, solo.id));

    await expectPgError(
      asUser(h.db, solo, (tx) => tx.update(membership).set({ role: "admin" }).where(eq(membership.id, own!.id))),
      "TR409",
    );

    await h.db.insert(membership).values({ orgId: org.id, userId: t.userB.id, role: "owner" });
    const demoted = await asUser(h.db, solo, (tx) =>
      tx.update(membership).set({ role: "admin" }).where(eq(membership.id, own!.id)).returning(),
    );
    expect(demoted[0]?.role).toBe("admin");
  });

  it("membership rows cannot be moved to another org or user", async () => {
    const viewer = await addMember(t.orgA.id, "viewer");
    await expectPgError(
      h.db.update(membership).set({ userId: t.userB.id }).where(eq(membership.id, viewer.membershipId)),
      "TR400",
    );
  });

  it("an owner can delete the organisation, and its rows cascade", async () => {
    const owner = await createUser(h.db, { orgName: "Short Lived" });
    const org = await orgOf(h.db, owner.id);
    const deleted = await asUser(h.db, owner, (tx) =>
      tx.delete(organization).where(eq(organization.id, org.id)).returning(),
    );
    expect(deleted).toHaveLength(1);
    expect(await h.db.select().from(membership).where(eq(membership.orgId, org.id))).toHaveLength(0);
  });
});

describe("accepting an invitation", () => {
  const accept = (user: { id: string }, token: string) =>
    asUser(h.db, user, (tx) => tx.execute<{ slug: string }>(sql`select public.accept_invitation(${token}) as slug`));

  it("joins the invitee to the org with the invited role, once", async () => {
    const invitee = await createUser(h.db);
    const { token } = await addInvitation(t.orgA.id, { email: invitee.email.toUpperCase(), role: "viewer" });

    const [row] = await accept(invitee, token);
    expect(row?.slug).toBe(t.orgA.slug);

    const [m] = await h.db
      .select()
      .from(membership)
      .where(and(eq(membership.orgId, t.orgA.id), eq(membership.userId, invitee.id)));
    expect(m?.role).toBe("viewer");

    const visible = await asUser(h.db, invitee, (tx) => tx.select().from(organization));
    expect(visible.map((o) => o.id)).toEqual([t.orgA.id]);

    await expectPgError(accept(invitee, token), "TR404");
  });

  it("rejects a different signed-in address", async () => {
    const { token } = await addInvitation(t.orgA.id);
    const stranger = await createUser(h.db);
    await expectPgError(accept(stranger, token), "TR403");
  });

  it("rejects an expired invitation", async () => {
    const invitee = await createUser(h.db);
    const { token } = await addInvitation(t.orgA.id, {
      email: invitee.email,
      expiresAt: new Date(Date.now() - 1000),
    });
    await expectPgError(accept(invitee, token), "TR404");
  });

  it("rejects an unknown token", async () => {
    const invitee = await createUser(h.db);
    await expectPgError(accept(invitee, "not-a-real-token"), "TR404");
  });
});
