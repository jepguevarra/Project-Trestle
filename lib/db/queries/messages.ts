import { and, desc, eq, sql } from "drizzle-orm";
import type { ResType } from "@/lib/views/registry";
import type { Tx } from "../rls";
import { recordMessage } from "../schema";

export type ChatterMessage = typeof recordMessage.$inferSelect & { authorEmail: string | null };

/** A record's chatter, newest first. RLS returns nothing when the record itself is not visible. */
export async function listRecordMessages(tx: Tx, orgId: string, resType: ResType, resId: string): Promise<ChatterMessage[]> {
  const rows = await tx
    .select({
      message: recordMessage,
      authorEmail: sql<string | null>`(select m.email from public.org_members(${orgId}) m where m.user_id = ${recordMessage.authorUserId})`,
    })
    .from(recordMessage)
    .where(and(eq(recordMessage.orgId, orgId), eq(recordMessage.resType, resType), eq(recordMessage.resId, resId)))
    .orderBy(desc(recordMessage.createdAt), desc(recordMessage.id))
    .limit(200);
  return rows.map((r) => ({ ...r.message, authorEmail: r.authorEmail }));
}
