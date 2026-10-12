import { and, asc, eq } from "drizzle-orm";
import type { Tx } from "../rls";
import { instrument, question, questionOption, respondent, responseDraft, section } from "../schema";

// Reads for the public survey route, run as the `trestle_survey` role (lib/db/survey.ts). Every
// select names its columns: the role is granted only the columns a respondent may see, and RLS
// limits rows to the respondent and instrument the verified link names.

/** The link's respondent and instrument, or null when they do not exist together. */
export async function loadSurveyLink(tx: Tx, link: { respondentId: string; instrumentId: string }) {
  const [r] = await tx
    .select({
      id: respondent.id,
      orgId: respondent.orgId,
      engagementId: respondent.engagementId,
      instrumentId: respondent.instrumentId,
      name: respondent.name,
      completedAt: respondent.completedAt,
      tokenVersion: respondent.tokenVersion,
    })
    .from(respondent)
    .where(and(eq(respondent.id, link.respondentId), eq(respondent.instrumentId, link.instrumentId)));
  if (!r) return null;
  const [i] = await tx
    .select({
      id: instrument.id,
      name: instrument.name,
      anonymity: instrument.anonymity,
      status: instrument.status,
      opensAt: instrument.opensAt,
      closesAt: instrument.closesAt,
      tokenEpoch: instrument.tokenEpoch,
    })
    .from(instrument)
    .where(eq(instrument.id, r.instrumentId));
  return i ? { respondent: r, instrument: i } : null;
}

export async function loadSurveyQuestions(tx: Tx, instrumentId: string) {
  const [secs, qs, opts] = await Promise.all([
    tx
      .select({ id: section.id, title: section.title, description: section.description })
      .from(section)
      .where(eq(section.instrumentId, instrumentId))
      .orderBy(asc(section.sortOrder), asc(section.id)),
    tx
      .select({
        id: question.id,
        sectionId: question.sectionId,
        text: question.text,
        helpText: question.helpText,
        type: question.type,
        required: question.isRequired,
      })
      .from(question)
      .where(eq(question.instrumentId, instrumentId))
      .orderBy(asc(question.sortOrder), asc(question.createdAt)),
    tx
      .select({ id: questionOption.id, questionId: questionOption.questionId, label: questionOption.label })
      .from(questionOption)
      .where(eq(questionOption.instrumentId, instrumentId))
      .orderBy(asc(questionOption.sortOrder)),
  ]);
  return secs.map((s) => ({
    ...s,
    questions: qs
      .filter((q) => q.sectionId === s.id)
      .map(({ sectionId: _, ...q }) => ({ ...q, options: opts.filter((o) => o.questionId === q.id).map(({ id, label }) => ({ id, label })) })),
  }));
}

export function loadDrafts(tx: Tx, respondentId: string) {
  return tx
    .select({
      questionId: responseDraft.questionId,
      valueNumeric: responseDraft.valueNumeric,
      valueText: responseDraft.valueText,
      optionIds: responseDraft.optionIds,
    })
    .from(responseDraft)
    .where(eq(responseDraft.respondentId, respondentId));
}
