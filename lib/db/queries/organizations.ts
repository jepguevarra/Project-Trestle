import { and, asc, eq } from "drizzle-orm";
import type { Tx } from "../rls";
import { membership, organization } from "../schema";

export type Organization = typeof organization.$inferSelect;

/** The org at `slug` and the user's role in it; null if it doesn't exist or they aren't a member. */
export async function findOrgMembershipBySlug(tx: Tx, slug: string, userId: string) {
  const [row] = await tx
    .select({ org: organization, role: membership.role })
    .from(organization)
    .innerJoin(membership, eq(membership.orgId, organization.id))
    .where(and(eq(organization.slug, slug), eq(membership.userId, userId)))
    .limit(1);
  return row ?? null;
}

/** Every org the user belongs to, by name. */
export function listOrgsForUser(tx: Tx, userId: string) {
  return tx
    .select({ id: organization.id, name: organization.name, slug: organization.slug, role: membership.role })
    .from(organization)
    .innerJoin(membership, eq(membership.orgId, organization.id))
    .where(eq(membership.userId, userId))
    .orderBy(asc(organization.name));
}
