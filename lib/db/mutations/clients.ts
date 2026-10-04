import { and, eq } from "drizzle-orm";
import type { Tx } from "../rls";
import { client } from "../schema";

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

/** Returns false when the client is not in this org or the user cannot change it. */
export async function updateClient(tx: Tx, orgId: string, clientId: string, fields: ClientFields) {
  const rows = await tx
    .update(client)
    .set(columns(fields))
    .where(and(eq(client.orgId, orgId), eq(client.id, clientId)))
    .returning({ id: client.id });
  return rows.length > 0;
}
