import { describe, expect, it } from "vitest";
import { clientModel } from "@/lib/views/client";
import { engagementModel, engagementTracked } from "@/lib/views/engagement";
import { listContext, parseViewParams, toSearchParams } from "@/lib/views/params";
import { resTypeSchema } from "@/lib/views/registry";
import { diffTracked } from "@/lib/views/tracking";

describe("view params (URL state)", () => {
  it("applies the model's defaults when the URL is empty", () => {
    const p = parseViewParams({}, engagementModel);
    expect(p).toMatchObject({ view: "list", filters: ["active"], groupBy: null, page: 1, limit: 80, facets: [] });
    expect(toSearchParams(p, engagementModel).toString()).toBe("");
  });

  it("round-trips facets, filters, grouping, order, paging and columns", () => {
    const raw = { v: "kanban", s: ["name:odoo", "client:harbour"], f: "archived,custom_build", g: "client", o: "-goLive", p: "3", l: "20", c: "status" };
    const p = parseViewParams(raw, engagementModel);
    expect(p.facets).toEqual([
      { field: "name", value: "odoo" },
      { field: "client", value: "harbour" },
    ]);
    expect(p.order).toEqual({ field: "goLive", dir: "desc" });
    const again = parseViewParams(Object.fromEntries([...new Set(toSearchParams(p, engagementModel).keys())].map((k) => {
      const all = toSearchParams(p, engagementModel).getAll(k);
      return [k, all.length > 1 ? all : all[0]];
    })), engagementModel);
    expect(again).toEqual(p);
  });

  it("an explicit empty filter means no filters, unlike a missing one", () => {
    expect(parseViewParams({ f: "" }, engagementModel).filters).toEqual([]);
    expect(parseViewParams({}, engagementModel).filters).toEqual(["active"]);
  });

  it("drops anything the model does not define", () => {
    const p = parseViewParams({ v: "kanban", s: "secret:x", f: "nope,active", g: "ssn", o: "password", c: "evil", l: "999999", p: "-4" }, clientModel);
    expect(p).toMatchObject({ view: "list", facets: [], filters: [], groupBy: null, order: clientModel.defaultOrder, cols: [], page: 1, limit: 80 });
  });

  it("the list context excludes paging and view, so the pager walks the whole list", () => {
    const p = parseViewParams({ v: "kanban", p: "4", s: "name:x" }, engagementModel);
    expect(listContext(p, engagementModel)).toBe("s=name%3Ax");
  });
});

describe("diffTracked", () => {
  const base = {
    name: "Rollout",
    targetSystem: "Odoo",
    targetGoLive: null,
    type: "packaged_software" as const,
    clientName: "Harbour",
    status: "active" as const,
    ocmStage: "assess" as const,
    startDate: null,
    endDate: null,
    objectives: null,
    scopeSummary: null,
    successCriteria: null,
    transitionOwner: null,
  };

  it("returns one entry per changed tracked field, with labels and formatted values", () => {
    const after = { ...base, ocmStage: "develop" as const, objectives: "Close faster", targetGoLive: "2027-01-01" };
    expect(diffTracked(base, after, engagementTracked)).toEqual([
      { field: "ocmStage", label: "Stage", old: "Assess", new: "Develop" },
      { field: "targetGoLive", label: "Target go-live", old: null, new: "2027-01-01" },
      { field: "objectives", label: "Objectives", old: null, new: "Close faster" },
    ]);
  });

  it("treats empty string and null as the same, and reports nothing when nothing changed", () => {
    expect(diffTracked(base, { ...base, objectives: "" as unknown as null }, engagementTracked)).toEqual([]);
  });
});

describe("res_type registry", () => {
  it("accepts registered models and rejects anything else", () => {
    expect(resTypeSchema.parse("engagement")).toBe("engagement");
    expect(resTypeSchema.safeParse("invoice").success).toBe(false);
    expect(resTypeSchema.safeParse("").success).toBe(false);
  });
});
