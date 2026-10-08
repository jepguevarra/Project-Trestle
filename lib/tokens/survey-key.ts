import "server-only";
import { createHash } from "node:crypto";
import { env } from "@/lib/env";

/** The survey link signing key. Server-only; see SURVEY_TOKEN_SECRET in lib/validation/env.ts. */
export function surveyTokenKey(): string {
  return env.SURVEY_TOKEN_SECRET ?? createHash("sha256").update(`trestle-survey-token:${env.DATABASE_URL}`).digest("base64url");
}
