import { z } from "zod";
import type { ModelDef, ViewMode } from "./types";

/**
 * A collection view's state, all of it in the URL so every list is linkable, reloadable and
 * back-button safe (OCM-MODULE.md §7.2):
 *
 *   v=kanban  s=name:odoo (repeatable)  f=active,archived  g=client  o=-name  p=2  l=80  c=optional,cols
 *
 * `f` absent means the model's default filters; `f=` present and empty means no filters.
 */
export type ViewParams = {
  view: ViewMode;
  facets: { field: string; value: string }[];
  filters: string[];
  groupBy: string | null;
  order: { field: string; dir: "asc" | "desc" };
  page: number;
  limit: number;
  cols: string[];
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

const list = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const csv = (v: string | undefined) => (v ? v.split(",").filter(Boolean) : []);

/** Parses search params against a model, dropping anything the model does not define. */
export function parseViewParams(raw: RawSearchParams, model: ModelDef): ViewParams {
  const viewParsed = z.enum(["list", "kanban"]).safeParse(first(raw.v));
  const view = viewParsed.success && model.views.includes(viewParsed.data) ? viewParsed.data : model.views[0]!;

  const facetKeys = new Set(model.facets.map((f) => f.key));
  const facets = list(raw.s).flatMap((s) => {
    const i = s.indexOf(":");
    const field = s.slice(0, i);
    const value = s.slice(i + 1).trim().slice(0, 100);
    return i > 0 && facetKeys.has(field) && value ? [{ field, value }] : [];
  });

  const filterKeys = new Set(model.filters.map((f) => f.key));
  const rawF = first(raw.f);
  const filters = rawF === undefined ? model.defaultFilters : csv(rawF).filter((k) => filterKeys.has(k));

  const g = first(raw.g);
  const groupBy = g && model.groupBys.some((x) => x.key === g) ? g : null;

  const sortable = new Set(model.columns.filter((c) => c.sortable).map((c) => c.key));
  const o = first(raw.o) ?? "";
  const dir = o.startsWith("-") ? "desc" : "asc";
  const field = o.replace(/^-/, "");
  const order = sortable.has(field) ? { field, dir: dir as "asc" | "desc" } : model.defaultOrder;

  const page = z.coerce.number().int().min(1).max(10_000).catch(1).parse(first(raw.p) ?? 1);
  const limit = z.coerce.number().int().min(5).max(200).catch(model.pageSize).parse(first(raw.l) ?? model.pageSize);

  const optional = new Set(model.columns.filter((c) => c.optional).map((c) => c.key));
  const cols = csv(first(raw.c)).filter((k) => optional.has(k));

  return { view, facets, filters, groupBy, order, page, limit, cols };
}

/** Serialises params back to a query string, omitting defaults so URLs stay short. */
export function toSearchParams(p: ViewParams, model: ModelDef): URLSearchParams {
  const out = new URLSearchParams();
  if (p.view !== model.views[0]) out.set("v", p.view);
  for (const f of p.facets) out.append("s", `${f.field}:${f.value}`);
  const isDefault =
    p.filters.length === model.defaultFilters.length && p.filters.every((f) => model.defaultFilters.includes(f));
  if (!isDefault) out.set("f", p.filters.join(","));
  if (p.groupBy) out.set("g", p.groupBy);
  if (p.order.field !== model.defaultOrder.field || p.order.dir !== model.defaultOrder.dir) {
    out.set("o", `${p.order.dir === "desc" ? "-" : ""}${p.order.field}`);
  }
  if (p.page > 1) out.set("p", String(p.page));
  if (p.limit !== model.pageSize) out.set("l", String(p.limit));
  if (p.cols.length) out.set("c", p.cols.join(","));
  return out;
}

export function hrefWith(base: string, p: ViewParams, model: ModelDef, patch: Partial<ViewParams> = {}): string {
  const qs = toSearchParams({ ...p, ...patch }, model).toString();
  return qs ? `${base}?${qs}` : base;
}

/** The part of a list's state that defines its record order: carried into forms for the pager. */
export function listContext(p: ViewParams, model: ModelDef): string {
  const qs = toSearchParams({ ...p, view: model.views[0]!, page: 1, cols: [] }, model);
  return qs.toString();
}
