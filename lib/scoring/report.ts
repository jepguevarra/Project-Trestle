import { perceptionGap, type GapResult } from "./gap";
import { scoreMatrix } from "./normalise";
import { qualityFlags, type QualityFlag } from "./quality";
import { dimensionResult, itemResults, lowestItems, readinessIndex, type DimensionResult, type ItemResult } from "./readiness";
import { dimensionReliability, type DimensionReliability } from "./reliability";
import { applyFilter, guard, isFiltered, MIN_SEGMENT, segmentValues, type Guard, type SegmentFilter } from "./segments";
import type { Answer, ScoredDimension, ScoredQuestion, Submission, Value } from "./types";

export type ReportInput = {
  anonymous: boolean;
  dimensions: ScoredDimension[];
  questions: ScoredQuestion[];
  submissions: Submission[];
  answers: Answer[];
};

export type Scores = { index: Value; dimensions: DimensionResult[]; items: ItemResult[]; lowest: ItemResult[] };
export type Breakdown = { key: "department" | "roleTitle" | "seniority"; rows: { value: string; guard: Guard; index: Value | null }[] };

export type Report = {
  /** Whether the assessment as a whole may be shown. On an anonymous instrument it needs five submissions. */
  overall: Guard;
  /** The selected group (the whole assessment when no filter is set). */
  selection: Guard;
  scores: Scores | null;
  gap: GapResult | null;
  reliability: DimensionReliability[] | null;
  flags: QualityFlag[] | null;
  breakdowns: Breakdown[] | null;
  filterValues: { department: string[]; roleTitle: string[]; seniority: string[] };
};

function scoresFor(input: ReportInput, ids: string[]): Scores {
  const matrix = scoreMatrix(input.questions, input.answers);
  const dimensions = input.dimensions.map((d) => dimensionResult(d, input.questions, matrix, ids));
  const items = itemResults(input.questions, matrix, ids);
  return { index: readinessIndex(dimensions), dimensions, items, lowest: lowestItems(items) };
}

/**
 * Everything the results screen and the PDF show, from plain arrays.
 *
 * Anonymity: on an anonymous instrument nothing is shown until five people have submitted, because
 * the respondent list says who has; with one submission the "average" would be that person's answers.
 * A filtered view or a breakdown row is a group like any other: it needs five on every instrument,
 * judged on the intersection of the filters.
 */
export function buildReport(input: ReportInput, filter: SegmentFilter = {}): Report {
  const all = input.submissions;
  const overall = guard(all.length, "this assessment", input.anonymous ? MIN_SEGMENT : 1);
  const filterValues = {
    department: segmentValues(all, "department"),
    roleTitle: segmentValues(all, "roleTitle"),
    seniority: segmentValues(all, "seniority"),
  };
  if (overall.suppressed) {
    return { overall, selection: overall, scores: null, gap: null, reliability: null, flags: null, breakdowns: null, filterValues };
  }

  const selected = isFiltered(filter) ? applyFilter(all, filter) : all;
  const selection = isFiltered(filter) ? guard(selected.length, "the selected group") : overall;
  const scores = selection.suppressed ? null : scoresFor(input, selected.map((s) => s.id));

  const matrix = scoreMatrix(input.questions, input.answers);
  const breakdowns: Breakdown[] = (["department", "roleTitle", "seniority"] as const).map((key) => ({
    key,
    rows: filterValues[key].map((v) => {
      const group = all.filter((s) => s[key] === v);
      const g = guard(group.length, `this group`);
      return { value: v, guard: g, index: g.suppressed ? null : scoresFor(input, group.map((s) => s.id)).index };
    }),
  }));

  return {
    overall,
    selection,
    scores,
    gap: perceptionGap(input.dimensions, input.questions, matrix, all),
    reliability: input.dimensions.map((d) => dimensionReliability(d, input.questions, matrix)),
    flags: qualityFlags(all, input.questions, input.answers),
    breakdowns,
    filterValues,
  };
}
