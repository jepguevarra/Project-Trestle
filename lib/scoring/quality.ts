import type { Answer, ScoredQuestion, Submission } from "./types";

/** DATA-MODEL.md §4: completing in under this many seconds is flagged. */
export const SPEEDING_SECONDS = 90;
/** Straight-lining is judged only when a submission answered at least this many agreement questions. */
export const STRAIGHT_LINE_MIN_ITEMS = 5;

export type QualityFlag = { submissionId: string; reasons: string[] };

/**
 * Advisory flags. The consultant decides what to do with them; nothing is excluded automatically.
 *
 * - Straight-lining: the same raw answer to every agreement question, reverse-worded ones included,
 *   which means the person agreed with opposite statements.
 * - Speeding: submitted in under 90 seconds from the first saved answer.
 */
export function qualityFlags(submissions: Submission[], questions: ScoredQuestion[], answers: Answer[]): QualityFlag[] {
  const likert = new Set(questions.filter((q) => q.type === "likert_5" || q.type === "likert_7").map((q) => q.id));
  const raw = new Map<string, number[]>();
  for (const a of answers) {
    if (likert.has(a.questionId) && a.valueNumeric !== null) raw.set(a.submissionId, [...(raw.get(a.submissionId) ?? []), a.valueNumeric]);
  }
  return submissions.flatMap((s) => {
    const reasons: string[] = [];
    const values = raw.get(s.id) ?? [];
    if (values.length >= STRAIGHT_LINE_MIN_ITEMS && values.every((v) => v === values[0])) {
      reasons.push(`Gave the same answer to all ${values.length} agreement questions, including the reverse-worded ones.`);
    }
    if (s.durationSeconds !== null && s.durationSeconds < SPEEDING_SECONDS) {
      reasons.push(`Finished in ${s.durationSeconds} seconds (under ${SPEEDING_SECONDS}).`);
    }
    return reasons.length ? [{ submissionId: s.id, reasons }] : [];
  });
}
