import type { Metadata } from "next";
import Link from "next/link";
import { FormView } from "@/components/views/form-view";
import { RecordForm } from "@/components/views/record-form";
import { requireMembership } from "@/lib/auth/membership";
import { claimsFor } from "@/lib/auth/session";
import { withRls } from "@/lib/db";
import { listClientOptions } from "@/lib/db/queries/clients";
import { ENGAGEMENT_TYPE_HINTS, ENGAGEMENT_TYPE_LABELS, ENGAGEMENT_TYPES } from "@/lib/validation/engagements";
import { createEngagement } from "../actions";

export const metadata: Metadata = { title: "New engagement" };

export default async function NewEngagementPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ client?: string }>;
}) {
  const { orgSlug } = await params;
  const { client: clientParam } = await searchParams;
  const { user, org } = await requireMembership(orgSlug, "admin");
  const clients = await withRls(claimsFor(user), (tx) => listClientOptions(tx, org.id));
  const base = `/${org.slug}/engagements`;

  return (
    <FormView breadcrumbs={[{ label: "Engagements", href: base }, { label: "New" }]}>
      {clients.length ? (
        <RecordForm
          mode="create"
          canEdit
          discardHref={base}
          action={createEngagement.bind(null, org.slug)}
          titleField="name"
          values={{ name: "", clientId: clients.some((c) => c.id === clientParam) ? clientParam! : "", type: "", targetSystem: "", targetGoLive: "" }}
          fields={[
            { name: "name", label: "Engagement name", kind: "text", required: true, placeholder: "Engagement name, e.g. Odoo 18 rollout" },
            { name: "clientId", label: "Client", kind: "select", required: true, options: [{ value: "", label: "Choose a client" }, ...clients.map((c) => ({ value: c.id, label: c.name }))] },
            {
              name: "type",
              label: "Type of change",
              kind: "select",
              required: true,
              options: [{ value: "", label: "Choose a type" }, ...ENGAGEMENT_TYPES.map((t) => ({ value: t, label: `${ENGAGEMENT_TYPE_LABELS[t]}: ${ENGAGEMENT_TYPE_HINTS[t]}` }))],
            },
            { name: "targetSystem", label: "Target system", kind: "text", required: true, placeholder: "e.g. Odoo 18, NetSuite" },
            { name: "targetGoLive", label: "Target go-live", kind: "date" },
          ]}
          groups={[["clientId", "type"], ["targetSystem", "targetGoLive"]]}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Add a{" "}
          <Link href={`/${org.slug}/clients/new` as never} className="text-primary underline-offset-4 hover:underline">
            client
          </Link>{" "}
          first. Every engagement belongs to one.
        </p>
      )}
    </FormView>
  );
}
