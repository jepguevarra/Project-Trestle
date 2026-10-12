import { customType, foreignKey, index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { instrument } from "./instruments";
import { response } from "./survey";
import { organization } from "./tenancy";

// Phase 05. The scores themselves are never stored (DATA-MODEL.md §4); these are the things a
// consultant writes about them: narrative blocks, theme tags on open answers, and the firm's logo
// for the exported report.

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const NARRATIVE_KEYS = ["summary", "findings", "recommendations"] as const;
export type NarrativeKey = (typeof NARRATIVE_KEYS)[number];

/** The consultant's own words, one block per key, saved against an instrument's report. */
export const reportNarrative = pgTable(
  "report_narrative",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    engagementId: uuid("engagement_id").notNull(),
    instrumentId: uuid("instrument_id").notNull(),
    key: text("key", { enum: NARRATIVE_KEYS }).notNull(),
    body: text("body").notNull(),
    ...timestamps,
  },
  (t) => [
    unique("report_narrative_instrument_id_key_key").on(t.instrumentId, t.key),
    index("report_narrative_org_id_idx").on(t.orgId),
    index("report_narrative_instrument_id_engagement_id_org_id_idx").on(t.instrumentId, t.engagementId, t.orgId),
    foreignKey({
      name: "report_narrative_instrument_fk",
      columns: [t.instrumentId, t.engagementId, t.orgId],
      foreignColumns: [instrument.id, instrument.engagementId, instrument.orgId],
    }).onDelete("cascade"),
  ],
);

/** A theme a consultant tagged an open-text answer with, by hand. */
export const responseTheme = pgTable(
  "response_theme",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    engagementId: uuid("engagement_id").notNull(),
    instrumentId: uuid("instrument_id").notNull(),
    responseId: uuid("response_id").notNull(),
    theme: text("theme").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("response_theme_response_id_theme_key").on(t.responseId, t.theme),
    index("response_theme_org_id_idx").on(t.orgId),
    index("response_theme_instrument_id_engagement_id_org_id_idx").on(t.instrumentId, t.engagementId, t.orgId),
    foreignKey({
      name: "response_theme_instrument_fk",
      columns: [t.instrumentId, t.engagementId, t.orgId],
      foreignColumns: [instrument.id, instrument.engagementId, instrument.orgId],
    }).onDelete("cascade"),
    foreignKey({
      name: "response_theme_response_fk",
      columns: [t.responseId, t.instrumentId],
      foreignColumns: [response.id, response.instrumentId],
    }).onDelete("cascade"),
  ],
);

/** The firm's logo for exports. Its own table so organisation reads never carry image bytes. */
export const orgBranding = pgTable("org_branding", {
  orgId: uuid("org_id")
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  logo: bytea("logo").notNull(),
  logoType: text("logo_type", { enum: ["image/png", "image/jpeg"] }).notNull(),
  ...timestamps,
});
