import { and, count, eq, sql } from "drizzle-orm";
import type { ViewParams } from "@/lib/views/params";
import type { GroupData } from "@/lib/views/types";
import { SIZE_BAND_LABELS, type SizeBand } from "@/lib/validation/engagements";
import type { Tx } from "../rls";
import { client, engagement } from "../schema";
import { facetWhere, orderClause } from "./collection";

// Engagements per client that the user can see: the subquery runs under engagement's RLS.
const engagementCount = sql<number>`(select count(*)::int from ${engagement} e where e.client_id = ${client.id} and e.org_id = ${client.orgId})`;

const columns = { name: client.name, industry: client.industry, size: client.sizeBand, engagements: engagementCount };
const facetColumns = { name: client.name, industry: client.industry };
const groupColumns = { industry: client.industry, size: client.sizeBand };

const where = (orgId: string, params: ViewParams) => and(eq(client.orgId, orgId), facetWhere(params.facets, facetColumns));

function groupLabel(groupBy: string, key: string | null) {
  if (key === null) return "Not set";
  return groupBy === "size" ? (SIZE_BAND_LABELS[key as SizeBand] ?? key) : key;
}

export async function queryClients(tx: Tx, orgId: string, params: ViewParams) {
  const w = where(orgId, params);
  const rows = await tx
    .select({ id: client.id, name: client.name, industry: client.industry, sizeBand: client.sizeBand, engagements: engagementCount })
    .from(client)
    .where(w)
    .orderBy(...orderClause(params, columns, groupColumns, client.id))
    .limit(params.limit)
    .offset((params.page - 1) * params.limit);
  const [totalRow] = await tx.select({ n: count() }).from(client).where(w);

  let groups: GroupData[] = [];
  if (params.groupBy) {
    const col = groupColumns[params.groupBy as keyof typeof groupColumns];
    const raw = await tx
      .select({ key: sql<string | null>`${col}::text`, n: count(), engagements: sql<number>`coalesce(sum(${engagementCount}), 0)::int` })
      .from(client)
      .where(w)
      .groupBy(col)
      .orderBy(sql`${col} asc nulls last`);
    groups = raw.map((g) => ({
      key: g.key ?? "",
      label: groupLabel(params.groupBy!, g.key),
      count: g.n,
      sums: { engagements: g.engagements },
    }));
  }
  return { rows, total: totalRow?.n ?? 0, groups };
}

export async function clientIdsInOrder(tx: Tx, orgId: string, params: ViewParams) {
  const rows = await tx
    .select({ id: client.id })
    .from(client)
    .where(where(orgId, params))
    .orderBy(...orderClause(params, columns, groupColumns, client.id))
    .limit(2000);
  return rows.map((r) => r.id);
}
