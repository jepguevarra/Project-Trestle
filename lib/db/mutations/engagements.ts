import { and, eq } from "drizzle-orm";
import type { Tx } from "../rls";
import { engagement, engagementAssignment } from "../schema";

type Details = { name: string; targetSystem: string; targetGoLive?: string };

export async function createEngagement(
  tx: Tx,
  orgId: string,
  fields: Details & { clientId: string; type: (typeof engagement.$inferInsert)["type"]; createdBy: string },
) {
  const [row] = await tx
    .insert(engagement)
    .values({ orgId, ...fields, targetGoLive: fields.targetGoLive ?? null })
    .returning({ id: engagement.id });
  return row!;
}

/** Name, target system and go-live: what an edit-access consultant may change. */
export async function updateEngagementDetails(tx: Tx, orgId: string, engagementId: string, fields: Details) {
  const rows = await tx
    .update(engagement)
    .set({ ...fields, targetGoLive: fields.targetGoLive ?? null })
    .where(and(eq(engagement.orgId, orgId), eq(engagement.id, engagementId)))
    .returning({ id: engagement.id });
  return rows.length > 0;
}

export async function setEngagementStatus(tx: Tx, orgId: string, engagementId: string, status: "active" | "archived") {
  const rows = await tx
    .update(engagement)
    .set({ status })
    .where(and(eq(engagement.orgId, orgId), eq(engagement.id, engagementId)))
    .returning({ id: engagement.id });
  return rows.length > 0;
}

/** Adds or changes one person's access to an engagement. */
export function upsertAssignment(tx: Tx, orgId: string, engagementId: string, userId: string, access: "edit" | "read") {
  return tx
    .insert(engagementAssignment)
    .values({ orgId, engagementId, userId, access })
    .onConflictDoUpdate({
      target: [engagementAssignment.engagementId, engagementAssignment.userId],
      set: { access },
    });
}

export function deleteAssignment(tx: Tx, orgId: string, engagementId: string, userId: string) {
  return tx
    .delete(engagementAssignment)
    .where(
      and(
        eq(engagementAssignment.orgId, orgId),
        eq(engagementAssignment.engagementId, engagementId),
        eq(engagementAssignment.userId, userId),
      ),
    );
}
