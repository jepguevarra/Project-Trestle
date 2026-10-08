// Question types and their labels. No Zod here: Client Components import this.

export const QUESTION_TYPES = ["likert_5", "likert_7", "single_choice", "multi_choice", "open_text", "numeric"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  likert_5: "Agreement, 5 points",
  likert_7: "Agreement, 7 points",
  single_choice: "Single choice",
  multi_choice: "Multiple choice",
  open_text: "Open text",
  numeric: "Number",
};

/** Types that score into a dimension and therefore must name one. */
export const SCORED_TYPES: readonly QuestionType[] = ["likert_5", "likert_7", "single_choice", "multi_choice"];
export const CHOICE_TYPES: readonly QuestionType[] = ["single_choice", "multi_choice"];
