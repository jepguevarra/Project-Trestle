import type { Metadata } from "next";
import { FormView } from "@/components/views/form-view";
import { RecordForm } from "@/components/views/record-form";
import { requireMembership } from "@/lib/auth/membership";
import { INDUSTRIES, SIZE_BAND_LABELS, SIZE_BANDS } from "@/lib/validation/engagements";
import { createClient } from "../actions";
import { clientFields } from "../fields";

export const metadata: Metadata = { title: "New client" };

export default async function NewClientPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { org } = await requireMembership((await params).orgSlug, "admin");
  const base = `/${org.slug}/clients`;
  return (
    <FormView breadcrumbs={[{ label: "Clients", href: base }, { label: "New" }]}>
      <RecordForm
        mode="create"
        canEdit
        discardHref={base}
        action={createClient.bind(null, org.slug)}
        titleField="name"
        values={{ name: "", industry: "", sizeBand: "", notes: "" }}
        fields={clientFields(INDUSTRIES, SIZE_BANDS.map((b) => ({ value: b, label: SIZE_BAND_LABELS[b] })))}
        groups={[["industry"], ["sizeBand"]]}
        tabs={[{ key: "notes", label: "Notes", fields: ["notes"] }]}
      />
    </FormView>
  );
}
