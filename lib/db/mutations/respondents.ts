import { and, eq, inArray } from "drizzle-orm";
import type { Tx } from "../rls";
import { respondent } from "../schema";
import type { Seniority } from "@/lib/views/respondent";

type Scope = { orgId: string; engagementId: string; instrumentId: string };
export type RespondentFields = {
  name: string | null;
  email: string;
  department: string | null;
  roleTitle: string | null;
  seniority: Seniority | null;
};

export function insertRespondents(tx: Tx, scope: Scope, rows: RespondentFields[]) {
  if (!rows.length) return Promise.resolve([]);
  return tx
    .insert(respondent)
    .values(rows.map((r) => ({ ...scope, ...r })))
    .returning({ id: respondent.id });
}

/** A changed email address revokes the old link (database trigger bumps token_version). */
export async function updateRespondent(tx: Tx, scope: Scope, respondentId: string, fields: RespondentFields) {
  const [row] = await tx
    .update(respondent)
    .set(fields)
    .where(and(eq(respondent.orgId, scope.orgId), eq(respondent.instrumentId, scope.instrumentId), eq(respondent.id, respondentId)))
    .returning({ id: respondent.id });
  return row ?? null;
}

/** Refused by RLS once they have submitted; returns how many were deleted. */
export async function deleteRespondent(tx: Tx, scope: Scope, respondentId: string) {
  const rows = await tx
    .delete(respondent)
    .where(and(eq(respondent.orgId, scope.orgId), eq(respondent.instrumentId, scope.instrumentId), eq(respondent.id, respondentId)))
    .returning({ id: respondent.id });
  return rows.length;
}

export function markSent(tx: Tx, scope: Scope, ids: string[], kind: "invited" | "reminded", at: Date) {
  if (!ids.length) return Promise.resolve();
  return tx
    .update(respondent)
    .set(kind === "invited" ? { invitedAt: at } : { remindedAt: at })
    .where(and(eq(respondent.orgId, scope.orgId), eq(respondent.instrumentId, scope.instrumentId), inArray(respondent.id, ids)))
    .then(() => undefined);
}
