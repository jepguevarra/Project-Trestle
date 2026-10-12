import type { Seniority } from "@/lib/views/respondent";
import type { Submission } from "./types";

/** CLAUDE.md security rule 5: no result is shown for fewer people than this. */
export const MIN_SEGMENT = 5;

export type SegmentFilter = { department?: string; roleTitle?: string; seniority?: Seniority };

export type Guard = { suppressed: true; reason: string; n: number } | { suppressed: false; n: number };

/**
 * Applies every active filter at once. Suppression is judged on this intersection, never on one
 * attribute: Finance alone may be twenty people and executives alone twelve, while Finance
 * executives are one person.
 */
export function applyFilter(submissions: Submission[], filter: SegmentFilter): Submission[] {
  return submissions.filter(
    (s) =>
      (filter.department === undefined || s.department === filter.department) &&
      (filter.roleTitle === undefined || s.roleTitle === filter.roleTitle) &&
      (filter.seniority === undefined || s.seniority === filter.seniority),
  );
}

export function isFiltered(filter: SegmentFilter) {
  return filter.department !== undefined || filter.roleTitle !== undefined || filter.seniority !== undefined;
}

/** Whether a group of `n` submissions may be shown, and if not, the sentence the UI shows instead. */
export function guard(n: number, what = "this group", min = MIN_SEGMENT): Guard {
  if (n >= min) return { suppressed: false, n };
  const reason =
    n === 0
      ? `No responses in ${what}.`
      : `Hidden to protect anonymity: ${what} has ${n} ${n === 1 ? "response" : "responses"}, and results are shown only for groups of ${min} or more.`;
  return { suppressed: true, reason, n };
}

/** The distinct values of one attribute, for the filter menus. Blank values are left out. */
export function segmentValues(submissions: Submission[], key: "department" | "roleTitle" | "seniority"): string[] {
  return [...new Set(submissions.map((s) => s[key]).filter((v): v is NonNullable<typeof v> => v !== null && v !== ""))].sort();
}
