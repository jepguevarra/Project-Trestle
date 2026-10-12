import type { ScoreMatrix } from "./normalise";
import { dimensionScoresBySubmission } from "./readiness";
import { guard, type Guard } from "./segments";
import { mean } from "./stats";
import type { ScoredDimension, ScoredQuestion, Submission } from "./types";

export const LEADERSHIP = ["manager", "executive"] as const;
export const FRONTLINE = ["frontline", "supervisor"] as const;

export type GapRow = { id: string; name: string; leadership: number | null; frontline: number | null; gap: number | null };
export type GapResult = { leadership: Guard; frontline: Guard; rows: GapRow[] };

/**
 * The perception gap per dimension: the leadership mean (manager, executive) minus the frontline
 * mean (frontline, supervisor). Positive means leaders feel readier than the people doing the work.
 * Each side is its own group, so each must reach the minimum size.
 */
export function perceptionGap(dimensions: ScoredDimension[], questions: ScoredQuestion[], matrix: ScoreMatrix, submissions: Submission[]): GapResult {
  const lead = submissions.filter((s) => s.seniority !== null && (LEADERSHIP as readonly string[]).includes(s.seniority));
  const front = submissions.filter((s) => s.seniority !== null && (FRONTLINE as readonly string[]).includes(s.seniority));
  const leadership = guard(lead.length, "the leadership group (managers and executives)");
  const frontline = guard(front.length, "the frontline group (frontline staff and supervisors)");
  const show = !leadership.suppressed && !frontline.suppressed;

  const rows = dimensions.map((d) => {
    const l = show ? mean([...dimensionScoresBySubmission(d.id, questions, matrix, lead.map((s) => s.id)).values()]) : null;
    const f = show ? mean([...dimensionScoresBySubmission(d.id, questions, matrix, front.map((s) => s.id)).values()]) : null;
    return { id: d.id, name: d.name, leadership: l, frontline: f, gap: l !== null && f !== null ? l - f : null };
  });
  return { leadership, frontline, rows };
}
