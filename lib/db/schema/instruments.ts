import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type { InstrumentDefinition } from "@/lib/instruments/definition";
import { authUsers } from "./auth";
import { engagement, engagementType } from "./engagements";
import { organization } from "./tenancy";

// DATA-MODEL.md §2, phase 03. Every child of an instrument carries org_id AND engagement_id, so
// each policy is the plain engagement-scope predicate with no join (see the phase 03 build notes).
// Composite foreign keys keep children inside their instrument, engagement and org.
//
// `token_secret` is deliberately NOT here: anything on this table is readable by everyone on the
// engagement, a client-side viewer included. Phase 04 keeps the signing secret where the API
// cannot reach it.

export const instrumentKind = pgEnum("instrument_kind", [
  "readiness",
  "sponsor",
  "pulse",
  "go_live_adoption",
  "post_go_live_adoption",
  "training_feedback",
  "champion",
  "coaching",
  "communication_feedback",
  "custom",
]);
export const instrumentAnonymity = pgEnum("instrument_anonymity", ["identified", "anonymous"]);
export const instrumentStatus = pgEnum("instrument_status", ["draft", "open", "closed"]);
export const questionType = pgEnum("question_type", ["likert_5", "likert_7", "single_choice", "multi_choice", "open_text", "numeric"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const instrumentTemplate = pgTable(
  "instrument_template",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Null for the templates Trestle ships; set for a firm's own.
    orgId: uuid("org_id").references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: instrumentKind("kind").notNull().default("readiness"),
    // Null = suitable for any type of engagement.
    engagementType: engagementType("engagement_type"),
    version: integer("version").notNull().default(1),
    isSystem: boolean("is_system").notNull().default(false),
    definition: jsonb("definition").$type<InstrumentDefinition>().notNull(),
    ...timestamps,
  },
  (t) => [
    index("instrument_template_org_id_idx").on(t.orgId),
    check("instrument_template_system_check", sql`${t.isSystem} = (${t.orgId} is null)`),
  ],
);

export const instrument = pgTable(
  "instrument",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    engagementId: uuid("engagement_id").notNull(),
    templateId: uuid("template_id").references(() => instrumentTemplate.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    kind: instrumentKind("kind").notNull().default("readiness"),
    wave: smallint("wave").notNull().default(1),
    waveLabel: text("wave_label"),
    anonymity: instrumentAnonymity("anonymity").notNull().default("anonymous"),
    opensAt: timestamp("opens_at", { withTimezone: true }),
    closesAt: timestamp("closes_at", { withTimezone: true }),
    status: instrumentStatus("status").notNull().default("draft"),
    /**
     * Survey link version. Every respondent link carries it; bumping it revokes every link sent so
     * far (phase 04). Not a secret: the signing key lives in the server environment.
     */
    tokenEpoch: integer("token_epoch").notNull().default(1),
    createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    unique("instrument_id_engagement_id_org_id_key").on(t.id, t.engagementId, t.orgId),
    index("instrument_org_id_idx").on(t.orgId),
    index("instrument_engagement_id_org_id_idx").on(t.engagementId, t.orgId),
    index("instrument_template_id_idx").on(t.templateId),
    index("instrument_created_by_idx").on(t.createdBy),
    foreignKey({
      name: "instrument_engagement_fk",
      columns: [t.engagementId, t.orgId],
      foreignColumns: [engagement.id, engagement.orgId],
    }).onDelete("cascade"),
    check("instrument_wave_check", sql`${t.wave} >= 1`),
    check("instrument_window_check", sql`${t.closesAt} is null or ${t.opensAt} is null or ${t.closesAt} > ${t.opensAt}`),
  ],
);

/** The columns every instrument child shares, and its composite FK back to the instrument. */
const childColumns = () => ({
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  engagementId: uuid("engagement_id").notNull(),
  instrumentId: uuid("instrument_id").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const dimension = pgTable(
  "dimension",
  {
    ...childColumns(),
    name: text("name").notNull(),
    weight: numeric("weight", { mode: "number" }).notNull().default(1),
    ...timestamps,
  },
  (t) => [
    unique("dimension_instrument_id_name_key").on(t.instrumentId, t.name),
    unique("dimension_id_instrument_id_key").on(t.id, t.instrumentId),
    index("dimension_org_id_idx").on(t.orgId),
    index("dimension_instrument_id_engagement_id_org_id_idx").on(t.instrumentId, t.engagementId, t.orgId),
    foreignKey({
      name: "dimension_instrument_fk",
      columns: [t.instrumentId, t.engagementId, t.orgId],
      foreignColumns: [instrument.id, instrument.engagementId, instrument.orgId],
    }).onDelete("cascade"),
    check("dimension_weight_check", sql`${t.weight} > 0`),
  ],
);

export const section = pgTable(
  "section",
  {
    ...childColumns(),
    title: text("title").notNull(),
    description: text("description"),
    ...timestamps,
  },
  (t) => [
    unique("section_id_instrument_id_key").on(t.id, t.instrumentId),
    index("section_org_id_idx").on(t.orgId),
    index("section_instrument_id_engagement_id_org_id_idx").on(t.instrumentId, t.engagementId, t.orgId),
    foreignKey({
      name: "section_instrument_fk",
      columns: [t.instrumentId, t.engagementId, t.orgId],
      foreignColumns: [instrument.id, instrument.engagementId, instrument.orgId],
    }).onDelete("cascade"),
  ],
);

export const question = pgTable(
  "question",
  {
    ...childColumns(),
    sectionId: uuid("section_id").notNull(),
    // Null only for types that are not scored (open text, numeric).
    dimensionId: uuid("dimension_id"),
    text: text("text").notNull(),
    helpText: text("help_text"),
    type: questionType("type").notNull(),
    weight: numeric("weight", { mode: "number" }).notNull().default(1),
    isRequired: boolean("is_required").notNull().default(true),
    isReverseScored: boolean("is_reverse_scored").notNull().default(false),
    /** Construct and source an item operationalises, copied from the template. Consultant-facing only. */
    source: text("source"),
    ...timestamps,
  },
  (t) => [
    unique("question_id_instrument_id_key").on(t.id, t.instrumentId),
    index("question_org_id_idx").on(t.orgId),
    index("question_instrument_id_engagement_id_org_id_idx").on(t.instrumentId, t.engagementId, t.orgId),
    index("question_section_id_instrument_id_idx").on(t.sectionId, t.instrumentId),
    index("question_dimension_id_instrument_id_idx").on(t.dimensionId, t.instrumentId),
    foreignKey({
      name: "question_instrument_fk",
      columns: [t.instrumentId, t.engagementId, t.orgId],
      foreignColumns: [instrument.id, instrument.engagementId, instrument.orgId],
    }).onDelete("cascade"),
    foreignKey({
      name: "question_section_fk",
      columns: [t.sectionId, t.instrumentId],
      foreignColumns: [section.id, section.instrumentId],
    }).onDelete("cascade"),
    // RESTRICT: a dimension in use cannot be deleted until its questions move elsewhere.
    foreignKey({
      name: "question_dimension_fk",
      columns: [t.dimensionId, t.instrumentId],
      foreignColumns: [dimension.id, dimension.instrumentId],
    }).onDelete("restrict"),
    check("question_weight_check", sql`${t.weight} > 0`),
    check(
      "question_dimension_check",
      sql`${t.type} in ('open_text', 'numeric') or ${t.dimensionId} is not null`,
    ),
  ],
);

export const questionOption = pgTable(
  "question_option",
  {
    ...childColumns(),
    questionId: uuid("question_id").notNull(),
    label: text("label").notNull(),
    value: numeric("value", { mode: "number" }).notNull(),
    ...timestamps,
  },
  (t) => [
    index("question_option_org_id_idx").on(t.orgId),
    index("question_option_instrument_id_engagement_id_org_id_idx").on(t.instrumentId, t.engagementId, t.orgId),
    index("question_option_question_id_instrument_id_idx").on(t.questionId, t.instrumentId),
    foreignKey({
      name: "question_option_instrument_fk",
      columns: [t.instrumentId, t.engagementId, t.orgId],
      foreignColumns: [instrument.id, instrument.engagementId, instrument.orgId],
    }).onDelete("cascade"),
    foreignKey({
      name: "question_option_question_fk",
      columns: [t.questionId, t.instrumentId],
      foreignColumns: [question.id, question.instrumentId],
    }).onDelete("cascade"),
  ],
);
