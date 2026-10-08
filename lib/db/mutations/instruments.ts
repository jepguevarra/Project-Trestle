import { and, eq, sql } from "drizzle-orm";
import type { InstrumentDefinition } from "@/lib/instruments/definition";
import { instrumentTracked } from "@/lib/views/instrument";
import { diffTracked } from "@/lib/views/tracking";
import type { Tx } from "../rls";
import { dimension, instrument, question, questionOption, section } from "../schema";
import { logTracking } from "./messages";

type Scope = { orgId: string; engagementId: string };

/**
 * Creates an instrument and copies a definition into its dimensions, sections, questions and
 * options, all inside the caller's transaction (and so under the caller's RLS). The instrument
 * keeps its own copy: later edits to the template never change it.
 */
export async function createInstrumentFromDefinition(
  tx: Tx,
  scope: Scope,
  fields: { name: string; kind: (typeof instrument.$inferInsert)["kind"]; templateId: string | null; createdBy: string; wave?: number; waveLabel?: string | null },
  definition: InstrumentDefinition,
) {
  const [inst] = await tx
    .insert(instrument)
    .values({ ...scope, ...fields, wave: fields.wave ?? 1, waveLabel: fields.waveLabel ?? null })
    .returning({ id: instrument.id });
  const child = { ...scope, instrumentId: inst!.id };

  const dimensionIds = new Map<string, string>();
  if (definition.dimensions.length) {
    const rows = await tx
      .insert(dimension)
      .values(definition.dimensions.map((d, i) => ({ ...child, name: d.name, weight: d.weight, sortOrder: i })))
      .returning({ id: dimension.id, name: dimension.name });
    definition.dimensions.forEach((d) => dimensionIds.set(d.key, rows.find((r) => r.name === d.name)!.id));
  }

  let order = 0;
  for (const [si, s] of definition.sections.entries()) {
    const [sec] = await tx
      .insert(section)
      .values({ ...child, title: s.title, description: s.description ?? null, sortOrder: si })
      .returning({ id: section.id });
    for (const q of s.questions) {
      const [row] = await tx
        .insert(question)
        .values({
          ...child,
          sectionId: sec!.id,
          dimensionId: q.dimension ? dimensionIds.get(q.dimension)! : null,
          text: q.text,
          helpText: q.helpText ?? null,
          type: q.type,
          weight: q.weight,
          isRequired: q.required,
          isReverseScored: q.reverse,
          source: q.source ?? null,
          sortOrder: order++,
        })
        .returning({ id: question.id });
      if (q.options?.length) {
        await tx
          .insert(questionOption)
          .values(q.options.map((o, i) => ({ ...child, questionId: row!.id, label: o.label, value: o.value, sortOrder: i })));
      }
    }
  }
  return inst!;
}

/** A blank instrument: one empty section, no dimensions, ready for the builder. */
export const BLANK_DEFINITION = { dimensions: [], sections: [{ title: "Section 1", questions: [] }] } as unknown as InstrumentDefinition;

// ─── Settings and status ─────────────────────────────────────────────────────────────────────

type InstrumentRow = typeof instrument.$inferSelect;
export type InstrumentPatch = Partial<
  Pick<InstrumentRow, "name" | "kind" | "wave" | "waveLabel" | "anonymity" | "opensAt" | "closesAt" | "status">
>;

/**
 * Updates an instrument and writes one tracking message for whatever changed, in the caller's
 * transaction. The status rules (never back to draft; open needs a question) are the database
 * trigger's, so a refused move raises rather than returning null. Null means RLS let nothing through.
 */
export async function updateInstrumentTracked(tx: Tx, args: { before: InstrumentRow; patch: InstrumentPatch; authorUserId: string }) {
  const { before, patch } = args;
  const [after] = await tx
    .update(instrument)
    .set(patch)
    .where(and(eq(instrument.orgId, before.orgId), eq(instrument.id, before.id)))
    .returning();
  if (!after) return null;
  await logTracking(
    tx,
    { orgId: before.orgId, engagementId: before.engagementId, resType: "instrument", resId: before.id, authorUserId: args.authorUserId },
    diffTracked(before, after, instrumentTracked),
  );
  return after;
}

/** Draft instruments only: the delete policy refuses the rest, and this returns 0. */
export async function deleteDraftInstrument(tx: Tx, orgId: string, instrumentId: string) {
  const rows = await tx
    .delete(instrument)
    .where(and(eq(instrument.orgId, orgId), eq(instrument.id, instrumentId), eq(instrument.status, "draft")))
    .returning({ id: instrument.id });
  return rows.length;
}

// ─── Builder ─────────────────────────────────────────────────────────────────────────────────
// Every write below is refused by RLS once the instrument leaves draft. The actions pre-check
// the status so the user gets a sentence rather than a permission error.

type Child = Scope & { instrumentId: string };

export async function saveDimension(tx: Tx, scope: Child, input: { dimensionId?: string; name: string; weight: number }) {
  if (input.dimensionId) {
    const [row] = await tx
      .update(dimension)
      .set({ name: input.name, weight: input.weight })
      .where(and(eq(dimension.orgId, scope.orgId), eq(dimension.instrumentId, scope.instrumentId), eq(dimension.id, input.dimensionId)))
      .returning({ id: dimension.id });
    return row ?? null;
  }
  const [max] = await tx
    .select({ n: sql<number>`coalesce(max(${dimension.sortOrder}) + 1, 0)::int` })
    .from(dimension)
    .where(and(eq(dimension.orgId, scope.orgId), eq(dimension.instrumentId, scope.instrumentId)));
  const [row] = await tx
    .insert(dimension)
    .values({ ...scope, name: input.name, weight: input.weight, sortOrder: max?.n ?? 0 })
    .returning({ id: dimension.id });
  return row ?? null;
}

export async function saveSection(tx: Tx, scope: Child, input: { sectionId?: string; title: string; description?: string }) {
  if (input.sectionId) {
    const [row] = await tx
      .update(section)
      .set({ title: input.title, description: input.description ?? null })
      .where(and(eq(section.orgId, scope.orgId), eq(section.instrumentId, scope.instrumentId), eq(section.id, input.sectionId)))
      .returning({ id: section.id });
    return row ?? null;
  }
  const [max] = await tx
    .select({ n: sql<number>`coalesce(max(${section.sortOrder}) + 1, 0)::int` })
    .from(section)
    .where(and(eq(section.orgId, scope.orgId), eq(section.instrumentId, scope.instrumentId)));
  const [row] = await tx
    .insert(section)
    .values({ ...scope, title: input.title, description: input.description ?? null, sortOrder: max?.n ?? 0 })
    .returning({ id: section.id });
  return row ?? null;
}

export type QuestionInput = {
  questionId?: string;
  sectionId: string;
  dimensionId: string | null;
  text: string;
  helpText: string | null;
  type: (typeof question.$inferInsert)["type"];
  weight: number;
  isRequired: boolean;
  isReverseScored: boolean;
  options: { label: string; value: number }[];
};

/** Inserts or updates a question and replaces its options. New questions go to the end of their section. */
export async function saveQuestion(tx: Tx, scope: Child, input: QuestionInput) {
  const { questionId, options, ...fields } = input;
  const inScope = and(eq(question.orgId, scope.orgId), eq(question.instrumentId, scope.instrumentId));
  let id: string | undefined;
  if (questionId) {
    const [row] = await tx.update(question).set(fields).where(and(inScope, eq(question.id, questionId))).returning({ id: question.id });
    id = row?.id;
  } else {
    const [max] = await tx
      .select({ n: sql<number>`coalesce(max(${question.sortOrder}) + 1, 0)::int` })
      .from(question)
      .where(and(inScope, eq(question.sectionId, input.sectionId)));
    const [row] = await tx
      .insert(question)
      .values({ ...scope, ...fields, sortOrder: max?.n ?? 0 })
      .returning({ id: question.id });
    id = row?.id;
  }
  if (!id) return null;

  await tx
    .delete(questionOption)
    .where(and(eq(questionOption.orgId, scope.orgId), eq(questionOption.instrumentId, scope.instrumentId), eq(questionOption.questionId, id)));
  if (options.length) {
    await tx.insert(questionOption).values(options.map((o, i) => ({ ...scope, questionId: id, label: o.label, value: o.value, sortOrder: i })));
  }
  return { id };
}

const childTables = { dimension, section, question } as const;

export async function deleteChild(tx: Tx, scope: Child, kind: keyof typeof childTables, id: string) {
  const t = childTables[kind];
  const rows = await tx
    .delete(t)
    .where(and(eq(t.orgId, scope.orgId), eq(t.instrumentId, scope.instrumentId), eq(t.id, id)))
    .returning({ id: t.id });
  return rows.length;
}

/**
 * Writes a new order. For questions, `sectionId` is the list they now sit in, so a drag between
 * sections moves them too. Ids outside this instrument match nothing and are ignored.
 */
export async function reorderChildren(tx: Tx, scope: Child, kind: keyof typeof childTables, ids: string[], sectionId?: string) {
  for (const [i, id] of ids.entries()) {
    if (kind === "question") {
      await tx
        .update(question)
        .set(sectionId ? { sortOrder: i, sectionId } : { sortOrder: i })
        .where(and(eq(question.orgId, scope.orgId), eq(question.instrumentId, scope.instrumentId), eq(question.id, id)));
    } else {
      const t = childTables[kind];
      await tx
        .update(t)
        .set({ sortOrder: i })
        .where(and(eq(t.orgId, scope.orgId), eq(t.instrumentId, scope.instrumentId), eq(t.id, id)));
    }
  }
}
