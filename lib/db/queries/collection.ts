import { and, asc, ilike, or, sql, type AnyColumn, type SQL } from "drizzle-orm";
import type { ViewParams } from "@/lib/views/params";
import type { ModelDef } from "@/lib/views/types";

// Shared pieces for list and kanban queries. Each model's query module maps the keys its ModelDef
// declares (facets, filters, columns, group-bys) to SQL; these helpers assemble them.

type Expr = AnyColumn | SQL;

const escapeLike = (v: string) => v.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Facets on the same field are ORed, different fields ANDed. */
export function facetWhere(facets: ViewParams["facets"], columns: Record<string, Expr>): SQL | undefined {
  const byField = new Map<string, string[]>();
  for (const f of facets) byField.set(f.field, [...(byField.get(f.field) ?? []), f.value]);
  const parts = [...byField].flatMap(([field, values]) => {
    const col = columns[field];
    return col ? [or(...values.map((v) => ilike(col as AnyColumn, `%${escapeLike(v)}%`)))!] : [];
  });
  return parts.length ? and(...parts) : undefined;
}

/** Filters in one group are ORed, groups ANDed. */
export function filterWhere(model: ModelDef, filters: string[], conditions: Record<string, SQL>): SQL | undefined {
  const groups = new Map<string, SQL[]>();
  for (const key of filters) {
    const def = model.filters.find((f) => f.key === key);
    const cond = conditions[key];
    if (def && cond) groups.set(def.group, [...(groups.get(def.group) ?? []), cond]);
  }
  const parts = [...groups.values()].map((conds) => or(...conds)!);
  return parts.length ? and(...parts) : undefined;
}

/** Group column first (so groups are contiguous), then the chosen sort, then a stable tiebreak. */
export function orderClause(params: ViewParams, columns: Record<string, Expr>, groupColumns: Record<string, Expr>, tiebreak: AnyColumn) {
  const parts: SQL[] = [];
  const group = params.groupBy ? groupColumns[params.groupBy] : undefined;
  if (group) parts.push(sql`${group} asc nulls last`);
  const col = columns[params.order.field];
  if (col) parts.push(params.order.dir === "desc" ? sql`${col} desc nulls last` : sql`${col} asc nulls last`);
  parts.push(asc(tiebreak));
  return parts;
}


