import "server-only";
import { dbOwner } from "./index";
import { withSurveyOn } from "./survey-role";
import type { Tx } from "./rls";

/**
 * The public survey route's only way into the database: a transaction as the `trestle_survey` role
 * for the respondent and instrument a verified link names. Call it only after the link's signature
 * has been checked. See drizzle/0004 for what the role can and cannot see.
 */
export function withSurveyRespondent<T>(link: { respondentId: string; instrumentId: string }, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return withSurveyOn(dbOwner, link, fn);
}

