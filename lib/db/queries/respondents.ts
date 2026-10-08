import { and, count, eq, isNotNull, isNull, sql, type SQL } from "drizzle-orm";
import type { ViewParams } from "@/lib/views/params";
import { respondentModel, SENIORITY_LABELS, type Seniority } from "@/lib/views/respondent";
import type { GroupData } from "@/lib/views/types";
import type { Tx } from "../rls";
import { respondent } from "../schema";
import { facetWhere, filterWhere, orderClause } from "./collection";

export type Respondent = typeof respondent.$inferSelect;

// Sorts in the order a consultant reads progress: not invited, invited, reminded, completed.
const stateRank = sql`case when ${respondent.completedAt} is not null then 3 when ${respondent.remindedAt} is not null then 2
  when ${respondent.invitedAt} is not null then 1 else 0 end`;

const columns = {
  name: respondent.name,
  email: respondent.email,
  department: respondent.department,
  role: respondent.roleTitle,
  seniority: respondent.seniority,
  state: stateRank,
};
const groupColumns = { department: respondent.department, seniority: respondent.seniority };
const filterConditions: Record<string, SQL> = {
  pending: isNull(respondent.completedAt),
  completed: isNotNull(respondent.completedAt),
  not_invited: and(isNull(respondent.invitedAt), isNull(respondent.completedAt))!,
};

const where = (orgId: string, instrumentId: string, params: ViewParams) =>
  and(
    eq(respondent.orgId, orgId),
    eq(respondent.instrumentId, instrumentId),
    facetWhere(params.facets, { name: respondent.name, email: respondent.email, department: respondent.department }),
    filterWhere(respondentModel, params.filters, filterConditions),
  );

export async function queryRespondents(tx: Tx, orgId: string, instrumentId: string, params: ViewParams) {
  const w = where(orgId, instrumentId, params);
  const rows = await tx
    .select()
    .from(respondent)
    .where(w)
    .orderBy(...orderClause(params, columns, groupColumns, respondent.id))
    .limit(params.limit)
    .offset((params.page - 1) * params.limit);
  const [total] = await tx.select({ n: count() }).from(respondent).where(w);

  let groups: GroupData[] = [];
  if (params.groupBy) {
    const col = groupColumns[params.groupBy as keyof typeof groupColumns];
    const raw = await tx
      .select({ key: sql<string | null>`${col}::text`, n: count() })
      .from(respondent)
      .where(w)
      .groupBy(col)
      .orderBy(col);
    groups = raw.map((g) => ({
      key: g.key ?? "",
      label: g.key === null ? "None" : params.groupBy === "seniority" ? SENIORITY_LABELS[g.key as Seniority] : g.key,
      count: g.n,
      sums: {},
    }));
  }
  return { rows, total: total?.n ?? 0, groups };
}

export async function findRespondent(tx: Tx, orgId: string, instrumentId: string, respondentId: string) {
  const [row] = await tx
    .select()
    .from(respondent)
    .where(and(eq(respondent.orgId, orgId), eq(respondent.instrumentId, instrumentId), eq(respondent.id, respondentId)));
  return row ?? null;
}

/** Completion figures for the instrument form. */
export async function respondentCounts(tx: Tx, orgId: string, instrumentId: string) {
  const [row] = await tx
    .select({
      total: count(),
      invited: sql<number>`count(${respondent.invitedAt})::int`,
      completed: sql<number>`count(${respondent.completedAt})::int`,
    })
    .from(respondent)
    .where(and(eq(respondent.orgId, orgId), eq(respondent.instrumentId, instrumentId)));
  return { total: row?.total ?? 0, invited: row?.invited ?? 0, completed: row?.completed ?? 0 };
}

/** Everyone on the instrument with these addresses (lower-case), to reject duplicates before inserting. */
export async function existingEmails(tx: Tx, orgId: string, instrumentId: string) {
  const rows = await tx
    .select({ email: respondent.email })
    .from(respondent)
    .where(and(eq(respondent.orgId, orgId), eq(respondent.instrumentId, instrumentId)));
  return new Set(rows.map((r) => r.email));
}

/** Who an invitation round goes to: never invited, not completed. */
export function respondentsToInvite(tx: Tx, orgId: string, instrumentId: string) {
  return tx
    .select()
    .from(respondent)
    .where(and(eq(respondent.orgId, orgId), eq(respondent.instrumentId, instrumentId), isNull(respondent.invitedAt), isNull(respondent.completedAt)));
}

/** Who a reminder goes to: invited and not completed. Reads only completed_at, so it works on anonymous instruments. */
export function respondentsToRemind(tx: Tx, orgId: string, instrumentId: string) {
  return tx
    .select()
    .from(respondent)
    .where(and(eq(respondent.orgId, orgId), eq(respondent.instrumentId, instrumentId), isNotNull(respondent.invitedAt), isNull(respondent.completedAt)));
}
