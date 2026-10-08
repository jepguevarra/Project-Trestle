import { sql } from "drizzle-orm";
import { check, foreignKey, index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "./auth";
import { engagement } from "./engagements";
import { organization } from "./tenancy";

// DATA-MODEL.md §16: chatter, the one sanctioned polymorphic table. `res_type` is a closed list
// (lib/views/registry.ts, mirrored by a CHECK constraint); RLS mirrors the parent record's own
// visibility, so a note is readable exactly when the record it is on is readable.

export const messageKind = pgEnum("message_kind", ["note", "tracking", "system"]);

/** One changed field in a tracking message. */
export type TrackingEntry = { field: string; label: string; old: string | null; new: string | null };

export const recordMessage = pgTable(
  "record_message",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // Null for org-level records such as clients.
    engagementId: uuid("engagement_id"),
    resType: text("res_type").notNull(),
    resId: uuid("res_id").notNull(),
    kind: messageKind("kind").notNull(),
    body: text("body"),
    tracking: jsonb("tracking").$type<TrackingEntry[]>(),
    authorUserId: uuid("author_user_id").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("record_message_res_type_res_id_created_at_idx").on(t.resType, t.resId, t.createdAt),
    index("record_message_org_id_idx").on(t.orgId),
    index("record_message_engagement_id_org_id_idx").on(t.engagementId, t.orgId),
    index("record_message_author_user_id_idx").on(t.authorUserId),
    foreignKey({
      name: "record_message_engagement_fk",
      columns: [t.engagementId, t.orgId],
      foreignColumns: [engagement.id, engagement.orgId],
    }).onDelete("cascade"),
    check("record_message_res_type_check", sql`${t.resType} in ('client', 'engagement', 'instrument')`),
    check(
      "record_message_kind_payload_check",
      sql`(${t.kind} = 'tracking') = (${t.tracking} is not null) and (${t.kind} = 'tracking' or ${t.body} is not null)`,
    ),
  ],
);
