import { and, asc, count, eq } from "drizzle-orm";
import type { Tx } from "../rls";
import { client, engagement } from "../schema";

export type Client = typeof client.$inferSelect;

/** Clients the user can see in the org, with how many engagements (visible to them) each has. */
export function listClients(tx: Tx, orgId: string) {
  return tx
    .select({
      id: client.id,
      name: client.name,
      industry: client.industry,
      sizeBand: client.sizeBand,
      engagementCount: count(engagement.id),
    })
    .from(client)
    .leftJoin(engagement, and(eq(engagement.clientId, client.id), eq(engagement.orgId, client.orgId)))
    .where(eq(client.orgId, orgId))
    .groupBy(client.id)
    .orderBy(asc(client.name));
}

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
