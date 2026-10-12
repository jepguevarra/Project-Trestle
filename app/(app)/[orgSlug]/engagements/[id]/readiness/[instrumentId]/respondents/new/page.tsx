import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RespondentImport } from "@/components/instruments/respondent-import";
import { FormView } from "@/components/views/form-view";
import { RecordForm } from "@/components/views/record-form";
import { requireEngagementAccess } from "@/lib/auth/engagement";
import { claimsFor } from "@/lib/auth/session";
import { withRls } from "@/lib/db";
import { findInstrument } from "@/lib/db/queries/instruments";
import { RESPONDENT_FIELDS } from "@/lib/views/respondent";
import { addRespondent, importRespondents } from "../actions";

export const metadata: Metadata = { title: "Add respondents" };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


export default async function NewRespondentsPage({ params }: { params: Promise<{ orgSlug: string; id: string; instrumentId: string }> }) {
  const { orgSlug, id, instrumentId } = await params;
  const { org, user, engagement } = await requireEngagementAccess(orgSlug, id, "edit");
  if (!uuid.test(instrumentId)) notFound();
  const row = await withRls(claimsFor(user), (tx) => findInstrument(tx, org.id, engagement.id, instrumentId));
  if (!row || row.instrument.status === "closed") notFound();
  const inst = row.instrument;
  const readiness = `/${org.slug}/engagements/${engagement.id}/readiness`;
  const base = `${readiness}/${inst.id}/respondents`;
  const bind = <A extends unknown[], R>(fn: (orgSlug: string, id: string, ...rest: A) => R) => fn.bind(null, org.slug, engagement.id);

  return (
    <FormView
      breadcrumbs={[{ label: "Readiness", href: readiness }, { label: inst.name, href: `${readiness}/${inst.id}` }, { label: "Respondents", href: base }, { label: "Add" }]}
    >
      <h2 className="text-base font-semibold">Add one person</h2>
      <RecordForm
        mode="create"
        canEdit
        discardHref={base}
        action={bind(addRespondent)}
        hidden={{ instrumentId: inst.id }}
        values={{ name: "", email: "", department: "", roleTitle: "", seniority: "" }}
        fields={RESPONDENT_FIELDS}
        groups={[["name", "email"], ["department", "roleTitle"], ["seniority"]]}
      />
      <div className="grid gap-2 border-t border-border pt-4">
        <h2 className="text-base font-semibold">Add a list</h2>
        <RespondentImport action={bind(importRespondents)} instrumentId={inst.id} />
      </div>
      <p className="text-sm text-muted-foreground">
        Department, role and seniority are copied onto each answer, so results can be broken down by them. Groups smaller than five
        people are never shown.
      </p>
    </FormView>
  );
}
