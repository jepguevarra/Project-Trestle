import { ENGAGEMENT_TYPE_LABELS, type EngagementType } from "@/lib/validation/engagements";
import type { TrackedField } from "./tracking";
import type { ModelDef } from "./types";

export const OCM_STAGES = ["assess", "develop", "deploy", "normalize", "exit"] as const;
export type OcmStage = (typeof OCM_STAGES)[number];
export const OCM_STAGE_LABELS: Record<OcmStage, string> = {
  assess: "Assess",
  develop: "Develop",
  deploy: "Deploy",
  normalize: "Normalize",
  exit: "Exit",
};

export const engagementModel: ModelDef = {
  key: "engagement",
  label: "Engagement",
  plural: "Engagements",
  views: ["list", "kanban"],
  columns: [
    { key: "name", label: "Engagement", sortable: true },
    { key: "client", label: "Client", sortable: true },
    { key: "type", label: "Type", sortable: true },
    { key: "system", label: "System", sortable: true },
    { key: "stage", label: "Stage", sortable: true },
    { key: "goLive", label: "Target go-live", sortable: true },
    { key: "status", label: "Status", optional: true },
    { key: "startDate", label: "Start", optional: true, sortable: true },
    { key: "endDate", label: "End", optional: true, sortable: true },
  ],
  facets: [
    { key: "name", label: "Engagement" },
    { key: "client", label: "Client" },
    { key: "system", label: "System" },
  ],
  filters: [
    { key: "active", label: "Active", group: "status" },
    { key: "archived", label: "Archived", group: "status" },
    ...([
      ["packaged_software", "Packaged software"],
      ["custom_build", "Custom build"],
      ["platform_migration", "Platform migration"],
      ["automation", "Automation"],
      ["digitalisation", "Digitalisation"],
    ] as const).map(([key, label]) => ({ key, label, group: "type" })),
  ],
  defaultFilters: ["active"],
  groupBys: [
    { key: "client", label: "Client" },
    { key: "stage", label: "Stage" },
    { key: "type", label: "Type" },
    { key: "status", label: "Status" },
  ],
  defaultOrder: { field: "client", dir: "asc" },
  stages: { field: "stage", steps: OCM_STAGES.map((value) => ({ value, label: OCM_STAGE_LABELS[value] })) },
  pageSize: 80,
};

type EngagementRecord = {
  name: string;
  targetSystem: string;
  targetGoLive: string | null;
  type: EngagementType;
  clientName: string;
  status: "active" | "archived";
  ocmStage: OcmStage;
  startDate: string | null;
  endDate: string | null;
  objectives: string | null;
  scopeSummary: string | null;
  successCriteria: string | null;
  transitionOwner: string | null;
};

/** Every engagement field whose change is written to chatter. */
export const engagementTracked: TrackedField<EngagementRecord>[] = [
  { field: "ocmStage", label: "Stage", format: (v) => OCM_STAGE_LABELS[v as OcmStage] },
  { field: "status", label: "Status", format: (v) => (v === "archived" ? "Archived" : "Active") },
  { field: "name", label: "Name" },
  { field: "type", label: "Type", format: (v) => ENGAGEMENT_TYPE_LABELS[v as EngagementType] },
  { field: "clientName", label: "Client" },
  { field: "targetSystem", label: "Target system" },
  { field: "targetGoLive", label: "Target go-live" },
  { field: "startDate", label: "Start date" },
  { field: "endDate", label: "End date" },
  { field: "objectives", label: "Objectives" },
  { field: "scopeSummary", label: "Scope" },
  { field: "successCriteria", label: "Success criteria" },
  { field: "transitionOwner", label: "Transition owner" },
];
