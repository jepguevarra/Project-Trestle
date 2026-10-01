import "server-only";
import type { User } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { cache } from "react";
import { withRls } from "@/lib/db";
import { findOrgMembershipBySlug, listOrgsForUser, type Organization } from "@/lib/db/queries/organizations";
import { hasRole, type Role } from "./roles";
import { claimsFor, requireUser } from "./session";

export type { Organization };
export type OrgContext = { user: User; org: Organization; role: Role };

/**
 * The org at `slug` and the user's role in it, or null when the org does not exist *or* the user
 * is not a member. The two cases are indistinguishable on purpose: RLS hides other orgs entirely.
 */
export const resolveOrgFromSlug = cache(async (slug: string, user: User) =>
  withRls(claimsFor(user), (tx) => findOrgMembershipBySlug(tx, slug, user.id)),
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
export const listMyOrgs = cache(async (user: User) => withRls(claimsFor(user), (tx) => listOrgsForUser(tx, user.id)));
