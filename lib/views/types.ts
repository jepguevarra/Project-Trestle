// Plain, serialisable descriptions of a model's views (OCM-MODULE.md §7.7). They are safe to pass to
// Client Components. The SQL behind each key lives with the model's queries in lib/db/queries.

export type ViewMode = "list" | "kanban";

export type ColumnDef = {
  key: string;
  label: string;
  /** Right-aligned, and summed in group headers. */
  numeric?: boolean;
  /** Hidden until switched on in the optional-columns menu. */
  optional?: boolean;
  sortable?: boolean;
};

export type FilterDef = {
  key: string;
  label: string;
  /** Filters in the same group are ORed; groups are ANDed (as in Odoo). */
  group: string;
};

export type StageDef = { value: string; label: string };

export type ModelDef = {
  key: string;
  label: string;
  plural: string;
  views: ViewMode[];
  columns: ColumnDef[];
  /** Fields the search box offers: "Search <label> for …". The first is the default. */
  facets: { key: string; label: string }[];
  filters: FilterDef[];
  /** Applied when the URL has no `f` parameter at all. */
  defaultFilters: string[];
  groupBys: { key: string; label: string }[];
  defaultOrder: { field: string; dir: "asc" | "desc" };
  /** The lifecycle field kanban columns and the statusbar use. */
  stages?: { field: string; steps: StageDef[] };
  pageSize: number;
};

/** One row as the list and kanban views render it: display values only, already formatted. */
export type RowData = {
  id: string;
  href: string;
  cells: Record<string, string | number | null>;
  stage?: string;
  /** The raw group-by key of this row, when the list is grouped. */
  group?: string;
  /** Whether this user may move the record between stages (kanban drag). */
  canMove?: boolean;
};

export type GroupData = { key: string; label: string; count: number; sums: Record<string, number> };
