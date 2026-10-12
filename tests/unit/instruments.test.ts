import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { definitionSchema, SCORED_TYPES } from "@/lib/instruments/definition";
import { READINESS_TEMPLATES } from "@/lib/instruments/readiness-templates";
import { renderReviewDoc } from "@/lib/instruments/review-doc";
import { ENGAGEMENT_TYPES } from "@/lib/validation/engagements";
import { questionSchema, reorderSchema } from "@/lib/validation/instruments";

const id = "00000000-0000-4000-8000-000000000001";
const base = {
  instrumentId: id,
  sectionId: id,
  dimensionId: id,
  text: "I understand why we are changing.",
  type: "likert_5",
  weight: "1",
  isRequired: "true",
  isReverseScored: "false",
  options: "[]",
};

describe("shipped readiness templates", () => {
  it("one generic template and one per engagement type", () => {
    expect(READINESS_TEMPLATES.filter((t) => t.engagementType === null)).toHaveLength(1);
    for (const type of ENGAGEMENT_TYPES) expect(READINESS_TEMPLATES.filter((t) => t.engagementType === type)).toHaveLength(1);
  });

  it.each(READINESS_TEMPLATES.map((t) => [t.name, t] as const))("%s is a valid definition with the six dimensions", (_, t) => {
    const d = definitionSchema.parse(t.definition);
    expect(d.dimensions.map((x) => x.key)).toEqual(["leadership", "awareness", "capability", "culture", "resources", "communication"]);
    const questions = d.sections.flatMap((s) => s.questions);
    for (const dim of d.dimensions) expect(questions.filter((q) => q.dimension === dim.key).length).toBeGreaterThanOrEqual(3);
    // Every scored item says what it operationalises, so the wording can be reviewed against its source.
    for (const q of questions.filter((q) => SCORED_TYPES.includes(q.type))) expect(q.source).toBeTruthy();
    expect(questions.some((q) => q.reverse)).toBe(true);
  });

  it("docs/READINESS-INSTRUMENT.md is current (regenerate with pnpm instruments:doc)", () => {
    expect(readFileSync("docs/READINESS-INSTRUMENT.md", "utf8")).toBe(renderReviewDoc());
  });
});

describe("question validation", () => {
  it("accepts a scored question with a dimension", () => {
    const q = questionSchema.parse({ ...base, isReverseScored: "true" });
    expect(q.isReverseScored).toBe(true);
    expect(q.weight).toBe(1);
  });

  it("a scored question needs a dimension", () => {
    const r = questionSchema.safeParse({ ...base, dimensionId: "" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(["dimensionId"]);
  });

  it("open text needs no dimension", () => {
    expect(questionSchema.safeParse({ ...base, type: "open_text", dimensionId: "" }).success).toBe(true);
  });

  it("a choice question needs two options, each with a label and a score", () => {
    const one = questionSchema.safeParse({ ...base, type: "single_choice", options: JSON.stringify([{ label: "Yes", value: "1" }]) });
    expect(one.error?.issues[0]?.path).toEqual(["options"]);
    const noScore = questionSchema.safeParse({
      ...base,
      type: "single_choice",
      options: JSON.stringify([
        { label: "Yes", value: "1" },
        { label: "No", value: "" },
      ]),
    });
    expect(noScore.success).toBe(false);
    const ok = questionSchema.parse({
      ...base,
      type: "multi_choice",
      options: JSON.stringify([
        { label: "Yes", value: "1" },
        { label: "No", value: "0" },
      ]),
    });
    expect(ok.options).toEqual([
      { label: "Yes", value: 1 },
      { label: "No", value: 0 },
    ]);
  });

  it("weight must be positive", () => {
    expect(questionSchema.safeParse({ ...base, weight: "0" }).success).toBe(false);
    expect(questionSchema.safeParse({ ...base, weight: "abc" }).success).toBe(false);
  });

  it("reorder takes a comma list of ids and rejects anything else", () => {
    expect(reorderSchema.parse({ instrumentId: id, kind: "section", ids: `${id},${id}` }).ids).toHaveLength(2);
    expect(reorderSchema.safeParse({ instrumentId: id, kind: "section", ids: "1,2" }).success).toBe(false);
  });
});
