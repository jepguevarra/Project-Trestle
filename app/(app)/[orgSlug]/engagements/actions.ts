"use server";

import { revalidatePath } from "next/cache";
import { orgAction } from "@/lib/auth/action";
import { createEngagement as insertEngagement, updateEngagementTracked } from "@/lib/db/mutations/engagements";
import { findClient } from "@/lib/db/queries/clients";
import { findEngagementWithAccess } from "@/lib/db/queries/engagements";
import { bulkEngagementSchema, createEngagementSchema } from "@/lib/validation/engagements";

export const createEngagement = orgAction("admin", createEngagementSchema, async ({ tx, org, user }, input) => {
  // The composite foreign key already rejects another org's client; this gives a readable error.
  if (!(await findClient(tx, org.id, input.clientId))) {
    return { ok: false, fieldErrors: { clientId: ["Pick a client from the list."] } };
  }
  const { id } = await insertEngagement(tx, org.id, { ...input, createdBy: user.id });
  revalidatePath(`/${org.slug}/engagements`);
  return { ok: true, redirectTo: `/${org.slug}/engagements/${id}/overview` };
});

/** The list's Action menu. Admin only; each row is re-read under RLS and tracked individually. */
export const bulkEngagements = orgAction("admin", bulkEngagementSchema, async ({ tx, org, user }, input) => {
  const status = input.op === "archive" ? "archived" : "active";
  let changed = 0;
  for (const id of input.ids) {
    const row = await findEngagementWithAccess(tx, org.id, id);
    if (!row || row.engagement.status === status) continue;
    await updateEngagementTracked(tx, { before: row.engagement, beforeClientName: row.clientName, patch: { status }, authorUserId: user.id });
    changed += 1;
  }
  revalidatePath(`/${org.slug}/engagements`);
  return { ok: true, message: `${changed} ${changed === 1 ? "engagement" : "engagements"} ${input.op === "archive" ? "archived" : "re-activated"}.` };
});
