"use server";

import { revalidatePath } from "next/cache";
import { orgAction } from "@/lib/auth/action";
import { assignableRoles } from "@/lib/auth/roles";
import {
  createInvitation,
  deleteInvitation,
  deleteMembership,
  deletePendingInvitation,
  updateMembershipRole,
} from "@/lib/db/mutations/members";
import { findMembershipRole, findUnacceptedInvitation, isOrgMemberEmail } from "@/lib/db/queries/members";
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
const memberGone = { ok: false, message: "That member no longer exists." } as const;

export const inviteMember = orgAction("admin", inviteMemberSchema, async ({ tx, org, role, user }, input) => {
  if (!assignableRoles(role).includes(input.role)) return forbiddenRole;
  if (await isOrgMemberEmail(tx, org.id, input.email)) {
    return { ok: false, message: `${input.email} is already a member.` };
  }

  // Checked up front rather than by catching the unique violation: a failed statement aborts the
  // whole transaction. An expired, unaccepted invitation is cleared so the address can be re-invited.
  const existing = await findUnacceptedInvitation(tx, org.id, input.email);
  if (existing && existing.expiresAt > new Date()) {
    return { ok: false, message: `${input.email} already has a pending invitation.` };
  }
  if (existing) await deleteInvitation(tx, org.id, existing.id);

  const token = generateInvitationToken();
  await createInvitation(tx, org.id, {
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
  const current = await findMembershipRole(tx, org.id, input.membershipId);
  if (!current) return memberGone;
  const allowed = assignableRoles(role);
  if (!allowed.includes(current) || !allowed.includes(input.role)) return forbiddenRole;

  await updateMembershipRole(tx, org.id, input.membershipId, input.role);
  revalidatePath(membersPath(org.slug));
  return { ok: true, message: "Role updated." };
});

export const removeMember = orgAction("admin", removeMemberSchema, async ({ tx, org, role }, input) => {
  const current = await findMembershipRole(tx, org.id, input.membershipId);
  if (!current) return memberGone;
  if (!assignableRoles(role).includes(current)) return forbiddenRole;

  await deleteMembership(tx, org.id, input.membershipId);
  revalidatePath(membersPath(org.slug));
  return { ok: true, message: "Member removed." };
});

export const revokeInvitation = orgAction("admin", revokeInvitationSchema, async ({ tx, org }, input) => {
  await deletePendingInvitation(tx, org.id, input.invitationId);
  revalidatePath(membersPath(org.slug));
  return { ok: true, message: "Invitation revoked." };
});
