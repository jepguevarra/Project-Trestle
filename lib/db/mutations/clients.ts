import { and, eq } from "drizzle-orm";
import { clientTracked } from "@/lib/views/client";
import { diffTracked } from "@/lib/views/tracking";
import type { Tx } from "../rls";
import { client } from "../schema";
import { logTracking } from "./messages";

type ClientFields = { name: string; industry?: string; sizeBand?: "micro" | "small" | "medium" | "large"; notes?: string };

const columns = (f: ClientFields) => ({
  name: f.name,
  industry: f.industry ?? null,
  sizeBand: f.sizeBand ?? null,
  notes: f.notes ?? null,
});

export async function createClient(tx: Tx, orgId: string, fields: ClientFields) {
  const [row] = await tx.insert(client).values({ orgId, ...columns(fields) }).returning({ id: client.id });
  return row!;
}

/** Updates a client and logs one tracking message. Returns false when nothing was updated. */
export async function updateClientTracked(tx: Tx, orgId: string, clientId: string, fields: ClientFields, authorUserId: string) {
  const [before] = await tx.select().from(client).where(and(eq(client.orgId, orgId), eq(client.id, clientId)));
  if (!before) return false;
  const [after] = await tx
    .update(client)
    .set(columns(fields))
    .where(and(eq(client.orgId, orgId), eq(client.id, clientId)))
    .returning();
  if (!after) return false;
  await logTracking(
    tx,
    { orgId, engagementId: null, resType: "client", resId: clientId, authorUserId },
    diffTracked(before, after, clientTracked),
  );
  return true;
}
