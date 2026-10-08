import type { TrackedField } from "./tracking";
import type { ModelDef } from "./types";

export const INSTRUMENT_STATUSES = ["draft", "open", "closed"] as const;
export type InstrumentStatus = (typeof INSTRUMENT_STATUSES)[number];
export const INSTRUMENT_STATUS_LABELS: Record<InstrumentStatus, string> = { draft: "Draft", open: "Open", closed: "Closed" };

export const INSTRUMENT_KINDS = [
  "readiness",
  "sponsor",
  "pulse",
  "go_live_adoption",
  "post_go_live_adoption",
  "training_feedback",
  "champion",
  "coaching",
  "communication_feedback",
  "custom",
] as const;
export type InstrumentKind = (typeof INSTRUMENT_KINDS)[number];
export const INSTRUMENT_KIND_LABELS: Record<InstrumentKind, string> = {
  readiness: "Readiness",
  sponsor: "Sponsor scorecard",
  pulse: "Pulse",
  go_live_adoption: "Go-live adoption",
  post_go_live_adoption: "Post-go-live adoption",
  training_feedback: "Training feedback",
  champion: "Champion",
  coaching: "Coaching",
  communication_feedback: "Communication feedback",
  custom: "Custom",
};

export const ANONYMITY_LABELS = { anonymous: "Anonymous", identified: "Identified" } as const;

export const instrumentModel: ModelDef = {
  key: "instrument",
  label: "Instrument",
  plural: "Instruments",
  views: ["list", "kanban"],
  columns: [
    { key: "name", label: "Instrument", sortable: true },
    { key: "kind", label: "Kind", sortable: true },
    { key: "wave", label: "Wave", sortable: true },
    { key: "status", label: "Status", sortable: true },
    { key: "anonymity", label: "Anonymity", sortable: true },
    { key: "questions", label: "Questions", numeric: true, sortable: true },
    { key: "opens", label: "Opens", optional: true, sortable: true },
    { key: "closes", label: "Closes", optional: true, sortable: true },
  ],
  facets: [{ key: "name", label: "Instrument" }],
  filters: INSTRUMENT_STATUSES.map((s) => ({ key: s, label: INSTRUMENT_STATUS_LABELS[s], group: "status" })),
  defaultFilters: [],
  groupBys: [
    { key: "kind", label: "Kind" },
    { key: "status", label: "Status" },
  ],
  defaultOrder: { field: "wave", dir: "asc" },
  stages: { field: "status", steps: INSTRUMENT_STATUSES.map((value) => ({ value, label: INSTRUMENT_STATUS_LABELS[value] })) },
  pageSize: 80,
};

type InstrumentRecord = {
  name: string;
  kind: InstrumentKind;
  wave: number;
  waveLabel: string | null;
  anonymity: "anonymous" | "identified";
  status: InstrumentStatus;
  opensAt: Date | null;
  closesAt: Date | null;
};

const iso = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 16).replace("T", " ") + " UTC" : null);

export const instrumentTracked: TrackedField<InstrumentRecord>[] = [
  { field: "status", label: "Status", format: (v) => INSTRUMENT_STATUS_LABELS[v as InstrumentStatus] },
  { field: "name", label: "Name" },
  { field: "kind", label: "Kind", format: (v) => INSTRUMENT_KIND_LABELS[v as InstrumentKind] },
  { field: "wave", label: "Wave" },
  { field: "waveLabel", label: "Wave label" },
  { field: "anonymity", label: "Anonymity", format: (v) => ANONYMITY_LABELS[v as "anonymous" | "identified"] },
  { field: "opensAt", label: "Opens", format: iso },
  { field: "closesAt", label: "Closes", format: iso },
];
