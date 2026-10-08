import type { Metadata } from "next";
import { ControlPanel } from "@/components/views/control-panel";
import { KanbanView } from "@/components/views/kanban-view";
import { ListView } from "@/components/views/list-view";
import { requireMembership } from "@/lib/auth/membership";
import { hasRole } from "@/lib/auth/roles";
import { claimsFor } from "@/lib/auth/session";
import { withRls } from "@/lib/db";
import { queryEngagements } from "@/lib/db/queries/engagement-collection";
import { engagementModel } from "@/lib/views/engagement";
import { listContext, parseViewParams, type RawSearchParams } from "@/lib/views/params";
import { engagementRows } from "@/lib/views/rows";
import { setEngagementStage } from "./[id]/actions";
import { bulkEngagements } from "./actions";

export const metadata: Metadata = { title: "Engagements" };

export default async function EngagementsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { orgSlug } = await params;
  const { user, org, role } = await requireMembership(orgSlug);
  const view = parseViewParams(await searchParams, engagementModel);
  const isAdmin = hasRole(role, "admin");
  const base = `/${org.slug}/engagements`;

  const data = await withRls(claimsFor(user), (tx) => queryEngagements(tx, org.id, view, { all: view.view === "kanban" }));
  const rows = engagementRows(data.rows, org.slug, listContext(view, engagementModel), view.groupBy);

  return (
    <div className="grid gap-4">
      <ControlPanel
        model={engagementModel}
        params={view}
        base={base}
        total={data.total}
        breadcrumbs={[{ label: "Engagements" }]}
        newHref={isAdmin ? `${base}/new` : undefined}
      />
      <p className="max-w-2xl text-sm text-muted-foreground">
        An engagement is one piece of work for a client, such as an Odoo rollout or a move off spreadsheets.{" "}
        {isAdmin ? "You see every engagement in the firm." : "You see the engagements you have been added to."}
      </p>
      {view.view === "kanban" ? (
        <KanbanView
          model={engagementModel}
          rows={rows}
          orgSlug={org.slug}
          moveAction={setEngagementStage}
          cardFields={["name", "client", "system", "goLive"]}
        />
      ) : (
        <ListView
          model={engagementModel}
          params={view}
          base={base}
          rows={rows}
          groups={data.groups}
          bulkAction={isAdmin ? bulkEngagements.bind(null, org.slug) : undefined}
          bulkActions={[
            { op: "archive", label: "Archive" },
            { op: "reactivate", label: "Re-activate" },
          ]}
          emptyText={
            view.facets.length || view.filters.length
              ? "Nothing matches. Remove a filter or a search term."
              : isAdmin
                ? "No engagements yet. Use New to create the first one."
                : "You have not been added to any engagement yet."
          }
        />
      )}
    </div>
  );
}
