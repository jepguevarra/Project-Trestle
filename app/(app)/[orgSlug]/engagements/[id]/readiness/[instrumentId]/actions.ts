"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { engagementAction, type EngagementContext } from "@/lib/auth/engagement";
import type { ActionState } from "@/lib/auth/action-state";
import type { Tx } from "@/lib/db";
import {
  deleteChild,
  deleteDraftInstrument,
  reorderChildren,
  saveDimension,
  saveQuestion,
  saveSection,
  updateInstrumentTracked,
} from "@/lib/db/mutations/instruments";
import { logNote } from "@/lib/db/mutations/messages";
import { findInstrument, getInstrumentTree } from "@/lib/db/queries/instruments";
import { CHOICE_TYPES, SCORED_TYPES } from "@/lib/instruments/definition";
import { noteSchema } from "@/lib/validation/engagements";
import {
  deleteChildSchema,
  dimensionSchema,
  instrumentIdSchema,
  instrumentSettingsSchema,
  questionSchema,
  reorderSchema,
  sectionSchema,
} from "@/lib/validation/instruments";

type Ctx = EngagementContext & { tx: Tx };

const paths = (ctx: Ctx, instrumentId: string) => {
  const list = `/${ctx.org.slug}/engagements/${ctx.engagement.id}/readiness`;
  return { list, record: `${list}/${instrumentId}` };
};

const revalidate = (ctx: Ctx, instrumentId: string) => {
  const p = paths(ctx, instrumentId);
  revalidatePath(p.list);
  revalidatePath(p.record, "layout");
};

const frozen: ActionState = { ok: false, message: "Questions are fixed once an instrument has opened. Create a new wave to change them." };
const notFound: ActionState = { ok: false, message: "Not found." };

/** The instrument, only if it belongs to the engagement in the URL; and, for builder ops, only while draft. */
async function load(ctx: Ctx, instrumentId: string, opts: { draft?: boolean } = {}) {
  const row = await findInstrument(ctx.tx, ctx.org.id, ctx.engagement.id, instrumentId);
  if (!row) return { error: notFound } as const;
  if (opts.draft && row.instrument.status !== "draft") return { error: frozen } as const;
  const scope = { orgId: ctx.org.id, engagementId: ctx.engagement.id, instrumentId };
  return { row, scope } as const;
}

export const saveInstrumentSettings = engagementAction("edit", instrumentSettingsSchema, async (ctx, input) => {
  const r = await load(ctx, input.instrumentId);
  if ("error" in r) return r.error;
  const before = r.row.instrument;
  if (before.status !== "draft" && input.anonymity !== before.anonymity) {
    return { ok: false, fieldErrors: { anonymity: ["Anonymity is fixed once an instrument has opened."] } };
  }
  await updateInstrumentTracked(ctx.tx, {
    before,
    patch: {
      name: input.name,
      kind: input.kind,
      wave: input.wave,
      waveLabel: input.waveLabel ?? null,
      anonymity: input.anonymity,
      opensAt: input.opensAt ?? null,
      closesAt: input.closesAt ?? null,
    },
    authorUserId: ctx.user.id,
  });
  revalidate(ctx, input.instrumentId);
  return { ok: true, message: "Saved." };
});

export const logInstrumentNote = engagementAction("edit", noteSchema.extend(instrumentIdSchema.shape), async (ctx, input) => {
  const r = await load(ctx, input.instrumentId);
  if ("error" in r) return r.error;
  await logNote(
    ctx.tx,
    { orgId: ctx.org.id, engagementId: ctx.engagement.id, resType: "instrument", resId: input.instrumentId, authorUserId: ctx.user.id },
    input.body,
  );
  revalidate(ctx, input.instrumentId);
  return { ok: true };
});

export const deleteInstrument = engagementAction("edit", instrumentIdSchema, async (ctx, input) => {
  const r = await load(ctx, input.instrumentId, { draft: true });
  if ("error" in r) return r.error === frozen ? { ok: false, message: "Only a draft can be deleted. Close it instead." } : r.error;
  await deleteDraftInstrument(ctx.tx, ctx.org.id, input.instrumentId);
  const p = paths(ctx, input.instrumentId);
  revalidatePath(p.list);
  return { ok: true, redirectTo: p.list };
});

// ─── Builder ─────────────────────────────────────────────────────────────────────────────────

export const saveDimensionAction = engagementAction("edit", dimensionSchema, async (ctx, input) => {
  const r = await load(ctx, input.instrumentId, { draft: true });
  if ("error" in r) return r.error;
  const tree = await getInstrumentTree(ctx.tx, ctx.org.id, input.instrumentId);
  if (tree.dimensions.some((d) => d.name.toLowerCase() === input.name.toLowerCase() && d.id !== input.dimensionId)) {
    return { ok: false, fieldErrors: { name: ["There is already a dimension with that name."] } };
  }
  const row = await saveDimension(ctx.tx, r.scope, input);
  if (!row) return notFound;
  revalidate(ctx, input.instrumentId);
  return { ok: true, message: "Dimension saved." };
});

export const saveSectionAction = engagementAction("edit", sectionSchema, async (ctx, input) => {
  const r = await load(ctx, input.instrumentId, { draft: true });
  if ("error" in r) return r.error;
  const row = await saveSection(ctx.tx, r.scope, input);
  if (!row) return notFound;
  revalidate(ctx, input.instrumentId);
  return { ok: true, message: "Section saved." };
});

export const saveQuestionAction = engagementAction("edit", questionSchema, async (ctx, input) => {
  const r = await load(ctx, input.instrumentId, { draft: true });
  if ("error" in r) return r.error;
  // Pre-checked so a stale form gets a sentence, not a foreign-key error.
  const tree = await getInstrumentTree(ctx.tx, ctx.org.id, input.instrumentId);
  if (!tree.sections.some((s) => s.id === input.sectionId)) return { ok: false, fieldErrors: { sectionId: ["Pick a section."] } };
  const scored = SCORED_TYPES.includes(input.type);
  if (scored && !tree.dimensions.some((d) => d.id === input.dimensionId)) {
    return { ok: false, fieldErrors: { dimensionId: ["Pick a dimension."] } };
  }
  const row = await saveQuestion(ctx.tx, r.scope, {
    questionId: input.questionId,
    sectionId: input.sectionId,
    dimensionId: scored ? input.dimensionId! : null,
    text: input.text,
    helpText: input.helpText ?? null,
    type: input.type,
    weight: input.weight,
    isRequired: input.isRequired,
    // Only scored questions can be reverse-scored; options belong to choice types alone.
    isReverseScored: scored && input.isReverseScored,
    options: CHOICE_TYPES.includes(input.type) ? input.options : [],
  });
  if (!row) return notFound;
  revalidate(ctx, input.instrumentId);
  return { ok: true, message: "Question saved." };
});

const deleteSchema = deleteChildSchema.extend({ kind: z.enum(["dimension", "section", "question"]) });

export const deleteChildAction = engagementAction("edit", deleteSchema, async (ctx, input) => {
  const r = await load(ctx, input.instrumentId, { draft: true });
  if ("error" in r) return r.error;
  if (input.kind === "dimension") {
    const tree = await getInstrumentTree(ctx.tx, ctx.org.id, input.instrumentId);
    const inUse = tree.sections.flatMap((s) => s.questions).filter((q) => q.dimensionId === input.id).length;
    if (inUse) return { ok: false, message: `${inUse} ${inUse === 1 ? "question scores" : "questions score"} into this dimension. Move them first.` };
  }
  await deleteChild(ctx.tx, r.scope, input.kind, input.id);
  revalidate(ctx, input.instrumentId);
  return { ok: true };
});

export const reorderAction = engagementAction("edit", reorderSchema, async (ctx, input) => {
  const r = await load(ctx, input.instrumentId, { draft: true });
  if ("error" in r) return r.error;
  if (input.kind === "question" && input.sectionId) {
    const tree = await getInstrumentTree(ctx.tx, ctx.org.id, input.instrumentId);
    if (!tree.sections.some((s) => s.id === input.sectionId)) return notFound;
  }
  await reorderChildren(ctx.tx, r.scope, input.kind, input.ids, input.sectionId);
  revalidate(ctx, input.instrumentId);
  return { ok: true };
});
