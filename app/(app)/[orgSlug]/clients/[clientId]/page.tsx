import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { buttonVariants } from "@/components/ui/button";
import { Chatter } from "@/components/views/chatter";
import { FormView, type Pager } from "@/components/views/form-view";
import { InlineList } from "@/components/views/inline-list";
import { RecordForm } from "@/components/views/record-form";
import { SmartButtons } from "@/components/views/smart-buttons";
import { requireMembership } from "@/lib/auth/membership";
import { hasRole } from "@/lib/auth/roles";
import { claimsFor } from "@/lib/auth/session";
import { withRls } from "@/lib/db";
import { clientIdsInOrder } from "@/lib/db/queries/client-collection";
import { findClient } from "@/lib/db/queries/clients";
import { listClientEngagements } from "@/lib/db/queries/engagements";
import { listRecordMessages } from "@/lib/db/queries/messages";
import { INDUSTRIES, SIZE_BAND_LABELS, SIZE_BANDS } from "@/lib/validation/engagements";
import { clientModel } from "@/lib/views/client";
import { OCM_STAGE_LABELS } from "@/lib/views/engagement";
import { listContext, parseViewParams, type RawSearchParams } from "@/lib/views/params";
import { logClientNote, saveClient } from "../actions";
import { clientFields } from "../fields";

export const metadata: Metadata = { title: "Client" };

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; clientId: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { orgSlug, clientId } = await params;
  const raw = await searchParams;
  const { user, org, role } = await requireMembership(orgSlug);
  if (!z.uuid().safeParse(clientId).success) notFound();
  const isAdmin = hasRole(role, "admin");
  const listParams = parseViewParams(raw, clientModel);
  const context = listContext(listParams, clientModel);

  const data = await withRls(claimsFor(user), async (tx) => {
    const client = await findClient(tx, org.id, clientId);
    if (!client) return null;
    return {
      client,
      engagements: await listClientEngagements(tx, org.id, clientId),
      messages: await listRecordMessages(tx, org.id, "client", clientId),
      ids: Object.keys(raw).length ? await clientIdsInOrder(tx, org.id, listParams) : [],
    };
  });
  if (!data) notFound();
  const { client, engagements, messages, ids } = data;

  const base = `/${org.slug}/clients`;
  const at = ids.indexOf(client.id);
  const recordHref = (id: string) => `${base}/${id}${context ? `?${context}` : ""}`;
  const pager: Pager | null =
    at >= 0 ? { index: at + 1, total: ids.length, prevHref: at > 0 ? recordHref(ids[at - 1]!) : null, nextHref: at < ids.length - 1 ? recordHref(ids[at + 1]!) : null } : null;

  return (
    <FormView
      breadcrumbs={[{ label: "Clients", href: `${base}${context ? `?${context}` : ""}` }, { label: client.name }]}
      pager={pager}
      headerButtons={
        isAdmin ? (
          <Link href={`/${org.slug}/engagements/new?client=${client.id}` as never} className={buttonVariants({ variant: "outline", size: "sm" })}>
            New engagement
          </Link>
        ) : null
      }
      smartButtons={
        <SmartButtons
          buttons={[
            {
              label: "Engagements",
              value: engagements.length,
              href: `/${org.slug}/engagements?s=${encodeURIComponent(`client:${client.name}`)}&f=`,
            },
          ]}
        />
      }
      chatter={<Chatter messages={messages} noteAction={isAdmin ? logClientNote.bind(null, org.slug) : undefined} hidden={{ clientId: client.id }} />}
    >
      <RecordForm
        canEdit={isAdmin}
        action={saveClient.bind(null, org.slug)}
        hidden={{ clientId: client.id }}
        titleField="name"
        values={{ name: client.name, industry: client.industry ?? "", sizeBand: client.sizeBand ?? "", notes: client.notes ?? "" }}
        fields={clientFields(INDUSTRIES, SIZE_BANDS.map((b) => ({ value: b, label: SIZE_BAND_LABELS[b] })))}
        groups={[["industry"], ["sizeBand"]]}
        tabs={[
          {
            key: "engagements",
            label: "Engagements",
            content: (
              <InlineList
                columns={[
                  { key: "name", label: "Engagement" },
                  { key: "system", label: "System" },
                  { key: "stage", label: "Stage" },
                  { key: "status", label: "Status" },
                ]}
                rows={engagements.map((e) => ({
                  id: e.id,
                  cells: {
                    name: (
                      <Link href={`/${org.slug}/engagements/${e.id}/overview` as never} className="text-primary underline-offset-4 hover:underline">
                        {e.name}
                      </Link>
                    ),
                    system: e.targetSystem,
                    stage: OCM_STAGE_LABELS[e.ocmStage],
                    status: e.status === "archived" ? "Archived" : "Active",
                  },
                }))}
                emptyText="No engagements visible to you."
              />
            ),
          },
          { key: "notes", label: "Notes", fields: ["notes"] },
        ]}
      />
    </FormView>
  );
}
