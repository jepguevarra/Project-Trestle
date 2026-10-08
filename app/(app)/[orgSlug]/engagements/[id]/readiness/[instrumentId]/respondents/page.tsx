import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/ui/action-button";
import { ControlPanel } from "@/components/views/control-panel";
import { ListView } from "@/components/views/list-view";
import { requireEngagementAccess } from "@/lib/auth/engagement";
import { claimsFor } from "@/lib/auth/session";
import { withRls } from "@/lib/db";
import { findInstrument } from "@/lib/db/queries/instruments";
import { queryRespondents, respondentCounts } from "@/lib/db/queries/respondents";
import { listContext, parseViewParams, type RawSearchParams } from "@/lib/views/params";
import { respondentModel } from "@/lib/views/respondent";
import { respondentRows } from "@/lib/views/rows";
import { sendInvitations, sendReminders } from "../actions";

export const metadata: Metadata = { title: "Respondents" };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Who is asked, and who has answered. On an anonymous survey this says who answered, never what. */
export default async function RespondentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; id: string; instrumentId: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { orgSlug, id, instrumentId } = await params;
  const { org, user, engagement, canEdit } = await requireEngagementAccess(orgSlug, id);
  if (!uuid.test(instrumentId)) notFound();
  const view = parseViewParams(await searchParams, respondentModel);

  const data = await withRls(claimsFor(user), async (tx) => {
    const row = await findInstrument(tx, org.id, engagement.id, instrumentId);
    if (!row) return null;
    return { inst: row.instrument, list: await queryRespondents(tx, org.id, instrumentId, view), counts: await respondentCounts(tx, org.id, instrumentId) };
  });
  if (!data) notFound();
  const { inst, list, counts } = data;
  const readiness = `/${org.slug}/engagements/${engagement.id}/readiness`;
  const base = `${readiness}/${inst.id}/respondents`;
  const rows = respondentRows(list.rows, base, listContext(view, respondentModel), view.groupBy);
  const bind = <A extends unknown[], R>(fn: (orgSlug: string, id: string, ...rest: A) => R) => fn.bind(null, org.slug, engagement.id);
  const open = inst.status === "open";
  const pending = counts.invited - counts.completed;

  return (
    <div className="grid gap-4">
      <ControlPanel
        model={respondentModel}
        params={view}
        base={base}
        total={list.total}
        breadcrumbs={[{ label: "Readiness", href: readiness }, { label: inst.name, href: `${readiness}/${inst.id}` }, { label: "Respondents" }]}
        newHref={canEdit && inst.status !== "closed" ? `${base}/new` : undefined}
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <p>
          <span className="font-semibold tabular-nums">{counts.completed}</span> of <span className="tabular-nums">{counts.total}</span> have answered
          {counts.total > counts.invited ? `; ${counts.total - counts.invited} not invited yet` : ""}.
        </p>
        {canEdit && open && counts.total > counts.invited ? (
          <ActionButton action={bind(sendInvitations)} fields={{ instrumentId: inst.id }} label="Send invitations" pendingLabel="Sending…" />
        ) : null}
        {canEdit && open && pending > 0 ? (
          <ActionButton
            action={bind(sendReminders)}
            fields={{ instrumentId: inst.id }}
            label="Send reminders"
            pendingLabel="Sending…"
            confirmText={`Email a reminder to the ${pending} ${pending === 1 ? "person who has" : "people who have"} not answered?`}
          />
        ) : null}
      </div>
      {inst.anonymity === "anonymous" ? (
        <p className="max-w-2xl text-sm text-muted-foreground">
          This survey is anonymous. You can see who has answered, so you can remind the rest, but answers are stored without names.
        </p>
      ) : null}
      <ListView
        model={respondentModel}
        params={view}
        base={base}
        rows={rows}
        groups={list.groups}
        emptyText={
          view.facets.length || view.filters.length
            ? "Nothing matches. Remove a filter or a search term."
            : canEdit
              ? "Nobody yet. Use New to add people one at a time or paste a list."
              : "Nobody has been added yet."
        }
      />
    </div>
  );
}
