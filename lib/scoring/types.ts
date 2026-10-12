import type { QuestionType } from "@/lib/instruments/question-types";
import type { Seniority } from "@/lib/views/respondent";

// Plain inputs for lib/scoring. Nothing here touches the database: callers load rows and pass them in,
// so every number on the dashboard can be reproduced by hand from the same arrays.

export type ScoredDimension = { id: string; name: string; weight: number };

export type ScoredQuestion = {
  id: string;
  text: string;
  type: QuestionType;
  dimensionId: string | null;
  weight: number;
  reverse: boolean;
  /** Choice questions only: each option's score. */
  options: { id: string; value: number }[];
};

/** One `response` row. Choice questions have one row per selected option. */
export type Answer = { submissionId: string; questionId: string; optionId: string | null; valueNumeric: number | null };

/** One person's submission. On an anonymous instrument it carries no identity at all. */
export type Submission = {
  id: string;
  department: string | null;
  roleTitle: string | null;
  seniority: Seniority | null;
  durationSeconds: number | null;
};

/** A number, or the reason there is none. Never a silent null and never a zero standing in for "unknown". */
export type Value = { value: number; reason?: undefined } | { value: null; reason: string };

export const value = (v: number): Value => ({ value: v });
export const none = (reason: string): Value => ({ value: null, reason });
