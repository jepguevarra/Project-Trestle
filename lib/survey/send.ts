import "server-only";
import type { EngagementContext } from "@/lib/auth/engagement";
import type { Tx } from "@/lib/db";
import { logNote } from "@/lib/db/mutations/messages";
import { markSent } from "@/lib/db/mutations/respondents";
import type { Instrument } from "@/lib/db/queries/instruments";
import { respondentsToInvite, respondentsToRemind } from "@/lib/db/queries/respondents";
import { sendEmail } from "@/lib/email";
import { surveyEmail } from "@/lib/email/survey";
import { env } from "@/lib/env";
import { surveyTokenKey } from "@/lib/tokens/survey-key";
import { mintSurveyToken, surveyTokenExpiry } from "@/lib/tokens/survey";

/** A respondent's personal link at the instrument's current link version. */
export function surveyUrl(inst: Pick<Instrument, "id" | "tokenEpoch" | "closesAt">, r: { id: string; tokenVersion: number }) {
  const token = mintSurveyToken({ r: r.id, i: inst.id, v: r.tokenVersion, e: inst.tokenEpoch, exp: surveyTokenExpiry(inst.closesAt) }, surveyTokenKey());
  return `${env.APP_URL}/survey/${token}`;
}

/**
 * Invitations go to everyone not yet invited; reminders to everyone invited who has not answered
 * (read from respondent.completed_at, so they work on anonymous instruments too). Sent inside the
 * caller's transaction: if delivery fails, nothing is marked as sent.
 */
export async function sendSurveyEmails(ctx: EngagementContext & { tx: Tx }, inst: Instrument, kind: "invitation" | "reminder") {
  const scope = { orgId: ctx.org.id, engagementId: ctx.engagement.id, instrumentId: inst.id };
  const people = kind === "invitation" ? await respondentsToInvite(ctx.tx, ctx.org.id, inst.id) : await respondentsToRemind(ctx.tx, ctx.org.id, inst.id);
  for (const r of people) {
    await sendEmail(
      surveyEmail({
        kind,
        to: r.email,
        name: r.name,
        firmName: ctx.org.name,
        clientName: ctx.clientName,
        targetSystem: ctx.engagement.targetSystem,
        surveyName: inst.name,
        anonymous: inst.anonymity === "anonymous",
        closesAt: inst.closesAt,
        url: surveyUrl(inst, r),
      }),
    );
  }
  await markSent(ctx.tx, scope, people.map((p) => p.id), kind === "invitation" ? "invited" : "reminded", new Date());
  if (people.length) {
    const n = people.length;
    await logNote(
      ctx.tx,
      { orgId: ctx.org.id, engagementId: ctx.engagement.id, resType: "instrument", resId: inst.id, authorUserId: ctx.user.id },
      `${kind === "invitation" ? "Invitations" : "Reminders"} sent to ${n} ${n === 1 ? "person" : "people"}.`,
    );
  }
  return people.length;
}
