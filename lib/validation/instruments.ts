import { z } from "zod";
import { QUESTION_TYPES, SCORED_TYPES, CHOICE_TYPES } from "@/lib/instruments/definition";
import { INSTRUMENT_KINDS, INSTRUMENT_STATUSES } from "@/lib/views/instrument";

const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optionalText = (max: number) => z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());
/** `datetime-local` values, read as UTC (the form labels them so). */
const utcDateTime = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Enter a date and time.")
    .transform((v) => new Date(`${v}:00Z`))
    .optional(),
);
const bool = z.preprocess((v) => v === "true" || v === "on" || v === true, z.boolean());
const positive = z.coerce.number({ message: "Enter a number." }).positive("Must be more than zero.").max(100, "Keep it at 100 or less.");

export const instrumentIdSchema = z.object({ instrumentId: z.uuid() });

export const createInstrumentSchema = z.object({
  name: z.string().trim().min(2, "Enter a name.").max(120),
  templateId: z.preprocess(emptyToUndefined, z.uuid().optional()),
  wave: z.coerce.number().int().min(1).max(99).default(1),
  waveLabel: optionalText(60),
});

export const instrumentSettingsSchema = instrumentIdSchema
  .extend({
    name: z.string().trim().min(2, "Enter a name.").max(120),
    kind: z.enum(INSTRUMENT_KINDS),
    wave: z.coerce.number({ message: "Enter a number." }).int().min(1, "Waves start at 1.").max(99),
    waveLabel: optionalText(60),
    anonymity: z.enum(["anonymous", "identified"]),
    opensAt: utcDateTime,
    closesAt: utcDateTime,
  })
  .refine((v) => !v.opensAt || !v.closesAt || v.closesAt > v.opensAt, { path: ["closesAt"], message: "Closes must be after opens." });

export const instrumentStatusSchema = instrumentIdSchema.extend({ status: z.enum(INSTRUMENT_STATUSES) });
/** The kanban posts `stage`; same rules as the statusbar. */
export const instrumentStageSchema = z.object({ stage: z.enum(INSTRUMENT_STATUSES) });

// ─── Builder ─────────────────────────────────────────────────────────────────────────────────

export const dimensionSchema = instrumentIdSchema.extend({
  dimensionId: z.preprocess(emptyToUndefined, z.uuid().optional()),
  name: z.string().trim().min(1, "Name the dimension.").max(80),
  weight: positive,
});

export const sectionSchema = instrumentIdSchema.extend({
  sectionId: z.preprocess(emptyToUndefined, z.uuid().optional()),
  title: z.string().trim().min(1, "Give the section a title.").max(120),
  description: optionalText(500),
});

const optionsField = z.preprocess(
  (v) => (typeof v === "string" ? v : "[]"),
  z
    .string()
    .transform((s, ctx) => {
      try {
        return JSON.parse(s) as unknown;
      } catch {
        ctx.addIssue({ code: "custom", message: "Options are malformed." });
        return z.NEVER;
      }
    })
    .pipe(z
        .array(
          z.object({
            label: z.string().trim().min(1, "Every option needs a label.").max(200),
            value: z.preprocess(emptyToUndefined, z.coerce.number({ message: "Every option needs a score." })),
          }),
        )
        .max(20, "Keep it to 20 options or fewer.")),
);

export const questionSchema = instrumentIdSchema
  .extend({
    questionId: z.preprocess(emptyToUndefined, z.uuid().optional()),
    sectionId: z.uuid(),
    dimensionId: z.preprocess(emptyToUndefined, z.uuid().optional()),
    text: z.string().trim().min(1, "Write the question.").max(500),
    helpText: optionalText(500),
    type: z.enum(QUESTION_TYPES),
    weight: positive,
    isRequired: bool,
    isReverseScored: bool,
    options: optionsField,
  })
  .refine((q) => !SCORED_TYPES.includes(q.type) || q.dimensionId, {
    path: ["dimensionId"],
    message: "This type of question is scored, so it needs a dimension.",
  })
  .refine((q) => !CHOICE_TYPES.includes(q.type) || q.options.length >= 2, {
    path: ["options"],
    message: "A choice question needs at least two options.",
  });

export const deleteChildSchema = instrumentIdSchema.extend({ id: z.uuid() });

const idList = z
  .string()
  .transform((s) => s.split(",").filter(Boolean))
  .pipe(z.array(z.uuid()).max(500));

/** A new order: the ids of a list, top to bottom. Questions also say which section they are in. */
export const reorderSchema = instrumentIdSchema.extend({
  kind: z.enum(["dimension", "section", "question"]),
  sectionId: z.preprocess(emptyToUndefined, z.uuid().optional()),
  ids: idList,
});
