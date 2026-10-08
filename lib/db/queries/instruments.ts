import { and, asc, count, eq, isNull, or, sql, type SQL } from "drizzle-orm";
import type { ViewParams } from "@/lib/views/params";
import { INSTRUMENT_KIND_LABELS, INSTRUMENT_STATUS_LABELS, instrumentModel, type InstrumentKind, type InstrumentStatus } from "@/lib/views/instrument";
import type { GroupData } from "@/lib/views/types";
import type { EngagementType } from "@/lib/validation/engagements";
import type { Tx } from "../rls";
import { dimension, instrument, instrumentTemplate, question, questionOption, section } from "../schema";
import { facetWhere, filterWhere, orderClause } from "./collection";

export type Instrument = typeof instrument.$inferSelect;

const questionCount = sql<number>`(select count(*)::int from ${question} q where q.instrument_id = ${instrument.id})`;

const columns = {
  name: instrument.name,
  kind: instrument.kind,
  wave: instrument.wave,
  status: instrument.status,
  anonymity: instrument.anonymity,
  questions: questionCount,
  opens: instrument.opensAt,
  closes: instrument.closesAt,
};
const groupColumns = { kind: instrument.kind, status: instrument.status };
const filterConditions: Record<string, SQL> = {
  draft: eq(instrument.status, "draft"),
  open: eq(instrument.status, "open"),
  closed: eq(instrument.status, "closed"),
};

const where = (orgId: string, engagementId: string, params: ViewParams) =>
  and(
    eq(instrument.orgId, orgId),
    eq(instrument.engagementId, engagementId),
    facetWhere(params.facets, { name: instrument.name }),
    filterWhere(instrumentModel, params.filters, filterConditions),
  );

export async function queryInstruments(tx: Tx, orgId: string, engagementId: string, params: ViewParams, opts: { all?: boolean } = {}) {
  const w = where(orgId, engagementId, params);
  const base = tx
    .select({
      id: instrument.id,
      name: instrument.name,
      kind: instrument.kind,
      wave: instrument.wave,
      waveLabel: instrument.waveLabel,
      status: instrument.status,
      anonymity: instrument.anonymity,
      opensAt: instrument.opensAt,
      closesAt: instrument.closesAt,
      questions: questionCount,
    })
    .from(instrument)
    .where(w)
    .orderBy(...orderClause(params, columns, groupColumns, instrument.id));
  const rows = opts.all ? await base.limit(500) : await base.limit(params.limit).offset((params.page - 1) * params.limit);
  const [totalRow] = await tx.select({ n: count() }).from(instrument).where(w);

  let groups: GroupData[] = [];
  if (params.groupBy) {
    const col = groupColumns[params.groupBy as keyof typeof groupColumns];
    const raw = await tx
      .select({ key: sql<string>`${col}::text`, n: count(), questions: sql<number>`coalesce(sum(${questionCount}), 0)::int` })
      .from(instrument)
      .where(w)
      .groupBy(col)
      .orderBy(col);
    groups = raw.map((g) => ({
      key: g.key,
      label: params.groupBy === "kind" ? INSTRUMENT_KIND_LABELS[g.key as InstrumentKind] : INSTRUMENT_STATUS_LABELS[g.key as InstrumentStatus],
      count: g.n,
      sums: { questions: g.questions },
    }));
  }
  return { rows, total: totalRow?.n ?? 0, groups };
}

export async function instrumentIdsInOrder(tx: Tx, orgId: string, engagementId: string, params: ViewParams) {
  const rows = await tx
    .select({ id: instrument.id })
    .from(instrument)
    .where(where(orgId, engagementId, params))
    .orderBy(...orderClause(params, columns, groupColumns, instrument.id))
    .limit(2000);
  return rows.map((r) => r.id);
}

/** One instrument in this engagement, or null (wrong engagement, or not visible). */
export async function findInstrument(tx: Tx, orgId: string, engagementId: string, instrumentId: string) {
  const [row] = await tx
    .select({ instrument, questions: questionCount })
    .from(instrument)
    .where(and(eq(instrument.orgId, orgId), eq(instrument.engagementId, engagementId), eq(instrument.id, instrumentId)));
  return row ?? null;
}

export type InstrumentTree = Awaited<ReturnType<typeof getInstrumentTree>>;

/** Dimensions, then sections with their questions and options, all in display order. */
export async function getInstrumentTree(tx: Tx, orgId: string, instrumentId: string) {
  const [dims, secs, qs, opts] = await Promise.all([
    tx.select().from(dimension).where(and(eq(dimension.orgId, orgId), eq(dimension.instrumentId, instrumentId))).orderBy(asc(dimension.sortOrder), asc(dimension.name)),
    tx.select().from(section).where(and(eq(section.orgId, orgId), eq(section.instrumentId, instrumentId))).orderBy(asc(section.sortOrder), asc(section.createdAt)),
    tx.select().from(question).where(and(eq(question.orgId, orgId), eq(question.instrumentId, instrumentId))).orderBy(asc(question.sortOrder), asc(question.createdAt)),
    tx.select().from(questionOption).where(and(eq(questionOption.orgId, orgId), eq(questionOption.instrumentId, instrumentId))).orderBy(asc(questionOption.sortOrder)),
  ]);
  return {
    dimensions: dims,
    sections: secs.map((s) => ({
      ...s,
      questions: qs.filter((q) => q.sectionId === s.id).map((q) => ({ ...q, options: opts.filter((o) => o.questionId === q.id) })),
    })),
  };
}

/** Readiness templates offered for a new instrument: this engagement's type first, then generic, then the rest. */
export async function listReadinessTemplates(tx: Tx, orgId: string, type: EngagementType) {
  const rows = await tx
    .select({
      id: instrumentTemplate.id,
      name: instrumentTemplate.name,
      engagementType: instrumentTemplate.engagementType,
      version: instrumentTemplate.version,
      isSystem: instrumentTemplate.isSystem,
    })
    .from(instrumentTemplate)
    .where(and(eq(instrumentTemplate.kind, "readiness"), or(isNull(instrumentTemplate.orgId), eq(instrumentTemplate.orgId, orgId))))
    .orderBy(asc(instrumentTemplate.name), asc(instrumentTemplate.version));
  // Newest version of each name only.
  const latest = [...new Map(rows.map((r) => [r.name, r])).values()];
  const rank = (t: (typeof rows)[number]) => (t.engagementType === type ? 0 : t.engagementType === null ? 1 : 2);
  return latest.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

export async function findTemplate(tx: Tx, templateId: string) {
  const [row] = await tx.select().from(instrumentTemplate).where(eq(instrumentTemplate.id, templateId));
  return row ?? null;
}
