import { mean } from "./stats";
import type { Answer, ScoredQuestion } from "./types";

/** Agreement scales: 1 → 0 and the top of the scale → 100. */
const LIKERT_POINTS = { likert_5: 5, likert_7: 7 } as const;

/** A question counts towards a dimension only if it has one and a type that can be scored. */
export function isScored(q: ScoredQuestion): boolean {
  return q.dimensionId !== null && q.type !== "open_text" && q.type !== "numeric";
}

/**
 * One submission's answer to one question, on 0–100, reverse-scoring applied. Null when the question
 * was not answered or cannot be scored: unanswered is excluded, never zeroed.
 *
 * - Agreement scales: (v − 1) / (points − 1) × 100.
 * - Choice questions: each option's score placed between the question's lowest and highest option
 *   score; multiple choice averages the selected options. A question whose options all carry the
 *   same score cannot be scored.
 */
export function itemScore(q: ScoredQuestion, rows: Answer[]): number | null {
  if (!isScored(q) || !rows.length) return null;
  let s: number | null = null;
  if (q.type === "likert_5" || q.type === "likert_7") {
    const points = LIKERT_POINTS[q.type];
    const v = rows[0]!.valueNumeric;
    if (v === null || !Number.isInteger(v) || v < 1 || v > points) return null;
    s = ((v - 1) / (points - 1)) * 100;
  } else {
    const values = q.options.map((o) => o.value);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    if (!values.length || hi === lo) return null;
    const picked = rows.map((r) => q.options.find((o) => o.id === r.optionId)).filter((o) => o !== undefined);
    const m = mean(picked.map((o) => ((o.value - lo) / (hi - lo)) * 100));
    if (m === null) return null;
    s = q.type === "single_choice" ? (picked.length === 1 ? m : null) : m;
  }
  return s === null ? null : q.reverse ? 100 - s : s;
}

/** Every submission's scored answers: submission id → question id → 0–100. */
export type ScoreMatrix = Map<string, Map<string, number>>;

export function scoreMatrix(questions: ScoredQuestion[], answers: Answer[]): ScoreMatrix {
  const byQuestion = new Map(questions.map((q) => [q.id, q]));
  const grouped = new Map<string, Map<string, Answer[]>>();
  for (const a of answers) {
    if (!byQuestion.has(a.questionId)) continue;
    const sub = grouped.get(a.submissionId) ?? new Map<string, Answer[]>();
    sub.set(a.questionId, [...(sub.get(a.questionId) ?? []), a]);
    grouped.set(a.submissionId, sub);
  }
  const matrix: ScoreMatrix = new Map();
  for (const [submissionId, perQuestion] of grouped) {
    const scores = new Map<string, number>();
    for (const [questionId, rows] of perQuestion) {
      const s = itemScore(byQuestion.get(questionId)!, rows);
      if (s !== null) scores.set(questionId, s);
    }
    matrix.set(submissionId, scores);
  }
  return matrix;
}
