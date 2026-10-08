import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { READINESS_TEMPLATES, TEMPLATE_VERSION } from "@/lib/instruments/readiness-templates";
import { instrumentTemplate } from "./schema";

/**
 * Makes sure every template Trestle ships exists in the database at the current version. Runs after
 * migrations (owner connection). Never edits an existing version: changed wording means a new
 * TEMPLATE_VERSION, and instruments already created keep the copy they were made from.
 */
export async function syncSystemTemplates(db: PostgresJsDatabase<Record<string, unknown>>) {
  let added = 0;
  for (const t of READINESS_TEMPLATES) {
    const [existing] = await db
      .select({ id: instrumentTemplate.id })
      .from(instrumentTemplate)
      .where(and(isNull(instrumentTemplate.orgId), eq(instrumentTemplate.name, t.name), eq(instrumentTemplate.version, TEMPLATE_VERSION)));
    if (existing) continue;
    await db.insert(instrumentTemplate).values({
      orgId: null,
      isSystem: true,
      name: t.name,
      kind: "readiness",
      engagementType: t.engagementType,
      version: TEMPLATE_VERSION,
      definition: t.definition,
    });
    added += 1;
  }
  return added;
}
