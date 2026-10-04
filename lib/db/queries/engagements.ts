import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { Role } from "@/lib/auth/roles";
import type { Tx } from "../rls";
import { client, engagement, engagementAssignment } from "../schema";

export type Engagement = typeof engagement.$inferSelect;
export type EngagementStatus = Engagement["status"];

const listColumns = {
  id: engagement.id,
  name: engagement.name,
  type: engagement.type,
  targetSystem: engagement.targetSystem,
  targetGoLive: engagement.targetGoLive,
  status: engagement.status,
  clientId: client.id,
  clientName: client.name,
};

/** Engagements the user can see in the org with the given status. RLS applies the assignment scope. */
export function listEngagements(tx: Tx, orgId: string, status: EngagementStatus, clientId?: string) {
  return tx
    .select(listColumns)
    .from(engagement)
    .innerJoin(client, and(eq(client.id, engagement.clientId), eq(client.orgId, engagement.orgId)))
    .where(
      and(
        eq(engagement.orgId, orgId),
        eq(engagement.status, status),
        clientId ? eq(engagement.clientId, clientId) : undefined,
      ),
    )
    .orderBy(asc(client.name), asc(engagement.name));
}

/** Every engagement of one client the user can see, active first. */
export function listClientEngagements(tx: Tx, orgId: string, clientId: string) {
  return tx
    .select(listColumns)
    .from(engagement)
    .innerJoin(client, and(eq(client.id, engagement.clientId), eq(client.orgId, engagement.orgId)))
    .where(and(eq(engagement.orgId, orgId), eq(engagement.clientId, clientId)))
    .orderBy(asc(engagement.status), asc(engagement.name));
}

/**
 * One engagement with its client and the user's effective access ('edit' | 'read'), or null when
 * it does not exist in this org or the user cannot see it.
 */
export async function findEngagementWithAccess(tx: Tx, orgId: string, engagementId: string) {
  const [row] = await tx
    .select({
      engagement,
      clientName: client.name,
      access: sql<"edit" | "read">`private.engagement_access(${engagement.id})`,
    })
    .from(engagement)
    .innerJoin(client, and(eq(client.id, engagement.clientId), eq(client.orgId, engagement.orgId)))
    .where(and(eq(engagement.orgId, orgId), eq(engagement.id, engagementId)));
  return row ?? null;
}

export type TeamMember = {
  userId: string;
  email: string;
  role: Role;
  access: "edit" | "read";
};

/** The people assigned to an engagement, with their org role and email. */
export async function listEngagementTeam(tx: Tx, orgId: string, engagementId: string): Promise<TeamMember[]> {
  const rows = await tx.execute<{ user_id: string; email: string; role: Role; access: "edit" | "read" }>(sql`
    select ea.user_id, m.email, m.role, ea.access
    from ${engagementAssignment} ea
    join public.org_members(${orgId}) m on m.user_id = ea.user_id
    where ea.org_id = ${orgId} and ea.engagement_id = ${engagementId}
    order by m.email
  `);
  return rows.map((r) => ({ userId: r.user_id, email: r.email, role: r.role, access: r.access }));
}

/** Recently touched active engagements, for the org dashboard. */
export function listRecentActiveEngagements(tx: Tx, orgId: string, limit = 8) {
  return tx
    .select(listColumns)
    .from(engagement)
    .innerJoin(client, and(eq(client.id, engagement.clientId), eq(client.orgId, engagement.orgId)))
    .where(and(eq(engagement.orgId, orgId), eq(engagement.status, "active")))
    .orderBy(desc(engagement.updatedAt))
    .limit(limit);
}
