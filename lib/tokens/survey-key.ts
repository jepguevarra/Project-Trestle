import "server-only";
import { env } from "@/lib/env";
import { deriveSurveyKey } from "./survey";

/** The survey link signing key. Server-only; see SURVEY_TOKEN_SECRET in lib/validation/env.ts. */
export function surveyTokenKey(): string {
  return deriveSurveyKey(env.SURVEY_TOKEN_SECRET, env.DATABASE_URL);
}
