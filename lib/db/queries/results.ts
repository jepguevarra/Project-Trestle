import { and, asc, count, eq, sql } from "drizzle-orm";
import type { Answer, ReportInput, Submission } from "@/lib/scoring";
import type { Tx } from "../rls";
import { client, dimension, engagement, instrument, orgBranding, organization, question, questionOption, reportNarrative, respondent, response, responseTheme } from "../schema";

// Loads `response` (never `response_draft`) and the instrument's structure into the plain arrays
// lib/scoring takes. Runs under the user's RLS like any other read.

export async function loadReportInput(tx: Tx, orgId: string, instrumentId: string, anonymous: boolean): Promise<ReportInput> {
  const inInstrument = <T extends { orgId: typeof dimension.orgId; instrumentId: typeof dimension.instrumentId }>(t: T) =>
    and(eq(t.orgId, orgId), eq(t.instrumentId, instrumentId));
  const [dims, qs, opts, rows] = await Promise.all([
    tx.select({ id: dimension.id, name: dimension.name, weight: dimension.weight }).from(dimension).where(inInstrument(dimension)).orderBy(asc(dimension.sortOrder)),
    tx
      .select({ id: question.id, text: question.text, type: question.type, dimensionId: question.dimensionId, weight: question.weight, reverse: question.isReverseScored })
      .from(question)
      .where(and(eq(question.orgId, orgId), eq(question.instrumentId, instrumentId)))
      .orderBy(asc(question.sortOrder), asc(question.createdAt)),
    tx
      .select({ id: questionOption.id, questionId: questionOption.questionId, value: questionOption.value })
      .from(questionOption)
      .where(and(eq(questionOption.orgId, orgId), eq(questionOption.instrumentId, instrumentId))),
    tx
      .select({
        submissionId: response.submissionId,
        questionId: response.questionId,
        optionId: response.optionId,
        valueNumeric: response.valueNumeric,
        department: response.department,
        roleTitle: response.roleTitle,
        seniority: response.seniority,
        durationSeconds: response.durationSeconds,
      })
      .from(response)
      .where(and(eq(response.orgId, orgId), eq(response.instrumentId, instrumentId))),
  ]);

  const submissions = new Map<string, Submission>();
  const answers: Answer[] = [];
  for (const r of rows) {
    if (!submissions.has(r.submissionId)) {
      submissions.set(r.submissionId, { id: r.submissionId, department: r.department, roleTitle: r.roleTitle, seniority: r.seniority, durationSeconds: r.durationSeconds });
    }
    answers.push({ submissionId: r.submissionId, questionId: r.questionId, optionId: r.optionId, valueNumeric: r.valueNumeric });
  }
  return {
    anonymous,
    dimensions: dims,
    questions: qs.map((q) => ({ ...q, options: opts.filter((o) => o.questionId === q.id).map(({ id, value }) => ({ id, value })) })),
    // Sorted by id (random), never by arrival, so list order says nothing about who submitted when.
    submissions: [...submissions.values()].sort((a, b) => a.id.localeCompare(b.id)),
    answers,
  };
}

/** Invited, answered and response rate per department, from the respondent list (who, not what). */
export async function completionByDepartment(tx: Tx, orgId: string, instrumentId: string) {
  const rows = await tx
    .select({
      department: respondent.department,
      total: count(),
      invited: sql<number>`count(${respondent.invitedAt})::int`,
      completed: sql<number>`count(${respondent.completedAt})::int`,
    })
    .from(respondent)
    .where(and(eq(respondent.orgId, orgId), eq(respondent.instrumentId, instrumentId)))
    .groupBy(respondent.department)
    .orderBy(respondent.department);
  return rows;
}

/** Open-text answers with their themes. Ordered by random id, and without segment attributes. */
export async function openTextAnswers(tx: Tx, orgId: string, instrumentId: string) {
  const [answers, themes] = await Promise.all([
    tx
      .select({ id: response.id, questionId: response.questionId, text: response.valueText })
      .from(response)
      .innerJoin(question, and(eq(question.id, response.questionId), eq(question.instrumentId, response.instrumentId)))
      .where(and(eq(response.orgId, orgId), eq(response.instrumentId, instrumentId), eq(question.type, "open_text")))
      .orderBy(asc(response.id)),
    tx
      .select({ id: responseTheme.id, responseId: responseTheme.responseId, theme: responseTheme.theme })
      .from(responseTheme)
      .where(and(eq(responseTheme.orgId, orgId), eq(responseTheme.instrumentId, instrumentId)))
      .orderBy(asc(responseTheme.theme)),
  ]);
  return answers.map((a) => ({ ...a, text: a.text ?? "", themes: themes.filter((t) => t.responseId === a.id) }));
}

export async function listNarratives(tx: Tx, orgId: string, instrumentId: string) {
  const rows = await tx
    .select({ key: reportNarrative.key, body: reportNarrative.body })
    .from(reportNarrative)
    .where(and(eq(reportNarrative.orgId, orgId), eq(reportNarrative.instrumentId, instrumentId)));
  return Object.fromEntries(rows.map((r) => [r.key, r.body])) as Partial<Record<(typeof rows)[number]["key"], string>>;
}

export async function findLogo(tx: Tx, orgId: string) {
  const [row] = await tx.select({ logo: orgBranding.logo, logoType: orgBranding.logoType }).from(orgBranding).where(eq(orgBranding.orgId, orgId));
  return row ?? null;
}

export async function hasLogo(tx: Tx, orgId: string) {
  const [row] = await tx.select({ n: count() }).from(orgBranding).where(eq(orgBranding.orgId, orgId));
  return (row?.n ?? 0) > 0;
}

/** An instrument by id alone, with what the report header needs. RLS decides whether the user may see it. */
export async function findInstrumentForReport(tx: Tx, instrumentId: string) {
  const [row] = await tx
    .select({
      instrument,
      engagementName: engagement.name,
      targetSystem: engagement.targetSystem,
      clientName: client.name,
      orgName: organization.name,
    })
    .from(instrument)
    .innerJoin(engagement, and(eq(engagement.id, instrument.engagementId), eq(engagement.orgId, instrument.orgId)))
    .innerJoin(client, and(eq(client.id, engagement.clientId), eq(client.orgId, engagement.orgId)))
    .innerJoin(organization, eq(organization.id, instrument.orgId))
    .where(eq(instrument.id, instrumentId));
  return row ?? null;
}
