import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// `pnpm db:migrate` — applies drizzle/ to DATABASE_URL (read from .env.local or the environment).
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const client = postgres(url, { max: 1, onnotice: () => {} });
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  await client.end();
  console.log("Migrations applied.");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
