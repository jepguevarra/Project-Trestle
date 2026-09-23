import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** The claims Postgres sees as `request.jwt.claims`, mirroring a Supabase access token. */
export type RlsClaims = { sub: string; email?: string | null };

/**
 * Runs `fn` in a transaction as Supabase's `authenticated` role with the user's JWT claims set, so
 * every query inside is filtered by RLS exactly as a Data API request would be.
 *
 * Drizzle connects as the database owner, which bypasses RLS. Every app query about tenant data
 * therefore goes through this. It is kept free of env and `server-only` so the RLS test suite
 * exercises the same code path the app does.
 */
export async function withRlsOn<T>(db: Db, claims: RlsClaims, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const jwt = JSON.stringify({ ...claims, role: "authenticated" });
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('request.jwt.claims', ${jwt}, true)`);
    await tx.execute(sql`set local role authenticated`);
    return fn(tx);
  });
}
