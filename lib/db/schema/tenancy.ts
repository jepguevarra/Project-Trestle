import { sql } from "drizzle-orm";
import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "./auth";

// DATA-MODEL.md §1. Every tenant-scoped table carries org_id; RLS policies for these tables are
// hand-written at the bottom of the migration that creates them (drizzle/0000_*.sql).

export const memberRole = pgEnum("member_role", ["owner", "admin", "consultant", "viewer"]);
export const orgPlan = pgEnum("org_plan", ["solo", "practice", "firm", "enterprise"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const organization = pgTable(
  "organization",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    // Stubbed now so billing never needs a backfill; enforced by entitlements in phase 12.
    plan: orgPlan("plan").notNull().default("solo"),
    ...timestamps,
  },
  (t) => [uniqueIndex("organization_slug_key").on(t.slug)],
);

export const membership = pgTable(
  "membership",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    role: memberRole("role").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("membership_org_id_user_id_key").on(t.orgId, t.userId),
    index("membership_org_id_idx").on(t.orgId),
    index("membership_user_id_idx").on(t.userId),
  ],
);

export const invitation = pgTable(
  "invitation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: memberRole("role").notNull(),
    // sha256 hex of the emailed token. The token itself is never stored.
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    invitedBy: uuid("invited_by").references(() => authUsers.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("invitation_token_hash_key").on(t.tokenHash),
    // At most one pending invitation per address per org.
    uniqueIndex("invitation_org_id_email_pending_key")
      .on(t.orgId, sql`lower(${t.email})`)
      .where(sql`${t.acceptedAt} is null`),
    index("invitation_org_id_idx").on(t.orgId),
    index("invitation_invited_by_idx").on(t.invitedBy),
  ],
);
