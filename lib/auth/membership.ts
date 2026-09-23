import "server-only";
import type { User } from "@supabase/supabase-js";
import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { cache } from "react";
import { withRls } from "@/lib/db";
import { membership, organization } from "@/lib/db/schema";
import { hasRole, type Role } from "./roles";
import { claimsFor, requireUser } from "./session";

export type Organization = typeof organization.$inferSelect;
export type OrgContext = { user: User; org: Organization; role: Role };

/**
 * The org at `slug` and the user's role in it, or null when the org does not exist *or* the user
 * is not a member. The two cases are indistinguishable on purpose: RLS hides other orgs entirely.
 */
export const resolveOrgFromSlug = cache(
  async (slug: string, user: User): Promise<{ org: Organization; role: Role } | null> => {
    const [row] = await withRls(claimsFor(user), (tx) =>
      tx
        .select({ org: organization, role: membership.role })
        .from(organization)
        .innerJoin(membership, eq(membership.orgId, organization.id))
        .where(and(eq(organization.slug, slug), eq(membership.userId, user.id)))
        .limit(1),
    );
    return row ?? null;
  },
);

/**
 * Guard for pages and layouts under /[orgSlug]. Non-members get a 404, never a 403, so an org's
 * existence is not revealed. A member below `minRole` also gets a 404.
 */
export async function requireMembership(orgSlug: string, minRole: Role = "viewer"): Promise<OrgContext> {
  const user = await requireUser();
  const ctx = await resolveOrgFromSlug(orgSlug, user);
  if (!ctx || !hasRole(ctx.role, minRole)) notFound();
  return { user, ...ctx };
}

/** Every org the user belongs to, for the org switcher and the post-login redirect. */
export const listMyOrgs = cache(async (user: User) =>
  withRls(claimsFor(user), (tx) =>
    tx
      .select({ id: organization.id, name: organization.name, slug: organization.slug, role: membership.role })
      .from(organization)
      .innerJoin(membership, eq(membership.orgId, organization.id))
      .where(eq(membership.userId, user.id))
      .orderBy(asc(organization.name)),
  ),
);
