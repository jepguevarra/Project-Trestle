import { z } from "zod";

// Labels and Zod schemas for clients and engagements (phase 02).

export const INDUSTRIES = [
  "Manufacturing",
  "Distribution and wholesale",
  "Retail and e-commerce",
  "Construction and property",
  "Professional services",
  "Financial services",
  "Healthcare",
  "Hospitality and food service",
  "Logistics and transport",
  "Education",
  "Public sector",
  "Non-profit",
  "Other",
] as const;

export const SIZE_BANDS = ["micro", "small", "medium", "large"] as const;
export type SizeBand = (typeof SIZE_BANDS)[number];
export const SIZE_BAND_LABELS: Record<SizeBand, string> = {
  micro: "Micro (1–9 staff)",
  small: "Small (10–49)",
  medium: "Medium (50–249)",
  large: "Large (250+)",
};

export const ENGAGEMENT_TYPES = [
  "packaged_software",
  "custom_build",
  "platform_migration",
  "automation",
  "digitalisation",
] as const;
export type EngagementType = (typeof ENGAGEMENT_TYPES)[number];
export const ENGAGEMENT_TYPE_LABELS: Record<EngagementType, string> = {
  packaged_software: "Packaged software",
  custom_build: "Custom build",
  platform_migration: "Platform migration",
  automation: "Automation",
  digitalisation: "Digitalisation",
};
export const ENGAGEMENT_TYPE_HINTS: Record<EngagementType, string> = {
  packaged_software: "ERP, CRM, HRIS, WMS, POS, accounting, e-commerce",
  custom_build: "Software built for this client",
  platform_migration: "Cloud migration, re-platforming, consolidation",
  automation: "RPA, workflow automation, AI-assisted process change",
  digitalisation: "Paper or spreadsheet processes moving to a system",
};

export const ACCESS_LEVELS = ["edit", "read"] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];

/** Empty form fields arrive as "", which means "not set". */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), schema.optional());

const name = z.string().trim().min(2, "Enter a name.").max(120, "Keep it under 120 characters.");

export const clientSchema = z.object({
  name,
  industry: optional(z.enum(INDUSTRIES, "Pick an industry from the list.")),
  sizeBand: optional(z.enum(SIZE_BANDS, "Pick a size band from the list.")),
  notes: optional(z.string().trim().max(2000, "Keep notes under 2,000 characters.")),
});
export const updateClientSchema = clientSchema.extend({ clientId: z.uuid() });

const goLive = optional(z.iso.date("Enter a date."));

export const engagementDetailsSchema = z.object({
  name,
  targetSystem: z.string().trim().min(1, "Name the system being introduced.").max(120),
  targetGoLive: goLive,
});

export const createEngagementSchema = engagementDetailsSchema.extend({
  clientId: z.uuid("Pick a client."),
  type: z.enum(ENGAGEMENT_TYPES, "Pick the type of change."),
});

export const assignSchema = z.object({ userId: z.uuid("Pick a member."), access: z.enum(ACCESS_LEVELS) });
export const unassignSchema = z.object({ userId: z.uuid() });
export const emptySchema = z.object({});
