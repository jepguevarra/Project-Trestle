import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Chatter } from "@/components/views/chatter";
import { FormView, type Pager } from "@/components/views/form-view";
import { InlineList } from "@/components/views/inline-list";
import { RecordForm } from "@/components/views/record-form";
import { SmartButtons } from "@/components/views/smart-buttons";
import { Statusbar } from "@/components/views/statusbar";
import { ActionButton } from "@/components/ui/action-button";
import { buttonVariants } from "@/components/ui/button";
import { requireEngagementAccess } from "@/lib/auth/engagement";
import { claimsFor } from "@/lib/auth/session";
import { withRls } from "@/lib/db";
import { findInstrument, getInstrumentTree, instrumentIdsInOrder } from "@/lib/db/queries/instruments";
import { listRecordMessages } from "@/lib/db/queries/messages";
import { QUESTION_TYPE_LABELS } from "@/lib/instruments/definition";
import { ANONYMITY_LABELS, INSTRUMENT_KIND_LABELS, INSTRUMENT_KINDS, instrumentModel } from "@/lib/views/instrument";
import { listContext, parseViewParams, type RawSearchParams } from "@/lib/views/params";
import { moveInstrument } from "../actions";
import { deleteInstrument, logInstrumentNote, saveInstrumentSettings } from "./actions";

export const metadata: Metadata = { title: "Assessment" };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** `datetime-local` value in UTC, which is how the form labels and reads it. */
const utcInput = (d: Date | null) => (d ? d.toISOString().slice(0, 16) : "");

/** The instrument form: statusbar Draft → Open → Closed, smart buttons, settings, questions, chatter. */
export default async function InstrumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; id: string; instrumentId: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { orgSlug, id, instrumentId } = await params;
  const raw = await searchParams;
  const { org, user, engagement, canEdit } = await requireEngagementAccess(orgSlug, id);
  if (!uuid.test(instrumentId)) notFound();
  const listParams = parseViewParams(raw, instrumentModel);
  const context = listContext(listParams, instrumentModel);
  const fromList = Object.keys(raw).length > 0;

  const data = await withRls(claimsFor(user), async (tx) => {
    const row = await findInstrument(tx, org.id, engagement.id, instrumentId);
    if (!row) return null;
    return {
      row,
      tree: await getInstrumentTree(tx, org.id, instrumentId),
      messages: await listRecordMessages(tx, org.id, "instrument", instrumentId),
      ids: fromList ? await instrumentIdsInOrder(tx, org.id, engagement.id, listParams) : [],
    };
  });
  if (!data) notFound();
  const { row, tree, messages, ids } = data;
  const inst = row.instrument;
  const isDraft = inst.status === "draft";

  const base = `/${org.slug}/engagements/${engagement.id}/readiness`;
  const at = ids.indexOf(inst.id);
  const recordHref = (rid: string) => `${base}/${rid}${context ? `?${context}` : ""}`;
  const pager: Pager | null =
    at >= 0 ? { index: at + 1, total: ids.length, prevHref: at > 0 ? recordHref(ids[at - 1]!) : null, nextHref: at < ids.length - 1 ? recordHref(ids[at + 1]!) : null } : null;
  const bind = <A extends unknown[], R>(fn: (orgSlug: string, id: string, ...rest: A) => R) => fn.bind(null, org.slug, engagement.id);
  const dimensionName = new Map(tree.dimensions.map((d) => [d.id, d.name]));
  const questions = tree.sections.flatMap((s) => s.questions.map((q) => ({ ...q, sectionTitle: s.title })));

  return (
    <FormView
      breadcrumbs={[{ label: "Readiness", href: `${base}${context ? `?${context}` : ""}` }, { label: inst.name }]}
      pager={pager}
      headerButtons={
        <>
          <Link href={`${base}/${inst.id}/builder` as never} className={buttonVariants({ variant: "outline", size: "sm" })}>
            {canEdit && isDraft ? "Edit questions" : "Questions"}
          </Link>
          <Link href={`${base}/${inst.id}/preview` as never} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Preview
          </Link>
          {canEdit && isDraft ? (
            <ActionButton
              action={bind(deleteInstrument)}
              fields={{ instrumentId: inst.id }}
              label="Delete"
              pendingLabel="Deleting…"
              confirmText="Delete this draft and all its questions?"
            />
          ) : null}
        </>
      }
      statusbar={
        <Statusbar
          steps={instrumentModel.stages!.steps}
          current={inst.status}
          canMove={canEdit}
          action={moveInstrument.bind(null, engagement.id, org.slug, inst.id)}
          incomplete={isDraft && row.questions === 0 ? ["Add at least one question."] : []}
        />
      }
      smartButtons={
        <SmartButtons
          buttons={[
            { label: "Questions", value: row.questions, href: `${base}/${inst.id}/builder` },
            { label: "Dimensions", value: tree.dimensions.length, href: `${base}/${inst.id}/builder#dimensions` },
            // Respondents arrive with distribution in phase 04.
            { label: "Respondents", value: "—" },
          ]}
        />
      }
      chatter={<Chatter messages={messages} noteAction={canEdit ? bind(logInstrumentNote) : undefined} hidden={{ instrumentId: inst.id }} />}
    >
      {!isDraft ? (
        <p role="status" className="text-sm text-muted-foreground">
          {inst.status === "open" ? "Open." : "Closed."} Its questions and anonymity are fixed; create a new wave to change them.
        </p>
      ) : null}
      <RecordForm
        canEdit={canEdit}
        action={bind(saveInstrumentSettings)}
        hidden={{ instrumentId: inst.id }}
        titleField="name"
        values={{
          name: inst.name,
          kind: inst.kind,
          wave: String(inst.wave),
          waveLabel: inst.waveLabel ?? "",
          anonymity: inst.anonymity,
          opensAt: utcInput(inst.opensAt),
          closesAt: utcInput(inst.closesAt),
        }}
        fields={[
          { name: "name", label: "Name", kind: "text", required: true },
          // Only readiness has a template in this phase; the other kinds are listed so the record is honest.
          { name: "kind", label: "Kind", kind: "select", required: true, options: INSTRUMENT_KINDS.map((k) => ({ value: k, label: INSTRUMENT_KIND_LABELS[k] })) },
          { name: "wave", label: "Wave", kind: "number", required: true },
          { name: "waveLabel", label: "Wave label", kind: "text", placeholder: "e.g. Baseline" },
          {
            name: "anonymity",
            label: "Anonymity",
            kind: "select",
            required: true,
            readOnly: !isDraft,
            options: (["anonymous", "identified"] as const).map((a) => ({ value: a, label: ANONYMITY_LABELS[a] })),
          },
          { name: "opensAt", label: "Opens (UTC)", kind: "datetime" },
          { name: "closesAt", label: "Closes (UTC)", kind: "datetime" },
        ]}
        groups={[["kind", "anonymity"], ["wave", "waveLabel"], ["opensAt", "closesAt"]]}
        tabs={[
          {
            key: "questions",
            label: "Questions",
            content: (
              <InlineList
                columns={[
                  { key: "n", label: "#", numeric: true },
                  { key: "text", label: "Question" },
                  { key: "section", label: "Section" },
                  { key: "type", label: "Type" },
                  { key: "dimension", label: "Dimension" },
                  { key: "weight", label: "Weight", numeric: true },
                ]}
                rows={questions.map((q, i) => ({
                  id: q.id,
                  cells: {
                    n: i + 1,
                    text: q.isReverseScored ? `${q.text} (reverse-scored)` : q.text,
                    section: q.sectionTitle,
                    type: QUESTION_TYPE_LABELS[q.type],
                    dimension: q.dimensionId ? (dimensionName.get(q.dimensionId) ?? "") : "Not scored",
                    weight: q.weight,
                  },
                }))}
                emptyText="No questions yet."
                add={
                  <Link href={`${base}/${inst.id}/builder` as never} className={buttonVariants({ variant: "link", size: "sm" })}>
                    {canEdit && isDraft ? "Edit questions" : "Open the question list"}
                  </Link>
                }
              />
            ),
          },
          {
            key: "dimensions",
            label: "Dimensions",
            content: (
              <InlineList
                columns={[
                  { key: "name", label: "Dimension" },
                  { key: "weight", label: "Weight", numeric: true },
                  { key: "questions", label: "Questions", numeric: true },
                ]}
                rows={tree.dimensions.map((d) => ({
                  id: d.id,
                  cells: { name: d.name, weight: d.weight, questions: questions.filter((q) => q.dimensionId === d.id).length },
                }))}
                emptyText="No dimensions yet. Scored questions need one."
              />
            ),
          },
        ]}
      />
    </FormView>
  );
}
