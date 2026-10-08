import { and, eq, isNull } from "drizzle-orm";
import type { Role } from "@/lib/auth/roles";
import type { Tx } from "../rls";
import { invitation, membership } from "../schema";

export function createInvitation(
  tx: Tx,
  orgId: string,
  values: { email: string; role: Role; tokenHash: string; expiresAt: Date; invitedBy: string },
) {
  return tx.insert(invitation).values({ orgId, ...values });
}

export function deleteInvitation(tx: Tx, orgId: string, invitationId: string) {
  return tx.delete(invitation).where(and(eq(invitation.id, invitationId), eq(invitation.orgId, orgId)));
}

/** Revokes a pending invitation. Accepted ones are history and are left alone. */
export function deletePendingInvitation(tx: Tx, orgId: string, invitationId: string) {
  return tx
    .delete(invitation)
    .where(and(eq(invitation.id, invitationId), eq(invitation.orgId, orgId), isNull(invitation.acceptedAt)));
}

export function updateMembershipRole(tx: Tx, orgId: string, membershipId: string, role: Role) {
  return tx
    .update(membership)
    .set({ role })
    .where(and(eq(membership.id, membershipId), eq(membership.orgId, orgId)));
}

export function deleteMembership(tx: Tx, orgId: string, membershipId: string) {
  return tx.delete(membership).where(and(eq(membership.id, membershipId), eq(membership.orgId, orgId)));
}
