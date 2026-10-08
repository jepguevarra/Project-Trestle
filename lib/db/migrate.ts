import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { syncSystemTemplates } from "./system-templates";

// `pnpm db:migrate` — applies drizzle/ to DATABASE_URL (read from .env.local or the environment).
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const client = postgres(url, { max: 1, onnotice: () => {} });
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: "drizzle" });
  const added = await syncSystemTemplates(db);
  await client.end();
  console.log(`Migrations applied.${added ? ` ${added} shipped templates added.` : ""}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
