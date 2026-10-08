import { ENGAGEMENT_TYPE_LABELS, SIZE_BAND_LABELS, type EngagementType, type SizeBand } from "@/lib/validation/engagements";
import { OCM_STAGE_LABELS, type OcmStage } from "./engagement";
import type { RowData } from "./types";

type EngagementRow = {
  id: string;
  name: string;
  clientName: string;
  type: EngagementType;
  targetSystem: string;
  ocmStage: OcmStage;
  targetGoLive: string | null;
  status: "active" | "archived";
  startDate: string | null;
  endDate: string | null;
  access: "edit" | "read" | null;
};

const ENGAGEMENT_GROUP_KEY: Record<string, (r: EngagementRow) => string> = {
  client: (r) => r.clientName,
  stage: (r) => r.ocmStage,
  type: (r) => r.type,
  status: (r) => r.status,
};

/** Query rows → display rows. `context` is the list's state, carried into the form for its pager. */
export function engagementRows(rows: EngagementRow[], orgSlug: string, context: string, groupBy: string | null): RowData[] {
  return rows.map((r) => ({
    id: r.id,
    href: `/${orgSlug}/engagements/${r.id}/overview${context ? `?${context}` : ""}`,
    cells: {
      name: r.name,
      client: r.clientName,
      type: ENGAGEMENT_TYPE_LABELS[r.type],
      system: r.targetSystem,
      stage: OCM_STAGE_LABELS[r.ocmStage],
      goLive: r.targetGoLive,
      status: r.status === "archived" ? "Archived" : "Active",
      startDate: r.startDate,
      endDate: r.endDate,
    },
    stage: r.ocmStage,
    group: groupBy ? ENGAGEMENT_GROUP_KEY[groupBy]?.(r) : undefined,
    canMove: r.access === "edit" && r.status === "active",
  }));
}

type ClientRow = { id: string; name: string; industry: string | null; sizeBand: SizeBand | null; engagements: number };

export function clientRows(rows: ClientRow[], orgSlug: string, context: string, groupBy: string | null): RowData[] {
  return rows.map((r) => ({
    id: r.id,
    href: `/${orgSlug}/clients/${r.id}${context ? `?${context}` : ""}`,
    cells: {
      name: r.name,
      industry: r.industry,
      size: r.sizeBand ? SIZE_BAND_LABELS[r.sizeBand] : null,
      engagements: r.engagements,
    },
    group: groupBy === "industry" ? (r.industry ?? "") : groupBy === "size" ? (r.sizeBand ?? "") : undefined,
  }));
}
