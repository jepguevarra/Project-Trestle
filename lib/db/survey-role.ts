import { sql } from "drizzle-orm";
import type { Db, Tx } from "./rls";

/**
 * Runs `fn` as the `trestle_survey` role with the link's respondent and instrument as
 * transaction-local settings, which that role's policies read. Free of env and `server-only` so
 * the RLS suite exercises the same path as the route.
 */
export function withSurveyOn<T>(db: Db, link: { respondentId: string; instrumentId: string }, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('trestle.respondent_id', ${link.respondentId}, true), set_config('trestle.instrument_id', ${link.instrumentId}, true)`);
    await tx.execute(sql`set local role trestle_survey`);
    return fn(tx);
  });
}
