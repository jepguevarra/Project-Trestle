import type { Metadata } from "next";
import { FormView } from "@/components/views/form-view";
import { RecordForm } from "@/components/views/record-form";
import { requireEngagementAccess } from "@/lib/auth/engagement";
import { claimsFor } from "@/lib/auth/session";
import { withRls } from "@/lib/db";
import { listReadinessTemplates } from "@/lib/db/queries/instruments";
import { createInstrument } from "../actions";

export const metadata: Metadata = { title: "New assessment" };

/** Template picker: the template written for this engagement's type of change comes first. */
export default async function NewInstrumentPage({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const { orgSlug, id } = await params;
  const { org, user, engagement } = await requireEngagementAccess(orgSlug, id, "edit");
  const templates = await withRls(claimsFor(user), (tx) => listReadinessTemplates(tx, org.id, engagement.type));
  const base = `/${org.slug}/engagements/${engagement.id}/readiness`;

  return (
    <FormView breadcrumbs={[{ label: "Readiness", href: base }, { label: "New" }]}>
      <RecordForm
        mode="create"
        canEdit
        discardHref={base}
        action={createInstrument.bind(null, org.slug, engagement.id)}
        titleField="name"
        values={{ name: "Readiness assessment", templateId: templates[0]?.id ?? "", wave: "1", waveLabel: "" }}
        fields={[
          { name: "name", label: "Name", kind: "text", required: true, placeholder: "e.g. Readiness assessment" },
          {
            name: "templateId",
            label: "Start from",
            kind: "select",
            required: true,
            options: [
              ...templates.map((t) => ({ value: t.id, label: t.isSystem ? t.name : `${t.name} (your firm)` })),
              { value: "", label: "Blank: no questions yet" },
            ],
          },
          { name: "wave", label: "Wave", kind: "number", required: true },
          { name: "waveLabel", label: "Wave label", kind: "text", placeholder: "e.g. Baseline, Pre-go-live" },
        ]}
        groups={[["templateId"], ["wave", "waveLabel"]]}
      />
      <p className="text-sm text-muted-foreground">
        The questions are copied into the new assessment. You can change any of them until it opens.
      </p>
    </FormView>
  );
}
