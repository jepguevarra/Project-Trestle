import { sql } from "drizzle-orm";
import type { Tx } from "../rls";

/** Creates an org owned by the current user (public.create_organization). Returns its slug. */
export async function createOrganization(tx: Tx, name: string): Promise<string> {
  const [row] = await tx.execute<{ slug: string }>(sql`select public.create_organization(${name}) as slug`);
  return row!.slug;
}

/**
 * Accepts an invitation as the current user (public.accept_invitation). Returns the org's slug.
 * Raises TR404 (invalid, used or expired) or TR403 (sent to another address).
 */
export async function acceptInvitation(tx: Tx, token: string): Promise<string> {
  const [row] = await tx.execute<{ slug: string }>(sql`select public.accept_invitation(${token}) as slug`);
  return row!.slug;
}
