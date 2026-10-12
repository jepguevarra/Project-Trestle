/** What a respondent is told when their link cannot be used. Plain sentences, never a stack trace. */
export const SURVEY_MESSAGES = {
  invalid: "This survey link is not valid. Check that you used the whole link from your email.",
  expired: "This survey link has expired.",
  revoked: "This link has been replaced. Use the link in the most recent email you received.",
  notYetOpen: "This survey is not open yet.",
  closed: "This survey has closed. Thank you for your interest.",
  submitted: "You have already submitted your answers. Thank you.",
  required: "Some required questions are unanswered.",
  badRequest: "Your answers could not be saved. Reload the page and try again.",
} as const;

export type SurveyMessageKey = keyof typeof SURVEY_MESSAGES;

/** The anonymity notice respondents see, in the live survey and in the preview alike. */
export function anonymityNotice(anonymous: boolean) {
  return anonymous
    ? "Your answers are anonymous: once you submit, they are stored without your name or email, and results are only shown for groups of five or more people."
    : "Your answers are linked to your name, so the team can follow up with you.";
}
