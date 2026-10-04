import type { Metadata } from "next";
import Link from "next/link";
import { CreateEngagementForm } from "@/components/engagements/create-engagement-form";
import { EngagementTable } from "@/components/engagements/engagement-table";
import { requireMembership } from "@/lib/auth/membership";
import { hasRole } from "@/lib/auth/roles";
import { claimsFor } from "@/lib/auth/session";
import { withRls } from "@/lib/db";
import { listClientOptions } from "@/lib/db/queries/clients";
import { listEngagements } from "@/lib/db/queries/engagements";
import { createEngagement } from "./actions";

export const metadata: Metadata = { title: "Engagements" };

export default async function EngagementsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ status?: string; client?: string }>;
}) {
  const { orgSlug } = await params;
  const { status: statusParam, client: clientParam } = await searchParams;
  const { user, org, role } = await requireMembership(orgSlug);
  const status = statusParam === "archived" ? "archived" : "active";
  const isAdmin = hasRole(role, "admin");

  const { engagements, clients } = await withRls(claimsFor(user), async (tx) => ({
    engagements: await listEngagements(tx, org.id, status),
    clients: isAdmin ? await listClientOptions(tx, org.id) : [],
  }));
  const base = `/${org.slug}/engagements`;

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-xl font-semibold">Engagements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAdmin ? "Every engagement in this organisation." : "Engagements you are assigned to."}
        </p>
      </div>

      <section aria-labelledby="engagement-list" className="grid gap-3">
        <nav aria-label="Filter by status" className="flex gap-4 text-sm">
          <h2 id="engagement-list" className="sr-only">
            {status === "active" ? "Active engagements" : "Archived engagements"}
          </h2>
          <Link href={base as never} aria-current={status === "active" ? "page" : undefined} className="underline-offset-4 hover:underline aria-[current=page]:font-semibold">
            Active
          </Link>
          <Link href={`${base}?status=archived` as never} aria-current={status === "archived" ? "page" : undefined} className="underline-offset-4 hover:underline aria-[current=page]:font-semibold">
            Archived
          </Link>
        </nav>
        {engagements.length ? (
          <EngagementTable orgSlug={org.slug} rows={engagements} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {status === "archived" ? "No archived engagements." : isAdmin ? "No active engagements yet." : "You are not assigned to any active engagements."}
          </p>
        )}
      </section>

      {isAdmin ? (
        <section id="new-engagement" aria-labelledby="new-engagement-heading" className="rounded-md border border-border bg-card p-4">
          <h2 id="new-engagement-heading" className="mb-3 text-sm font-semibold">
            New engagement
          </h2>
          {clients.length ? (
            <CreateEngagementForm action={createEngagement.bind(null, org.slug)} clients={clients} defaultClientId={clientParam} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Add a{" "}
              <Link href={`/${org.slug}/clients` as never} className="text-primary underline-offset-4 hover:underline">
                client
              </Link>{" "}
              first. Every engagement belongs to one.
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}
