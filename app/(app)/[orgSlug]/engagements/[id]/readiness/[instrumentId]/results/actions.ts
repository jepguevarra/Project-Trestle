"use server";

import { revalidatePath } from "next/cache";
import { engagementAction, type EngagementContext } from "@/lib/auth/engagement";
import type { Tx } from "@/lib/db";
import { addTheme, removeTheme, saveNarrative } from "@/lib/db/mutations/report";
import { findInstrument } from "@/lib/db/queries/instruments";
import { openTextAnswers } from "@/lib/db/queries/results";
import { addThemeSchema, narrativeSchema, removeThemeSchema } from "@/lib/validation/report";

type Ctx = EngagementContext & { tx: Tx };

async function load(ctx: Ctx, instrumentId: string) {
  const row = await findInstrument(ctx.tx, ctx.org.id, ctx.engagement.id, instrumentId);
  if (!row) return null;
  return {
    scope: { orgId: ctx.org.id, engagementId: ctx.engagement.id, instrumentId },
    path: `/${ctx.org.slug}/engagements/${ctx.engagement.id}/readiness/${instrumentId}/results`,
  };
}
const notFound = { ok: false, message: "Not found." } as const;

export const saveNarrativeAction = engagementAction("edit", narrativeSchema, async (ctx, input) => {
  const r = await load(ctx, input.instrumentId);
  if (!r) return notFound;
  await saveNarrative(ctx.tx, r.scope, input.key, input.body);
  revalidatePath(r.path);
  return { ok: true, message: "Saved." };
});

export const addThemeAction = engagementAction("edit", addThemeSchema, async (ctx, input) => {
  const r = await load(ctx, input.instrumentId);
  if (!r) return notFound;
  // Only open-text answers on this instrument can be tagged.
  if (!(await openTextAnswers(ctx.tx, ctx.org.id, input.instrumentId)).some((a) => a.id === input.responseId)) return notFound;
  await addTheme(ctx.tx, r.scope, input.responseId, input.theme);
  revalidatePath(r.path);
  return { ok: true };
});

export const removeThemeAction = engagementAction("edit", removeThemeSchema, async (ctx, input) => {
  const r = await load(ctx, input.instrumentId);
  if (!r) return notFound;
  await removeTheme(ctx.tx, r.scope, input.themeId);
  revalidatePath(r.path);
  return { ok: true };
});
