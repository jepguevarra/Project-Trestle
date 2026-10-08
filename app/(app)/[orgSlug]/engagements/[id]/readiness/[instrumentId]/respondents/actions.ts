"use server";

import { revalidatePath } from "next/cache";
import { engagementAction, type EngagementContext } from "@/lib/auth/engagement";
import type { ActionState } from "@/lib/auth/action-state";
import type { Tx } from "@/lib/db";
import { deleteRespondent, insertRespondents, updateRespondent } from "@/lib/db/mutations/respondents";
import { findInstrument } from "@/lib/db/queries/instruments";
import { existingEmails, findRespondent } from "@/lib/db/queries/respondents";
import { parseRespondentList } from "@/lib/respondents/import";
import { importRespondentsSchema, respondentFieldsSchema, respondentIdSchema, respondentUpdateSchema } from "@/lib/validation/respondents";

type Ctx = EngagementContext & { tx: Tx };

const closed: ActionState = { ok: false, message: "This survey has closed, so its respondents can no longer change." };

/** The instrument in the URL's engagement, and whether its respondents can still change. */
async function load(ctx: Ctx, instrumentId: string) {
  const row = await findInstrument(ctx.tx, ctx.org.id, ctx.engagement.id, instrumentId);
  if (!row) return { error: { ok: false, message: "Not found." } as ActionState };
  if (row.instrument.status === "closed") return { error: closed };
  const base = `/${ctx.org.slug}/engagements/${ctx.engagement.id}/readiness/${instrumentId}`;
  return { scope: { orgId: ctx.org.id, engagementId: ctx.engagement.id, instrumentId }, base, status: row.instrument.status };
}

const revalidate = (base: string) => revalidatePath(base, "layout");

export const addRespondent = engagementAction("edit", respondentFieldsSchema, async (ctx, input) => {
  const r = await load(ctx, input.instrumentId);
  if ("error" in r) return r.error;
  if ((await existingEmails(ctx.tx, ctx.org.id, input.instrumentId)).has(input.email)) {
    return { ok: false, fieldErrors: { email: [`${input.email} is already a respondent on this survey.`] } };
  }
  await insertRespondents(ctx.tx, r.scope, [
    { name: input.name ?? null, email: input.email, department: input.department ?? null, roleTitle: input.roleTitle ?? null, seniority: input.seniority ?? null },
  ]);
  revalidate(r.base);
  return { ok: true, redirectTo: `${r.base}/respondents` };
});

/** A pasted or uploaded list. All or nothing: any invalid line or duplicate rejects the whole list. */
export const importRespondents = engagementAction("edit", importRespondentsSchema, async (ctx, input) => {
  const r = await load(ctx, input.instrumentId);
  if ("error" in r) return r.error;
  const parsed = parseRespondentList(input.list, await existingEmails(ctx.tx, ctx.org.id, input.instrumentId));
  if (!parsed.ok) return { ok: false, message: "Nothing was imported. Fix these lines and try again.", fieldErrors: { list: parsed.errors } };
  await insertRespondents(ctx.tx, r.scope, parsed.rows);
  revalidate(r.base);
  const n = parsed.rows.length;
  return { ok: true, message: `${n} ${n === 1 ? "person" : "people"} added.`, redirectTo: `${r.base}/respondents` };
});

export const saveRespondent = engagementAction("edit", respondentUpdateSchema, async (ctx, input) => {
  const r = await load(ctx, input.instrumentId);
  if ("error" in r) return r.error;
  const current = await findRespondent(ctx.tx, ctx.org.id, input.instrumentId, input.respondentId);
  if (!current) return { ok: false, message: "Not found." };
  const emailChanged = current.email !== input.email;
  if (emailChanged && (await existingEmails(ctx.tx, ctx.org.id, input.instrumentId)).has(input.email)) {
    return { ok: false, fieldErrors: { email: [`${input.email} is already a respondent on this survey.`] } };
  }
  await updateRespondent(ctx.tx, r.scope, input.respondentId, {
    name: input.name ?? null,
    email: input.email,
    department: input.department ?? null,
    roleTitle: input.roleTitle ?? null,
    seniority: input.seniority ?? null,
    // A corrected address gets a fresh invitation; the old link stopped working (database trigger).
    ...(emailChanged ? { invitedAt: null, remindedAt: null } : {}),
  });
  revalidate(r.base);
  return {
    ok: true,
    message: emailChanged && current.invitedAt ? "Saved. The link sent to the old address no longer works; send invitations to send a new one." : "Saved.",
  };
});

export const removeRespondent = engagementAction("edit", respondentIdSchema, async (ctx, input) => {
  const r = await load(ctx, input.instrumentId);
  if ("error" in r) return r.error;
  const deleted = await deleteRespondent(ctx.tx, r.scope, input.respondentId);
  if (!deleted) return { ok: false, message: "Someone who has submitted cannot be removed: their answers are part of the results." };
  revalidate(r.base);
  return { ok: true, redirectTo: `${r.base}/respondents` };
});
