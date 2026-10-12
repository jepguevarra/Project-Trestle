import { pgSchema, text, uuid } from "drizzle-orm/pg-core";

/**
 * Supabase's `auth.users`, declared only so foreign keys can reference it. Owned by Supabase:
 * excluded from generation by `schemaFilter` in drizzle.config.ts, never migrated by us.
 */
const auth = pgSchema("auth");

export const authUsers = auth.table("users", {
  id: uuid("id").primaryKey(),
  email: text("email"),
});
