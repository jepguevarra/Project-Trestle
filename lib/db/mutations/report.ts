import { and, eq } from "drizzle-orm";
import type { NarrativeKey } from "../schema/report";
import type { Tx } from "../rls";
import { orgBranding, reportNarrative, responseTheme } from "../schema";

type Scope = { orgId: string; engagementId: string; instrumentId: string };

/** Saves one narrative block; an empty body removes it. */
export async function saveNarrative(tx: Tx, scope: Scope, key: NarrativeKey, body: string) {
  if (!body.trim()) {
    await tx.delete(reportNarrative).where(and(eq(reportNarrative.instrumentId, scope.instrumentId), eq(reportNarrative.key, key)));
    return;
  }
  await tx
    .insert(reportNarrative)
    .values({ ...scope, key, body })
    .onConflictDoUpdate({ target: [reportNarrative.instrumentId, reportNarrative.key], set: { body } });
}

export function addTheme(tx: Tx, scope: Scope, responseId: string, theme: string) {
  return tx.insert(responseTheme).values({ ...scope, responseId, theme }).onConflictDoNothing();
}

export function removeTheme(tx: Tx, scope: Scope, themeId: string) {
  return tx
    .delete(responseTheme)
    .where(and(eq(responseTheme.orgId, scope.orgId), eq(responseTheme.instrumentId, scope.instrumentId), eq(responseTheme.id, themeId)));
}

export function saveLogo(tx: Tx, orgId: string, logo: Buffer, logoType: "image/png" | "image/jpeg") {
  return tx.insert(orgBranding).values({ orgId, logo, logoType }).onConflictDoUpdate({ target: orgBranding.orgId, set: { logo, logoType } });
}

export function removeLogo(tx: Tx, orgId: string) {
  return tx.delete(orgBranding).where(eq(orgBranding.orgId, orgId));
}
