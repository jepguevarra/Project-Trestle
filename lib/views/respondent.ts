import type { FieldDef } from "@/components/views/record-form";
import type { ModelDef } from "./types";

export const SENIORITIES = ["frontline", "supervisor", "manager", "executive"] as const;
export type Seniority = (typeof SENIORITIES)[number];
export const SENIORITY_LABELS: Record<Seniority, string> = {
  frontline: "Frontline",
  supervisor: "Supervisor",
  manager: "Manager",
  executive: "Executive",
};

/** Where a respondent is, derived from their timestamps. */
export type RespondentState = "not_invited" | "invited" | "reminded" | "completed";
export const RESPONDENT_STATE_LABELS: Record<RespondentState, string> = {
  not_invited: "Not invited",
  invited: "Invited",
  reminded: "Reminded",
  completed: "Completed",
};
export function respondentState(r: { invitedAt: Date | null; remindedAt: Date | null; completedAt: Date | null }): RespondentState {
  if (r.completedAt) return "completed";
  if (r.remindedAt) return "reminded";
  if (r.invitedAt) return "invited";
  return "not_invited";
}

export const respondentModel: ModelDef = {
  key: "respondent",
  label: "Respondent",
  plural: "Respondents",
  views: ["list"],
  columns: [
    { key: "name", label: "Name", sortable: true },
    { key: "email", label: "Email", sortable: true },
    { key: "department", label: "Department", sortable: true },
    { key: "role", label: "Role", sortable: true },
    { key: "seniority", label: "Seniority", sortable: true },
    { key: "state", label: "Status", sortable: true },
  ],
  facets: [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "department", label: "Department" },
  ],
  filters: [
    { key: "pending", label: "Not answered", group: "state" },
    { key: "completed", label: "Completed", group: "state" },
    { key: "not_invited", label: "Not invited", group: "state" },
  ],
  defaultFilters: [],
  groupBys: [
    { key: "department", label: "Department" },
    { key: "seniority", label: "Seniority" },
  ],
  defaultOrder: { field: "name", dir: "asc" },
  pageSize: 80,
};

/** The respondent form's fields, shared by the add and edit pages. */
export const RESPONDENT_FIELDS: FieldDef[] = [
  { name: "name", label: "Name", kind: "text" },
  { name: "email", label: "Email", kind: "text", required: true },
  { name: "department", label: "Department", kind: "text" },
  { name: "roleTitle", label: "Role", kind: "text" },
  { name: "seniority", label: "Seniority", kind: "select", options: SENIORITIES.map((s) => ({ value: s, label: SENIORITY_LABELS[s] })) },
];
