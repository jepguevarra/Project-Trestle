import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { pgCode } from "@/lib/db/errors";
import { saveDrafts, submitSurvey } from "@/lib/db/mutations/survey";
import { loadDrafts, loadSurveyLink, loadSurveyQuestions } from "@/lib/db/queries/survey";
import { withSurveyRespondent } from "@/lib/db/survey";
import { draftsToRaw, MAX_TEXT, normaliseAnswers } from "@/lib/survey/answers";
import { SURVEY_MESSAGES, type SurveyMessageKey } from "@/lib/survey/messages";
import { surveyTokenKey } from "@/lib/tokens/survey-key";
import { staleReason, verifySurveyToken } from "@/lib/tokens/survey";

// The anonymous respondent path (DATA-MODEL.md §12). The only code in the product that acts for
// someone with no account:
//   1. verify the link's signature and expiry;
//   2. switch to the `trestle_survey` role for the respondent and instrument the link names, and
//      refuse a revoked link (versions), a closed survey, or a respondent who already submitted;
//   3. read only that instrument's questions and that respondent's own drafts;
//   4. write only that respondent's drafts (RLS refuses anything else);
//   5. submit through private.submit_survey(), the anonymity transaction.
// Nothing from the request body names a respondent or an instrument: both come from the link.

export const dynamic = "force-dynamic";

const STATUS: Record<SurveyMessageKey, number> = {
  invalid: 404,
  expired: 410,
  revoked: 410,
  notYetOpen: 403,
  closed: 410,
  submitted: 409,
  required: 422,
  badRequest: 400,
};

const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex" };
const fail = (key: SurveyMessageKey) => NextResponse.json({ error: SURVEY_MESSAGES[key], code: key }, { status: STATUS[key], headers });

const bodySchema = z.object({
  answers: z
    .record(z.uuid(), z.union([z.string().max(MAX_TEXT), z.array(z.uuid()).max(50)]))
    .refine((a) => Object.keys(a).length <= 500),
});

type Mode = "read" | "save" | "submit";
type Outcome = { error: SurveyMessageKey } | { data: unknown };

async function handle(token: string, mode: Mode, request?: NextRequest): Promise<NextResponse> {
  // 1. Signature and expiry, before touching the database.
  const verified = verifySurveyToken(token, surveyTokenKey());
  if (!verified.ok) return fail(verified.reason === "expired" ? "expired" : "invalid");
  const { claims } = verified;

  let body: z.infer<typeof bodySchema> | null = null;
  if (mode !== "read") {
    const parsed = bodySchema.safeParse(await request!.json().catch(() => null));
    if (!parsed.success) return fail("badRequest");
    body = parsed.data;
  }

  const link = { respondentId: claims.r, instrumentId: claims.i };
  try {
    const outcome = await withSurveyRespondent(link, async (tx): Promise<Outcome> => {
      // 2. The link must still be current, and the survey open.
      const found = await loadSurveyLink(tx, link);
      if (!found) return { error: "invalid" };
      const { respondent: r, instrument: i } = found;
      const stale = staleReason(claims, { instrumentId: i.id, tokenVersion: r.tokenVersion, tokenEpoch: i.tokenEpoch });
      if (stale) return { error: stale === "revoked" ? "revoked" : "invalid" };
      if (i.status === "draft") return { error: "invalid" };
      const now = new Date();
      if (i.opensAt && now < i.opensAt) return { error: "notYetOpen" };
      const closed = i.status === "closed" || (i.closesAt !== null && now > i.closesAt);

      if (mode === "read") {
        if (r.completedAt) return { data: { state: "submitted", title: i.name } };
        if (closed) return { error: "closed" };
        // 3. Only this instrument's questions and this respondent's drafts.
        const sections = await loadSurveyQuestions(tx, i.id);
        const questions = sections.flatMap((s) => s.questions);
        return {
          data: {
            state: "open",
            title: i.name,
            name: r.name,
            anonymous: i.anonymity === "anonymous",
            closesAt: i.closesAt,
            sections,
            answers: draftsToRaw(questions, await loadDrafts(tx, r.id)),
          },
        };
      }

      if (r.completedAt) return { error: "submitted" };
      if (closed) return { error: "closed" };

      // 4. Only this respondent's drafts, checked against this instrument's questions.
      const questions = (await loadSurveyQuestions(tx, i.id)).flatMap((s) => s.questions);
      const normalised = normaliseAnswers(questions, body!.answers);
      if (!normalised.ok) return { error: "badRequest" };
      await saveDrafts(tx, { orgId: r.orgId, engagementId: r.engagementId, instrumentId: i.id, respondentId: r.id }, normalised.answers, normalised.cleared);

      // 5. The anonymity transaction.
      if (mode === "submit") await submitSurvey(tx);
      return { data: { state: mode === "submit" ? "submitted" : "saved" } };
    });
    return "error" in outcome ? fail(outcome.error) : NextResponse.json(outcome.data, { headers });
  } catch (err) {
    // Raised by private.submit_survey or by RLS when the state changed under the request.
    switch (pgCode(err)) {
      case "TR404":
        return fail("invalid");
      case "TR410":
        return fail("closed");
      case "TR411":
        return fail("submitted");
      case "TR412":
        return fail("required");
      case "42501":
        return fail("closed");
      default:
        console.error("survey route", err);
        return NextResponse.json({ error: "Something went wrong. Try again in a moment." }, { status: 500, headers });
    }
  }
}

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  return handle((await params).token, "read");
}

/** Saves answers so far, so the respondent can leave and come back. */
export async function PUT(request: NextRequest, { params }: Params) {
  return handle((await params).token, "save", request);
}

/** Saves the last answers and submits. */
export async function POST(request: NextRequest, { params }: Params) {
  return handle((await params).token, "submit", request);
}
