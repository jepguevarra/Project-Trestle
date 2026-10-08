"use server";

import { revalidatePath } from "next/cache";
import { engagementAction } from "@/lib/auth/engagement";
import type { ActionState } from "@/lib/auth/action-state";
import { definitionSchema } from "@/lib/instruments/definition";
import { BLANK_DEFINITION, createInstrumentFromDefinition, updateInstrumentTracked } from "@/lib/db/mutations/instruments";
import { findInstrument, findTemplate } from "@/lib/db/queries/instruments";
import { createInstrumentSchema, instrumentStatusSchema } from "@/lib/validation/instruments";

const readinessPath = (orgSlug: string, engagementId: string) => `/${orgSlug}/engagements/${engagementId}/readiness`;

/** From a template (copied, so later template changes never reach it) or blank. */
export const createInstrument = engagementAction("edit", createInstrumentSchema, async (ctx, input) => {
  let definition = BLANK_DEFINITION;
  let templateId: string | null = null;
  if (input.templateId) {
    // RLS shows shipped templates and this org's own; anything else reads as missing.
    const template = await findTemplate(ctx.tx, input.templateId);
    if (!template || template.kind !== "readiness") return { ok: false, fieldErrors: { templateId: ["Pick a template from the list."] } };
    definition = definitionSchema.parse(template.definition);
    templateId = template.id;
  }
  const { id } = await createInstrumentFromDefinition(
    ctx.tx,
    { orgId: ctx.org.id, engagementId: ctx.engagement.id },
    { name: input.name, kind: "readiness", templateId, createdBy: ctx.user.id, wave: input.wave, waveLabel: input.waveLabel ?? null },
    definition,
  );
  const base = readinessPath(ctx.org.slug, ctx.engagement.id);
  revalidatePath(base);
  return { ok: true, redirectTo: `${base}/${id}` };
});

/** The statusbar and a kanban drag both land here. The database decides which moves are allowed. */
export const setInstrumentStatus = engagementAction("edit", instrumentStatusSchema, async (ctx, input) => {
  const row = await findInstrument(ctx.tx, ctx.org.id, ctx.engagement.id, input.instrumentId);
  if (!row) return { ok: false, message: "Not found." };
  if (row.instrument.status !== input.status) {
    if (input.status === "open" && row.questions === 0) {
      return { ok: false, message: "An instrument needs at least one question before it can open." };
    }
    await updateInstrumentTracked(ctx.tx, { before: row.instrument, patch: { status: input.status }, authorUserId: ctx.user.id });
  }
  const base = readinessPath(ctx.org.slug, ctx.engagement.id);
  revalidatePath(base);
  revalidatePath(`${base}/${input.instrumentId}`);
  return { ok: true };
});

/**
 * Adapts the kit's `(orgSlug, recordId, prev, formData{stage})` move shape to `setInstrumentStatus`.
 * Bind the engagement id first (kanban), or the engagement and instrument ids (statusbar).
 */
export async function moveInstrument(engagementId: string, orgSlug: string, instrumentId: string, prev: ActionState, formData: FormData) {
  const fd = new FormData();
  fd.set("instrumentId", instrumentId);
  fd.set("status", String(formData.get("stage") ?? ""));
  return setInstrumentStatus(orgSlug, engagementId, prev, fd);
}
