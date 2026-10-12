import type { TrackedField } from "./tracking";
import type { ModelDef } from "./types";
import { SIZE_BAND_LABELS, type SizeBand } from "@/lib/validation/engagements";

export const clientModel: ModelDef = {
  key: "client",
  label: "Client",
  plural: "Clients",
  views: ["list"],
  columns: [
    { key: "name", label: "Name", sortable: true },
    { key: "industry", label: "Industry", sortable: true },
    { key: "size", label: "Size", sortable: true },
    { key: "engagements", label: "Engagements", numeric: true, sortable: true },
  ],
  facets: [
    { key: "name", label: "Name" },
    { key: "industry", label: "Industry" },
  ],
  filters: [],
  defaultFilters: [],
  groupBys: [
    { key: "industry", label: "Industry" },
    { key: "size", label: "Size" },
  ],
  defaultOrder: { field: "name", dir: "asc" },
  pageSize: 80,
};

type ClientRecord = { name: string; industry: string | null; sizeBand: SizeBand | null; notes: string | null };

export const clientTracked: TrackedField<ClientRecord>[] = [
  { field: "name", label: "Name" },
  { field: "industry", label: "Industry" },
  { field: "sizeBand", label: "Size", format: (v) => (v ? SIZE_BAND_LABELS[v as SizeBand] : null) },
  { field: "notes", label: "Notes" },
];
