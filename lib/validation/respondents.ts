import { z } from "zod";
import { SENIORITIES } from "@/lib/views/respondent";

const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optionalText = z.preprocess(emptyToUndefined, z.string().trim().max(120).optional());

export const respondentFieldsSchema = z.object({
  instrumentId: z.uuid(),
  name: optionalText,
  email: z.string().trim().toLowerCase().pipe(z.email("Enter an email address.")),
  department: optionalText,
  roleTitle: optionalText,
  seniority: z.preprocess(emptyToUndefined, z.enum(SENIORITIES).optional()),
});

export const respondentUpdateSchema = respondentFieldsSchema.extend({ respondentId: z.uuid() });
export const respondentIdSchema = z.object({ instrumentId: z.uuid(), respondentId: z.uuid() });
export const importRespondentsSchema = z.object({ instrumentId: z.uuid(), list: z.string().max(1_000_000) });
