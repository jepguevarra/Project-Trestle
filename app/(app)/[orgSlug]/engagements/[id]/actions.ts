"use server";

import { revalidatePath } from "next/cache";
import { engagementAction } from "@/lib/auth/engagement";
import { hasRole } from "@/lib/auth/roles";
import {
  deleteAssignment,
  setEngagementStatus,
  updateEngagementDetails as saveDetails,
  upsertAssignment,
} from "@/lib/db/mutations/engagements";
import { findMemberRoleByUserId } from "@/lib/db/queries/members";
import { assignSchema, emptySchema, engagementDetailsSchema, unassignSchema } from "@/lib/validation/engagements";

const paths = (orgSlug: string, id: string) => {
  revalidatePath(`/${orgSlug}/engagements`);
  revalidatePath(`/${orgSlug}/engagements/${id}`, "layout");
};

export const updateEngagementDetails = engagementAction("edit", engagementDetailsSchema, async (ctx, input) => {
  await saveDetails(ctx.tx, ctx.org.id, ctx.engagement.id, input);
  paths(ctx.org.slug, ctx.engagement.id);
  return { ok: true, message: "Saved." };
});

export const archiveEngagement = engagementAction("admin", emptySchema, async (ctx) => {
  await setEngagementStatus(ctx.tx, ctx.org.id, ctx.engagement.id, "archived");
  paths(ctx.org.slug, ctx.engagement.id);
  return { ok: true, message: "Archived. It stays readable and no longer counts as active." };
});

export const reactivateEngagement = engagementAction("admin", emptySchema, async (ctx) => {
  await setEngagementStatus(ctx.tx, ctx.org.id, ctx.engagement.id, "active");
  paths(ctx.org.slug, ctx.engagement.id);
  return { ok: true, message: "Re-activated." };
});

export const assignMember = engagementAction("admin", assignSchema, async (ctx, input) => {
  const role = await findMemberRoleByUserId(ctx.tx, ctx.org.id, input.userId);
  if (!role) return { ok: false, fieldErrors: { userId: ["That person is not a member of this organisation."] } };
  if (hasRole(role, "admin")) {
    return { ok: false, fieldErrors: { userId: ["Owners and admins already see every engagement."] } };
  }
  if (role === "viewer" && input.access === "edit") {
    return { ok: false, fieldErrors: { access: ["Viewers are read-only. Give them read access."] } };
  }
  await upsertAssignment(ctx.tx, ctx.org.id, ctx.engagement.id, input.userId, input.access);
  paths(ctx.org.slug, ctx.engagement.id);
  return { ok: true, message: "Team updated." };
});

export const unassignMember = engagementAction("admin", unassignSchema, async (ctx, input) => {
  await deleteAssignment(ctx.tx, ctx.org.id, ctx.engagement.id, input.userId);
  paths(ctx.org.slug, ctx.engagement.id);
  return { ok: true, message: "Removed from the engagement." };
});
