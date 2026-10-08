import { and, asc, eq } from "drizzle-orm";
import type { Tx } from "../rls";
import { client } from "../schema";

export type Client = typeof client.$inferSelect;

export async function findClient(tx: Tx, orgId: string, clientId: string): Promise<Client | null> {
  const [row] = await tx
    .select()
    .from(client)
    .where(and(eq(client.orgId, orgId), eq(client.id, clientId)));
  return row ?? null;
}

/** For the create-engagement form. */
export function listClientOptions(tx: Tx, orgId: string) {
  return tx.select({ id: client.id, name: client.name }).from(client).where(eq(client.orgId, orgId)).orderBy(asc(client.name));
}
