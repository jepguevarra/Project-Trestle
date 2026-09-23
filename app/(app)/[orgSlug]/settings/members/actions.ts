"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { orgAction } from "@/lib/auth/action";
import { assignableRoles } from "@/lib/auth/roles";
import { invitation, membership } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { invitationEmail } from "@/lib/email/invitation";
import { env } from "@/lib/env";
import { generateInvitationToken, hashInvitationToken, INVITATION_TTL_MS } from "@/lib/tokens/invitation";
import {
  changeRoleSchema,
  inviteMemberSchema,
  removeMemberSchema,
  revokeInvitationSchema,
} from "@/lib/validation/auth";

const membersPath = (slug: string) => `/${slug}/settings/members`;
const forbiddenRole = { ok: false, message: "You can't assign that role." } as const;

export const inviteMember = orgAction("admin", inviteMemberSchema, async ({ tx, org, role, user }, input) => {
  if (!assignableRoles(role).includes(input.role)) return forbiddenRole;

  const existing = await tx.execute<{ email: string }>(
    sql`select email from public.org_members(${org.id}) where lower(email) = ${input.email}`,
  );
  if (existing.length > 0) return { ok: false, message: `${input.email} is already a member.` };

  // Checked up front rather than by catching the unique violation: a failed statement aborts the
  // whole transaction. An expired, unaccepted invitation is cleared so the address can be re-invited.
  const pendingForEmail = and(
    eq(invitation.orgId, org.id),
    sql`lower(${invitation.email}) = ${input.email}`,
    isNull(invitation.acceptedAt),
  );
  const [pending] = await tx.select({ expiresAt: invitation.expiresAt }).from(invitation).where(pendingForEmail);
  if (pending && pending.expiresAt > new Date()) {
    return { ok: false, message: `${input.email} already has a pending invitation.` };
  }
  if (pending) await tx.delete(invitation).where(pendingForEmail);

  const token = generateInvitationToken();
  await tx.insert(invitation).values({
    orgId: org.id,
    email: input.email,
    role: input.role,
    tokenHash: hashInvitationToken(token),
    expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    invitedBy: user.id,
  });

  // Sent inside the transaction: if delivery fails, the invitation row rolls back with it.
  await sendEmail(
    invitationEmail({
      to: input.email,
      orgName: org.name,
      role: input.role,
      inviterEmail: user.email ?? null,
      acceptUrl: `${env.APP_URL}/invite/${token}`,
    }),
  );
  revalidatePath(membersPath(org.slug));
  return { ok: true, message: `Invitation sent to ${input.email}.` };
});

export const changeRole = orgAction("admin", changeRoleSchema, async ({ tx, org, role }, input) => {
  const [target] = await tx
    .select({ role: membership.role })
    .from(membership)
    .where(and(eq(membership.id, input.membershipId), eq(membership.orgId, org.id)));
  if (!target) return { ok: false, message: "That member no longer exists." };

  const allowed = assignableRoles(role);
  if (!allowed.includes(target.role) || !allowed.includes(input.role)) return forbiddenRole;

  await tx
    .update(membership)
    .set({ role: input.role })
    .where(and(eq(membership.id, input.membershipId), eq(membership.orgId, org.id)));
  revalidatePath(membersPath(org.slug));
  return { ok: true, message: "Role updated." };
});

export const removeMember = orgAction("admin", removeMemberSchema, async ({ tx, org, role }, input) => {
  const [target] = await tx
    .select({ role: membership.role })
    .from(membership)
    .where(and(eq(membership.id, input.membershipId), eq(membership.orgId, org.id)));
  if (!target) return { ok: false, message: "That member no longer exists." };
  if (!assignableRoles(role).includes(target.role)) return forbiddenRole;

  await tx.delete(membership).where(and(eq(membership.id, input.membershipId), eq(membership.orgId, org.id)));
  revalidatePath(membersPath(org.slug));
  return { ok: true, message: "Member removed." };
});

export const revokeInvitation = orgAction("admin", revokeInvitationSchema, async ({ tx, org }, input) => {
  await tx
    .delete(invitation)
    .where(and(eq(invitation.id, input.invitationId), eq(invitation.orgId, org.id), isNull(invitation.acceptedAt)));
  revalidatePath(membersPath(org.slug));
  return { ok: true, message: "Invitation revoked." };
});
