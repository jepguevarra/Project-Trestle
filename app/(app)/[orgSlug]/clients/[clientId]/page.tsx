import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ClientForm } from "@/components/clients/client-form";
import { EngagementTable } from "@/components/engagements/engagement-table";
import { requireMembership } from "@/lib/auth/membership";
import { hasRole } from "@/lib/auth/roles";
import { claimsFor } from "@/lib/auth/session";
import { withRls } from "@/lib/db";
import { findClient } from "@/lib/db/queries/clients";
import { listClientEngagements } from "@/lib/db/queries/engagements";
import { SIZE_BAND_LABELS } from "@/lib/validation/engagements";
import { updateClient } from "../actions";

export const metadata: Metadata = { title: "Client" };

export default async function ClientPage({ params }: { params: Promise<{ orgSlug: string; clientId: string }> }) {
  const { orgSlug, clientId } = await params;
  const { user, org, role } = await requireMembership(orgSlug);
  if (!z.uuid().safeParse(clientId).success) notFound();

  const data = await withRls(claimsFor(user), async (tx) => {
    const client = await findClient(tx, org.id, clientId);
    return client ? { client, engagements: await listClientEngagements(tx, org.id, clientId) } : null;
  });
  if (!data) notFound();
  const { client, engagements } = data;
  const isAdmin = hasRole(role, "admin");

  return (
    <div className="grid gap-8">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href={`/${org.slug}/clients` as never} className="underline-offset-4 hover:underline">
            Clients
          </Link>
        </p>
        <h1 className="mt-1 text-xl font-semibold">{client.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {[client.industry, client.sizeBand ? SIZE_BAND_LABELS[client.sizeBand] : null].filter(Boolean).join(" · ") ||
            "Industry and size not set"}
        </p>
      </div>

      <section aria-labelledby="client-engagements" className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="client-engagements" className="text-sm font-semibold">
            Engagements
          </h2>
          {isAdmin ? (
            <Link
              href={`/${org.slug}/engagements?client=${client.id}#new-engagement` as never}
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              New engagement for {client.name}
            </Link>
          ) : null}
        </div>
        {engagements.length ? (
          <EngagementTable orgSlug={org.slug} rows={engagements} showClient={false} showStatus />
        ) : (
          <p className="text-sm text-muted-foreground">No engagements visible to you.</p>
        )}
      </section>

      {isAdmin ? (
        <section aria-labelledby="edit-client" className="rounded-md border border-border bg-card p-4">
          <h2 id="edit-client" className="mb-3 text-sm font-semibold">
            Client details
          </h2>
          <ClientForm action={updateClient.bind(null, org.slug)} client={client} submitLabel="Save client" />
        </section>
      ) : client.notes ? (
        <section aria-labelledby="client-notes">
          <h2 id="client-notes" className="mb-1 text-sm font-semibold">
            Notes
          </h2>
          <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
        </section>
      ) : null}
    </div>
  );
}
