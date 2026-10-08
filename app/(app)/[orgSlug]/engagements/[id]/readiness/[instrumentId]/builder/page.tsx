import { createHash } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InstrumentBuilder } from "@/components/instruments/builder";
import { buttonVariants } from "@/components/ui/button";
import { requireEngagementAccess } from "@/lib/auth/engagement";
import { claimsFor } from "@/lib/auth/session";
import { withRls } from "@/lib/db";
import { findInstrument, getInstrumentTree } from "@/lib/db/queries/instruments";
import { deleteChildAction, reorderAction, saveDimensionAction, saveQuestionAction, saveSectionAction } from "../actions";

export const metadata: Metadata = { title: "Questions" };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The builder page. Read-only once the instrument opens, or for anyone without edit access. */
export default async function BuilderPage({ params }: { params: Promise<{ orgSlug: string; id: string; instrumentId: string }> }) {
  const { orgSlug, id, instrumentId } = await params;
  const { org, user, engagement, canEdit } = await requireEngagementAccess(orgSlug, id);
  if (!uuid.test(instrumentId)) notFound();
  const data = await withRls(claimsFor(user), async (tx) => {
    const row = await findInstrument(tx, org.id, engagement.id, instrumentId);
    return row ? { inst: row.instrument, tree: await getInstrumentTree(tx, org.id, instrumentId) } : null;
  });
  if (!data) notFound();
  const { inst, tree } = data;
  const editable = canEdit && inst.status === "draft";
  const base = `/${org.slug}/engagements/${engagement.id}/readiness`;
  const bind = <A extends unknown[], R>(fn: (orgSlug: string, id: string, ...rest: A) => R) => fn.bind(null, org.slug, engagement.id);

  // The builder keeps local state for optimistic reordering; a new key after any server change
  // remounts it with what the database now holds.
  const version = createHash("sha1")
    .update(
      JSON.stringify([
        tree.dimensions.map((d) => [d.id, d.updatedAt.getTime()]),
        tree.sections.map((s) => [s.id, s.updatedAt.getTime(), s.questions.map((q) => [q.id, q.updatedAt.getTime(), q.options.map((o) => o.id)])]),
      ]),
    )
    .digest("hex");

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-3">
        <nav aria-label="Breadcrumb" className="text-sm">
          <Link href={base as never} className="text-muted-foreground underline-offset-4 hover:underline">
            Readiness
          </Link>
          <span className="px-1 text-muted-foreground">/</span>
          <Link href={`${base}/${inst.id}` as never} className="text-muted-foreground underline-offset-4 hover:underline">
            {inst.name}
          </Link>
          <span className="px-1 text-muted-foreground">/</span>
          <span className="font-semibold">Questions</span>
        </nav>
        <Link href={`${base}/${inst.id}/preview` as never} className={`ml-auto ${buttonVariants({ variant: "outline", size: "sm" })}`}>
          Preview
        </Link>
      </div>
      {!editable ? (
        <p role="status" className="rounded-md border border-border bg-muted px-3 py-2 text-sm">
          {inst.status !== "draft"
            ? "This assessment has opened, so its questions are fixed. Create a new wave to change them."
            : "Read only. You can view the questions but not change them."}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Drag a question to reorder it or move it to another section, or use Up and Down. Changes save as you make them.
        </p>
      )}
      <InstrumentBuilder
        key={version}
        instrumentId={inst.id}
        editable={editable}
        dimensions={tree.dimensions.map((d) => ({ id: d.id, name: d.name, weight: d.weight }))}
        sections={tree.sections.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          questions: s.questions.map((q) => ({
            id: q.id,
            sectionId: q.sectionId,
            dimensionId: q.dimensionId,
            text: q.text,
            helpText: q.helpText,
            type: q.type,
            weight: q.weight,
            isRequired: q.isRequired,
            isReverseScored: q.isReverseScored,
            source: q.source,
            options: q.options.map((o) => ({ label: o.label, value: o.value })),
          })),
        }))}
        actions={{
          saveDimension: bind(saveDimensionAction),
          saveSection: bind(saveSectionAction),
          saveQuestion: bind(saveQuestionAction),
          deleteChild: bind(deleteChildAction),
          reorder: bind(reorderAction),
        }}
      />
    </div>
  );
}
