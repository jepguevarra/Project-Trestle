import { ENGAGEMENT_TYPE_LABELS, SIZE_BAND_LABELS, type EngagementType, type SizeBand } from "@/lib/validation/engagements";
import { OCM_STAGE_LABELS, type OcmStage } from "./engagement";
import { RESPONDENT_STATE_LABELS, respondentState, SENIORITY_LABELS, type Seniority } from "./respondent";
import { ANONYMITY_LABELS, INSTRUMENT_KIND_LABELS, INSTRUMENT_STATUS_LABELS, type InstrumentKind, type InstrumentStatus } from "./instrument";
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

type InstrumentRow = {
  id: string;
  name: string;
  kind: InstrumentKind;
  wave: number;
  waveLabel: string | null;
  status: InstrumentStatus;
  anonymity: "anonymous" | "identified";
  opensAt: Date | null;
  closesAt: Date | null;
  questions: number;
};

const utc = (d: Date | null) => (d ? `${d.toISOString().slice(0, 16).replace("T", " ")} UTC` : null);

export function instrumentRows(rows: InstrumentRow[], base: string, context: string, groupBy: string | null, canMove: boolean): RowData[] {
  return rows.map((r) => ({
    id: r.id,
    href: `${base}/${r.id}${context ? `?${context}` : ""}`,
    cells: {
      name: r.name,
      kind: INSTRUMENT_KIND_LABELS[r.kind],
      wave: r.waveLabel ? `${r.wave} · ${r.waveLabel}` : r.wave,
      status: INSTRUMENT_STATUS_LABELS[r.status],
      anonymity: ANONYMITY_LABELS[r.anonymity],
      questions: r.questions,
      opens: utc(r.opensAt),
      closes: utc(r.closesAt),
    },
    stage: r.status,
    group: groupBy === "kind" ? r.kind : groupBy === "status" ? r.status : undefined,
    canMove,
  }));
}

type RespondentRow = {
  id: string;
  name: string | null;
  email: string;
  department: string | null;
  roleTitle: string | null;
  seniority: Seniority | null;
  invitedAt: Date | null;
  remindedAt: Date | null;
  completedAt: Date | null;
};

export function respondentRows(rows: RespondentRow[], base: string, context: string, groupBy: string | null): RowData[] {
  return rows.map((r) => ({
    id: r.id,
    href: `${base}/${r.id}${context ? `?${context}` : ""}`,
    cells: {
      name: r.name,
      email: r.email,
      department: r.department,
      role: r.roleTitle,
      seniority: r.seniority ? SENIORITY_LABELS[r.seniority] : null,
      state: RESPONDENT_STATE_LABELS[respondentState(r)],
    },
    group: groupBy === "department" ? (r.department ?? "") : groupBy === "seniority" ? (r.seniority ?? "") : undefined,
  }));
}
