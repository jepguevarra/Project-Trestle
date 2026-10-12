import { isScored, type ScoreMatrix } from "./normalise";
import { pearson, variance } from "./stats";
import { none, value, type ScoredDimension, type ScoredQuestion, type Value } from "./types";

/** The conventional threshold for acceptable internal consistency. Shown, never enforced. */
export const ALPHA_ACCEPTABLE = 0.7;
/** A corrected item-total correlation below this marks an item as weak. */
export const WEAK_ITEM_TOTAL = 0.3;

/**
 * Cronbach's alpha over complete rows (one row per submission, one column per item):
 * k / (k − 1) × (1 − Σ item variances / variance of row totals).
 */
export function cronbachAlpha(rows: number[][]): Value {
  const k = rows[0]?.length ?? 0;
  if (k < 2) return none("Alpha needs at least two questions in the dimension.");
  if (rows.length < 2) return none("Alpha needs at least two complete responses.");
  const itemVar = Array.from({ length: k }, (_, j) => variance(rows.map((r) => r[j]!))!);
  const totalVar = variance(rows.map((r) => r.reduce((a, b) => a + b, 0)))!;
  if (totalVar === 0) return none("Every response was identical, so consistency cannot be measured.");
  return value((k / (k - 1)) * (1 - itemVar.reduce((a, b) => a + b, 0) / totalVar));
}

export type ItemReliability = { id: string; text: string; itemTotal: Value; alphaIfDeleted: Value; weak: boolean };
export type DimensionReliability = { id: string; name: string; items: number; n: number; alpha: Value; itemRows: ItemReliability[] };

/**
 * Alpha for one dimension on the responses collected, with each item's corrected item-total
 * correlation (the item against the sum of the others) and the alpha the dimension would have
 * without it. Uses submissions that answered every scored item in the dimension (listwise), on the
 * 0–100 scores, so reverse-scored items count the right way round.
 */
export function dimensionReliability(d: ScoredDimension, questions: ScoredQuestion[], matrix: ScoreMatrix): DimensionReliability {
  const items = questions.filter((q) => q.dimensionId === d.id && isScored(q));
  const rows: number[][] = [];
  for (const scores of matrix.values()) {
    if (items.every((q) => scores.has(q.id))) rows.push(items.map((q) => scores.get(q.id)!));
  }
  const alpha = cronbachAlpha(rows);
  const itemRows = items.map((q, j) => {
    const rest = rows.map((r) => r.reduce((a, b, i) => (i === j ? a : a + b), 0));
    const r = items.length >= 2 ? pearson(rows.map((row) => row[j]!), rest) : null;
    const without = cronbachAlpha(rows.map((row) => row.filter((_, i) => i !== j)));
    const itemTotal = r === null ? none(items.length < 2 ? "Only one question." : "Too few complete responses, or no variation.") : value(r);
    const weak =
      (itemTotal.value !== null && itemTotal.value < WEAK_ITEM_TOTAL) ||
      (alpha.value !== null && without.value !== null && without.value > alpha.value);
    return { id: q.id, text: q.text, itemTotal, alphaIfDeleted: without, weak };
  });
  return { id: d.id, name: d.name, items: items.length, n: rows.length, alpha, itemRows };
}
