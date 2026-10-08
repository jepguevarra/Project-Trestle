import { and, asc, eq, gt, isNull, sql } from "drizzle-orm";
import type { Role } from "@/lib/auth/roles";
import type { Tx } from "../rls";
import { invitation, membership } from "../schema";

export type OrgMember = { membershipId: string; userId: string; email: string; role: Role; createdAt: Date };

/** The org's roster with emails, via public.org_members (auth.users is not readable directly). */
export async function listOrgMembers(tx: Tx, orgId: string): Promise<OrgMember[]> {
  const rows = await tx.execute<{ membership_id: string; user_id: string; email: string; role: Role; created_at: string }>(
    sql`select * from public.org_members(${orgId})`,
  );
  return rows.map((r) => ({
    membershipId: r.membership_id,
    userId: r.user_id,
    email: r.email,
    role: r.role,
    createdAt: new Date(r.created_at),
  }));
}

/** True if someone with this email (case-insensitive) is already a member of the org. */
export async function isOrgMemberEmail(tx: Tx, orgId: string, email: string): Promise<boolean> {
  const rows = await tx.execute(
    sql`select 1 from public.org_members(${orgId}) where lower(email) = lower(${email})`,
  );
  return rows.length > 0;
}

export async function findMembershipRole(tx: Tx, orgId: string, membershipId: string): Promise<Role | null> {
  const [row] = await tx
    .select({ role: membership.role })
    .from(membership)
    .where(and(eq(membership.id, membershipId), eq(membership.orgId, orgId)));
  return row?.role ?? null;
}

/** Unaccepted, unexpired invitations. Returns nothing for non-admins (RLS). */
export function listPendingInvitations(tx: Tx, orgId: string) {
  return tx
    .select({ id: invitation.id, email: invitation.email, role: invitation.role, expiresAt: invitation.expiresAt })
    .from(invitation)
    .where(and(eq(invitation.orgId, orgId), isNull(invitation.acceptedAt), gt(invitation.expiresAt, new Date())))
    .orderBy(asc(invitation.email));
}

/** The unaccepted invitation for this address, expired or not; at most one exists. */
export async function findUnacceptedInvitation(tx: Tx, orgId: string, email: string) {
  const [row] = await tx
    .select({ id: invitation.id, expiresAt: invitation.expiresAt })
    .from(invitation)
    .where(
      and(eq(invitation.orgId, orgId), sql`lower(${invitation.email}) = lower(${email})`, isNull(invitation.acceptedAt)),
    );
  return row ?? null;
}

/** A user's role in the org, or null if they are not a member. */
export async function findMemberRoleByUserId(tx: Tx, orgId: string, userId: string): Promise<Role | null> {
  const [row] = await tx
    .select({ role: membership.role })
    .from(membership)
    .where(and(eq(membership.orgId, orgId), eq(membership.userId, userId)));
  return row?.role ?? null;
}
