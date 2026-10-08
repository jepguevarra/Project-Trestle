import type { Metadata } from "next";
import { ControlPanel } from "@/components/views/control-panel";
import { ListView } from "@/components/views/list-view";
import { requireMembership } from "@/lib/auth/membership";
import { hasRole } from "@/lib/auth/roles";
import { claimsFor } from "@/lib/auth/session";
import { withRls } from "@/lib/db";
import { queryClients } from "@/lib/db/queries/client-collection";
import { clientModel } from "@/lib/views/client";
import { listContext, parseViewParams, type RawSearchParams } from "@/lib/views/params";
import { clientRows } from "@/lib/views/rows";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { orgSlug } = await params;
  const { user, org, role } = await requireMembership(orgSlug);
  const view = parseViewParams(await searchParams, clientModel);
  const isAdmin = hasRole(role, "admin");
  const base = `/${org.slug}/clients`;
  const data = await withRls(claimsFor(user), (tx) => queryClients(tx, org.id, view));

  return (
    <div className="grid gap-4">
      <ControlPanel
        model={clientModel}
        params={view}
        base={base}
        total={data.total}
        breadcrumbs={[{ label: "Clients" }]}
        newHref={isAdmin ? `${base}/new` : undefined}
      />
      <p className="max-w-2xl text-sm text-muted-foreground">
        A client is a company {org.name} is helping through a system change. Add the client once, then create one or more
        engagements for them.
      </p>
      <ListView
        model={clientModel}
        params={view}
        base={base}
        rows={clientRows(data.rows, org.slug, listContext(view, clientModel), view.groupBy)}
        groups={data.groups}
        emptyText={
          view.facets.length ? "Nothing matches. Remove a search term." : isAdmin ? "No clients yet. Use New to add the first one." : "No clients are visible to you yet."
        }
      />
    </div>
  );
}
