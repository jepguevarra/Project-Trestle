import { and, count, eq, sql, type SQL } from "drizzle-orm";
import type { ViewParams } from "@/lib/views/params";
import { engagementModel, OCM_STAGE_LABELS, type OcmStage } from "@/lib/views/engagement";
import type { GroupData } from "@/lib/views/types";
import { ENGAGEMENT_TYPE_LABELS, type EngagementType } from "@/lib/validation/engagements";
import type { Tx } from "../rls";
import { client, engagement } from "../schema";
import { facetWhere, filterWhere, orderClause } from "./collection";

const columns = {
  name: engagement.name,
  client: client.name,
  type: engagement.type,
  system: engagement.targetSystem,
  stage: engagement.ocmStage,
  goLive: engagement.targetGoLive,
  status: engagement.status,
  startDate: engagement.startDate,
  endDate: engagement.endDate,
};

const facetColumns = { name: engagement.name, client: client.name, system: engagement.targetSystem };

const filterConditions: Record<string, SQL> = {
  active: eq(engagement.status, "active"),
  archived: eq(engagement.status, "archived"),
  packaged_software: eq(engagement.type, "packaged_software"),
  custom_build: eq(engagement.type, "custom_build"),
  platform_migration: eq(engagement.type, "platform_migration"),
  automation: eq(engagement.type, "automation"),
  digitalisation: eq(engagement.type, "digitalisation"),
};

const groupColumns = { client: client.name, stage: engagement.ocmStage, type: engagement.type, status: engagement.status };

const joinClient = and(eq(client.id, engagement.clientId), eq(client.orgId, engagement.orgId));

function where(orgId: string, params: ViewParams) {
  return and(
    eq(engagement.orgId, orgId),
    facetWhere(params.facets, facetColumns),
    filterWhere(engagementModel, params.filters, filterConditions),
  );
}

export function groupLabel(groupBy: string, key: string | null): string {
  if (key === null) return "None";
  if (groupBy === "stage") return OCM_STAGE_LABELS[key as OcmStage] ?? key;
  if (groupBy === "type") return ENGAGEMENT_TYPE_LABELS[key as EngagementType] ?? key;
  if (groupBy === "status") return key === "archived" ? "Archived" : "Active";
  return key;
}

const rowColumns = {
  id: engagement.id,
  name: engagement.name,
  clientName: client.name,
  type: engagement.type,
  targetSystem: engagement.targetSystem,
  ocmStage: engagement.ocmStage,
  targetGoLive: engagement.targetGoLive,
  status: engagement.status,
  startDate: engagement.startDate,
  endDate: engagement.endDate,
  // The user's effective access, so kanban knows which cards may move.
  access: sql<"edit" | "read" | null>`private.engagement_access(${engagement.id})`,
};

/** One page of engagements for the list view, plus the total and group counts. RLS scopes it. */
export async function queryEngagements(tx: Tx, orgId: string, params: ViewParams, opts: { all?: boolean } = {}) {
  const w = where(orgId, params);
  const base = tx
    .select(rowColumns)
    .from(engagement)
    .innerJoin(client, joinClient)
    .where(w)
    .orderBy(...orderClause(params, columns, groupColumns, engagement.id));
  const rows = opts.all ? await base.limit(500) : await base.limit(params.limit).offset((params.page - 1) * params.limit);

  const [totalRow] = await tx.select({ n: count() }).from(engagement).innerJoin(client, joinClient).where(w);

  let groups: GroupData[] = [];
  if (params.groupBy) {
    const col = groupColumns[params.groupBy as keyof typeof groupColumns];
    const raw = await tx
      .select({ key: sql<string | null>`${col}::text`, n: count() })
      .from(engagement)
      .innerJoin(client, joinClient)
      .where(w)
      .groupBy(col)
      .orderBy(sql`${col} asc nulls last`);
    groups = raw.map((g) => ({ key: g.key ?? "", label: groupLabel(params.groupBy!, g.key), count: g.n, sums: {} }));
  }
  return { rows, total: totalRow?.n ?? 0, groups };
}

/** The ordered ids of the list a form was opened from, for the record pager. */
export async function engagementIdsInOrder(tx: Tx, orgId: string, params: ViewParams) {
  const rows = await tx
    .select({ id: engagement.id })
    .from(engagement)
    .innerJoin(client, joinClient)
    .where(where(orgId, params))
    .orderBy(...orderClause(params, columns, groupColumns, engagement.id))
    .limit(2000);
  return rows.map((r) => r.id);
}

/** Engagements for the navbar switcher: only those the user can open (RLS), active first. */
export function listSwitcherEngagements(tx: Tx, orgId: string) {
  return tx
    .select({ id: engagement.id, name: engagement.name, clientName: client.name, status: engagement.status })
    .from(engagement)
    .innerJoin(client, joinClient)
    .where(eq(engagement.orgId, orgId))
    .orderBy(engagement.status, client.name, engagement.name)
    .limit(100);
}
