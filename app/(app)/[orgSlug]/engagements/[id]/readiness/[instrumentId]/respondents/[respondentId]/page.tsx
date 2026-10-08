import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/ui/action-button";
import { FormView } from "@/components/views/form-view";
import { RecordForm } from "@/components/views/record-form";
import { requireEngagementAccess } from "@/lib/auth/engagement";
import { claimsFor } from "@/lib/auth/session";
import { withRls } from "@/lib/db";
import { findInstrument } from "@/lib/db/queries/instruments";
import { findRespondent } from "@/lib/db/queries/respondents";
import { RESPONDENT_FIELDS, RESPONDENT_STATE_LABELS, respondentState } from "@/lib/views/respondent";
import { removeRespondent, saveRespondent } from "../actions";

export const metadata: Metadata = { title: "Respondent" };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const utc = (d: Date | null) => (d ? `${d.toISOString().slice(0, 16).replace("T", " ")} UTC` : "—");

export default async function RespondentPage({ params }: { params: Promise<{ orgSlug: string; id: string; instrumentId: string; respondentId: string }> }) {
  const { orgSlug, id, instrumentId, respondentId } = await params;
  const { org, user, engagement, canEdit } = await requireEngagementAccess(orgSlug, id);
  if (!uuid.test(instrumentId) || !uuid.test(respondentId)) notFound();
  const data = await withRls(claimsFor(user), async (tx) => {
    const row = await findInstrument(tx, org.id, engagement.id, instrumentId);
    const r = row ? await findRespondent(tx, org.id, instrumentId, respondentId) : null;
    return row && r ? { inst: row.instrument, r } : null;
  });
  if (!data) notFound();
  const { inst, r } = data;
  const readiness = `/${org.slug}/engagements/${engagement.id}/readiness`;
  const base = `${readiness}/${inst.id}/respondents`;
  const bind = <A extends unknown[], R>(fn: (orgSlug: string, id: string, ...rest: A) => R) => fn.bind(null, org.slug, engagement.id);
  const editable = canEdit && inst.status !== "closed";

  return (
    <FormView
      breadcrumbs={[
        { label: "Readiness", href: readiness },
        { label: inst.name, href: `${readiness}/${inst.id}` },
        { label: "Respondents", href: base },
        { label: r.name ?? r.email },
      ]}
      headerButtons={
        editable && !r.completedAt ? (
          <ActionButton
            action={bind(removeRespondent)}
            fields={{ instrumentId: inst.id, respondentId: r.id }}
            label="Remove"
            pendingLabel="Removing…"
            confirmText="Remove this person from the survey? Their link stops working."
          />
        ) : null
      }
    >
      <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Status</dt>
        <dd>{RESPONDENT_STATE_LABELS[respondentState(r)]}</dd>
        <dt className="text-muted-foreground">Invited</dt>
        <dd className="tabular-nums">{utc(r.invitedAt)}</dd>
        <dt className="text-muted-foreground">Reminded</dt>
        <dd className="tabular-nums">{utc(r.remindedAt)}</dd>
        <dt className="text-muted-foreground">Completed</dt>
        <dd className="tabular-nums">{utc(r.completedAt)}</dd>
      </dl>
      <RecordForm
        canEdit={editable}
        action={bind(saveRespondent)}
        hidden={{ instrumentId: inst.id, respondentId: r.id }}
        values={{ name: r.name ?? "", email: r.email, department: r.department ?? "", roleTitle: r.roleTitle ?? "", seniority: r.seniority ?? "" }}
        fields={RESPONDENT_FIELDS}
        groups={[["name", "email"], ["department", "roleTitle"], ["seniority"]]}
      />
      {r.completedAt ? (
        <p className="text-sm text-muted-foreground">
          Changes here do not alter answers already submitted: department, role and seniority were copied onto them at the time.
        </p>
      ) : null}
    </FormView>
  );
}
