import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RespondentForm, type RespondentSection } from "@/components/survey/respondent-form";
import { requireEngagementAccess } from "@/lib/auth/engagement";
import { claimsFor } from "@/lib/auth/session";
import { withRls } from "@/lib/db";
import { findInstrument, getInstrumentTree } from "@/lib/db/queries/instruments";

export const metadata: Metadata = { title: "Preview" };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The real respondent component, with no token: what a respondent will see, and nothing is saved. */
export default async function PreviewPage({ params }: { params: Promise<{ orgSlug: string; id: string; instrumentId: string }> }) {
  const { orgSlug, id, instrumentId } = await params;
  const { org, user, engagement } = await requireEngagementAccess(orgSlug, id);
  if (!uuid.test(instrumentId)) notFound();
  const data = await withRls(claimsFor(user), async (tx) => {
    const row = await findInstrument(tx, org.id, engagement.id, instrumentId);
    return row ? { inst: row.instrument, tree: await getInstrumentTree(tx, org.id, instrumentId) } : null;
  });
  if (!data) notFound();

  // Strip everything a respondent must not see before it reaches the client component.
  const sections: RespondentSection[] = data.tree.sections.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    questions: s.questions.map((q) => ({
      id: q.id,
      text: q.text,
      helpText: q.helpText,
      type: q.type,
      required: q.isRequired,
      options: q.options.map((o) => ({ id: o.id, label: o.label })),
    })),
  }));
  const back = `/${org.slug}/engagements/${engagement.id}/readiness/${data.inst.id}`;

  return (
    <div className="grid gap-4">
      <p role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border bg-muted px-3 py-2 text-sm">
        <span>Preview. This is what respondents will see. Nothing you enter is saved.</span>
        <Link href={back as never} className="text-primary underline-offset-4 hover:underline">
          Back to the assessment
        </Link>
      </p>
      <div className="mx-auto w-full max-w-2xl rounded-md border border-border bg-card p-4 sm:p-6">
        <RespondentForm
          mode="preview"
          title={data.inst.name}
          intro={
            data.inst.anonymity === "anonymous"
              ? "Your answers are anonymous. Results are only shown for groups of five or more people."
              : "Your answers are linked to your name, so the team can follow up with you."
          }
          sections={sections}
        />
      </div>
    </div>
  );
}
