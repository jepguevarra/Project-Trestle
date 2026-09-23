import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { membership, organization } from "./schema";
import * as schema from "./schema";

config({ path: [".env.local", ".env"], quiet: true });

/**
 * `pnpm db:seed` — two orgs and three users, so a fresh clone is usable in one command.
 *
 * Users are created through Supabase Auth's normal sign-up (anon key), so the real sign-up trigger
 * creates each owner's org. Cross-org memberships are then added with the owner connection. Safe
 * to re-run. Needs the Supabase stack (`supabase start`) and `pnpm db:migrate` first.
 */

const PASSWORD = "trestle-dev-password";

const USERS = [
  { email: "alice@acme.test", orgName: "Acme Consulting" },
  { email: "bob@beacon.test", orgName: "Beacon Partners" },
  { email: "carol@freelance.test", orgName: undefined },
] as const;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const dbUrl = process.env.DATABASE_URL;
  if (!url || !anonKey || !dbUrl) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and DATABASE_URL.");

  const client = postgres(dbUrl, { max: 1, onnotice: () => {} });
  const db = drizzle(client, { schema });

  const ids: Record<string, string> = {};
  for (const u of USERS) {
    const existing = await db.execute<{ id: string }>(sql`select id from auth.users where email = ${u.email}`);
    if (existing[0]) {
      ids[u.email] = existing[0].id;
      continue;
    }
    // A fresh client per user so no session carries over between sign-ups.
    const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data, error } = await supabase.auth.signUp({
      email: u.email,
      password: PASSWORD,
      options: { data: u.orgName ? { org_name: u.orgName } : {} },
    });
    if (error || !data.user) throw new Error(`sign-up failed for ${u.email}: ${error?.message ?? "no user"}`);
    ids[u.email] = data.user.id;
  }

  const orgByName = async (name: string) => {
    const [org] = await db.select().from(organization).where(eq(organization.name, name)).limit(1);
    if (!org) throw new Error(`org ${name} missing — did the sign-up trigger run? Run pnpm db:migrate first.`);
    return org;
  };
  const acme = await orgByName("Acme Consulting");
  const beacon = await orgByName("Beacon Partners");

  // Carol consults for Acme and has read access at Beacon, so the org switcher has two entries.
  for (const [orgId, role] of [
    [acme.id, "consultant"],
    [beacon.id, "viewer"],
  ] as const) {
    const userId = ids["carol@freelance.test"]!;
    const [m] = await db
      .select()
      .from(membership)
      .where(and(eq(membership.orgId, orgId), eq(membership.userId, userId)));
    if (!m) await db.insert(membership).values({ orgId, userId, role });
  }

  await client.end();
  console.log(`Seeded. Sign in with any of these, password "${PASSWORD}":`);
  console.log(`  alice@acme.test       owner of ${acme.name} (/${acme.slug})`);
  console.log(`  bob@beacon.test       owner of ${beacon.name} (/${beacon.slug})`);
  console.log(`  carol@freelance.test  consultant at ${acme.name}, viewer at ${beacon.name}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
