import { z } from "zod";

/**
 * The shape of `instrument_template.definition`: everything needed to create an instrument's
 * dimensions, sections, questions and options. Shared by the shipped templates and, later, firm
 * templates saved from a real instrument.
 */

export const QUESTION_TYPES = ["likert_5", "likert_7", "single_choice", "multi_choice", "open_text", "numeric"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Types that score into a dimension and therefore must name one. */
export const SCORED_TYPES: readonly QuestionType[] = ["likert_5", "likert_7", "single_choice", "multi_choice"];
export const CHOICE_TYPES: readonly QuestionType[] = ["single_choice", "multi_choice"];

const option = z.object({ label: z.string().min(1).max(200), value: z.number() });

const question = z
  .object({
    text: z.string().min(1).max(500),
    helpText: z.string().max(500).optional(),
    type: z.enum(QUESTION_TYPES),
    dimension: z.string().optional(),
    weight: z.number().positive().default(1),
    required: z.boolean().default(true),
    reverse: z.boolean().default(false),
    options: z.array(option).optional(),
    /** Which construct the item operationalises, and from which source. Shown to consultants only. */
    source: z.string().optional(),
  })
  .refine((q) => !SCORED_TYPES.includes(q.type) || q.dimension, { message: "A scored question needs a dimension" })
  .refine((q) => !CHOICE_TYPES.includes(q.type) || (q.options?.length ?? 0) >= 2, {
    message: "A choice question needs at least two options",
  });

export const definitionSchema = z
  .object({
    dimensions: z.array(z.object({ key: z.string().min(1), name: z.string().min(1).max(80), weight: z.number().positive().default(1) })).min(1),
    sections: z.array(z.object({ title: z.string().min(1).max(120), description: z.string().max(500).optional(), questions: z.array(question) })).min(1),
  })
  .superRefine((d, ctx) => {
    const keys = new Set(d.dimensions.map((x) => x.key));
    d.sections.forEach((s, si) =>
      s.questions.forEach((q, qi) => {
        if (q.dimension && !keys.has(q.dimension)) {
          ctx.addIssue({ code: "custom", path: ["sections", si, "questions", qi, "dimension"], message: `Unknown dimension ${q.dimension}` });
        }
      }),
    );
  });

export type InstrumentDefinition = z.infer<typeof definitionSchema>;
