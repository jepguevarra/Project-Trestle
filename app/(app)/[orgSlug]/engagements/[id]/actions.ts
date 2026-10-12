"use server";

import { revalidatePath } from "next/cache";
import { engagementAction, type EngagementContext } from "@/lib/auth/engagement";
import { hasRole } from "@/lib/auth/roles";
import type { Tx } from "@/lib/db";
import { deleteAssignment, updateEngagementTracked, upsertAssignment, type EngagementPatch } from "@/lib/db/mutations/engagements";
import { logNote } from "@/lib/db/mutations/messages";
import { findClient } from "@/lib/db/queries/clients";
import { findMemberRoleByUserId } from "@/lib/db/queries/members";
import {
  assignSchema,
  emptySchema,
  engagementFormSchema,
  noteSchema,
  stageSchema,
  unassignSchema,
} from "@/lib/validation/engagements";

const revalidate = (orgSlug: string, id: string) => {
  revalidatePath(`/${orgSlug}/engagements`);
  revalidatePath(`/${orgSlug}/engagements/${id}`, "layout");
};

const update = (ctx: EngagementContext & { tx: Tx }, patch: EngagementPatch) =>
  updateEngagementTracked(ctx.tx, {
    before: ctx.engagement,
    beforeClientName: ctx.clientName,
    patch,
    authorUserId: ctx.user.id,
  });

export const saveEngagement = engagementAction("edit", engagementFormSchema, async (ctx, input) => {
  const patch: EngagementPatch = {
    name: input.name,
    targetSystem: input.targetSystem,
    targetGoLive: input.targetGoLive ?? null,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    objectives: input.objectives ?? null,
    scopeSummary: input.scopeSummary ?? null,
    successCriteria: input.successCriteria ?? null,
    transitionOwner: input.transitionOwner ?? null,
  };
  // Client and type are admin decisions; for anyone else they are ignored, and the database
  // trigger would refuse them anyway.
  if (ctx.isAdmin) {
    if (input.type) patch.type = input.type;
    if (input.clientId && input.clientId !== ctx.engagement.clientId) {
      if (!(await findClient(ctx.tx, ctx.org.id, input.clientId))) {
        return { ok: false, fieldErrors: { clientId: ["Pick a client from the list."] } };
      }
      patch.clientId = input.clientId;
    }
  }
  await update(ctx, patch);
  revalidate(ctx.org.slug, ctx.engagement.id);
  return { ok: true, message: "Saved." };
});

/** The statusbar and a kanban drag both land here, so validation and tracking are identical. */
export const setEngagementStage = engagementAction("edit", stageSchema, async (ctx, input) => {
  if (input.stage !== ctx.engagement.ocmStage) await update(ctx, { ocmStage: input.stage });
  revalidate(ctx.org.slug, ctx.engagement.id);
  return { ok: true };
});

export const archiveEngagement = engagementAction("admin", emptySchema, async (ctx) => {
  await update(ctx, { status: "archived" });
  revalidate(ctx.org.slug, ctx.engagement.id);
  return { ok: true, message: "Archived. It stays readable and no longer counts as active." };
});

export const reactivateEngagement = engagementAction("admin", emptySchema, async (ctx) => {
  await update(ctx, { status: "active" });
  revalidate(ctx.org.slug, ctx.engagement.id);
  return { ok: true, message: "Re-activated." };
});

export const logEngagementNote = engagementAction("edit", noteSchema, async (ctx, input) => {
  await logNote(
    ctx.tx,
    { orgId: ctx.org.id, engagementId: ctx.engagement.id, resType: "engagement", resId: ctx.engagement.id, authorUserId: ctx.user.id },
    input.body,
  );
  revalidatePath(`/${ctx.org.slug}/engagements/${ctx.engagement.id}`, "layout");
  return { ok: true };
});

export const assignMember = engagementAction("admin", assignSchema, async (ctx, input) => {
  const role = await findMemberRoleByUserId(ctx.tx, ctx.org.id, input.userId);
  if (!role) return { ok: false, fieldErrors: { userId: ["That person is not a member of this organisation."] } };
  if (hasRole(role, "admin")) return { ok: false, fieldErrors: { userId: ["Owners and admins already see every engagement."] } };
  if (role === "viewer" && input.access === "edit") {
    return { ok: false, fieldErrors: { access: ["Viewers are read-only. Give them read access."] } };
  }
  await upsertAssignment(ctx.tx, ctx.org.id, ctx.engagement.id, input.userId, input.access);
  revalidate(ctx.org.slug, ctx.engagement.id);
  return { ok: true, message: "Team updated." };
});

export const unassignMember = engagementAction("admin", unassignSchema, async (ctx, input) => {
  await deleteAssignment(ctx.tx, ctx.org.id, ctx.engagement.id, input.userId);
  revalidate(ctx.org.slug, ctx.engagement.id);
  return { ok: true, message: "Removed from the engagement." };
});
