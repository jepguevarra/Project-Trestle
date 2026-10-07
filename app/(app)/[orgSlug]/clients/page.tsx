import type { Metadata } from "next";
import Link from "next/link";
import { ClientForm } from "@/components/clients/client-form";
import { Table, Td, Th } from "@/components/ui/table";
import { requireMembership } from "@/lib/auth/membership";
import { hasRole } from "@/lib/auth/roles";
import { claimsFor } from "@/lib/auth/session";
import { withRls } from "@/lib/db";
import { listClients } from "@/lib/db/queries/clients";
import { SIZE_BAND_LABELS } from "@/lib/validation/engagements";
import { createClient } from "./actions";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { user, org, role } = await requireMembership(orgSlug);
  const clients = await withRls(claimsFor(user), (tx) => listClients(tx, org.id));
  const isAdmin = hasRole(role, "admin");

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-xl font-semibold">Clients</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          A client is a company {org.name} is helping through a system change. Add the client once,
          then create one or more engagements for them on the Engagements page.
        </p>
      </div>

      {clients.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {isAdmin ? "No clients yet. Add the first one below." : "No clients are visible to you yet."}
        </p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Industry</Th>
              <Th>Size</Th>
              <Th numeric>Engagements</Th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id}>
                <Td>
                  <Link href={`/${org.slug}/clients/${c.id}` as never} className="text-primary underline-offset-4 hover:underline">
                    {c.name}
                  </Link>
                </Td>
                <Td>{c.industry ?? "—"}</Td>
                <Td>{c.sizeBand ? SIZE_BAND_LABELS[c.sizeBand] : "—"}</Td>
                <Td numeric>{c.engagementCount}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {isAdmin ? (
        <section aria-labelledby="new-client" className="rounded-md border border-border bg-card p-4">
          <h2 id="new-client" className="mb-3 text-sm font-semibold">
            Add a client
          </h2>
          <ClientForm action={createClient.bind(null, org.slug)} submitLabel="Add client" />
        </section>
      ) : null}
    </div>
  );
}
