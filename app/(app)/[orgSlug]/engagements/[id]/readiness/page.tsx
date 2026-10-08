import type { Metadata } from "next";
import { ControlPanel } from "@/components/views/control-panel";
import { KanbanView } from "@/components/views/kanban-view";
import { ListView } from "@/components/views/list-view";
import { requireEngagementAccess } from "@/lib/auth/engagement";
import { claimsFor } from "@/lib/auth/session";
import { withRls } from "@/lib/db";
import { queryInstruments } from "@/lib/db/queries/instruments";
import { instrumentModel } from "@/lib/views/instrument";
import { listContext, parseViewParams, type RawSearchParams } from "@/lib/views/params";
import { instrumentRows } from "@/lib/views/rows";
import { moveInstrument } from "./actions";

export const metadata: Metadata = { title: "Readiness" };

/** The Readiness app: this engagement's instruments, as a list or a kanban by status. */
export default async function ReadinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { orgSlug, id } = await params;
  const { org, user, engagement, canEdit } = await requireEngagementAccess(orgSlug, id);
  const view = parseViewParams(await searchParams, instrumentModel);
  const base = `/${org.slug}/engagements/${engagement.id}/readiness`;

  const data = await withRls(claimsFor(user), (tx) => queryInstruments(tx, org.id, engagement.id, view, { all: view.view === "kanban" }));
  const rows = instrumentRows(data.rows, base, listContext(view, instrumentModel), view.groupBy, canEdit);

  return (
    <div className="grid gap-4">
      <ControlPanel
        model={instrumentModel}
        params={view}
        base={base}
        total={data.total}
        breadcrumbs={[{ label: "Readiness" }]}
        newHref={canEdit ? `${base}/new` : undefined}
      />
      <p className="max-w-2xl text-sm text-muted-foreground">
        A readiness assessment asks the people affected how prepared they are, across six dimensions. Run it more than once
        as waves to see readiness move.
      </p>
      {view.view === "kanban" ? (
        <KanbanView
          model={instrumentModel}
          rows={rows}
          orgSlug={org.slug}
          moveAction={moveInstrument.bind(null, engagement.id)}
          cardFields={["name", "wave", "questions"]}
        />
      ) : (
        <ListView
          model={instrumentModel}
          params={view}
          base={base}
          rows={rows}
          groups={data.groups}
          emptyText={
            view.facets.length || view.filters.length
              ? "Nothing matches. Remove a filter or a search term."
              : canEdit
                ? "No assessments yet. Use New to start one from a template."
                : "No assessments yet."
          }
        />
      )}
    </div>
  );
}
