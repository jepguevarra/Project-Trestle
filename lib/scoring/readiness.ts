import { isScored, type ScoreMatrix } from "./normalise";
import { mean, sd, weightedMean } from "./stats";
import { none, value, type ScoredDimension, type ScoredQuestion, type Value } from "./types";

/**
 * One submission's score on one dimension: the weighted mean of the dimension's questions it
 * answered. An unanswered question drops out of both the sum and the weights, so it changes the
 * denominator, never the numerator.
 */
export function submissionDimensionScore(dimensionId: string, questions: ScoredQuestion[], scores: Map<string, number>): number | null {
  return weightedMean(
    questions
      .filter((q) => q.dimensionId === dimensionId && isScored(q) && scores.has(q.id))
      .map((q) => ({ value: scores.get(q.id)!, weight: q.weight })),
  );
}

/** Each submission's dimension score, for the submissions that answered at least one of its questions. */
export function dimensionScoresBySubmission(dimensionId: string, questions: ScoredQuestion[], matrix: ScoreMatrix, submissionIds: Iterable<string>) {
  const out = new Map<string, number>();
  for (const id of submissionIds) {
    const s = submissionDimensionScore(dimensionId, questions, matrix.get(id) ?? new Map());
    if (s !== null) out.set(id, s);
  }
  return out;
}

export type DimensionResult = { id: string; name: string; weight: number; n: number; mean: Value; sd: Value };

/**
 * A dimension's score: the mean of its submissions' dimension scores, with the standard deviation of
 * the same scores beside it (consensus: a 60 everyone agrees on and a 60 from a split room are
 * different findings).
 */
export function dimensionResult(d: ScoredDimension, questions: ScoredQuestion[], matrix: ScoreMatrix, submissionIds: Iterable<string>): DimensionResult {
  const scores = [...dimensionScoresBySubmission(d.id, questions, matrix, submissionIds).values()];
  const m = mean(scores);
  const s = sd(scores);
  return {
    id: d.id,
    name: d.name,
    weight: d.weight,
    n: scores.length,
    mean: m === null ? none("No answers yet.") : value(m),
    sd: s === null ? none(scores.length === 1 ? "One response: there is no spread to show." : "No answers yet.") : value(s),
  };
}

/** The readiness index: the weighted mean of the dimension scores that have one. */
export function readinessIndex(dimensions: DimensionResult[]): Value {
  const m = weightedMean(dimensions.flatMap((d) => (d.mean.value === null ? [] : [{ value: d.mean.value, weight: d.weight }])));
  return m === null ? none("No answers yet.") : value(m);
}

export type ItemResult = { id: string; text: string; dimensionId: string; reverse: boolean; n: number; mean: Value; sd: Value };

/** Per question: mean and spread of its 0–100 scores, over the submissions that answered it. */
export function itemResults(questions: ScoredQuestion[], matrix: ScoreMatrix, submissionIds: Iterable<string>): ItemResult[] {
  const ids = [...submissionIds];
  return questions.filter(isScored).map((q) => {
    const scores = ids.flatMap((id) => {
      const s = matrix.get(id)?.get(q.id);
      return s === undefined ? [] : [s];
    });
    const m = mean(scores);
    const s = sd(scores);
    return {
      id: q.id,
      text: q.text,
      dimensionId: q.dimensionId!,
      reverse: q.reverse,
      n: scores.length,
      mean: m === null ? none("No answers yet.") : value(m),
      sd: s === null ? none("Too few answers.") : value(s),
    };
  });
}

/** The lowest-scoring questions, worst first. Questions without a score are left out. */
export function lowestItems(items: ItemResult[], count = 5): ItemResult[] {
  return items
    .filter((i) => i.mean.value !== null)
    .sort((a, b) => a.mean.value! - b.mean.value! || a.text.localeCompare(b.text))
    .slice(0, count);
}
