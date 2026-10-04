"use server";

import { revalidatePath } from "next/cache";
import { orgAction } from "@/lib/auth/action";
import { createEngagement as insertEngagement } from "@/lib/db/mutations/engagements";
import { findClient } from "@/lib/db/queries/clients";
import { createEngagementSchema } from "@/lib/validation/engagements";

export const createEngagement = orgAction("admin", createEngagementSchema, async ({ tx, org, user }, input) => {
  // The composite foreign key already rejects another org's client; this gives a readable error.
  if (!(await findClient(tx, org.id, input.clientId))) {
    return { ok: false, fieldErrors: { clientId: ["Pick a client from the list."] } };
  }
  const { id } = await insertEngagement(tx, org.id, { ...input, createdBy: user.id });
  revalidatePath(`/${org.slug}/engagements`);
  return { ok: true, redirectTo: `/${org.slug}/engagements/${id}` };
});
