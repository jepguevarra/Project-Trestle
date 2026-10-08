import { and, eq } from "drizzle-orm";
import { engagementTracked } from "@/lib/views/engagement";
import { diffTracked } from "@/lib/views/tracking";
import type { Tx } from "../rls";
import { client, engagement, engagementAssignment } from "../schema";
import { logTracking } from "./messages";

type Engagement = typeof engagement.$inferSelect;
export type EngagementPatch = Partial<
  Pick<
    Engagement,
    | "name" | "targetSystem" | "targetGoLive" | "startDate" | "endDate" | "objectives" | "scopeSummary"
    | "successCriteria" | "transitionOwner" | "type" | "clientId" | "status" | "ocmStage"
  >
>;

export async function createEngagement(
  tx: Tx,
  orgId: string,
  fields: { name: string; targetSystem: string; targetGoLive?: string; clientId: string; type: Engagement["type"]; createdBy: string },
) {
  const [row] = await tx
    .insert(engagement)
    .values({ orgId, ...fields, targetGoLive: fields.targetGoLive ?? null })
    .returning({ id: engagement.id });
  return row!;
}

async function clientName(tx: Tx, orgId: string, clientId: string) {
  const [row] = await tx.select({ name: client.name }).from(client).where(and(eq(client.orgId, orgId), eq(client.id, clientId)));
  return row?.name ?? null;
}

/**
 * Updates an engagement and, in the same transaction, writes one tracking message listing every
 * tracked field that changed. `before` is the row the caller already loaded inside this
 * transaction. Returns null when RLS let nothing through.
 */
export async function updateEngagementTracked(
  tx: Tx,
  args: { before: Engagement; beforeClientName: string; patch: EngagementPatch; authorUserId: string },
) {
  const { before, patch } = args;
  const [after] = await tx
    .update(engagement)
    .set(patch)
    .where(and(eq(engagement.orgId, before.orgId), eq(engagement.id, before.id)))
    .returning();
  if (!after) return null;

  const afterClientName =
    after.clientId === before.clientId ? args.beforeClientName : ((await clientName(tx, after.orgId, after.clientId)) ?? "");
  const entries = diffTracked(
    { ...before, clientName: args.beforeClientName },
    { ...after, clientName: afterClientName },
    engagementTracked,
  );
  await logTracking(
    tx,
    { orgId: before.orgId, engagementId: before.id, resType: "engagement", resId: before.id, authorUserId: args.authorUserId },
    entries,
  );
  return after;
}

/** Adds or changes one person's access to an engagement. */
export function upsertAssignment(tx: Tx, orgId: string, engagementId: string, userId: string, access: "edit" | "read") {
  return tx
    .insert(engagementAssignment)
    .values({ orgId, engagementId, userId, access })
    .onConflictDoUpdate({ target: [engagementAssignment.engagementId, engagementAssignment.userId], set: { access } });
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
