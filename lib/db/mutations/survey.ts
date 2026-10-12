import { and, eq, inArray, sql } from "drizzle-orm";
import type { DraftAnswer } from "@/lib/survey/answers";
import type { Tx } from "../rls";
import { responseDraft } from "../schema";

// Writes for the public survey route, run as the `trestle_survey` role. RLS refuses any row that
// is not the link's own respondent and instrument, and any write once the survey has closed or
// the respondent has submitted.

type Link = { orgId: string; engagementId: string; instrumentId: string; respondentId: string };

/** Upserts the given answers and deletes the ones the respondent cleared. */
export async function saveDrafts(tx: Tx, link: Link, answers: DraftAnswer[], cleared: string[]) {
  if (answers.length) {
    await tx
      .insert(responseDraft)
      .values(answers.map((a) => ({ ...link, ...a })))
      .onConflictDoUpdate({
        target: [responseDraft.respondentId, responseDraft.questionId],
        set: {
          valueNumeric: sql`excluded.value_numeric`,
          valueText: sql`excluded.value_text`,
          optionIds: sql`excluded.option_ids`,
        },
      });
  }
  if (cleared.length) {
    await tx
      .delete(responseDraft)
      .where(and(eq(responseDraft.respondentId, link.respondentId), inArray(responseDraft.questionId, cleared)));
  }
}

/** The anonymity transaction lives in the database (private.submit_survey, drizzle/0004). */
export async function submitSurvey(tx: Tx) {
  await tx.execute(sql`select private.submit_survey()`);
}
