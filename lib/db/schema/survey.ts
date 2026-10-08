import { sql } from "drizzle-orm";
import { check, foreignKey, index, integer, numeric, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { instrument, question, questionOption } from "./instruments";
import { organization } from "./tenancy";

// DATA-MODEL.md §3, phase 04. Like the instrument's children, every row carries org_id and
// engagement_id, and composite foreign keys keep it inside its instrument.

export const seniority = pgEnum("seniority", ["frontline", "supervisor", "manager", "executive"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

/** A person asked to answer one instrument. Their segment attributes are copied onto each answer. */
export const respondent = pgTable(
  "respondent",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    engagementId: uuid("engagement_id").notNull(),
    instrumentId: uuid("instrument_id").notNull(),
    name: text("name"),
    /** Stored lower-case; unique per instrument. */
    email: text("email").notNull(),
    department: text("department"),
    roleTitle: text("role_title"),
    seniority: seniority("seniority"),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    remindedAt: timestamp("reminded_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    /** Bumped to revoke this one person's link, e.g. when their email address is corrected. */
    tokenVersion: integer("token_version").notNull().default(1),
    ...timestamps,
  },
  (t) => [
    unique("respondent_instrument_id_email_key").on(t.instrumentId, t.email),
    unique("respondent_id_instrument_id_key").on(t.id, t.instrumentId),
    index("respondent_org_id_idx").on(t.orgId),
    index("respondent_instrument_id_engagement_id_org_id_idx").on(t.instrumentId, t.engagementId, t.orgId),
    foreignKey({
      name: "respondent_instrument_fk",
      columns: [t.instrumentId, t.engagementId, t.orgId],
      foreignColumns: [instrument.id, instrument.engagementId, instrument.orgId],
    }).onDelete("cascade"),
    check("respondent_email_check", sql`${t.email} = lower(${t.email}) and ${t.email} like '%_@_%'`),
  ],
);

/**
 * Submitted answers only. One row per question, or per selected option for choice questions.
 *
 * On an anonymous instrument `respondent_id` is never written: the submit function inserts null,
 * and `answered_at` is null too, so a timestamp cannot be matched to `respondent.completed_at`.
 * `submission_id` groups one person's answers (needed for reliability and straight-lining checks)
 * without saying who they are.
 */
export const response = pgTable(
  "response",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    engagementId: uuid("engagement_id").notNull(),
    instrumentId: uuid("instrument_id").notNull(),
    questionId: uuid("question_id").notNull(),
    optionId: uuid("option_id"),
    submissionId: uuid("submission_id").notNull(),
    respondentId: uuid("respondent_id"),
    department: text("department"),
    roleTitle: text("role_title"),
    seniority: seniority("seniority"),
    valueNumeric: numeric("value_numeric", { mode: "number" }),
    valueText: text("value_text"),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
  },
  (t) => [
    index("response_org_id_idx").on(t.orgId),
    index("response_instrument_id_question_id_idx").on(t.instrumentId, t.questionId),
    index("response_instrument_id_engagement_id_org_id_idx").on(t.instrumentId, t.engagementId, t.orgId),
    index("response_respondent_id_idx").on(t.respondentId),
    index("response_option_id_idx").on(t.optionId),
    foreignKey({
      name: "response_instrument_fk",
      columns: [t.instrumentId, t.engagementId, t.orgId],
      foreignColumns: [instrument.id, instrument.engagementId, instrument.orgId],
    }).onDelete("cascade"),
    foreignKey({
      name: "response_question_fk",
      columns: [t.questionId, t.instrumentId],
      foreignColumns: [question.id, question.instrumentId],
    }).onDelete("cascade"),
    foreignKey({ name: "response_option_fk", columns: [t.optionId], foreignColumns: [questionOption.id] }).onDelete("cascade"),
    foreignKey({
      name: "response_respondent_fk",
      columns: [t.respondentId, t.instrumentId],
      foreignColumns: [respondent.id, respondent.instrumentId],
    }),
  ],
);

/**
 * A respondent's answers before they submit, so they can leave and come back. Never readable by
 * consultants: only the survey role has policies on it. Deleted on submit.
 */
export const responseDraft = pgTable(
  "response_draft",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    engagementId: uuid("engagement_id").notNull(),
    instrumentId: uuid("instrument_id").notNull(),
    respondentId: uuid("respondent_id").notNull(),
    questionId: uuid("question_id").notNull(),
    valueNumeric: numeric("value_numeric", { mode: "number" }),
    valueText: text("value_text"),
    optionIds: uuid("option_ids").array(),
    ...timestamps,
  },
  (t) => [
    unique("response_draft_respondent_id_question_id_key").on(t.respondentId, t.questionId),
    index("response_draft_org_id_idx").on(t.orgId),
    index("response_draft_instrument_id_engagement_id_org_id_idx").on(t.instrumentId, t.engagementId, t.orgId),
    index("response_draft_question_id_instrument_id_idx").on(t.questionId, t.instrumentId),
    foreignKey({
      name: "response_draft_instrument_fk",
      columns: [t.instrumentId, t.engagementId, t.orgId],
      foreignColumns: [instrument.id, instrument.engagementId, instrument.orgId],
    }).onDelete("cascade"),
    foreignKey({
      name: "response_draft_respondent_fk",
      columns: [t.respondentId, t.instrumentId],
      foreignColumns: [respondent.id, respondent.instrumentId],
    }).onDelete("cascade"),
    foreignKey({
      name: "response_draft_question_fk",
      columns: [t.questionId, t.instrumentId],
      foreignColumns: [question.id, question.instrumentId],
    }).onDelete("cascade"),
  ],
);
