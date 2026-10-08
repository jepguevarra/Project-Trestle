import type { TrackingEntry } from "../schema/messages";
import { resTypeSchema, type ResType } from "@/lib/views/registry";
import type { Tx } from "../rls";
import { recordMessage } from "../schema";

type Target = { orgId: string; engagementId: string | null; resType: ResType; resId: string; authorUserId: string };

export async function logNote(tx: Tx, target: Target, body: string) {
  await tx.insert(recordMessage).values({ ...target, resType: resTypeSchema.parse(target.resType), kind: "note", body });
}

/** One tracking message per write, listing every tracked field that changed. No-op if none did. */
export async function logTracking(tx: Tx, target: Target, entries: TrackingEntry[]) {
  if (!entries.length) return;
  await tx.insert(recordMessage).values({ ...target, resType: resTypeSchema.parse(target.resType), kind: "tracking", tracking: entries });
}
