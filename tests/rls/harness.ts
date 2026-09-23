import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import postgres from "postgres";
import { expect, inject } from "vitest";
import { withRlsOn, type Db, type Tx } from "@/lib/db/rls";
import { pgCode } from "@/lib/db/errors";
import * as schema from "@/lib/db/schema";

/**
 * The RLS test harness (phase 01, item 11). Every tenant-scoped table added in a later phase gets
 * an `expectCrossTenantDenied` test in the same commit as the table.
 */

export type Harness = { db: Db; end: () => Promise<void> };

/** Owner connection to this run's test database. Bypasses RLS: use it only to arrange and inspect. */
export function connect(): Harness {
  const client = postgres(inject("rlsDatabaseUrl"), { max: 4, onnotice: () => {} });
  return { db: drizzle(client, { schema }), end: () => client.end() };
}

let counter = 0;
/** A unique address per call, so test files never collide on emails or slugs. */
export function uniqueEmail(name: string): string {
  counter += 1;
  return `${name}.${process.pid}.${Date.now()}.${counter}@example.test`;
}

/**
 * Inserts a user the way Supabase Auth does. With `orgName`, the sign-up trigger creates their
 * organisation and owner membership.
 */
export async function createUser(db: Db, opts: { email?: string; orgName?: string } = {}) {
  const email = opts.email ?? uniqueEmail("user");
  const meta = opts.orgName ? { org_name: opts.orgName } : {};
  const rows = await db.execute<{ id: string }>(
    sql`insert into auth.users (email, raw_user_meta_data) values (${email}, ${JSON.stringify(meta)}::jsonb) returning id`,
  );
  const id = rows[0]?.id;
  if (!id) throw new Error("failed to create user");
  return { id, email };
}

/** Runs `fn` as the given user, through the same `withRlsOn` the app uses. */
export function asUser<T>(db: Db, user: { id: string; email?: string }, fn: (tx: Tx) => Promise<T>) {
  return withRlsOn(db, { sub: user.id, email: user.email ?? null }, fn);
}

export async function orgOf(db: Db, userId: string) {
  const [row] = await db
    .select({ org: schema.organization })
    .from(schema.membership)
    .innerJoin(schema.organization, eq(schema.organization.id, schema.membership.orgId))
    .where(eq(schema.membership.userId, userId));
  if (!row) throw new Error(`user ${userId} has no organisation`);
  return row.org;
}

/** Two orgs with an owner each: the fixture every isolation test starts from. */
export async function createTwoTenants(db: Db) {
  const userA = await createUser(db, { email: uniqueEmail("alice"), orgName: "Tenant A" });
  const userB = await createUser(db, { email: uniqueEmail("bob"), orgName: "Tenant B" });
  return { userA, userB, orgA: await orgOf(db, userA.id), orgB: await orgOf(db, userB.id) };
}

export async function expectPgError(promise: Promise<unknown>, code: string) {
  const err = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(err, `expected SQLSTATE ${code}, but the statement succeeded`).toBeDefined();
  expect(pgCode(err)).toBe(code);
}

/** SQLSTATE for "new row violates row-level security policy" and for a missing table grant. */
export const RLS_VIOLATION = "42501";

type TableWithId = PgTable & { id: PgColumn };

/**
 * Asserts that `actor` cannot select, insert, update or delete `targetId`, a row belonging to
 * another org. `insertRow` must be a complete row targeting that other org; `updateSet` is any
 * change. Updates and deletes blocked by RLS affect zero rows rather than erroring, so the row is
 * re-read with the owner connection to prove it is untouched.
 */
export async function expectCrossTenantDenied(
  db: Db,
  opts: {
    actor: { id: string };
    table: TableWithId;
    targetId: string;
    insertRow: Record<string, unknown>;
    updateSet: Record<string, unknown>;
  },
) {
  const { actor, table, targetId } = opts;
  const before = await db.select().from(table).where(eq(table.id, targetId));
  expect(before, "fixture row must exist").toHaveLength(1);

  const selected = await asUser(db, actor, (tx) => tx.select().from(table).where(eq(table.id, targetId)));
  expect(selected, "select must return nothing").toHaveLength(0);

  await expectPgError(
    asUser(db, actor, (tx) => tx.insert(table).values(opts.insertRow as never)),
    RLS_VIOLATION,
  );

  const updated = await asUser(db, actor, (tx) =>
    tx.update(table).set(opts.updateSet as never).where(eq(table.id, targetId)).returning(),
  );
  expect(updated, "update must affect nothing").toHaveLength(0);

  const deleted = await asUser(db, actor, (tx) => tx.delete(table).where(eq(table.id, targetId)).returning());
  expect(deleted, "delete must affect nothing").toHaveLength(0);

  const after = await db.select().from(table).where(eq(table.id, targetId));
  expect(after, "row must be unchanged").toEqual(before);
}
