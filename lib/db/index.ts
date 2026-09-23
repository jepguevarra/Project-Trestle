import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import { withRlsOn, type RlsClaims, type Tx } from "./rls";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { trestleSql?: ReturnType<typeof postgres> };

// One pool per server process; reused across hot reloads in development. `prepare: false` keeps
// it compatible with Supabase's transaction-mode pooler.
const client = globalForDb.trestleSql ?? postgres(env.DATABASE_URL, { prepare: false, max: 10 });
if (env.NODE_ENV !== "production") globalForDb.trestleSql = client;

/**
 * Owner connection: bypasses RLS. Do not import this for tenant data — use `withRls`. Its only
 * callers are migrations, the seed script, and code paths documented as needing it.
 */
export const dbOwner = drizzle(client, { schema });

/** Run tenant queries as the signed-in user, with RLS enforced by Postgres. */
export function withRls<T>(claims: RlsClaims, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return withRlsOn(dbOwner, claims, fn);
}

export type { Tx };
