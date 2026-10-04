import { date, foreignKey, index, pgEnum, pgTable, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "./auth";
import { membership, organization } from "./tenancy";

// DATA-MODEL.md §1, phase 02. References between tenant tables use composite (id, org_id) foreign
// keys, so a row can never point at another org's row: FK checks ignore RLS. RLS policies are at
// the bottom of drizzle/0001_*.sql.

export const clientSizeBand = pgEnum("client_size_band", ["micro", "small", "medium", "large"]);
export const engagementType = pgEnum("engagement_type", [
  "packaged_software",
  "custom_build",
  "platform_migration",
  "automation",
  "digitalisation",
]);
export const engagementStatus = pgEnum("engagement_status", ["active", "archived"]);
export const engagementAccess = pgEnum("engagement_access", ["edit", "read"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const client = pgTable(
  "client",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Free text from a fixed list in lib/validation/clients.ts, so the list can change without a migration.
    industry: text("industry"),
    sizeBand: clientSizeBand("size_band"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    unique("client_id_org_id_key").on(t.id, t.orgId),
    index("client_org_id_idx").on(t.orgId),
  ],
);

export const engagement = pgTable(
  "engagement",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").notNull(),
    name: text("name").notNull(),
    // Load-bearing from the first migration: drives modules, instrument template, pattern library
    // scope and whether fit-gap applies (POSITIONING.md §4.1).
    type: engagementType("type").notNull(),
    targetSystem: text("target_system").notNull(),
    // A calendar date, not an instant: a go-live is a day in the client's calendar.
    targetGoLive: date("target_go_live"),
    // The plan meter (BUSINESS-MODEL.md §5): active counts against the plan, archived never does.
    status: engagementStatus("status").notNull().default("active"),
    createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    unique("engagement_id_org_id_key").on(t.id, t.orgId),
    index("engagement_org_id_status_idx").on(t.orgId, t.status),
    index("engagement_client_id_org_id_idx").on(t.clientId, t.orgId),
    index("engagement_created_by_idx").on(t.createdBy),
    foreignKey({
      name: "engagement_client_fk",
      columns: [t.clientId, t.orgId],
      foreignColumns: [client.id, client.orgId],
    }).onDelete("cascade"),
  ],
);

export const engagementAssignment = pgTable(
  "engagement_assignment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    engagementId: uuid("engagement_id").notNull(),
    userId: uuid("user_id").notNull(),
    // A viewer's effective access is always read, whatever this says (private.engagement_access).
    access: engagementAccess("access").notNull().default("read"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("engagement_assignment_engagement_id_user_id_key").on(t.engagementId, t.userId),
    index("engagement_assignment_org_id_idx").on(t.orgId),
    index("engagement_assignment_engagement_id_org_id_idx").on(t.engagementId, t.orgId),
    index("engagement_assignment_org_id_user_id_idx").on(t.orgId, t.userId),
    index("engagement_assignment_user_id_idx").on(t.userId),
    foreignKey({
      name: "engagement_assignment_engagement_fk",
      columns: [t.engagementId, t.orgId],
      foreignColumns: [engagement.id, engagement.orgId],
    }).onDelete("cascade"),
    // Only members can be assigned, and removing a member removes their assignments.
    foreignKey({
      name: "engagement_assignment_membership_fk",
      columns: [t.orgId, t.userId],
      foreignColumns: [membership.orgId, membership.userId],
    }).onDelete("cascade"),
  ],
);
