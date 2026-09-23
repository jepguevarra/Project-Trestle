import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    rlsDatabaseUrl: string;
  }
}

/**
 * Creates a fresh database for this run on TEST_DATABASE_URL's server, applies the Supabase shim
 * and every migration, and drops it afterwards.
 */
export default async function setup(project: TestProject) {
  const serverUrl = process.env.TEST_DATABASE_URL;
  if (!serverUrl) {
    throw new Error(
      "TEST_DATABASE_URL is not set. The RLS suite never skips.\n" +
        "Run `pnpm db:test:start` and export the URL it prints, or point it at `supabase start`'s database.",
    );
  }

  const dbName = `trestle_rls_${process.pid}_${Date.now()}`;
  const admin = postgres(serverUrl, { max: 1, onnotice: () => {} });
  await admin.unsafe(`create database ${dbName}`);

  const url = new URL(serverUrl);
  url.pathname = `/${dbName}`;
  const testUrl = url.toString();

  const client = postgres(testUrl, { max: 1, onnotice: () => {} });
  await client.unsafe(readFileSync(new URL("./supabase-shim.sql", import.meta.url), "utf8"));
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  await client.end();

  project.provide("rlsDatabaseUrl", testUrl);

  return async () => {
    await admin.unsafe(`drop database if exists ${dbName} with (force)`);
    await admin.end();
  };
}
