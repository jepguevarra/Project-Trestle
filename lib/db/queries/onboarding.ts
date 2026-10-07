import { count, eq } from "drizzle-orm";
import type { Tx } from "../rls";
import { client, engagement, engagementAssignment, membership } from "../schema";

/** What an admin has set up so far, for the dashboard's getting-started checklist. */
export async function getSetupProgress(tx: Tx, orgId: string) {
  const [[clients], [engagements], [members], [assignments], [firstEngagement]] = await Promise.all([
    tx.select({ n: count() }).from(client).where(eq(client.orgId, orgId)),
    tx.select({ n: count() }).from(engagement).where(eq(engagement.orgId, orgId)),
    tx.select({ n: count() }).from(membership).where(eq(membership.orgId, orgId)),
    tx.select({ n: count() }).from(engagementAssignment).where(eq(engagementAssignment.orgId, orgId)),
    tx.select({ id: engagement.id }).from(engagement).where(eq(engagement.orgId, orgId)).limit(1),
  ]);
  return {
    hasClient: (clients?.n ?? 0) > 0,
    hasEngagement: (engagements?.n ?? 0) > 0,
    hasTeammate: (members?.n ?? 0) > 1,
    hasAssignment: (assignments?.n ?? 0) > 0,
    firstEngagementId: firstEngagement?.id ?? null,
  };
}
